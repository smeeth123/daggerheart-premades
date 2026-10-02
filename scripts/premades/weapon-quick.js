import {ID, featureActive} from '../core.js';
import {WEAPON_QUICK_KEY} from './weapon-quick-data.js';
import {quickCandidates} from './quick-stance.js';
import {ownerFor, unavailableActor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';

const QUERY = `${ID}.weaponQuick`, PROMPT = `${ID}.weaponQuickPrompt`;
const WRAPPED = Symbol.for(QUERY), pending = new Set(), completed = new Set();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function weaponQuickActive(weapon) {
  const flags = weapon?.flags?.[ID];
  return Boolean(weapon?.type === 'weapon' && featureActive(weapon) && weapon.system?.equipped && !flags?.disabled &&
    (flags?.applied?.key ?? flags?.premade?.key) === WEAPON_QUICK_KEY &&
    weapon.system.weaponFeatures?.some(feature => feature.value === 'quick'));
}
export function weaponQuickAction(actor, source) {
  if (actor?.type !== 'character' || unavailableActor(actor) || source?.actor !== actor.uuid) return null;
  const weapon = actor.items?.get(source.item);
  if (!weaponQuickActive(weapon)) return null;
  const action = weapon.system.attack?.id === source.action ? weapon.system.attack :
    weapon.system.actions?.get?.(source.action) ?? weapon.system.actionsList?.find(entry => entry.id === source.action);
  return action?.type === 'attack' && action.actionType !== 'reaction' ? action : null;
}
export function weaponQuickTargets(action, targets) {
  if (!targets?.length || !canvas?.ready) return [];
  // Use the current scene and native range measurement just like Quick stance.
  // Never accept fabricated/stale original targets from a remote request.
  if (!targets.every(target => canvas.tokens.get(target.id)?.actor?.uuid === target.actorId)) return [];
  return quickCandidates(action, targets).filter(token =>
    ['character', 'adversary', 'companion'].includes(token.actor?.type) && !unavailableActor(token.actor));
}
const canPay = actor => Number(actor?.system?.resources?.stress?.max) > Number(actor?.system?.resources?.stress?.value);
export async function promptWeaponQuick(data, {user}) {
  const actor = await fromUuid(data.source?.actor);
  const action = weaponQuickAction(actor, data.source);
  if (!user?.isGM || !actor?.testUserPermission(game.user, 'OWNER') || !action || !canPay(actor)) return null;
  const targets = weaponQuickTargets(action, data.targets);
  if (!targets.length) return null;
  return timedDialog(`Quick — ${action.item.name}`, `<p>Mark <strong>1 Stress</strong> to add one creature to this attack.</p>
    <select name="quickTarget" aria-label="Additional target" style="width:100%">${targets.map(target =>
      `<option value="${esc(target.id)}">${esc(target.name)}</option>`).join('')}</select>`, [
    {action: 'use', label: 'Mark 1 Stress', callback: (_event, _button, dialog) => dialog.element.querySelector('[name="quickTarget"]').value},
    {action: 'decline', label: 'Decline', default: true, callback: () => null}
  ]);
}
export async function resolveWeaponQuick(request, {user}, ask = promptWeaponQuick) {
  if (!game.user.isActiveGM || !user?.active || typeof request?.offerId !== 'string' || !/^[a-zA-Z0-9]{16}$/.test(request.offerId)) return null;
  if (request.sceneId !== canvas?.scene?.id) return null;
  const actor = await fromUuid(request.source?.actor), action = weaponQuickAction(actor, request.source);
  const receipt = `${actor?.uuid}:${request.offerId}`;
  const candidates = action ? weaponQuickTargets(action, request.targets).map(token => ({id: token.id, actorUuid: token.actor.uuid})) : [];
  if (!actor?.testUserPermission(user, 'OWNER') || !action || !canPay(actor) || pending.has(actor.uuid) || completed.has(receipt) || !candidates.length) return null;
  pending.add(actor.uuid);
  try {
    const owner = ownerFor(actor, [...game.users], game.user);
    const data = {source: request.source, targets: request.targets};
    const targetId = owner.isSelf ? await ask(data, {user: game.user}) : await owner.query(PROMPT, data, {timeout: decisionBudget(65000)});
    // A closed or declined decision cannot be replayed for the same attack.
    completed.add(receipt);
    if (completed.size > 1000) completed.delete(completed.values().next().value);
    const current = weaponQuickAction(actor, request.source);
    const target = current && weaponQuickTargets(current, request.targets).find(token => token.id === targetId);
    if (!target || !candidates.some(candidate => candidate.id === target.id && candidate.actorUuid === target.actor.uuid) ||
        request.sceneId !== canvas?.scene?.id || !canPay(actor) || !actor.testUserPermission(user, 'OWNER') || !user.active) return null;
    const eligible = fresh => {
      const freshAction = weaponQuickAction(fresh, request.source);
      return Boolean(user.active && request.sceneId === canvas?.scene?.id && fresh.testUserPermission(user, 'OWNER') && freshAction &&
        weaponQuickTargets(freshAction, request.targets).some(token => token.id === targetId && token.actor.uuid === target.actor.uuid));
    };
    const formatted = game.system.api.fields.ActionFields.TargetField.formatTarget.call(current, target);
    return await markReactiveStress(actor.uuid, eligible) ? formatted : null;
  } finally { pending.delete(actor.uuid); }
}
export function installWeaponQuick(Roll, offer) {
  if (Object.hasOwn(Roll, WRAPPED)) return;
  const native = Roll.buildConfigure;
  Roll.buildConfigure = async function(config, ...args) {
    const roll = await native.call(this, config, ...args);
    if (!roll || roll._evaluated || config.evaluate === false || config.actionType === 'reaction' || config[ID]?.weaponQuickOffered) return roll;
    const actor = config.data?.parent;
    const action = weaponQuickAction(actor, config.source);
    if (!action || !canPay(actor) || !weaponQuickTargets(action, config.targets).length) return roll;
    config[ID] = {...config[ID], weaponQuickOffered: true};
    const target = await offer({source: config.source, targets: config.targets, sceneId: canvas.scene.id, offerId: foundry.utils.randomID()});
    if (target && !config.targets.some(entry => entry.actorId === target.actorId)) config.targets.push(target);
    // The native roll, chat card and deferred damage keep their original source.
    return roll;
  };
  Object.defineProperty(Roll, WRAPPED, {value: true});
}
export function registerWeaponQuick() {
  CONFIG.queries[QUERY] = resolveWeaponQuick;
  CONFIG.queries[PROMPT] = promptWeaponQuick;
  installWeaponQuick(CONFIG.Dice.daggerheart.DualityRoll, request => {
    const gm = game.users.activeGM;
    if (!gm) throw new Error('Quick needs an active GM.');
    return gm.isSelf ? resolveWeaponQuick(request, {user: game.user}) : gm.query(QUERY, request, {timeout: decisionBudget(75000)});
  });
  Hooks.on('daggerheart.preUseAction', action => {
    if (weaponQuickActive(action.item) && action.item.system.weaponFeatures.some(feature =>
      feature.value === 'quick' && feature.actionIds?.includes(action.id))) {
      ui.notifications.info('Make an attack with this weapon. Quick will offer an additional target before the roll.');
      return false;
    }
  });
}
