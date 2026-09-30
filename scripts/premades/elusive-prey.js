import { ID, featureActive } from '../core.js';
import { ELUSIVE_PREY_KEY } from './elusive-prey-data.js';

export function elusivePreyItem(actor) {
  const stress = actor?.system?.resources?.stress;
  if (actor?.type !== 'character' || !(Number(stress?.value) < Number(stress?.max))) return null;
  return actor.items?.find(item => {
    const flags = item.flags?.[ID];
    return featureActive(item) && !flags?.disabled && (flags?.applied?.key ?? flags?.premade?.key) === ELUSIVE_PREY_KEY;
  }) ?? null;
}

export function elusivePreyCouldMiss(actor, total, evasion, critical = false) {
  return Boolean(!critical && elusivePreyItem(actor) && Number.isFinite(Number(total)) && Number.isFinite(Number(evasion))
    && Number(total) >= Number(evasion) && Number(total) < Number(evasion) + 4);
}
