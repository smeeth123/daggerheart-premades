import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {retributionSource} from './hideous-retribution.js';
import {SWARM_KEY,BEETLES_EFFECT} from './conjure-swarm-data.js';

const QUERY=`${ID}.conjureSwarm`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY);
const captures=new WeakMap(),requests=new Map(),latest=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function beetlesItem(actor){
  return actor?.type==='character'?actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    (!item.system?.inVault||item.system.vaultActive)&&!item.system?.isDomainTouchedSuppressed&&
    (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===SWARM_KEY)??null:null;
}
export function beetlesEffects(actor){
  return actor?.type==='character'?[...(actor.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired&&
    (effect.flags?.[ID]?.conjureBeetles===true||effect.origin?.endsWith(`.ActiveEffect.${BEETLES_EFFECT}`))):[];
}
export async function validBeetles(effect){
  if(effect.flags?.[ID]?.conjureBeetles===true)return true;
  const template=effect.origin?await fromUuid(effect.origin):null,item=template?.parent;
  return beetlesItem(item?.actor)?.uuid===item?.uuid&&Boolean(item);
}
async function capturedEffects(actor,ids){
  const allowed=new Set(ids),valid=[];
  for(const effect of beetlesEffects(actor))if(allowed.has(effect.id)&&await validBeetles(effect))valid.push(effect);
  return valid.filter(effect=>beetlesEffects(actor).includes(effect));
}
async function canKeep(actor,ids){
  const item=beetlesItem(actor),effects=await capturedEffects(actor,ids);
  return Boolean(item&&hopeCapacity(actor)>=1&&!actor.statuses?.has('dead')&&!actor.statuses?.has('defeated')&&
    effects.some(effect=>effect.origin===`${item.uuid}.ActiveEffect.${BEETLES_EFFECT}`)&&!beetlesEffects(actor).some(effect=>!ids.includes(effect.id)));
}
export async function promptBeetles(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!Array.isArray(data.effectIds)||!await canKeep(actor,data.effectIds))return false;
  return Boolean(await timedDialog(`Conjure Swarm — ${actor.name}`,'<p>Your armored beetles protected you from this damage.</p><p>Spend <strong>1 Hope</strong> to keep them conjured?</p>',[
    {action:'keep',label:'Keep Beetles — 1 Hope',callback:()=>true},{action:'decline',label:'Let Beetles Dissipate',default:true,callback:()=>false}]));
}
export async function finishBeetles(actor,ids,ask=promptBeetles){
  if(!game.user.isActiveGM)return false;
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,effectIds:ids};let accepted=false;
  if(await canKeep(actor,ids))try{accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});}
  catch(error){console.error(`${ID} | Conjure Swarm keep decision`,error);ui.notifications.error('The beetles decision could not complete. No Hope was spent; the used beetles dissipate.');}
  return withHopeLock(`beetles-state:${actor.uuid}`,async()=>{
    const effects=await capturedEffects(actor,ids);if(!effects.length)return false;
    let kept=false;
    if(accepted&&owner.active&&actor.testUserPermission(owner,'OWNER'))kept=await withHopeLock(actor.uuid,async()=>{try{let hopePayment;
      if(!game.user.isActiveGM||!owner.active||!actor.testUserPermission(owner,'OWNER')||!await canKeep(actor,ids))return false;
      const hope=hopeCapacity(actor),paid=(hopePayment=await spendHope(actor,1));
      if(!paid||!hopePayment)throw Error('Conjure Swarm could not confirm its Hope payment.');return true;
    }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
    if(!kept)await actor.deleteEmbeddedDocuments('ActiveEffect',effects.filter(effect=>beetlesEffects(actor).includes(effect)).map(effect=>effect.id));
    else try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Conjure Swarm:</strong> ${esc(actor.name)} spends 1 Hope to keep their armored beetles.</p>`});}
    catch(error){console.error(`${ID} | Conjure Swarm notification`,error);}
    return kept;
  });
}
export function beetlesDamageCompleted(calculated,updates){
  // Minor reduced to None still uses the beetles; canceled reduction has no HP receipt.
  return calculated&&Array.isArray(updates)&&updates.some(update=>update.key==='hitPoints'&&!update.clear&&!update.itemId&&
    update.damageTypes&&Number.isFinite(update.value)&&update.value>=0);
}
export async function resolveBeetlesDamage(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.actorUuid!=='string'||typeof request.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.isDirect!=='boolean')return null;
  const actor=await fromUuid(request.actorUuid),sourceUuid=retributionSource(request.packet),source=sourceUuid?await fromUuid(sourceUuid):null;
  if(actor?.type!=='character'||(!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))||!bulkyDamagePacket(request.packet))return null;
  const key=`${user.id}:${request.id}`,signature=JSON.stringify(request),prior=requests.get(key);if(prior)return prior.signature===signature?prior.operation:null;
  const operation=actor.takeDamage(request.packet,request.isDirect);requests.set(key,{signature,operation});if(requests.size>512)requests.delete(requests.keys().next().value);return operation;
}
export async function replaceBeetles(effect){
  const actor=effect.parent;
  if(!game.user.isActiveGM||actor?.documentName!=='Actor'||!beetlesEffects(actor).includes(effect))return false;
  latest.set(actor.uuid,effect.id);
  if(!await validBeetles(effect)||latest.get(actor.uuid)!==effect.id)return false;
  return withHopeLock(`beetles-state:${actor.uuid}`,async()=>{
    if(latest.get(actor.uuid)!==effect.id||!beetlesEffects(actor).includes(effect))return false;
    const old=(await capturedEffects(actor,beetlesEffects(actor).map(entry=>entry.id))).filter(entry=>entry.id!==effect.id);
    if(latest.get(actor.uuid)!==effect.id||!beetlesEffects(actor).includes(effect))return false;
    if(old.length)await actor.deleteEmbeddedDocuments('ActiveEffect',old.map(entry=>entry.id));return old.length>0;
  });
}
export function installBeetlesDamage(Actor,dispatch,ask=promptBeetles){
  if(Object.hasOwn(Actor,WRAPPED))return;const native=Actor.prototype.takeDamage;
  Hooks.on('daggerheart.postCalculateDamage',(actor,args)=>{const capture=captures.get(actor);if(capture)capture.calculated=Number(args.main?.value)>0;});
  Actor.prototype.takeDamage=async function(packet,...args){
    if(!bulkyDamagePacket(packet)||!beetlesEffects(this).length)return native.call(this,packet,...args);
    const ids=[];for(const effect of beetlesEffects(this))if(await validBeetles(effect))ids.push(effect.id);
    if(!ids.length)return native.call(this,packet,...args);
    if(!game.user.isActiveGM)return dispatch({id:foundry.utils.randomID(),actorUuid:this.uuid,packet:bulkyDamagePacket(packet),isDirect:Boolean(args[0])});
    return withHopeLock(`beetles-damage:${this.uuid}`,async()=>{
      const current=(await capturedEffects(this,beetlesEffects(this).map(effect=>effect.id))).map(effect=>effect.id);
      if(!current.length)return native.call(this,packet,...args);
      const capture={calculated:false},previous=captures.get(this),prior=Object.getOwnPropertyDescriptor(this,'update'),update=this.update,pending=[];
      const writer=function(...values){const promise=update.apply(this,values);pending.push(Promise.resolve(promise));return promise;};
      captures.set(this,capture);if(typeof update==='function')Object.defineProperty(this,'update',{value:writer,writable:true,configurable:true});let result;
      try{result=await native.call(this,packet,...args);let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}}
      finally{if(previous)captures.set(this,previous);else captures.delete(this);if(this.update===writer){if(prior)Object.defineProperty(this,'update',prior);else delete this.update;}}
      if(beetlesDamageCompleted(capture.calculated,result))try{await finishBeetles(this,current,ask);}
      catch(error){console.error(`${ID} | Conjure Swarm after damage`,error);ui.notifications.error('Conjure Swarm could not finish. Damage was preserved; check Hope and the beetles effect before continuing.');}
      return result;
    });
  };Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerConjureSwarm(){
  CONFIG.queries[QUERY]=resolveBeetlesDamage;CONFIG.queries[PROMPT]=promptBeetles;
  installBeetlesDamage(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Conjure Swarm needs an active GM.');
    return gm.isSelf?resolveBeetlesDamage(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(605000)});});
  Hooks.on('createActiveEffect',effect=>{if(effect.parent?.documentName!=='Actor'||(!effect.flags?.[ID]?.conjureBeetles&&!effect.origin?.endsWith(`.ActiveEffect.${BEETLES_EFFECT}`)))return;
    void replaceBeetles(effect).catch(error=>{console.error(`${ID} | Conjure Swarm recast`,error);ui.notifications.error('Conjure Swarm could not replace its old beetles. Check the active effects.');});});
}
