import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {attackHitTargets} from '../attack-outcome.js';
import {withHopeLock} from './hope-lock.js';
import {primaryWeaponAttack,attackSourceDocument} from '../primary-weapon.js';
import {WEAPON_ENTANGLING_KEY} from './weapon-entangling-data.js';
const QUERY=`${ID}.weaponEntangling`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
const canPay=actor=>hopeCapacity(actor)>=1;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function entanglingWeapon(item){return Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_ENTANGLING_KEY&&item.system.weaponFeatures?.some(f=>f.value==='entangling'));}
export function entanglingContext(message){
 const data=message?.system,action=data?.action,actor=action?.actor,primary=action?.item,source=data?.source;
 if(actor?.type!=='character'||unavailableActor(actor)||action?.type!=='attack'||data.hasHealing||!Number.isFinite(data.roll?.total)||
  !primaryWeaponAttack(action)||
  source?.actor!==actor.uuid||source.item!==primary.id||typeof source.action!=='string'||!source.action||source.action!==action.id||attackSourceDocument(actor,source)?.uuid!==primary.uuid)return null;
 const item=[...(actor.items?.values?.()??actor.items??[])].find(entanglingWeapon);
 return item?{actor,item,action}:null;
}
export function entanglingHits(message){
 const context=entanglingContext(message),origin=context&&globalThis.canvas?.ready&&sourceToken(context.actor);
 if(!origin)return [];
 const ranges=canvas.scene.rangeSettings??game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
 const local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
 const limit=Number(canvas.scene.rangeSettings?ranges.veryClose:ranges.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:ranges.veryClose);
 if(!Number.isFinite(limit)||limit<0)return [];
 const found=new Set();
 return attackHitTargets(message).filter(hit=>{
  const token=canvas.tokens.get(hit.id),target=token?.actor,distance=token&&origin.distanceTo(token);
  if(target?.uuid!==hit.actorId||found.has(hit.actorId)||unavailableActor(target)||target?.statuses?.has('vulnerable')||
   !['character','adversary','companion'].includes(target?.type)||!Number.isFinite(distance)||distance<0||distance>limit)return false;
  found.add(hit.actorId);return true;
 });
}
export function entanglingEffect(weaponUuid,messageUuid){
 return {name:'Entangling',type:'base',img:'icons/magic/nature/root-vine-entangle-foot-green.webp',origin:weaponUuid,transfer:false,disabled:false,statuses:['vulnerable'],showIcon:1,
  description:'<p>Temporarily Vulnerable from Entangling.</p>',system:{changes:[],duration:{type:'temporary',description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
  flags:{[ID]:{weaponEntangling:{weaponUuid,messageUuid}}}};
}
export async function promptEntangling(request,{user}){
 const message=await fromUuid(request.messageUuid),context=entanglingContext(message),hit=entanglingHits(message).find(t=>t.actorId===request.targetUuid);
 if(!user?.isGM||!context||!hit||!canPay(context.actor)||!context.actor.testUserPermission(game.user,'OWNER'))return false;
 const target=await fromUuid(hit.actorId);
 return Boolean(await timedDialog('Entangling',`<p>You hit <strong>${esc(target?.name)}</strong> within Very Close range. Spend <strong>1 Hope</strong> to make them temporarily <strong>Vulnerable</strong>?</p>`,
  [{action:'use',label:'Spend 1 Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveEntangling(request,{user},ask=promptEntangling){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||typeof request.targetUuid!=='string'||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||
  request.deadline>decisionNow()+decisionBudget(125000)||request.sceneId!==globalThis.canvas?.scene?.id)return false;
 const message=await fromUuid(request.messageUuid),initial=entanglingContext(message);
 if(!initial||!canPay(initial.actor)||!initial.actor.testUserPermission(user,'OWNER')||!entanglingHits(message).some(hit=>hit.actorId===request.targetUuid))return false;
 const key=`${message.uuid}:${request.targetUuid}`,recordKey=encodeURIComponent(request.targetUuid).replaceAll('.','%2E');
 if(receipts.has(key)||message.flags?.[ID]?.weaponEntangling?.[recordKey])return false;
 receipts.set(key,true);if(receipts.size>1000)receipts.delete(receipts.keys().next().value);
 const save=record=>withHopeLock(`entanglingReceipt:${message.uuid}`,async()=>{const records={...message.flags?.[ID]?.weaponEntangling,[recordKey]:record};await message.setFlag(ID,'weaponEntangling',records);});
 await save({status:'offered'});
 const owner=ownerFor(initial.actor,[...game.users],game.user);
 const eligible=()=>{
  const current=entanglingContext(message);
  return Boolean(game.user.isActiveGM&&user.active&&owner.active&&decisionNow()<request.deadline&&request.sceneId===globalThis.canvas?.scene?.id&&current?.item.uuid===initial.item.uuid&&
   current.actor.testUserPermission(user,'OWNER')&&current.actor.testUserPermission(owner,'OWNER')&&entanglingHits(message).some(hit=>hit.actorId===request.targetUuid));
 };
 if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
 if(!eligible()||!canPay(initial.actor))return false;
 const accepted=owner.isSelf?await ask(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
 if(accepted!==true){await save({status:'declined'});return false;}
 return withHopeLock(initial.actor.uuid,()=>withHopeLock(`entanglingTarget:${request.targetUuid}`,async()=>{try{let hopePayment;
  if(!eligible()||!canPay(initial.actor))return false;
  const target=await fromUuid(request.targetUuid);if(!target||!eligible())return false;
  const hope=hopeCapacity(initial.actor);
  const paid=(hopePayment=await spendHope(initial.actor,1));
  if(!paid||!hopePayment)throw Error('Entangling could not confirm Hope payment. Check Hope before retrying.');
  // Persist payment before condition creation; never charge again on failure.
  await save({status:'paid',weaponUuid:initial.item.uuid});
  const created=await target.createEmbeddedDocuments('ActiveEffect',[entanglingEffect(initial.item.uuid,message.uuid)]);
  if(!created?.length)throw Error('Entangling spent Hope but Vulnerable was not applied. Check target conditions.');
  await save({status:'applied',weaponUuid:initial.item.uuid});
  try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:initial.actor}),whisper:[...(message.whisper??[])],blind:Boolean(message.blind),
   content:`<p><strong>Entangling</strong>: ${esc(initial.actor.name)} spends 1 Hope; ${esc(target.name)} becomes temporarily Vulnerable.</p>`});}catch(error){console.warn(`${ID} | Entangling notification`,error);}
  return true;
 }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}}));
}
export function installWeaponEntangling(Action,offer){
 if(!Action||Object.hasOwn(Action,WRAPPED))return;const use=Action.prototype.use;
 Action.prototype.use=async function(...args){
  const result=await use.apply(this,args),message=result?.message,context=entanglingContext(message);
  if(context&&this.actor?.uuid===context.actor.uuid&&this.item?.uuid===context.action.item.uuid&&this.id===message.system.source.action){
   for(const hit of entanglingHits(message)){
    if(!canPay(context.actor))break;
    try{await offer({messageUuid:message.uuid,targetUuid:hit.actorId,sceneId:canvas.scene.id,deadline:decisionNow()+decisionBudget(120000)});}
    catch(error){console.error(`${ID} | Entangling`,error);ui.notifications.error('Entangling: the attack completed, but Hope or Vulnerable could not be confirmed. Check resources and conditions before retrying.');}
   }
  }
  return result;
 };
 Object.defineProperty(Action,WRAPPED,{value:true});
}
export function registerWeaponEntangling(){
 CONFIG.queries[QUERY]=resolveEntangling;CONFIG.queries[PROMPT]=promptEntangling;
 installWeaponEntangling(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Entangling needs an active GM.');return gm.isSelf?resolveEntangling(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});
 Hooks.on('daggerheart.preUseAction',action=>{
  if(entanglingWeapon(action.item)&&action.item.system.weaponFeatures.some(f=>f.value==='entangling'&&f.actionIds?.includes(action.id))){
   ui.notifications.info('Entangling is offered after a successful primary-weapon attack within Very Close range.');return false;
  }
 });
}
