import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {WHIRLWIND_KEY,WHIRLWIND_ACTION} from './whirlwind-data.js';

const QUERY=`${ID}.whirlwind`,PROMPT=`${QUERY}Prompt`;
const TARGET_WRAP=Symbol.for(`${QUERY}Targets`),DAMAGE_WRAP=Symbol.for(`${QUERY}Damage`),APPLY_WRAP=Symbol.for(`${QUERY}Apply`);
const pending=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function whirlwindItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items?.find(item=>{
    const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
      (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&
      (flags?.applied?.key??flags?.premade?.key)===WHIRLWIND_KEY;
  })??null;
}

export function whirlwindRange(){
  const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
  const local=canvas.scene?.flags?.daggerheart?.rangeMeasurement;
  return Number(rules.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:rules.veryClose);
}

export function whirlwindSuccess(roll,target){
  const threshold=target.difficulty??target.evasion;
  return Number.isFinite(roll?.total)&&Boolean(roll.isCritical||roll.options?.[ID]?.trueStrike||roll.options?.[ID]?.witchsCharm||
    Number.isFinite(threshold)&&roll.total>=threshold);
}

export function whirlwindState(message,originUuid=null){
  const data=message?.system,action=data?.action,actor=action?.actor,roll=data?.roll;
  if(!canvas.ready||action?.type!=='attack'||action.actionType==='reaction'||!data.targets?.length||!whirlwindItem(actor)||!Number.isFinite(roll?.total))return null;
  const origin=originUuid?canvas.tokens.placeables.find(token=>token.document.uuid===originUuid&&token.actor?.uuid===actor.uuid):sourceToken(actor);
  const limit=whirlwindRange();
  if(!origin||!Number.isFinite(limit)||limit<0)return null;
  const inRange=token=>{const distance=token&&origin.distanceTo(token);return Number.isFinite(distance)&&distance>=0&&distance<=limit;};
  const originals=data._getCurrentTargets?.()??data.targets??[];
  if(!originals.some(target=>{
    const token=canvas.tokens.get(target.id);
    return token?.actor?.uuid===target.actorId&&inRange(token)&&
      (target.hitResult?.success??whirlwindSuccess(roll,target));
  }))return null;
  // Exclude all original targets, including original misses, and linked copies of their actors.
  const excluded=new Set((data.targets??[]).map(target=>target.actorId));excluded.add(actor.uuid);
  const seen=new Set(excluded),targets=[];
  for(const token of canvas.tokens.placeables){
    const target=token.actor,hp=target?.system?.resources?.hitPoints;
    if(target?.type!=='adversary'||seen.has(target.uuid)||token.document.hidden||unavailableActor(target)||
      hp&&Number(hp.value)>=Number(hp.max)||!inRange(token))continue;
    seen.add(target.uuid);
    const entry={id:token.id,actorId:target.uuid,name:token.name??target.name,img:target.img,
      difficulty:target.system.difficulty??null,evasion:target.system.evasion??0};
    entry.hitResult={success:whirlwindSuccess(roll,entry)};targets.push(entry);
  }
  return targets.length?{actor,origin,targets}:null;
}

export async function promptWhirlwind(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!whirlwindItem(actor)||Number(actor.system.resources?.hope?.value)<1)return false;
  return Boolean(await timedDialog(`Whirlwind — ${actor.name}`,
    `<p>Spend <strong>1 Hope</strong> to use this attack (${Number(data.total)}) against the other adversaries within Very Close? Original targets keep normal damage; additional hits take <strong>half damage</strong>.</p>`+
    data.targets.map(target=>`<p>${esc(target.name)} — <strong>${target.hitResult.success?'Hit (half damage)':'Miss'}</strong></p>`).join(''),
    [{action:'use',label:'Spend 1 Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]
  ));
}

export async function resolveWhirlwind(request,{user},ask=promptWhirlwind){
  if(!game.user.isActiveGM||!user?.active||typeof request.messageUuid!=='string'||pending.has(request.messageUuid)||
    !Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const message=await fromUuid(request.messageUuid);
  let state=whirlwindState(message,request.originUuid);
  if(!state||!state.actor.testUserPermission(user,'OWNER')||Number(state.actor.system.resources?.hope?.value)<1||
    message.flags?.[ID]?.whirlwindOffered||message.flags?.[ID]?.whirlwind)return false;
  pending.add(request.messageUuid);
  try{
    await message.setFlag(ID,'whirlwindOffered',true);
    const owner=ownerFor(state.actor,[...game.users],game.user);
    const data={actorUuid:state.actor.uuid,total:message.system.roll.total,targets:state.targets};
    const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(accepted!==true||!owner.active||!user.active||request.deadline<=decisionNow())return false;
    return await withHopeLock(state.actor.uuid,async()=>{
      const fresh=whirlwindState(message,request.originUuid),hope=Number(fresh?.actor.system.resources?.hope?.value);
      if(!fresh||!whirlwindItem(fresh.actor)||!fresh.actor.testUserPermission(user,'OWNER')||!user.active||hope<1||
        request.deadline<=decisionNow()||message.flags?.[ID]?.whirlwind)return false;
      // A changed candidate set needs a new decision, not unapproved new targets.
      const signature=targets=>JSON.stringify(targets.map(target=>[target.id,target.actorId,target.difficulty,target.evasion,target.hitResult.success]).sort());
      if(signature(fresh.targets)!==signature(state.targets))return false;
      const record={actorUuid:fresh.actor.uuid,originUuid:fresh.origin.document.uuid,targets:fresh.targets};
      const paid=await fresh.actor.update({'system.resources.hope.value':hope-1});
      if(!paid)throw Error('Whirlwind could not spend Hope.');
      try{
        const updated=await message.update({'system.targets':[...message.system.targets,...fresh.targets],[`flags.${ID}.whirlwind`]:record});
        if(!updated)throw Error('Whirlwind could not add its targets.');
      }catch(error){await fresh.actor.update({'system.resources.hope.value':hope});throw error;}
      return record;
    });
  }finally{pending.delete(request.messageUuid);}
}

export function installWhirlwindTargets(RollField,dispatch){
  if(RollField[TARGET_WRAP])return;
  const native=RollField.execute;
  // Native damage and targeting both have order 20, with damage first.
  // Expand after RollField (order 10), not after TargetField: automatic damage must carry the tag too.
  RollField.execute=async function(config,...args){
    const result=await native.call(this,config,...args);
    if(result===false||!config.message||config.hasHealing||config.actionType==='reaction'||!whirlwindItem(this.actor)||config[ID]?.whirlwind)return result;
    const state=whirlwindState(config.message);
    if(!state||Number(this.actor.system.resources?.hope?.value)<1||config.message.flags?.[ID]?.whirlwindOffered)return result;
    const record=await dispatch({messageUuid:config.message.uuid,originUuid:state.origin.document.uuid,deadline:decisionNow()+decisionBudget(120000)});
    if(record){
      const existing=new Set((config.targets??[]).map(target=>target.id));
      config.targets=[...(config.targets??[]),...record.targets.filter(target=>!existing.has(target.id))];
      config[ID]={...config[ID],whirlwind:record};
    }
    return result;
  };
  Object.defineProperty(RollField,TARGET_WRAP,{value:true});
}

export function installWhirlwindDamage(Damage){
  if(Damage[DAMAGE_WRAP])return;
  const native=Damage.buildEvaluate;
  Damage.buildEvaluate=async function(roll,config,...args){
    const result=await native.call(this,roll,config,...args);
    const message=game.messages.get(config.source?.message),record=message?.flags?.[ID]?.whirlwind??config[ID]?.whirlwind;
    const main=config.damage?.main;
    if(!config.hasHealing&&main&&record){
      main.options[ID]={...main.options[ID],whirlwind:{messageUuid:message?.uuid,targets:record.targets}};
      if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({
        ...config.damage.toObject(),main:main.toJSON(),
        resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))
      });
    }
    return result;
  };
  Object.defineProperty(Damage,DAMAGE_WRAP,{value:true});
}

export function whirlwindPacket(packet,actor){
  const main=packet?.main??(Number.isFinite(packet?.total)?packet:null),meta=main?.options?.[ID];
  if(!Number.isFinite(main?.total)||meta?.whirlwindHalved||!meta?.whirlwind?.targets?.some(target=>target.actorId===actor.uuid))return packet;
  const adjusted={total:Math.ceil(Math.max(0,main.total)/2),options:{...main.options,[ID]:{...meta,whirlwindHalved:true}}};
  // Do not clone ChatDamageData: that restores the unadjusted source total.
  return main===packet?{...adjusted,resources:packet.resources}:{...packet,main:adjusted,resources:packet.resources};
}

export function installWhirlwindApply(Actor){
  if(Actor[APPLY_WRAP])return;
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(packet,...args){return native.call(this,whirlwindPacket(packet,this),...args);};
  Object.defineProperty(Actor,APPLY_WRAP,{value:true});
}

export function registerWhirlwind(){
  CONFIG.queries[QUERY]=resolveWhirlwind;CONFIG.queries[PROMPT]=promptWhirlwind;
  const dispatch=request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Whirlwind needs an active GM.');
    return gm.isSelf?resolveWhirlwind(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  };
  installWhirlwindTargets(game.system.api.fields.ActionFields.RollField,dispatch);
  installWhirlwindDamage(CONFIG.Dice.daggerheart.DamageRoll);
  installWhirlwindApply(CONFIG.Actor.documentClass);
  Hooks.on('daggerheart.preUseAction',action=>{
    if(action.id===WHIRLWIND_ACTION&&whirlwindItem(action.actor)?.uuid===action.item?.uuid){
      ui.notifications.info('Whirlwind is offered after a successful attack against a target within Very Close.');return false;
    }
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const record=message.flags?.[ID]?.whirlwind;
    if(!message.isContentVisible||!record||html.querySelector('.dhp-whirlwind'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-whirlwind';
    const total=message.system?.damage?.main?.total;
    note.textContent=`Whirlwind: spent 1 Hope. ${record.targets.map(target=>`${target.name}: ${target.hitResult.success?`half damage${Number.isFinite(total)?` (${Math.ceil(total/2)})`:''}`:'miss'}`).join('; ')}.`;
    html.querySelector('.message-content')?.append(note);
  });
}
