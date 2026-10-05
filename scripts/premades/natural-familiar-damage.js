import {ID} from '../core.js';
import {rainOfBladesBonus,rainOfBladesPacket} from './rain-of-blades.js';
import {FAMILIAR_KEY} from './natural-familiar-data.js';
const WRAP=Symbol.for(`${ID}.naturalFamiliarDamage`),options={flavor:'Natural Familiar',formulaKey:'naturalFamiliarFormula',recordKey:'naturalFamiliar',appliedKey:'naturalFamiliarApplied'};
const state=document=>document?.flags?.[ID]?.naturalFamiliar;
export const familiarBonus=main=>rainOfBladesBonus(main,options);
export const familiarPacket=(packet,actor)=>rainOfBladesPacket(packet,actor,options);
function melee(){
  if(canvas.scene.rangeSettings)return Number(canvas.scene.rangeSettings.melee);
  const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
  return Number(world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.melee:world.melee);
}
export function familiarDamageTargets(config){
  if(config.hasHealing||config.messageType==='healing'||config.damageFormula?.applyTo!=='hitPoints'||!globalThis.canvas?.ready)return [];
  const uuid=config.source?.actor,actor=config.data?.parent??(typeof uuid==='string'?foundry.utils.fromUuidSync(uuid):null);
  if(actor?.type!=='character')return [];
  const active=new Set([...(actor.effects??[])].filter(e=>!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired&&state(e)?.casterUuid===actor.uuid).map(e=>state(e).generation));
  const origins=canvas.tokens.placeables.filter(t=>state(t.document)?.casterUuid===actor.uuid&&active.has(state(t.document).generation)&&state(t.document).actorUuid===t.actor?.uuid);
  if(!origins.length)return [];
  const message=config.message??game.messages?.get(config.source?.message),targets=(message?.system?.targeting?.usingSelect?message.system._getCurrentTargets?.():null)??config.targets??message?.system?.targets??[];
  const limit=melee(),seen=new Set(),eligible=[];if(!Number.isFinite(limit)||limit<0)return [];
  for(const target of targets){
    const token=canvas.tokens.get(target.id),enemy=token?.actor;
    if(enemy?.type!=='adversary'||enemy.uuid!==target.actorId||seen.has(enemy.uuid))continue;
    if(!origins.some(origin=>{const distance=origin.distanceTo(token);return Number.isFinite(distance)&&distance>=0&&distance<=limit;}))continue;
    seen.add(enemy.uuid);eligible.push({actorId:enemy.uuid,name:target.name??enemy.name});
  }
  return eligible;
}
export function prepareFamiliarDamage(roll,config){
  const targets=familiarDamageTargets(config);
  if(!targets.length){if(config.bonusEffects)delete config.bonusEffects[FAMILIAR_KEY];return false;}
  config[ID]={...config[ID],naturalFamiliar:{targets}};
  config.bonusEffects??={};config.bonusEffects[FAMILIAR_KEY]={name:'Natural Familiar (+1d6)',description:'Extra damage against adversaries within Melee of your familiar.',selected:true,changes:[]};
  roll.options.bonusEffects=config.bonusEffects;return true;
}
export function tagFamiliarDamage(config,nativeScaling=false){
  const main=config.damage?.main,record=config[ID]?.naturalFamiliar??main?.options?.[ID]?.naturalFamiliar;
  if(config.hasHealing||!main||!record)return false;
  main.options??={};main.options[ID]={...main.options[ID],naturalFamiliar:{targets:record.targets,bonus:familiarBonus(main),referenceTotal:main.total,nativeScaling}};
  const damage=config.damage;
  if(typeof damage.toObject==='function')config.damage=new damage.constructor({...damage.toObject(),main:main.toJSON(),resources:Object.fromEntries(Object.entries(damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
  return true;
}
export function installFamiliarDamage(Damage,Field,Actor){
  if(!Object.hasOwn(Damage,WRAP)){
    const create=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus,construct=Damage.prototype.constructFormula,evaluate=Damage.buildEvaluate,post=Damage.buildPost;
    Damage.createRollInstance=function(config,...args){const roll=create.call(this,config,...args);prepareFamiliarDamage(roll,config);return roll;};
    Damage.prototype.applyBaseBonus=function(part,...args){const result=bonus.call(this,part,...args);
      if(part?.applyTo==='hitPoints'&&!this.options.hasHealing&&this.options.bonusEffects?.[FAMILIAR_KEY]?.selected)result.push({label:'Natural Familiar',value:'1d6[Natural Familiar]'});return result;};
    Damage.prototype.constructFormula=function(part,config,isDamage,...args){const result=construct.call(this,part,config,isDamage,...args);
      if(isDamage&&result?.roll&&config[ID]?.naturalFamiliar){const roll=result.roll;roll.options??={};roll.options[ID]={...roll.options[ID],naturalFamiliarFormula:{criticalFlat:Boolean(config.isCritical&&config.dialog?.configure!==false),multiplier:this.getTotalBonus('system.rules.attack.damage.hpDamageMultiplier')||1}};}return result;};
    Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagFamiliarDamage(config);return result;};
    Damage.buildPost=async function(roll,config,...args){tagFamiliarDamage(config);return post.call(this,roll,config,...args);};
    Object.defineProperty(Damage,WRAP,{value:true});
  }
  if(!Object.hasOwn(Field,WRAP)){const native=Field.applyDamage;Field.applyDamage=async function(config,...args){tagFamiliarDamage(config,true);return native.call(this,config,...args);};Object.defineProperty(Field,WRAP,{value:true});}
  if(!Object.hasOwn(Actor,WRAP)){const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(packet,...args){return native.call(this,familiarPacket(packet,this),...args);};Object.defineProperty(Actor,WRAP,{value:true});}
}
export function familiarDamageLines(message){
  if(!message.isContentVisible)return null;
  const main=message.system?.damage?.main,record=main?.options?.[ID]?.naturalFamiliar,bonus=typeof main?.toJSON==='function'?familiarBonus(main):record?.bonus;
  return record&&bonus?`Natural Familiar: targets within Melee of the familiar gain +1d6 (${bonus}); other targets take ${Math.max(0,main.total-bonus)} damage before defenses.`:null;
}
