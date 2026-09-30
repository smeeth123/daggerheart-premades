import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { NOT_DONE_KEY } from './not-done-yet-data.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
import { maestroChoices } from './maestro.js';
import { deathSevere } from './death-strike.js';
const QUERY=`${ID}.notDoneYet`,PROMPT=`${ID}.notDoneYetPrompt`,seen=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function notDoneItem(actor){return actor?.type==='character'?actor.items.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===NOT_DONE_KEY;})??null:null;}
export async function promptNotDone(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!notDoneItem(actor))return null;const choices=maestroChoices(actor);if(!choices.length)return null;return timedDialog(`Not Done Yet — ${actor.name}`,'<p>You took Severe damage. Choose a benefit:</p>',[...choices.map(choice=>({action:choice,label:choice==='hope'?'Gain 1 Hope':'Clear 1 Stress',callback:()=>choice})),{action:'decline',label:'Decline',default:true,callback:()=>null}]);}
export async function resolveNotDone(request,{user},ask=promptNotDone){
 if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||!Number.isInteger(request.severity)||request.severity<3||typeof request.id!=='string')return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!notDoneItem(actor)||!maestroChoices(actor).length)return false;
 for(const[id,expiry]of seen)if(expiry<decisionNow())seen.delete(id);if(seen.has(request.id))return false;seen.set(request.id,decisionNow()+decisionBudget(300000));
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid};
 const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!['hope','stress'].includes(choice)||decisionNow()>request.deadline)return false;
 return withHopeLock(actor.uuid,async()=>{if(!notDoneItem(actor)||!maestroChoices(actor).includes(choice))return false;const value=Number(actor.system.resources[choice].value)+(choice==='hope'?1:-1);const updated=await actor.update({[`system.resources.${choice}.value`]:value});if(!updated||Number(actor.system.resources[choice].value)!==value)throw new Error('Not Done Yet could not apply its benefit.');await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Not Done Yet</strong>: ${esc(actor.name)} ${choice==='hope'?'gains 1 Hope':'clears 1 Stress'}.</p>`});return true;});
}
export function installNotDoneDamage(Actor,offer){const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(...args){const result=await native.apply(this,args),severe=deathSevere(result);if(severe&&notDoneItem(this))await offer({actorUuid:this.uuid,severity:severe.value,id:foundry.utils.randomID(),deadline:decisionNow()+decisionBudget(120000)});return result;};}
export function registerNotDone(){CONFIG.queries[QUERY]=resolveNotDone;CONFIG.queries[PROMPT]=promptNotDone;installNotDoneDamage(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Not Done Yet needs an active GM.');return gm.isSelf?resolveNotDone(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});}
