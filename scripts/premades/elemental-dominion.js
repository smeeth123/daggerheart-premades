import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {HP_REACTIONS_HANDLED,reduceReactiveHP} from './hp-reactions.js';
import { ID,featureActive } from '../core.js';
import { DOMINION_KEY } from './elemental-dominion-data.js';
import { elementalActive } from './elemental-incarnation.js';
import { honedAction } from './honed.js';
import { overwhelmHits } from './overwhelm.js';
import { ownerFor } from './aura-rules.js';
import { markReactiveStress } from './stress-payment.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
import { timedDialog } from '../dialog.js';
const EARTH_HANDLED=`${ID}.dominionEarthHandled`;
const QUERY=`${ID}.dominionWater`,PROMPT=`${ID}.dominionWaterPrompt`,pending=new Set();
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function dominionItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===DOMINION_KEY;})??null;}
export function dominionActive(actor,element){return Boolean(dominionItem(actor)&&elementalActive(actor,element));}
export async function rollDominionEarth(actor,count){
 const roll=await new foundry.dice.Roll(`${count}d6`).evaluate();
 const prevented=roll.dice.flatMap(d=>d.results).filter(r=>r.active!==false&&!r.discarded&&Number(r.result)===6).length;
 const remaining=Math.max(0,count-prevented);
 const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flags:{[ID]:{unshakeableRoll:true}},flavor:`<strong>Elemental Dominion — ${esc(actor.name)}</strong><p>${prevented} HP prevented; mark ${remaining} HP.</p>`},{messageMode:game.settings.get('core','messageMode')});
 if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
 return remaining;
}
export function installDominionEarth(Actor,roll=rollDominionEarth){
 const native=Actor.prototype._preUpdate,modify=Actor.prototype.modifyResource;
 Actor.prototype._preUpdate=async function(changed,options,user){
  const key='system.resources.hitPoints.value',proposed=changed[key]??foundry.utils.getProperty(changed,key);
  const current=Number(this.system.resources?.hitPoints?.value),delta=Number(proposed)-current;
  if(!options?.[EARTH_HANDLED]&&dominionActive(this,'earth')&&Number.isSafeInteger(delta)&&delta>0){
   const next=current+await reduceReactiveHP(this,await roll(this,delta));
   if(Object.hasOwn(changed,key))changed[key]=next;else foundry.utils.setProperty(changed,key,next);
  }
  return native.call(this,changed,options,user);
 };
 // The native resource writer starts document updates without awaiting them.
 // Resolve prevention here, before postTakeDamage and Channeling expiry, and
 // update the original receipt so every downstream consumer sees the final HP.
 Actor.prototype.modifyResource=async function(resources){
  const hp=resources?.filter(r=>r.key==='hitPoints'&&!r.itemId&&!r.clear&&Number.isSafeInteger(r.value)&&r.value>0);
  if(!hp?.length||!dominionActive(this,'earth'))return modify.call(this,resources);
  const count=hp.reduce((sum,r)=>sum+r.value,0);
  let remaining;
  if(!this.isOwner&&!game.user.isGM){
   const gm=game.users.activeGM;if(!gm)throw new Error('Elemental Dominion needs an active GM.');
   remaining=await gm.query(`${ID}.dominionEarthHP`,{actorUuid:this.uuid,count},{timeout:decisionBudget(180000)});
  }else remaining=await applyDominionEarthHP(this,count,roll);
  // Distribute prevented HP over the damage receipt, preserving its metadata.
  let prevented=count-remaining;
  for(const entry of hp){const reduced=Math.min(entry.value,prevented);entry.value-=reduced;prevented-=reduced;}
  await modify.call(this,resources.filter(r=>!hp.includes(r)));
  return this;
 };
}
export async function applyDominionEarthHP(actor,count,roll=rollDominionEarth){
 if(!Number.isSafeInteger(count)||count<1)throw new Error('Invalid incoming HP amount.');
 const remaining=await reduceReactiveHP(actor,dominionActive(actor,'earth')?await roll(actor,count):count);
 const hp=actor.system.resources.hitPoints,next=Math.min(Number(hp.max),Number(hp.value)+remaining);
 if(next!==Number(hp.value)){
  const updated=await actor.update({'system.resources.hitPoints.value':next},{[EARTH_HANDLED]:true,[HP_REACTIONS_HANDLED]:true});
  if(!updated||Number(actor.system.resources.hitPoints.value)!==next)throw new Error('Could not apply Elemental Dominion HP.');
 }
 return remaining;
}
export function installDominionFire(Damage){
 const native=Damage.buildConfigure;
 Damage.buildConfigure=async function(config,...args){
  const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor??config.data?.parent;
  const action=message?.system?.action??honedAction(actor,config.source),item=action?.item??actor?.items?.get?.(config.source?.item);
  const eligible=action?.type==='attack'||(item?.type==='domainCard'&&['spell','grimoire'].includes(item.system.type));
  if(!config.hasHealing&&config.damageFormula&&eligible&&dominionActive(actor,'fire')&&!config[ID]?.dominionFire&&Number.isFinite(Number(config.data?.prof))){
   const prof=Number(config.data.prof)+1;
   config.data={...config.data,prof,system:{...config.data.system,proficiency:prof}};config[ID]={...config[ID],dominionFire:true};
   if(action?.damage?.main){const context=new Proxy(action,{get(target,key){if(key==='getRollData')return (...a)=>({...target.getRollData(...a),prof});return Reflect.get(target,key,target);}});const formulas=game.system.api.fields.ActionFields.DamageField.formatFormulas.call(context,[action.damage.main],config);if(formulas[0])config.damageFormula={...config.damageFormula,formula:formulas[0].formula};}
  }
  return native.call(this,config,...args);
 };
}
let syncing=Promise.resolve();
export function syncDominionAir(){
 syncing=syncing.catch(()=>{}).then(async()=>{
  if(!game.user.isActiveGM)return;
  const actors=new Map([...(game.actors??[])].map(a=>[a.uuid,a]));for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  for(const actor of actors.values()){
   const old=actor.effects.filter(e=>e.flags?.[ID]?.dominionAir),active=dominionActive(actor,'air');
   if(active&&!old.length)await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Elemental Dominion — Air',img:dominionItem(actor).img,type:'base',transfer:false,description:'While channeling Air: +1 Evasion and you can fly.',system:{changes:[{key:'system.evasion',type:'add',value:1,phase:'initial'}],duration:{type:''}},flags:{[ID]:{dominionAir:true}}}]);
   const remove=active?old.slice(1):old;if(remove.length)await actor.deleteEmbeddedDocuments('ActiveEffect',remove.map(e=>e.id));
  }
 });return syncing;
}
export async function promptDominionWater(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!dominionActive(actor,'water'))return false;
 return Boolean(await timedDialog(`Elemental Dominion — ${actor.name}`,`<p>Mark <strong>1 Stress</strong> to make ${esc(data.attackerName)} temporarily <strong>Vulnerable</strong>?</p>`,[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
async function validateWater(request,user){
 const message=await fromUuid(request.messageUuid),attacker=message?.system?.action?.actor,hit=overwhelmHits(message).find(t=>t.id===request.targetId);
 if(!user?.active||!attacker?.testUserPermission(user,'OWNER')||!hit)return null;
 const actor=await fromUuid(hit.actorId);
 return dominionActive(actor,'water')&&!attacker.statuses?.has('vulnerable')&&Number(actor.system.resources.stress.value)<Number(actor.system.resources.stress.max)?{message,attacker,actor}:null;
}
export async function resolveDominionWater(request,{user},ask=promptDominionWater){
 if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
 const key=`${request.messageUuid}:${request.targetId}`;let v=await validateWater(request,user);
 if(!v||pending.has(key)||v.message.flags?.[ID]?.dominionWater?.[request.targetId])return false;
 pending.add(key);try{
  await v.message.update({[`flags.${ID}.dominionWater.${request.targetId}`]:'offered'});
  const owner=ownerFor(v.actor,[...game.users],game.user),data={actorUuid:v.actor.uuid,attackerName:v.attacker.name};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted||decisionNow()>request.deadline||!(v=await validateWater(request,user)))return false;
  if(!await markReactiveStress(v.actor.uuid,a=>dominionActive(a,'water')))return false;
  await v.attacker.createEmbeddedDocuments('ActiveEffect',[{name:'Elemental Dominion — Vulnerable',img:'icons/magic/water/heart-ice-freeze.webp',type:'base',transfer:false,statuses:['vulnerable'],origin:dominionItem(v.actor).uuid,system:{changes:[],duration:{type:'temporary'}}}]);
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:v.actor}),content:`<p><strong>Elemental Dominion — Water</strong>: ${esc(v.actor.name)} marks 1 Stress; ${esc(v.attacker.name)} becomes temporarily Vulnerable.</p>`});return true;
 }finally{pending.delete(key);}
}
export function installDominionWater(Target,offer){
 const native=Target.execute;Target.execute=async function(config){
  const result=await native.call(this,config);
  if(result!==false&&this.type==='attack')for(const hit of overwhelmHits(config.message))await offer({messageUuid:config.message.uuid,targetId:hit.id,deadline:decisionNow()+decisionBudget(120000)});
  return result;
 };
}
export function registerElementalDominion(){
 CONFIG.queries[`${ID}.dominionEarthHP`]=async(data,{user})=>{if(!game.user.isActiveGM||!user?.active)throw new Error('Invalid Elemental Dominion request.');const actor=await fromUuid(data.actorUuid);if(!actor)throw new Error('Actor missing.');return applyDominionEarthHP(actor,data.count);};
 CONFIG.queries[QUERY]=resolveDominionWater;CONFIG.queries[PROMPT]=promptDominionWater;
 installDominionEarth(CONFIG.Actor.documentClass);installDominionFire(CONFIG.Dice.daggerheart.DamageRoll);
 installDominionWater(game.system.api.fields.ActionFields.TargetField,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Elemental Dominion needs an active GM.');return gm.isSelf?resolveDominionWater(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});
 Hooks.on('daggerheart.preUseAction',action=>{if(action.type==='attack')prioritizeFaerieWings(action,true);});
 const safe=()=>{void syncDominionAir().catch(e=>ui.notifications.error(e.message));};
 for(const name of ['createActiveEffect','updateActiveEffect','deleteActiveEffect','createItem','updateItem','deleteItem','canvasReady'])Hooks.on(name,safe);safe();
}
