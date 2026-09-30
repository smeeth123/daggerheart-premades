import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {ID,featureActive} from '../core.js';
import {REVENGE_KEY} from './revenge-data.js';
import {overwhelmHits} from './overwhelm.js';
import {elementalMelee} from './elemental-incarnation.js';
import {ownerFor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {withHopeLock} from './hope-lock.js';
import {timedDialog} from '../dialog.js';
import {prioritizeFaerieWings} from './faerie-wings.js';
const QUERY=`${ID}.revenge`,PROMPT=`${ID}.revengePrompt`,pending=new Set();
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function revengeItem(actor){
 const stress=actor?.system?.resources?.stress;if(!(Number(stress?.max)-Number(stress?.value)>=2))return null;
 return actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===REVENGE_KEY;})??null;
}
export async function validateRevenge(request,user){
 const message=await fromUuid(request.messageUuid),attacker=message?.system?.action?.actor;
 if(!user?.active||attacker?.type!=='adversary'||!attacker.testUserPermission(user,'OWNER'))return null;
 const hit=overwhelmHits(message).find(t=>t.id===request.targetId);if(!hit)return null;
 const actor=await fromUuid(hit.actorId),hp=attacker.system.resources?.hitPoints;
 return revengeItem(actor)&&elementalMelee(actor,attacker)&&!attacker.statuses?.has('dead')&&Number(hp?.value)<Number(hp?.max)?{message,attacker,actor}:null;
}
export async function promptRevenge(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!revengeItem(actor))return false;
 return Boolean(await timedDialog(`Revenge — ${actor.name}`,`<p>${esc(data.attackerName)} hit you within Melee range.</p><p>Mark <strong>2 Stress</strong> to make them mark <strong>1 HP</strong>?</p>`,[{action:'use',label:'Mark 2 Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveRevenge(request,{user},ask=promptRevenge){
 if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
 const key=`${request.messageUuid}:${request.targetId}`;let v=await validateRevenge(request,user);
 if(!v||pending.has(key)||v.message.flags?.[ID]?.revenge?.[request.targetId])return false;
 pending.add(key);try{
  await v.message.update({[`flags.${ID}.revenge.${request.targetId}`]:'offered'});
  const owner=ownerFor(v.actor,[...game.users],game.user),data={actorUuid:v.actor.uuid,attackerName:v.attacker.name};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted||decisionNow()>request.deadline||!(v=await validateRevenge(request,user)))return false;
  if(!await markReactiveStress(v.actor.uuid,a=>revengeItem(a)&&elementalMelee(a,v.attacker),2))return false;
  await withHopeLock(v.attacker.uuid,async()=>{const hp=v.attacker.system.resources.hitPoints,next=Math.min(Number(hp.max),Number(hp.value)+1);const result=await v.attacker.update({'system.resources.hitPoints.value':next});if(!result||Number(v.attacker.system.resources.hitPoints.value)!==next)throw new Error('Could not apply Revenge HP.');});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:v.actor}),content:`<p><strong>Revenge</strong>: ${esc(v.actor.name)} marks 2 Stress; ${esc(v.attacker.name)} marks 1 HP.</p>`});return true;
 }finally{pending.delete(key);}
}
export function installRevenge(Target,offer){const native=Target.execute;Target.execute=async function(config){const result=await native.call(this,config);if(result!==false&&this.type==='attack'&&this.actor?.type==='adversary')for(const hit of overwhelmHits(config.message))await offer({messageUuid:config.message.uuid,targetId:hit.id,deadline:decisionNow()+decisionBudget(120000)});return result;};}
export function registerRevenge(){
 CONFIG.queries[QUERY]=resolveRevenge;CONFIG.queries[PROMPT]=promptRevenge;
 installRevenge(game.system.api.fields.ActionFields.TargetField,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Revenge needs an active GM.');return gm.isSelf?resolveRevenge(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});
 Hooks.on('daggerheart.preUseAction',action=>prioritizeFaerieWings(action));
}
