import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {ID,featureActive} from '../core.js';
import {NEMESIS_KEY,NEMESIS_ACTION} from './nemesis-data.js';
import {withHopeLock} from './hope-lock.js';
import {honedAction} from './honed.js';
import {consumeResolutionTicket} from '../resolution-manager.js';
export function nemesisItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===NEMESIS_KEY;})??null;}
export function nemesisMark(actor){const item=nemesisItem(actor);return item?actor.effects?.find(e=>!e.disabled&&!e.isSuppressed&&e.origin===item.uuid&&e.flags?.[ID]?.nemesisTarget):null;}
export function nemesisAttack(actor,source,targets,actionType){const mark=nemesisMark(actor);return Boolean(mark&&actionType!=='reaction'&&honedAction(actor,source)?.type==='attack'&&targets?.some(t=>t.actorId===mark.flags[ID].nemesisTarget));}
export async function prioritizeNemesis(request,{user}){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid),target=await fromUuid(request.targetUuid);
 if(!actor?.testUserPermission(user,'OWNER')||target?.type!=='adversary'||target.uuid===actor.uuid)return false;
 return withHopeLock(actor.uuid,async()=>{try{let hopePayment;
  const item=nemesisItem(actor),hope=hopeCapacity(actor);if(!item||hope<2)throw new Error('Nemesis requires its active premade and 2 Hope.');
  if(nemesisMark(actor)?.flags[ID].nemesisTarget===target.uuid)return false;
  const old=actor.effects.filter(e=>e.flags?.[ID]?.nemesisTarget&&e.origin===item.uuid);
  const created=await actor.createEmbeddedDocuments('ActiveEffect',[{name:`Nemesis — ${target.name}`,img:item.img,type:'base',transfer:false,origin:item.uuid,description:`Prioritized adversary: ${target.name}. Swap Hope and Fear Dice when attacking this adversary.`,system:{changes:[],duration:{type:'shortRest'}},flags:{[ID]:{nemesisTarget:target.uuid}}}]);
  if(!created?.length)throw new Error('Could not prioritize the adversary.');
  try{const paid=(hopePayment=await spendHope(actor,2));if(!paid||!hopePayment)throw new Error('Could not spend Nemesis Hope.');}catch(error){await actor.deleteEmbeddedDocuments('ActiveEffect',created.map(e=>e.id));throw error;}
  if(old.length)await actor.deleteEmbeddedDocuments('ActiveEffect',old.map(e=>e.id));
  const esc=s=>foundry.utils.escapeHTML(String(s));await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Nemesis</strong>: ${esc(actor.name)} spends 2 Hope to prioritize ${esc(target.name)} until their next rest.</p>`});return true;
 }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
}
export async function validateNemesis(request,user){
 if(!user?.active||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||![request.hope,request.fear].every(Number.isFinite)||request.hope===request.fear)return null;
 const actor=await fromUuid(request.sourceUuid),item=nemesisItem(actor);
 return actor?.testUserPermission(user,'OWNER')&&item?.uuid===request.candidate?.itemUuid&&nemesisAttack(actor,request.source,request.targets,request.actionType)?{actor,item}:null;
}
export async function resolveNemesis(request,{user},authorize=consumeResolutionTicket){
 if(!game.user.isActiveGM||request.deadline>decisionNow()+decisionBudget(125000))return false;const valid=await validateNemesis(request,user);if(!valid||!authorize(request.resolutionToken,'nemesis',valid.item.uuid,user))return false;return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
}
export function swapNemesisDice(roll){
 const hope=roll.dHope,fear=roll.dFear;const before=hope.results.map(r=>({...r}));hope.results=fear.results.map(r=>({...r}));fear.results=before;
 for(const die of [hope,fear])if(die.options)delete die.options.sfx;
 if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;}
 roll._total=roll._evaluateTotal();
}
export function registerNemesis(){
 CONFIG.queries[`${ID}.nemesisPrioritize`]=prioritizeNemesis;CONFIG.queries[`${ID}.nemesisSwap`]=resolveNemesis;
 const Action=game.system.api.data.actions.actionsTypes.base,native=Action.prototype.use;
 Action.prototype.use=async function(...args){
  if(this.id!==NEMESIS_ACTION||nemesisItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);
  const targets=[...new Map([...game.user.targets].filter(t=>t.actor?.type==='adversary').map(t=>[t.actor.uuid,t.actor])).values()];
  if(targets.length!==1||game.user.targets.size!==1){ui.notifications.warn('Target exactly one adversary to Prioritize with Nemesis.');return false;}
  const gm=game.users.activeGM;if(!gm)throw new Error('Nemesis needs an active GM.');const request={actorUuid:this.actor.uuid,targetUuid:targets[0].uuid};return gm.isSelf?prioritizeNemesis(request,{user:game.user}):gm.query(`${ID}.nemesisPrioritize`,request,{timeout:decisionBudget(65000)});
 };
 Hooks.on('renderChatMessageHTML',(message,html)=>{const used=message.rolls?.find(r=>r.options?.[ID]?.nemesis)?.options[ID].nemesis;if(!message.isContentVisible||!used||html.querySelector('.dhp-nemesis'))return;const note=html.ownerDocument.createElement('p');note.className='dhp-nemesis';note.textContent='Nemesis: Hope and Fear die results swapped.';html.querySelector('.message-content')?.append(note);});
}
