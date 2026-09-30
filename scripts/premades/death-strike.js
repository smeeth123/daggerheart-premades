import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { DEATH_KEY,DEATH_ACTION } from './death-strike-data.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { markReactiveStress } from './stress-payment.js';
const QUERY=`${ID}.deathStrike`,PROMPT=`${ID}.deathStrikePrompt`,requests=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deathItem(actor){const stress=actor?.system?.resources?.stress;return actor?.type==='character'&&Number(stress?.value)<Number(stress?.max)?actor.items.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===DEATH_KEY;})??null:null;}
export function deathSevere(updates){return updates?.find(u=>u.key==='hitPoints'&&!u.clear&&!u.itemId&&u.damageTypes!=null&&Number(u.value)>=3);}
export async function promptDeath(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!deathItem(actor))return false;
 return Boolean(await timedDialog(`Death Strike — ${actor.name}`,`<p>You dealt Severe damage to <strong>${esc(data.targetName)}</strong>. Mark <strong>1 Stress</strong> to make them mark <strong>1 additional HP</strong>?</p>`,[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveDeath(request,{user},ask=promptDeath,pay=markReactiveStress){
 if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||request.severity<3||!Number.isFinite(request.severity))return false;
 const actor=await fromUuid(request.actorUuid),target=await fromUuid(request.targetUuid);
 if(!actor||!target||!['character','adversary'].includes(target.type)||(!actor.testUserPermission(user,'OWNER')&&!target.testUserPermission(user,'OWNER'))||!deathItem(actor))return false;
 const hp=()=>target.system.resources.hitPoints;
 if(Number(hp().value)>=Number(hp().max))return false;
 for(const [id,expiry]of requests)if(expiry<decisionNow())requests.delete(id);
 if(typeof request.id!=='string'||requests.has(request.id))return false;requests.set(request.id,decisionNow()+decisionBudget(300000));
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,targetName:target.name};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!accepted||decisionNow()>request.deadline||Number(hp().value)>=Number(hp().max))return false;
 if(!await pay(actor.uuid,a=>Boolean(deathItem(a))))return false;
 await target.modifyResource([{key:'hitPoints',value:1}]);
 await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Death Strike</strong>: ${esc(target.name)} marks 1 additional HP.</p>`});
 return true;
}
export function installDeathDamage(Actor,offer){const native=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(args,...rest){
  const source=args?.main?.options?.[ID]?.deathStrikeSource,updates=await native.call(this,args,...rest),severe=deathSevere(updates);
  if(source&&severe&&await offer(source,this,severe.value))severe.value=Number(severe.value)+1;
  return updates;
 };
}
export function registerDeathStrike(){
 CONFIG.queries[QUERY]=resolveDeath;CONFIG.queries[PROMPT]=promptDeath;
 installDeathDamage(CONFIG.Actor.documentClass,async(actorUuid,target,severity)=>{const gm=game.users.activeGM;if(!gm)throw new Error('Death Strike needs an active GM.');const request={id:foundry.utils.randomID(),actorUuid,targetUuid:target.uuid,severity,deadline:decisionNow()+decisionBudget(120000)};return gm.isSelf?resolveDeath(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,evaluate=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;
  if(deathItem(actor)&&!config.hasHealing&&config.damage?.main){config.damage.main.options[ID]={...config.damage.main.options[ID],deathStrikeSource:actor.uuid};
   if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});
  }return result;
 };
 Hooks.on('daggerheart.preUseAction',action=>{const f=action.item?.flags?.[ID];if(!f?.disabled&&action.id===DEATH_ACTION&&(f?.applied?.key??f?.premade?.key)===DEATH_KEY){ui.notifications.info('Death Strike is offered after your damage causes a creature to mark Severe damage.');return false;}});
}
