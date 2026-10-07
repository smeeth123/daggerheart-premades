import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {convertedAttackSuccess} from '../attack-outcome.js';
import {unavailableActor} from './aura-rules.js';
import {FLIGHT_KEY,FLIGHT_CAST,FLIGHT_SPEND,FLIGHT_EFFECT} from './flight-data.js';
const QUERY=`${ID}.flight`,ACTION_WRAP=Symbol.for(`${QUERY}Action`),ROLL_WRAP=Symbol.for(`${QUERY}Roll`),activating=new Set(),receipts=new Set();
const operation=()=>foundry.utils.randomID();
export function flightItem(actor,available=false){return actor?.type==='character'?actor.items?.find(item=>{
 const flags=item.flags?.[ID];return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===FLIGHT_KEY&&
  (!available||(!unavailableActor(actor)&&(!item.system?.inVault||item.system.vaultActive)&&!item.system?.isDomainTouchedSuppressed));
})??null:null;}
export function flightTokens(item){const count=Number(item?.system.resource?.value);return Number.isSafeInteger(count)&&count>0?count:0;}
const template=item=>item.effects?.get?.(FLIGHT_EFFECT)??item.effects?.find?.(effect=>(effect.id??effect._id)===FLIGHT_EFFECT);
const origin=item=>template(item)?.uuid??`${item.uuid}.ActiveEffect.${FLIGHT_EFFECT}`;
export function flightEffects(item,activeOnly=true){return [...(item?.actor?.effects??[])].filter(effect=>effect.origin===origin(item)&&(!activeOnly||!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired));}
export function flightState(actor){const item=flightItem(actor),effects=item&&flightEffects(item);return !item||!flightTokens(item)||!effects.length?null:{actorUuid:actor.uuid,itemUuid:item.uuid,generation:item.flags?.[ID]?.flight?.generation??effects.map(effect=>effect.id).sort().join('|'),effectIds:effects.map(effect=>effect.id)};}
export function flightCastSuccess(message){
 const roll=message?.system?.roll,options=roll?.options??message?.rolls?.[0]?.options;
 const difficulty=options?.roll?.difficulty;
 // Native D20Roll.buildEvaluate replaces the Spellcast type with actionType.
 // Activation separately validates the exact actor, card and Cast action source.
 return options?.actionType==='action'&&['spellcast','action'].includes(options.roll?.type)&&Number.isFinite(roll?.total)&&
  (convertedAttackSuccess(roll)||Number.isFinite(difficulty)&&difficulty>0&&roll.total>=difficulty);
}
function effectData(item,generation){const source=template(item),data=source?.toObject?source.toObject():source?structuredClone(source):null;
 if(!data)throw Error('Flight effect is missing. Reapply Medkit.');for(const key of ['_id','id','uuid','_stats'])delete data[key];
 data.disabled=false;data.transfer=false;data.origin=origin(item);data.flags={...data.flags,[ID]:{...data.flags?.[ID],flight:{itemUuid:item.uuid,generation}}};return data;
}
function remember(key){receipts.add(key);if(receipts.size>512)receipts.delete(receipts.values().next().value);}
export async function resolveFlight(request,{user}){
 if(!game.user.isActiveGM||!user?.active||!['activate','spend','zero'].includes(request?.mode)||typeof request.operationId!=='string'||!request.operationId.length||request.operationId.length>128)return false;
 const actor=await fromUuid(request.actorUuid),item=flightItem(actor,request.mode==='activate');
 if(!item||item.uuid!==request.itemUuid||!actor.testUserPermission(user,'OWNER'))return false;
 const receipt=`${item.uuid}:${request.operationId}`;
 return withHopeLock(item.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER')||flightItem(actor,request.mode==='activate')?.uuid!==item.uuid||receipts.has(receipt))return false;
  if(request.mode==='zero'){if(flightTokens(item))return false;const ids=flightEffects(item,false).map(effect=>effect.id);if(!ids.length)return false;await actor.deleteEmbeddedDocuments('ActiveEffect',ids);remember(receipt);return true;}
  const before=flightTokens(item),prior=item.flags?.[ID]?.flight??null;
  if(request.mode==='activate'){
   const message=await fromUuid(request.messageUuid),source=message?.system?.source;
   if(!flightCastSuccess(message)||source?.actor!==actor.uuid||source.item!==item.id||source.action!==FLIGHT_CAST||request.operationId!==message.uuid||prior?.castMessage===message.uuid)return false;
   if(flightItem(actor,true)?.uuid!==item.uuid)return false;
   const agility=Number(actor.getRollData().system?.traits?.agility?.value);if(!Number.isSafeInteger(agility))throw Error('Flight could not read the Agility trait.');
   const count=Math.max(1,agility),old=flightEffects(item,false).map(effect=>effect.id),created=await actor.createEmbeddedDocuments('ActiveEffect',[effectData(item,request.operationId)]);
   if(created?.length!==1)throw Error('Could not apply Flight.');
   try{const updated=await item.update({'system.resource.value':count,[`flags.${ID}.flight`]:{generation:request.operationId,castMessage:message.uuid,spentOperations:[]}});
    if(!updated||flightTokens(item)!==count)throw Error('Could not set Flight tokens.');if(old.length)await actor.deleteEmbeddedDocuments('ActiveEffect',old);
   }catch(error){await actor.deleteEmbeddedDocuments('ActiveEffect',created.map(effect=>effect.id));await item.update({'system.resource.value':before,[`flags.${ID}.flight`]:prior});throw error;}
   remember(receipt);return {tokens:count};
  }
  const state=flightState(actor);
  if(!state||state.generation!==request.generation||!Array.isArray(request.effectIds)||!request.effectIds.some(id=>state.effectIds.includes(id))||prior?.spentOperations?.includes(request.operationId))return false;
  const count=before-1,next={...prior,generation:state.generation,spentOperations:[...(prior?.spentOperations??[]),request.operationId].slice(-512)};
  const updated=await item.update({'system.resource.value':count,[`flags.${ID}.flight`]:next});if(!updated||flightTokens(item)!==count)throw Error('Could not spend a Flight token.');
  try{if(!count)await actor.deleteEmbeddedDocuments('ActiveEffect',flightEffects(item,false).map(effect=>effect.id));}
  catch(error){await item.update({'system.resource.value':before,[`flags.${ID}.flight`]:prior});throw error;}
  remember(receipt);return {tokens:count};
 });
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw Error('Flight needs an active GM.');return gm.isSelf?resolveFlight(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});}
const completedRoll=result=>result?.actionType==='action'&&result.hasRoll===true&&result.evaluate!==false&&Number.isFinite(result.message?.system?.roll?.total??result.roll?.total);
export function installFlight(Action,Actor,send=dispatch){
 if(!Object.hasOwn(Action,ACTION_WRAP)){
  const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
   const item=flightItem(this.actor),ownCard=item?.uuid===this.item?.uuid,id=this.id??this._id;
   if(ownCard&&id===FLIGHT_SPEND){const state=flightState(this.actor);return state?send({...state,mode:'spend',operationId:operation()}):false;}
   const cast=ownCard&&id===FLIGHT_CAST;
   if(cast&&(!flightItem(this.actor,true)||activating.has(item.uuid)))return false;
   const state=this.actionType==='action'&&!['damage','grouped'].includes(this.type)?flightState(this.actor):null;
   const options=args[1]??{},forward=state||cast?[args[0],{...options,[ID]:{...options[ID],flightAction:true}},...args.slice(2)]:args;
   if(cast){if(!game.users.activeGM)throw Error('Flight needs an active GM.');activating.add(item.uuid);}
   try{
    const result=await native.apply(this,forward);
    if(cast&&completedRoll(result)&&flightCastSuccess(result.message)){
     const applied=await send({mode:'activate',actorUuid:this.actor.uuid,itemUuid:item.uuid,messageUuid:result.message.uuid,operationId:result.message.uuid});
     if(!applied)throw Error('Flight cast succeeded but its tokens and Flying effect could not be confirmed. Check the card manually.');
    }else if(state&&completedRoll(result))await send({...state,mode:'spend',operationId:result.message?.uuid??operation()});
    return result;
   }finally{if(cast)activating.delete(item.uuid);}
  };
  Object.defineProperty(Action,ACTION_WRAP,{value:true});
 }
 if(!Object.hasOwn(Actor,ROLL_WRAP)){
  const native=Actor.prototype.diceRoll;
  Actor.prototype.diceRoll=async function(config,...args){
   const state=!config[ID]?.flightAction&&config.actionType==='action'&&!config.source?.message&&config.evaluate!==false&&['trait','spellcast','attack'].includes(config.roll?.type)?flightState(this):null;
   const result=await native.call(this,config,...args);
   if(state&&result?.actionType==='action'&&result.evaluate!==false&&Number.isFinite(result.message?.system?.roll?.total??result.roll?.total))await send({...state,mode:'spend',operationId:result.message?.uuid??operation()});
   return result;
  };
  Object.defineProperty(Actor,ROLL_WRAP,{value:true});
 }
}
export async function clearEmptyFlight(item){if(!game.user.isActiveGM||flightItem(item?.actor)?.uuid!==item?.uuid||flightTokens(item)||!flightEffects(item,false).length)return false;return resolveFlight({mode:'zero',actorUuid:item.actor.uuid,itemUuid:item.uuid,operationId:operation()},{user:game.user});}
export function registerFlight(){CONFIG.queries[QUERY]=resolveFlight;installFlight(game.system.api.data.actions.actionsTypes.base,CONFIG.Actor.documentClass);
 Hooks.on('updateItem',(item,changes)=>{if(!Object.hasOwn(changes,'system.resource.value')&&!Object.hasOwn(changes.system?.resource??{},'value'))return;void clearEmptyFlight(item).catch(error=>{console.error(`${ID} | Flight`,error);ui.notifications.error(error.message);});});
}
