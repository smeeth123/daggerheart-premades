import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import { ID } from '../core.js';
import { BOON_KEY,BOON_ACTION } from './patrons-boon-data.js';
import { adaptabilityOutcome,rerollAdaptability } from './adaptability.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { withHopeLock } from './hope-lock.js';
export function boonItem(actor){return actor?.type==='character'&&Number(actor.system.resources?.hope?.value)>=3?actor.items.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===BOON_KEY;})??null:null;}
export async function validateBoon(request,user){
  if(!user?.active||criticalRerollResult(request)||request.deadline<=decisionNow()||!Number.isFinite(request.total))return null;
  const actor=await fromUuid(request.sourceUuid),item=boonItem(actor);
  if(!item||item.uuid!==request.candidate?.itemUuid||!actor.testUserPermission(user,'OWNER'))return null;
  const outcome=adaptabilityOutcome(request.total,request.critical,request.difficulty,request.targets);
  return outcome==='success'?null:{actor,item,outcome};
}
export async function resolveBoon(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  return withHopeLock(request.sourceUuid,async()=>{
    const valid=await validateBoon(request,user);if(!valid||!authorize(request.resolutionToken,'boon',valid.item.uuid,user))return false;
    const next=Number(valid.actor.system.resources.hope.value)-3,updated=await valid.actor.update({'system.resources.hope.value':next});
    if(!updated||Number(valid.actor.system.resources.hope.value)!==next)throw new Error('Could not spend Patron’s Boon Hope.');
    return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
  });
}
export async function rerollBoon(roll,config){
  const previous=Number(roll.options.roll.advantage?.type??roll.options.roll.advantage??0);
  const mode=previous===-1?0:1;
  if(previous===-1)roll.terms.splice(3,2);
  else if(previous!==1){
    const Die=game.system.api.dice.diceTypes.AdvantageDie;
    roll.terms.splice(3,0,new foundry.dice.terms.OperatorTerm({operator:'+'}),new Die({faces:roll.advantageFaces??6,number:roll.advantageNumber??1,modifiers:['a']}));
  }
  const state=typeof roll.options.roll.advantage==='object'?{...roll.options.roll.advantage,type:mode}:mode;
  roll.options.roll.advantage=state;config.roll??={};config.roll.advantage=state;
  return rerollAdaptability(roll);
}
export function registerPatronsBoon(){
  CONFIG.queries[`${ID}.patronsBoon`]=resolveBoon;
  Hooks.on('daggerheart.preUseAction',action=>{
    const f=action.item?.flags?.[ID];if(f?.disabled||action.id!==BOON_ACTION||(f?.applied?.key??f?.premade?.key)!==BOON_KEY)return;
    ui.notifications.info('Patron’s Boon is offered in roll resolution after a failed roll.');return false;
  });
}
