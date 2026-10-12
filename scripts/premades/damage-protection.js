import {ID} from '../core.js';

// The dome uses an adversary sheet for native thresholds/HP, but is not a
// creature eligible for ally protection. Identify existing domes by their
// own generation, not by name, disposition, caster, or source-card presence.
export function damageProtectionExempt(actor){
  const dome=actor?.flags?.[ID]?.wildFortress;
  return Boolean(actor?.type==='adversary'&&dome?.actorUuid===actor.uuid&&
    dome.stage==='ready'&&dome.generation&&dome.casterUuid&&dome.itemUuid);
}
