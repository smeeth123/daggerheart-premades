import { ID,featureActive } from '../core.js';
import {refreshActionField} from '../action-field-workflow.js';
import {rallyMembers} from './rally-targets.js';
import {absorbingWrites} from './armor-absorbing.js';
import { withHopeLock } from './hope-lock.js';
import { RALLY_KEY } from './rally-data.js';

const QUERY = `${ID}.rally`;
const WRAPPED = Symbol.for(QUERY);
export const STRESS_ACTION = 'dhpRallyStress01';
// Foundry's legacy effect migration JSON-parses numeric strings. Rally's native
// roll parser calls toLowerCase(), so retain a non-JSON text expression.
export const rallyFormula = faces => `${Number(faces)} + 0`;
export const rallyChange = effect => effect?.system?.changes?.find(c => c.key === 'system.bonuses.rally');
export const managedRally = effect => Boolean(rallyChange(effect) && (
  effect.flags?.[ID]?.rally || effect.parent?.items?.some(i => i.flags?.[ID]?.rallyEffect === effect.id)
));
export function rallyEffects(action) {
  const flags = action.item?.flags?.[ID];
  if (!featureActive(action.item??{}) || flags?.disabled || (flags?.applied?.key ?? flags?.premade?.key) !== RALLY_KEY) return [];
  return (action.effects ?? []).map(e => (action.item?.applyEffects ?? action.item?.effects)?.get(e._id)).filter(rallyChange);
}
export function partyActors(actor) {
  const party = game.actors.party ?? game.actors.find(a => a.type === 'party' && a.system.active);
  return party?rallyMembers(actor,party):[];
}
export function stressFeature(effect, faces) {
  return {
    name: `Rally — Clear Stress (d${faces})`, type: 'feature', img: effect.img,
    flags: { [ID]: { rallyEffect: effect.id, rallyFaces: faces } },
    system: {
      description: `<p>Spend this Rally Die: roll 1d${faces} and clear that much Stress. Spending the die removes this temporary feature and its Rally effect. Unspent dice expire on session refresh.</p>`,
      featureForm: 'passive',
      actions: { [STRESS_ACTION]: {
        _id: STRESS_ACTION, type: 'effect', systemPath: 'actions', name: 'Roll Rally Die to Clear Stress',
        chatDisplay: false, target: { type: 'self', amount: 1 }, effects: [], cost: [], triggers: []
      } }
    }
  };
}
export async function cleanFeatures(actor) {
  return withHopeLock(`rally-features:${actor.uuid}`, async () => {
    const ids = actor.items.filter(i => {
      const id = i.flags?.[ID]?.rallyEffect;
      return id && !actor.effects.get(id);
    }).map(i => i.id);
    if (ids.length) await actor.deleteEmbeddedDocuments('Item', ids);
  });
}
export async function ensureStressFeature(effect) {
  const actor = effect.parent;
  if (actor?.documentName !== 'Actor' || !rallyChange(effect)) return;
  const formula = String(rallyChange(effect).value).replace(/^d/i, '');
  const parsed = Roll.replaceFormulaData(formula, actor.getRollData());
  const faces = Number(game.system.api.documents.DhActiveEffect.effectSafeEval(parsed));
  if (![6, 8].includes(faces)) throw new Error('Rally requires a d6 or d8.');
  const updates = {};
  if (effect.system.duration?.type !== 'session') updates['system.duration.type'] = 'session';
  if (typeof rallyChange(effect).value !== 'string' || /^\s*\d+\s*$/.test(rallyChange(effect).value)) {
    updates['system.changes'] = effect.toObject().system.changes.map(c =>
      c.key === 'system.bonuses.rally' ? { ...c, value: rallyFormula(faces) } : c);
  }
  if (Object.keys(updates).length) await effect.update(updates);
  if (!actor.items.some(i => i.flags?.[ID]?.rallyEffect === effect.id)) {
    await actor.createEmbeddedDocuments('Item', [stressFeature(effect, faces)]);
  }
}
async function consume(actor, effect) {
  await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
  await cleanFeatures(actor);
}
export async function resolveRally(request, { user }) {
  if (!game.user.isActiveGM || !user?.active) throw new Error('Rally needs an active GM.');
  const actor = await fromUuid(request.actorUuid);
  if (!actor?.testUserPermission(user, 'OWNER')) throw new Error('You do not own this actor.');
  return withHopeLock(`rally:${actor.uuid}`, async () => {
    if (request.kind === 'grant') {
      const item = actor.items.get(request.itemId);
      const action = item?.system.actions.get(request.actionId);
      const effects = action ? rallyEffects(action) : [];
      if (!effects.length || action.id!=='vI4Fph3y9ygsya9e' || Number(action.uses?.value??0)>=1) throw new Error('The Rally action is unavailable.');
      const targets = partyActors(actor);
      if (!targets.length) throw new Error('Set an active party with members before using Rally.');
      const faces = Number(actor.system.levelData.level.current) >= 5 ? 8 : 6;
      for (const target of targets) {
        for (const source of effects) {
          // Retrying an application must not give a second die from the same bard.
          let effect = target.effects.find(e => rallyChange(e) && e.origin === source.uuid);
          if (!effect) {
            const data = source.toObject();
            delete data._id;
            data.origin = source.uuid;
            data.disabled = false;
            data.transfer = false;
            data.system.duration = { ...data.system.duration, type: 'session' };
            data.system.changes = data.system.changes.map(c => c.key === 'system.bonuses.rally' ? { ...c, value: rallyFormula(faces) } : c);
            [effect] = await target.createEmbeddedDocuments('ActiveEffect', [data]);
          }
          await ensureStressFeature(effect);
        }
      }
      return true;
    }
    const effect = actor.effects.get(request.effectId);
    if (!effect || effect.disabled || !managedRally(effect)) return false;
    if (request.kind === 'consume') { await consume(actor, effect); return true; }
    if (request.kind !== 'stress') throw new Error('Unknown Rally operation.');
    const item = actor.items.get(request.itemId);
    if (item?.flags?.[ID]?.rallyEffect !== effect.id) return false;
    const faces = Number(item.flags[ID].rallyFaces);
    if (![6, 8].includes(faces)) throw new Error('Invalid Rally die.');
    const roll = await new Roll(`1d${faces}`).evaluate();
    const before = Number(actor.system.resources.stress.value);
    await absorbingWrites(actor,()=>actor.takeHealing({resources:{stress:roll.total}}));
    const after = Number(actor.system.resources.stress.value);
    await consume(actor, effect);
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Rally — cleared ${before - after} Stress` });
    return true;
  });
}
async function requestRally(data) {
  const gm = game.users.activeGM;
  if (!gm) throw new Error('Rally needs an active GM.');
  return gm.isSelf ? resolveRally(data, { user: game.user }) : gm.query(QUERY, data);
}
export function installRally(EffectsField, DamageRoll, request = requestRally) {
  if (EffectsField[WRAPPED]) return;
  const execute = EffectsField.execute;
  EffectsField.execute = async function(config, ...args) {
    if (!rallyEffects(this).length) return execute.call(this, config, ...args);
    await request({ kind: 'grant', actorUuid: this.actor.uuid, itemId: this.item.id, actionId: this.id });
  };
  const spend = async config => {
    const effectId = config.modifiers?.rally?.value;
    if (!config.hasHealing && config.damage?.main && config.damageFormula?.applyTo === 'hitPoints' && effectId) {
      const actor = config.data?.parent;
      if (managedRally(actor?.effects.get(effectId))) await request({ kind: 'consume', actorUuid: actor.uuid, effectId });
    }
  };
  const evaluate = DamageRoll.buildEvaluate;
  DamageRoll.buildEvaluate = async function(roll,config,...args){
    const result=await evaluate.call(this,roll,config,...args);try{await spend(config);}catch(error){console.error(ID+' | Rally',error);ui.notifications.error('Rally die removal needs manual review: '+error.message);}return result;
  };
  const post=DamageRoll.buildPost;
  DamageRoll.buildPost=async function(roll,config,...args){const result=await post.call(this,roll,config,...args);try{await spend(config);}catch(error){console.error(ID+' | Rally',error);ui.notifications.error('Rally die removal needs manual review: '+error.message);}return result;};
  Object.defineProperty(EffectsField, WRAPPED, { value: true });
}
export function registerRally() {
  CONFIG.queries[QUERY] = resolveRally;
  installRally(game.system.api.fields.ActionFields.EffectsField, CONFIG.Dice.daggerheart.DamageRoll);
  refreshActionField(game.system.api.data.actions.actionsTypes.base,'effects',game.system.api.fields.ActionFields.EffectsField,action=>rallyEffects(action).length>0);
  const report = error => { console.error(`${ID} | Rally`, error); ui.notifications.error(error.message); };
  Hooks.on('daggerheart.preUseAction', (action, config) => {
    const effectId = action.item?.flags?.[ID]?.rallyEffect;
    if (action.id === STRESS_ACTION && effectId) {
      requestRally({ kind: 'stress', actorUuid: action.actor.uuid, itemId: action.item.id, effectId }).catch(report);
      return false;
    }
    if (!rallyEffects(action).length) return;
    const actors = partyActors(action.actor);
    if (!actors.length || !game.users.activeGM) {
      ui.notifications.warn('Rally needs an active GM and an active party with members.');
      return false;
    }
    config.targets = actors.map(a => ({ actorId: a.uuid, name: a.name, img: a.img, saveResult: { success: false } }));
  });
  Hooks.on('deleteActiveEffect', effect => {
    if (game.user.isActiveGM && effect.parent?.documentName === 'Actor' && rallyChange(effect)) cleanFeatures(effect.parent).catch(report);
  });
  // Upgrade existing unspent Rally dice too; do not remove them on browser reload.
  if (game.user.isActiveGM) (async () => {
    for (const actor of game.actors) {
      await cleanFeatures(actor);
      for (const effect of actor.effects) if (managedRally(effect)) await ensureStressFeature(effect);
    }
  })().catch(report);
}
