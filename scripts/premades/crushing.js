import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { CRUSHING_KEY,CRUSHING_EFFECT } from './crushing-data.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
const QUERY=`${ID}.crushing`,PROMPT=`${ID}.crushingPrompt`,requests=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function crushingItem(actor){
 if(actor?.type!=='character')return null;
 const item=actor.items.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===CRUSHING_KEY;});
 const origin=item?.effects?.get(CRUSHING_EFFECT)?.uuid;
 return origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed)?item:null;
}
export async function payCrushing(actorUuid){return withHopeLock(actorUuid,async()=>{try{let hopePayment;
 const actor=await fromUuid(actorUuid);
 if(!crushingItem(actor)||!(hopeCapacity(actor)>=1))return false;
 const next=hopeCapacity(actor)-1;
 const updated=(hopePayment=await spendHope(actor,1));
 if(!updated||!hopePayment)throw new Error('Could not spend Crushing Hope.');
 return true;
}catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});}
export function crushingSevere(updates){return updates?.find(u=>u.key==='hitPoints'&&!u.clear&&!u.itemId&&u.damageTypes!=null&&Number(u.value)>=3);}
export async function promptCrushing(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!crushingItem(actor)||!(hopeCapacity(actor)>=1))return false;
 return Boolean(await timedDialog(`Crushing — ${actor.name}`,`<p>You dealt Severe damage to <strong>${esc(data.targetName)}</strong>. Spend <strong>1 Hope</strong> to make them mark <strong>1 additional HP</strong>?</p>`,[{action:'use',label:'Spend Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveCrushing(request,{user},ask=promptCrushing,pay=payCrushing){
 if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||request.severity<3||!Number.isFinite(request.severity))return false;
 const actor=await fromUuid(request.actorUuid),target=await fromUuid(request.targetUuid);
 if(!actor||!target||!['character','adversary'].includes(target.type)||(!actor.testUserPermission(user,'OWNER')&&!target.testUserPermission(user,'OWNER'))||!crushingItem(actor)||!(hopeCapacity(actor)>=1))return false;
 const hp=()=>target.system.resources.hitPoints;
 if(Number(hp().value)>=Number(hp().max))return false;
 for(const [id,expiry]of requests)if(expiry<decisionNow())requests.delete(id);
 if(typeof request.id!=='string'||requests.has(request.id))return false;requests.set(request.id,decisionNow()+decisionBudget(300000));
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,targetName:target.name};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!accepted||decisionNow()>request.deadline||Number(hp().value)>=Number(hp().max))return false;
 if(!await pay(actor.uuid,a=>Boolean(crushingItem(a))))return false;
 await target.modifyResource([{key:'hitPoints',value:1}]);
 await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Crushing</strong>: ${esc(target.name)} marks 1 additional HP.</p>`});
 return true;
}
export function installCrushingDamage(Actor,offer){const native=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(args,...rest){
  const source=args?.main?.options?.[ID]?.crushingSource,updates=await native.call(this,args,...rest),severe=crushingSevere(updates);
  if(source&&severe&&await offer(source,this,severe.value))severe.value=Number(severe.value)+1;
  return updates;
 };
}
export function registerCrushing(){
 CONFIG.queries[QUERY]=resolveCrushing;CONFIG.queries[PROMPT]=promptCrushing;
 installCrushingDamage(CONFIG.Actor.documentClass,async(actorUuid,target,severity)=>{const gm=game.users.activeGM;if(!gm)throw new Error('Crushing needs an active GM.');const request={id:foundry.utils.randomID(),actorUuid,targetUuid:target.uuid,severity,deadline:decisionNow()+decisionBudget(120000)};return gm.isSelf?resolveCrushing(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,evaluate=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;
  if(crushingItem(actor)&&!config.hasHealing&&config.damage?.main){config.damage.main.options[ID]={...config.damage.main.options[ID],crushingSource:actor.uuid};
   if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});
  }return result;
 };
}
