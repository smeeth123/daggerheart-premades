import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { AGGRESSIVE_KEY,AGGRESSIVE_EFFECT } from './aggressive-data.js';
import { overwhelmHits } from './overwhelm.js';
import { timedDialog } from '../dialog.js';
import { ownerFor } from './aura-rules.js';
const PROMPT=`${ID}.aggressiveDie`;
export function aggressiveActive(actor){const item=actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===AGGRESSIVE_KEY;});const origin=item?.effects.get(AGGRESSIVE_EFFECT)?.uuid;return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));}
export function damageFaces(formula){return [...new Set([...String(formula).matchAll(/\bd(\d+)\b|\d+d(\d+)\b/g)].map(m=>Number(m[1]??m[2])).filter(n=>n>1))].sort((a,b)=>b-a);}
export function lowestDamageResult(dice){return dice.flatMap(die=>die.results.filter(r=>r.active!==false&&!r.discarded).map(result=>({die,result}))).sort((a,b)=>a.result.result-b.result.result)[0];}
export async function promptAggressive(data,{user}){const actor=await fromUuid(data.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!actor.testUserPermission(game.user,'OWNER')||!aggressiveActive(actor))return null;return timedDialog(`Aggressive — ${actor.name}`,'<p>Choose one additional damage die. Discard the lowest result across the damage pool.</p>',data.faces.map(faces=>({action:`d${faces}`,label:`Add d${faces}`,callback:()=>faces})));}
function innerPool(roll){const nested=roll.terms.find(t=>Array.isArray(t.roll?.terms)&&t.roll.dice?.length);return nested?innerPool(nested.roll):roll;}
function refreshTotals(roll){for(const term of roll.terms)if(Array.isArray(term.roll?.terms))refreshTotals(term.roll);roll._total=roll._evaluateTotal();roll.resetFormula();}
export function installAggressive(Damage,choose){
 const configure=Damage.buildConfigure,construct=Damage.prototype.constructFormula,evaluate=Damage.prototype._evaluate;
 Damage.buildConfigure=async function(config,...args){const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor;
  if(!config.hasHealing&&aggressiveActive(actor)&&overwhelmHits(message).length){const faces=damageFaces(config.damageFormula?.formula);if(faces.length){const choice=faces.length===1?faces[0]:await choose(actor,faces);if(!faces.includes(choice))return null;config[ID]={...config[ID],aggressiveFaces:choice};}}
  return configure.call(this,config,...args);
 };
 Damage.prototype.constructFormula=function(formula,config,isDamage){const result=construct.call(this,formula,config,isDamage),faces=config[ID]?.aggressiveFaces;
  if(isDamage&&faces&&result?.roll){const roll=result.roll,pool=innerPool(roll),baseMax=pool.dice.reduce((n,d)=>n+d.number*d.faces,0);pool.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),new foundry.dice.terms.Die({number:1,faces}));pool.resetFormula();roll.resetFormula();roll.options[ID]={...roll.options[ID],aggressive:{faces,baseMax,flatCritical:Boolean(config.isCritical&&config.dialog.configure!==false)}};}
  return result;
 };
 Damage.prototype._evaluate=async function(options){const result=await evaluate.call(this,options),data=this.options?.[ID]?.aggressive;if(!data||data.applied)return result;
  const lowest=lowestDamageResult(this.dice);if(!lowest)return result;lowest.result.active=false;lowest.result.discarded=true;
  if(data.flatCritical){const pool=innerPool(this),maximum=pool.dice.reduce((n,d)=>n+d.faces*d.results.filter(r=>r.active!==false&&!r.discarded).length,0),adjustment=maximum-data.baseMax;if(adjustment)pool.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),new foundry.dice.terms.NumericTerm({number:adjustment}));}
  data.applied=true;refreshTotals(this);return result;
 };
}
export function registerAggressive(){CONFIG.queries[PROMPT]=promptAggressive;installAggressive(CONFIG.Dice.daggerheart.DamageRoll,(actor,faces)=>{const owner=ownerFor(actor,[...game.users],game.users.activeGM??game.user),data={actorUuid:actor.uuid,faces};return owner.isSelf?promptAggressive(data,{user:game.user}):owner.query(PROMPT,data,{timeout:decisionBudget(65000)});});}
