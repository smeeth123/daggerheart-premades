import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import { ID } from '../core.js';
import { ADAPT_KEY,ADAPT_ACTION } from './adaptability-data.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { markReactiveStress } from './stress-payment.js';
export function adaptabilityItem(actor){
  const stress=actor?.system?.resources?.stress;
  if(actor?.type!=='character'||!(Number(stress?.value)<Number(stress?.max)))return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===ADAPT_KEY;})??null;
}
export function usedExperiences(roll,actor){
  if(roll.options.roll?.companionRoll)return [];
  const experiences=roll.options.data?.system?.experiences??actor.system?.experiences??{};
  return [...new Set(roll.options.experiences??[])].filter(key=>experiences[key]&&actor.system?.experiences?.[key]);
}
export function adaptabilityOutcome(total,critical,difficulty,targets=[]){
  if(critical)return 'success';
  const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  if(numeric(difficulty))return total>=Number(difficulty)?'success':'failure';
  if(!targets.length)return 'unknown';
  const thresholds=targets.map(target=>target.difficulty??target.evasion);
  if(thresholds.some(value=>numeric(value)&&total>=Number(value)))return 'success';
  return thresholds.every(numeric)?'failure':'unknown';
}
export async function validateAdaptability(request,user){
  if(!user?.active||criticalRerollResult(request)||request.deadline<=decisionNow()||!Number.isFinite(request.total))return null;
  const actor=await fromUuid(request.sourceUuid),item=adaptabilityItem(actor);
  if(!actor?.testUserPermission(user,'OWNER')||!item||item.uuid!==request.candidate?.itemUuid)return null;
  if(!request.experiences?.some(key=>actor.system?.experiences?.[key]))return null;
  const outcome=adaptabilityOutcome(request.total,request.critical,request.difficulty,request.targets);
  if(outcome==='success')return null;
  return {actor,item,outcome};
}
export async function resolveAdaptability(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Adaptability request.');
  const valid=await validateAdaptability(request,user);if(!valid)return false;
  // Selecting "Failed — reroll" is the owner's declaration for unknown difficulty.
  if(!authorize(request.resolutionToken,'adapt',valid.item.uuid,user))return false;
  if(!await markReactiveStress(valid.actor.uuid,actor=>adaptabilityItem(actor)?.uuid===valid.item.uuid))return false;
  return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
}
export async function rerollAdaptability(roll){
  // Generic Roll evaluation avoids re-entering Duality resource/consequence hooks.
  // Parsing the formula again turns HopeDie/FearDie into ordinary Die terms.
  // Keep each concrete constructor so native Duality getters never reset them.
  const terms=roll.terms.map(term=>{
    const data=term.toJSON();
    data.evaluated=false;
    if(Array.isArray(data.results))data.results=[];
    if(data.options)delete data.options.sfx;
    return new term.constructor(data);
  });
  const replacement=foundry.dice.Roll.fromTerms(terms);
  await replacement.evaluate();
  if(!Number.isFinite(replacement.total))throw new Error('Adaptability reroll did not produce a valid total.');
  roll.terms=replacement.terms;roll._total=roll._evaluateTotal();return replacement;
}
export function registerAdaptability(){
  CONFIG.queries[`${ID}.adaptability`]=resolveAdaptability;
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(flags?.disabled||action.id!==ADAPT_ACTION||(flags?.applied?.key??flags?.premade?.key)!==ADAPT_KEY)return;
    ui.notifications.info('Adaptability is offered in roll resolution after using an Experience.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.adaptability)?.options[ID].adaptability;
    if(!used||html.querySelector('.dhp-adapt-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-adapt-note';note.textContent=`Adaptability: ${used.bearerName} rerolled after a failed roll using an Experience.`;
    html.querySelector('.message-content')?.append(note);
  });
}
