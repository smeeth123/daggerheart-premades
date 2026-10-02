import {ID,featureActive} from '../core.js';
import {attackHitTargets} from '../attack-outcome.js';
import {FACE_YOUR_FEAR_KEY} from './face-your-fear-data.js';
import {FUELED_BY_FEAR_KEY} from './fueled-by-fear-data.js';
import {HAVE_NO_FEAR_KEY} from './have-no-fear-data.js';
const WRAPPED=Symbol.for(`${ID}.faceYourFear`);
function keyedItem(actor,key){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===key;})??null:null;}
export const faceYourFearItem=actor=>keyedItem(actor,FACE_YOUR_FEAR_KEY);
export const fueledByFearItem=actor=>keyedItem(actor,FUELED_BY_FEAR_KEY);
export const haveNoFearItem=actor=>keyedItem(actor,HAVE_NO_FEAR_KEY);
export function faceYourFearDice(actor){if(!faceYourFearItem(actor))return 0;if(haveNoFearItem(actor))return 3;if(fueledByFearItem(actor))return 2;return 1;}
export function faceYourFearAttack(message){const data=message?.system,roll=data?.roll;if(data?.action?.type!=='attack'||!Number.isFinite(roll?.total)||roll.isCritical)return false;const serialized=message?.rolls?.find(entry=>entry?.options?.roll)?.options?.roll,duality=roll.result?.duality??serialized?.result?.duality,fear=roll.withFear??(duality===-1||(duality==null&&Number(roll.fear?.value??serialized?.fear?.value)>Number(roll.hope?.value??serialized?.hope?.value)));return Boolean(fear&&attackHitTargets(message).length);}
export function addFaceYourFearBonus(roll,config){const message=game.messages.get(config.source?.message),actionActor=message?.system?.action?.actor,actor=(typeof actionActor==='string'?globalThis.foundry?.utils?.fromUuidSync?.(actionActor):actionActor)??config.data?.parent??globalThis.foundry?.utils?.fromUuidSync?.(config.source?.actor),dice=faceYourFearDice(actor);if(config.hasHealing||!config.damageFormula||!dice||!faceYourFearAttack(message))return null;const formula=`${dice}d10`,effect={name:`Face Your Fear (+${formula})`,description:'Extra damage from succeeding with Fear on the attack roll.',selected:true,changes:[],dice:formula};config.bonusEffects??={};config.bonusEffects[FACE_YOUR_FEAR_KEY]=effect;roll.options.bonusEffects=config.bonusEffects;return effect;}
export function installFaceYourFear(Damage){if(!Damage||Damage[WRAPPED])return;const create=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus;Damage.createRollInstance=function(config){const roll=create.call(this,config);addFaceYourFearBonus(roll,config);return roll;};Damage.prototype.applyBaseBonus=function(part){const result=bonus.call(this,part),effect=this.options.bonusEffects?.[FACE_YOUR_FEAR_KEY];if(part.applyTo==='hitPoints'&&!this.options.hasHealing&&effect?.selected)result.push({label:'Face Your Fear',value:effect.dice});return result;};Object.defineProperty(Damage,WRAPPED,{value:true});}
export function registerFaceYourFear(){installFaceYourFear(CONFIG.Dice.daggerheart.DamageRoll);}
