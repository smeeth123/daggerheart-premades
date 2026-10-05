import {ID,featureActive} from '../core.js';
import {ARMOR_QUICK_STRIDING_KEY} from './armor-quick-striding-data.js';
const WRAPPED=Symbol.for(`${ID}.armorQuickStriding`);
export function quickStridingArmor(actor){const item=actor?.system?.armor;return actor?.type==='character'&&item?.type==='armor'&&item.system.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===ARMOR_QUICK_STRIDING_KEY&&item.system.armorFeatures?.some(f=>f.value==='quickStriding')?item:null;}
export function prepareQuickStriding(actor){if(!quickStridingArmor(actor))return;actor.system.rules??={};actor.system.rules.conditionImmunities??={};actor.system.rules.conditionImmunities.restrained=true;}
// Use the native immunity key for sheets and target checks. Guard effect writes
// too: 2.10.8's native _preCreate reads array statuses with Object.keys.
export function withoutRestrained(source){const data=source.toObject?.()??source,statuses=data.statuses;if(!statuses||![...statuses].includes('restrained'))return source;return {...data,statuses:[...statuses].filter(id=>id!=='restrained')};}
export function installQuickStriding(Actor,Effect){
  if(Actor&&!Object.hasOwn(Actor,WRAPPED)){const prepare=Actor.prototype.prepareData;Actor.prototype.prepareData=function(...args){const result=prepare.apply(this,args);prepareQuickStriding(this);return result;};Object.defineProperty(Actor,WRAPPED,{value:true});}
  if(!Effect||Object.hasOwn(Effect,WRAPPED))return;
  const create=Effect.createDocuments,update=Effect.updateDocuments;
  Effect.createDocuments=function(sources=[],operation={},...args){if(quickStridingArmor(operation.parent))sources=sources.map(withoutRestrained);return create.call(this,sources,operation,...args);};
  Effect.updateDocuments=function(updates=[],operation={},...args){if(quickStridingArmor(operation.parent))updates=updates.map(withoutRestrained);return update.call(this,updates,operation,...args);};
  Object.defineProperty(Effect,WRAPPED,{value:true});
}
export function registerArmorQuickStriding(){installQuickStriding(CONFIG.Actor.documentClass,getDocumentClass('ActiveEffect'));const actors=new Set(game.actors??[]);for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.add(token.actor);for(const actor of actors)prepareQuickStriding(actor);}
