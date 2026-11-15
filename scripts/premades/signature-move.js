import {ID,featureActive} from '../core.js';
import {resolvedAttackOutcome} from '../attack-outcome.js';
import {timedDialog} from '../dialog.js';
import {withHopeLock} from './hope-lock.js';
import {decisionBudget} from '../settings.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
import {DEDICATED_KEY,DEDICATED_ACTION} from './dedicated-data.js';
import {SIGNATURE_KEY,SIGNATURE_ACTION} from './signature-move-data.js';
const signature={key:SIGNATURE_KEY,actionId:SIGNATURE_ACTION,name:'Signature Move',type:'domainCard',flag:'signatureReady',marker:'signatureMove',clearStress:true};
const dedicated={key:DEDICATED_KEY,actionId:DEDICATED_ACTION,name:'Dedicated',type:'feature',flag:'dedicatedReady',marker:'dedicated',clearStress:false};
const actionOf=(item,profile)=>item?.system?.actions?.get?.(profile.actionId)??item?.system?.actions?.[profile.actionId];
function preparedFeatureItem(actor,profile){
 if(actor?.type!=='character')return null;
 return actor.items?.find(item=>{
  const flags=item.flags?.[ID],system=item.system,action=actionOf(item,profile);
  return item.type===profile.type&&featureActive(item)&&!flags?.disabled&&(!system.inVault||system.vaultActive)&&!system.isDomainTouchedSuppressed&&
   (flags?.applied?.key??flags?.premade?.key)===profile.key&&action?.uses?.recovery==='shortRest'&&Number(action.uses.value??0)===0;
 })??null;
}
export const signatureItem=actor=>preparedFeatureItem(actor,signature);
async function readyWrite(item,value,flag){await item.setFlag(ID,flag,value);if(JSON.stringify(item.flags?.[ID]?.[flag])!==JSON.stringify(value))throw Error('Could not save Signature Move preparation.');}
export async function resolveSignature(r,{user},profile=signature){
 if(!game.user.isActiveGM||!user?.active||!['toggle','claim','release','complete'].includes(r?.op)||typeof r.itemUuid!=='string')return false;
 const {flag,marker,actionId,name}=profile;
 const item=await fromUuid(r.itemUuid),actor=item?.actor;if(!actor?.testUserPermission(user,'OWNER'))return false;
 return withHopeLock(marker+':'+item.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER'))return false;
  const ready=item.flags?.[ID]?.[flag];
  if(r.op==='toggle'){if(preparedFeatureItem(actor,profile)?.uuid!==item.uuid||ready?.state==='claimed')return false;const next=ready?null:{generation:foundry.utils.randomID(),state:'ready'};await readyWrite(item,next,flag);return {armed:Boolean(next)};}
  if(typeof r.rollId!=='string'||ready?.generation!==r.generation)return false;
  if(r.op==='claim'){if(preparedFeatureItem(actor,profile)?.uuid!==item.uuid||ready.state!=='ready')return false;await readyWrite(item,{...ready,state:'claimed',rollId:r.rollId},flag);return {itemUuid:item.uuid,generation:ready.generation,rollId:r.rollId};}
  if(ready.state!=='claimed'||ready.rollId!==r.rollId)return false;
  if(r.op==='release'){await readyWrite(item,{generation:ready.generation,state:'ready'},flag);return true;}
  const message=await fromUuid(r.messageUuid),d=message?.system,record=d?.roll?.options?.[ID]?.[marker];
  if(d?.source?.actor!==actor.uuid||d.roll?.options?.actionType!=='action'||d.roll?._evaluated===false||!Number.isFinite(d.roll?.total)||record?.itemUuid!==item.uuid||record?.generation!==ready.generation||record?.rollId!==ready.rollId||preparedFeatureItem(actor,profile)?.uuid!==item.uuid)return false;
  // The native action use resets on either rest and is retained by Medkit.
  try{const updated=await item.update({['system.actions.'+actionId+'.uses.value']:1});if(!updated||Number(actionOf(item,profile)?.uses.value)!==1)throw Error(`Could not confirm ${name}’s rest use.`);await readyWrite(item,null,flag);return true;}finally{if(d.action?.type==='attack')await syncBeastformAttackAction(message,actor);}
 });
}
export function signatureOutcome(config,roll){if(roll?.isCritical||config.roll?.isCritical)return 'success';const targets=config.message?.system?._getCurrentTargets?.()??config.targets;if(targets?.length)return resolvedAttackOutcome({system:{action:{type:'attack'},roll,targets}});const success=config.roll?.success??roll?.success;if(typeof success==='boolean')return success?'success':'failure';const difficulty=Number(config.roll?.difficulty??roll?.difficulty);return Number.isFinite(difficulty)&&difficulty>0?(roll.total>=difficulty?'success':'failure'):'unknown';}
export function resetSignaturePreparation(item,changes,profile=signature){const {actionId,flag}=profile;const a=changes?.system?.actions?.[actionId],value=changes?.['system.actions.'+actionId+'.uses.value']??changes?.system?.['actions.'+actionId+'.uses.value']??a?.['uses.value']??a?.uses?.value;if(value===0&&item.flags?.[ID]?.[flag])changes['flags.'+ID+'.'+flag]=null;}
export function installSignature(Action,Duality,send,profile=signature){
 const {marker,flag,name,actionId}=profile,WRAP=Symbol.for(ID+'.'+marker);
 if(Action&&!Object.hasOwn(Action,WRAP)){const use=Action.prototype.use;Action.prototype.use=async function(...args){if(this.id!==actionId||preparedFeatureItem(this.actor,profile)?.uuid!==this.item?.uuid)return use.apply(this,args);const result=await send({op:'toggle',itemUuid:this.item.uuid});if(!result){ui.notifications.warn(`${name} is unavailable or already resolving.`);return false;}ui.notifications.info(result.armed?`${name} prepared. Your next action roll uses a d20 Hope Die.`:`${name} preparation canceled.`);return false;};Object.defineProperty(Action,WRAP,{value:true});}
 if(!Duality||Object.hasOwn(Duality,WRAP))return;
 const build=Duality.build,create=Duality.createRollInstance,resources=Duality.addDualityResourceUpdates;
 Duality.build=async function(config={},...args){
  if(config.actionType!=='action'||config.evaluate===false||config.source?.message||config.skips?.createMessage||(config[ID]?.signatureMove||config[ID]?.dedicated))return build.call(this,config,...args);
  const actor=config.data?.parent??config.actor??(config.source?.actor?await fromUuid(config.source.actor):null),item=preparedFeatureItem(actor,profile),ready=item?.flags?.[ID]?.[flag];if(ready?.state!=='ready')return build.call(this,config,...args);
  const request={itemUuid:item.uuid,generation:ready.generation,rollId:foundry.utils.randomID()};let claim;try{claim=await send({...request,op:'claim'});}catch(error){ui.notifications.error(`${name} preparation needs manual review: ${error.message}`);return build.call(this,config,...args);}if(!claim)return build.call(this,config,...args);
  config[ID]={...config[ID],[marker]:claim};let result;
  try{return result=await build.call(this,config,...args);}
  finally{const message=result?.message??config.message,completed=Boolean(message?.system?.roll?._evaluated!==false&&Number.isFinite(message?.system?.roll?.total));try{if(!await send({...request,op:completed?'complete':'release',messageUuid:message?.uuid}))throw Error(`${name}’s use could not be confirmed.`);}catch(error){ui.notifications.error(name+': '+error.message+' The native roll was preserved; check preparation and the rest use before continuing.');}delete config[ID][marker];}
 };
 Duality.createRollInstance=function(config){const roll=create.call(this,config),record=config[ID]?.[marker];if(record&&config.actionType==='action'){roll.dHope='d20';roll.resetFormula?.();roll.options[ID]={...roll.options[ID],[marker]:record};}return roll;};
 // Add recovery to the same native resource transaction as critical recovery.
 // A separate HP/Stress write here would race the native consequences.
 if(profile.clearStress)Duality.addDualityResourceUpdates=async function(config){const result=await resources.call(this,config),record=config[ID]?.[marker];if(!record||config.actionType!=='action'||config.skips?.resources)return result;
  const roll=config.messageRoll??config.message?.system?.roll??config.roll?.instance;
  // Native config.roll holds final total/critical/success after shared rerolls.
  const final=roll??{total:config.roll?.total,isCritical:config.roll?.isCritical,options:config.roll?.options};let outcome=signatureOutcome(config,final);
  if(outcome==='unknown'&&Number(config.data?.parent?.system?.resources?.stress?.value)>0){if(game.dice3d&&config.message?.id)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);outcome=await timedDialog('Signature Move','<p>Did your Signature Move succeed?</p>',[{action:'success',label:'Succeeded — Clear 1 Stress',callback:()=>true},{action:'failure',label:'Failed / No Recovery',default:true,callback:()=>false}])?'success':'failure';}
  if(outcome==='success')config.resourceUpdates.addResources([{key:'stress',value:-1,enabled:true}]);return result;
 };
 Object.defineProperty(Duality,WRAP,{value:true});
}
function registerPreparedHopeDie(profile){
 const {marker,name}=profile,query=ID+'.'+marker;
 const resolve=(request,context)=>resolveSignature(request,context,profile);
 CONFIG.queries[query]=resolve;
 const send=request=>{
  const gm=game.users.activeGM;
  if(!gm)throw Error(`${name} needs an active GM.`);
  return gm.isSelf?resolve(request,{user:game.user}):gm.query(query,request,{timeout:decisionBudget(125000)});
 };
 installSignature(game.system.api.data.actions.actionsTypes.base,CONFIG.Dice.daggerheart.DualityRoll,send,profile);
 Hooks.on('preUpdateItem',(item,changes)=>resetSignaturePreparation(item,changes,profile));
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!message.isContentVisible||!message.system?.roll?.options?.[ID]?.[marker]||html.querySelector(`[data-dhp-hope-die="${marker}"]`))return;
  const note=html.ownerDocument.createElement('p');
  note.dataset.dhpHopeDie=marker;
  note.textContent=`${name}: d20 Hope Die.`;
  html.querySelector('.message-content')?.append(note);
 });
}
export const registerSignature=()=>registerPreparedHopeDie(signature);
export const registerDedicated=()=>registerPreparedHopeDie(dedicated);
