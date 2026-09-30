import {ID,featureActive} from '../core.js';
import {DEFT_MANEUVERS_KEY,DEFT_MANEUVERS_EFFECT} from './deft-maneuvers-data.js';

const QUERY=`${ID}.expireDeftManeuvers`,WRAPPED=Symbol.for(QUERY);

export function deftManeuversItem(actor){
  return actor?.type==='character'?actor.items?.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
      (flags?.applied?.key??flags?.premade?.key)===DEFT_MANEUVERS_KEY;
  })??null:null;
}

export function deftManeuversEffects(actor){
  const item=deftManeuversItem(actor);
  if(!item)return [];
  const template=item.effects?.get?.(DEFT_MANEUVERS_EFFECT)??item.effects?.find?.(effect=>(effect.id??effect._id)===DEFT_MANEUVERS_EFFECT);
  const origin=template?.uuid??`${item.uuid}.ActiveEffect.${DEFT_MANEUVERS_EFFECT}`;
  return [...(actor.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.origin===origin);
}

export async function expireDeftManeuvers(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Array.isArray(request.effectIds))return false;
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
  if(message?.system?.action?.type!=='attack'||!Number.isFinite(message.system.roll?.total)||
    !actor?.testUserPermission(user,'OWNER')||actor.uuid!==request.actorUuid)return false;
  const allowed=new Set(request.effectIds),effects=deftManeuversEffects(actor).filter(effect=>allowed.has(effect.id));
  if(!effects.length)return false;
  await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(effect=>effect.id));
  return true;
}

export function installDeftManeuvers(RollField,expire){
  if(RollField[WRAPPED])return;
  const native=RollField.execute;
  RollField.execute=async function(config,...args){
    // Snapshot before rolling so an effect activated during another pending roll is not consumed by it.
    const actor=this.actor,effects=this.type==='attack'?deftManeuversEffects(actor):[];
    const result=await native.call(this,config,...args);
    if(result!==false&&effects.length&&config.message&&Number.isFinite(config.message.system?.roll?.total))
      await expire({actorUuid:actor.uuid,messageUuid:config.message.uuid,effectIds:effects.map(effect=>effect.id)});
    return result;
  };
  Object.defineProperty(RollField,WRAPPED,{value:true});
}

export function registerDeftManeuvers(){
  CONFIG.queries[QUERY]=expireDeftManeuvers;
  installDeftManeuvers(game.system.api.fields.ActionFields.RollField,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Deft Maneuvers expiry needs an active GM.');
    return gm.isSelf?expireDeftManeuvers(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
  });
}
