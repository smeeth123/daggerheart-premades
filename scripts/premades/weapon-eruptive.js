import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {attackHitTargets,resolvedAttackTargets} from '../attack-outcome.js';
import {WEAPON_ERUPTIVE_KEY} from './weapon-eruptive-data.js';
import {withHopeLock} from './hope-lock.js';
const QUERY=`${ID}.weaponEruptive`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const eruptiveWeapon=item=>Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_ERUPTIVE_KEY&&item.system.weaponFeatures?.some(f=>f.value==='eruptive'));
export function eruptiveContext(message){
 const data=message?.system,action=data?.action,actor=action?.actor,item=action?.item,source=data?.source;
 return actor?.type==='character'&&action?.type==='attack'&&!data.hasHealing&&Number.isFinite(data.roll?.total)&&eruptiveWeapon(item)&&
  source?.actor===actor.uuid&&source.item===item.id&&typeof source.action==='string'&&source.action&&source.action===action.id&&actor.items?.get?.(item.id)?.uuid===item.uuid?{actor,item,action}:null;
}
function rangeLimit(key){
 const local=canvas.scene.flags?.daggerheart?.rangeMeasurement,r=canvas.scene.rangeSettings??game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
 return Number(canvas.scene.rangeSettings?r[key]:r.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local[key]:r[key]);
}
export function eruptiveState(message,recipientUuid){
 const context=eruptiveContext(message),origin=context&&globalThis.canvas?.ready&&sourceToken(context.actor);
 if(!origin)return null;
 const melee=rangeLimit('melee'),close=rangeLimit('veryClose');
 if(!Number.isFinite(melee)||melee<0||!Number.isFinite(close)||close<0)return null;
 const triggers=attackHitTargets(message).filter(hit=>{
  if(recipientUuid&&hit.actorId!==recipientUuid)return false;
  const token=canvas.tokens.get(hit.id),distance=token&&origin.distanceTo(token);
  return token?.actor?.uuid===hit.actorId&&Number.isFinite(distance)&&distance>=0&&distance<=melee;
 });
 if(!triggers.length)return null;
 const excluded=new Set(resolvedAttackTargets(message).map(hit=>hit.actorId));excluded.add(context.actor.uuid);
 const candidates=[];
 for(const token of canvas.tokens.placeables){
  const actor=token.actor,hp=actor?.system?.resources?.hitPoints,distance=origin.distanceTo(token);
  if(actor?.type!=='adversary'||excluded.has(actor.uuid)||token.document?.hidden||unavailableActor(actor)||hp&&Number(hp.value)>=Number(hp.max)||
   !Number.isFinite(distance)||distance<0||distance>close)continue;
  excluded.add(actor.uuid);candidates.push(token);
 }
 return {...context,origin,candidates};
}
export function tagEruptive(config){
 const message=game.messages.get(config.source?.message),context=eruptiveContext(message),main=config.damage?.main;
 if(config.hasHealing||config.evaluate===false||!context||!main||!Number.isFinite(main.total)||main.total<=0||
  !['actor','item','action'].every(key=>config.source?.[key]===message.system.source?.[key]))return false;
 const record={messageUuid:message.uuid,source:{actor:config.source.actor,item:config.source.item,action:config.source.action},total:Number(main.total),damageTypes:[...(main.options?.damageTypes??[])]};
 main.options??={};main.options[ID]={...main.options[ID],weaponEruptive:record};
 if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:main.toJSON(),
  resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
 return true;
}
export function eruptiveRecord(packet){
 const main=packet?.main??packet?.damage??packet,record=main?.options?.[ID]?.weaponEruptive;
 return !main?.options?.[ID]?.eruptiveSplash&&typeof record?.messageUuid==='string'&&Number.isFinite(record.total)&&record.total>0&&
  ['actor','item','action'].every(key=>typeof record.source?.[key]==='string'&&record.source[key])&&Array.isArray(record.damageTypes)&&record.damageTypes.every(t=>typeof t==='string')?record:null;
}
export async function rollEruptiveReaction(actor,message){
 const effects=await game.system.api.data.actions.actionsTypes.base.getActionRelevantEffects({action:{actionType:'reaction',roll:{type:'trait',trait:null}}},actor);
 const result=await actor.diceRoll({event:{},title:'Eruptive — Reaction (14)',hasRoll:true,actionType:'reaction',
  roll:{trait:null,difficulty:14,type:'trait'},dialog:{configure:false},selectedMessageMode:'public',source:{},targets:[],effects,
  // The reaction uses native D20 bonuses/conditions but is not an attack.
  [ID]:{eruptiveReaction:{whisper:[...(message.whisper??[])],blind:Boolean(message.blind)}}});
 return result;
}
export function eruptiveReactionPrivacy(message,data){
 const audience=message.rolls?.[0]?.options?.[ID]?.eruptiveReaction??data.rolls?.[0]?.options?.[ID]?.eruptiveReaction;
 if(audience&&Array.isArray(audience.whisper)&&audience.whisper.every(id=>typeof id==='string'))
  message.updateSource({whisper:[...audience.whisper],blind:Boolean(audience.blind)});
}
export function applyEruptiveDamage(actor,packet,eligible=()=>true){
 return withHopeLock(`eruptiveDamage:${actor.uuid}`,async()=>{
  if(!eligible())return false;
  if(typeof actor.update!=='function'){await actor.takeDamage(packet,false);return true;}
  const descriptor=Object.getOwnPropertyDescriptor(actor,'update'),update=actor.update,writes=[];
  // Native async-forEach otherwise emits an unhandled rejection. Retain the
  // actual failure here and report it once after every launched write settles.
  const capture=function(...args){const result=Promise.resolve(update.apply(this,args));writes.push(result);return result.catch(()=>this);};
  Object.defineProperty(actor,'update',{value:capture,writable:true,configurable:true});
  let failure;
  try{await actor.takeDamage(packet,false);}catch(error){failure=error;}
  finally{
   try{let i=0;while(i<writes.length){const end=writes.length,results=await Promise.allSettled(writes.slice(i,end));failure??=results.find(r=>r.status==='rejected')?.reason;i=end;}}
   finally{if(actor.update===capture){if(descriptor)Object.defineProperty(actor,'update',descriptor);else delete actor.update;}}
  }
  if(failure)throw failure;return true;
 });
}
export async function resolveEruptive(request,{user},reaction=rollEruptiveReaction){
 if(!game.user.isActiveGM||!user?.active||request?.sceneId!==globalThis.canvas?.scene?.id||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||
  request.deadline>decisionNow()+decisionBudget(305000)||typeof request.recipientUuid!=='string')return false;
 const record=eruptiveRecord({options:{[ID]:{weaponEruptive:request.record}}}),message=record&&await fromUuid(record.messageUuid),state=message&&eruptiveState(message,request.recipientUuid);
 if(!state||!state.actor.testUserPermission(user,'OWNER')||!['actor','item','action'].every(key=>record.source[key]===message.system.source?.[key]))return false;
 // An owning attacker may submit transient automatic damage before the native
 // asynchronous chat update. Other clients cannot invent a damage amount.
 const known=message.system.damage?.main,posted=known?.options?.[ID]?.weaponEruptive;
 if(!user.isGM&&known&&(!posted||posted.total!==record.total||JSON.stringify(posted.damageTypes)!==JSON.stringify(record.damageTypes)))return false;
 if(receipts.has(message.uuid)||message.flags?.[ID]?.weaponEruptive)return false;
 receipts.set(message.uuid,true);if(receipts.size>1000)receipts.delete(receipts.keys().next().value);
 const receipt={status:'started',total:record.total,targets:[]};await message.setFlag(ID,'weaponEruptive',receipt);
 const damage=Math.ceil(record.total/2),initial=state.candidates.map(t=>t.actor.uuid);
 for(const uuid of initial){
  if(!user.active||!game.user.isActiveGM||decisionNow()>=request.deadline)break;
  const current=eruptiveState(message,request.recipientUuid),token=current?.candidates.find(t=>t.actor.uuid===uuid);
  if(!token)continue;
  const entry={actorUuid:uuid,status:'rolling'};receipt.targets.push(entry);await message.setFlag(ID,'weaponEruptive',structuredClone(receipt));
  const result=await reaction(token.actor,message),roll=result?.message?.system?.roll??result?.roll;
  if(!Number.isFinite(roll?.total)){entry.status='canceled';await message.setFlag(ID,'weaponEruptive',structuredClone(receipt));continue;}
  if(roll.isCritical||roll.total>=14){entry.status='saved';entry.total=roll.total;await message.setFlag(ID,'weaponEruptive',structuredClone(receipt));continue;}
  entry.total=roll.total;
  // Recheck scene/range and living recipient after all reaction decisions.
  if(!eruptiveState(message,request.recipientUuid)?.candidates.some(t=>t.actor.uuid===uuid)){entry.status='unavailable';continue;}
  entry.status='damageStarted';await message.setFlag(ID,'weaponEruptive',structuredClone(receipt));
  const multiplier=Number(token.actor.system?.rules?.attack?.damage?.hpDamageTakenMultiplier??1),total=Math.ceil(damage*(Number.isFinite(multiplier)?Math.max(0,multiplier):1));
  const applied=await applyEruptiveDamage(token.actor,{main:{total,options:{damageTypes:[...record.damageTypes],[ID]:{eruptiveSplash:true,loyalBaseDamage:damage,elementalSource:state.actor.uuid,friendAttack:state.actor.uuid}}},resources:{}},
   ()=>Boolean(user.active&&game.user.isActiveGM&&eruptiveState(message,request.recipientUuid)?.candidates.some(t=>t.actor.uuid===uuid)));
  entry.status=applied?'damaged':'unavailable';if(applied)entry.damage=total;await message.setFlag(ID,'weaponEruptive',structuredClone(receipt));
 }
 receipt.status='complete';await message.setFlag(ID,'weaponEruptive',receipt);
 if(receipt.targets.length)try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:state.actor}),whisper:[...(message.whisper??[])],blind:Boolean(message.blind),
  content:`<p><strong>Eruptive</strong> — ${receipt.targets.map(t=>`${esc(canvas.tokens.placeables.find(token=>token.actor?.uuid===t.actorUuid)?.name??'Adversary')}: ${t.status==='damaged'?`${t.damage} damage`:t.status==='saved'?'reaction succeeded':t.status}`).join('; ')}.</p>`});}catch(error){console.warn(`${ID} | Eruptive notification`,error);}
 return true;
}
export function installWeaponEruptive(Damage,Actor,dispatch){
 if(Damage&&!Object.hasOwn(Damage,WRAPPED)){
  const post=Damage.buildPost;Damage.buildPost=async function(roll,config,...args){tagEruptive(config);return post.call(this,roll,config,...args);};
  Object.defineProperty(Damage,WRAPPED,{value:true});
 }
 if(Actor&&!Object.hasOwn(Actor,WRAPPED)){
  const take=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(packet,...args){
   const record=eruptiveRecord(packet),result=await take.call(this,packet,...args);
   if(record&&result!==null&&result!==false&&(!Array.isArray(result)||result.length))try{
    await dispatch({record,recipientUuid:this.uuid,sceneId:globalThis.canvas?.scene?.id,deadline:decisionNow()+decisionBudget(300000)});
   }catch(error){console.error(`${ID} | Eruptive`,error);ui.notifications.error('Eruptive: primary damage completed, but splash resolution could not be confirmed. Check reactions and damage before retrying.');}
   return result;
  };Object.defineProperty(Actor,WRAPPED,{value:true});
 }
}
export function registerWeaponEruptive(){
 Hooks.on('preCreateChatMessage',eruptiveReactionPrivacy);
 CONFIG.queries[QUERY]=resolveEruptive;
 installWeaponEruptive(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Eruptive needs an active GM.');return gm.isSelf?resolveEruptive(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(305000)});});
 Hooks.on('daggerheart.preUseAction',action=>{
  if(eruptiveWeapon(action.item)&&action.item.system.weaponFeatures.some(f=>f.value==='eruptive'&&f.actionIds?.includes(action.id))){
   ui.notifications.info('Eruptive resolves automatically when successful Melee attack damage is applied.');return false;
  }
 });
}
