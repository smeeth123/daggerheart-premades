import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import {timedDialog} from '../dialog.js';
import {helpRecipients,validHelpRecipient} from '../help-ally.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {consumeResolutionTicket,resolutionTicketStatus} from '../resolution-manager.js';
import {REASSURANCE_KEY,REASSURANCE_ACTION} from './reassurance-data.js';
export {rerollAdaptability as rerollReassurance} from './adaptability.js';

const QUERY=`${ID}.reassurance`,PROMPT=`${QUERY}Consent`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actionFor=item=>item?.system?.actions?.get?.(REASSURANCE_ACTION)??item?.system?.actions?.[REASSURANCE_ACTION];
export function reassuranceAvailable(item){
  const flags=item?.flags?.[ID],system=item?.system,action=actionFor(item);
  return Boolean(item?.type==='domainCard'&&item.actor?.type==='character'&&!unavailableActor(item.actor)&&featureActive(item)&&!flags?.disabled&&
    (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===REASSURANCE_KEY&&
    action?.uses?.recovery==='shortRest'&&Number(action.uses.value??0)===0&&Number(action.uses.max)===1);
}
export function reassuranceCandidates(actor){
  if(actor?.type!=='character')return [];
  return helpRecipients(actor).filter(bearer=>validHelpRecipient(bearer,actor)&&!unavailableActor(bearer))
    .flatMap(bearer=>[...(bearer.items??[])].filter(reassuranceAvailable).map(item=>({itemUuid:item.uuid})));
}
export async function validateReassurance(request,user){
  if(!user?.active||request?.actionType!=='action'||criticalRerollResult(request)||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||
    ![request.total,request.hope,request.fear].every(Number.isFinite))return null;
  const source=await fromUuid(request.sourceUuid),item=await fromUuid(request.candidate?.itemUuid),bearer=item?.actor;
  if(source?.type!=='character'||!source.testUserPermission(user,'OWNER')||!reassuranceAvailable(item)||
    !validHelpRecipient(source,bearer)||!validHelpRecipient(bearer,source))return null;
  return {source,bearer,item};
}
export async function promptReassuranceConsent(data,{user}){
  const source=await fromUuid(data.sourceUuid),item=await fromUuid(data.itemUuid),bearer=item?.actor;
  if(!user?.active||!user.isGM||!source?.testUserPermission(game.user,'OWNER')||!reassuranceAvailable(item)||!validHelpRecipient(bearer,source))return false;
  return Boolean(await timedDialog(`Reassurance — ${source.name}`,
    `<p><strong>${esc(bearer.name)}</strong> offers Reassurance. Reroll <strong>all dice</strong> from your action roll? The new result replaces this result before consequences.</p>`,
    [{action:'use',label:'Allow reroll',icon:'fa-solid fa-dice',callback:()=>true},{action:'decline',label:'Keep this roll',default:true,callback:()=>false}]));
}
export async function resolveReassurance(request,{user},authorize=consumeResolutionTicket,ask=promptReassuranceConsent){
  if(!game.user.isActiveGM||!Number.isFinite(request?.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  let valid=await validateReassurance(request,user);
  if(!valid||!authorize(request.resolutionToken,'reassurance',valid.item.uuid,user))return false;
  const recipient=ownerFor(valid.source,[...game.users],game.user),holder=ownerFor(valid.bearer,[...game.users],game.user);
  await resolutionTicketStatus(request.resolutionToken,'Awaiting consent');
  const data={sourceUuid:valid.source.uuid,itemUuid:valid.item.uuid};
  const accepted=recipient.isSelf?await ask(data,{user:game.user}):await recipient.query(PROMPT,data,{timeout:decisionBudget(65000)});
  await resolutionTicketStatus(request.resolutionToken,'Resolving');
  if(accepted!==true||!recipient.active)return false;
  return withHopeLock(valid.item.uuid,async()=>{
    valid=await validateReassurance(request,user);
    if(!valid||!game.user.isActiveGM||!recipient.active||!holder.active||!valid.source.testUserPermission(recipient,'OWNER')||
      !valid.bearer.testUserPermission(holder,'OWNER'))return false;
    const updated=await valid.item.update({[`system.actions.${REASSURANCE_ACTION}.uses.value`]:1});
    if(!updated||Number(actionFor(valid.item)?.uses.value)!==1)throw Error('Could not spend Reassurance’s rest use.');
    return {itemUuid:valid.item.uuid,bearerName:valid.bearer.name,sourceName:valid.source.name};
  });
}
export function registerReassurance(){
  CONFIG.queries[QUERY]=resolveReassurance;CONFIG.queries[PROMPT]=promptReassuranceConsent;
  Hooks.on('daggerheart.preUseAction',action=>{
    const item=action.item,flags=item?.flags?.[ID];
    if(action.id!==REASSURANCE_ACTION||flags?.disabled||(flags?.applied?.key??flags?.premade?.key)!==REASSURANCE_KEY)return;
    ui.notifications.info('Offer Reassurance in Roll Resolution after an ally’s action roll, before consequences.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible||html.querySelector('.dhp-reassurance-note'))return;
    const uses=message.rolls?.find(roll=>roll.options?.[ID]?.reassurance)?.options[ID].reassurance;if(!uses?.length)return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-reassurance-note';
    note.textContent=`Reassurance: ${uses.map(use=>use.bearerName).join(', ')} offered a reroll of all action dice.`;
    html.querySelector('.message-content')?.append(note);
  });
}
