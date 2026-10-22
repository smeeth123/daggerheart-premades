import { ID,featureActive } from '../core.js';
import {absorbingWrites} from './armor-absorbing.js';
import { UNSTOPPABLE_KEY } from './unstoppable-data.js';
import { withHopeLock } from './hope-lock.js';

const QUERY = `${ID}.unstoppable`, WRAPPED = Symbol.for(QUERY), DAMAGE = Symbol(QUERY);
const report = error => { console.error(`${ID} | Unstoppable`, error); ui.notifications.error(error.message); };
export function unstoppableItem(actor) {
  if(actor?.type!=='character')return null;
  return actor?.items?.find(item => {
    const f = item.flags?.[ID];
    return featureActive(item) && !f?.disabled && (f?.applied?.key ?? f?.premade?.key) === UNSTOPPABLE_KEY;
  });
}
export function activeUnstoppable(actor) {
  const item = unstoppableItem(actor);
  if (!item) return null;
  const effect = actor.effects.find(e => !e.disabled && !e.isSuppressed && !e.duration?.expired && e.flags?.[ID]?.unstoppable &&
    item.effects.some(source => source.uuid === e.origin));
  return effect ? { item, effect } : null;
}
export function dieMax(item) {
  const faces = Number(String(item.system.resource.dieFaces).replace(/^d/i, ''));
  if (![4, 6, 8, 10, 12, 20].includes(faces)) throw new Error('Unstoppable has an invalid die size.');
  return faces;
}
async function initialize(item, effect) {
  if (effect.flags?.[ID]?.unstoppableInitialized) return;
  await item.update({ 'system.resource.value': 1, 'system.resource.dieFaces': Number(item.actor?.system?.levelData?.level?.current)>=5?'d6':'d4' });
  await effect.update({ 'system.duration.type': 'scene', [`flags.${ID}.unstoppableInitialized`]: true });
}
export async function syncUnstoppable(actor, createdId) {
  if (!game.user.isActiveGM || !actor) return;
  return withHopeLock(`unstoppable:${actor.uuid}`, async () => {
    const item = unstoppableItem(actor);
    if (!item) return;
    const active = activeUnstoppable(actor);
    if (!active) {
      if (Number(item.system.resource.value) !== 0) await item.update({ 'system.resource.value': 0 });
      return;
    }
    if (createdId === active.effect.id) await initialize(item, active.effect);
    else if (active.effect.system.duration?.type !== 'scene') await active.effect.update({ 'system.duration.type': 'scene' });
  });
}
export async function resolveUnstoppable(request, { user }) {
  if (!game.user.isActiveGM || !user?.active) return false;
  const actor = await fromUuid(request.actorUuid), target = await fromUuid(request.targetUuid);
  if (!actor || !(actor.testUserPermission(user, 'OWNER') || target?.testUserPermission(user, 'OWNER')) ||
      typeof request.rollId !== 'string' || request.rollId.length > 64) return false;
  return withHopeLock(`unstoppable:${actor.uuid}`, async () => {
    const active = activeUnstoppable(actor);
    if (!active || active.effect.id !== request.effectId) return false;
    const { item, effect } = active;
    await initialize(item, effect);
    const spent = effect.flags?.[ID]?.unstoppableRolls ?? [];
    if (spent.includes(request.rollId)) return false;
    const next = Number(item.system.resource.value) + 1;
    if (next > dieMax(item)) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
      await item.update({ 'system.resource.value': 0 });
    } else {
      await effect.update({ [`flags.${ID}.unstoppableRolls`]: [...spent, request.rollId] });
      await item.update({ 'system.resource.value': next });
    }
    return true;
  });
}
async function advance(request) {
  const gm = game.users.activeGM;
  if (!gm) throw new Error('Unstoppable needs an active GM to advance its die.');
  return gm.isSelf ? resolveUnstoppable(request, { user: game.user }) : gm.query(QUERY, request);
}
export function hpMarked(actor, updates) {
  const direction = actor.system.resources?.hitPoints?.isReversed === false ? -1 : 1;
  return Array.isArray(updates) && updates.some(u => u.key === 'hitPoints' && !u.uuid && !u.itemId && !u.clear && Number(u.value) * direction >= 1);
}
export function installUnstoppable(DamageRoll, DamageField, ActorClass, increment = advance) {
  if (DamageField[WRAPPED]) return;
  const tag = async config => {
    const actor = config.data?.parent ?? (config.source?.actor ? await fromUuid(config.source.actor) : null);
    const active = activeUnstoppable(actor);
    if (!config.hasHealing && config.damage?.main && active && !config.damage.main.options?.[ID]?.unstoppableRoll) {
      config.damage.main.options[ID] = { ...config.damage.main.options[ID], unstoppableRoll: {
        actorUuid: actor.uuid, effectId: active.effect.id, rollId: foundry.utils.randomID()
      } };
      // Standalone weapon damage is saved through DataModel.toJSON(), which
      // serializes _source, not the prepared Roll we just changed. Rebuild the
      // model from evaluated rolls so the identity survives the chat round trip.
      config.damage = new config.damage.constructor({
        ...config.damage.toObject?.(),
        main: config.damage.main.toJSON(),
        resources: Object.fromEntries(Object.entries(config.damage.resources ?? {}).map(([key, value]) => [key, value.toJSON()]))
      }, { parent: config.damage.parent });
    }
  };
  const evaluate = DamageRoll.buildEvaluate;
  DamageRoll.buildEvaluate = async function(roll,config,...args){
    const result=await evaluate.call(this,roll,config,...args);
    await tag(config);return result;
  };
  const post=DamageRoll.buildPost;
  DamageRoll.buildPost=async function(roll,config,...args){await tag(config);return post.call(this,roll,config,...args);};
  const apply = DamageField.applyDamage;
  DamageField.applyDamage = async function(config, ...args) {
    const context = config.damage?.main?.options?.[ID]?.unstoppableRoll;
    if (!context || config.hasHealing) return apply.call(this, config, ...args);
    // Native applyDamage starts target promises without awaiting them. Carry the
    // roll identity on each cloned payload, rather than using global actor state.
    const damage = new Proxy(config.damage, { get(object, key) {
      if (key === 'clone') return (...params) => { const clone = object.clone(...params); clone[DAMAGE] = context; return clone; };
      return Reflect.get(object, key, object);
    } });
    return apply.call(this, { ...config, damage }, ...args);
  };
  const takeDamage = ActorClass.prototype.takeDamage;
  ActorClass.prototype.takeDamage = async function(args, ...rest) {
    // Standalone damage cards bypass DamageField.applyDamage and pass their
    // persisted ChatDamageData directly. Its Roll options retain this identity.
    const context = args?.[DAMAGE] ?? args?.main?.options?.[ID]?.unstoppableRoll;
    const before=Number(this.system.resources?.hitPoints?.value);
    const result = context?await absorbingWrites(this,()=>takeDamage.call(this,args,...rest)):await takeDamage.call(this, args, ...rest);
    const direction=this.system.resources?.hitPoints?.isReversed===false?-1:1;
    if (context && hpMarked(this, result) && (Number(this.system.resources?.hitPoints?.value)-before)*direction>=1) {
      try { await increment({ ...context, targetUuid: this.uuid }); } catch (error) { report(error); }
    }
    return result;
  };
  Object.defineProperty(DamageField, WRAPPED, { value: true });
}
export function registerUnstoppable() {
  CONFIG.queries[QUERY] = resolveUnstoppable;
  installUnstoppable(CONFIG.Dice.daggerheart.DamageRoll, game.system.api.fields.ActionFields.DamageField, CONFIG.Actor.documentClass);
  Hooks.on('createActiveEffect', effect => {
    if (effect.flags?.[ID]?.unstoppable && effect.parent?.documentName === 'Actor') syncUnstoppable(effect.parent, effect.id).catch(report);
  });
  Hooks.on('deleteActiveEffect', effect => {
    if (effect.flags?.[ID]?.unstoppable && effect.parent?.documentName === 'Actor') syncUnstoppable(effect.parent).catch(report);
  });
}
