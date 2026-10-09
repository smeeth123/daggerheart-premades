import {ID} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
import {BOOST_KEY} from './boost-data.js';
const QUERY=`${ID}.expireBoost`,ATTACK_WRAP=Symbol.for(QUERY),DAMAGE_WRAP=Symbol.for(`${ID}.boostDamage`),captures=new WeakMap(),reservations=new Map();
export function boostEffects(actor){return actor?.type==='character'?[...(actor.effects??[])].filter(e=>e.flags?.[ID]?.boost===true&&!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired):[];}
const attackConfig=c=>c?.actionType==='action'&&c.roll?.type==='attack'&&!c.hasHealing&&c.hasRoll!==false&&c.evaluate!==false&&!c.source?.message;
const sourceActor=c=>c?.data?.parent??(c?.source?.actor?foundry.utils.fromUuidSync(c.source.actor):null);
export function boostAdvantage(config){return attackConfig(config)&&(captures.has(config)?captures.get(config).effects:boostEffects(sourceActor(config))).length>0;}
function completedAttack(message,actorUuid){const d=message?.system;return d?.action?.actor?.uuid===actorUuid&&d.action.type==='attack'&&d.action.actionType!=='reaction'&&d.actionType!=='reaction'&&d.roll?.options?.actionType!=='reaction'&&d.hasRoll!==false&&d.roll?._evaluated!==false&&Number.isFinite(d.roll?.total);}
const sameIds=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every(id=>b.includes(id));
export async function expireBoost(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||!Array.isArray(request.effectIds)||!request.effectIds.length||request.effectIds.length>1000||!request.effectIds.every(id=>typeof id==='string'))return false;
 const actor=await fromUuid(request.actorUuid),message=await fromUuid(request.messageUuid),record=message?.flags?.[ID]?.boost;
 const authorized=()=>actor&&(user.isGM||actor.testUserPermission(user,'OWNER'));
 if(!authorized()||!completedAttack(message,actor.uuid)||record?.actorUuid!==actor.uuid||!sameIds(record.effectIds,request.effectIds))return false;
 return withHopeLock(`boost:${actor.uuid}`,async()=>{
  if(!game.user.isActiveGM||!user.active||!authorized()||!completedAttack(message,actor.uuid)||!sameIds(message.flags?.[ID]?.boost?.effectIds,request.effectIds))return false;
  const ids=boostEffects(actor).filter(e=>request.effectIds.includes(e.id)).map(e=>e.id);if(!ids.length)return false;
  await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
  await syncBeastformAttackAction(message,actor);
  return true;
 });
}
export function installBoostAttack(Roll,expire){
 if(!Roll||Object.hasOwn(Roll,ATTACK_WRAP))return;const build=Roll.build;
 Roll.build=async function(config={},...args){
  if(captures.has(config))return build.call(this,config,...args);
  const actor=attackConfig(config)?sourceActor(config):null,effects=boostEffects(actor).filter(e=>!reservations.has(`${actor.uuid}:${e.id}`));
  const keys=effects.map(e=>`${actor.uuid}:${e.id}`);for(const key of keys)reservations.set(key,config);
  captures.set(config,{actor,effects});
  try{
   const result=await build.call(this,config,...args);
   if(effects.length&&result?.evaluate!==false&&result?.actionType==='action'&&Number.isFinite(result.roll?.total)){
    try{
     const message=result.message;
     await syncBeastformAttackAction(message,actor);
     if(!completedAttack(message,actor.uuid))throw Error('Boost needs a saved completed attack.');
     const effectIds=effects.map(e=>e.id),previous=message.flags?.[ID]?.boost;
     if(previous&&(!sameIds(previous.effectIds,effectIds)||previous.actorUuid!==actor.uuid))throw Error('This attack already has a different Boost source.');
     await message.setFlag(ID,'boost',{actorUuid:actor.uuid,effectIds,dice:'1d10'});
     if(message.flags?.[ID]?.boost?.actorUuid!==actor.uuid||!sameIds(message.flags[ID].boost.effectIds,effectIds))throw Error('Could not save Boost damage.');
     await expire({actorUuid:actor.uuid,effectIds,messageUuid:message.uuid});
    }catch(error){console.error(`${ID} | Boost`,error);ui.notifications.error('Boost could not save or expire its bonus; the completed attack was preserved. Check the Boost effect and add the d10 manually if missing.');}
   }
   return result;
  }finally{captures.delete(config);for(const key of keys)if(reservations.get(key)===config)reservations.delete(key);}
 };
 Object.defineProperty(Roll,ATTACK_WRAP,{value:true});
}
export function addBoostDamage(roll,config){
 const message=game.messages?.get(config.source?.message)??config.message,record=message?.flags?.[ID]?.boost,actor=sourceActor(config);
 if(config.hasHealing||!config.damageFormula||record?.dice!=='1d10'||!Array.isArray(record.effectIds)||!record.effectIds.length||!record.effectIds.every(id=>typeof id==='string')||!completedAttack(message,record.actorUuid)||(actor&&actor.uuid!==record.actorUuid)){
  if(config.bonusEffects)delete config.bonusEffects[BOOST_KEY];roll.options.bonusEffects=config.bonusEffects;return null;
 }
 const effect={name:'Boost (+1d10)',description:'Aerial attack damage bonus.',selected:true,changes:[],dice:'1d10'};
 config.bonusEffects??={};config.bonusEffects[BOOST_KEY]=effect;roll.options.bonusEffects=config.bonusEffects;return effect;
}
export function installBoostDamage(Damage){
 if(!Damage||Object.hasOwn(Damage,DAMAGE_WRAP))return;const create=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus;
 Damage.createRollInstance=function(config,...args){const roll=create.call(this,config,...args);addBoostDamage(roll,config);return roll;};
 Damage.prototype.applyBaseBonus=function(part,...args){const result=bonus.call(this,part,...args),effect=this.options.bonusEffects?.[BOOST_KEY];
  if(part.applyTo==='hitPoints'&&!this.options.hasHealing&&effect?.selected&&!result.some(row=>row.label==='Boost'))result.push({label:'Boost',value:'1d10'});return result;};
 Object.defineProperty(Damage,DAMAGE_WRAP,{value:true});
}
export function registerBoost(){
 CONFIG.queries[QUERY]=expireBoost;
 const expire=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Boost expiry needs an active GM.');return gm.isSelf?expireBoost(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});};
 for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installBoostAttack(Roll,expire);
 installBoostDamage(CONFIG.Dice.daggerheart.DamageRoll);
}
