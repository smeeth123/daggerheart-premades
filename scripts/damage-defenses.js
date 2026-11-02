import {ID} from './core.js';
import {decisionBudget} from './settings.js';
import {decisionNow,decisionTimeout,clearDecisionTimeout} from './decision-clock.js';
import {withHopeLock} from './premades/hope-lock.js';
import {damageProtectionExempt} from './premades/damage-protection.js';
import {bulkyDamagePacket} from './premades/armor-bulky.js';
import {damageOptions,damageCallOptions} from './damage-options.js';
import {markRerolledDice} from './reroll-indicators.js';

const providers=new Map(),sessions=new Map(),deliveries=new Map();
const QUERY=ID+'.damageDefense',DAMAGE=QUERY+'Damage',WRAP=Symbol.for(QUERY);
export const nativeDefenseDialog=()=>{
 const [major,minor]=String(globalThis.game?.system?.version??'').split('.').map(Number);
 return major>2||major===2&&minor>=12;
};
export function registerDamageDefense(key,provider){providers.set(key,provider);}
export async function rollDamageDefense(formula,actor,label,reroll=false,options={}){
 const roll=await new Roll(formula,{},options).evaluate();if(reroll)markRerolledDice(roll.dice);
 try{
  const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:'<strong>'+String(label).replace(/[<>&]/g,'')+'</strong>',flags:{[ID]:{unshakeableRoll:true}}});
  if(message&&game.dice3d&&roll.dice?.length)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
 }catch(error){console.warn(ID+' | Damage defense dice notification',error);}
 return {reduction:Number(roll.total),roll:roll.toJSON(),formula};
}
export function damageDefenseOffers(record){
 if(!nativeDefenseDialog()||record.actor?.type!=='character'||damageProtectionExempt(record.actor))return [];
 return [...providers].flatMap(([key,provider])=>provider.offers(record).map(offer=>({...offer,provider:key})));
}
export function openDamageDefenses(record){
 const offers=damageDefenseOffers(record);if(!offers.length||!game.user.isActiveGM)return;
 record.defenses={id:foundry.utils.randomID(),offers};record.defenseResults=new Map();
 sessions.set(record.defenses.id,record);
}
export async function finishDamageDefenses(record,updates){
 if(!record.defenses)return;
 record.closed=true;
 sessions.delete(record.defenses.id);
 if(!Array.isArray(updates)||!updates.some(row=>row.key==='hitPoints'&&row.damageTypes))return;
 for(const result of record.defenseResults.values()){
  try{await providers.get(result.provider)?.after?.(record,result);}
  catch(error){console.error(ID+' | Damage defense follow-up',error);ui.notifications.error('Damage completed, but a defensive follow-up needs manual review: '+error.message);}
 }
}
export async function resolveDamageDefense(request,{user}){
 const record=sessions.get(request?.session);
 if(!game.user.isActiveGM||!user?.active||!record||record.closed||!record.actor.testUserPermission(user,'OWNER')||
  !/^\w{16}$/.test(request.id??'')||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
 const original=record.defenses.offers.find(offer=>offer.id===request.offer),provider=providers.get(original?.provider);
 if(!provider)return false;
 const revision=request.revision??0;
 if(!Number.isSafeInteger(revision)||revision<0)return false;
 const key=request.id,signature=JSON.stringify(request);
 record.defenseRequests??=new Map();
 const old=record.defenseRequests.get(key);if(old)return old.signature===signature?old.promise:false;
 const promise=withHopeLock('defense:'+record.defenses.id,async()=>{
  if(record.closed||sessions.get(request.session)!==record||!user.active||!record.actor.testUserPermission(user,'OWNER')||request.deadline<decisionNow())return false;
  const previous=record.defenseResults.get(original.id);
  if(previous?!provider.reroll||revision!==previous.revision+1:revision!==0)return false;
  const offer=provider.offers(record).find(entry=>entry.id===original.id);
  if(!offer&&!previous)return false;
  const result=await provider.use(record,{...(offer??original),original},request,user,previous);
  if(!result)return false;
  record.defenseResults.set(original.id,{...result,revision,provider:original.provider});
  return result;
 });
 record.defenseRequests.set(key,{signature,promise});return promise;
}
const call=request=>{
 const gm=game.users.activeGM;if(!gm)throw Error('Damage defenses require an active GM.');
 return gm.isSelf?resolveDamageDefense(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
};
export function initializeDefenseRows(dialog){
 for(const offer of dialog.dhpDamageContext?.defenses?.offers??[]){
  if(offer.uiOnly)continue;
  dialog.reductions.push({label:offer.label,value:offer.formula??'0',isDeterministic:false,enabled:Boolean(offer.automatic),costs:{},
   defense:{...offer,revision:-1}});
 }
}
export async function useDefenseRow(dialog,event,target){
 const index=target.closest('[data-reduction-index]')?.dataset.reductionIndex,row=dialog.reductions[index];
 if(!row?.defense)return false;
 event?.stopPropagation?.();
 if(dialog.wingsBusy||row.defense.busy||row.roll&&!row.defense.reroll)return true;
 row.defense.busy=true;dialog.wingsBusy=true;const started=decisionNow();
 try{
  const container=dialog.element?.querySelector(`[data-reduction-index="${index}"]`);
  const choices=row.defense.choices;
  const selection=choices?(container?Array.from(container.querySelectorAll('input[data-defense-choice]:checked')).map(input=>input.value):row.defense.selection??[]):undefined;
  const count=row.defense.max?Number(container?.querySelector('[data-defense-count]')?.value??row.defense.count??1):undefined;
  if(choices&&!selection.length){ui.notifications.warn('Select Prayer Dice to spend.');return true;}
  row.defense.request??={id:foundry.utils.randomID(),session:dialog.dhpDamageContext.defenses.id,offer:row.defense.id,revision:row.defense.revision+1,
   ...(selection?{selection}:{}),...(count?{count}:{}),deadline:decisionNow()+decisionBudget(120000)};
  const result=await call(row.defense.request);
  row.defense.request=null;
  if(!result){if(row.defense.automatic){row.enabled=false;row.defense.failed=true;}ui.notifications.warn('That damage defense is no longer available or was declined.');return true;}
  row.defense.revision++;row.defense.paid=true;
  row.roll=typeof result.roll==='string'?Roll.fromJSON(result.roll):Roll.fromData(result.roll);row.enabled=true;
  if(result.label)row.label=result.label;
  if(result.formula)row.value=result.formula;
 }catch(error){ui.notifications.error(error.message);}
 finally{
  row.defense.busy=false;dialog.wingsBusy=false;
  if(Number.isFinite(dialog.wingsDeadline)){
   dialog.wingsDeadline+=decisionNow()-started;clearDecisionTimeout(dialog.wingsTimer);
   dialog.wingsTimer=decisionTimeout(()=>{if(!dialog.wingsBusy)void dialog.close();},Math.max(0,dialog.wingsDeadline-decisionNow()));
  }
  await dialog.render();
 }
 return true;
}
export function toggleDefenseRow(dialog,event,target){
 const row=dialog.reductions[target.closest('[data-reduction-index]')?.dataset.reductionIndex];
 if(!row?.defense)return false;
 event?.stopPropagation?.();
 if(!dialog.wingsBusy&&!row.defense.automatic&&!row.roll){row.enabled=!row.enabled;void dialog.render();}
 return true;
}
export async function renderDefenseRows(dialog,html){
 for(const [index,row]of dialog.reductions.entries()){
  const offer=row.defense;if(!offer)continue;
  const element=html.querySelector(`[data-reduction-index="${index}"]`);if(!element)continue;
  if(!row.roll&&offer.choices){
   const placeholder=element.querySelector('.not-rolled');if(placeholder)placeholder.textContent='Choose dice';
   element.querySelector('[data-action="rollReductionDice"]')?.remove();
  }
  element.querySelector('.dhp-defense-choices')?.remove();
  if(!row.roll&&(offer.max||offer.choices)){
   const choices=html.ownerDocument.createElement('div');choices.className='dhp-defense-choices';
   choices.addEventListener('click',event=>event.stopPropagation());
   if(offer.max){
    const label=html.ownerDocument.createElement('label');label.textContent='Tokens ';
    const select=html.ownerDocument.createElement('select');select.dataset.defenseCount='';
    for(let n=1;n<=offer.max;n++){const option=html.ownerDocument.createElement('option');option.value=n;option.textContent=n+' — '+n+'d6';select.append(option);}
    select.value=String(offer.count??1);select.addEventListener('change',()=>{offer.count=Number(select.value);});
    label.append(select);choices.append(label);
   }
   for(const option of offer.choices??[]){
    const label=html.ownerDocument.createElement('label'),input=html.ownerDocument.createElement('input');
    input.type='checkbox';input.dataset.defenseChoice='';input.value=option.id;input.checked=offer.selection?.includes(option.id)??false;
    input.addEventListener('change',()=>{offer.selection=Array.from(choices.querySelectorAll('input:checked')).map(input=>input.value);});
    label.append(input,' '+option.value);choices.append(label);
   }
   if(offer.choices){
    // Keep spending outside the native inactive roll section, and bind it
    // directly: neither a native dice icon nor a row toggle is required.
    const spend=html.ownerDocument.createElement('button');spend.type='button';spend.dataset.defenseSpend='';
    spend.textContent='Spend selected dice';spend.style.width='100%';
    spend.addEventListener('click',async event=>{event.stopPropagation();await useDefenseRow(dialog,event,spend);});
    choices.append(spend);
   }
   element.append(choices);
  }
  if(row.roll&&!offer.reroll)element.querySelector('[data-action="rollReductionDice"]')?.remove();
 }
 for(const [index,row]of dialog.reductions.entries())if(row.defense?.automatic&&!row.defense.failed&&!row.roll&&!row.defense.busy){
  await useDefenseRow(dialog,null,{closest:()=>({dataset:{reductionIndex:String(index)}})});
 }
}
export function registerDamageDefenseWorkflow(){
 if(!nativeDefenseDialog())return;
 CONFIG.queries[QUERY]=resolveDamageDefense;
 CONFIG.queries[DAMAGE]=async(request,{user})=>{
  if(!game.user.isActiveGM||!user?.active||!/^\w{16}$/.test(request?.id??''))return null;
  const actor=await fromUuid(request.actorUuid),packet=bulkyDamagePacket(request.packet),action=request.actionUuid?await fromUuid(request.actionUuid):null;
  const meta=packet?.main?.options?.[ID],sourceUuid=meta?.elementalSource??meta?.friendAttack??meta?.retributionSource?.actorUuid;
  const source=sourceUuid?await fromUuid(sourceUuid):null;
  if(!actor||!packet||!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!action?.actor?.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return null;
  const key=user.id+':'+request.id,signature=JSON.stringify(request),old=deliveries.get(key);
  if(old)return old.signature===signature?old.promise:null;
  const promise=actor.takeDamage(packet,damageCallOptions(request));deliveries.set(key,{signature,promise});
  if(deliveries.size>512)deliveries.delete(deliveries.keys().next().value);return promise;
 };
 const Actor=CONFIG.Actor.documentClass;if(Object.hasOwn(Actor,WRAP))return;
 const take=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(packet,options,...args){
  if(game.user.isActiveGM||!damageDefenseOffers({actor:this,packet,options:damageOptions(options)}).length)return take.call(this,packet,options,...args);
  const gm=game.users.activeGM;if(!gm)throw Error('Damage defenses require an active GM.');
  const result=await gm.query(DAMAGE,{id:foundry.utils.randomID(),actorUuid:this.uuid,packet:bulkyDamagePacket(packet),...damageOptions(options)},{timeout:decisionBudget(605000)});
  if(result===null)throw Error('Damage defenses could not coordinate this damage. Review the pending damage.');return result;
 };
 Object.defineProperty(Actor,WRAP,{value:true});
}
