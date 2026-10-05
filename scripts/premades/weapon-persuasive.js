import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {WEAPON_PERSUASIVE_KEY} from './weapon-persuasive-data.js';

const QUERY=`${ID}.weaponPersuasive`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
export function persuasiveWeapon(item){return Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_PERSUASIVE_KEY&&item.system.weaponFeatures?.some(f=>f.value==='persuasive'));}
export function persuasiveItem(actor){return actor?.type==='character'&&!unavailableActor(actor)?actor.items?.find(persuasiveWeapon)??null:null;}
const canPay=actor=>Number(actor?.system?.resources?.stress?.max)>Number(actor?.system?.resources?.stress?.value);
async function state(request){const actor=await fromUuid(request?.actorUuid),item=persuasiveItem(actor);return item?.uuid===request.itemUuid&&canPay(actor)?{actor,item}:null;}
export async function promptPersuasive(request,{user}){const valid=await state(request);if(!user?.isGM||!valid||!valid.actor.testUserPermission(game.user,'OWNER')||request.deadline<=decisionNow())return false;return timedDialog('Persuasive','<p>Mark <strong>1 Stress</strong> to gain <strong>+2</strong> on this Presence roll?</p>',[{action:'use',label:'Mark 1 Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]);}
export async function resolvePersuasive(request,{user},ask=promptPersuasive,mark=markReactiveStress){
  if(!game.user.isActiveGM||!user?.active||typeof request?.offerId!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.offerId)||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const valid=await state(request);if(!valid||!valid.actor.testUserPermission(user,'OWNER'))return false;
  const key=`${user.id}:${request.offerId}`,signature=JSON.stringify(request),saved=receipts.get(key);if(saved)return saved.signature===signature?saved.operation:false;
  const operation=(async()=>{const owner=ownerFor(valid.actor,[...game.users],game.user),choice=owner.isSelf?await ask(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});if(choice!==true)return false;
    return mark(valid.actor.uuid,actor=>Boolean(game.user.isActiveGM&&user.active&&owner.active&&request.deadline>decisionNow()&&actor.testUserPermission(user,'OWNER')&&actor.testUserPermission(owner,'OWNER')&&persuasiveItem(actor)?.uuid===valid.item.uuid&&canPay(actor)));
  })();receipts.set(key,{signature,operation});if(receipts.size>512)receipts.delete(receipts.keys().next().value);return operation;
}
export function installPersuasive(Roll,offer){
  if(!Roll||Object.hasOwn(Roll,WRAPPED))return;
  const configure=Roll.buildConfigure,bonus=Roll.prototype.applyBaseBonus;
  Roll.prototype.applyBaseBonus=function(...args){const result=bonus.apply(this,args);if(this.options?.[ID]?.weaponPersuasiveBonus===true&&!result.some(row=>row.label==='Persuasive'))result.push({label:'Persuasive',value:2});return result;};
  Roll.buildConfigure=async function(config={},...args){
    const roll=await configure.call(this,config,...args);
    if(!roll?.options||typeof roll.constructFormula!=='function'||roll._evaluated||config.evaluate===false||config.source?.message||config.roll?.trait!=='presence'||config[ID]?.weaponPersuasiveOffered)return roll;
    const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null),item=persuasiveItem(actor);if(!item||!canPay(actor))return roll;
    config[ID]={...config[ID],weaponPersuasiveOffered:true};
    try{if(await offer({actorUuid:actor.uuid,itemUuid:item.uuid,offerId:foundry.utils.randomID(),deadline:decisionNow()+decisionBudget(120000)})===true){config[ID].weaponPersuasiveBonus=true;roll.options[ID]={...roll.options[ID],weaponPersuasiveBonus:true};roll.constructFormula(config);}}
    catch(error){console.error(`${ID} | Persuasive`,error);ui.notifications.error('Persuasive could not complete. Check Stress; the native roll continues.');}
    return roll;
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function registerWeaponPersuasive(){
  CONFIG.queries[QUERY]=resolvePersuasive;CONFIG.queries[PROMPT]=promptPersuasive;
  const offer=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Persuasive needs an active GM.');return gm.isSelf?resolvePersuasive(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});};
  for(const Roll of [CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll])installPersuasive(Roll,offer);
  Hooks.on('daggerheart.preUseAction',action=>{if(persuasiveWeapon(action.item)&&action.item.system.weaponFeatures.some(f=>f.value==='persuasive'&&f.actionIds?.includes(action.id))){ui.notifications.info('Persuasive prompts before your Presence roll. No separate activation is needed.');return false;}});
}
