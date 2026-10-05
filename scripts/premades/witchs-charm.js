import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { CHARM_KEY,CHARM_ACTION } from './witchs-charm-data.js';
import { adaptabilityOutcome } from './adaptability.js';
import { prayerRange } from './prayer-dice.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { withHopeLock } from './hope-lock.js';
export function charmItem(actor){return actor?.type==='character'&&hopeCapacity(actor)>=3?actor.items.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===CHARM_KEY;})??null:null;}
export function charmCandidates(source){
  const actors=new Map([[source.uuid,source]]);for(const token of globalThis.canvas?.tokens?.placeables??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  return [...actors.values()].flatMap(actor=>{const item=charmItem(actor);return item&&prayerRange(actor,source)?[{itemUuid:item.uuid}]:[];});
}
export async function validateCharm(request,user){
  if(!user?.active||request.actionType!=='action'||request.deadline<=decisionNow()||!Number.isFinite(request.total)||request.charmed)return null;
  const source=await fromUuid(request.sourceUuid),item=await fromUuid(request.candidate?.itemUuid),actor=item?.actor;
  if(!source?.testUserPermission(user,'OWNER')||charmItem(actor)?.uuid!==item?.uuid||!item||!prayerRange(actor,source))return null;
  const outcome=adaptabilityOutcome(request.total,request.critical,request.difficulty,request.targets);
  return outcome==='success'?null:{actor,item,outcome};
}
export async function resolveCharm(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  return withHopeLock(request.candidate?.itemUuid,async()=>{
    const valid=await validateCharm(request,user);if(!valid||!authorize(request.resolutionToken,'charm',valid.item.uuid,user))return false;
    return withHopeLock(valid.actor.uuid,async()=>{try{let hopePayment;
      const fresh=await validateCharm(request,user);if(!fresh)return false;
      const next=hopeCapacity(fresh.actor)-3,updated=(hopePayment=await spendHope(fresh.actor,3));
      if(!updated||!hopePayment)throw new Error('Could not spend Witch’s Charm Hope.');
      return {itemUuid:fresh.item.uuid,bearerName:fresh.actor.name};
    }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
  });
}
export const charmed=roll=>Boolean(roll?.options?.[ID]?.witchsCharm||roll?.options?.[ID]?.trueStrike);
export function installCharmRoll(Duality){
  for(const [key,value]of [['withHope',false],['withFear',true]]){
    const descriptor=Object.getOwnPropertyDescriptor(Duality.prototype,key);
    Object.defineProperty(Duality.prototype,key,{...descriptor,get(){return this.options?.[ID]?.witchsCharm&&!(this.options[ID].hallowedAura||this.options[ID].fearless||this.options[ID].unbound)?value:descriptor.get.call(this);}});
  }
  const evaluate=Duality.buildEvaluate;
  Duality.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);if(charmed(roll)){config.roll.success=true;config.successConsumed=true;for(const target of config.targets??[])target.hit=true;}return result;};
}
export function registerWitchsCharm(){
  CONFIG.queries[`${ID}.witchsCharm`]=resolveCharm;
  installCharmRoll(CONFIG.Dice.daggerheart.DualityRoll);
  // Install before other target wrappers so they observe the converted hit.
  const Target=game.system.api.fields.ActionFields.TargetField,execute=Target.execute;
  Target.execute=async function(config,...args){const result=await execute.call(this,config,...args);if(config[ID]?.witchsCharm||config[ID]?.trueStrike)for(const target of config.targets??[])target.hitResult={success:true};return result;};
  const patched=new Set();
  for(const Model of Object.values(CONFIG.ChatMessage.dataModels)){
    let proto=Model.prototype;while(proto&&!Object.hasOwn(proto,'_getCurrentTargets'))proto=Object.getPrototypeOf(proto);
    if(!proto||patched.has(proto))continue;patched.add(proto);const original=proto._getCurrentTargets;
    proto._getCurrentTargets=function(...args){const targets=original.apply(this,args);if(charmed(this.roll)&&!this.targeting.usingSelect)for(const target of targets)target.hitResult={success:true};return targets;};
  }
  Hooks.on('daggerheart.preUseAction',action=>{const f=action.item?.flags?.[ID];if(!f?.disabled&&action.id===CHARM_ACTION&&(f?.applied?.key??f?.premade?.key)===CHARM_KEY){ui.notifications.info('Witch’s Charm is offered in roll resolution after a failed action roll.');return false;}});
  Hooks.on('renderChatMessageHTML',(message,html)=>{const used=message.rolls?.find(charmed)?.options[ID].witchsCharm;if(!message.isContentVisible||!used||html.querySelector('.dhp-charm-note'))return;const note=html.ownerDocument.createElement('p');note.className='dhp-charm-note';note.textContent=`Witch’s Charm: ${used.bearerName} changed the roll to a success with ${message.rolls.find(charmed).withHope?'Hope':'Fear'}.`;html.querySelector('.message-content')?.append(note);});
}
