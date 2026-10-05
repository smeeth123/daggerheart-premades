import {ID} from '../core.js';
import {isWeaponAttack} from './weapon-attack.js';
const WRAP=Symbol.for(`${ID}.bodyBasher`);
export function bodyBasherQualifies(data){return data?.action?.range==='melee'&&isWeaponAttack(data);}
export function filterBodyBasher(effects,data){return (effects??[]).filter(effect=>!effect.flags?.[ID]?.bodyBasher||bodyBasherQualifies(data));}
export function installBodyBasher(Base,Damage){
  if(!Object.hasOwn(Base,WRAP)){const native=Base.getActionRelevantEffects;Base.getActionRelevantEffects=async function(data,...args){
    const effects=await native.call(this,data,...args);
    // Native getRollData exposes only actionType/damage/roll, not range/type.
    // Defer incomplete contexts until Damage creation resolves the real action.
    return data?.action?.type&&data.action.range!==undefined?filterBodyBasher(effects,data):effects;
  };Object.defineProperty(Base,WRAP,{value:true});}
  if(!Object.hasOwn(Damage,WRAP)){const native=Damage.createRollInstance;Damage.createRollInstance=function(config,...args){
    const uuid=config.source?.actor,actor=config.data?.parent??(typeof uuid==='string'?foundry.utils.fromUuidSync(uuid):null),message=config.message??game.messages?.get(config.source?.message);
    const item=actor?.items?.get?.(config.source?.item),actionId=config.source?.action;
    const action=message?.system?.action??(actionId&&item?.system?.attack?.id===actionId?item.system.attack:item?.system?.actions?.get?.(actionId))??(actionId&&actor?.system?.attack?.id===actionId?actor.system.attack:null);
    config.effects=filterBodyBasher(config.effects,{action,item:action?.item??item});return native.call(this,config,...args);
  };Object.defineProperty(Damage,WRAP,{value:true});}
}
export function registerBodyBasher(){installBodyBasher(game.system.api.data.actions.actionsTypes.base,CONFIG.Dice.daggerheart.DamageRoll);}
