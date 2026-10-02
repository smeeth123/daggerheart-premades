import {ID,featureActive} from '../core.js';
import {attackHitTargets} from '../attack-outcome.js';
import {APEX_KEY} from './apex-predator-data.js';
import {focusEffects} from './rangers-focus.js';
import {honedAction} from './honed.js';
import {ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
const QUERY=`${ID}.apexPredator`,PROMPT=`${ID}.apexPredatorPrompt`,WRAPPED=Symbol.for(`${ID}.apexPredator`),decisions=new Map();
let fearQueue=Promise.resolve();
const fear=()=>Number(ui.resources?.currentFear??game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.Resources.Fear));
export function apexItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===APEX_KEY;})??null:null;}
const canPay=actor=>Boolean(apexItem(actor)&&Number(actor.system.resources?.hope?.value)>=1);
export function apexTargets(actor,targets){return [...new Set((targets??[]).filter(t=>focusEffects(actor,t).length).map(t=>t.uuid))];}
export function apexHit(message,actorUuid,targetUuids){
 const data=message?.system,roll=data?.roll;if(data?.action?.type!=='attack'||data.action.actor?.uuid!==actorUuid||!Number.isFinite(roll?.total))return false;
 return attackHitTargets(message).some(t=>targetUuids.includes(t.actorId));
}
export async function promptApex(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!canPay(actor)||fear()<=0)return false;return Boolean(await timedDialog(`Apex Predator — ${actor.name}`,'<p>Spend <strong>1 Hope</strong> on this attack against your Focus? If it succeeds, remove <strong>1 Fear</strong> from the GM pool.</p>',[{action:'use',label:'Spend Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
export async function resolveApex(request,{user},ask=promptApex){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string')return false;
 for(const [id,d]of decisions)if(d.expires<decisionNow())decisions.delete(id);
 if(request.op==='offer'){
  if(decisions.has(request.id)||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!canPay(actor)||fear()<=0||honedAction(actor,request.source)?.type!=='attack')return false;
  const targets=(await Promise.all(request.targetUuids.map(fromUuid))).filter(Boolean),eligible=apexTargets(actor,targets);if(!eligible.length)return false;
  const owner=ownerFor(actor,[...game.users],game.user),accepted=owner.isSelf?await ask({actorUuid:actor.uuid},{user:game.user}):await owner.query(PROMPT,{actorUuid:actor.uuid},{timeout:decisionBudget(65000)});
  if(!accepted)return false;decisions.set(request.id,{actorUuid:actor.uuid,targetUuids:eligible,userId:user.id,expires:decisionNow()+decisionBudget(300000),paid:false,settled:false});return {id:request.id};
 }
 const decision=decisions.get(request.id);if(!decision||decision.userId!==user.id)return false;
 const actor=await fromUuid(decision.actorUuid);
 if(request.op==='pay'){
  if(decision.paid||fear()<=0)return false;
  const paid=await withHopeLock(actor.uuid,async()=>{if(!canPay(actor)||fear()<=0)return false;const next=Number(actor.system.resources.hope.value)-1,updated=await actor.update({'system.resources.hope.value':next});if(!updated||Number(actor.system.resources.hope.value)!==next)throw new Error('Could not spend Apex Predator Hope.');return true;});
  decision.paid=Boolean(paid);return decision.paid;
 }
 if(request.op!=='settle'||!decision.paid||decision.settled)return false;decision.settled=true;
 const message=await fromUuid(request.messageUuid);if(!apexHit(message,actor.uuid,decision.targetUuids))return false;
 const remove=async()=>{const current=fear();if(current<=0)return false;await ui.resources.updateFear(current-1);return true;};
 const result=fearQueue.then(remove,remove);fearQueue=result.catch(()=>{});if(!await result)return false;
 await message.setFlag(ID,'apexPredator',{actorUuid:actor.uuid,bearerName:actor.name});return true;
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw new Error('Apex Predator needs an active GM.');return gm.isSelf?resolveApex(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});}
export async function offerApex(config){
 const actor=config.data?.parent;if(config.actionType==='reaction'||honedAction(actor,config.source)?.type!=='attack'||!canPay(actor)||fear()<=0)return false;
 const targets=(await Promise.all((config.targets??[]).map(t=>fromUuid(t.actorId)))).filter(Boolean);if(!apexTargets(actor,targets).length)return false;
 return dispatch({op:'offer',id:foundry.utils.randomID(),actorUuid:actor.uuid,targetUuids:targets.map(t=>t.uuid),source:config.source,deadline:decisionNow()+decisionBudget(120000)});
}
export function installApexPredator(RollClass,offer=offerApex,pay=d=>dispatch({op:'pay',...d}),settle=(d,c)=>dispatch({op:'settle',...d,messageUuid:c.message?.uuid})){
 if(RollClass[WRAPPED])return;Object.defineProperty(RollClass,WRAPPED,{value:true});const configure=RollClass.buildConfigure,evaluate=RollClass.buildEvaluate,post=RollClass.buildPost;
 RollClass.buildConfigure=async function(config,...args){const decision=await offer(config);if(decision)config[ID]={...config[ID],apexPredator:decision};return configure.call(this,config,...args);};
 RollClass.buildEvaluate=async function(roll,config,...args){const d=config[ID]?.apexPredator;if(d&&!d.paid){d.paid=Boolean(await pay(d));if(!d.paid)delete config[ID].apexPredator;}return evaluate.call(this,roll,config,...args);};
 RollClass.buildPost=async function(roll,config,...args){const result=await post.call(this,roll,config,...args),d=config[ID]?.apexPredator;if(d?.paid&&!d.settled){d.settled=true;await settle(d,config);}return result;};
}
export function registerApexPredator(){CONFIG.queries[QUERY]=resolveApex;CONFIG.queries[PROMPT]=promptApex;installApexPredator(CONFIG.Dice.daggerheart.DualityRoll);Hooks.on('renderChatMessageHTML',(message,html)=>{const used=message.flags?.[ID]?.apexPredator;if(!message.isContentVisible||!used||html.querySelector('.dhp-apex-predator'))return;const p=html.ownerDocument.createElement('p');p.className='dhp-apex-predator';p.textContent=`Apex Predator: ${used.bearerName} spent 1 Hope and removed 1 Fear.`;html.querySelector('.message-content')?.append(p);});}
