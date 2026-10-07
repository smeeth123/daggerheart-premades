import {ID,featureActive} from '../core.js';
import {attackHitTargets} from '../attack-outcome.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {timedDialog} from '../dialog.js';
import {ownerFor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {CORROSIVE_KEY,CORROSIVE_CAST,CORROSIVE_EFFECT} from './corrosive-projectile-data.js';

const QUERY=`${ID}.corrosiveProjectile`,PROMPT=`${QUERY}Prompt`,WRAP=Symbol.for(QUERY),pending=new Set(),targetsLocked=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function corrosiveAction(action){const item=action?.item,flags=item?.flags?.[ID];return action?.id===CORROSIVE_CAST&&action.type==='attack'&&item?.type==='domainCard'&&item.actor?.uuid===action.actor?.uuid&&featureActive(item)&&(!item.system?.inVault||item.system?.vaultActive)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===CORROSIVE_KEY;}
export function corrosiveCosts(actor){const stress=actor?.system?.resources?.stress,available=Math.floor(Number(stress?.max)-Number(stress?.value));if(!Number.isFinite(available)||available<2)return[];return Array.from({length:Math.floor(available/2)},(_,i)=>(i+1)*2);}
export function corrosiveHits(message){const data=message?.system;if(!corrosiveAction(data?.action)||data.actionType==='reaction'||data.roll?.options?.actionType==='reaction'||data.roll?._evaluated===false||!Number.isFinite(data.roll?.total))return[];return attackHitTargets(message);}
export async function promptCorrosiveProjectile(data,{user}){
  const actor=await fromUuid(data.actorUuid);if(!user?.active||!actor?.testUserPermission(user,'OWNER')||!data.targetName)return false;
  const costs=corrosiveCosts(actor);if(!costs.length)return false;
  return timedDialog(`Corrosive Projectile — ${actor.name}`,`<p>Mark Stress to permanently Corrode <strong>${esc(data.targetName)}</strong>. Each 2 Stress reduces their Difficulty by 1; this stacks.</p><div class="form-group"><label>Stress cost</label><select name="corrosiveStress">${costs.map(n=>`<option value="${n}">${n} Stress (−${n/2} Difficulty)</option>`).join('')}</select></div>`,[{action:'corrode',label:'Corrode',callback:(_event,_button,dialog)=>({stress:Number(dialog.element.querySelector('[name="corrosiveStress"]')?.value)})},{action:'decline',label:'Decline',default:true,callback:()=>false}]);
}
async function lockTarget(uuid,fn){const task=(targetsLocked.get(uuid)??Promise.resolve()).catch(()=>{}).then(fn);targetsLocked.set(uuid,task);try{return await task;}finally{if(targetsLocked.get(uuid)===task)targetsLocked.delete(uuid);}}
export async function applyCorrosion(item,target,stacks){
  if(!Number.isInteger(stacks)||stacks<1||target?.type!=='adversary')throw Error('Invalid Corrode target or penalty.');
  const template=item.effects?.get?.(CORROSIVE_EFFECT);if(!template?.uuid)throw Error('Corroded effect is missing; re-Medkit Corrosive Projectile.');
  return lockTarget(target.uuid,async()=>{
    const existing=target.effects?.find(effect=>effect.origin===template.uuid);
    if(existing){const before=Number(existing.system?.stacking?.value);if(!Number.isInteger(before)||before<1)throw Error('Existing Corroded stacks need manual review.');const next=before+stacks;const result=await existing.update({'system.stacking.value':next,'system.changes':template.toObject().system.changes,disabled:false});if(!result||Number(existing.system.stacking.value)!==next)throw Error('Could not update Corroded stacks.');return next;}
    const data=template.toObject();delete data._id;data.origin=template.uuid;data.disabled=false;data.transfer=false;data.system.stacking={max:null,value:stacks};
    const effect=await ActiveEffect.implementation.create(data,{parent:target});if(!effect||Number(effect.system?.stacking?.value)!==stacks)throw Error('Could not create Corroded effect.');return stacks;
  });
}
export async function resolveCorrosiveProjectile(request,{user},ask=promptCorrosiveProjectile){
  if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||pending.has(request.messageUuid))return false;
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
  if(!actor?.testUserPermission(user,'OWNER')||!corrosiveHits(message).length||!corrosiveCosts(actor).length||message.flags?.[ID]?.corrosiveOffered||pending.has(request.messageUuid))return false;
  pending.add(request.messageUuid);try{
    const hits=corrosiveHits(message);if(hits.length!==1)return false;
    const hit=hits[0],target=await fromUuid(hit.actorId);if(target?.type!=='adversary')return false;
    await message.setFlag(ID,'corrosiveOffered',true);
    const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,targetName:target.name};
    const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(!choice||!owner.active||!actor.testUserPermission(owner,'OWNER')||!user.active||decisionNow()>request.deadline||!corrosiveCosts(actor).includes(choice.stress))return false;
    const currentHits=corrosiveHits(message),item=message.system.action.item;
    if(currentHits.length!==1||currentHits[0].id!==hit.id||currentHits[0].actorId!==target.uuid||target.type!=='adversary'||!item.effects?.get?.(CORROSIVE_EFFECT))return false;
    const paid=await markReactiveStress(actor.uuid,current=>{const finalHits=corrosiveHits(message);return user.active&&owner.active&&current.testUserPermission(user,'OWNER')&&current.testUserPermission(owner,'OWNER')&&corrosiveAction(message.system.action)&&finalHits.length===1&&finalHits[0].id===hit.id&&finalHits[0].actorId===target.uuid&&decisionNow()<=request.deadline;},choice.stress);
    if(!paid)return false;
    let stacks;try{stacks=await applyCorrosion(item,target,choice.stress/2);}catch(error){throw Error(`Stress was marked, but Corrode could not be applied. Check the target manually: ${error.message}`);}
    await message.setFlag(ID,'corrosiveApplied',{targetUuid:target.uuid,stress:choice.stress,stacks});
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Corrosive Projectile:</strong> ${esc(actor.name)} marks ${choice.stress} Stress. ${esc(target.name)} is Corroded: −${stacks} Difficulty from this caster.</p>`});return true;
  }finally{pending.delete(request.messageUuid);}
}
export function installCorrosiveProjectile(Action,dispatch){
  if(!Action||Action[WRAP])return;const native=Action.prototype.use;
  Action.prototype.use=async function(...args){const config=await native.apply(this,args);if(config?.message&&corrosiveAction(this)&&corrosiveHits(config.message).length&&corrosiveCosts(this.actor).length&&!config.message.flags?.[ID]?.corrosiveOffered){try{if(game.dice3d&&config.message.id)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);await dispatch({messageUuid:config.message.uuid,deadline:decisionNow()+decisionBudget(120000)});}catch(error){console.error(`${ID} | Corrosive Projectile failed`,error);ui.notifications.error(`Corrosive Projectile: ${error.message}. The completed attack was preserved.`);}}return config;};Object.defineProperty(Action,WRAP,{value:true});
}
export function registerCorrosiveProjectile(){CONFIG.queries[QUERY]=resolveCorrosiveProjectile;CONFIG.queries[PROMPT]=promptCorrosiveProjectile;installCorrosiveProjectile(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Corrosive Projectile needs an active GM.');return gm.isSelf?resolveCorrosiveProjectile(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});}
