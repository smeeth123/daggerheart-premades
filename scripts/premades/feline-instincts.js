import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import { ID } from '../core.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { withHopeLock } from './hope-lock.js';
import { FELINE_KEY,FELINE_ACTION } from './feline-instincts-data.js';
export function felineItem(actor){
  if(actor?.type!=='character'||hopeCapacity(actor)<2)return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===FELINE_KEY;
  })??null;
}
export async function validateFeline(request,user){
  if(!user?.active||criticalRerollResult(request)||request.trait!=='agility'||request.deadline<=decisionNow())return null;
  const actor=await fromUuid(request.sourceUuid),item=felineItem(actor);
  if(!actor?.testUserPermission(user,'OWNER')||!item||item.uuid!==request.candidate?.itemUuid)return null;
  return {actor,item};
}
export async function resolveFeline(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Feline Instincts request.');
  return withHopeLock(request.sourceUuid,async()=>{try{let hopePayment;
    const valid=await validateFeline(request,user);if(!valid)return false;
    if(!authorize(request.resolutionToken,'feline',valid.item.uuid,user))return false;
    const next=hopeCapacity(valid.actor)-2;
    const updated=(hopePayment=await spendHope(valid.actor,2));
    if(!updated||!hopePayment)throw new Error('Could not spend Feline Instincts Hope.');
    return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
  }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
}
export function registerFelineInstincts(){
  CONFIG.queries[`${ID}.felineInstincts`]=resolveFeline;
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(action.id!==FELINE_ACTION||(flags?.applied?.key??flags?.premade?.key)!==FELINE_KEY)return;
    ui.notifications.info('Feline Instincts is available in roll resolution after an Agility roll.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.felineInstincts)?.options[ID].felineInstincts;
    if(!used||html.querySelector('.dhp-feline-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-feline-note';
    note.textContent=`Feline Instincts: ${used.bearerName} rerolled the Hope Die.`;
    html.querySelector('.message-content')?.append(note);
  });
}
