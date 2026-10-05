import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {RECKLESS_KEY,RECKLESS_EFFECT} from './reckless-data.js';

const QUERY=`${ID}.expireReckless`,WRAPPED=Symbol.for(QUERY),captures=new WeakMap();
export function recklessEffects(actor){
  if(actor?.type!=='character')return [];
  const item=actor.items?.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===RECKLESS_KEY;
  });
  if(!item)return [];
  const template=item.effects?.get?.(RECKLESS_EFFECT)??item.effects?.find?.(effect=>(effect.id??effect._id)===RECKLESS_EFFECT);
  const origin=template?.uuid??`${item.uuid}.ActiveEffect.${RECKLESS_EFFECT}`;
  return [...(actor.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired&&effect.origin===origin);
}
export function recklessAdvantage(config){
  if(config.actionType!=='action'||config.roll?.type!=='attack'||config.evaluate===false||config.source?.message)return false;
  const uuid=config.source?.actor??config.source?.actorUUID;
  const actor=config.data?.parent??(uuid?foundry.utils.fromUuidSync(uuid):null),effects=recklessEffects(actor);
  if(!effects.length)return false;
  // Capture exactly the copies contributing to the roll, not a later recast.
  captures.set(config,{actor,ids:effects.map(effect=>effect.id)});
  return true;
}
export async function expireReckless(request,{user}){
  if(!game.user.isActiveGM||!user?.active||request?.completed!==true||!Array.isArray(request.effectIds)||request.effectIds.length>1000||!request.effectIds.every(id=>typeof id==='string'))return false;
  const actor=await fromUuid(request.actorUuid),authorized=()=>actor&&(user.isGM||actor.testUserPermission(user,'OWNER'));
  if(!authorized())return false;
  if(request.messageUuid){
    const message=await fromUuid(request.messageUuid);
    if(message?.system?.action?.actor?.uuid!==actor.uuid||message.system.action.type!=='attack'||message.system.action.actionType==='reaction'||!Number.isFinite(message.system.roll?.total))return false;
  }
  return withHopeLock(`reckless:${actor.uuid}`,async()=>{
    if(!game.user.isActiveGM||!user.active||!authorized())return false;
    const allowed=new Set(request.effectIds),ids=recklessEffects(actor).filter(effect=>allowed.has(effect.id)).map(effect=>effect.id);
    if(!ids.length)return false;
    await actor.deleteEmbeddedDocuments('ActiveEffect',ids);return true;
  });
}
export function installReckless(Roll,expire){
  if(Object.hasOwn(Roll,WRAPPED))return;
  const native=Roll.build;
  Roll.build=async function(config={},...args){
    captures.delete(config);
    try{
      const result=await native.call(this,config,...args),used=captures.get(config);
      if(used&&result?.actionType==='action'&&result.evaluate!==false&&Number.isFinite(result.roll?.total)){
        try{await expire({actorUuid:used.actor.uuid,effectIds:used.ids,messageUuid:result.message?.uuid,completed:true});}
        catch(error){console.error(`${ID} | Reckless expiry failed`,error);ui.notifications.error('Reckless could not expire its effect; the completed attack was preserved. Remove the effect manually.');}
      }
      return result;
    }finally{captures.delete(config);}
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function registerReckless(){
  CONFIG.queries[QUERY]=expireReckless;
  const expire=request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Reckless expiry needs an active GM.');
    return gm.isSelf?expireReckless(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
  };
  // Forceful Push already owns Duality.build and captured the old base method.
  // Wrap the concrete attack classes, not the now-bypassed DHRoll.build.
  for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installReckless(Roll,expire);
}
