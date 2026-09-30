import {ID,featureActive} from '../core.js';
import {honedAction} from './honed.js';
import {VEXING_MALISON_KEY} from './vexing-malison-data.js';
export const HEX_EFFECT_ID='Pl35ZLKEWDU5nlUj';
export function vexingMalisonItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===VEXING_MALISON_KEY;})??null:null;}
export function isHexed(actor){return [...(actor?.effects??[])].some(effect=>!effect.disabled&&!effect.isSuppressed&&String(effect.origin??'').split('.').at(-1)===HEX_EFFECT_ID);}
function targetActor(target){const token=target?.document??target,sceneToken=target?.id?canvas.tokens?.get(target.id):null;return target?.actor??token?.actor??(sceneToken?.actor?.uuid===target?.actorId?sceneToken.actor:null)??(target?.actorId?foundry.utils.fromUuidSync(target.actorId):null);}
export function vexingAdvantage(config){const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null);if(config.actionType==='reaction'||!vexingMalisonItem(actor)||honedAction(actor,config.source)?.type!=='attack')return false;const targets=Array.isArray(config.targets)?config.targets:[...(game.user.targets??[])];return targets.some(target=>isHexed(targetActor(target)));}
