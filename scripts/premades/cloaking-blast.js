import {ID,featureActive} from '../core.js';
import {convertedAttackSuccess,resolvedAttackOutcome} from '../attack-outcome.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {canSpendHope,chooseHopePayment,refundHope,spendHope} from './hope-payment.js';
import {withHopeLock} from './hope-lock.js';
import {CLOAKING_BLAST_KEY,CLOAKING_BLAST_EFFECT} from './cloaking-blast-data.js';

const QUERY=ID+'.cloakingBlast',PROMPT=QUERY+'Prompt',WRAP=Symbol.for(QUERY);
const pending=new Set();
const keyed=item=>(item?.flags?.[ID]?.applied?.key??item?.flags?.[ID]?.premade?.key)===CLOAKING_BLAST_KEY;
export function cloakingBlastItem(actor){
 if(actor?.type!=='character'||unavailableActor(actor))return null;
 return actor.items.find(item=>item.type==='domainCard'&&keyed(item)&&featureActive(item)&&
  !item.flags?.[ID]?.disabled&&(!item.system.inVault||item.system.vaultActive)&&!item.system.isDomainTouchedSuppressed)??null;
}
export function cloakingBlastEffects(actor){
 return [...(actor?.effects??[])].filter(effect=>effect.flags?.[ID]?.cloakingBlast||
  effect.origin?.endsWith('.ActiveEffect.'+CLOAKING_BLAST_EFFECT));
}
function liveCloak(actor){
 return cloakingBlastEffects(actor).some(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired);
}
export function isCloakingBlastCast(action){
 const item=action?.item;
 if(action?.actionType!=='action'||action.roll?.type!=='spellcast'||!item||keyed(item))return false;
 if(item.type==='domainCard')return ['spell','grimoire'].includes(item.system?.type);
 return !['weapon','armor'].includes(item.type);
}
export function successfulCloakingCast(message){
 const data=message?.system,roll=data?.roll,action=data?.action;
 if(!isCloakingBlastCast(action)||data.actionType==='reaction'||roll?.options?.actionType==='reaction'||
  roll?._evaluated===false||!Number.isFinite(roll?.total))return false;
 if(convertedAttackSuccess(roll))return true;
 if(action.type==='attack'){
  const outcome=resolvedAttackOutcome(message);
  if(outcome!=='unknown')return outcome==='success';
 }
 if(typeof roll.success==='boolean')return roll.success;
 const difficulty=Number(roll.options?.roll?.difficulty??roll.difficulty??action.roll.difficulty);
 return Number.isFinite(difficulty)&&difficulty>0&&roll.total>=difficulty;
}
async function promptCloakingBlast({actorUuid},{user}){
 const actor=await fromUuid(actorUuid);
 if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!cloakingBlastItem(actor)||liveCloak(actor)||!canSpendHope(actor))return false;
 return timedDialog('Cloaking Blast','<p>Spend 1 Hope to become Cloaked?</p>',[
  {action:'use',label:'Spend 1 Hope',callback:()=>true},
  {action:'pass',label:'Decline',default:true,callback:()=>false}
 ]);
}
export async function resolveCloakingBlast(request,{user},ask=promptCloakingBlast){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||
  !Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||
  pending.has(request.messageUuid))return false;
 const message=await fromUuid(request.messageUuid),action=message?.system?.action,actor=action?.actor,item=cloakingBlastItem(actor);
 const source=message?.system?.source;
 if(!item||!actor.testUserPermission(user,'OWNER')||source?.actor!==actor.uuid||
  source.item!==action.item.id||source.action!==action.id||message.flags?.[ID]?.cloakingBlastOffered||
  !successfulCloakingCast(message)||liveCloak(actor)||!canSpendHope(actor)||pending.has(request.messageUuid))return false;
 pending.add(request.messageUuid);
 try{
  await message.setFlag(ID,'cloakingBlastOffered',true);
  const owner=ownerFor(actor,[...game.users],game.user);
  const accepted=owner.isSelf?await ask({actorUuid:actor.uuid},{user:game.user}):
   await owner.query(PROMPT,{actorUuid:actor.uuid},{timeout:decisionBudget(65000)});
  if(!accepted)return false;
  const armor=await chooseHopePayment(actor,1,'Cloaking Blast');
  if(armor===null)return false;
  return await withHopeLock(actor.uuid,async()=>{
   if(!game.user.isActiveGM||!user.active||!owner.active||!actor.testUserPermission(user,'OWNER')||
    !actor.testUserPermission(owner,'OWNER')||request.deadline<=decisionNow()||cloakingBlastItem(actor)?.uuid!==item.uuid||
    liveCloak(actor)||!canSpendHope(actor))return false;
   const template=item.effects?.get?.(CLOAKING_BLAST_EFFECT)??item.effects?.find(effect=>(effect.id??effect._id)===CLOAKING_BLAST_EFFECT);
   if(!template)throw Error('Cloaking Blast effect is missing. Reapply Medkit.');
   const data=template.toObject?.()??structuredClone(template);
   delete data._id;
   data.origin=template.uuid??item.uuid+'.ActiveEffect.'+CLOAKING_BLAST_EFFECT;
   const payment=await spendHope(actor,1,{choice:armor,label:'Cloaking Blast'});
   try{
    const created=await actor.createEmbeddedDocuments('ActiveEffect',[data]);
    if(created?.length!==1)throw Error('Could not apply Cloaked.');
   }catch(error){
    await refundHope(actor,payment);
    throw error;
   }
   return true;
  });
 }finally{pending.delete(request.messageUuid);}
}
export function installCloakingBlast(Action,send){
 if(!Action||Object.hasOwn(Action,WRAP))return;
 const use=Action.prototype.use;
 Action.prototype.use=async function(...args){
  // Sneak Attack snapshots concealment before the attack. Remove only copies
  // that were present when this action began, before offering a new cloak.
  const effects=this.type==='attack'?cloakingBlastEffects(this.actor):[];
  const result=await use.apply(this,args);
  if(!result)return result;
  try{
   if(effects.length&&(result.hasRoll===false||Number.isFinite(result.roll?.total??result.message?.system?.roll?.total))){
    const stillPresent=new Set(cloakingBlastEffects(this.actor));
    for(const effect of effects)if(stillPresent.has(effect))await effect.delete();
   }
   if(isCloakingBlastCast(this)&&cloakingBlastItem(this.actor)&&!liveCloak(this.actor)&&
    canSpendHope(this.actor)&&successfulCloakingCast(result.message)){
    if(game.dice3d&&result.message.id)await game.dice3d.waitFor3DAnimationByMessageID(result.message.id);
    await send({messageUuid:result.message.uuid,deadline:decisionNow()+decisionBudget(120000)});
   }
  }catch(error){
   console.error(ID+' | Cloaking Blast',error);
   ui.notifications.error('Cloaking Blast: '+error.message);
  }
  return result;
 };
 Object.defineProperty(Action,WRAP,{value:true});
}
export function registerCloakingBlast(){
 CONFIG.queries[QUERY]=resolveCloakingBlast;
 CONFIG.queries[PROMPT]=promptCloakingBlast;
 installCloakingBlast(game.system.api.data.actions.actionsTypes.base,request=>{
  const gm=game.users.activeGM;
  if(!gm)throw Error('Cloaking Blast needs an active GM.');
  return gm.isSelf?resolveCloakingBlast(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
 });
}
