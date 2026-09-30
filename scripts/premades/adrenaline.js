import {ID,featureActive} from '../core.js';
import {ADRENALINE_KEY,ADRENALINE_EFFECT} from './adrenaline-data.js';
const WRAPPED=Symbol.for(`${ID}.adrenaline`);
export function adrenalineItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===ADRENALINE_KEY;})??null:null;}
export function selectAdrenaline(roll,config){const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent,effect=roll.options.bonusEffects?.[ADRENALINE_EFFECT]??config.bonusEffects?.[ADRENALINE_EFFECT];if(effect)effect.selected=Boolean(!config.hasHealing&&adrenalineItem(actor)&&actor.statuses?.has('vulnerable'));return effect?.selected??false;}
export function installAdrenaline(Damage){if(Damage[WRAPPED])return;const create=Damage.createRollInstance;Damage.createRollInstance=function(config){const roll=create.call(this,config);selectAdrenaline(roll,config);return roll;};Object.defineProperty(Damage,WRAPPED,{value:true});}
export function registerAdrenaline(){installAdrenaline(CONFIG.Dice.daggerheart.DamageRoll);}
