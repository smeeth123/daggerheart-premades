import { decisionBudget } from '../settings.js';
import {ID,featureActive} from '../core.js';
import {DEFENDER_KEY} from './defender-data.js';
import {sourceToken} from './hallowed-aura.js';
import {allied,closeDistance,ownerFor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {timedDialog} from '../dialog.js';
import {dominionActive} from './elemental-dominion.js';
import {HP_REACTIONS_HANDLED,setHPReaction,reduceReactiveHP} from './hp-reactions.js';
const QUERY=`${ID}.defender`,PROMPT=`${ID}.defenderPrompt`;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function defenderItem(actor){
 if(!actor?.effects?.some(e=>e.type==='beastform'&&!e.disabled&&!e.isSuppressed))return null;
 const stress=actor.system?.resources?.stress;if(!(Number(stress?.value)<Number(stress?.max)))return null;
 return actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===DEFENDER_KEY;})??null;
}
export function defenderCandidates(target){
 const victim=sourceToken(target);if(!victim)return [];
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,limit=closeDistance(canvas.scene,rules,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id);
 const result=new Map();for(const token of canvas.tokens.placeables){if(!defenderItem(token.actor)||!allied(token.document,victim.document)||token.actor.statuses?.has('dead'))continue;const distance=token.distanceTo(victim);if(Number.isFinite(distance)&&distance<=limit)result.set(token.actor.uuid,token.actor);}return [...result.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid));
}
export async function promptDefender(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!defenderItem(actor))return false;
 return Boolean(await timedDialog(`Defender — ${actor.name}`,`<p>${esc(data.targetName)} would mark <strong>${data.count} HP</strong>.</p><p>Mark <strong>1 Stress</strong> to reduce that to <strong>${data.count-1} HP</strong>?</p>`,[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function offerDefenders(target,count,ask=promptDefender){
 let remaining=count;
 for(const bearer of defenderCandidates(target)){
  if(remaining<2)break;
  if(!defenderCandidates(target).some(a=>a.uuid===bearer.uuid))continue;
  const owner=ownerFor(bearer,[...game.users],game.user),data={actorUuid:bearer.uuid,targetName:target.name,count:remaining};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted||!await markReactiveStress(bearer.uuid,a=>defenderItem(a)&&defenderCandidates(target).some(b=>b.uuid===a.uuid)))continue;
  remaining--;
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:bearer}),content:`<p><strong>Defender</strong>: ${esc(bearer.name)} marks 1 Stress to prevent 1 HP for ${esc(target.name)} (${remaining} HP to mark).</p>`});
 }return remaining;
}
export async function resolveDefender(request,{user}){
 if(!game.user.isActiveGM||!user?.active||!Number.isSafeInteger(request.count)||request.count<1)throw new Error('Invalid Defender HP request.');
 const actor=await fromUuid(request.actorUuid);if(!actor?.system?.resources?.hitPoints)throw new Error('Defender target is missing.');
 const remaining=request.count>=2?await offerDefenders(actor,request.count):request.count;
 if(request.apply){const hp=actor.system.resources.hitPoints,next=Math.min(Number(hp.max),Number(hp.value)+remaining);const updated=await actor.update({'system.resources.hitPoints.value':next},{[HP_REACTIONS_HANDLED]:true});if(!updated||Number(actor.system.resources.hitPoints.value)!==next)throw new Error('Could not apply Defender HP.');}
 return remaining;
}
async function dispatch(actor,count,apply=false){const gm=game.users.activeGM;if(!gm)throw new Error('Defender needs an active GM.');const request={actorUuid:actor.uuid,count,apply};return gm.isSelf?resolveDefender(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(300000)});}
export function installDefender(Actor,apply=(actor,count)=>dispatch(actor,count,true)){
 const native=Actor.prototype.modifyResource,preUpdate=Actor.prototype._preUpdate;
 Actor.prototype.modifyResource=async function(resources){
  // Earth resolves first and invokes the same reactive prevention before committing HP.
  if(dominionActive(this,'earth'))return native.call(this,resources);
  const hp=resources?.filter(r=>r.key==='hitPoints'&&!r.itemId&&!r.clear&&Number.isSafeInteger(r.value)&&r.value>0),count=hp?.reduce((sum,r)=>sum+r.value,0)??0;
  if(count<2||!defenderCandidates(this).length)return native.call(this,resources);
  const remaining=await apply(this,count);let prevented=count-remaining;
  for(const entry of hp){const n=Math.min(entry.value,prevented);entry.value-=n;prevented-=n;}
  await native.call(this,resources.filter(r=>!hp.includes(r)));return this;
 };
 Actor.prototype._preUpdate=async function(changed,options={},user){
  const key='system.resources.hitPoints.value',proposed=changed[key]??foundry.utils.getProperty(changed,key),current=Number(this.system?.resources?.hitPoints?.value),delta=Number(proposed)-current;
  if(!options[HP_REACTIONS_HANDLED]&&!dominionActive(this,'earth')&&Number.isSafeInteger(delta)&&delta>=2&&defenderCandidates(this).length){const next=current+await reduceReactiveHP(this,delta);if(Object.hasOwn(changed,key))changed[key]=next;else foundry.utils.setProperty(changed,key,next);}
  return preUpdate.call(this,changed,options,user);
 };
}
export function registerDefender(){CONFIG.queries[QUERY]=resolveDefender;CONFIG.queries[PROMPT]=promptDefender;setHPReaction((actor,count)=>defenderCandidates(actor).length?dispatch(actor,count):count);installDefender(CONFIG.Actor.documentClass);}
