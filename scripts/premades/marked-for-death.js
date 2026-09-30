import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { isWeaponAttack } from './weapon-attack.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
import { ID } from '../core.js';
import { MARK_KEY,MARK_EFFECT,MARK_BONUS } from './marked-for-death-data.js';
import { ownerFor } from './aura-rules.js';
import { markReactiveStress } from './stress-payment.js';
import { timedDialog } from '../dialog.js';
const QUERY=`${ID}.markDeath`,PROMPT=`${ID}.markDeathPrompt`,WRAPPED=Symbol.for(`${ID}.markedDeath`),pending=new Map();
export function markItem(actor){
  return actor?.items?.find(item=>{const flags=item.flags?.[ID];return !flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===MARK_KEY;})??null;
}
const hasStress=actor=>Number(actor.system.resources?.stress?.value)<Number(actor.system.resources?.stress?.max);
export function ownMark(actor,target){
  const item=markItem(actor),origin=item?.effects.get(MARK_EFFECT)?.uuid;
  return Boolean(origin&&target?.effects.some(effect=>!effect.disabled&&effect.origin===origin));
}
function allActors(){
  const actors=new Map([...game.actors].map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  return [...actors.values()];
}
export function markHit(message){
  const data=message?.system;
  if(data?.action?.type!=='attack'||!isWeaponAttack(data)||!Number.isFinite(data.roll?.total))return null;
  const hits=(data.targets??[]).filter(target=>{const threshold=target.difficulty||target.evasion;return threshold!=null&&(data.roll.options?.[ID]?.trueStrike||data.roll.options?.[ID]?.witchsCharm||data.roll.isCritical||data.roll.total>=threshold);});
  return hits.length===1?hits[0]:null;
}
async function validate(request,user){
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor,hit=markHit(message);
  if(!user?.active||!actor?.testUserPermission(user,'OWNER')||!markItem(actor)||!hit||hit.id!==request.targetId)return null;
  const target=await fromUuid(hit.actorId);
  if(target?.type!=='adversary')return null;
  return {actor,target,item:markItem(actor)};
}
export async function promptMark(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!markItem(actor)||!hasStress(actor))return false;
  const name=String(data.targetName).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return Boolean(await timedDialog(`Marked for Death — ${actor.name}`,`<p>Mark <strong>1 Stress</strong> to make <strong>${name}</strong> Marked for Death? This replaces your previous mark.</p>`,[
    {action:'use',label:'Mark 1 Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}
  ]));
}
export async function resolveMark(request,{user}){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  let valid=await validate(request,user);if(!valid)return false;
  const key=valid.actor.uuid;if(pending.has(key))return false;
  const operation=(async()=>{
    if(ownMark(valid.actor,valid.target)||!hasStress(valid.actor))return false;
    const owner=ownerFor(valid.actor,[...game.users],game.user),data={actorUuid:valid.actor.uuid,targetName:valid.target.name};
    const accepted=owner.isSelf?await promptMark(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(!accepted||request.deadline<decisionNow())return false;
    valid=await validate(request,user);if(!valid||ownMark(valid.actor,valid.target))return false;
    if(!await markReactiveStress(valid.actor.uuid,actor=>Boolean(markItem(actor))))return false;
    const effect=valid.item.effects.get(MARK_EFFECT);
    const old=allActors().flatMap(actor=>[...actor.effects].filter(e=>e.origin===effect.uuid));
    await game.system.api.fields.ActionFields.EffectsField.applyEffect(effect,valid.target);
    if(!ownMark(valid.actor,valid.target))throw new Error('Marked for Death effect could not be applied.');
    for(const existing of old)await existing.delete();
    return true;
  })();pending.set(key,operation);try{return await operation;}finally{pending.delete(key);}
}
export function installMarkTarget(TargetField){
  const native=TargetField.execute;
  TargetField.execute=async function(config){
    const result=await native.call(this,config);
    const hit=markHit(config.message);
    if(!hit||!markItem(this.actor)||!hasStress(this.actor))return result;
    const target=await fromUuid(hit.actorId);if(target?.type!=='adversary'||ownMark(this.actor,target))return result;
    const gm=game.users.activeGM;if(!gm)throw new Error('Marked for Death needs an active GM.');
    const request={messageUuid:config.message.uuid,targetId:hit.id,deadline:decisionNow()+decisionBudget(120000)};
    if(gm.isSelf)await resolveMark(request,{user:game.user});else await gm.query(QUERY,request,{timeout:decisionBudget(125000)});
    return result;
  };
}
export function selectMarkBonus(roll,config){
  const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor??config.data?.parent,item=markItem(actor);
  if(!item||config.hasHealing)return;
  const targets=(message?.system?.targets??config.targets??[]).filter(target=>{
    const attack=message?.system?.roll,threshold=target.difficulty||target.evasion;
    return !attack||(threshold!=null&&(attack.options?.[ID]?.trueStrike||attack.options?.[ID]?.witchsCharm||attack.isCritical||attack.total>=threshold));
  });
  const selected=targets.length===1&&ownMark(actor,foundry.utils.fromUuidSync(targets[0].actorId));
  const effect=roll.options.bonusEffects?.[MARK_BONUS]??config.bonusEffects?.[MARK_BONUS];
  if(effect)effect.selected=Boolean(selected);
}
export function registerMarkedForDeath(){
  const TargetField=game.system.api.fields.ActionFields.TargetField;if(TargetField[WRAPPED])return;
  Object.defineProperty(TargetField,WRAPPED,{value:true});
  CONFIG.queries[QUERY]=resolveMark;CONFIG.queries[PROMPT]=promptMark;
  installMarkTarget(TargetField);
  Hooks.on('daggerheart.preUseAction',action=>{if(markItem(action.actor))prioritizeFaerieWings(action,true);});
  const DamageRoll=CONFIG.Dice.daggerheart.DamageRoll,create=DamageRoll.createRollInstance;
  DamageRoll.createRollInstance=function(config){const roll=create.call(this,config);selectMarkBonus(roll,config);return roll;};
}
