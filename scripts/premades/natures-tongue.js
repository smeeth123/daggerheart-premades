import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {companionPartner} from '../companion-context.js';
import {NATURES_TONGUE_KEY,NATURES_TONGUE_EFFECT} from './natures-tongue-data.js';
const QUERY=`${ID}.expireNaturesTongue`,WRAPPED=Symbol.for(QUERY);
export function naturesTongueEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&
    (effect.flags?.[ID]?.naturesTongue===true||effect.origin?.endsWith(`.ActiveEffect.${NATURES_TONGUE_EFFECT}`)));
}
async function validEffect(effect){
  if(effect.flags?.[ID]?.naturesTongue===true)return true;
  const template=effect.origin?await fromUuid(effect.origin):null,item=template?.parent,flags=item?.flags?.[ID];
  return Boolean(item?.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===NATURES_TONGUE_KEY);
}
export function completedNaturesTongueRoll(config){
  return Boolean(config&&config.evaluate!==false&&(Number.isFinite(config.roll?.total)||Number.isFinite(config.damage?.main?.total)||
    Object.values(config.damage?.resources??{}).some(roll=>Number.isFinite(roll?.total))));
}
export async function expireNaturesTongue(request,{user}){
  if(!game.user.isActiveGM||!user?.active||request?.completed!==true||!Array.isArray(request.effectIds)||request.effectIds.length>1000)return false;
  const actor=await fromUuid(request.actorUuid),authorized=()=>Boolean(actor&&(user.isGM||actor.testUserPermission(user,'OWNER')||companionPartner(actor)?.testUserPermission(user,'OWNER')));
  if(!authorized())return false;
  return withHopeLock(`natures-tongue:${actor.uuid}`,async()=>{
    const allowed=new Set(request.effectIds),ids=[];
    for(const effect of naturesTongueEffects(actor))if(allowed.has(effect.id)&&await validEffect(effect))ids.push(effect.id);
    const current=new Set(naturesTongueEffects(actor).map(effect=>effect.id)),remaining=ids.filter(id=>current.has(id));
    if(!game.user.isActiveGM||!user.active||!authorized()||!remaining.length)return false;
    await actor.deleteEmbeddedDocuments('ActiveEffect',remaining);return true;
  });
}
export function installNaturesTongue(Roll,expire){
  if(Roll[WRAPPED])return;const native=Roll.build;
  Roll.build=async function(config={},...args){
    const actor=config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null),ids=naturesTongueEffects(actor).map(effect=>effect.id);
    const result=await native.call(this,config,...args);
    if(ids.length&&completedNaturesTongueRoll(result)){
      try{await expire({actorUuid:actor.uuid,effectIds:ids,completed:true});}
      catch(error){console.error(`${ID} | Nature's Tongue expiry failed`,error);ui.notifications.error("Nature's Tongue could not expire its effect; the completed roll was preserved. Remove the effect manually.");}
    }
    return result;
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function registerNaturesTongue(){
  CONFIG.queries[QUERY]=expireNaturesTongue;
  installNaturesTongue(CONFIG.Dice.daggerheart.DHRoll,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error("Nature's Tongue expiry needs an active GM.");
    return gm.isSelf?expireNaturesTongue(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
  });
}
