import {ID,clone,featureActive} from '../core.js';
import {hopeCapacity} from './hope-payment.js';
import {WEAPON_VOLLEYED_KEY,VOLLEY_ACTION} from '../weapon-volley-action.js';
const WRAPPED=Symbol.for(`${ID}.weaponVolleyed`);
export function volleyedWeapon(item){return Boolean(item?.type==='weapon'&&featureActive(item)&&item.system?.equipped&&
 !item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_VOLLEYED_KEY&&item.system.weaponFeatures?.some(f=>f.value==='volleyed'));}
export function volleyedAction(action){return Boolean(action?.id===VOLLEY_ACTION&&action.type==='attack'&&action.actor?.type==='character'&&
 volleyedWeapon(action.item)&&action.item.actor?.uuid===action.actor.uuid);}
const matchesSource=(record,source)=>record&&record.source?.actor===source?.actor&&record.source?.item===source?.item&&record.source?.action===source?.action;
export function beginVolley(action,config){
 if(action?.id!==VOLLEY_ACTION||action.item?.type!=='weapon')return;
 if(!volleyedAction(action)||!action.actor.testUserPermission(game.user,'OWNER')||hopeCapacity(action.actor)<1){
  ui.notifications.warn('Volley needs an equipped, enabled Volleyed weapon and 1 Hope.');return false;
 }
 config[ID]={...config[ID],weaponVolleyed:{source:clone(config.source)}};
}
export function validateVolleyCost(action,config){
 if(!volleyedAction(action))return;
 // Native configuration can disable cost rows. The extra Volley cost is
 // mandatory, in addition to any custom costs on the original weapon attack.
 const cost=config.costs?.at(-1);
 if(!cost||cost.key!=='hope'||cost.itemId||cost.enabled===false||Number(cost.total??cost.value)<1||
  !game.system.api.fields.ActionFields.CostField.hasCost.call(action,config.costs)){
  ui.notifications.warn('Volley requires its 1 Hope cost.');return false;
 }
}
export function persistVolley(message,data){
 const record=message.rolls?.[0]?.options?.[ID]?.weaponVolleyed??data.rolls?.[0]?.options?.[ID]?.weaponVolleyed;
 if(matchesSource(record,message.system?.source??data.system?.source))message.updateSource({[`flags.${ID}.weaponVolleyed`]:clone(record)});
}
export function tagVolleyDamage(config){
 if(config.hasHealing||!config.damage?.main)return false;
 const record=config[ID]?.weaponVolleyed??game.messages.get(config.source?.message)?.flags?.[ID]?.weaponVolleyed;
 if(!matchesSource(record,config.source)||record.source.action!==VOLLEY_ACTION)return false;
 const main=config.damage.main;main.options??={};main.options[ID]={...main.options[ID],weaponVolleyed:clone(record)};
 const damage=config.damage;
 if(typeof damage.toObject==='function')config.damage=new damage.constructor({...damage.toObject(),main:main.toJSON(),
  resources:Object.fromEntries(Object.entries(damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
 return true;
}
export function volleyedPacket(packet){
 const main=packet?.main??(Number.isFinite(packet?.total)?packet:null),meta=main?.options?.[ID],record=meta?.weaponVolleyed;
 if(!Number.isFinite(main?.total)||meta?.weaponVolleyedHalved||record?.source?.action!==VOLLEY_ACTION||
  typeof record.source.actor!=='string'||typeof record.source.item!=='string')return packet;
 const adjusted={total:Math.ceil(Math.max(0,main.total)/2),options:{...main.options,[ID]:{...meta,weaponVolleyedHalved:true}}};
 // A plain packet preserves the adjusted total; cloning ChatDamageData here
 // would reconstruct its original full-damage source. Redirects halve once.
 return main===packet?{...adjusted,resources:packet.resources}:{...packet,main:adjusted,resources:packet.resources};
}
export function installVolleyed(Damage,Actor,Duality){
 if(Duality&&!Object.hasOwn(Duality,WRAPPED)){
  const configure=Duality.buildConfigure;
  Duality.buildConfigure=async function(config,...args){
   const roll=await configure.call(this,config,...args);
   if(!roll||roll._evaluated||!matchesSource(config[ID]?.weaponVolleyed,config.source))return roll;
   const actor=config.data?.parent??foundry.utils.fromUuidSync?.(config.source.actor),item=actor?.items?.get(config.source.item),
    action=item?.system.actions?.get?.(config.source.action)??item?.system.actions?.[config.source.action];
   if(!volleyedAction(action)||validateVolleyCost(action,config)===false)return null;
   return roll;
  };
  Object.defineProperty(Duality,WRAPPED,{value:true});
 }
 if(Damage&&!Object.hasOwn(Damage,WRAPPED)){
  const evaluate=Damage.buildEvaluate,post=Damage.buildPost;
  Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagVolleyDamage(config);return result;};
  Damage.buildPost=async function(roll,config,...args){tagVolleyDamage(config);return post.call(this,roll,config,...args);};
  Object.defineProperty(Damage,WRAPPED,{value:true});
 }
 if(Actor&&!Object.hasOwn(Actor,WRAPPED)){
  const take=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=function(packet,...args){return take.call(this,volleyedPacket(packet),...args);};
  Object.defineProperty(Actor,WRAPPED,{value:true});
 }
}
export function registerWeaponVolleyed(){
 installVolleyed(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,CONFIG.Dice.daggerheart.DualityRoll);
 Hooks.on('daggerheart.preUseAction',beginVolley);
 Hooks.on('daggerheart.preRollAction',validateVolleyCost);
 Hooks.on('preCreateChatMessage',persistVolley);
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!message.isContentVisible||!message.flags?.[ID]?.weaponVolleyed||html.querySelector('.dhp-weapon-volleyed'))return;
  const note=html.ownerDocument.createElement('p'),total=message.system?.damage?.main?.total;note.className='dhp-weapon-volleyed';
  note.textContent=`Volley: 1 Hope. Successful targets take half damage${Number.isFinite(total)?` (${Math.ceil(total/2)})`:''}.`;
  html.querySelector('.message-content')?.append(note);
 });
}
