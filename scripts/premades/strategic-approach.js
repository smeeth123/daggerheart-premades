import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {STRATEGIC_KEY,STRATEGIC_ADV_EFFECT,STRATEGIC_DAMAGE_EFFECT,STRATEGIC_ACTION,STRATEGIC_ADV_ACTION,STRATEGIC_STRESS_ACTION,STRATEGIC_DAMAGE_ACTION} from './strategic-approach-data.js';
import {strategicItem,promptStrategicApproach,resolveStrategicApproach,installStrategicOffer} from './strategic-approach-offer.js';
import {grantConfiguredAdvantage} from '../vulnerable.js';
import {decisionBudget} from '../settings.js';
const QUERY=`${ID}.expireStrategicApproach`,WRAPPED=Symbol.for(QUERY),DAMAGE_WRAPPED=Symbol.for(`${QUERY}Damage`),pending=new WeakSet();
export function strategicEffects(actor,mode){
  if(actor?.type!=='character')return [];
  const item=actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===STRATEGIC_KEY);
  if(!item)return [];
  const ids=mode==='advantage'?[STRATEGIC_ADV_EFFECT]:mode==='damage'?[STRATEGIC_DAMAGE_EFFECT]:[STRATEGIC_ADV_EFFECT,STRATEGIC_DAMAGE_EFFECT];
  const origins=new Set(ids.map(id=>item.effects?.get?.(id)?.uuid??item.effects?.find?.(e=>(e.id??e._id)===id)?.uuid??`${item.uuid}.ActiveEffect.${id}`));
  return [...(actor.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired&&origins.has(effect.origin));
}
function attackConfig(config){return config?.actionType==='action'&&config.roll?.type==='attack'&&config.evaluate!==false&&!config.source?.message;}
function sourceActor(config){const uuid=config.source?.actor??config.source?.actorUUID;return config.data?.parent??(uuid?foundry.utils.fromUuidSync(uuid):null);}
export function strategicAdvantage(config){return attackConfig(config)&&strategicEffects(sourceActor(config),'advantage').length>0;}
export async function expireStrategicApproach(request,{user}){
  if(!game.user.isActiveGM||!user?.active||request?.completed!==true||!Array.isArray(request.effectIds)||request.effectIds.length>1000||!request.effectIds.every(id=>typeof id==='string'))return false;
  const actor=await fromUuid(request.actorUuid),allowed=new Set(request.effectIds),authorized=()=>actor&&(user.isGM||actor.testUserPermission(user,'OWNER'));
  if(!authorized())return false;
  if(request.messageUuid){const message=await fromUuid(request.messageUuid),action=message?.system?.action;
    if(action?.actor?.uuid!==actor.uuid||action.type!=='attack'||action.actionType==='reaction'||!Number.isFinite(message.system.roll?.total))return false;
  }
  return withHopeLock(`strategic:${actor.uuid}`,async()=>{
    if(!game.user.isActiveGM||!user.active||!authorized())return false;
    const ids=strategicEffects(actor).filter(effect=>allowed.has(effect.id)).map(effect=>effect.id);if(!ids.length)return false;
    await actor.deleteEmbeddedDocuments('ActiveEffect',ids);return true;
  });
}
export function installStrategicApproach(Roll,expire){
  if(Object.hasOwn(Roll,WRAPPED))return;const build=Roll.build;
  Roll.build=async function(config={},...args){
    if(pending.has(config))return build.call(this,config,...args);
    const actor=attackConfig(config)?sourceActor(config):null,effects=strategicEffects(actor),damageIds=new Set(strategicEffects(actor,'damage').map(e=>e.id));
    pending.add(config);
    try{
      const result=await build.call(this,config,...args);
      const choice=result?.[ID]?.strategicApproachChoice;
      if((effects.length||choice?.mode==='damage')&&result?.actionType==='action'&&result.evaluate!==false&&Number.isFinite(result.roll?.total)){
        try{
          if(choice?.mode==='damage'||effects.some(e=>damageIds.has(e.id))){
            if(!result.message)throw Error('The attack has no saved chat card for its damage bonus.');
            await result.message.setFlag(ID,'strategicApproachDamage',{actorUuid:actor.uuid,dice:'1d8'});
          }
          if(effects.length)await expire({actorUuid:actor.uuid,effectIds:effects.map(e=>e.id),messageUuid:result.message?.uuid,completed:true});
        }catch(error){console.error(`${ID} | Strategic Approach`,error);ui.notifications.error('Strategic Approach could not save/expire its bonus; the completed attack was preserved. Check its effect and add the d8 manually if missing.');}
      }
      return result;
    }finally{pending.delete(config);}
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function addStrategicDamage(roll,config){
  const message=game.messages?.get(config.source?.message),marker=message?.flags?.[ID]?.strategicApproachDamage,action=message?.system?.action;
  if(config.hasHealing||!config.damageFormula||marker?.dice!=='1d8'||marker.actorUuid!==action?.actor?.uuid||action?.type!=='attack'||action.actionType==='reaction'||!Number.isFinite(message.system.roll?.total)){
    if(config.bonusEffects)delete config.bonusEffects[STRATEGIC_KEY];return null;
  }
  const effect={name:'Strategic Approach (+1d8)',description:'Damage bonus chosen for this attack.',selected:true,changes:[],dice:'1d8'};
  config.bonusEffects??={};config.bonusEffects[STRATEGIC_KEY]=effect;roll.options.bonusEffects=config.bonusEffects;return effect;
}
export function installStrategicDamage(Damage){
  if(Object.hasOwn(Damage,DAMAGE_WRAPPED))return;const create=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus;
  Damage.createRollInstance=function(config,...args){const roll=create.call(this,config,...args);addStrategicDamage(roll,config);return roll;};
  Damage.prototype.applyBaseBonus=function(part,...args){const result=bonus.call(this,part,...args),effect=this.options.bonusEffects?.[STRATEGIC_KEY];
    if(part.applyTo==='hitPoints'&&!this.options.hasHealing&&effect?.selected)result.push({label:'Strategic Approach',value:'1d8'});return result;};
  Object.defineProperty(Damage,DAMAGE_WRAPPED,{value:true});
}
export function registerStrategicApproach(){
  CONFIG.queries[QUERY]=expireStrategicApproach;
  CONFIG.queries[`${ID}.strategicApproach`]=resolveStrategicApproach;
  CONFIG.queries[`${ID}.strategicApproachPrompt`]=promptStrategicApproach;
  const expire=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Strategic Approach expiry needs an active GM.');
    return gm.isSelf?expireStrategicApproach(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});};
  for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installStrategicApproach(Roll,expire);
  const offer=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Strategic Approach needs an active GM.');
    return gm.isSelf?resolveStrategicApproach(request,{user:game.user}):gm.query(`${ID}.strategicApproach`,request,{timeout:decisionBudget(75000)});};
  for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installStrategicOffer(Roll,offer,grantConfiguredAdvantage);
  installStrategicDamage(CONFIG.Dice.daggerheart.DamageRoll);
  Hooks.on('daggerheart.preUseAction',action=>{if(strategicItem(action.actor)?.uuid===action.item?.uuid&&
    [STRATEGIC_ACTION,STRATEGIC_ADV_ACTION,STRATEGIC_STRESS_ACTION,STRATEGIC_DAMAGE_ACTION].includes(action.id)){
    ui.notifications.info('Make an attack against a target within Close. Strategic Approach will offer its benefits before the dice roll.');return false;
  }});
}
