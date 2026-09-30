import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { FEATURE_KEY } from './true-strike-data.js';
import { adaptabilityOutcome } from './adaptability.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { withHopeLock } from './hope-lock.js';
export const TRUE_ACTION='kECUBjkHOxnSOVqE';
const uses=item=>(item?.system.actions?.get?.(TRUE_ACTION)??item?.system.actions?.[TRUE_ACTION])?.uses;
export function trueItem(actor){return Number(actor?.system?.resources?.hope?.value)>=1?actor.items.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===FEATURE_KEY&&Number(uses(item)?.value??0)===0&&uses(item)?.recovery==='longRest';})??null:null;}
export function trueAttack(actor,source){
 const item=actor?.items?.get?.(source?.item),id=source?.action;
 const action=(item?.system.actionsList??[]).find(a=>(a.id??a._id)===id)??item?.system.actions?.get?.(id)??item?.system.actions?.[id]??((item?.system.attack?.id??item?.system.attack?._id)===id?item.system.attack:null)??((actor?.system.attack?.id??actor?.system.attack?._id)===id?actor.system.attack:null);
 return action?.type==='attack';
}
export async function validateTrue(request,user){
 if(!user?.active||request.deadline<=decisionNow()||!Number.isFinite(request.total))return null;
 const actor=await fromUuid(request.sourceUuid),item=trueItem(actor);
 if(!item||item.uuid!==request.candidate?.itemUuid||!actor.testUserPermission(user,'OWNER')||!trueAttack(actor,request.source))return null;
 const outcome=adaptabilityOutcome(request.total,request.critical,request.difficulty,request.targets);return outcome==='success'?null:{actor,item,outcome};
}
export async function resolveTrue(request,{user},authorize=consumeResolutionTicket){
 if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
 return withHopeLock(request.sourceUuid,async()=>{
  const valid=await validateTrue(request,user);if(!valid||!authorize(request.resolutionToken,'true-strike',valid.item.uuid,user))return false;
  const next=Number(valid.actor.system.resources.hope.value)-1;
  await valid.item.update({[`system.actions.${TRUE_ACTION}.uses.value`]:1});
  if(Number(uses(valid.item)?.value)!==1)throw new Error('Could not spend True Strike use.');
  try{const updated=await valid.actor.update({'system.resources.hope.value':next});if(!updated||Number(valid.actor.system.resources.hope.value)!==next)throw new Error('Could not spend True Strike Hope.');}catch(error){await valid.item.update({[`system.actions.${TRUE_ACTION}.uses.value`]:0});throw error;}
  return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
 });
}
export function registerTrueStrike(){
 CONFIG.queries[`${ID}.trueStrike`]=resolveTrue;
 Hooks.on('daggerheart.preUseAction',action=>{if(action.id===TRUE_ACTION&&trueItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('True Strike is offered in roll resolution after a failed attack.');return false;}});
 Hooks.on('renderChatMessageHTML',(message,html)=>{if(!message.isContentVisible||!message.rolls?.some(r=>r.options?.[ID]?.trueStrike)||html.querySelector('.dhp-true-strike'))return;const note=html.ownerDocument.createElement('p');note.className='dhp-true-strike';note.textContent='True Strike changed this attack to a success.';html.querySelector('.message-content')?.append(note);});
}
