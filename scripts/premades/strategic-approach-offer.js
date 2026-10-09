import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,allied,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {STRATEGIC_KEY,STRATEGIC_ADV_EFFECT,STRATEGIC_DAMAGE_EFFECT} from './strategic-approach-data.js';
const WRAPPED=Symbol.for(`${ID}.strategicApproachOffer`),receipts=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function strategicItem(actor){
  if(actor?.type!=='character'||unavailableActor(actor))return null;
  return actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    (!item.system.inVault||item.system.vaultActive)&&!item.system.isDomainTouchedSuppressed&&
    (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===STRATEGIC_KEY)??null;
}
const tokens=item=>Number(item?.system?.resource?.value);
function attackAction(actor,source){
  if(source?.actor!==actor?.uuid)return null;
  const item=actor.items?.get?.(source.item)??actor.items?.find(i=>i.id===source.item);
  const attack=source.item?(item?.system.attack?.id===source.action?item.system.attack:item?.system.actions?.get?.(source.action)??item?.system.actionsList?.find(a=>a.id===source.action)):
    actor.system.attack?.id===source.action?actor.system.attack:null;
  return attack?.type==='attack'&&attack.actionType!=='reaction'?attack:null;
}
function limits(){
  if(canvas.scene.rangeSettings)return canvas.scene.rangeSettings;
  const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
  return world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local:world;
}
function within(origin,target,key){const limit=Number(limits()[key]),distance=origin.distanceTo(target);return Number.isFinite(limit)&&limit>=0&&Number.isFinite(distance)&&distance>=0&&distance<=limit;}
export function strategicCandidates(actor,source,targets,originId){
  if(!globalThis.canvas?.ready||!attackAction(actor,source)||!Array.isArray(targets))return null;
  const origin=originId?canvas.tokens.get(originId):sourceToken(actor);
  if(!origin||origin.actor?.uuid!==actor.uuid||origin.document.hidden||unavailableActor(origin.actor))return null;
  const enemies=targets.map(target=>canvas.tokens.get(target.id)).filter((token,index)=>token?.actor?.type==='adversary'&&token.actor.uuid===targets[index].actorId&&
    !token.document.hidden&&!unavailableActor(token.actor)&&within(origin,token,'close'));
  if(!enemies.length)return null;
  const allies=canvas.tokens.placeables.filter(token=>!token.document.hidden&&['character','companion'].includes(token.actor?.type)&&
    allied(origin.document,token.document)&&!unavailableActor(token.actor)&&Number(token.actor.system.resources?.stress?.value)>0);
  const pairs=enemies.flatMap(target=>allies.filter(ally=>within(target,ally,'melee')).map(ally=>({target,ally})));
  return {origin,enemies,pairs};
}
function current(request){
  if(request?.sceneId!==globalThis.canvas?.scene?.id)return null;
  const actor=foundry.utils.fromUuidSync(request.source?.actor),item=strategicItem(actor),state=strategicCandidates(actor,request.source,request.targets,request.originId);
  return item&&Number.isSafeInteger(tokens(item))&&tokens(item)>0&&state&&state.origin.document.uuid===request.originUuid?{actor,item,...state}:null;
}
export async function promptStrategicApproach(request,{user}){
  const state=current(request);if(!user?.isGM||!state||!state.actor.testUserPermission(game.user,'OWNER'))return null;
  const options=state.pairs.map(({target,ally})=>`<option data-dhp-token="${esc(ally.document.uuid)}" value="${esc(target.id)}:${esc(ally.id)}">${esc(ally.name)} (near ${esc(target.name)})</option>`).join('');
  return timedDialog(`Strategic Approach — ${state.actor.name}`,`<p>An attack target is within <strong>Close</strong>. Spend <strong>1 token</strong> (${tokens(state.item)} available) for one benefit?</p>${options?`<label>Ally within Melee of the target <select name="strategicAlly" style="width:100%">${options}</select></label>`:''}`, [
    {action:'advantage',label:'Attack with Advantage',callback:()=>({mode:'advantage'})},
    {action:'damage',label:'Add d8 Damage',callback:()=>({mode:'damage'})},
    ...(options?[{action:'stress',label:'Clear Ally Stress',callback:(_event,_button,dialog)=>{const [targetId,allyId]=dialog.element.querySelector('[name="strategicAlly"]').value.split(':');return {mode:'stress',targetId,allyId};}}]:[]),
    {action:'decline',label:'Decline',default:true,callback:()=>null}]);
}
async function healStress(actor){
  return withHopeLock(`strategic-healing:${actor.uuid}`,async()=>{
    const before=Number(actor.system.resources?.stress?.value);if(!(before>0))return false;
    const prior=Object.getOwnPropertyDescriptor(actor,'update'),update=actor.update,pending=[];
    const capture=function(...args){const result=update.apply(this,args);pending.push(Promise.resolve(result));return result;};
    Object.defineProperty(actor,'update',{value:capture,writable:true,configurable:true});let failure;
    try{await actor.takeHealing({resources:{stress:1}});}catch(error){failure=error;}
    finally{
      try{let index=0;while(index<pending.length){const end=pending.length,settled=await Promise.allSettled(pending.slice(index,end));failure??=settled.find(result=>result.status==='rejected')?.reason;index=end;}}
      finally{if(actor.update===capture){if(prior)Object.defineProperty(actor,'update',prior);else delete actor.update;}}
    }
    if(Number(actor.system.resources.stress.value)<before){if(failure)console.error(`${ID} | Strategic Approach healing notification`,failure);return true;}
    if(failure)throw failure;return false;
  });
}
export async function resolveStrategicApproach(request,{user},ask=promptStrategicApproach){
  if(!game.user.isActiveGM||!user?.active||typeof request?.offerId!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.offerId))return null;
  const actor=foundry.utils.fromUuidSync(request.source?.actor);if(!actor?.testUserPermission(user,'OWNER'))return null;
  const key=`${actor.uuid}:${request.offerId}`,serialized=JSON.stringify(request),saved=receipts.get(key);
  if(saved)return saved.request===serialized?saved.operation:null;
  const state=current(request);if(!state)return null;
  const operation=(async()=>{
    const owner=ownerFor(state.actor,[...game.users],game.user),choice=owner.isSelf?await ask(request,{user:game.user}):await owner.query(`${ID}.strategicApproachPrompt`,request,{timeout:decisionBudget(65000)});
    if(!['advantage','damage','stress'].includes(choice?.mode))return null;
    return withHopeLock(`strategic-tokens:${state.item.uuid}`,async()=>{
      const fresh=current(request);
      if(!game.user.isActiveGM||!user.active||!owner.active||!fresh||fresh.item.uuid!==state.item.uuid||!fresh.actor.testUserPermission(user,'OWNER')||!fresh.actor.testUserPermission(owner,'OWNER'))return null;
      const pair=choice.mode==='stress'?fresh.pairs.find(pair=>pair.target.id===choice.targetId&&pair.ally.id===choice.allyId):null;
      if(choice.mode==='stress'&&!pair)return null;
      const before=tokens(fresh.item),paid=await fresh.item.update({'system.resource.value':before-1});
      if(!paid||tokens(fresh.item)!==before-1)throw Error('Strategic Approach could not spend its token.');
      if(pair)try{if(!await healStress(pair.ally.actor)){await fresh.item.update({'system.resource.value':before});return null;}}
      catch(error){await fresh.item.update({'system.resource.value':before});throw error;}
      return {mode:choice.mode,actorUuid:fresh.actor.uuid,itemUuid:fresh.item.uuid,offerId:request.offerId,...(pair?{allyUuid:pair.ally.actor.uuid}: {})};
    });
  })();
  receipts.set(key,{request:serialized,operation});if(receipts.size>512)receipts.delete(receipts.keys().next().value);return operation;
}
export function installStrategicOffer(Roll,offer,grantAdvantage){
  if(Object.hasOwn(Roll,WRAPPED))return;const configure=Roll.buildConfigure;
  Roll.buildConfigure=async function(config={},...args){
    const roll=await configure.call(this,config,...args);
    if(!roll||roll._evaluated||config.evaluate===false||config.actionType!=='action'||config.roll?.type!=='attack'||config.source?.message||config[ID]?.strategicApproachOffered)return roll;
    const uuid=config.source?.actor??config.source?.actorUUID,actor=config.data?.parent??(uuid?foundry.utils.fromUuidSync(uuid):null),item=strategicItem(actor),source={...config.source,actor:actor?.uuid};
    if(!item||!(tokens(item)>0)||actor.effects?.some(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired&&
      [STRATEGIC_ADV_EFFECT,STRATEGIC_DAMAGE_EFFECT].some(id=>effect.origin===`${item.uuid}.ActiveEffect.${id}`)))return roll;
    const state=strategicCandidates(actor,source,config.targets);if(!state)return roll;
    config[ID]={...config[ID],strategicApproachOffered:true};
    try{
      const choice=await offer({source,targets:config.targets.map(target=>({...target})),sceneId:canvas.scene.id,originId:state.origin.id,originUuid:state.origin.document.uuid,offerId:foundry.utils.randomID()});
      if(choice?.actorUuid===actor.uuid&&choice.itemUuid===item.uuid&&['advantage','damage','stress'].includes(choice.mode)){
        config[ID].strategicApproachChoice=choice;
        if(choice.mode==='advantage')grantAdvantage(roll,config);
      }
    }catch(error){console.error(`${ID} | Strategic Approach offer`,error);ui.notifications.error('Strategic Approach could not complete. The native attack continues; check tokens and apply any paid benefit manually.');}
    return roll;
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
