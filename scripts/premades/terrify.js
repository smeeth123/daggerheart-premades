import {ID,featureActive} from '../core.js';
import {attackTargetOutcome,resolvedAttackTargets} from '../attack-outcome.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import {TERRIFY_KEY,TERRIFY_ACTION} from './terrify-data.js';
const WRAP=Symbol.for(`${ID}.terrify`),ENTRY=Symbol('Terrify effects gate');
export function terrifyAction(action){const item=action?.item,f=item?.flags?.[ID];return action?.id===TERRIFY_ACTION&&action.type==='attack'&&action.actor?.type==='character'&&item?.type==='domainCard'&&featureActive(item)&&!item.system.inVault&&!item.system.isDomainTouchedSuppressed&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===TERRIFY_KEY;}
export function terrifyTargets(config,targets=null){const message=config.message??game.messages?.get(config.parent?._id??config.source?.message),roll=message?.system?.roll??config.roll;
 if(config.actionType==='reaction'||message?.system?.action?.actionType==='reaction'||roll?.options?.actionType==='reaction'||!Number.isFinite(roll?.total)||criticalRerollResult({critical:roll.critical||roll.guaranteedCritical||roll.options?.guaranteedCritical,isCritical:roll.isCritical,hope:roll.dHope?.total,fear:roll.dFear?.total}))return [];
 const fear=typeof roll.withFear==='boolean'?roll.withFear:roll.result?.duality===-1;if(!fear)return [];
 const originals=message?resolvedAttackTargets(message):config.targets??[],successful=originals.filter(t=>attackTargetOutcome(roll,t)==='success');
 return (targets??config.targets??originals).filter(t=>successful.some(original=>original.actorId===t.actorId&&original.id===t.id));
}
export function installTerrify(Action){if(Object.hasOwn(Action,WRAP))return;let prototype=Action.prototype,descriptor;while(prototype&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(prototype,'workflow');prototype=Object.getPrototypeOf(prototype);}if(typeof descriptor?.get!=='function')throw Error('Terrify requires the native Action workflow getter.');
 Object.defineProperty(Action.prototype,'workflow',{...descriptor,get(){const parts=descriptor.get.call(this);if(!terrifyAction(this))return parts;const entry=parts.get('effects');if(!entry||entry[ENTRY])return parts;
  // Native actions cache bound field methods before ready. Guard that existing
  // entry on access so both complete workflows and chat-card buttons use it.
  const action=this,wrapped={...entry,[ENTRY]:true,execute:function(config,targets=null,...args){if(!terrifyAction(action))return entry.execute(config,targets,...args);const eligible=terrifyTargets(config,targets);if(!eligible.length)return;return entry.execute(config,eligible,...args);}};parts.set('effects',wrapped);return parts;
 }});Object.defineProperty(Action,WRAP,{value:true});
}
export function registerTerrify(){installTerrify(game.system.api.data.actions.actionsTypes.base);}
