import {ID,featureActive} from '../core.js';
import {SACRED_KEY} from './sacred-resonance-data.js';
import {spiritAttack,spiritItem} from './spirit-weapon.js';
import {honedAction} from './honed.js';
const WRAPPED=Symbol.for(`${ID}.sacredResonance`);
export function sacredItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===SACRED_KEY;})??null:null;}
export function sacredAttack(actor,source){const action=honedAction(actor,source);return Boolean(sacredItem(actor)&&spiritItem(actor)&&spiritAttack(action));}
export function matchingDamageBonus(roll){
 if(roll?.options?.[ID]?.sacredResonance)return 0;
 const results=[];for(const die of roll?.dice??[])for(const result of die.results??[])if(result.active!==false&&!result.discarded&&Number.isFinite(Number(result.result)))results.push(Number(result.result));
 const counts=new Map();for(const value of results)counts.set(value,(counts.get(value)??0)+1);
 const matching=results.filter(value=>counts.get(value)>1),bonus=matching.reduce((sum,value)=>sum+value,0);if(!bonus)return 0;
 roll.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),new foundry.dice.terms.NumericTerm({number:bonus}));
 roll._total=roll._evaluateTotal();roll.resetFormula?.();roll.options[ID]={...roll.options[ID],sacredResonance:{bonus,matching}};return bonus;
}
export function installSacredResonance(Damage){if(Damage[WRAPPED])return;const evaluate=Damage.buildEvaluate;Damage.buildEvaluate=async function(roll,config,...args){const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent,eligible=!config.hasHealing&&sacredAttack(actor,config.source);const result=await evaluate.call(this,roll,config,...args);if(eligible&&config.damage?.main&&matchingDamageBonus(config.damage.main)&&typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});return result;};Object.defineProperty(Damage,WRAPPED,{value:true});}
export function registerSacredResonance(){installSacredResonance(CONFIG.Dice.daggerheart.DamageRoll);Hooks.on('renderChatMessageHTML',(message,html)=>{const resonance=message.system?.damage?.main?.options?.[ID]?.sacredResonance;if(!message.isContentVisible||!resonance||html.querySelector('.dhp-sacred-resonance'))return;const note=html.ownerDocument.createElement('p');note.className='dhp-sacred-resonance';note.textContent=`Sacred Resonance: matching dice doubled (+${resonance.bonus}).`;html.querySelector('.message-content')?.append(note);});}
