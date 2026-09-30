import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { STABLE_KEY,STABLE_EFFECT } from './stable-data.js';
import { withHopeLock } from './hope-lock.js';
import { syncFocus } from './stance-fighter.js';
export const STABLE_QUERY=`${ID}.stableSpend`;
export function eligibleStable(actor){
 if(!(Number(actor?.system?.resources?.focus?.value)>=1))return null;
 const item=actor.items.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===STABLE_KEY;});
 const origin=item?.effects?.get(STABLE_EFFECT)?.uuid;
 return origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed)?item:null;
}
export async function spendStable(request,{user}){
 return withHopeLock(request.actorUuid,async()=>{
  const actor=await fromUuid(request.actorUuid);
  if(!user?.active||!actor?.testUserPermission(user,'OWNER'))throw new Error('You do not own this actor.');
  if(!Number.isFinite(request.deadline)||request.deadline<=decisionNow())throw new Error('This damage dialog has expired.');
  const item=eligibleStable(actor);
  if(!item||item.id!==request.itemId)throw new Error('Stable requires its active stance and 1 Focus.');
  const next=Number(actor.system.resources.focus.value)-1;
  const updated=await actor.update({'system.resources.focus.value':next});
  if(!updated||Number(actor.system.resources.focus.value)!==next)throw new Error('Could not spend Stable Focus.');
  await syncFocus(actor);return true;
 });
}
