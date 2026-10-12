import {ID} from '../core.js';
import {isWeaponAttack} from './weapon-attack.js';
import {honedAction} from './honed.js';
import {resolvedAttackOutcome} from '../attack-outcome.js';
import {withHopeLock} from './hope-lock.js';
import {ownerFor} from './aura-rules.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
const QUERY=ID+'.smite',PROMPT=QUERY+'Success',ATTACK=Symbol.for(QUERY+'Attack'),DAMAGE=Symbol.for(QUERY+'Damage'),pending=new WeakSet();
const actorFor=c=>c?.data?.parent??(c?.source?.actor?foundry.utils.fromUuidSync(c.source.actor):null);
export function smiteEffects(actor){return actor?.type==='character'?[...actor.effects??[]].filter(e=>e.flags?.[ID]?.smite===true&&!e.flags[ID].smiteClaim&&!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired):[];}
export function smiteOutcome(message){
 const d=message?.system;if(!isWeaponAttack(d)||d.hasHealing)return 'ineligible';
 if(message.flags?.[ID]?.wildFortressAutomatic&&d.hasRoll===false&&d.targets?.some(t=>t.hitResult?.success===true))return 'success';
 if(d.hasRoll===false||d.roll?._evaluated===false||!Number.isFinite(d.roll?.total))return 'ineligible';
 return resolvedAttackOutcome(message);
}
export async function promptSmiteSuccess(data,{user}){const m=await fromUuid(data.messageUuid),actor=m?.system?.action?.actor;if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||smiteOutcome(m)!=='unknown')return false;return Boolean(await timedDialog('Smite — Confirm Attack Result','<p>This weapon attack has no known Difficulty. Did it succeed?</p>',[{action:'success',label:'Succeeded — Use Smite',callback:()=>true},{action:'failed',label:'Failed — Keep Charge',callback:()=>false},{action:'decline',label:'Resolve Manually',default:true,callback:()=>false}]));}
export async function resolveSmite(request,{user},ask=promptSmiteSuccess){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string')return false;
 const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
 const valid=()=>game.user.isActiveGM&&user.active&&actor?.testUserPermission(user,'OWNER')&&['success','unknown'].includes(smiteOutcome(message));
 if(!valid())return false;
 return withHopeLock('smite:'+actor.uuid,async()=>{
  if(!valid())return false;const old=message.flags?.[ID]?.smite;if(old)return old.state==='complete'&&old.actorUuid===actor.uuid;
  const snapshot=message.flags?.[ID]?.smiteCandidates;if(snapshot?.actorUuid!==actor.uuid||!Array.isArray(snapshot.effectIds))return false;
  let effects=smiteEffects(actor).filter(e=>snapshot.effectIds.includes(e.id));if(!effects.length)return false;
  if(smiteOutcome(message)==='unknown'){
   if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
   const owner=ownerFor(actor,[...game.users],game.user),data={messageUuid:message.uuid};
   if(!(owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)}))||!owner.active||!actor.testUserPermission(owner,'OWNER')||!valid())return false;
  }
  effects=smiteEffects(actor).filter(e=>snapshot.effectIds.includes(e.id));if(!effects.length)return false;
  // Reserve the charge on its document before recording/expiring it. A partial
  // failure cannot make the same paid charge available to another attack.
  for(const effect of effects){await effect.update({['flags.'+ID+'.smiteClaim']:message.uuid});if(effect.flags?.[ID]?.smiteClaim!==message.uuid)throw Error('Smite reservation was not confirmed.');}
  const record={actorUuid:actor.uuid,effectIds:effects.map(e=>e.id),originalAction:message.system.source?.action,state:'committing'};
  await message.setFlag(ID,'smite',record);if(message.flags?.[ID]?.smite?.state!=='committing')throw Error('Smite damage provenance was not saved.');
  await actor.deleteEmbeddedDocuments('ActiveEffect',record.effectIds);if([...actor.effects??[]].some(e=>record.effectIds.includes(e.id)))throw Error('Smite charge expiration was not confirmed.');
  if(message.system.source?.item===actor.id)await syncBeastformAttackAction(message,actor);
  await message.setFlag(ID,'smite',{...record,state:'complete'});if(message.flags?.[ID]?.smite?.state!=='complete')throw Error('Smite completion was not saved.');return true;
 });
}
const report=error=>{console.error(ID+' | Smite',error);ui.notifications.error('Smite needs manual review: '+error.message+'. The original attack is preserved; check its charge and damage before retrying.');};
export function installSmiteAttack(Roll,send){if(!Roll||Object.hasOwn(Roll,ATTACK))return;const build=Roll.build;
 Roll.build=async function(config={},...args){if(pending.has(config))return build.call(this,config,...args);pending.add(config);
  const actor=actorFor(config),action=honedAction(actor,config.source),effects=!config.source?.message&&config.evaluate!==false&&isWeaponAttack({action,item:action?.item})?smiteEffects(actor).map(e=>e.id):[];
  try{const result=await build.call(this,config,...args),message=result?.message;if(effects.length&&result?.evaluate!==false&&message)try{
   if(message.system.source?.item===actor.id)await syncBeastformAttackAction(message,actor);
   if(smiteOutcome(message)==='ineligible')return result;
   await message.setFlag(ID,'smiteCandidates',{actorUuid:actor.uuid,effectIds:effects});
   if(smiteOutcome(message)==='success')await send({messageUuid:message.uuid});
  }catch(error){report(error);}return result;}finally{pending.delete(config);}
 };Object.defineProperty(Roll,ATTACK,{value:true});}
export function smiteDamageMessage(config){const message=game.messages?.get(config.source?.message)??config.message,record=message?.flags?.[ID]?.smite,source=message?.system?.source;
 const actor=message?.system?.action?.actor,actionMatches=source?.action===config.source?.action||(source?.item===actor?.id&&record?.originalAction===config.source?.action);
 return !config.hasHealing&&config.damageFormula&&record?.state==='complete'&&record.actorUuid===source?.actor&&isWeaponAttack(message.system)&&['actor','item'].every(k=>source[k]===config.source?.[k])&&actionMatches?message:null;
}
export function setSmiteDamageType(config){if(!smiteDamageMessage(config))return false;config.damageFormula.damageTypes=new Set(['magical']);if(config.damage?.main)config.damage.main.options={...config.damage.main.options,damageTypes:['magical']};return true;}
export async function doubleSmiteDamage(config){if(config.evaluate===false||!smiteDamageMessage(config))return false;const main=config.damage?.main;if(!main||!Number.isFinite(main.total)||main.options?.[ID]?.smiteDoubled)return false;
 const before=Number(main.total),bonus=await new Roll(String(before)).evaluate();for(const term of bonus.terms)term.options={...term.options,flavor:'Smite'};
 main.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),...bonus.terms);main._total=main._evaluateTotal();main.resetFormula?.();main.options={...main.options,damageTypes:['magical'],[ID]:{...main.options?.[ID],smiteDoubled:{before,actorUuid:config.source.actor}}};
 if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([k,r])=>[k,r.toJSON?.()??r]))});return true;
}
export function installSmiteDamage(Damage,send){if(!Damage||Object.hasOwn(Damage,DAMAGE))return;const configure=Damage.buildConfigure,post=Damage.buildPost;
 Damage.buildConfigure=async function(config,...args){const message=game.messages?.get(config.source?.message)??config.message;
  if(!config.hasHealing&&config.damageFormula&&message?.flags?.[ID]?.smiteCandidates&&!message.flags[ID].smite&&['success','unknown'].includes(smiteOutcome(message)))try{await send({messageUuid:message.uuid});}catch(error){report(error);}
  setSmiteDamageType(config);const result=await configure.call(this,config,...args);if(result)setSmiteDamageType(config);return result;
 };
 // All evaluation-phase rerolls/modifiers have finished before native damage
 // chat posting. Keep dice/results intact; add the finalized total once.
 Damage.buildPost=async function(roll,config,...args){await doubleSmiteDamage(config);return post.call(this,roll,config,...args);};Object.defineProperty(Damage,DAMAGE,{value:true});}
export function registerSmite(){CONFIG.queries[QUERY]=resolveSmite;CONFIG.queries[PROMPT]=promptSmiteSuccess;const send=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Smite needs an active GM.');return gm.isSelf?resolveSmite(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(75000)});};for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installSmiteAttack(Roll,send);installSmiteDamage(CONFIG.Dice.daggerheart.DamageRoll,send);
 Hooks.on('preCreateChatMessage',message=>{if(!message.flags?.[ID]?.wildFortressAutomatic||!isWeaponAttack(message.system))return;const actor=message.system.action.actor,effects=smiteEffects(actor);if(effects.length)message.updateSource({['flags.'+ID+'.smiteCandidates']:{actorUuid:actor.uuid,effectIds:effects.map(e=>e.id)}});});
}
