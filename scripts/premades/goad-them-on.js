import {ID} from '../core.js';
import {withHopeLock} from './hope-lock.js';
const QUERY=ID+'.expireGoad',WRAP=Symbol.for(QUERY),captures=new WeakMap(),reservations=new Map();
export function goadedEffects(actor){return [...(actor?.effects??[])].filter(e=>e.flags?.[ID]?.goaded===true&&!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired);}
const attack=c=>(c.actionType==='action'||c.actionType==='reaction')&&c.roll?.type==='attack'&&!c.hasHealing&&c.hasRoll!==false&&c.evaluate!==false&&!c.source?.message;
const sourceActor=c=>c.data?.parent??(c.source?.actor?foundry.utils.fromUuidSync(c.source.actor):null);
export function goadedDisadvantage(config){if(!attack(config))return false;const actor=sourceActor(config);return (captures.get(config)?.effects??goadedEffects(actor).filter(e=>!reservations.has(actor.uuid+':'+e.id))).length>0;}
function completed(message,actor){const d=message?.system;return (d?.source?.actor??d?.action?.actor?.uuid)===actor.uuid&&d?.action?.type==='attack'&&d.hasRoll!==false&&d.roll?._evaluated!==false&&Number.isFinite(d.roll?.total);}
export async function expireGoad(r,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof r?.messageUuid!=='string'||!Array.isArray(r.effectIds)||r.effectIds.length>1000||!r.effectIds.every(id=>typeof id==='string'))return false;
 const actor=await fromUuid(r.actorUuid),message=await fromUuid(r.messageUuid),authorized=()=>actor&&(user.isGM||actor.testUserPermission(user,'OWNER'));
 if(!authorized()||!completed(message,actor))return false;
 return withHopeLock('goad:'+actor.uuid,async()=>{if(!user.active||!authorized()||!completed(message,actor))return false;const ids=goadedEffects(actor).filter(e=>r.effectIds.includes(e.id)).map(e=>e.id);if(!ids.length)return false;await actor.deleteEmbeddedDocuments('ActiveEffect',ids);return true;});
}
export function installGoad(Roll,expire){
 if(!Roll||Object.hasOwn(Roll,WRAP))return;const native=Roll.build;
 Roll.build=async function(config={},...args){
  if(captures.has(config)||!attack(config))return native.call(this,config,...args);
  const actor=sourceActor(config),effects=goadedEffects(actor).filter(e=>!reservations.has(actor.uuid+':'+e.id)),keys=effects.map(e=>actor.uuid+':'+e.id);
  for(const k of keys)reservations.set(k,config);captures.set(config,{actor,effects});
  try{const result=await native.call(this,config,...args);if(effects.length&&result?.evaluate!==false&&Number.isFinite(result?.roll?.total)&&completed(result.message,actor)){
    try{await expire({actorUuid:actor.uuid,messageUuid:result.message.uuid,effectIds:effects.map(e=>e.id)});}catch(error){console.error(ID+' | Goad Them On expiry',error);ui.notifications.error('Goaded could not expire; the completed attack was preserved. Remove its effect manually.');}
   }return result;
  }finally{captures.delete(config);for(const k of keys)if(reservations.get(k)===config)reservations.delete(k);}
 };Object.defineProperty(Roll,WRAP,{value:true});
}
export function registerGoad(){CONFIG.queries[QUERY]=expireGoad;const expire=r=>{const gm=game.users.activeGM;if(!gm)throw Error('Goaded expiry needs an active GM.');return gm.isSelf?expireGoad(r,{user:game.user}):gm.query(QUERY,r,{timeout:15000});};for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installGoad(Roll,expire);}
