import {ID,featureActive} from '../core.js';
import {FORTIFIED_ARMOR_KEY} from './fortified-armor-data.js';
const WRAPPED=Symbol.for(`${ID}.fortifiedArmor`);
export function fortifiedArmorSuppressed(effect){
 if(!effect?.flags?.[ID]?.fortifiedArmor)return false;
 const item=effect.item??(effect.parent?.type==='domainCard'?effect.parent:null);
 if(item?.type!=='domainCard'||(item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)!==FORTIFIED_ARMOR_KEY)return false;
 const actor=effect.actor??item.actor;
 if(!actor)return false; // Compendium/world item previews have no wearer.
 const armor=actor.system?.armor;
 return !featureActive(item)||Boolean(item.flags?.[ID]?.disabled)||
   armor?.type!=='armor'||armor.system?.equipped!==true;
}
export function installFortifiedArmor(Effect){
 if(!Effect||Object.hasOwn(Effect,WRAPPED))return;
 let prototype=Effect.prototype,descriptor;
 while(prototype&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(prototype,'isSuppressed');prototype=Object.getPrototypeOf(prototype);}
 if(!descriptor?.get)return;
 const native=descriptor.get;
 Object.defineProperty(Effect.prototype,'isSuppressed',{...descriptor,get(){return native.call(this)||fortifiedArmorSuppressed(this);}});
 Object.defineProperty(Effect,WRAPPED,{value:true});
}
export function registerFortifiedArmor(){installFortifiedArmor(CONFIG.ActiveEffect?.documentClass??game.system?.api?.documents?.DhActiveEffect);}
