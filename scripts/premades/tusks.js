import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import {attackHitTargets} from '../attack-outcome.js';
import { timedDialog } from '../dialog.js';
import { ownerFor, tokenState } from './aura-rules.js';
import { sourceToken } from './hallowed-aura.js';
import { withHopeLock } from './hope-lock.js';
import { TUSKS_KEY, TUSKS_ACTION } from './tusks-data.js';
const QUERY=`${ID}.tusks`,PROMPT=`${ID}.tusksPrompt`,WRAPPED=Symbol.for(`${ID}.tusksWrapped`);
const decisions=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const settings=()=>game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
const rangeState=scene=>JSON.stringify([scene.grid,scene.flags?.daggerheart?.rangeMeasurement,settings()]);
export function meleeLimit(scene){
  const rules=settings(),local=scene.flags?.daggerheart?.rangeMeasurement;
  return Number(rules.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.melee:rules.melee);
}
export function tusksItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===TUSKS_KEY;
  })??null;
}
const canPay=actor=>Number(actor?.system.resources.hope.value)>=1;
export function tusksHit(message){
  const data=message?.system,roll=data?.roll;
  if(data?.action?.type!=='attack'||!roll||!Number.isFinite(roll.total))return null;
  // The native damage roll is shared by all hit targets. Do not add a single
  // target's Tusks to an entire multi-target attack.
  const hits=attackHitTargets(message);
  return hits.length===1?hits[0]:null;
}
export async function validateTusks(request,user){
  if(!user?.active||request.deadline<=decisionNow())return null;
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
  if(!actor?.testUserPermission(user,'OWNER')||!tusksItem(actor))return null;
  const hit=tusksHit(message);if(!hit||hit.id!==request.targetId)return null;
  const origin=await fromUuid(request.originUuid),target=await fromUuid(request.targetUuid);
  if(origin?.actor?.uuid!==actor.uuid||target?.actor?.uuid!==hit.actorId||target.id!==hit.id||origin.parent?.id!==target.parent?.id)return null;
  let distance;
  if(canvas.ready&&canvas.scene.id===origin.parent.id&&origin.object&&target.object)distance=origin.object.distanceTo(target.object);
  else{
    if(tokenState(origin)!==request.originState||tokenState(target)!==request.targetState||rangeState(origin.parent)!==request.rangeState)return null;
    distance=request.distance;
  }
  const limit=meleeLimit(origin.parent);
  if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)return null;
  return {actor,message,hit};
}
export async function promptTusks(data,{user}){
  if(!user.isGM)throw new Error('Only a GM may request Tusks.');
  const actor=await fromUuid(data.actorUuid);
  if(!actor?.testUserPermission(game.user,'OWNER')||!tusksItem(actor)||!canPay(actor))return false;
  return Boolean(await timedDialog(`Tusks — ${actor.name}`,
    `<p>You hit <strong>${esc(data.targetName)}</strong> within Melee range.</p><p>Spend <strong>1 Hope</strong> to add <strong>1d6 damage</strong> with Tusks?</p>`,[
      {action:'use',label:'Spend 1 Hope',icon:'fa-solid fa-bolt',callback:()=>true},
      {action:'decline',label:'Decline',default:true,callback:()=>false}
    ]));
}
export async function resolveTusks(request,{user}){
  if(!game.user.isActiveGM||typeof request.messageUuid!=='string'||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Tusks request.');
  let valid=await validateTusks(request,user);if(!valid)return false;
  if(valid.message.flags?.[ID]?.tusks)return valid.message.flags[ID].tusks.targetId===valid.hit.id;
  for(const [key,entry]of decisions)if(entry.expires<decisionNow())decisions.delete(key);
  if(decisions.has(request.messageUuid))return decisions.get(request.messageUuid).promise;
  const promise=(async()=>{
    if(!canPay(valid.actor))return false;
    const recipient=ownerFor(valid.actor,[...game.users],game.user);
    const data={actorUuid:valid.actor.uuid,targetName:valid.hit.name};
    const accepted=recipient.isSelf?await promptTusks(data,{user:game.user}):await recipient.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(!accepted)return false;
    valid=await validateTusks(request,user);if(!valid)return false;
    const paid=await withHopeLock(valid.actor.uuid,async()=>{
      if(!tusksItem(valid.actor)||!canPay(valid.actor))return false;
      const next=Number(valid.actor.system.resources.hope.value)-1;
      const updated=await valid.actor.update({'system.resources.hope.value':next});
      if(!updated||Number(valid.actor.system.resources.hope.value)!==next)throw new Error('Could not spend Tusks Hope.');
      return true;
    });if(!paid)return false;
    await valid.message.update({[`flags.${ID}.tusks`]:{actorUuid:valid.actor.uuid,targetId:valid.hit.id}});
    return true;
  })();
  decisions.set(request.messageUuid,{promise,expires:decisionNow()+decisionBudget(300000)});
  return promise;
}
export async function offerTusks(config){
  const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor;
  if(!tusksItem(actor)||config.hasHealing||!config.damageFormula)return false;
  const hit=tusksHit(message);if(!hit)return false;
  if(message.flags?.[ID]?.tusks?.targetId===hit.id)return true;
  if(!canPay(actor))return false;
  const origin=sourceToken(actor),target=canvas.tokens?.get(hit.id);
  if(!origin||!target)return false;
  const distance=origin.distanceTo(target),limit=meleeLimit(canvas.scene);
  if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)return false;
  const gm=game.users.activeGM;if(!gm)throw new Error('Tusks needs an active GM.');
  const request={messageUuid:message.uuid,targetId:hit.id,originUuid:origin.document.uuid,targetUuid:target.document.uuid,
    originState:tokenState(origin.document),targetState:tokenState(target.document),rangeState:rangeState(canvas.scene),distance,deadline:decisionNow()+decisionBudget(120000)};
  return gm.isSelf?resolveTusks(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
}
export function installTusks(RollClass,offer=offerTusks){
  if(RollClass[WRAPPED])return;
  const configure=RollClass.buildConfigure,create=RollClass.createRollInstance,bonus=RollClass.prototype.applyBaseBonus;
  const enabled=new WeakSet();
  RollClass.buildConfigure=async function(config,...args){
    if(await offer(config))enabled.add(config);
    try{return await configure.call(this,config,...args);}finally{enabled.delete(config);}
  };
  RollClass.createRollInstance=function(config){
    const roll=create.call(this,config);
    if(enabled.has(config)){
      const effect={name:'Tusks (+1d6)',description:'Tusks: 1 Hope spent.',selected:true,changes:[]};
      config.bonusEffects??={};config.bonusEffects[TUSKS_KEY]=effect;
      roll.options.bonusEffects=config.bonusEffects;
    }
    return roll;
  };
  RollClass.prototype.applyBaseBonus=function(part){
    const modifiers=bonus.call(this,part);
    if(!this.options.hasHealing&&this.options.bonusEffects?.[TUSKS_KEY]?.selected)
      modifiers.push({label:'Tusks',value:'1d6'});
    return modifiers;
  };
  Object.defineProperty(RollClass,WRAPPED,{value:true});
}
export function registerTusks(){
  CONFIG.queries[QUERY]=resolveTusks;CONFIG.queries[PROMPT]=promptTusks;
  installTusks(CONFIG.Dice.daggerheart.DamageRoll);
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(action.id!==TUSKS_ACTION||(flags?.applied?.key??flags?.premade?.key)!==TUSKS_KEY)return;
    ui.notifications.info('Tusks is offered after a successful attack within Melee range, before its damage roll.');return false;
  });
}
