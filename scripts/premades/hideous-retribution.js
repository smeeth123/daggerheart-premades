import {ID,featureActive} from '../core.js';
import {attackTargetOutcome,resolvedAttackTargets} from '../attack-outcome.js';
import {companionPartner} from '../companion-context.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {allied,ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {markReactiveStress} from './stress-payment.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {RETRIBUTION_KEY,RETRIBUTION_ACTION} from './hideous-retribution-data.js';

const QUERY=`${ID}.hideousRetribution`,PROMPT=`${QUERY}Prompt`,RUN=`${QUERY}Run`,PAY=`${QUERY}Pay`;
const WRAPPED=Symbol.for(QUERY),TAG=Symbol.for(`${QUERY}Tag`),GATE=Symbol.for(PAY);
const receipts=new Map(),payments=new Map(),reacting=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const alive=actor=>!unavailableActor(actor)&&!actor?.flags?.[ID]?.companionUnavailable&&
  !(Number(actor?.system?.resources?.hitPoints?.max)>0&&Number(actor.system.resources.hitPoints.value)>=Number(actor.system.resources.hitPoints.max));
const canPay=actor=>Number(actor?.system?.resources?.stress?.value)<Number(actor?.system?.resources?.stress?.max);
export function retributionItem(actor){
  if(actor?.type!=='character'||!alive(actor))return null;
  return actor.items?.find(item=>{const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&
      (flags?.applied?.key??flags?.premade?.key)===RETRIBUTION_KEY;
  })??null;
}
export function retributionSource(packet){
  const flags=(packet?.main??packet?.damage??packet)?.options?.[ID];
  return flags?.retributionSource?.actorUuid??flags?.friendAttack??flags?.elementalSource??null;
}
export function tagRetribution(config){
  if(config.hasHealing||!config.damage?.main)return false;
  const uuid=config.source?.actor??config.source?.actorUUID;
  const actor=config.data?.parent??game.messages?.get(config.source?.message)?.system?.action?.actor??(uuid?foundry.utils.fromUuidSync(uuid):null);
  if(!actor?.uuid)return false;
  const main=config.damage.main;main.options??={};main.options[ID]={...main.options[ID],retributionSource:{actorUuid:actor.uuid}};
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:main.toJSON(),
    resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,roll])=>[key,roll.toJSON()]))});
  return true;
}
export function retributionCandidates(victim,source,{allowActorUuid=null}={}){
  if(!canvas.ready||!source||source.uuid===victim?.uuid||!alive(source))return [];
  const ally=sourceToken(victim),attacker=sourceToken(source);
  if(!ally||!attacker||ally.document.hidden||attacker.document.hidden||attacker.isVisible===false)return [];
  let ranges=canvas.scene?.rangeSettings;
  if(!ranges){
    const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene?.flags?.daggerheart?.rangeMeasurement;
    ranges=world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local:world;
  }
  const limit=Number(ranges?.close);if(!Number.isFinite(limit)||limit<0)return [];
  const seen=new Set(),result=[];
  for(const token of canvas.tokens.placeables){
    const actor=token.actor,item=retributionItem(actor);
    if(!item||seen.has(actor.uuid)||reacting.has(actor.uuid)&&actor.uuid!==allowActorUuid||!canPay(actor)||token.document.hidden||token.isVisible===false||
      actor.uuid===source.uuid||!allied(token.document,ally.document)||sourceToken(actor)?.document.uuid!==token.document.uuid)continue;
    const distance=token.distanceTo(ally);
    if(!Number.isFinite(distance)||distance<0||distance>limit)continue;
    seen.add(actor.uuid);result.push({actorUuid:actor.uuid,itemUuid:item.uuid,originUuid:token.document.uuid,victimUuid:victim.uuid,
      allyTokenUuid:ally.document.uuid,sourceUuid:source.uuid,sourceTokenUuid:attacker.document.uuid,sceneId:canvas.scene.id});
  }
  return result;
}
async function current(candidate,allowBusy=false){
  if(candidate.sceneId!==canvas?.scene?.id)return null;
  const victim=await fromUuid(candidate.victimUuid),source=await fromUuid(candidate.sourceUuid);
  const match=retributionCandidates(victim,source,{allowActorUuid:allowBusy?candidate.actorUuid:null}).find(entry=>Object.keys(candidate).every(key=>entry[key]===candidate[key]));
  const actor=match?await fromUuid(match.actorUuid):null,item=retributionItem(actor);
  return match&&item?.uuid===match.itemUuid?{actor,item,victim,source}:null;
}
export async function promptRetribution(candidate,{user}){
  const state=await current(candidate);
  if(!user?.isGM||!state?.actor.testUserPermission(game.user,'OWNER'))return false;
  return Boolean(await timedDialog(`Hideous Retribution — ${state.actor.name}`,
    `<p>${esc(state.victim.name)} within Close took damage from ${esc(state.source.name)}. Can you see the source?</p><p>Make a <strong>Spellcast reaction roll</strong> against them? On a success, mark <strong>1 Stress</strong> to deal <strong>Proficiency d6 magic damage</strong>.</p>`,[
      {action:'use',label:'Make Reaction Roll',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export function prepareRetribution(action,config,candidate){
  if(action.id!==RETRIBUTION_ACTION||retributionItem(action.actor)?.uuid!==action.item?.uuid||candidate.actorUuid!==action.actor.uuid||candidate.itemUuid!==action.item.uuid)return false;
  const source=canvas.tokens.placeables.find(token=>token.document.uuid===candidate.sourceTokenUuid&&token.actor?.uuid===candidate.sourceUuid);
  if(!source||source.document.hidden||source.isVisible===false||!alive(source.actor))return false;
  const entry=game.system.api.fields.ActionFields.TargetField.formatTarget.call(action,source);
  config.targets=[entry];config.actionType='reaction';
  config.roll={...config.roll,type:'reaction',trait:action.roll.rollTrait??action.roll.trait,difficulty:entry.difficulty||entry.evasion||null};
  return true;
}
export async function runRetribution(candidate,{user}){
  const state=await current(candidate,true);
  if(!user?.isGM||!state?.actor.testUserPermission(game.user,'OWNER'))return null;
  const action=state.item.system.actions?.get?.(RETRIBUTION_ACTION)??state.item.system.actions?.[RETRIBUTION_ACTION];
  if(!action?.use)return null;
  const result=await action.use({shiftKey:false,altKey:false,ctrlKey:false},
    {actionType:'reaction',[ID]:{hideousRetribution:candidate}});
  return result?.message?{messageUuid:result.message.uuid}:null;
}
export function retributionReaction(message){
  const action=message?.system?.action,actor=action?.actor,item=retributionItem(actor);
  return action?.id===RETRIBUTION_ACTION&&item?.uuid===action.item?.uuid&&action.actionType==='reaction'&&
    Number.isFinite(message.system.roll?.total)&&resolvedAttackTargets(message).some(target=>attackTargetOutcome(message.system.roll,target)==='success')?{actor,item}:null;
}
export async function payRetribution(request,{user},pay=markReactiveStress){
  if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string')return false;
  const message=await fromUuid(request.messageUuid),state=retributionReaction(message);
  if(!state?.actor.testUserPermission(user,'OWNER'))return false;
  if(message.flags?.[ID]?.retributionPaid===true)return true;
  if(payments.has(message.uuid))return payments.get(message.uuid);
  const operation=(async()=>{
    const eligible=actor=>game.user.isActiveGM&&user.active&&actor.testUserPermission(user,'OWNER')&&retributionReaction(message)?.item.uuid===state.item.uuid;
    if(!await pay(state.actor.uuid,eligible)){payments.delete(message.uuid);return false;}
    // Remember committed payment before the advisory marker write; never pay twice on failure.
    try{await message.setFlag(ID,'retributionPaid',true);}catch(error){console.error(`${ID} | Hideous Retribution payment marker`,error);}
    return true;
  })();payments.set(message.uuid,operation);if(payments.size>512)payments.delete(payments.keys().next().value);return operation;
}
export function retributionTookDamage(actor,updates,before){
  const key=actor.type==='companion'?'stress':'hitPoints',delta=Number(actor.system?.resources?.[key]?.value)-before;
  // Native companion damage returns no receipt after marking Stress.
  return delta>0&&(actor.type==='companion'&&updates===undefined||
    Array.isArray(updates)&&updates.some(row=>row.key===key&&!row.clear&&!row.itemId&&Number(row.value)>0));
}
async function offerRetribution(victim,source,captured,ask=promptRetribution,run=runRetribution){
  for(const candidate of captured){
    const state=await current(candidate);if(!state)continue;
    const owner=ownerFor(state.actor,[...game.users],game.user);
    const accepted=owner.isSelf?await ask(candidate,{user:game.user}):await owner.query(PROMPT,candidate,{timeout:decisionBudget(65000)});
    if(!accepted||!game.user.isActiveGM||!owner.active||!state.actor.testUserPermission(owner,'OWNER')||!await current(candidate))continue;
    // Avoid recursively asking the same caster while their current reaction deals damage.
    reacting.add(state.actor.uuid);
    try{if(owner.isSelf)await run(candidate,{user:game.user});else await owner.query(RUN,candidate,{timeout:decisionBudget(605000)});}
    finally{reacting.delete(state.actor.uuid);}
  }
}
export async function resolveRetributionDamage(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.isDirect!=='boolean')return null;
  const victim=await fromUuid(request.victimUuid),packet=bulkyDamagePacket(request.packet),sourceUuid=retributionSource(packet);
  const source=typeof sourceUuid==='string'?await fromUuid(sourceUuid):null;
  if(!victim||!packet||!source||!user.isGM&&!victim.testUserPermission(user,'OWNER')&&!source.testUserPermission(user,'OWNER')&&!companionPartner(victim)?.testUserPermission(user,'OWNER'))return null;
  const key=`${user.id}:${request.id}:${victim.uuid}`,signature=JSON.stringify(request),prior=receipts.get(key);
  if(prior)return prior.signature===signature?prior.operation:null;
  const operation=victim.takeDamage(packet,request.isDirect);receipts.set(key,{signature,operation});if(receipts.size>512)receipts.delete(receipts.keys().next().value);return operation;
}
export function installRetribution(Actor,Damage,dispatch,ask=promptRetribution,run=runRetribution,pay=request=>payRetribution(request,{user:game.user})){
  if(!Object.hasOwn(Damage,TAG)){
    const evaluate=Damage.buildEvaluate,post=Damage.buildPost;
    Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagRetribution(config);return result;};
    Damage.buildPost=async function(roll,config,...args){tagRetribution(config);return post.call(this,roll,config,...args);};
    Object.defineProperty(Damage,TAG,{value:true});
  }
  if(!Object.hasOwn(Damage,GATE)){
    const configure=Damage.buildConfigure;
    Damage.buildConfigure=async function(config,...args){
      const message=game.messages.get(config.source?.message),action=message?.system?.action;
      const flags=action?.item?.flags?.[ID];
      if(action?.id===RETRIBUTION_ACTION&&(flags?.applied?.key??flags?.premade?.key)===RETRIBUTION_KEY){
        if(config.hasHealing||!retributionReaction(message)||!await pay({messageUuid:message.uuid}))return null;
      }
      return configure.call(this,config,...args);
    };Object.defineProperty(Damage,GATE,{value:true});
  }
  if(Object.hasOwn(Actor,WRAPPED))return;
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(packet,...args){
    const sourceUuid=retributionSource(packet),source=sourceUuid?await fromUuid(sourceUuid):null;
    const captured=source&&bulkyDamagePacket(packet)?retributionCandidates(this,source):[];
    if(!captured.length)return native.call(this,packet,...args);
    if(!game.user.isActiveGM)return dispatch({id:foundry.utils.randomID(),victimUuid:this.uuid,packet:bulkyDamagePacket(packet),isDirect:Boolean(args[0])});
    const result=await withHopeLock(`retribution-damage:${this.uuid}`,async()=>{
      const key=this.type==='companion'?'stress':'hitPoints',before=Number(this.system?.resources?.[key]?.value);
      const prior=Object.getOwnPropertyDescriptor(this,'update'),update=this.update,pending=[];
      const capture=function(...args){const promise=update.apply(this,args);pending.push(Promise.resolve(promise));return promise;};
      if(typeof update==='function')Object.defineProperty(this,'update',{value:capture,writable:true,configurable:true});
      try{
        const updates=await native.call(this,packet,...args);
        let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}
        return {updates,damaged:retributionTookDamage(this,updates,before)};
      }finally{if(this.update===capture){if(prior)Object.defineProperty(this,'update',prior);else delete this.update;}}
    });
    if(result.damaged)try{await offerRetribution(this,source,captured,ask,run);}
    catch(error){console.error(`${ID} | Hideous Retribution after damage`,error);ui.notifications.error('Hideous Retribution could not finish. The ally’s damage was preserved; check the reaction and Stress before retrying.');}
    return result.updates;
  };Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerHideousRetribution(){
  CONFIG.queries[QUERY]=resolveRetributionDamage;CONFIG.queries[PROMPT]=promptRetribution;CONFIG.queries[RUN]=runRetribution;CONFIG.queries[PAY]=payRetribution;
  const dispatch=(query,request,timeout)=>{const gm=game.users.activeGM;if(!gm)throw Error('Hideous Retribution needs an active GM.');return gm.isSelf?CONFIG.queries[query](request,{user:game.user}):gm.query(query,request,{timeout});};
  installRetribution(CONFIG.Actor.documentClass,CONFIG.Dice.daggerheart.DamageRoll,request=>dispatch(QUERY,request,decisionBudget(605000)),promptRetribution,runRetribution,request=>dispatch(PAY,request,decisionBudget(125000)));
  Hooks.on('daggerheart.preUseAction',(action,config)=>{
    const candidate=config[ID]?.hideousRetribution;if(candidate&&!prepareRetribution(action,config,candidate))return false;
  });
}
