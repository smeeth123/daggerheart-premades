import {ID,featureActive} from '../core.js';
import {consumeResolutionTicket} from '../resolution-manager.js';
import {decisionNow} from '../decision-clock.js';
import {withHopeLock} from './hope-lock.js';
import {ARCANA_TOUCHED_ACTION,ARCANA_TOUCHED_KEY} from './arcana-touched-data.js';

export const ARCANA_TOUCHED_QUERY=ID+'.arcanaTouched';
const keyed=item=>item?.type==='domainCard'&&
 (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===ARCANA_TOUCHED_KEY;

export function arcanaTouchedItem(actor){
 if(actor?.type!=='character')return null;
 return actor.items?.find(item=>keyed(item)&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
  !item.system.inVault&&!item.system.isDomainTouchedSuppressed&&
  Number(item.system.resource?.value)===1&&
  actor.items.filter(card=>card.type==='domainCard'&&card.system.domain==='arcana'&&!card.system.inVault).length>=4)??null;
}

export async function validateArcanaTouched(request,user){
 if(!user?.active||request?.actionType!=='action'||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||
  !Number.isFinite(request.hope)||!Number.isFinite(request.fear)||request.hope===request.fear)return null;
 const actor=await fromUuid(request.sourceUuid);
 if(!actor?.testUserPermission(user,'OWNER'))return null;
 const item=arcanaTouchedItem(actor);
 return item&&item.uuid===request.candidate?.itemUuid?{actor,item}:null;
}

export async function resolveArcanaTouched(request,{user},authorize=consumeResolutionTicket){
 if(!game.user.isActiveGM)return false;
 const valid=await validateArcanaTouched(request,user);
 if(!valid||!authorize(request.resolutionToken,'arcana-touched',valid.item.uuid,user))return false;
 return withHopeLock(valid.item.uuid,async()=>{
  const current=await validateArcanaTouched(request,user);
  if(!game.user.isActiveGM||!current)return false;
  const updated=await current.item.update({'system.resource.value':0});
  if(!updated||Number(current.item.system.resource.value)!==0)throw Error('Could not confirm the Arcana-Touched use.');
  return true;
 });
}

export function registerArcanaTouched(){
 CONFIG.queries[ARCANA_TOUCHED_QUERY]=resolveArcanaTouched;
 Hooks.on('daggerheart.preUseAction',action=>{
  const item=action.item;
  if(action.id!==ARCANA_TOUCHED_ACTION||!keyed(item)||item.flags?.[ID]?.disabled)return;
  ui.notifications.info('Arcana-Touched offers Swap Dice in Roll Resolution when available.');
  return false;
 });
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!message.isContentVisible||!message.rolls?.some(roll=>roll.options?.[ID]?.arcanaTouched)||
   html.querySelector('.dhp-arcana-touched'))return;
  const note=html.ownerDocument.createElement('p');
  note.className='dhp-arcana-touched';
  note.textContent='Arcana-Touched swapped the Hope and Fear Die results.';
  html.querySelector('.message-content')?.append(note);
 });
}
