import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {markReactiveStress} from './stress-payment.js';
import {blightingOutcome} from './blighting-strike.js';
import {resolvedAttackTargets,attackHitTargets} from '../attack-outcome.js';
import {WEAPON_FOLLOW_UP_KEY} from './weapon-follow-up-data.js';

const QUERY=`${ID}.weaponFollowUp`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY);
const pending=new Map(),completed=new Map();
const canPay=actor=>Number(actor?.system?.resources?.stress?.value)<Number(actor?.system?.resources?.stress?.max);
export function followUpWeapon(item){
  return Boolean(item?.type==='weapon'&&item.system?.equipped&&item.system.secondary&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===WEAPON_FOLLOW_UP_KEY&&item.system.weaponFeatures?.some(feature=>feature.value==='followUp'));
}
export function followUpInMelee(message){
  if(blightingOutcome(message)!=='success')return false;
  const data=message.system,action=data.action;
  const targets=resolvedAttackTargets(message),hits=attackHitTargets(message);
  // Native Melee attacks support theater-of-the-mind / manually declared rolls.
  // A measurable target uses its actual range even if the action says Melee.
  if(!targets.length)return action.range==='melee';
  const origin=globalThis.canvas?.ready?sourceToken(action.actor):null;
  if(!origin){
    if(globalThis.canvas?.ready&&canvas.tokens.placeables.some(token=>token.actor?.uuid===action.actor.uuid))return false;
    return action.range==='melee';
  }
  const ranges=canvas.scene.rangeSettings??game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
  const limit=Number(ranges.melee);
  return hits.some(target=>{
    const token=canvas.tokens.get(target.id);
    if(!token)return !target.id&&action.range==='melee';
    if(token.actor?.uuid!==target.actorId||token.document.hidden)return false;
    const distance=origin.distanceTo(token);return Number.isFinite(limit)&&limit>=0&&Number.isFinite(distance)&&distance>=0&&distance<=limit;
  });
}
export function followUpContext(message){
  const data=message?.system,action=data?.action,actor=action?.actor,primary=action?.item,source=data?.source;
  if(actor?.type!=='character'||unavailableActor(actor)||action.type!=='attack'||action.actionType==='reaction'||data.hasHealing||
    primary?.type!=='weapon'||!primary.system.equipped||primary.system.secondary||actor.system.primaryWeapon?.uuid!==primary.uuid||
    source?.actor!==actor.uuid||source.item!==primary.id||source.action!==action.id||!followUpInMelee(message))return null;
  const item=[...(actor.items?.values?.()??actor.items??[])].find(followUpWeapon);
  return item?{actor,item,action,message}:null;
}
export async function promptWeaponFollowUp(request,{user}){
  const message=await fromUuid(request.messageUuid),context=followUpContext(message);
  if(!user?.isGM||!context||context.item.uuid!==request.weaponUuid||!context.actor.testUserPermission(game.user,'OWNER')||!canPay(context.actor))return false;
  return timedDialog('Follow-Up','<p>This primary-weapon attack hit within <strong>Melee</strong> range. Mark <strong>1 Stress</strong> for <strong>+1 Proficiency</strong> on its damage?</p>',[
    {action:'use',label:'Mark 1 Stress',callback:()=>true},
    {action:'decline',label:'Decline',default:true,callback:()=>false}]);
}
export async function resolveWeaponFollowUp(request,{user},ask=promptWeaponFollowUp){
  if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||request.sceneId!==(globalThis.canvas?.scene?.id??null))return null;
  const message=await fromUuid(request.messageUuid),context=followUpContext(message);
  if(!context||context.item.uuid!==request.weaponUuid||!context.actor.testUserPermission(user,'OWNER'))return null;
  const cached=message.flags?.[ID]?.weaponFollowUp??completed.get(message.uuid);
  if(cached)return cached;
  if(pending.has(message.uuid))return pending.get(message.uuid);
  if(!canPay(context.actor))return null;
  const operation=(async()=>{
    const owner=ownerFor(context.actor,[...game.users],game.user);
    if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
    const eligible=fresh=>{
      const current=followUpContext(message);
      return Boolean(game.user.isActiveGM&&user.active&&owner.active&&request.sceneId===(globalThis.canvas?.scene?.id??null)&&
        current?.actor.uuid===fresh.uuid&&current.item.uuid===request.weaponUuid&&fresh.testUserPermission(user,'OWNER')&&fresh.testUserPermission(owner,'OWNER'));
    };
    if(!eligible(context.actor)||!canPay(context.actor))return null;
    const use=owner.isSelf?await ask(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
    if(!eligible(context.actor))return null;
    const paid=use===true?await markReactiveStress(context.actor.uuid,eligible):false;
    const record={used:paid,actorUuid:context.actor.uuid,weaponUuid:context.item.uuid,primaryWeaponUuid:context.action.item.uuid,source:{...message.system.source}};
    // Keep an in-session receipt before writing, so a failed chat write cannot
    // charge Stress twice. Do not refund substituted Brave Face/Unshakeable costs.
    completed.set(message.uuid,record);if(completed.size>1000)completed.delete(completed.keys().next().value);
    const updated=await message.setFlag(ID,'weaponFollowUp',record);
    if(!updated)throw Error('Follow-Up could not save this attack’s choice. Check its Stress payment before retrying.');
    return record;
  })();
  pending.set(message.uuid,operation);
  try{return await operation;}finally{pending.delete(message.uuid);}
}
export function boostFollowUpProficiency(config,action){
  if(config[ID]?.weaponFollowUpBoosted)return false;
  const prof=Number(config.data?.prof);if(!Number.isFinite(prof))return false;
  const data={...config.data,parent:config.data.parent,prof:prof+1,system:{...config.data.system,proficiency:prof+1}};
  const facade=new Proxy(action,{get(target,key){
    if(key==='getRollData')return (...args)=>({...target.getRollData(...args),parent:data.parent,prof:data.prof,system:{...target.getRollData(...args).system,proficiency:data.prof}});
    return Reflect.get(target,key,target);
  }});
  const formula=game.system.api.fields.ActionFields.DamageField.formatFormulas.call(facade,[action.damage.main],config)[0];
  if(!formula)return false;
  config.data=data;config.damageFormula={...config.damageFormula,formula:formula.formula};
  config[ID]={...config[ID],weaponFollowUpBoosted:true};return true;
}
export function installWeaponFollowUp(Damage,offer){
  if(Object.hasOwn(Damage,WRAPPED))return;
  const configure=Damage.buildConfigure;
  Damage.buildConfigure=async function(config,...args){
    const message=config.source?.message?game.messages.get(config.source.message):null,action=message?.system?.action;
    const sameSource=message&&['actor','item','action'].every(key=>message.system.source?.[key]===config.source[key]);
    if(!config.hasHealing&&config.damageFormula&&config.evaluate!==false&&sameSource&&Number.isFinite(Number(config.data?.prof))){
      let record=message.flags?.[ID]?.weaponFollowUp??completed.get(message.uuid);
      const context=followUpContext(message);
      if(!record&&context&&canPay(context.actor))record=await offer({messageUuid:message.uuid,weaponUuid:context.item.uuid,sceneId:globalThis.canvas?.scene?.id??null});
      if(record?.used&&record.actorUuid===config.source.actor&&record.primaryWeaponUuid===action?.item?.uuid&&
        ['actor','item','action'].every(key=>record.source?.[key]===config.source[key]))boostFollowUpProficiency(config,action);
    }
    return configure.call(this,config,...args);
  };
  Object.defineProperty(Damage,WRAPPED,{value:true});
}
export function registerWeaponFollowUp(){
  CONFIG.queries[QUERY]=resolveWeaponFollowUp;CONFIG.queries[PROMPT]=promptWeaponFollowUp;
  installWeaponFollowUp(CONFIG.Dice.daggerheart.DamageRoll,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Follow-Up needs an active GM.');
    return gm.isSelf?resolveWeaponFollowUp(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(75000)});
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    if(followUpWeapon(action.item)&&action.item.system.weaponFeatures.some(feature=>feature.value==='followUp'&&feature.actionIds?.includes(action.id))){
      ui.notifications.info('Attack with your primary weapon. Follow-Up will offer its bonus before damage on a successful Melee attack.');return false;
    }
  });
}
