import { ID,featureActive } from '../core.js';
import { HOLD_KEY, HOLD_ACTION } from './hold-them-off-data.js';
import { ownerFor, tokenState, unavailableActor } from './aura-rules.js';
import { withHopeLock } from './hope-lock.js';
import { timedDialog } from '../dialog.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {refreshActionField} from '../action-field-workflow.js';
import {isWeaponAttack} from './weapon-attack.js';
import {resolvedAttackOutcome,attackTargetOutcome} from '../attack-outcome.js';
import {hopeCapacity,spendHope,isHopePaymentCancellation} from './hope-payment.js';

const QUERY = `${ID}.holdThemOff`, PROMPT = `${QUERY}Picker`, WRAPPED = Symbol.for(QUERY), pending = new Set();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function holdItem(actor) {
  if(actor?.type!=='character')return null;
  return actor?.items?.find(item => {
    const f = item.flags?.[ID];
    return !f?.disabled && featureActive(item) && (f?.applied?.key ?? f?.premade?.key) === HOLD_KEY;
  });
}
export function hitTarget(total, critical, target) {
  const difficulty = target.difficulty ?? target.evasion;
  return Number.isFinite(difficulty) && (critical || total >= difficulty);
}
export function eligibleAttack(message) {
 return Boolean(isWeaponAttack(message?.system)&&message.system.hasRoll&&resolvedAttackOutcome(message)==='success');
}
const rollState = message => JSON.stringify([message.system.source, message.system.roll.total,
  message.system.roll.formula, message.system.roll.options?.[ID], Boolean(message.system.roll.isCritical), message.system.targets.map(t => [t.id, t.actorId])]);
export function rangeLimit(scene, range) {
  // Daggerheart defines Very Far as everything beyond Far, without an upper boundary.
  if (range === 'veryFar') return Infinity;
  if (!['melee', 'veryClose', 'close', 'far'].includes(range)) return NaN;
  return Number(scene.rangeSettings?.[range]);
}
function attackOrigin(message) {
  if (!canvas.ready || (message.speaker.scene && message.speaker.scene !== canvas.scene.id)) return null;
  const actor = message.system.action.actor;
  if (message.speaker.token) {
    const token = canvas.tokens.get(message.speaker.token);
    return token?.actor?.uuid === actor.uuid ? token : null;
  }
  const matches = canvas.tokens.placeables.filter(t => t.actor?.uuid === actor.uuid);
  return matches.length === 1 ? matches[0] : null;
}
export function collectHoldTargets(message) {
  const origin = attackOrigin(message), range = message.system.action.range;
  if (!origin) return null;
  const limit = rangeLimit(canvas.scene, range);
  if (!(limit >= 0)) return null;
  const original = new Set(message.system.targets.map(t => t.id));
  const originalActors = new Set(message.system.targets.map(t => t.actorId));
  const seen=new Set();
  const candidates = canvas.tokens.placeables.filter(token => token !== origin && token.actor?.type === 'adversary' &&
    !(Number(token.actor.system?.resources?.hitPoints?.value)>=Number(token.actor.system?.resources?.hitPoints?.max)) &&
    !original.has(token.id) && !originalActors.has(token.actor.uuid) && !unavailableActor(token.actor) &&
    token.isVisible !== false && (game.user.isGM || !token.document.hidden)).flatMap(token => {
      const distance = origin.distanceTo(token);
      if(seen.has(token.actor.uuid))return [];
      if(Number.isFinite(distance)&&distance<=limit)seen.add(token.actor.uuid);
      return Number.isFinite(distance) && distance <= limit ? [{ id: token.id, tokenUuid: token.document.uuid,
        state: tokenState(token.document), distance, name: token.name, img: token.document.texture.src }] : [];
    }).sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
  return { originUuid: origin.document.uuid, originState: tokenState(origin.document), range,
    rangeState: JSON.stringify(canvas.scene.rangeSettings), candidates };
}
export async function promptHold(data, { user }) {
  const actor = await fromUuid(data.actorUuid);
  if (!user?.isGM || !actor?.testUserPermission(game.user, 'OWNER') || !holdItem(actor)) return null;
  const candidates = data.candidates.filter(c => {
    const token = canvas.tokens?.get(c.id);
    return token?.document.uuid === c.tokenUuid && token.isVisible !== false;
  });
  if (!candidates.length) return null;
  const rangeName = game.i18n.localize(CONFIG.DH.GENERAL.range[data.range]?.label ?? data.range);
  const content = `<p>Spend <strong>3 Hope</strong> to use this weapon attack’s roll of <strong>${Number(data.total)}</strong> against <strong>one or two additional adversaries</strong> within ${esc(rangeName)} range.</p>
    <div style="display:grid;gap:8px;max-height:360px;overflow:auto">${candidates.map(c => `<label style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--color-border-light-primary)"><input type="checkbox" data-dhp-token="${esc(c.tokenUuid)}" name="hold-target" value="${esc(c.id)}"><img src="${esc(c.img)}" alt="" width="36" height="36" style="object-fit:cover"><span>${esc(c.name)}</span></label>`).join('')}</div><p data-hold-count>Choose 1 or 2 targets.</p>`;
  return timedDialog(`Hold Them Off — ${actor.name}`, content, [
      { action: 'use', label: 'Spend 3 Hope', callback: (_event, _button, dialog) => [...dialog.element.querySelectorAll('input[name="hold-target"]:checked')].map(i => i.value) },
      { action: 'cancel', label: 'Decline', default: true, callback: () => null }
    ], dialog => {
      const root = dialog.element;
      const checkboxes = [...root.querySelectorAll('input[name="hold-target"]')];
      const update = () => {
        const count = checkboxes.filter(c => c.checked).length;
        root.querySelector('[data-hold-count]').textContent = `${count} selected — choose 1 or 2 targets.`;
        root.querySelector('[data-action="use"]').disabled = count < 1 || count > 2;
        for (const c of checkboxes) c.disabled = count >= 2 && !c.checked;
      };
      for (const c of checkboxes) c.addEventListener('change', update);
      update();
  });
}
async function validate(request, user, selected) {
  if(!Array.isArray(request.candidates))return null;
  const message = await fromUuid(request.messageUuid), actor = message?.system?.action?.actor;
  if (!user?.active || !actor?.testUserPermission(user, 'OWNER') || !holdItem(actor) || !eligibleAttack(message) ||
      message.flags?.[ID]?.holdThemOff || rollState(message) !== request.rollState ||
      message.system.action.range !== request.range || hopeCapacity(actor) < 3) return null;
  const origin = await fromUuid(request.originUuid), scene = origin?.parent;
  if (origin?.actor?.uuid !== actor.uuid || (message.speaker.scene && scene?.id !== message.speaker.scene) ||
      (message.speaker.token && origin.id !== message.speaker.token) || JSON.stringify(scene.rangeSettings) !== request.rangeState) return null;
  if (!message.speaker.token && [...scene.tokens].filter(t => t.actor?.uuid === actor.uuid).length !== 1) return null;
  if (!selected) return { message, actor };
  if (!Array.isArray(selected) || selected.length < 1 || selected.length > 2 || new Set(selected).size !== selected.length) return null;
  const limit = rangeLimit(scene, request.range), targets = [];
  for (const id of selected) {
    const candidate = request.candidates.find(c => c.id === id);
    if (!candidate) return null;
    const token = await fromUuid(candidate.tokenUuid);
    if (!token || token.parent.id !== scene.id || token.id !== id || token.actor?.type !== 'adversary' ||
        unavailableActor(token.actor) || Number(token.actor.system?.resources?.hitPoints?.value)>=Number(token.actor.system?.resources?.hitPoints?.max) ||
        targets.some(t=>t.actorId===token.actor.uuid) || message.system.targets.some(t => t.id === id || t.actorId === token.actor.uuid)) return null;
    const owner = ownerFor(actor, [...game.users], game.user);
    if (!owner.isGM && token.hidden) return null;
    let distance;
    if (canvas.ready && canvas.scene.id === scene.id && origin.object && token.object) distance = origin.object.distanceTo(token.object);
    else return null;
    if (!Number.isFinite(distance) || !(distance <= limit)) return null;
    const target = game.system.api.fields.ActionFields.TargetField.formatTarget(token.object ?? token);
    target.hitResult = { success: attackTargetOutcome(message.system.roll,target)==='success' };
    targets.push(target);
  }
  return { message, actor, targets };
}
export async function resolveHold(request, { user }, choose = promptHold) {
  if (!game.user.isActiveGM || !Number.isFinite(request.deadline) || request.deadline < decisionNow() ||
      request.deadline > decisionNow() + decisionBudget(125000) || pending.has(request.messageUuid)) return null;
  const initial = await validate(request, user);
  if (!initial || initial.message.flags?.[ID]?.holdOffered) return null;
  pending.add(request.messageUuid);
  try {
    const offered=await initial.message.update({ [`flags.${ID}.holdPending`]: true, [`flags.${ID}.holdOffered`]: true });
    if(!offered)throw Error('Could not record Hold Them Off offer.');
    const owner = ownerFor(initial.actor, [...game.users], game.user);
    const data = { actorUuid: initial.actor.uuid, candidates: request.candidates, range: request.range, total: initial.message.system.roll.total };
    const selected = owner.isSelf ? await choose(data, { user: game.user }) : await owner.query(PROMPT, data, { timeout: decisionBudget(65000) });
    if (!selected || request.deadline < decisionNow()) return null;
    return await withHopeLock(initial.actor.uuid, async () => {
      const valid = await validate(request, user, selected);
      if (!valid) { ui.notifications.warn('Hold Them Off: the roll, targets, range, or available Hope changed. No Hope spent.'); return null; }
      const { actor, message, targets } = valid;
      if(!owner.active||!user.active||request.deadline<decisionNow())return null;
      const reserved=await message.update({[`flags.${ID}.holdThemOff`]:{state:'committing',targets:selected}});
      if(!reserved)throw Error('Could not reserve Hold Them Off.');
      let payment;
      try{payment=await spendHope(actor,3);}catch(error){if(isHopePaymentCancellation(error))return null;throw error;}
      if(!payment)return null;
      try {
        const saved = await message.update({ 'system.targets': [...message.system.targets, ...targets],
          [`flags.${ID}.holdThemOff`]: { state:'complete', targets: selected, range: request.range, total: message.system.roll.total } });
        if (!saved) throw new Error('Could not add Hold Them Off targets.');
      } catch (error) { throw Error('Hold Them Off was paid; check its targets manually before continuing: '+error.message); }
      return targets;
    });
  } finally {
    pending.delete(request.messageUuid);
    await initial.message.update({ [`flags.${ID}.-=holdPending`]: null });
  }
}
export function installHold(RollField, request) {
  if (RollField[WRAPPED]) return;
  const native = RollField.execute;
  RollField.execute = async function(config,...args) {
    const result = await native.call(this, config,...args);
    if(result===false||config.hasHealing)return result;
    const message = config.message;
    if(!message)return result;
    if (!holdItem(this.actor) || hopeCapacity(this.actor) < 3 || !eligibleAttack(message) || message.flags?.[ID]?.holdOffered || message.flags?.[ID]?.holdThemOff) return result;
    const selection = collectHoldTargets(message);
    if (!selection) { ui.notifications.warn('Hold Them Off needs the attacking token and its attack range on the viewed scene.'); return result; }
    if (!selection.candidates.length) return result;
    if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
    let targets;try{targets = await request({ ...selection, messageUuid: message.uuid, rollState: rollState(message), deadline: decisionNow() + decisionBudget(120000) });}catch(error){console.error(ID+' | Hold Them Off',error);ui.notifications.error(error.message);return result;}
    if (targets) config.targets.push(...targets.filter(t => !config.targets.some(existing => existing.id === t.id)));
    return result;
  };
  Object.defineProperty(RollField, WRAPPED, { value: true });
}
export function registerHoldThemOff() {
  CONFIG.queries[QUERY] = resolveHold; CONFIG.queries[PROMPT] = promptHold;
  installHold(game.system.api.fields.ActionFields.RollField, async request => {
    const gm = game.users.activeGM;
    if (!gm) { ui.notifications.warn('Hold Them Off needs an active GM.'); return null; }
    return gm.isSelf ? resolveHold(request, { user: game.user }) : gm.query(QUERY, request, { timeout: decisionBudget(125000) });
  });
  refreshActionField(game.system.api.data.actions.actionsTypes.base,'roll',game.system.api.fields.ActionFields.RollField,action=>action.type==='attack'&&Boolean(holdItem(action.actor)));
  Hooks.on('daggerheart.preUseAction', action => {
    if (action.id === HOLD_ACTION && holdItem(action.actor)?.id === action.item.id) {
      ui.notifications.info('Hold Them Off is offered after a successful weapon attack.'); return false;
    }
  });
  Hooks.on('renderChatMessageHTML', (message, html) => {
    if (message.flags?.[ID]?.holdPending) for (const button of html.querySelectorAll('button')) button.disabled = true;
    if (message.flags?.[ID]?.holdThemOff?.state==='complete' && message.isContentVisible) {
      const note = html.ownerDocument.createElement('p');
      const count = message.flags[ID].holdThemOff.targets.length;
      note.textContent = `Hold Them Off: spent 3 Hope to reuse this attack roll against ${count} additional ${count === 1 ? 'adversary' : 'adversaries'}.`;
      html.querySelector('.message-content')?.append(note);
    }
  });
}
