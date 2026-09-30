import {ID,featureActive} from '../core.js';
import {companionPartner} from '../companion-context.js';
import {withHopeLock} from './hope-lock.js';
import {BOOK_OF_ILLIAT_KEY,SLUMBER_EFFECT} from './book-of-illiat-data.js';

const QUERY=`${ID}.expireSlumber`,WRAPPED=Symbol.for(QUERY);

export function slumberEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&
    (effect.flags?.[ID]?.slumber===true||effect.origin?.endsWith(`.ActiveEffect.${SLUMBER_EFFECT}`)));
}
export async function validSlumberEffect(effect){
  // A placed marker remains independently expirable if its caster later vaults or removes the book.
  if(effect.flags?.[ID]?.slumber===true)return true;
  const template=effect.origin?await fromUuid(effect.origin):null,item=template?.parent,flags=item?.flags?.[ID];
  return Boolean(item?.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (flags?.applied?.key??flags?.premade?.key)===BOOK_OF_ILLIAT_KEY);
}
export function slumberTookDamage(actor,updates){
  return Array.isArray(updates)&&updates.some(update=>!update.clear&&!update.itemId&&Number.isFinite(Number(update.value))&&Number(update.value)>0&&
    (update.key==='hitPoints'||actor?.type==='companion'&&update.key==='stress'));
}

export async function expireSlumber(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Array.isArray(request.effectIds)||request.effectIds.length>1000)return false;
  const actor=await fromUuid(request.actorUuid),source=request.sourceUuid?await fromUuid(request.sourceUuid):null;
  const authorized=()=>Boolean(actor&&(user.isGM||actor.testUserPermission(user,'OWNER')||
    source?.testUserPermission(user,'OWNER')||companionPartner(actor)?.testUserPermission(user,'OWNER')));
  if(!slumberTookDamage(actor,request.updates)||!authorized())return false;
  return withHopeLock(`slumber:${actor.uuid}`,async()=>{
    if(!user.active)return false;
    const allowed=new Set(request.effectIds),ids=[];
    for(const effect of slumberEffects(actor))if(allowed.has(effect.id)&&await validSlumberEffect(effect))ids.push(effect.id);
    // Recheck after source lookups so replaced/deleted markers cannot cause a stale deletion.
    const current=new Set(slumberEffects(actor).map(effect=>effect.id)),remaining=ids.filter(id=>current.has(id));
    if(!remaining.length||!user.active||!authorized())return false;
    await actor.deleteEmbeddedDocuments('ActiveEffect',remaining);
    return true;
  });
}

export function installBookOfIlliat(Actor,expire){
  if(Actor[WRAPPED])return;
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(packet,...args){
    const ids=slumberEffects(this).map(effect=>effect.id),result=await native.call(this,packet,...args);
    if(ids.length&&slumberTookDamage(this,result)){
      // Reuse the shared damage provenance already attached to native damage rolls by Elemental Incarnation.
      const raw=packet?.main??packet?.damage??packet;
      await expire({actorUuid:this.uuid,effectIds:ids,updates:result,sourceUuid:raw?.options?.[ID]?.elementalSource});
    }
    return result;
  };
  Object.defineProperty(Actor,WRAPPED,{value:true});
}

export function registerBookOfIlliat(){
  CONFIG.queries[QUERY]=expireSlumber;
  installBookOfIlliat(CONFIG.Actor.documentClass,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Slumber expiry needs an active GM.');
    return gm.isSelf?expireSlumber(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
  });
}
