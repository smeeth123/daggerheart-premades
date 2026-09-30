import { decisionBudget } from '../settings.js';
import {ID,featureActive} from '../core.js';
import {CLARITY_KEY,CLARITY_ACTION} from './clarity-nature-data.js';
import {timedDialog} from '../dialog.js';
import {withHopeLock} from './hope-lock.js';
const QUERY=`${ID}.clarityNature`,pending=new Set();
const esc=s=>foundry.utils.escapeHTML(String(s??''));
const actionFor=item=>item?.system.actions?.get?.(CLARITY_ACTION)??item?.system.actions?.[CLARITY_ACTION];
export function clarityItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===CLARITY_KEY;})??null;}
export function clarityPool(actor){return Math.max(0,Math.floor(Number(actor?.system?.traits?.instinct?.value)||0));}
export function clarityMembers(actor){return [...new Map([actor,...(game.actors.party?.system.partyMembers??[])].filter(a=>a?.uuid&&a.system?.resources?.stress).map(a=>[a.uuid,a])).values()];}
export function validateClarity(actor,allocations){
 const item=clarityItem(actor),action=actionFor(item);
 if(!item||!action||Number(action.uses.value??0)>=1)throw new Error('Clarity of Nature is unavailable until your next long rest.');
 if(!Array.isArray(allocations)||!allocations.length)throw new Error('Choose at least 1 Stress to clear.');
 const members=new Map(clarityMembers(actor).map(a=>[a.uuid,a])),seen=new Set();let total=0;
 const selected=allocations.map(({actorUuid,amount})=>{
  const member=members.get(actorUuid);
  if(!member||seen.has(actorUuid)||!Number.isSafeInteger(amount)||amount<1||amount>Number(member.system.resources.stress.value))throw new Error('The party or marked Stress changed. Reopen Clarity of Nature.');
  seen.add(actorUuid);total+=amount;return {actor:member,amount};
 });
 if(total>clarityPool(actor))throw new Error('The allocation exceeds your Instinct.');
 return {item,selected};
}
export async function promptClarity(actor){
 const pool=clarityPool(actor),members=clarityMembers(actor);
 if(!pool||!members.some(a=>Number(a.system.resources.stress.value)>0)){ui.notifications.info('No Stress can currently be cleared with Clarity of Nature.');return null;}
 const content=`<p>After spending a few minutes resting in your space of natural serenity, distribute up to <strong>${pool} Stress</strong> among the participants.</p><p>Choose party members who rested with you in the space within Close range.</p><div>${members.map((a,i)=>`<div style="display:grid;grid-template-columns:1fr auto 5rem;align-items:center;gap:1rem;margin:.5rem 0"><label for="clarity-${i}">${esc(a.name)}</label><span>${Number(a.system.resources.stress.value)} marked</span><input id="clarity-${i}" data-clarity="${i}" aria-label="Stress to clear for ${esc(a.name)}" type="number" value="0" min="0" max="${Math.min(pool,Number(a.system.resources.stress.value))}" step="1"></div>`).join('')}</div><p data-clarity-remaining></p>`;
 const read=dialog=>[...dialog.element.querySelectorAll('[data-clarity]')].map(input=>({actorUuid:members[Number(input.dataset.clarity)].uuid,amount:Number(input.value)}));
 return timedDialog(`Clarity of Nature — ${actor.name}`,content,[{action:'apply',label:'Clear Stress',callback:(_e,_b,dialog)=>read(dialog).filter(x=>x.amount>0)},{action:'cancel',label:'Cancel',default:true,callback:()=>null}],dialog=>{
  const refresh=()=>{const choices=read(dialog),total=choices.reduce((s,x)=>s+x.amount,0);let valid=choices.every(x=>Number.isSafeInteger(x.amount)&&x.amount>=0);try{validateClarity(actor,choices.filter(x=>x.amount>0));}catch{valid=false;}
   dialog.element.querySelector('[data-clarity-remaining]').textContent=`${pool-total} of ${pool} Stress remaining to distribute`;
   const button=dialog.element.querySelector('[data-action="apply"]');if(button)button.disabled=!valid;
  };dialog.element.querySelectorAll('[data-clarity]').forEach(input=>input.addEventListener('input',refresh));refresh();
 });
}
export async function resolveClarity(request,{user}){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;
 const {item,selected,path}=await withHopeLock(actor.uuid,async()=>{
  const {item,selected}=validateClarity(actor,request.allocations),path=`system.actions.${CLARITY_ACTION}.uses.value`;
  const spent=await item.update({[path]:1});if(!spent||Number(actionFor(item).uses.value)!==1)throw new Error('Could not spend Clarity of Nature use.');
  return {item,selected,path};
 });
  const cleared=[];try{
   for(const entry of selected){const apply=async()=>{const stress=entry.actor.system.resources.stress,before=Number(stress.value),amount=Math.min(entry.amount,before);if(!amount)return;const result=await entry.actor.update({'system.resources.stress.value':before-amount});if(!result||Number(entry.actor.system.resources.stress.value)!==before-amount)throw new Error(`Could not clear Stress for ${entry.actor.name}.`);cleared.push({name:entry.actor.name,amount});};
    await withHopeLock(entry.actor.uuid,apply);
   }
  }catch(error){if(!cleared.length)await item.update({[path]:0});else await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Clarity of Nature — partially applied</strong></p><p>${cleared.map(x=>`${esc(x.name)}: ${x.amount} Stress cleared`).join('; ')}. The use remains spent.</p>`});throw error;}
  if(!cleared.length){await item.update({[path]:0});return false;}
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Clarity of Nature — ${esc(actor.name)}</strong></p><p>${cleared.map(x=>`${esc(x.name)} clears ${x.amount} Stress`).join('; ')}.</p>`});return true;
}
export function registerClarityNature(){
 CONFIG.queries[QUERY]=resolveClarity;
 const Action=game.system.api.data.actions.actionsTypes.base,native=Action.prototype.use;
 Action.prototype.use=async function(...args){
  if(this.id!==CLARITY_ACTION||clarityItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);
  const actor=this.actor;if(!actor.testUserPermission(game.user,'OWNER')||pending.has(actor.uuid))return false;
  if(Number(actionFor(clarityItem(actor))?.uses.value??0)>=1){ui.notifications.info('Clarity of Nature has already been used this long rest.');return false;}
  pending.add(actor.uuid);try{const allocations=await promptClarity(actor);if(!allocations?.length)return false;const gm=game.users.activeGM;if(!gm)throw new Error('Clarity of Nature needs an active GM.');const request={actorUuid:actor.uuid,allocations};return gm.isSelf?await resolveClarity(request,{user:game.user}):await gm.query(QUERY,request,{timeout:decisionBudget(65000)});}finally{pending.delete(actor.uuid);}
 };
}
