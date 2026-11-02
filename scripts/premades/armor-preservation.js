import {countDamage} from '../damage-context.js';

// Rebuild before clamping/immunities: adding to an already-zero preview loses
// reductions that exceeded the incoming severity. Paid Wings/Stable slots keep
// their full reduction; only preservation successes substitute one threshold.
export function preservedArmorDamage(actor, dialog, successes, fallback) {
  const factor = Number(actor.system?.rules?.damageReduction?.increasePerArmorMark ?? 1);
  if (factor === 1 || !dialog || !successes) return fallback;
  const info = dialog.getDamageInfo();
  const selected = dialog.marks.armor.flatMap(source => Object.values(source.marks)).filter(mark => mark.selected).length;
  const base = typeof dialog.getReducedDamage === 'function'
    ? countDamage(dialog.getReducedDamage() ?? dialog.damage, dialog.dhpDamageContext?.thresholds ?? actor.system.damageThresholds)
    : Number(dialog.damage);
  let damage = Math.max(base - selected * factor + successes * (factor - 1)
    - (info.stressReductions?.length ?? 0) - Number(dialog.reduceSeverity ?? 0)
    - Number(dialog.dhpDamageContext?.severity ?? 0), 0);
  if (dialog.thresholdImmunities?.[damage]) damage = 0;
  return damage;
}
