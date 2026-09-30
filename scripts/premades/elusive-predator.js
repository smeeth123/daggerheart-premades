import {recordEvasionBonus} from '../evasion-indicators.js';
import {ID,featureActive} from '../core.js';
import {ELUSIVE_KEY} from './elusive-predator-data.js';
import {focusEffects} from './rangers-focus.js';
import {honedAction} from './honed.js';
const WRAPPED=Symbol.for(`${ID}.elusivePredator`);
export function elusiveItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===ELUSIVE_KEY;})??null:null;}
export function elusiveEligible(defender,attacker){return Boolean(elusiveItem(defender)&&attacker&&focusEffects(defender,attacker).length);}
export async function applyElusivePredator(config,eligible=elusiveEligible){
 const attacker=config.data?.parent;
 if(!attacker||config.actionType==='reaction'||honedAction(attacker,config.source)?.type!=='attack')return;
 for(const target of config.targets??[]){
  if(target[ID]?.elusivePredator||target.evasion==null||!Number.isFinite(Number(target.evasion))||(target.difficulty&&Number(target.difficulty)!==Number(target.evasion)))continue;
  const defender=await fromUuid(target.actorId);if(!eligible(defender,attacker))continue;
  target.evasion=Number(target.evasion)+2;if(target.difficulty)target.difficulty=Number(target.difficulty)+2;
  target[ID]={...target[ID],elusivePredator:true};
  recordEvasionBonus(config,target,'Elusive Predator',2,defender.name??target.name);
 }
}
export function installElusivePredator(RollClass,apply=applyElusivePredator){
 if(RollClass[WRAPPED])return;Object.defineProperty(RollClass,WRAPPED,{value:true});
 const configure=RollClass.buildConfigure;
 RollClass.buildConfigure=async function(config,...args){await apply(config);return configure.call(this,config,...args);};
}
export function registerElusivePredator(){installElusivePredator(CONFIG.Dice.daggerheart.D20Roll);}
