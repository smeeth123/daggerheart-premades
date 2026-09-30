import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { UNBOUND_KEY,UNBOUND_ACTION } from './unbound-data.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { withHopeLock } from './hope-lock.js';
export function unboundItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];const action=item.system.actions?.get?.(UNBOUND_ACTION)??item.system.actions?.[UNBOUND_ACTION];return action?.uses?.recovery==='session'&&Number(action.uses.value??0)===0&& item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===UNBOUND_KEY;})??null;
}
export async function validateUnbound(request,user){
  if(!user?.active||request.deadline<=decisionNow()||request.critical||!request.withFear||![request.hope,request.fear].every(Number.isFinite)||request.fear<=request.hope)return null;
  const actor=await fromUuid(request.sourceUuid),item=unboundItem(actor);
  if(!actor?.testUserPermission(user,'OWNER')||!item||item.uuid!==request.candidate?.itemUuid)return null;
  return {actor,item};
}
export async function resolveUnbound(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Unbound request.');
  return withHopeLock(request.sourceUuid,async()=>{
    const valid=await validateUnbound(request,user);if(!valid)return false;
    if(!authorize(request.resolutionToken,'unbound',valid.item.uuid,user))return false;
    const updated=await valid.item.update({[`system.actions.${UNBOUND_ACTION}.uses.value`]:1});
    const action=valid.item.system.actions?.get?.(UNBOUND_ACTION)??valid.item.system.actions?.[UNBOUND_ACTION];
    if(!updated||Number(action?.uses.value)!==1)throw new Error('Could not spend Unbound session use.');
    return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
  });
}
export function registerUnbound(){
  CONFIG.queries[`${ID}.unbound`]=resolveUnbound;
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(flags?.disabled||action.id!==UNBOUND_ACTION||(flags?.applied?.key??flags?.premade?.key)!==UNBOUND_KEY)return;
    ui.notifications.info('Unbound is offered in roll resolution when you roll with Fear.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.unbound)?.options[ID].unbound;
    if(!used||html.querySelector('.dhp-unbound-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-unbound-note';note.textContent=`Unbound: ${used.bearerName} changed the roll to Hope.`;
    html.querySelector('.message-content')?.append(note);
  });
}
