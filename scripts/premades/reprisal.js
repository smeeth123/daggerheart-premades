import { decisionBudget } from '../settings.js';
import {ID,featureActive} from '../core.js';
import {REPRISAL_KEY} from './reprisal-data.js';
import {sourceToken} from './hallowed-aura.js';
import {allied} from './aura-rules.js';
import {meleeLimit} from './kick.js';
import {overwhelmHits} from './overwhelm.js';
import {withHopeLock} from './hope-lock.js';
import {prioritizeFaerieWings} from './faerie-wings.js';
const QUERY=`${ID}.reprisal`;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function reprisalItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===REPRISAL_KEY;})??null;}
export function reprisalEffects(actor,targetUuid){return reprisalItem(actor)?actor.effects.filter(e=>!e.disabled&&!e.isSuppressed&&e.flags?.[ID]?.reprisalTarget===targetUuid):[];}
export function reprisalGuardians(victim){const target=sourceToken(victim);if(!target)return [];const result=new Map();for(const token of canvas.tokens.placeables){if(!reprisalItem(token.actor)||!allied(token.document,target.document)||token.actor.statuses?.has('dead'))continue;const distance=token.distanceTo(target);if(Number.isFinite(distance)&&distance<=meleeLimit(canvas.scene))result.set(token.actor.uuid,token.actor);}return [...result.values()];}
export async function resolveReprisal(request,{user}){
 if(!game.user.isActiveGM||!user?.active)return false;
 if(request.op==='damage'){
  const source=await fromUuid(request.sourceUuid),victim=await fromUuid(request.targetUuid);
  if(source?.type!=='adversary'||!victim||!(source.testUserPermission(user,'OWNER')||victim.testUserPermission(user,'OWNER')))return false;
  for(const guardian of reprisalGuardians(victim))await withHopeLock(guardian.uuid,async()=>{
   if(!reprisalItem(guardian)||reprisalEffects(guardian,source.uuid).length)return;
   const item=reprisalItem(guardian);await guardian.createEmbeddedDocuments('ActiveEffect',[{name:`Act of Reprisal — ${source.name}`,img:item.img,type:'base',transfer:false,origin:item.uuid,description:`+1 Proficiency on your next successful attack against ${source.name}.`,system:{changes:[],duration:{type:''}},flags:{[ID]:{reprisalTarget:source.uuid}}}]);
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:guardian}),content:`<p><strong>Act of Reprisal</strong>: ${esc(guardian.name)} gains +1 Proficiency on their next successful attack against ${esc(source.name)}.</p>`});
  });return true;
 }
 if(request.op!=='attack')return false;
 const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
 if(!actor?.testUserPermission(user,'OWNER')||!reprisalItem(actor))return false;
 return withHopeLock(actor.uuid,async()=>{
  if(message.flags?.[ID]?.reprisalTargets)return true;
  const hits=[...new Set(overwhelmHits(message).map(t=>t.actorId))],targets=hits.filter(id=>reprisalEffects(actor,id).length);
  if(!targets.length)return false;
  const effects=targets.flatMap(id=>reprisalEffects(actor,id));
  await message.update({[`flags.${ID}.reprisalTargets`]:targets});
  await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));return true;
 });
}
export function installReprisalDamage(Actor,dispatch){const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(args,...rest){const sourceUuid=args?.main?.options?.[ID]?.elementalSource;const result=await native.call(this,args,...rest);if(sourceUuid&&result?.some(u=>u.key==='hitPoints'&&!u.itemId&&!u.clear&&Number(u.value)>0))await dispatch({op:'damage',sourceUuid,targetUuid:this.uuid});return result;};}
export function installReprisalTarget(Target,dispatch){const native=Target.execute;Target.execute=async function(config){const result=await native.call(this,config);if(result!==false&&reprisalItem(this.actor)&&overwhelmHits(config.message).length)await dispatch({op:'attack',messageUuid:config.message.uuid});return result;};}
export function applyReprisalProficiency(config,message){
 const marked=message?.flags?.[ID]?.reprisalTargets;if(!marked?.length||config.hasHealing||!config.damageFormula||config[ID]?.reprisalProficiency)return false;
 const hits=overwhelmHits(message),targets=config.targets?.length?hits.filter(h=>config.targets.some(t=>t.actorId===h.actorId)):hits;
 if(!targets.length||!targets.every(t=>marked.includes(t.actorId)))return false;
 const prof=Number(config.data?.prof);if(!Number.isFinite(prof))return false;
 config.data={...config.data,prof:prof+1,system:{...config.data.system,proficiency:prof+1}};config[ID]={...config[ID],reprisalProficiency:true};
 const action=message.system.action;if(action.damage?.main){const context=new Proxy(action,{get(target,key){if(key==='getRollData')return (...args)=>({...target.getRollData(...args),prof:config.data.prof});return Reflect.get(target,key,target);}});const formulas=game.system.api.fields.ActionFields.DamageField.formatFormulas.call(context,[action.damage.main],config);if(formulas[0])config.damageFormula={...config.damageFormula,formula:formulas[0].formula};}
 return true;
}
export function registerReprisal(){
 CONFIG.queries[QUERY]=resolveReprisal;const dispatch=request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Act of Reprisal needs an active GM.');return gm.isSelf?resolveReprisal(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});};
 installReprisalDamage(CONFIG.Actor.documentClass,dispatch);installReprisalTarget(game.system.api.fields.ActionFields.TargetField,dispatch);
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,native=Damage.buildConfigure;
 Damage.buildConfigure=async function(config,...args){const message=game.messages.get(config.source?.message);const applied=applyReprisalProficiency(config,message);if(!applied&&!config.hasHealing&&message?.flags?.[ID]?.reprisalTargets?.length&&overwhelmHits(message).some(t=>message.flags[ID].reprisalTargets.includes(t.actorId)))ui.notifications.warn('Act of Reprisal: split damage by target to apply +1 Proficiency only against the marked adversary.');return native.call(this,config,...args);};
 Hooks.on('daggerheart.preUseAction',action=>{if(reprisalItem(action.actor))prioritizeFaerieWings(action,true);});
 Hooks.on('renderChatMessageHTML',(message,html)=>{if(!message.flags?.[ID]?.reprisalTargets?.length||html.querySelector('.dhp-reprisal'))return;const note=document.createElement('p');note.className='dhp-reprisal';note.textContent='Act of Reprisal: +1 Proficiency against the marked adversary for this attack.';(html.querySelector('.message-content')??html).append(note);});
}
