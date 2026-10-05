import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { attackBeneficiary } from '../companion-context.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {criticalRerollResult} from '../roll-rerolls.js';
import { ID } from '../core.js';
import {resolvedAttackTargets,attackTargetOutcome} from '../attack-outcome.js';
import { FOCUS_KEY,FOCUS_ACTION,FOCUS_EFFECT } from './rangers-focus-data.js';
import { withHopeLock } from './hope-lock.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
const QUERY=`${ID}.rangersFocus`,WRAPPED=Symbol.for(`${ID}.rangersFocus`);
export function focusItem(actor){
  actor=attackBeneficiary(actor);
  return actor?.type==='character'?actor.items.find(item=>{
    const flags=item.flags?.[ID];return !flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===FOCUS_KEY;
  })??null:null;
}
export function primedFocus(actor){actor=attackBeneficiary(actor);return actor?.effects?.find(effect=>!effect.disabled&&effect.flags?.[ID]?.focusPrimed&&effect.origin===focusItem(actor)?.uuid)??null;}
function allActors(){
  const actors=new Map([...game.actors].map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  return [...actors.values()];
}
export function focusEffects(actor,target){
  const origin=focusItem(actor)?.effects.get(FOCUS_EFFECT)?.uuid;
  return origin?(target?[target]:allActors()).flatMap(a=>[...a.effects].filter(e=>!e.disabled&&e.origin===origin)):[];
}
export function focusAttack(actor,source){
  const item=actor?.items.get?.(source?.item);
  return [actor?.system?.attack,item?.system?.attack,...(item?.system?.actionsList??[])].find(action=>action&&(action.id??action._id)===source?.action)?.type==='attack';
}
export async function primeFocus(actor){
  return withHopeLock(actor.uuid,async()=>{try{let hopePayment;
    const item=focusItem(actor);if(!item||primedFocus(actor))return false;
    const hope=hopeCapacity(actor);if(hope<1)return false;
    const created=await actor.createEmbeddedDocuments('ActiveEffect',[{
      name:"Ranger's Focus — Primed",img:item.img,type:'base',transfer:false,disabled:false,origin:item.uuid,
      description:'1 Hope spent. Your next completed single-target attack consumes this priming; on a hit, that target becomes your Focus.',
      showIcon:CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,system:{changes:[],duration:{description:''}},flags:{[ID]:{focusPrimed:true}}
    }]);
    if(!created?.length)throw new Error('Could not prime Ranger’s Focus.');
    try{const update=(hopePayment=await spendHope(actor,1));if(!update)throw new Error('Could not spend Hope.');}
    catch(error){await created[0].delete();throw error;}
    return true;
  }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
}
export async function resolveFocus(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid);if(!focusItem(actor))return false;
  if(request.op==='stress'){
    const target=await fromUuid(request.targetUuid);
    if(!target||!(actor.testUserPermission(user,'OWNER')||target.testUserPermission(user,'OWNER'))||!focusEffects(actor,target).length)return false;
    await target.modifyResource([{key:'stress',value:1}]);return true;
  }
  if(!actor.testUserPermission(user,'OWNER'))return false;
  if(request.op==='prime')return primeFocus(actor);
  if(request.op!=='attack')return false;
  return withHopeLock(actor.uuid,async()=>{
    const prime=primedFocus(actor);if(!prime||prime.id!==request.primeId)return false;
    const message=await fromUuid(request.messageUuid),data=message?.system;
    const targets=resolvedAttackTargets(message);
    if(attackBeneficiary(data?.action?.actor)?.uuid!==actor.uuid||data.action.type!=='attack'||!Number.isFinite(data.roll?.total)||targets.length!==1)return false;
    const hit=targets[0],target=await fromUuid(hit.actorId),outcome=attackTargetOutcome(data.roll,hit);
    if(!target||outcome==='unknown')return false;
    if(outcome==='success'){
      const effect=focusItem(actor).effects.get(FOCUS_EFFECT),previous=focusEffects(actor);
      await game.system.api.fields.ActionFields.EffectsField.applyEffect(effect,target);
      if(!focusEffects(actor,target).length)throw new Error('Could not apply Ranger’s Focus.');
      for(const old of previous)await old.delete();
    }
    await prime.delete();return true;
  });
}
export async function validateFocusReroll(request,user){
  if(!user?.active||request.deadline<=decisionNow()||criticalRerollResult(request)||request.actionType==='reaction'||!Number.isFinite(request.total)||request.targets?.length!==1)return null;
  const sourceActor=await fromUuid(request.sourceUuid),actor=attackBeneficiary(sourceActor),item=focusItem(actor);
  if(!item||item.uuid!==request.candidate?.itemUuid||!actor.testUserPermission(user,'OWNER')||!focusAttack(sourceActor,request.source))return null;
  const targetData=request.targets[0],target=await fromUuid(targetData.actorId),threshold=targetData.difficulty||targetData.evasion;
  if(!target||threshold==null||request.total>=threshold||!focusEffects(actor,target).length)return null;
  return {actor,item,target};
}
export async function resolveFocusReroll(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const valid=await validateFocusReroll(request,user);if(!valid||!authorize(request.resolutionToken,'focus',valid.item.uuid,user))return false;
  for(const effect of focusEffects(valid.actor))await effect.delete();
  return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
}
async function dispatch(request){
  const gm=game.users.activeGM;if(!gm)throw new Error('Ranger’s Focus needs an active GM.');
  return gm.isSelf?resolveFocus(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
}
export function installFocusDamage(Actor){
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(args,...rest){
    const sourceUuid=args?.main?.options?.[ID]?.focusSource;
    const updates=await native.call(this,args,...rest);
    if(sourceUuid&&updates?.some(u=>u.key==='hitPoints'&&!u.clear&&Number(u.value)>0)){
      await dispatch({op:'stress',actorUuid:sourceUuid,targetUuid:this.uuid});
    }
    return updates;
  };
}
export function registerRangersFocus(){
  const Target=game.system.api.fields.ActionFields.TargetField;if(Target[WRAPPED])return;
  Object.defineProperty(Target,WRAPPED,{value:true});
  CONFIG.queries[QUERY]=resolveFocus;CONFIG.queries[`${ID}.focusReroll`]=resolveFocusReroll;
  Hooks.on('daggerheart.preUseAction',(action,config)=>{
    const item=focusItem(action.actor);if(!item)return;
    if(action.item?.uuid===item.uuid&&action.id===FOCUS_ACTION){
      void dispatch({op:'prime',actorUuid:action.actor.uuid}).then(result=>{
        if(!result)ui.notifications.info(primedFocus(action.actor)?'Ranger’s Focus is already primed.':'Ranger’s Focus requires 1 Hope.');
      }).catch(error=>ui.notifications.error(error.message));return false;
    }
    if(action.type==='attack'){
      prioritizeFaerieWings(action,true);
      const prime=primedFocus(action.actor);
      if(prime){
        if(config.targets?.length!==1){ui.notifications.warn('Select one target for your primed Ranger’s Focus attack.');return false;}
        config[ID]={...config[ID],focusPrime:prime.id};
      }
    }
  });
  const native=Target.execute;
  Target.execute=async function(config){
    const result=await native.call(this,config);
    if(config[ID]?.focusPrime&&config.message)await dispatch({op:'attack',actorUuid:attackBeneficiary(this.actor).uuid,primeId:config[ID].focusPrime,messageUuid:config.message.uuid});
    return result;
  };
  const Damage=CONFIG.Dice.daggerheart.DamageRoll,evaluate=Damage.buildEvaluate;
  Damage.buildEvaluate=async function(roll,config,...args){
    const result=await evaluate.call(this,roll,config,...args);
    const actor=config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null);
    if(focusItem(actor)&&config.damage?.main&&!config.hasHealing)config.damage.main.options[ID]={...config.damage.main.options[ID],focusSource:attackBeneficiary(actor).uuid};
    return result;
  };
  installFocusDamage(CONFIG.Actor.documentClass);
}
