import { ID, featureActive } from '../core.js';
import { FRAGILE_KEY } from './fragile-data.js';

const WRAPPED = Symbol.for(`${ID}.fragile`);

export function fragileItem(actor) {
  const transformed = actor?.type === 'character'
    && actor.effects?.some(effect => effect.type === 'beastform' && !effect.disabled && !effect.isSuppressed);
  if (!transformed) return null;
  return actor.items?.find(item => {
    const flags = item.flags?.[ID];
    return featureActive(item) && !flags?.disabled
      && (flags?.applied?.key ?? flags?.premade?.key) === FRAGILE_KEY;
  }) ?? null;
}

export function fragileMajor(updates) {
  return updates?.find(update => update.key === 'hitPoints'
    && !update.clear && !update.itemId && update.damageTypes != null && Number(update.value) >= 2) ?? null;
}

export function installFragile(Actor, endBeastform) {
  if (!Actor || Actor[WRAPPED]) return;
  const takeDamage = Actor.prototype.takeDamage;
  Actor.prototype.takeDamage = async function (packet, ...args) {
    const result = await takeDamage.call(this, packet, ...args);
    if (fragileMajor(result) && fragileItem(this)) await endBeastform(this);
    return result;
  };
  Object.defineProperty(Actor, WRAPPED, { value: true });
}

export function registerFragile() {
  const Field = game.system.api.fields.ActionFields.BeastformField;
  installFragile(CONFIG.Actor.documentClass, actor => Field.handleActiveTransformations.call({ actor }));
}
