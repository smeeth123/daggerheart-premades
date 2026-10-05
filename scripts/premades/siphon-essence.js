import {ID,featureActive} from '../core.js';
import {attackHitTargets} from '../attack-outcome.js';
import {faceYourFearAttack} from './face-your-fear.js';
import {withHopeLock} from './hope-lock.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {decisionBudget} from '../settings.js';
import {SIPHON_KEY,SIPHON_ACTION,SIPHON_FEAR_ACTION} from './siphon-essence-data.js';

const QUERY=`${ID}.siphonEssence`,DAMAGE=Symbol.for(`${QUERY}Damage`),TAKEN=Symbol.for(`${QUERY}Taken`);
const requests=new Map(),recoveries=new Map(),prepared=new WeakSet();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function siphonItem(actor){
  return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&
      (flags?.applied?.key??flags?.premade?.key)===SIPHON_KEY;
  })??null:null;
}
export function siphonAttack(message){
  const action=message?.system?.action,actor=action?.actor,item=siphonItem(actor);
  if(!item||action?.id!==SIPHON_ACTION||action.type!=='attack'||action.actionType==='reaction'||item.uuid!==action.item?.uuid||!Number.isFinite(message.system.roll?.total))return null;
  const targetUuids=[...new Set(attackHitTargets(message).map(target=>target.actorId).filter(uuid=>uuid&&uuid!==actor.uuid))];
  return targetUuids.length?{messageUuid:message.uuid,actorUuid:actor.uuid,itemUuid:item.uuid,targetUuids}:null;
}
export function prepareSiphonDamage(config){
  const message=game.messages.get(config.source?.message),record=siphonAttack(message);
  if(config.hasHealing||!config.damageFormula||!record)return false;
  const fear=faceYourFearAttack(message);
  // A chat replay has freshly rebuilt native roll data even if it copies saved metadata.
  if(fear&&!prepared.has(config)){
    const prof=Number(config.data?.prof);if(!Number.isFinite(prof))return false;
    const action=message.system.action,boosted=prof+1;
    const context=new Proxy(action,{get(target,key){
      if(key==='getRollData')return (...args)=>{const data=target.getRollData(...args);return {...data,parent:data.parent,prof:boosted,system:{...data.system,proficiency:boosted}};};
      return Reflect.get(target,key,target);
    }});
    const formula=game.system.api.fields.ActionFields.DamageField.formatFormulas.call(context,[action.damage.main],config)[0]?.formula;
    if(!formula)throw Error('Siphon Essence could not prepare its Fear damage bonus.');
    config.data={...config.data,parent:config.data.parent,prof:boosted,system:{...config.data.system,proficiency:boosted}};
    config.damageFormula={...config.damageFormula,formula};
    prepared.add(config);
  }
  record.fearBoost=Boolean(fear);
  config[ID]={...config[ID],siphonEssence:record};return true;
}
export function tagSiphonDamage(config){
  const record=config[ID]?.siphonEssence??siphonAttack(game.messages.get(config.source?.message)),main=config.damage?.main;
  if(config.hasHealing||!main||!record)return false;
  main.options??={};main.options[ID]={...main.options[ID],siphonEssence:record};
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:main.toJSON(),
    resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,roll])=>[key,roll.toJSON()]))});
  return true;
}
export const siphonPacketSource=packet=>(packet?.main??packet?.damage??packet)?.options?.[ID]?.siphonEssence??null;
async function packetContext(packet,target){
  const source=siphonPacketSource(packet);
  if(!source||typeof source.messageUuid!=='string'||typeof source.actorUuid!=='string'||typeof source.itemUuid!=='string'||source.actorUuid===target.uuid)return null;
  const message=await fromUuid(source.messageUuid),record=siphonAttack(message);
  if(!record||record.actorUuid!==source.actorUuid||record.itemUuid!==source.itemUuid||!record.targetUuids.includes(target.uuid))return null;
  return {message,actor:message.system.action.actor};
}
// Native modifyResource starts asynchronous writes without awaiting all of them.
async function settledWrites(actor,callback){
  const prior=Object.getOwnPropertyDescriptor(actor,'update'),native=actor.update,pending=[];
  const capture=function(...args){const result=native.apply(this,args);pending.push(Promise.resolve(result));return result;};
  if(typeof native==='function')Object.defineProperty(actor,'update',{value:capture,writable:true,configurable:true});
  try{
    const result=await callback();let index=0;
    while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}
    return result;
  }finally{if(actor.update===capture){if(prior)Object.defineProperty(actor,'update',prior);else delete actor.update;}}
}
export function siphonHpMarked(actor,updates,before){
  const marked=Number(actor.system?.resources?.hitPoints?.value)-before;
  const receipt=Array.isArray(updates)?updates.filter(row=>row.key==='hitPoints'&&!row.clear&&!row.itemId&&row.damageTypes&&Number(row.value)>0)
    .reduce((sum,row)=>sum+Number(row.value),0):0;
  const hp=Math.min(marked,receipt);return Number.isSafeInteger(hp)&&hp>0?hp:0;
}
async function recover(context,target,hp){
  const {actor,message}=context,key=`${message.uuid}:${target.uuid}`;
  if(recoveries.has(key))return recoveries.get(key);
  const operation=withHopeLock(actor.uuid,async()=>{
    if(!game.user.isActiveGM||siphonItem(actor)?.uuid!==message.system.action.item?.uuid)return 0;
    const prior=message.flags?.[ID]?.siphonEssenceHealing??[];if(prior.includes(target.uuid))return 0;
    const before=Number(actor.system.resources?.hitPoints?.value);if(!Number.isSafeInteger(before)||before<0)return 0;
    await settledWrites(actor,()=>actor.takeHealing({resources:{hitPoints:{total:hp}}}));
    const cleared=before-Number(actor.system.resources.hitPoints.value);
    if(!Number.isSafeInteger(cleared)||cleared!==Math.min(hp,before))throw Error('Siphon Essence HP recovery was canceled or could not be verified.');
    // Record committed healing before advisory writes so a failed chat/flag cannot repeat it.
    try{await message.setFlag(ID,'siphonEssenceHealing',[...prior,target.uuid]);}catch(error){console.error(`${ID} | Siphon Essence recovery marker`,error);}
    if(cleared)try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Siphon Essence</strong>: ${esc(actor.name)} clears ${cleared} HP after ${esc(target.name)} marked ${hp} HP.</p>`});}
    catch(error){console.error(`${ID} | Siphon Essence notification`,error);}
    return cleared;
  });recoveries.set(key,operation);if(recoveries.size>512)recoveries.delete(recoveries.keys().next().value);return operation;
}
export async function resolveSiphonDamage(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.targetUuid!=='string'||typeof request.isDirect!=='boolean')return null;
  const target=await fromUuid(request.targetUuid),packet=bulkyDamagePacket(request.packet),context=target&&packet?await packetContext(packet,target):null;
  if(!context||!user.isGM&&!context.actor.testUserPermission(user,'OWNER')&&!target.testUserPermission(user,'OWNER'))return null;
  const key=`${user.id}:${request.id}:${target.uuid}`,signature=JSON.stringify(request),prior=requests.get(key);
  if(prior)return prior.signature===signature?prior.operation:null;
  const operation=target.takeDamage(packet,request.isDirect);requests.set(key,{signature,operation});if(requests.size>512)requests.delete(requests.keys().next().value);return operation;
}
export function installSiphonEssence(Damage,Actor,dispatch){
  if(!Object.hasOwn(Damage,DAMAGE)){
    const configure=Damage.buildConfigure,evaluate=Damage.buildEvaluate,post=Damage.buildPost;
    Damage.buildConfigure=async function(config,...args){prepareSiphonDamage(config);return configure.call(this,config,...args);};
    Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagSiphonDamage(config);return result;};
    Damage.buildPost=async function(roll,config,...args){tagSiphonDamage(config);return post.call(this,roll,config,...args);};
    Object.defineProperty(Damage,DAMAGE,{value:true});
  }
  if(Object.hasOwn(Actor,TAKEN))return;
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(packet,...args){
    if(!siphonPacketSource(packet)||!bulkyDamagePacket(packet))return native.call(this,packet,...args);
    const context=await packetContext(packet,this);if(!context)return native.call(this,packet,...args);
    if(!game.user.isActiveGM)return dispatch({id:foundry.utils.randomID(),targetUuid:this.uuid,packet:bulkyDamagePacket(packet),isDirect:Boolean(args[0])});
    const completed=await withHopeLock(`siphon-damage:${this.uuid}`,async()=>{
      const before=Number(this.system.resources?.hitPoints?.value),result=await settledWrites(this,()=>native.call(this,packet,...args));
      return {result,hp:siphonHpMarked(this,result,before)};
    });
    if(completed.hp)try{await recover(context,this,completed.hp);}catch(error){
      console.error(`${ID} | Siphon Essence recovery`,error);ui.notifications.error('Siphon Essence could not finish HP recovery. Target damage was preserved; check caster HP before retrying.');
    }
    return completed.result;
  };Object.defineProperty(Actor,TAKEN,{value:true});
}
export function registerSiphonEssence(){
  CONFIG.queries[QUERY]=resolveSiphonDamage;
  installSiphonEssence(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Siphon Essence needs an active GM.');
    return gm.isSelf?resolveSiphonDamage(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(305000)});
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    if(action.id===SIPHON_FEAR_ACTION&&siphonItem(action.actor)?.uuid===action.item?.uuid){
      ui.notifications.info('Siphon Essence adds its Fear bonus automatically. Use Roll Damage on the successful spell attack’s chat card.');return false;
    }
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible||!message.system?.damage?.main?.options?.[ID]?.siphonEssence?.fearBoost||html.querySelector('.dhp-siphon-essence'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-siphon-essence';note.textContent='Siphon Essence: +1 Proficiency from success with Fear.';
    html.querySelector('.message-content')?.append(note);
  });
}
