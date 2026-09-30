import { ID,featureActive } from '../core.js';
import { POISON_KEY } from './poison-compendium-data.js';
import { markReactiveStress } from './stress-payment.js';
const QUERY=`${ID}.clearMidnight`,pending=new Map();
export function poisonItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===POISON_KEY;})??null;}
export const midnightEffects=actor=>[...(actor?.effects??[])].filter(e=>!e.disabled&&!e.isSuppressed&&e.flags?.[ID]?.midnightVine);
export function midnightDisadvantage(config){
 const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null);
 if(!midnightEffects(actor).length)return false;
 const item=actor?.items?.get?.(config.source?.item),id=config.source?.action;
 const action=[actor?.system?.attack,item?.system?.attack,...(item?.system?.actionsList??[])].find(a=>a&&(a.id??a._id)===id);
 return action?.type==='attack';
}
export async function clearMidnight(request,{user},pay=markReactiveStress){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;
 const operation=(pending.get(actor.uuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const effects=midnightEffects(actor);if(!effects.length)return false;
  if(!await pay(actor.uuid,a=>midnightEffects(a).length>0))return false;
  await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id),{[`${ID}MidnightPaid`]:true});return true;
 });pending.set(actor.uuid,operation);try{return await operation;}finally{if(pending.get(actor.uuid)===operation)pending.delete(actor.uuid);}
}
export function registerPoisonCompendium(){
 CONFIG.queries[QUERY]=clearMidnight;
 Hooks.on('daggerheart.preUseAction',action=>{if(poisonItem(action.actor)?.uuid===action.item?.uuid&&['GUWDhuWJiqwANvR3','tuUUVH5JxDjzF4O9'].includes(action.id)){ui.notifications.info('Choose this poison through Toxic Concoctions after a successful weapon attack.');return false;}});
 installMidnightRemoval(CONFIG.ActiveEffect.documentClass);
}

export function installMidnightRemoval(Effect,pay=markReactiveStress){
 const native=Effect.prototype._preDelete;
 Effect.prototype._preDelete=async function(options,user){
  const result=await native.call(this,options,user);if(result===false)return false;
  if(!user?.isGM||options?.[`${ID}MidnightPaid`]||this.parent?.documentName!=='Actor'||!this.flags?.[ID]?.midnightVine)return result;
  const actor=this.parent;
  if(!await pay(actor.uuid,a=>Boolean(a.effects.get(this.id)?.flags?.[ID]?.midnightVine))){
   ui.notifications.warn('Midnight Vine remains: the actor could not mark 1 Stress.');return false;
  }
  return result;
 };
}
