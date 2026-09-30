import { ID } from '../core.js';
import { STORM_KEY,STORM_ACTION } from './eye-of-the-storm-data.js';
const QUERY=`${ID}.expireStorm`,PREVIOUS=Symbol('stormPrevious');
export function stormItem(item){
  const flags=item?.flags?.[ID];
  return item?.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===STORM_KEY;
}
function actors(){
  const all=new Map([...game.actors].map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)all.set(token.actor.uuid,token.actor);
  return [...all.values()];
}
export function stormApplications(actor,item=null){
  const origins=new Set((item?[item]:[...actor.items].filter(stormItem)).flatMap(feature=>[...feature.effects].map(effect=>effect.uuid)));
  return actors().flatMap(recipient=>[...recipient.effects].filter(effect=>origins.has(effect.origin)));
}
export function severeStormDamage(updates){
  return updates?.some(update=>update.key==='hitPoints'&&!update.itemId&&!update.clear&&update.damageTypes!=null&&Number(update.value)>=3)??false;
}
export async function expireStorm(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid);
  if(!actor?.testUserPermission(user,'OWNER'))return false;
  const allowed=new Set(request.effectUuids??[]);
  for(const effect of stormApplications(actor)){
    if(request.all||allowed.has(effect.uuid))await effect.delete();
  }
  return true;
}
export function registerEyeOfTheStorm(){
  CONFIG.queries[QUERY]=expireStorm;
  const expire=async request=>{
    const gm=game.users.activeGM;if(!gm)throw new Error('Eye of the Storm expiry needs an active GM.');
    return gm.isSelf?expireStorm(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
  };
  const safely=request=>{void expire(request).catch(error=>{console.error(`${ID} | Eye of the Storm expiry`,error);ui.notifications.error('Eye of the Storm could not expire its effect.');});};
  Hooks.on('daggerheart.preUseAction',(action,config)=>{
    if(action.id!==STORM_ACTION||!stormItem(action.item))return;
    config[PREVIOUS]=stormApplications(action.actor,action.item).map(effect=>effect.uuid);
  });
  Hooks.on('daggerheart.postUseAction',(action,config)=>{
    if(action.id!==STORM_ACTION||!stormItem(action.item)||!config[PREVIOUS])return;
    safely({actorUuid:action.actor.uuid,effectUuids:config[PREVIOUS]});
  });
  Hooks.on('daggerheart.postTakeDamage',(actor,updates)=>{
    if(severeStormDamage(updates)&&[...actor.items].some(stormItem))safely({actorUuid:actor.uuid,all:true});
  });
}
