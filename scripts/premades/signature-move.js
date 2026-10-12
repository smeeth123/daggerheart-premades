import {ID,featureActive} from '../core.js';
import {resolvedAttackOutcome} from '../attack-outcome.js';
import {timedDialog} from '../dialog.js';
import {withHopeLock} from './hope-lock.js';
import {decisionBudget} from '../settings.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
import {SIGNATURE_KEY,SIGNATURE_ACTION} from './signature-move-data.js';
const QUERY=ID+'.signatureMove',WRAP=Symbol.for(QUERY),FLAG='signatureReady';
const actionOf=item=>item?.system?.actions?.get?.(SIGNATURE_ACTION)??item?.system?.actions?.[SIGNATURE_ACTION];
export function signatureItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID],s=i.system,a=actionOf(i);return i.type==='domainCard'&&featureActive(i)&&!f?.disabled&&(!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===SIGNATURE_KEY&&a?.uses?.recovery==='shortRest'&&Number(a.uses.value??0)===0;})??null:null;}
async function readyWrite(item,value){await item.setFlag(ID,FLAG,value);if(JSON.stringify(item.flags?.[ID]?.[FLAG])!==JSON.stringify(value))throw Error('Could not save Signature Move preparation.');}
export async function resolveSignature(r,{user}){
 if(!game.user.isActiveGM||!user?.active||!['toggle','claim','release','complete'].includes(r?.op)||typeof r.itemUuid!=='string')return false;
 const item=await fromUuid(r.itemUuid),actor=item?.actor;if(!actor?.testUserPermission(user,'OWNER'))return false;
 return withHopeLock('signature:'+item.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER'))return false;
  const ready=item.flags?.[ID]?.[FLAG];
  if(r.op==='toggle'){if(signatureItem(actor)?.uuid!==item.uuid||ready?.state==='claimed')return false;const next=ready?null:{generation:foundry.utils.randomID(),state:'ready'};await readyWrite(item,next);return {armed:Boolean(next)};}
  if(typeof r.rollId!=='string'||ready?.generation!==r.generation)return false;
  if(r.op==='claim'){if(signatureItem(actor)?.uuid!==item.uuid||ready.state!=='ready')return false;await readyWrite(item,{...ready,state:'claimed',rollId:r.rollId});return {itemUuid:item.uuid,generation:ready.generation,rollId:r.rollId};}
  if(ready.state!=='claimed'||ready.rollId!==r.rollId)return false;
  if(r.op==='release'){await readyWrite(item,{generation:ready.generation,state:'ready'});return true;}
  const message=await fromUuid(r.messageUuid),d=message?.system,record=d?.roll?.options?.[ID]?.signatureMove;
  if(d?.source?.actor!==actor.uuid||d.roll?.options?.actionType!=='action'||d.roll?._evaluated===false||!Number.isFinite(d.roll?.total)||record?.itemUuid!==item.uuid||record?.generation!==ready.generation||record?.rollId!==ready.rollId||signatureItem(actor)?.uuid!==item.uuid)return false;
  // The native action use resets on either rest and is retained by Medkit.
  try{const updated=await item.update({['system.actions.'+SIGNATURE_ACTION+'.uses.value']:1});if(!updated||Number(actionOf(item)?.uses.value)!==1)throw Error('Could not confirm Signature Move’s rest use.');await readyWrite(item,null);return true;}finally{if(d.action?.type==='attack')await syncBeastformAttackAction(message,actor);}
 });
}
export function signatureOutcome(config,roll){if(roll?.isCritical||config.roll?.isCritical)return 'success';const targets=config.message?.system?._getCurrentTargets?.()??config.targets;if(targets?.length)return resolvedAttackOutcome({system:{action:{type:'attack'},roll,targets}});const success=config.roll?.success??roll?.success;if(typeof success==='boolean')return success?'success':'failure';const difficulty=Number(config.roll?.difficulty??roll?.difficulty);return Number.isFinite(difficulty)&&difficulty>0?(roll.total>=difficulty?'success':'failure'):'unknown';}
export function resetSignaturePreparation(item,changes){const a=changes?.system?.actions?.[SIGNATURE_ACTION],value=changes?.['system.actions.'+SIGNATURE_ACTION+'.uses.value']??changes?.system?.['actions.'+SIGNATURE_ACTION+'.uses.value']??a?.['uses.value']??a?.uses?.value;if(value===0&&item.flags?.[ID]?.[FLAG])changes['flags.'+ID+'.'+FLAG]=null;}
export function installSignature(Action,Duality,send){
 if(Action&&!Object.hasOwn(Action,WRAP)){const use=Action.prototype.use;Action.prototype.use=async function(...args){if(this.id!==SIGNATURE_ACTION||signatureItem(this.actor)?.uuid!==this.item?.uuid)return use.apply(this,args);const result=await send({op:'toggle',itemUuid:this.item.uuid});if(!result){ui.notifications.warn('Signature Move is unavailable or already resolving.');return false;}ui.notifications.info(result.armed?'Signature Move prepared: your next action roll uses a d20 Hope Die.':'Signature Move preparation canceled.');return false;};Object.defineProperty(Action,WRAP,{value:true});}
 if(!Duality||Object.hasOwn(Duality,WRAP))return;
 const build=Duality.build,create=Duality.createRollInstance,resources=Duality.addDualityResourceUpdates;
 Duality.build=async function(config={},...args){
  if(config.actionType!=='action'||config.evaluate===false||config.source?.message||config.skips?.createMessage||config[ID]?.signatureMove)return build.call(this,config,...args);
  const actor=config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null),item=signatureItem(actor),ready=item?.flags?.[ID]?.[FLAG];if(ready?.state!=='ready')return build.call(this,config,...args);
  const request={itemUuid:item.uuid,generation:ready.generation,rollId:foundry.utils.randomID()};let claim;try{claim=await send({...request,op:'claim'});}catch(error){ui.notifications.error('Signature Move preparation needs manual review: '+error.message);return build.call(this,config,...args);}if(!claim)return build.call(this,config,...args);
  config[ID]={...config[ID],signatureMove:claim};let result;
  try{return result=await build.call(this,config,...args);}
  finally{const message=result?.message??config.message,completed=Boolean(message?.system?.roll?._evaluated!==false&&Number.isFinite(message?.system?.roll?.total));try{if(!await send({...request,op:completed?'complete':'release',messageUuid:message?.uuid}))throw Error('Signature Move’s use could not be confirmed.');}catch(error){ui.notifications.error('Signature Move: '+error.message+' The native roll was preserved; check preparation and the rest use before continuing.');}delete config[ID].signatureMove;}
 };
 Duality.createRollInstance=function(config){const roll=create.call(this,config),record=config[ID]?.signatureMove;if(record&&config.actionType==='action'){roll.dHope='d20';roll.resetFormula?.();roll.options[ID]={...roll.options[ID],signatureMove:record};}return roll;};
 // Add recovery to the same native resource transaction as critical recovery.
 // A separate HP/Stress write here would race the native consequences.
 Duality.addDualityResourceUpdates=async function(config){const result=await resources.call(this,config),record=config[ID]?.signatureMove;if(!record||config.actionType!=='action'||config.skips?.resources)return result;
  const roll=config.messageRoll??config.message?.system?.roll??config.roll?.instance;
  // Native config.roll holds final total/critical/success after shared rerolls.
  const final=roll??{total:config.roll?.total,isCritical:config.roll?.isCritical,options:config.roll?.options};let outcome=signatureOutcome(config,final);
  if(outcome==='unknown'&&Number(config.data?.parent?.system?.resources?.stress?.value)>0){if(game.dice3d&&config.message?.id)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);outcome=await timedDialog('Signature Move','<p>Did your Signature Move succeed?</p>',[{action:'success',label:'Succeeded — Clear 1 Stress',callback:()=>true},{action:'failure',label:'Failed / No Recovery',default:true,callback:()=>false}])?'success':'failure';}
  if(outcome==='success')config.resourceUpdates.addResources([{key:'stress',value:-1,enabled:true}]);return result;
 };
 Object.defineProperty(Duality,WRAP,{value:true});
}
export function registerSignature(){CONFIG.queries[QUERY]=resolveSignature;const send=r=>{const gm=game.users.activeGM;if(!gm)throw Error('Signature Move needs an active GM.');return gm.isSelf?resolveSignature(r,{user:game.user}):gm.query(QUERY,r,{timeout:decisionBudget(125000)});};installSignature(game.system.api.data.actions.actionsTypes.base,CONFIG.Dice.daggerheart.DualityRoll,send);
 // Include preparation in the native reset itself, even when unused uses are
 // already zero. An updateItem observer alone can miss that no-op rest reset.
 Hooks.on('preUpdateItem',resetSignaturePreparation);
 Hooks.on('renderChatMessageHTML',(message,html)=>{if(!message.isContentVisible||!message.system?.roll?.options?.[ID]?.signatureMove||html.querySelector('.dhp-signature-note'))return;const p=html.ownerDocument.createElement('p');p.className='dhp-signature-note';p.textContent='Signature Move: d20 Hope Die.';html.querySelector('.message-content')?.append(p);});
}
