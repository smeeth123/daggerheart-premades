import {ID,featureActive} from '../core.js';
import {attackTargetOutcome} from '../attack-outcome.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {BOOK_OF_SITIL_KEY,PARALLELA_ACTION,PARALLELA_EFFECT} from './book-of-sitil-data.js';

const QUERY=`${ID}.parallela`,PROMPT=`${QUERY}Prompt`,RECAST=`${QUERY}Recast`;
const WRAPPED=Symbol.for(QUERY),CAST_WRAP=Symbol.for(RECAST),building=new WeakSet(),receipts=new Map(),latest=new Map();
let creationSequence=0;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const live=effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired;
const effectUuid=effect=>effect.uuid??`${effect.parent.uuid}.ActiveEffect.${effect.id}`;

export function bookOfSitilItem(item){
  const flags=item?.flags?.[ID],system=item?.system;
  return Boolean(item?.actor?.type==='character'&&item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===BOOK_OF_SITIL_KEY);
}
export function parallelaEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>live(effect)&&(effect.flags?.[ID]?.parallela===true||effect.origin?.endsWith(`.ActiveEffect.${PARALLELA_EFFECT}`)));
}
export async function validParallela(effect){
  if(effect.flags?.[ID]?.parallela===true)return true;
  const template=effect.origin?await fromUuid(effect.origin):null;
  return bookOfSitilItem(template?.parent);
}
function attackMessage(message){
  const data=message?.system;
  return Boolean(data?.action?.type==='attack'&&data.action.actionType!=='reaction'&&Number.isFinite(data.roll?.total));
}
export function parallelaCandidates(message,originUuid){
  if(!attackMessage(message)||!canvas.ready||message.speaker?.scene&&message.speaker.scene!==canvas.scene?.id)return [];
  const action=message.system.action,actor=action.actor;
  const origin=originUuid?canvas.tokens.placeables.find(token=>token.document.uuid===originUuid&&token.actor?.uuid===actor?.uuid):sourceToken(actor);
  if(!origin||origin.document.hidden||unavailableActor(actor))return [];
  let ranges=canvas.scene?.rangeSettings;
  if(!ranges){
    const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
    const local=canvas.scene?.flags?.daggerheart?.rangeMeasurement;
    ranges=world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local:world;
  }
  const limit=Number(ranges?.[action.range]);
  if(!Number.isFinite(limit)||limit<0)return [];
  const excluded=new Set((message.system.targets??[]).map(target=>target.actorId));excluded.add(actor.uuid);
  const seen=new Set(excluded),targets=[];
  for(const token of canvas.tokens.placeables){
    const target=token.actor,hp=target?.system?.resources?.hitPoints;
    if(!['character','adversary','companion'].includes(target?.type)||seen.has(target.uuid)||token.document.hidden||unavailableActor(target)||
      hp&&Number(hp.max)>0&&Number(hp.value)>=Number(hp.max))continue;
    const distance=origin.distanceTo(token);
    if(!Number.isFinite(distance)||distance<0||distance>limit)continue;
    const entry={id:token.id,actorId:target.uuid,name:token.name??target.name,img:target.img,
      difficulty:target.system?.difficulty??null,evasion:target.system?.evasion??null,saveResult:{success:false}};
    if(attackTargetOutcome(message.system.roll,entry)!=='success')continue;
    seen.add(target.uuid);entry.hitResult={success:true};targets.push(entry);
  }
  return targets;
}
export async function promptParallela(data,{user}){
  const message=await fromUuid(data.messageUuid),actor=message?.system?.action?.actor;
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!attackMessage(message))return null;
  const allowed=new Set(data.targets.map(target=>`${target.id}:${target.actorId}`));
  const targets=parallelaCandidates(message,data.originUuid).filter(target=>allowed.has(`${target.id}:${target.actorId}`));
  if(!targets.length)return null;
  return timedDialog(`Parallela — ${actor.name}`,`<p>Hit one additional creature with this attack. No additional Hope cost.</p><select name="parallelaTarget" aria-label="Additional target" style="width:100%">${targets.map(target=>`<option value="${esc(target.id)}">${esc(target.name)}</option>`).join('')}</select>`,[
    {action:'use',label:'Add Target',callback:(_event,_button,dialog)=>dialog.element.querySelector('[name="parallelaTarget"]').value},
    {action:'decline',label:'Decline',default:true,callback:()=>null}]);
}
export async function resolveParallela(request,{user},ask=promptParallela){
  if(!game.user.isActiveGM||!user?.active||!Array.isArray(request?.effectIds)||request.effectIds.length>1000||!request.effectIds.every(id=>typeof id==='string')||
    typeof request.messageUuid!=='string'||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return null;
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
  if(!attackMessage(message)||!actor?.testUserPermission(user,'OWNER'))return null;
  const signature=JSON.stringify(request),previous=receipts.get(request.messageUuid);
  if(previous)return previous.signature===signature?previous.promise:null;
  const promise=withHopeLock(`parallela:${actor.uuid}`,async()=>{
    if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER'))return null;
    const allowed=new Set(request.effectIds),effects=[];
    for(const effect of parallelaEffects(actor))if(allowed.has(effect.id)&&await validParallela(effect))effects.push(effect);
    if(!effects.length)return null;
    let record=null;
    try{
      if(message.flags?.[ID]?.parallelaResolved)return null;
      await message.setFlag(ID,'parallelaResolved',true);
      const targets=parallelaCandidates(message,request.originUuid);
      if(!targets.length)return null;
      const owner=ownerFor(actor,[...game.users],game.user),data={messageUuid:message.uuid,originUuid:request.originUuid,targets};
      const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
      if(!game.user.isActiveGM||!owner.active||!user.active||!actor.testUserPermission(user,'OWNER')||!actor.testUserPermission(owner,'OWNER')||
        request.deadline<=decisionNow()||!effects.some(effect=>parallelaEffects(actor).some(current=>current.id===effect.id)))return null;
      const target=parallelaCandidates(message,request.originUuid).find(target=>target.id===choice&&targets.some(old=>old.id===target.id&&old.actorId===target.actorId));
      if(!target)return null;
      record={actorUuid:actor.uuid,targets:[target]};
      const updated=await message.update({'system.targets':[...message.system.targets,target],[`flags.${ID}.parallela`]:record});
      if(!updated)throw Error('Parallela could not add the selected target.');
      return record;
    }finally{
      // The next completed attack consumes the held spell, even if no extra target is chosen.
      const current=new Set(parallelaEffects(actor).map(effect=>effect.id)),ids=effects.filter(effect=>current.has(effect.id)).map(effect=>effect.id);
      if(ids.length){
        try{await actor.deleteEmbeddedDocuments('ActiveEffect',ids);}
        catch(error){
          // A committed target must still reach automatic damage if only cleanup fails.
          console.error(`${ID} | Parallela expiry failed`,error);
          ui.notifications.error('Parallela could not expire its held spell. The completed attack was preserved; remove the effect manually.');
        }
      }
    }
  });
  receipts.set(request.messageUuid,{signature,promise});if(receipts.size>512)receipts.delete(receipts.keys().next().value);
  return promise;
}
export function installParallela(Roll,dispatch){
  if(Object.hasOwn(Roll,WRAPPED))return;
  const native=Roll.build;
  Roll.build=async function(config={},...args){
    if(building.has(config)||config.evaluate===false||config.source?.message||config.actionType!=='action'||config.hasHealing)return native.call(this,config,...args);
    const actionId=config.source?.action;
    // Trait/general rolls have no action ID. Two missing IDs compare equal,
    // which previously selected an undefined item/actor and stopped the roll.
    if(typeof actionId!=='string'||!actionId)return native.call(this,config,...args);
    const uuid=config.source?.actor,actor=config.data?.parent??(uuid?foundry.utils.fromUuidSync(uuid):null);
    const item=actor?.items?.get?.(config.source?.item),actions=item?.system?.actions;
    const action=actor?.system?.attack?.id===actionId?actor.system.attack:
      item?.system?.attack?.id===actionId?item.system.attack:actions?.get?.(actionId)??actions?.[actionId]??item?.system?.actionsList?.find(entry=>entry.id===actionId);
    // Spellcast attacks qualify too; ordinary trait/Spellcast rolls do not consume the spell.
    if(action?.type!=='attack'||action.actionType==='reaction')return native.call(this,config,...args);
    const ids=parallelaEffects(actor).map(effect=>effect.id);
    if(!ids.length)return native.call(this,config,...args);
    building.add(config);
    try{
      const result=await native.call(this,config,...args);
      if(!result?.message||result.evaluate===false||!Number.isFinite(result.roll?.total))return result;
      try{
        if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(result.message.id);
        const origin=sourceToken(actor),record=await dispatch({messageUuid:result.message.uuid,effectIds:ids,originUuid:origin?.document.uuid??null,deadline:decisionNow()+decisionBudget(120000)});
        if(record?.actorUuid===actor.uuid){
          const existing=new Set((result.targets??[]).map(target=>target.actorId));
          result.targets=[...(result.targets??[]),...record.targets.filter(target=>!existing.has(target.actorId))];
        }
      }catch(error){console.error(`${ID} | Parallela failed`,error);ui.notifications.error('Parallela could not finish; the completed attack was preserved. Check its target and effect manually.');}
      return result;
    }finally{building.delete(config);}
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}

function placedEffects(){
  const actors=new Map([...(game.actors??[])].map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  return [...actors.values()].flatMap(actor=>[...(actor.effects??[])].filter(effect=>effect.origin?.endsWith(`.ActiveEffect.${PARALLELA_EFFECT}`)));
}
export async function casterParallelaEffects(caster){
  const result=[];
  for(const effect of placedEffects()){
    const template=await fromUuid(effect.origin),item=template?.parent,flags=item?.flags?.[ID];
    if(item?.actor?.uuid===caster.uuid&&(flags?.applied?.key??flags?.premade?.key)===BOOK_OF_SITIL_KEY)result.push(effect);
  }
  return result;
}
export async function replaceParallela(effect){
  if(!game.user.isActiveGM||effect.parent?.documentName!=='Actor'||!live(effect)||!effect.origin?.endsWith(`.ActiveEffect.${PARALLELA_EFFECT}`))return false;
  const sequence=++creationSequence,template=await fromUuid(effect.origin),item=template?.parent;if(!bookOfSitilItem(item))return false;
  const caster=item.actor,uuid=effectUuid(effect);
  if((latest.get(caster.uuid)?.sequence??0)>sequence)return false;
  latest.set(caster.uuid,{uuid,sequence});
  return withHopeLock(`parallela-caster:${caster.uuid}`,async()=>{
    if(latest.get(caster.uuid)?.uuid!==uuid)return false;
    const effects=await casterParallelaEffects(caster);
    if(latest.get(caster.uuid)?.uuid!==uuid||!effects.some(current=>effectUuid(current)===uuid))return false;
    for(const old of effects)if(effectUuid(old)!==uuid)await old.delete();
    return true;
  });
}
export async function expireParallelaRecast(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Array.isArray(request?.effectUuids)||request.effectUuids.length>1000)return false;
  const message=await fromUuid(request.messageUuid),action=message?.system?.action;
  if(action?.id!==PARALLELA_ACTION||!bookOfSitilItem(action.item)||!action.actor?.testUserPermission(user,'OWNER'))return false;
  return withHopeLock(`parallela-caster:${action.actor.uuid}`,async()=>{
    if(!user.active||!bookOfSitilItem(action.item)||!action.actor.testUserPermission(user,'OWNER'))return false;
    const allowed=new Set(request.effectUuids),effects=(await casterParallelaEffects(action.actor)).filter(effect=>allowed.has(effectUuid(effect)));
    for(const effect of effects)await effect.delete();return effects.length>0;
  });
}
export function installParallelaCast(Action,expire){
  if(Action[CAST_WRAP])return;
  const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
    if(this.id!==PARALLELA_ACTION||!bookOfSitilItem(this.item))return native.apply(this,args);
    const old=(await casterParallelaEffects(this.actor)).map(effectUuid),result=await native.apply(this,args);
    if(result?.message&&old.length){
      try{await expire({messageUuid:result.message.uuid,effectUuids:old});}
      catch(error){console.error(`${ID} | Parallela recast failed`,error);ui.notifications.error('Parallela could not remove its previous held spell. Remove it manually.');}
    }
    return result;
  };Object.defineProperty(Action,CAST_WRAP,{value:true});
}
export function registerBookOfSitil(){
  CONFIG.queries[QUERY]=resolveParallela;CONFIG.queries[PROMPT]=promptParallela;CONFIG.queries[RECAST]=expireParallelaRecast;
  const dispatch=(query,request,timeout)=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Parallela needs an active GM.');
    return gm.isSelf?CONFIG.queries[query](request,{user:game.user}):gm.query(query,request,{timeout});
  };
  for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installParallela(Roll,request=>dispatch(QUERY,request,decisionBudget(125000)));
  installParallelaCast(game.system.api.data.actions.actionsTypes.base,request=>dispatch(RECAST,request,15000));
  Hooks.on('createActiveEffect',effect=>{
    if(effect.origin?.endsWith(`.ActiveEffect.${PARALLELA_EFFECT}`))void replaceParallela(effect).catch(error=>{
      console.error(`${ID} | Parallela replacement failed`,error);ui.notifications.error('Parallela could not replace its previous held spell. Check the effects manually.');
    });
  });
}
