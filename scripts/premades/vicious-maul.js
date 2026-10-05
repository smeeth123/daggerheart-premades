import {isHopePaymentCancellation,hopeCapacity,spendHope,refundHope} from './hope-payment.js';
import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor} from './aura-rules.js';
import {overwhelmHits} from './overwhelm.js';
import {timedDialog} from '../dialog.js';
import {withHopeLock} from './hope-lock.js';
import {VICIOUS_MAUL_KEY,VICIOUS_MAUL_EFFECT} from './vicious-maul-data.js';
import {hasEmbeddedActionSource as embeddedActionSource,syncBeastformAttackAction} from '../beastform-roll-damage.js';

const QUERY=`${ID}.viciousMaul`,PROMPT=`${QUERY}Prompt`;
const ACTION_WRAP=Symbol.for(`${ID}.viciousMaulActionV4`),DAMAGE_WRAP=Symbol.for(`${ID}.viciousMaulDamageV4`);
const pending=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function viciousMaulItem(actor,requireHope=false){if(actor?.type!=='character'||requireHope&&hopeCapacity(actor)<1)return null;return actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===VICIOUS_MAUL_KEY;})??null;}
export function viciousMaulHits(message){return overwhelmHits(message);}
export function hasEmbeddedActionSource(message,actor){return embeddedActionSource(message?.system?.source,actor);}
export const syncViciousMaulAction=syncBeastformAttackAction;

export function viciousMaulProficiencyData(messageUuid){return{name:'Vicious Maul — +1 Proficiency',img:'icons/creatures/abilities/mouth-teeth-long-red.webp',type:'base',transfer:false,disabled:false,system:{changes:[{key:'system.proficiency',type:'add',value:1,priority:null,phase:'initial'}],duration:{type:'temporary',description:'Until this attack’s damage is rolled.'},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},duration:{value:null,units:'seconds',expiry:null,expired:false},description:'<p>+1 Proficiency for the triggering attack.</p>',statuses:[],showIcon:1,flags:{[ID]:{viciousMaulProficiency:true,messageUuid}}};}

export async function promptViciousMaul(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.active||!actor?.testUserPermission(game.user,'OWNER')||!viciousMaulItem(actor,true)||!data.targets?.length)return false;return timedDialog(`Vicious Maul — ${actor.name}`,`<p>Spend <strong>1 Hope</strong> to gain <strong>+1 Proficiency</strong> for this attack and make one hit target temporarily <strong>Vulnerable</strong>?</p>${data.targets.map((target,index)=>`<label style="display:block;margin:.35rem 0"><input type="radio" name="viciousTarget" value="${esc(target.id)}" ${index?'':'checked'}> ${esc(target.name)}</label>`).join('')}`,[{action:'use',label:'Spend 1 Hope',callback:(_event,_button,dialog)=>dialog.element.querySelector('[name="viciousTarget"]:checked')?.value??false},{action:'decline',label:'Decline',default:true,callback:()=>false}]);}

export async function applyViciousMaul(actor,target,message,item){try{let hopePayment;const template=item.effects?.get?.(VICIOUS_MAUL_EFFECT),hope=hopeCapacity(actor);if(!template||hope<1)return false;const paid=(hopePayment=await spendHope(actor,1));if(!paid)throw Error('Vicious Maul could not spend Hope.');let proficiency;
 try{
  [proficiency]=await actor.createEmbeddedDocuments('ActiveEffect',[viciousMaulProficiencyData(message.uuid)]);
  if(!proficiency)throw Error('Vicious Maul could not create its Proficiency effect.');
  await game.system.api.fields.ActionFields.EffectsField.applyEffect(template,target);
  const currentAction=actor.system?.attack?._id,updates={[`flags.${ID}.viciousMaul`]:{actorUuid:actor.uuid,effectId:proficiency.id}};
  if(currentAction&&!hasEmbeddedActionSource(message,actor))updates['system.source.action']=currentAction;
  await message.update(updates);
  return true;
 }catch(error){if(proficiency)await actor.deleteEmbeddedDocuments('ActiveEffect',[proficiency.id]);await refundHope(actor,hopePayment);throw error;}
}catch(error){if(isHopePaymentCancellation(error))return false;throw error;}}

export async function resolveViciousMaul(request,{user},ask=promptViciousMaul){if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||pending.has(request.messageUuid))return false;const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor,item=viciousMaulItem(actor,true);if(!item||!actor.testUserPermission(user,'OWNER')||message.flags?.[ID]?.viciousMaulOffered)return false;let hits=viciousMaulHits(message);if(!hits.length)return false;const targets=(await Promise.all(hits.map(async hit=>({id:hit.id,actorId:hit.actorId,name:(await fromUuid(hit.actorId))?.name})))).filter(target=>target.name);if(!targets.length)return false;pending.add(request.messageUuid);
 try{
  await message.setFlag(ID,'viciousMaulOffered',true);
  const owner=ownerFor(actor,[...game.users],game.user),selected=owner.isSelf?await ask({actorUuid:actor.uuid,targets},{user:game.user}):await owner.query(PROMPT,{actorUuid:actor.uuid,targets},{timeout:decisionBudget(65000)});
  if(!selected||decisionNow()>request.deadline)return false;
  hits=viciousMaulHits(message);
  const hit=hits.find(entry=>entry.id===selected),target=targets.find(entry=>entry.id===selected&&entry.actorId===hit?.actorId)&&await fromUuid(hit.actorId);
  if(!target)return false;
  return withHopeLock(actor.uuid,async()=>{const current=viciousMaulItem(actor,true);if(!current||!viciousMaulHits(message).some(entry=>entry.id===selected&&entry.actorId===target.uuid))return false;return applyViciousMaul(actor,target,message,current);});
 }finally{pending.delete(request.messageUuid);}
}

export async function expireViciousMaul(message){const record=message?.flags?.[ID]?.viciousMaul;if(!record)return false;const actor=await fromUuid(record.actorUuid);if(actor?.effects?.get?.(record.effectId))await actor.deleteEmbeddedDocuments('ActiveEffect',[record.effectId]);await message.unsetFlag?.(ID,'viciousMaul');return true;}

export function installViciousMaul(Action,Damage,dispatch){if(Action&&!Action[ACTION_WRAP]){const use=Action.prototype.use;Action.prototype.use=async function(...args){const config=await use.apply(this,args);if(config?.message&&this.type==='attack'&&viciousMaulItem(this.actor)&&viciousMaulHits(config.message).length)try{await syncViciousMaulAction(config.message,this.actor);if(viciousMaulItem(this.actor,true)&&!config.message.flags?.[ID]?.viciousMaulOffered)await dispatch({messageUuid:config.message.uuid,deadline:decisionNow()+decisionBudget(120000)});}catch(error){console.error(`${ID} | Vicious Maul prompt failed`,error);ui.notifications?.error?.('Vicious Maul failed; the completed attack was preserved.');}return config;};Object.defineProperty(Action,ACTION_WRAP,{value:true});}
 if(Damage&&!Damage[DAMAGE_WRAP]){const post=Damage.buildPost;Damage.buildPost=async function(roll,config,...args){const result=await post.call(this,roll,config,...args);if(!config.hasHealing&&config.source?.message)try{await expireViciousMaul(game.messages.get(config.source.message));}catch(error){console.error(`${ID} | Vicious Maul cleanup failed`,error);}return result;};Object.defineProperty(Damage,DAMAGE_WRAP,{value:true});}}

export function registerViciousMaul(){CONFIG.queries[QUERY]=resolveViciousMaul;CONFIG.queries[PROMPT]=promptViciousMaul;const dispatch=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Vicious Maul needs an active GM.');return gm.isSelf?resolveViciousMaul(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});};installViciousMaul(game.system.api.data.actions.actionsTypes.base,CONFIG.Dice.daggerheart.DamageRoll,dispatch);}
