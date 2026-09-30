import { braveItem } from './brave-face.js';
import { unshakeableItem, markUnshakeableStress } from './unshakeable.js';
const payments = new Map();
// Share the commit lock across reactive Stress features; do not hold it while a player decides.
export async function markReactiveStress(actorUuid, eligible, count=1) {
  if(!Number.isInteger(count)||count<1)throw new Error('Invalid Stress cost.');
  const pending = (payments.get(actorUuid) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const actor = await fromUuid(actorUuid);
    const stress = actor?.system?.resources?.stress;
    if (!actor || !eligible(actor) || !(Number(stress?.max)-Number(stress?.value)>=count)) return false;
    if (unshakeableItem(actor)) return markUnshakeableStress(actor,count);
    const braveBefore=braveItem(actor);
    const braveUse=braveBefore?.system.actions?.get?.('sguCcIhnp8FjwVZd')??braveBefore?.system.actions?.sguCcIhnp8FjwVZd;
    const beforeUse=Number(braveUse?.uses.value??0);
    const next = Number(stress.value) + count;
    const updated = await actor.update({ 'system.resources.stress.value': next });
    const afterAction=braveBefore?.system.actions?.get?.('sguCcIhnp8FjwVZd')??braveBefore?.system.actions?.sguCcIhnp8FjwVZd;
    const substituted=Boolean(braveBefore&&beforeUse===0&&Number(afterAction?.uses.value)===1);
    if (!updated || Number(actor.system.resources.stress.value) !== next-(substituted?1:0)) throw new Error('Could not mark Stress.');
    return true;
  });
  payments.set(actorUuid, pending);
  try { return await pending; }
  finally { if (payments.get(actorUuid) === pending) payments.delete(actorUuid); }
}
