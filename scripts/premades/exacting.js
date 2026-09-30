import { ID,featureActive } from '../core.js';
import { EXACTING_KEY,EXACTING_EFFECT } from './exacting-data.js';
export function exactingActive(actor){
 const item=actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===EXACTING_KEY;});
 const origin=item?.effects?.get(EXACTING_EFFECT)?.uuid;
 return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));
}
function refreshTotals(roll){for(const term of roll.terms??[])if(Array.isArray(term.roll?.terms))refreshTotals(term.roll);roll._total=roll._evaluateTotal();}
export function applyExacting(roll){
 if(!roll.options?.[ID]?.exacting)return 0;
 let changed=0;
 for(const die of roll.dice??[]){
  if(!Number.isInteger(die.faces)||die.faces<2)continue;
  for(const result of die.results??[])if(result.active!==false&&!result.discarded&&Number(result.result)===1){result.result=die.faces;changed++;}
 }
 if(changed){roll.options[ID].exactingChanged=(roll.options[ID].exactingChanged??0)+changed;refreshTotals(roll);}
 return changed;
}
export function finalizeExacting(config){
 const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;
 const main=config.damage?.main;
 if(config.hasHealing||!main||!exactingActive(actor))return 0;
 main.options[ID]={...main.options[ID],exacting:true};
 const changed=applyExacting(main);
 if(changed&&typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,roll])=>[key,roll.toJSON()]))});
 return changed;
}
export function installExacting(Damage,BaseRoll){
 const build=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){const result=await build.call(this,roll,config,...args);finalizeExacting(config);return result;};
 const construct=Damage.prototype.constructFormula;
 Damage.prototype.constructFormula=function(formula,config,isDamage){
  const result=construct.call(this,formula,config,isDamage);
  const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;
  if(isDamage&&!config.hasHealing&&result?.roll&&exactingActive(actor))result.roll.options[ID]={...result.roll.options[ID],exacting:true};
  return result;
 };
 // The system sometimes constructs a plain Roll for multiplied damage.
 // Wrap the common evaluator so both that roll and DamageRoll are handled.
 const evaluate=BaseRoll.prototype._evaluate;
 BaseRoll.prototype._evaluate=async function(...args){const result=await evaluate.apply(this,args);applyExacting(this);return result;};
}
export function registerExacting(){installExacting(CONFIG.Dice.daggerheart.DamageRoll,Roll);}
