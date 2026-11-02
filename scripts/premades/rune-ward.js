import {markRerolledDice} from '../reroll-indicators.js';
import {nativeRuneWard,wardReductionChange,registerNativeRuneWard} from './rune-ward-native.js';
import {isHopePaymentCancellation,hopeCapacity,spendHope,refundHope} from './hope-payment.js';
import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {RUNE_WARD_KEY,RUNE_WARD_ACTION,RUNE_WARD_CHARGED,RUNE_WARD_DRAINED} from './rune-ward-data.js';
import {damageProtectionExempt} from './damage-protection.js';

const QUERY=`${ID}.runeWard`,PROMPT=`${QUERY}Prompt`,ACTION_WRAP=Symbol.for(`${ID}.runeWardAction`),DAMAGE_WRAP=Symbol.for(`${ID}.runeWardDamage`),REST_WRAP=Symbol.for(`${ID}.runeWardRest`),receipts=new Map(),nativeSessions=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function runeWardItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return item.type==='domainCard'&&!item.system?.inVault&&featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===RUNE_WARD_KEY;})??null:null;}
export function runeWardEffects(actor,state=null){return damageProtectionExempt(actor)?[]:[...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.flags?.[ID]?.runeWard?.itemUuid&&(!state||effect.flags[ID].runeWard.state===state));}
export function runeWardHolders(source){const party=game.actors.party?.system?.partyMembers??[];return[...new Map([source,...party].filter(actor=>actor?.type==='character'&&actor.uuid).map(actor=>[actor.uuid,actor])).values()];}
function sourceEffect(item,state){const id=state==='charged'?RUNE_WARD_CHARGED:RUNE_WARD_DRAINED;return item.effects?.get?.(id)??item.effects?.find?.(effect=>(effect.id??effect._id)===id);}
function wardEffectData(item,state){const template=sourceEffect(item,state),data=template?.toObject?template.toObject():structuredClone(template);if(!data)throw Error('Rune Ward effects are missing. Reapply Medkit.');delete data._id;delete data.id;data.disabled=false;data.transfer=false;data.origin=template.uuid??`${item.uuid}.ActiveEffect.${state==='charged'?RUNE_WARD_CHARGED:RUNE_WARD_DRAINED}`;if(nativeRuneWard())data.system.changes=state==='charged'?[wardReductionChange(item.uuid)]:[];data.flags={...data.flags,[ID]:{...data.flags?.[ID],runeWard:{itemUuid:item.uuid,sourceActorUuid:item.actor.uuid,state}}};return data;}
async function removeWardCopies(item,keep=[]){const retained=new Set(keep);for(const actor of game.actors){const ids=runeWardEffects(actor).filter(effect=>effect.flags[ID].runeWard.itemUuid===item.uuid&&!retained.has(effect.id)).map(effect=>effect.id);if(ids.length)await actor.deleteEmbeddedDocuments('ActiveEffect',ids);}}
export async function validRuneWard(effect){const data=effect?.flags?.[ID]?.runeWard,item=data?.itemUuid?await fromUuid(data.itemUuid):null;return data?.state==='charged'&&runeWardItem(item?.actor)?.uuid===item.uuid?{effect,item,source:item.actor}:null;}
export async function runeWardCandidates(target){const candidates=[];for(const effect of runeWardEffects(target,'charged')){const valid=await validRuneWard(effect);if(valid)candidates.push(valid);}return candidates.sort((a,b)=>a.item.uuid.localeCompare(b.item.uuid));}

export async function activateRuneWard(request,{user}){
 if(!game.user.isActiveGM||!user?.active)return false;
 const source=await fromUuid(request.sourceActorUuid),holder=await fromUuid(request.holderUuid),item=runeWardItem(source);
 if(!item||!source.testUserPermission(user,'OWNER')||!runeWardHolders(source).some(actor=>actor.uuid===holder?.uuid))return false;
 return withHopeLock(`runeWard-source:${item.uuid}`,async()=>{
  if(!game.user.isActiveGM||!user.active||runeWardItem(source)?.uuid!==item.uuid||!source.testUserPermission(user,'OWNER'))return false;
  const copies=[...game.actors].flatMap(actor=>runeWardEffects(actor).filter(effect=>effect.flags[ID].runeWard.itemUuid===item.uuid));
  // Moving the trinket never recharges a drained ward. Re-selecting its current
  // holder also must not create a duplicate native-origin effect.
  const state=copies.some(effect=>effect.flags[ID].runeWard.state==='drained')?'drained':'charged';
  const retained=runeWardEffects(holder,state).find(effect=>effect.flags[ID].runeWard.itemUuid===item.uuid);
  if(retained){await removeWardCopies(item,[retained.id]);return true;}
  const created=await holder.createEmbeddedDocuments('ActiveEffect',[wardEffectData(item,state)]);
  if(!created.length)throw Error('Rune Ward could not be given to its holder.');
  try{await removeWardCopies(item,created.map(effect=>effect.id));}
  catch(error){await holder.deleteEmbeddedDocuments('ActiveEffect',created.map(effect=>effect.id));throw error;}
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:source}),content:`<p><strong>Rune Ward:</strong> ${esc(source.name)} gives the ${state} ward to ${esc(holder.name)}.</p>`});
  return true;
 });
}
export async function promptRuneWard(data,{user}){const holder=await fromUuid(data.holderUuid),effect=holder?.effects?.get?.(data.effectId)??holder?.effects?.find?.(entry=>entry.id===data.effectId),valid=await validRuneWard(effect);if(!user?.isGM||!holder?.testUserPermission(game.user,'OWNER')||!valid||hopeCapacity(holder)<1)return false;return Boolean(await timedDialog(`Rune Ward — ${holder.name}`,`<p>${esc(holder.name)} is taking <strong>${esc(data.total)} damage</strong>.</p><p>Spend <strong>1 Hope</strong> and roll the <strong>d8 Ward Die</strong> before native damage reduction?</p>`,[{action:'spend',label:'Spend Hope & Roll d8',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
async function swapRuneWard(holder,effect,item,state){const created=await holder.createEmbeddedDocuments('ActiveEffect',[wardEffectData(item,state)]);if(!created.length)throw Error(`Rune Ward could not become ${state}.`);try{await holder.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);}catch(error){await holder.deleteEmbeddedDocuments('ActiveEffect',created.map(entry=>entry.id));throw error;}return created[0];}
const wardEffect=(holder,id)=>holder?.effects?.get?.(id)??holder?.effects?.find?.(effect=>effect.id===id);
const serializeWardRoll=roll=>roll.toJSON();
async function notifyWardRoll(holder,roll,total,drained,native,rerolled=false){
 try{
  const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:holder}),
   flavor:`<strong>Rune Ward${rerolled?' — Reroll':''}</strong><p>Reduces incoming damage by ${Math.min(total,Number(roll.total))}.${drained?' The ward is drained.':''}</p>`});
  if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
 }catch(error){if(!native)throw error;console.warn(`${ID} | Rune Ward roll notification`,error);}
}
async function rerollNativeWard(request,user,rollDie){
 const session=nativeSessions.get(`${user.id}:${request.id}`);
 if(!session||session.holderUuid!==request.holderUuid||session.expires<decisionNow())return false;
 return withHopeLock(`runeWard-source:${session.itemUuid}`,()=>withHopeLock(session.holderUuid,async()=>{
  const holder=await fromUuid(session.holderUuid),item=await fromUuid(session.itemUuid),effect=wardEffect(holder,session.effectId);
  if(!game.user.isActiveGM||!user.active||!holder?.testUserPermission(user,'OWNER')||
   nativeSessions.get(`${user.id}:${request.id}`)!==session||request.deadline<decisionNow())return false;
  if(request.op==='nativeClose'){nativeSessions.delete(`${user.id}:${request.id}`);return true;}
  if(request.revision!==session.revision+1||runeWardItem(item?.actor)?.uuid!==session.itemUuid||
   effect?.flags?.[ID]?.runeWard?.itemUuid!==session.itemUuid||effect.disabled||effect.isSuppressed)return false;
  const roll=await rollDie(),result=Number(roll.total);
  if(!Number.isInteger(result)||result<1||result>8)throw Error('Rune Ward produced an invalid d8 result.');
  markRerolledDice(roll.dice);
  const serialized=serializeWardRoll(roll),drained=result===8,state=drained?'drained':'charged';
  if(effect.flags[ID].runeWard.state!==state)session.effectId=(await swapRuneWard(holder,effect,item,state)).id;
  session.revision=request.revision;session.expires=decisionNow()+decisionBudget(300000);
  await notifyWardRoll(holder,roll,session.total,drained,true,true);
  return {reduction:result,drained,roll:serialized};
 }));
}
export async function resolveRuneWard(request,{user},ask=promptRuneWard,rollDie=async()=>new Roll('1d8').evaluate()){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||!Number.isFinite(request.total)||request.total<=0||
  !Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
 for(const[id,record]of receipts)if(record.expires<decisionNow())receipts.delete(id);
 for(const[id,record]of nativeSessions)if(record.expires<decisionNow())nativeSessions.delete(id);
 const followup=['nativeReroll','nativeClose'].includes(request.op);
 if(request.op==='nativeReroll'&&(!Number.isSafeInteger(request.revision)||request.revision<1))return false;
 const key=`${user.id}:${request.id}${followup?':'+request.op+':'+(request.revision??0):''}`,signature=JSON.stringify(request);
 if(receipts.has(key)){const prior=receipts.get(key);return prior.signature===signature?prior.promise:false;}
 const promise=(async()=>{
  if(followup)return rerollNativeWard(request,user,rollDie);
  let holder=await fromUuid(request.holderUuid),effect=wardEffect(holder,request.effectId),valid=await validRuneWard(effect);
  if(!valid||hopeCapacity(holder)<1||request.op==='nativeRoll'&&!holder.testUserPermission(user,'OWNER'))return false;
  const owner=ownerFor(holder,[...game.users],game.user),accepted=request.op==='nativeRoll'?true:owner.isSelf?await ask(request,{user:game.user}):
   await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
  if(!accepted||request.deadline<decisionNow())return false;
  return withHopeLock(`runeWard-source:${valid.item.uuid}`,()=>withHopeLock(holder.uuid,async()=>{
   try{
    holder=await fromUuid(request.holderUuid);effect=wardEffect(holder,request.effectId);valid=await validRuneWard(effect);
    if(!valid||hopeCapacity(holder)<1||request.deadline<decisionNow()||request.op==='nativeRoll'&&(!user.active||!holder.testUserPermission(user,'OWNER')))return false;
    const hopePayment=await spendHope(holder,1);if(!hopePayment)throw Error('Rune Ward could not spend Hope.');
    let roll;
    try{roll=await rollDie();if(!Number.isInteger(Number(roll.total))||Number(roll.total)<1||Number(roll.total)>8)throw Error('Rune Ward produced an invalid d8 result.');}
    catch(error){await refundHope(holder,hopePayment);throw error;}
    const result=Number(roll.total),drained=result===8;
    if(drained)effect=await swapRuneWard(holder,effect,valid.item,'drained');
    if(request.op==='nativeRoll')nativeSessions.set(`${user.id}:${request.id}`,{holderUuid:holder.uuid,itemUuid:valid.item.uuid,
     effectId:effect.id,revision:0,total:request.total,expires:decisionNow()+decisionBudget(300000)});
    await notifyWardRoll(holder,roll,request.total,drained,request.op==='nativeRoll');
    return {reduction:result,drained,...(request.op==='nativeRoll'?{roll:serializeWardRoll(roll)}:{})};
   }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}
  }));
 })();
 receipts.set(key,{signature,promise,expires:decisionNow()+decisionBudget(300000)});return promise;
}
export function incomingRuneDamage(args={}){const damage='total'in args?args:(args.main??args.damage),total=typeof damage==='number'?damage:Number(damage?.total);return Number.isFinite(total)&&total>0?{damage,total}:null;}
export function reducedRuneDamage(args,amount){const incoming=incomingRuneDamage(args),total=Math.max(0,incoming.total-Math.max(0,Number(amount)||0));if('total'in args)return{...args,total};const damage=incoming.damage,options=damage?.options?{...damage.options}:damage?.damageTypes?{damageTypes:damage.damageTypes}:null;return{...args,main:{total,...(options?{options}: {})},resources:args.resources};}
async function offerRuneWard(holder,total){let remaining=total;for(const candidate of await runeWardCandidates(holder)){if(remaining<=0)break;const gm=game.users.activeGM;if(!gm)throw Error('Rune Ward needs an active GM.');const request={id:foundry.utils.randomID(),holderUuid:holder.uuid,effectId:candidate.effect.id,total:remaining,deadline:decisionNow()+decisionBudget(120000)},result=gm.isSelf?await resolveRuneWard(request,{user:game.user}):await gm.query(QUERY,request,{timeout:decisionBudget(125000)});if(result)remaining=Math.max(0,remaining-result.reduction);}return remaining;}
export function installRuneWardDamage(Actor,offer=offerRuneWard){if(Actor[DAMAGE_WRAP])return;const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(args={},...rest){const incoming=incomingRuneDamage(args);if(!incoming||hopeCapacity(this)<1||!(await runeWardCandidates(this)).length)return native.call(this,args,...rest);const remaining=await offer(this,incoming.total);return native.call(this,reducedRuneDamage(args,incoming.total-remaining),...rest);};Object.defineProperty(Actor,DAMAGE_WRAP,{value:true});}
export async function rechargeRuneWard(request,{user}){if(!game.user.isActiveGM||!user?.active)return false;const source=await fromUuid(request.sourceActorUuid),item=runeWardItem(source);if(!item||!source.testUserPermission(user,'OWNER'))return false;return withHopeLock(`runeWard-source:${item.uuid}`,async()=>{let count=0;for(const holder of game.actors){for(const effect of runeWardEffects(holder,'drained').filter(entry=>entry.flags[ID].runeWard.itemUuid===item.uuid)){await swapRuneWard(holder,effect,item,'charged');count++;}}if(count)await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:source}),content:`<p><strong>Rune Ward:</strong> ${esc(source.name)} recharges the ward.</p>`});return count;});}
export function installRuneWardRest(Downtime,dispatch){if(!Downtime||Downtime[REST_WRAP])return;const native=Downtime.prototype.close;Downtime.prototype.close=async function(...args){const source=this.actor,completed=Boolean(this.nrChoices&&Object.values(this.nrChoices).every(category=>Number(category.taken)>=Number(category.max))),result=await native.apply(this,args);if(completed&&runeWardItem(source))await dispatch({op:'recharge',sourceActorUuid:source.uuid});return result;};Object.defineProperty(Downtime,REST_WRAP,{value:true});}
export async function registerRuneWard(){CONFIG.queries[QUERY]=async(request,context)=>request.op==='activate'?activateRuneWard(request,context):request.op==='recharge'?rechargeRuneWard(request,context):resolveRuneWard(request,context);CONFIG.queries[PROMPT]=promptRuneWard;const dispatch=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Rune Ward needs an active GM.');return gm.isSelf?CONFIG.queries[QUERY](request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});};if(nativeRuneWard())registerNativeRuneWard(runeWardCandidates,dispatch,actor=>runeWardEffects(actor,'charged').some(effect=>{const item=foundry.utils.fromUuidSync(effect.flags[ID].runeWard.itemUuid);return runeWardItem(item?.actor)?.uuid===item?.uuid;}));else installRuneWardDamage(CONFIG.Actor.documentClass);installRuneWardRest(game.system.api.applications.dialogs.Downtime,dispatch);if(nativeRuneWard()&&game.user.isActiveGM)for(const actor of game.actors)for(const effect of runeWardEffects(actor)){const data=effect.flags[ID].runeWard;if(data.state==='charged'&&(await validRuneWard(effect))&&!effect.system.changes.some(row=>row.type==='damageReduction'))await effect.update({'system.changes':[wardReductionChange(data.itemUuid)]});}const Action=game.system.api.data.actions.actionsTypes.base;if(!Action[ACTION_WRAP]){const native=Action.prototype.use;Action.prototype.use=async function(...args){if(this.id!==RUNE_WARD_ACTION||runeWardItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);if(!this.actor.testUserPermission(game.user,'OWNER'))return false;const targets=[...(game.user.targets??[])].map(token=>token.actor).filter(Boolean);if(targets.length>1)throw Error('Rune Ward requires one targeted holder, or no target to choose yourself.');return dispatch({op:'activate',sourceActorUuid:this.actor.uuid,holderUuid:(targets[0]??this.actor).uuid});};Object.defineProperty(Action,ACTION_WRAP,{value:true});}}
