import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {markReactiveStress} from './stress-payment.js';
import {BLIGHTING_KEY,BLIGHTING_ACTION,BLIGHTING_EFFECT} from './blighting-strike-data.js';
import {resolvedAttackOutcome,attackHitTargets} from '../attack-outcome.js';

const QUERY=`${ID}.blightingStrike`,PROMPT=`${QUERY}Prompt`;
const TARGET_WRAP=Symbol.for(`${QUERY}Targets`),FORMULA_WRAP=Symbol.for(`${QUERY}Formula`),DAMAGE_WRAP=Symbol.for(`${QUERY}Damage`),APPLY_WRAP=Symbol.for(`${QUERY}Apply`);
const pending=new Set();

export function blightingAction(action){
  const item=action?.item,flags=item?.flags?.[ID],system=item?.system;
  return Boolean(action?.id===BLIGHTING_ACTION&&action.type==='attack'&&item?.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===BLIGHTING_KEY);
}
export function blightedEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.flags?.[ID]?.blightingStrike===true);
}
export function blightingDice(roll){
  return !roll?.isCritical&&(roll?.withFear===true||roll?.result?.duality===-1)?'d10':'d6';
}
export function blightingOutcome(message){
  return resolvedAttackOutcome(message);
}
function hitTargets(message){
  return attackHitTargets(message);
}
const paymentOptions=actor=>({hope:Number(actor.system.resources?.hope?.value)>=1,
  stress:Number(actor.system.resources?.stress?.value)<Number(actor.system.resources?.stress?.max)});

export async function promptBlightingFailure(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER'))return null;
  const options=paymentOptions(actor),buttons=[];
  if(options.hope)buttons.push({action:'hope',label:data.unknown?'Failed — Spend 1 Hope':'Spend 1 Hope',callback:()=> 'hope'});
  if(options.stress)buttons.push({action:'stress',label:data.unknown?'Failed — Mark 1 Stress':'Mark 1 Stress',callback:()=> 'stress'});
  buttons.push({action:'manual',label:data.unknown?'Not Failed / Resolve Manually':'Resolve Manually',default:true,callback:()=>null});
  return timedDialog(`Blighting Strike — ${actor.name}`,
    data.unknown?'<p>The outcome is unknown. If this cast failed, spend <strong>1 Hope</strong> or mark <strong>1 Stress</strong>.</p>':
      '<p>Blighting Strike failed. You must spend <strong>1 Hope</strong> or mark <strong>1 Stress</strong>. Resolve manually if neither is available.</p>',buttons);
}

export async function resolveBlightingStrike(request,{user},ask=promptBlightingFailure){
  if(!game.user.isActiveGM||!user?.active||!['cast','consume'].includes(request.op)||!Number.isFinite(request.deadline)||
    request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const message=await fromUuid(request.messageUuid),action=message?.system?.action,actor=action?.actor;
  if(!actor?.testUserPermission(user,'OWNER')||action.type!=='attack'||!Number.isFinite(message.system.roll?.total))return false;
  const key=`${request.op}:${request.messageUuid}`;
  if(pending.has(key))return false;pending.add(key);
  const authorized=()=>game.user.isActiveGM&&user.active&&actor.testUserPermission(user,'OWNER')&&request.deadline>decisionNow();
  try{
    if(request.op==='consume')return await withHopeLock(`blight:${actor.uuid}`,async()=>{
      if(!authorized()||blightingOutcome(message)!=='success'||!Array.isArray(request.effectIds)||message.flags?.[ID]?.blightingHalfDamage)return false;
      const ids=blightedEffects(actor).map(effect=>effect.id).filter(id=>request.effectIds.includes(id));if(!ids.length)return false;
      const record={actorUuid:actor.uuid,effectIds:ids};
      await message.setFlag(ID,'blightingHalfDamage',record);
      try{await actor.deleteEmbeddedDocuments('ActiveEffect',ids);}catch(error){await message.unsetFlag(ID,'blightingHalfDamage');throw error;}
      return record;
    });
    if(!authorized()||!blightingAction(action)||message.flags?.[ID]?.blightingCast)return false;
    let outcome=blightingOutcome(message);
    if(outcome==='success'){
      const template=action.item.effects?.get?.(BLIGHTING_EFFECT),targets=[...new Set(hitTargets(message).map(target=>target.actorId))];
      if(!template)return false;
      for(const uuid of targets){
        const target=await fromUuid(uuid);if(!target||blightedEffects(target).length)continue;
        if(!authorized()||!blightingAction(action)||blightingOutcome(message)!=='success')return false;
        await game.system.api.fields.ActionFields.EffectsField.applyEffect(template,target);
      }
      await message.setFlag(ID,'blightingCast',{outcome:'success',targets});return true;
    }
    const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,unknown:outcome==='unknown'};
    const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(!['hope','stress'].includes(choice)||!owner.active||!user.active||request.deadline<=decisionNow()){
      await message.setFlag(ID,'blightingCast',{outcome,cost:'unresolved'});return false;
    }
    const eligible=current=>authorized()&&owner.active&&current.testUserPermission(user,'OWNER')&&current.testUserPermission(owner,'OWNER')&&
      blightingAction(action)&&blightingOutcome(message)!=='success'&&request.deadline>decisionNow()&&!message.flags?.[ID]?.blightingCast;
    let paid=false;
    if(choice==='hope')paid=await withHopeLock(actor.uuid,async()=>{
      const current=await fromUuid(actor.uuid),hope=Number(current?.system.resources?.hope?.value);
      if(!current||!eligible(current)||hope<1)return false;
      const updated=await current.update({'system.resources.hope.value':hope-1});
      if(!updated||Number(current.system.resources.hope.value)!==hope-1)throw Error('Blighting Strike could not spend Hope.');return true;
    });
    else paid=await markReactiveStress(actor.uuid,eligible);
    await message.setFlag(ID,'blightingCast',{outcome:'failure',cost:paid?choice:'unresolved'});
    return paid;
  }finally{pending.delete(key);}
}

export function tagBlightingDamage(config,message=game.messages.get(config.source?.message)){
  const main=config.damage?.main,record=config[ID]?.blightingHalfDamage??message?.flags?.[ID]?.blightingHalfDamage;
  if(config.hasHealing||!main||!record||message?.system.action?.type!=='attack')return false;
  main.options??={};
  main.options[ID]={...main.options[ID],blightingHalfDamage:{messageUuid:message.uuid,actorUuid:record.actorUuid}};
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({
    ...config.damage.toObject(),main:main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))
  });
  return true;
}
export function blightingPacket(packet){
  const main=packet?.main??(Number.isFinite(packet?.total)?packet:null),meta=main?.options?.[ID];
  if(!Number.isFinite(main?.total)||!meta?.blightingHalfDamage||meta.blightingHalved)return packet;
  const adjusted={...main,total:Math.ceil(Math.max(0,main.total)/2),options:{...main.options,[ID]:{...meta,blightingHalved:true}}};
  return main===packet?{...adjusted,resources:packet.resources}:{...packet,main:adjusted,resources:packet.resources};
}

export function installBlightingTargets(TargetField,dispatch){
  if(TargetField[TARGET_WRAP])return;const native=TargetField.execute;
  TargetField.execute=async function(config,...args){
    const ids=this.type==='attack'?blightedEffects(this.actor).map(effect=>effect.id):[],result=await native.call(this,config,...args);
    if(result===false||this.type!=='attack'||!config.message||!Number.isFinite(config.message.system.roll?.total))return result;
    const base={messageUuid:config.message.uuid,deadline:decisionNow()+decisionBudget(120000)};
    if(ids.length&&blightingOutcome(config.message)==='success'){
      const record=await dispatch({op:'consume',...base,effectIds:ids});
      // A GM query can finish before the flag broadcast reaches the rolling client.
      if(record)(config[ID]??={}).blightingHalfDamage=record;
    }
    if(blightingAction(this)){
      if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);
      await dispatch({op:'cast',...base});
    }
    // Damage can already have been rolled (order 20), but native application is later (order 75).
    if(tagBlightingDamage(config,config.message))await config.message.update({'system.damage':config.damage.toObject?.()??config.damage});
    return result;
  };
  Object.defineProperty(TargetField,TARGET_WRAP,{value:true});
}

export function installBlightingDamage(DamageField,DamageRoll,Actor){
  if(!DamageField[FORMULA_WRAP]){
    const formula=DamageField.getFormulaValue;
    DamageField.getFormulaValue=function(part,config,...args){
      if(blightingAction(this)&&part.resultBased)return blightingDice(config.message?.system.roll??config.roll)==='d10'?part.valueAlt:part.value;
      return formula.call(this,part,config,...args);
    };
    Object.defineProperty(DamageField,FORMULA_WRAP,{value:true});
  }
  if(!DamageRoll[DAMAGE_WRAP]){
    const native=DamageRoll.buildEvaluate;
    DamageRoll.buildEvaluate=async function(roll,config,...args){const result=await native.call(this,roll,config,...args);tagBlightingDamage(config);return result;};
    Object.defineProperty(DamageRoll,DAMAGE_WRAP,{value:true});
  }
  if(!Actor[APPLY_WRAP]){
    const native=Actor.prototype.takeDamage;
    Actor.prototype.takeDamage=async function(packet,...args){return native.call(this,blightingPacket(packet),...args);};
    Object.defineProperty(Actor,APPLY_WRAP,{value:true});
  }
}

export function registerBlightingStrike(){
  CONFIG.queries[QUERY]=resolveBlightingStrike;CONFIG.queries[PROMPT]=promptBlightingFailure;
  const dispatch=request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Blighting Strike needs an active GM.');
    return gm.isSelf?resolveBlightingStrike(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  };
  const fields=game.system.api.fields.ActionFields;
  // Register after shared attack resolution so this wrapper sees finalized defensive rerolls.
  installBlightingTargets(fields.TargetField,dispatch);
  installBlightingDamage(fields.DamageField,CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass);
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible||html.querySelector('.dhp-blighting-note'))return;
    const half=message.flags?.[ID]?.blightingHalfDamage,cast=message.flags?.[ID]?.blightingCast;
    if(!half&&(!cast||cast.outcome==='success'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-blighting-note';
    const total=message.system?.damage?.main?.total;
    note.textContent=half?`Blighting Strike: this attack deals half damage${Number.isFinite(total)?` (${Math.ceil(total/2)})`:''}.`:
      cast.cost==='unresolved'?'Blighting Strike: outcome or failure cost unresolved; resolve manually.':`Blighting Strike: failed; ${cast.cost==='hope'?'spent 1 Hope':'marked 1 Stress'}.`;
    html.querySelector('.message-content')?.append(note);
  });
}
