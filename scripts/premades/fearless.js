import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { FEARLESS_KEY,FEARLESS_ACTION } from './fearless-data.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { markReactiveStress } from './stress-payment.js';
export function fearlessItem(actor){
  const stress=actor?.system?.resources?.stress;
  if(actor?.type!=='character'||!(Number(stress?.max)-Number(stress?.value)>=2))return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===FEARLESS_KEY;})??null;
}
export async function validateFearless(request,user){
  if(!user?.active||request.deadline<=decisionNow()||request.critical||!request.withFear||![request.hope,request.fear].every(Number.isFinite)||request.fear<=request.hope)return null;
  const actor=await fromUuid(request.sourceUuid),item=fearlessItem(actor);
  if(!actor?.testUserPermission(user,'OWNER')||!item||item.uuid!==request.candidate?.itemUuid)return null;
  return {actor,item};
}
export async function resolveFearless(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Fearless request.');
  const valid=await validateFearless(request,user);if(!valid)return false;
  if(!authorize(request.resolutionToken,'fearless',valid.item.uuid,user))return false;
  if(!await markReactiveStress(valid.actor.uuid,actor=>fearlessItem(actor)?.uuid===valid.item.uuid,2))return false;
  return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
}
export function registerFearless(){
  CONFIG.queries[`${ID}.fearless`]=resolveFearless;
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(flags?.disabled||action.id!==FEARLESS_ACTION||(flags?.applied?.key??flags?.premade?.key)!==FEARLESS_KEY)return;
    ui.notifications.info('Fearless is offered in roll resolution when you roll with Fear.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.fearless)?.options[ID].fearless;
    if(!used||html.querySelector('.dhp-fearless-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-fearless-note';note.textContent=`Fearless: ${used.bearerName} changed the roll to Hope.`;
    html.querySelector('.message-content')?.append(note);
  });
}
