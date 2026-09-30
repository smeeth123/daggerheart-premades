import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,tokenState,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {honedAction} from './honed.js';
import {meleeLimit} from './kick.js';
import {markReactiveStress} from './stress-payment.js';
import {installVigilantBefore} from './vigilant.js';
import {I_SEE_IT_COMING_KEY,I_SEE_IT_COMING_ACTION} from './i-see-it-coming-data.js';

const QUERY=`${ID}.iSeeItComing`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),seen=new Map();
const rangeState=scene=>JSON.stringify([scene.grid,scene.flags?.daggerheart?.rangeMeasurement,
  game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement]);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function iSeeItComingItem(actor){
  const stress=actor?.system?.resources?.stress;
  if(actor?.type!=='character'||unavailableActor(actor)||!(Number(stress?.value)<Number(stress?.max)))return null;
  return actor.items?.find(item=>{
    const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&
      !system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===I_SEE_IT_COMING_KEY;
  })??null;
}

export function seeItComingTargets(actor,config,attacker=config.data?.parent){
  if(!canvas.ready||!iSeeItComingItem(actor)||honedAction(attacker,config.source)?.type!=='attack')return null;
  const origin=sourceToken(attacker),limit=meleeLimit(canvas.scene);
  if(!origin||!Number.isFinite(limit)||limit<0)return null;
  const targets=[];
  for(const target of config.targets??[]){
    if(target.actorId!==actor.uuid||(target.difficulty&&Number(target.difficulty)!==Number(target.evasion)))continue;
    const token=canvas.tokens.get(target.id),distance=token&&origin.distanceTo(token);
    if(token?.actor?.uuid!==actor.uuid||!Number.isFinite(distance)||distance<=limit)continue;
    targets.push({id:target.id,uuid:token.document.uuid,state:tokenState(token.document),distance});
  }
  return targets.length?{origin,targets}:null;
}

function validRange(request,origin,targets){
  const limit=meleeLimit(origin.parent);
  if(!Number.isFinite(limit)||limit<0)return false;
  return targets.every((target,index)=>{
    let distance;
    if(canvas.ready&&canvas.scene.id===origin.parent.id&&origin.object&&target.object)distance=origin.object.distanceTo(target.object);
    else{
      if(tokenState(origin)!==request.originState||tokenState(target)!==request.targets[index].state||rangeState(origin.parent)!==request.rangeState)return false;
      distance=request.targets[index].distance;
    }
    return Number.isFinite(distance)&&distance>limit;
  });
}

export async function validateISeeItComing(request,user){
  if(!user?.active||request.deadline<=decisionNow()||!Array.isArray(request.targets)||!request.targets.length||request.targets.length>100||
    new Set(request.targets.map(target=>target.uuid)).size!==request.targets.length)return null;
  const attacker=await fromUuid(request.source?.actor),actor=await fromUuid(request.actorUuid),item=iSeeItComingItem(actor);
  if(!item||!attacker?.testUserPermission(user,'OWNER')||honedAction(attacker,request.source)?.type!=='attack')return null;
  const origin=await fromUuid(request.originUuid),targets=await Promise.all(request.targets.map(target=>fromUuid(target.uuid)));
  if(origin?.documentName!=='Token'||origin.actor?.uuid!==attacker.uuid||targets.some((target,index)=>
    target?.documentName!=='Token'||target.actor?.uuid!==actor.uuid||target.id!==request.targets[index].id||target.parent?.id!==origin.parent?.id)||
    !validRange(request,origin,targets))return null;
  return {attacker,actor,item,origin,targets};
}

export async function promptISeeItComing(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!iSeeItComingItem(actor))return false;
  return Boolean(await timedDialog(`I See It Coming — ${actor.name}`,
    `<p><strong>${esc(data.attackerName)}</strong> is targeting you with an attack from beyond Melee range.</p><p>Before the attack rolls, mark <strong>1 Stress</strong> and roll <strong>1d4</strong> for an Evasion bonus against this attack?</p>`,
    [{action:'use',label:'Mark Stress & Roll d4',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]
  ));
}

export async function resolveISeeItComing(request,{user},ask=promptISeeItComing,rollDie=async()=>new Roll('1d4').evaluate()){
  if(!game.user.isActiveGM||typeof request.id!=='string'||request.id.length>64||!Number.isFinite(request.deadline)||
    request.deadline>decisionNow()+decisionBudget(125000))return null;
  for(const[key,expiry]of seen)if(expiry<decisionNow())seen.delete(key);
  const key=`${user?.id}:${request.id}`;if(seen.has(key))return null;
  let valid=await validateISeeItComing(request,user);if(!valid||seen.has(key))return null;
  // Reserve before the remote choice so duplicate requests cannot spend twice.
  seen.set(key,decisionNow()+decisionBudget(300000));
  const owner=ownerFor(valid.actor,[...game.users],game.user),data={actorUuid:valid.actor.uuid,attackerName:valid.attacker.name};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(accepted!==true||!owner.active)return null;
  valid=await validateISeeItComing(request,user);if(!valid||!valid.actor.testUserPermission(owner,'OWNER'))return null;
  const paid=await markReactiveStress(valid.actor.uuid,actor=>Boolean(iSeeItComingItem(actor)&&user.active&&owner.active&&actor.testUserPermission(owner,'OWNER')&&
    request.deadline>decisionNow()&&validRange(request,valid.origin,valid.targets)));
  if(!paid)return null;
  const roll=await rollDie(),bonus=Number(roll.total);
  if(!Number.isInteger(bonus)||bonus<1||bonus>4)throw Error('Invalid I See It Coming d4 result.');
  const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:valid.actor}),flavor:`I See It Coming — +${bonus} Evasion against the incoming attack`});
  if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  return {bonus,bearerName:valid.actor.name,targetIds:valid.targets.map(target=>target.id)};
}

export function installISeeItComing(RollClass,dispatch){
  if(RollClass[WRAPPED])return;
  installVigilantBefore(RollClass,(request,config,_target,attacker)=>{
    const actor=canvas.tokens.placeables.find(token=>token.actor?.uuid===request.actorUuid)?.actor;
    const context=actor&&seeItComingTargets(actor,config,attacker);
    if(!context)return null;
    return dispatch({...request,originUuid:context.origin.document.uuid,originState:tokenState(context.origin.document),
      rangeState:rangeState(canvas.scene),targets:context.targets});
  },(actor,config,target,attacker)=>Boolean(seeItComingTargets(actor,config,attacker)?.targets.some(entry=>entry.id===target.id)),
  'iSeeItComing',{label:'I See It Coming',allowReactions:true});
  Object.defineProperty(RollClass,WRAPPED,{value:true});
}

export function registerISeeItComing(){
  CONFIG.queries[QUERY]=resolveISeeItComing;CONFIG.queries[PROMPT]=promptISeeItComing;
  const dispatch=request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('I See It Coming needs an active GM.');
    return gm.isSelf?resolveISeeItComing(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  };
  for(const RollClass of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installISeeItComing(RollClass,dispatch);
  Hooks.on('daggerheart.preUseAction',action=>{
    if(action.id===I_SEE_IT_COMING_ACTION&&iSeeItComingItem(action.actor)?.uuid===action.item?.uuid){
      ui.notifications.info('I See It Coming is offered before an incoming attack made from beyond Melee range.');return false;
    }
  });
}
