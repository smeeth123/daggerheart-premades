import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { ELEMENTAL_KEY,ELEMENTS } from './elemental-incarnation-data.js';
import { sourceToken } from './hallowed-aura.js';
import { meleeLimit } from './kick.js';
import { severeStormDamage } from './eye-of-the-storm.js';
import { markReactiveStress } from './stress-payment.js';
const QUERY=`${ID}.elementalDamage`,seen=new Map();
export function elementalItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===ELEMENTAL_KEY;})??null;}
export function elementalEffects(actor){const item=elementalItem(actor);if(!item)return [];const origins=new Set(Object.values(ELEMENTS).map(id=>item.effects.get(id)?.uuid).filter(Boolean));return [...actor.effects].filter(e=>origins.has(e.origin));}
export function elementalActive(actor,element){const origin=elementalItem(actor)?.effects.get(ELEMENTS[element])?.uuid;return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));}
export function elementalAir(config){return config.roll?.trait==='agility'&&elementalActive(config.data?.parent,'air');}
export function elementalMelee(a,b){const origin=sourceToken(a),target=sourceToken(b);if(!origin||!target)return false;const d=origin.distanceTo(target);return Number.isFinite(d)&&d<=meleeLimit(canvas.scene);}
export function waterTargets(actor,victim){const origin=sourceToken(actor);if(!origin||!elementalMelee(actor,victim))return [];const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene.flags?.daggerheart?.rangeMeasurement;const limit=Number(rules.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:rules.veryClose);const actors=new Map();for(const token of canvas.tokens.placeables){const a=token.actor,d=origin.distanceTo(token);if(a?.type==='adversary'&&a.uuid!==victim.uuid&&!a.statuses?.has('dead')&&Number.isFinite(d)&&d<=limit)actors.set(a.uuid,a);}return [...actors.values()];}
export async function resolveElemental(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||seen.has(request.id))return;
 const source=await fromUuid(request.sourceUuid),target=await fromUuid(request.targetUuid);
 if(!source||!target||(!source.testUserPermission(user,'OWNER')&&!target.testUserPermission(user,'OWNER')))return;
 for(const[id,expiry]of seen)if(expiry<decisionNow())seen.delete(id);seen.set(request.id,decisionNow()+decisionBudget(300000));
 if(request.fire&&elementalItem(target)&&source.type==='adversary'&&elementalMelee(target,source)){
  const roll=await new Roll('1d10',{}, {damageTypes:['magical']}).evaluate();
  await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:target}),flavor:'Elemental Incarnation — Fire retaliation'});
  const multiplier=Number(source.system.rules?.attack?.damage?.hpDamageTakenMultiplier??1),main=roll.toJSON();main.total=Math.ceil(roll.total*multiplier);
  await source.takeDamage({main,resources:{}});
 }
 if(request.severe){const ids=elementalEffects(target).map(e=>e.id).filter(id=>(request.effectIds??[]).includes(id));if(ids.length)await target.deleteEmbeddedDocuments('ActiveEffect',ids);}
 if(request.water&&elementalActive(source,'water')&&target.type==='adversary'){
  const affected=[];for(const other of waterTargets(source,target))if(await markReactiveStress(other.uuid,()=>true))affected.push(other.name);
  if(affected.length)await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:source}),content:`<p><strong>Elemental Incarnation — Water</strong>: ${affected.map(n=>foundry.utils.escapeHTML(n)).join(', ')} mark 1 Stress.</p>`});
 }
}
export function installElementalDamage(Actor,dispatch){const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(args,...rest){
 const sourceUuid=args?.main?.options?.[ID]?.elementalSource;
 const fire=elementalActive(this,'fire'),oldEffects=elementalEffects(this).map(e=>e.id);
 const value=Number(args?.main?.total??args?.main?.value??0),types=args?.main?.options?.damageTypes??args?.main?.damageTypes??[];
 const positive=value>0&&this.calculateDamage(value,types)>0;
 const result=await native.call(this,args,...rest);
 if(result&&sourceUuid&&positive)await dispatch({id:foundry.utils.randomID(),sourceUuid,targetUuid:this.uuid,fire,water:true,severe:severeStormDamage(result),effectIds:oldEffects});
 if(result&&severeStormDamage(result)&&oldEffects.length&&this.isOwner)await this.deleteEmbeddedDocuments('ActiveEffect',oldEffects.filter(id=>this.effects.has(id)));
 return result;
};}
export function registerElementalIncarnation(){
 CONFIG.queries[QUERY]=resolveElemental;
 installElementalDamage(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Elemental Incarnation needs an active GM.');return gm.isSelf?resolveElemental(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,native=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){const result=await native.call(this,roll,config,...args);const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;if(actor&&!config.hasHealing&&config.damage?.main){config.damage.main.options[ID]={...config.damage.main.options[ID],elementalSource:actor.uuid,elementalAttack:game.messages.get(config.source?.message)?.system?.action?.type==='attack'};if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});}return result;};
 const exclusive=effect=>{const actor=effect.parent;if(!game.user.isActiveGM||actor?.documentName!=='Actor'||effect.disabled)return;const effects=elementalEffects(actor);if(!effects.some(e=>e.id===effect.id))return;const ids=effects.filter(e=>e.id!==effect.id).map(e=>e.id);if(ids.length)void actor.deleteEmbeddedDocuments('ActiveEffect',ids).catch(e=>ui.notifications.error(e.message));};
 Hooks.on('createActiveEffect',exclusive);Hooks.on('updateActiveEffect',(effect,change)=>{if(change.disabled===false)exclusive(effect);});
}
