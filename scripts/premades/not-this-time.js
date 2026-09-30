import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { TIME_KEY,TIME_ACTION } from './not-this-time-data.js';
import { sourceToken } from './hallowed-aura.js';
import { ownerFor,tokenState } from './aura-rules.js';
import { withHopeLock } from './hope-lock.js';
import { registerResolutionProvider,resolutionRequest,consumeResolutionTicket } from '../resolution-manager.js';
import { animateInitialDamage } from './combo-strike.js';
import { animateLuckbenderReroll } from './luckbender.js';
const QUERY=`${ID}.notThisTime`;
const rules=()=>game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
const rangeState=scene=>JSON.stringify([scene.grid,scene.flags?.daggerheart?.rangeMeasurement,rules()]);
export function timeLimit(scene){const r=rules(),local=scene.flags?.daggerheart?.rangeMeasurement;return Number(r.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.far:r.far);}
export function timeItem(actor){return actor?.type==='character'&&Number(actor.system.resources?.hope?.value)>=3?actor.items.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===TIME_KEY;})??null:null;}
export function collectTimeChoices(attacker,message,total,kind,used=new Set()){
  const origin=sourceToken(attacker);if(attacker?.type!=='adversary'||!origin||(kind==='time-attack'&&!message?.uuid)||!Number.isFinite(total))return [];
  const found=new Map();
  for(const bearer of canvas.tokens.placeables){
    const item=timeItem(bearer.actor);if(!item||used.has(item.uuid))continue;
    const distance=bearer.distanceTo(origin),limit=timeLimit(canvas.scene);if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)continue;
    found.set(item.uuid,{id:`${kind}:${item.uuid}`,usageKey:item.uuid,kind,request:{kind,attackerUuid:attacker.uuid,messageUuid:message?.uuid,total,candidate:{itemUuid:item.uuid},bearerTokenUuid:bearer.document.uuid,attackerTokenUuid:origin.document.uuid,bearerState:tokenState(bearer.document),attackerState:tokenState(origin.document),rangeState:rangeState(canvas.scene),distance}});
  }return [...found.values()];
}
export async function validateTime(request,user){
  if(!user?.active||request.deadline<=decisionNow()||!Number.isFinite(request.total)||!['time-attack','time-damage'].includes(request.kind))return null;
  const attacker=await fromUuid(request.attackerUuid),item=await fromUuid(request.candidate?.itemUuid),message=request.messageUuid?await fromUuid(request.messageUuid):null;
  if(attacker?.type!=='adversary'||!attacker.testUserPermission(user,'OWNER')||!item||timeItem(item.actor)?.uuid!==item.uuid||(request.messageUuid&&message?.system?.action?.actor?.uuid!==attacker.uuid))return null;
  if(request.kind==='time-attack'&&(!message||message.system.action.type!=='attack'||message.system.roll?.total!==request.total||!message.system.currentHitTargets?.length))return null;
  const bearer=await fromUuid(request.bearerTokenUuid),origin=await fromUuid(request.attackerTokenUuid);
  if(bearer?.actor?.uuid!==item.actor.uuid||origin?.actor?.uuid!==attacker.uuid||!bearer.parent||bearer.parent.id!==origin.parent?.id)return null;
  let distance;
  if(canvas.ready&&canvas.scene.id===bearer.parent.id&&bearer.object&&origin.object)distance=bearer.object.distanceTo(origin.object);
  else{if(tokenState(bearer)!==request.bearerState||tokenState(origin)!==request.attackerState||rangeState(bearer.parent)!==request.rangeState)return null;distance=request.distance;}
  const limit=timeLimit(bearer.parent);if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)return null;
  return {actor:item.actor,item};
}
export async function resolveTime(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const item=await fromUuid(request.candidate?.itemUuid);if(!item?.actor)return false;
  return withHopeLock(item.actor.uuid,async()=>{const valid=await validateTime(request,user);if(!valid||!authorize(request.resolutionToken,request.kind,item.uuid,user))return false;
    const next=Number(valid.actor.system.resources.hope.value)-3,updated=await valid.actor.update({'system.resources.hope.value':next});
    if(!updated||Number(valid.actor.system.resources.hope.value)!==next)throw new Error('Could not spend Not This Time Hope.');
    return {bearerName:valid.actor.name,itemUuid:item.uuid};
  });
}
export async function payTime(choice){const gm=game.users.activeGM;if(!gm)throw new Error('Not This Time needs an active GM.');const request={...choice.request,resolutionToken:choice.token,deadline:decisionNow()+decisionBudget(120000)};return gm.isSelf?resolveTime(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});}
export async function rerollTimeDamage(config,message,paid){
  const replacement=await config.damage.main.reroll();
  for(const die of replacement.dice)for(const result of die.results)result.hidden=false;
  replacement.options[ID]={...replacement.options[ID],notThisTime:paid};config.damage.main=replacement;
  await animateLuckbenderReroll(replacement,{source:{message:message?.id},selectedMessageMode:config.selectedMessageMode??config.rollMode},message);
  if(game.dice3d)for(const die of replacement.dice)for(const result of die.results)result.hidden=true;
  // Standalone cards deep-clone the config, which serializes DataModel._source.
  // Rebuild it so that both serialized card data and live application use the reroll.
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({
    ...config.damage.toObject(),main:replacement.toJSON(),
    resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))
  });
  if(config.damageFormula)config.damageFormula.roll=config.damage.main;
}
export async function timeDamageSource(config){
  const message=game.messages.get(config.source?.message);
  let attacker=message?.system?.action?.actor??config.data?.parent;
  if(!attacker&&config.source?.actor)attacker=await fromUuid(config.source.actor);
  // Native standalone damage enrichers have no actor data; use the single
  // controlled token that supplies their default chat speaker.
  if(!attacker&&!config.source?.actor&&!message){const controlled=canvas.tokens?.controlled??[];if(controlled.length===1)attacker=controlled[0].actor;}
  return {message,attacker};
}
export async function offerTimeDamage(config){
  const {message,attacker}=await timeDamageSource(config);
  if(config.hasHealing||!config.damage?.main?.dice?.length)return;
  const used=new Set();let rows=collectTimeChoices(attacker,message,config.damage.main.total,'time-damage',used);if(!rows.length)return;
  await animateInitialDamage(config,message??getDocumentClass('ChatMessage').applyMode({},config.selectedMessageMode??config.rollMode??game.settings.get('core','messageMode')));
  const id=foundry.utils.randomID();let previous=null,lastUsed=false;
  await message?.update({[`flags.${ID}.defensePending`]:true});
  try{for(let round=0;round<100;round++){
    const choice=await resolutionRequest({op:'round',id,actorUuid:attacker.uuid,messageUuid:message?.uuid,roll:{damage:true,total:config.damage.main.total,hope:0,fear:0},rows,previous});if(!choice)break;
    const paid=await payTime(choice);lastUsed=Boolean(paid);
    if(paid){await rerollTimeDamage(config,message,paid);used.add(choice.usageKey);}
    previous={used:lastUsed,declined:!lastUsed};rows=collectTimeChoices(attacker,message,config.damage.main.total,'time-damage',used);
  }}finally{await resolutionRequest({op:'close',id,used:lastUsed});await message?.update({[`flags.${ID}.-=defensePending`]:null});}
}
export function installTimeDamage(Damage,offer=offerTimeDamage){const native=Damage.buildEvaluate;Damage.buildEvaluate=async function(roll,config,...args){const result=await native.call(this,roll,config,...args);await offer(config);return result;};}
export function registerNotThisTime(){
  CONFIG.queries[QUERY]=resolveTime;
  for(const kind of ['time-attack','time-damage'])registerResolutionProvider(kind,async(request,user)=>{const valid=await validateTime({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:ownerFor(valid.actor,[...game.users],game.user),name:`Not This Time — ${kind==='time-attack'?'Attack':'Damage'}`,bearerName:valid.actor.name,cost:'3 Hope',description:valid.item.system.description??''}:null;});
  installTimeDamage(CONFIG.Dice.daggerheart.DamageRoll);
  Hooks.on('daggerheart.preUseAction',action=>{const f=action.item?.flags?.[ID];if(!f?.disabled&&action.id===TIME_ACTION&&(f?.applied?.key??f?.premade?.key)===TIME_KEY){ui.notifications.info('Not This Time is offered when an adversary within Far rolls an attack or damage.');return false;}});
  Hooks.on('renderChatMessageHTML',(message,html)=>{if(!message.isContentVisible)return;const name=message.system?.damage?.main?.options?.[ID]?.notThisTime?.bearerName;if(!name||html.querySelector('.dhp-time-damage'))return;const note=html.ownerDocument.createElement('p');note.className='dhp-time-damage';note.textContent=`Not This Time: ${name} forced a damage reroll.`;html.querySelector('.message-content')?.append(note);});
}
