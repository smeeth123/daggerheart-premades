import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import { ID } from '../core.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { withHopeLock } from './hope-lock.js';
import { NIMBLE_KEY,NIMBLE_ACTION } from './nimble-fingers-data.js';
export function nimbleItem(actor){
  if(actor?.type!=='character'||Number(actor.system.resources.hope.value)<2)return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===NIMBLE_KEY;
  })??null;
}
export async function validateNimble(request,user){
  if(!user?.active||criticalRerollResult(request)||request.trait!=='finesse'||request.deadline<=decisionNow())return null;
  const actor=await fromUuid(request.sourceUuid),item=nimbleItem(actor);
  if(!actor?.testUserPermission(user,'OWNER')||!item||item.uuid!==request.candidate?.itemUuid)return null;
  return {actor,item};
}
export async function resolveNimble(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Nimble Fingers request.');
  return withHopeLock(request.sourceUuid,async()=>{
    const valid=await validateNimble(request,user);if(!valid)return false;
    if(!authorize(request.resolutionToken,'nimble',valid.item.uuid,user))return false;
    const next=Number(valid.actor.system.resources.hope.value)-2;
    const updated=await valid.actor.update({'system.resources.hope.value':next});
    if(!updated||Number(valid.actor.system.resources.hope.value)!==next)throw new Error('Could not spend Nimble Fingers Hope.');
    return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
  });
}
export async function rerollHopeDie(roll){
  const original=roll.dHope,position=roll.terms.indexOf(original);
  if(position<0)throw new Error('Could not find the Hope Die in this roll.');
  const options={...original.options};delete options.sfx;
  const die=new original.constructor({number:original.number,faces:original.faces,modifiers:[...original.modifiers],options});
  const pair=foundry.dice.Roll.fromTerms([die]);await pair.evaluate();
  roll.terms[position]=die;roll._total=roll._evaluateTotal();return pair;
}
export function registerNimbleFingers(){
  CONFIG.queries[`${ID}.nimbleFingers`]=resolveNimble;
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(action.id!==NIMBLE_ACTION||(flags?.applied?.key??flags?.premade?.key)!==NIMBLE_KEY)return;
    ui.notifications.info('Nimble Fingers is available in roll resolution after a Finesse roll.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.nimbleFingers)?.options[ID].nimbleFingers;
    if(!used||html.querySelector('.dhp-nimble-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-nimble-note';
    note.textContent=`Nimble Fingers: ${used.bearerName} rerolled the Hope Die.`;
    html.querySelector('.message-content')?.append(note);
  });
}
