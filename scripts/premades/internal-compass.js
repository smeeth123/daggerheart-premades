import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { COMPASS_KEY } from './internal-compass-data.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
export function compassItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===COMPASS_KEY;
  })??null;
}
export async function validateCompass(request,user){
  if(!user?.active||request.hope!==1||request.deadline<=decisionNow())return null;
  const actor=await fromUuid(request.sourceUuid),item=compassItem(actor);
  if(!actor?.testUserPermission(user,'OWNER')||!item||item.uuid!==request.candidate?.itemUuid)return null;
  return {actor,item};
}
export async function resolveCompass(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Internal Compass request.');
  const valid=await validateCompass(request,user);if(!valid)return false;
  if(!authorize(request.resolutionToken,'compass',valid.item.uuid,user))return false;
  return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
}
export function registerInternalCompass(){
  CONFIG.queries[`${ID}.internalCompass`]=resolveCompass;
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.internalCompass)?.options[ID].internalCompass;
    if(!used||html.querySelector('.dhp-compass-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-compass-note';
    note.textContent=`Internal Compass: ${used.bearerName} rerolled the Hope Die.`;
    html.querySelector('.message-content')?.append(note);
  });
}
