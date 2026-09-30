import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { EYE_KEY,EYE_ACTION } from './eye-for-eye-data.js';
import { sourceToken } from './hallowed-aura.js';
import { meleeLimit } from './kick.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { markReactiveStress } from './stress-payment.js';
import { withHopeLock } from './hope-lock.js';
const QUERY=`${ID}.eyeForEye`,PROMPT=`${ID}.eyeForEyePrompt`,seen=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function eyeItem(actor){const stress=actor?.system?.resources?.stress;if(actor?.type!=='character'||!(Number(stress?.value)<Number(stress?.max)))return null;return actor.items.find(item=>{const f=item.flags?.[ID],action=item.system.actions?.get?.(EYE_ACTION)??item.system.actions?.[EYE_ACTION];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===EYE_KEY&&action?.uses?.recovery==='shortRest'&&Number(action.uses.value??0)===0;})??null;}
export function eyeMelee(actor,attacker){const a=sourceToken(actor),b=sourceToken(attacker);if(!a||!b)return false;const d=a.distanceTo(b),limit=meleeLimit(canvas.scene);return Number.isFinite(d)&&Number.isFinite(limit)&&d<=limit;}
export function eyeHP(updates,remaining){return Math.min(Math.max(0,remaining),Math.max(0,(updates??[]).filter(u=>u.key==='hitPoints'&&!u.itemId&&!u.clear).reduce((n,u)=>n+Number(u.value||0),0)));}
export async function promptEye(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!eyeItem(actor))return false;return Boolean(await timedDialog(`Eye for an Eye — ${actor.name}`,`<p>${esc(data.attackerName)} caused you to mark <strong>${data.hp} HP</strong>. Mark <strong>1 Stress</strong> and spend your once-per-rest use to make them mark <strong>${data.hp} HP</strong>?</p>`,[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
export async function resolveEye(request,{user},ask=promptEye,pay=markReactiveStress,inRange=eyeMelee){
 if(!game.user.isActiveGM||!user?.active||!Number.isInteger(request.hp)||request.hp<1||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||typeof request.id!=='string')return false;
 const actor=await fromUuid(request.actorUuid),attacker=await fromUuid(request.attackerUuid);
 if(!actor||attacker?.type!=='adversary'||(!actor.testUserPermission(user,'OWNER')&&!attacker.testUserPermission(user,'OWNER'))||!eyeItem(actor)||!inRange(actor,attacker))return false;
 for(const[id,expiry]of seen)if(expiry<decisionNow())seen.delete(id);if(seen.has(request.id))return false;seen.set(request.id,decisionNow()+decisionBudget(300000));
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,attackerName:attacker.name,hp:request.hp};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!accepted||decisionNow()>request.deadline)return false;
 return withHopeLock(actor.uuid,async()=>{
  const item=eyeItem(actor);if(!item||!inRange(actor,attacker))return false;
  // Reserve the limited use before paying Stress, restoring it if payment fails.
  const path=`system.actions.${EYE_ACTION}.uses.value`;
  const reserved=await item.update({[path]:1});if(!reserved)throw new Error('Eye for an Eye could not spend its use.');
  let paid=false;try{paid=await pay(actor.uuid,a=>featureActive(item)&&!item.flags?.[ID]?.disabled&&inRange(a,attacker));}finally{if(!paid)await item.update({[path]:0});}
  if(!paid)return false;
  await attacker.modifyResource([{key:'hitPoints',value:request.hp}]);
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Eye for an Eye</strong>: ${esc(actor.name)} marks 1 Stress; ${esc(attacker.name)} marks ${request.hp} HP.</p>`});return true;
 });
}
export function installEyeDamage(Actor,offer){const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(args,...rest){const attackerUuid=args?.main?.options?.[ID]?.eyeAttacker??args?.resources?.hitPoints?.options?.[ID]?.eyeAttacker,remaining=Number(this.system.resources?.hitPoints?.max)-Number(this.system.resources?.hitPoints?.value);const result=await native.call(this,args,...rest),hp=eyeHP(result,remaining);if(attackerUuid&&hp>0&&eyeItem(this))await offer({actorUuid:this.uuid,attackerUuid,hp,id:foundry.utils.randomID(),deadline:decisionNow()+decisionBudget(120000)});return result;};}
export function registerEyeForEye(){
 CONFIG.queries[QUERY]=resolveEye;CONFIG.queries[PROMPT]=promptEye;
 installEyeDamage(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Eye for an Eye needs an active GM.');return gm.isSelf?resolveEye(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,native=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){const result=await native.call(this,roll,config,...args);const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;if(actor?.type==='adversary'&&!config.hasHealing&&config.damage){for(const r of [config.damage.main,config.damage.resources?.hitPoints].filter(Boolean))r.options[ID]={...r.options[ID],eyeAttacker:actor.uuid};if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main?.toJSON()??null,resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});}return result;};
 Hooks.on('daggerheart.preUseAction',action=>{const f=action.item?.flags?.[ID];if(!f?.disabled&&(f?.applied?.key??f?.premade?.key)===EYE_KEY&&action.id===EYE_ACTION){ui.notifications.info('Eye for an Eye is offered after a Melee adversary makes you mark HP.');return false;}});
}
