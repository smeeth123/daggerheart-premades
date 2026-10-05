import {ID,clone,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {WEAPON_PARRY_KEY} from './weapon-parry-data.js';
const QUERY=`${ID}.weaponParry`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
export function parryWeapons(actor){return actor?.type==='character'?[...(actor.items?.values?.()??actor.items??[])].filter(item=>item?.type==='weapon'&&
 item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_PARRY_KEY&&
 item.system.weaponFeatures?.some(f=>f.value==='parry')):[];}
export function parryFormula(item){
 const value=item.system.attack?.damage?.main?.value;if(!value)return null;
 const formula=value.getFormula?.()??(value.custom?.enabled?value.custom.formula:
  `${value.multiplier==='flat'?value.flatMultiplier:`@${value.multiplier}`}`+value.dice);
 const roll=new Roll(formula,item.actor.getRollData());
 const dice=roll.dice.filter(die=>Number.isInteger(Number(die.number))&&Number(die.number)>0&&Number.isInteger(Number(die.faces))&&Number(die.faces)>=2);
 // Keep dice and their native keep/drop modifiers, not damage's flat bonuses.
 return dice.length?dice.map(die=>`${die.number}d${die.faces}${(die.modifiers??[]).join('')}`).join(' + '):null;
}
function refresh(roll){
 for(const term of roll.terms??[])if(Array.isArray(term.roll?.terms))refresh(term.roll);
 roll._total=roll._evaluateTotal();roll.resetFormula?.();
}
export function discardParryMatches(roll,values){
 const matches=new Set(values),discarded=[];
 for(const [d,die]of (roll.dice??[]).entries())for(const [r,result]of (die.results??[]).entries()){
  if(result.active===false||result.discarded||result.dhpDamageRerollReplaced||!matches.has(Number(result.result)))continue;
  result.active=false;result.discarded=true;discarded.push({die:d,result:r,value:Number(result.result),faces:Number(die.faces)});
 }
 if(discarded.length)refresh(roll);return discarded;
}
export function tagParryAttack(config){
 const main=config.damage?.main,source=config.source,actor=config.data?.parent??(source?.actor?foundry.utils.fromUuidSync(source.actor):null);
 if(config.hasHealing||!main?.dice?.length||!source?.action||actor?.uuid!==source.actor)return false;
 const item=actor.items?.get?.(source.item),action=item?.system.attack?.id===source.action?item.system.attack:
  item?.system.actions?.get?.(source.action)??item?.system.actions?.[source.action]??(actor.system.attack?.id===source.action?actor.system.attack:null);
 if(action?.type!=='attack')return false;
 const snapshot=clone(main.toJSON());delete snapshot.options?.[ID]?.parryAttack;delete snapshot.options?.[ID]?.parryResolved;
 main.options[ID]={...main.options[ID],parryAttack:{id:foundry.utils.randomID(),source:clone(source),roll:snapshot,
  targets:[...new Set((config.targets??[]).map(target=>target.actorId).filter(Boolean))]}};
 const damage=config.damage;
 if(typeof damage.toObject==='function')config.damage=new damage.constructor({...damage.toObject(),main:main.toJSON(),
  resources:Object.fromEntries(Object.entries(damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
 return true;
}
export function parryPacketState(packet,holder){
 const main=packet?.main??(Number.isFinite(packet?.total)?packet:null),record=main?.options?.[ID]?.parryAttack;
 if(!Number.isFinite(main?.total)||main.total<=0||!record?.targets?.includes(holder.uuid)||!parryWeapons(holder).length||
  main.options[ID].parryResolved?.includes(holder.uuid)||!record.roll?.terms?.length)return null;
 const roll=Roll.fromData(clone(record.roll));refresh(roll);
 if(!roll.dice.some(die=>die.results?.some(result=>result.active!==false&&!result.discarded)))return null;
 return {main,record,roll};
}
export async function resolveParry(request,{user},rollDice=async formula=>new Roll(formula).evaluate()){
 if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request?.deadline)||request.deadline<=decisionNow()||
  request.deadline>decisionNow()+decisionBudget(125000)||typeof request.record?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.record.id))return false;
 const holder=await fromUuid(request.holderUuid),source=request.record.source,attacker=await fromUuid(source?.actor),
  message=source?.message?game.messages.get(source.message):null;
 const item=attacker?.items?.get?.(source?.item),action=item?.system.attack?.id===source?.action?item.system.attack:
  item?.system.actions?.get?.(source?.action)??item?.system.actions?.[source?.action]??(attacker?.system.attack?.id===source?.action?attacker.system.attack:null);
 if(!holder||!attacker||typeof source?.action!=='string'||!source.action||action?.type!=='attack'||!request.record.targets?.includes(holder.uuid)||!parryWeapons(holder).length)return false;
 // Only the actual attacker/GM may submit transient automatic damage. An
 // owning defender must reference the same already-posted attack dice.
 if(!user.isGM&&!attacker.testUserPermission(user,'OWNER')&&
  (!holder.testUserPermission(user,'OWNER')||JSON.stringify(message?.system?.damage?.main?.options?.[ID]?.parryAttack)!==JSON.stringify(request.record)))return false;
 const key=`${holder.uuid}:${request.record.id}`;if(receipts.has(key))return receipts.get(key);
 const operation=(async()=>{
  const weapons=parryWeapons(holder),roll=Roll.fromData(clone(request.record.roll));refresh(roll);const before=Number(roll.total);
  if(!Number.isFinite(before)||before<=0)return false;
  const values=[],rolled=[];
  for(const weapon of weapons){
   const formula=parryFormula(weapon);if(!formula)continue;
   const defense=await rollDice(formula);
   const results=(defense.dice??[]).flatMap(die=>(die.results??[]).filter(result=>result.active!==false&&!result.discarded).map(result=>Number(result.result)));
   if(!results.length||results.some(value=>!Number.isInteger(value)||value<1))throw Error('Parry produced invalid damage dice.');
   values.push(...results);rolled.push({weapon,defense,results});
  }
  if(!rolled.length)return false;
  if(!game.user.isActiveGM||!user.active||request.deadline<=decisionNow()||
   !weapons.every(weapon=>parryWeapons(holder).some(current=>current.uuid===weapon.uuid)))return false;
  const discarded=discardParryMatches(roll,values),after=Math.max(0,Number(roll.total));
  const outcome={before,after,discarded,values};
  for(const entry of rolled)try{
   const msg=await entry.defense.toMessage({speaker:ChatMessage.getSpeaker({actor:holder}),
    whisper:[...(message?.whisper??[])],blind:Boolean(message?.blind),flags:{[ID]:{unshakeableRoll:true}},
    flavor:`<strong>Parry</strong> — ${discarded.length} matching damage dice discarded for ${String(holder.name??'the wielder').replace(/[<>&]/g,'')}.`});
   if(msg&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(msg.id);
  }catch(error){console.warn(`${ID} | Parry dice notification`,error);}
  return outcome;
 })();receipts.set(key,operation);if(receipts.size>1000)receipts.delete(receipts.keys().next().value);return operation;
}
export function applyParryPacket(packet,holder,result){
 const state=parryPacketState(packet,holder);if(!state||!result||!Number.isFinite(result.before)||result.before<=0||!Number.isFinite(result.after))return packet;
 const multiplier=Number(holder.system?.rules?.attack?.damage?.hpDamageTakenMultiplier??1),
  before=Math.ceil(result.before*multiplier),after=Math.ceil(Math.min(result.before,Math.max(0,result.after))*multiplier),
  total=Math.max(0,state.main.total===before?after:Math.ceil(state.main.total*(before>0?after/before:0))),meta=state.main.options[ID],
  adjusted={total,options:{...state.main.options,[ID]:{...meta,...(Number.isFinite(meta.loyalBaseDamage)?{loyalBaseDamage:result.after}:{}),parryResolved:[...(meta.parryResolved??[]),holder.uuid]}}};
 return state.main===packet?{...adjusted,resources:packet.resources}:{...packet,main:adjusted,resources:packet.resources};
}
export function installParry(Damage,Actor,dispatch){
 if(Damage&&!Object.hasOwn(Damage,WRAPPED)){
  const post=Damage.buildPost;Damage.buildPost=async function(roll,config,...args){tagParryAttack(config);return post.call(this,roll,config,...args);};
  Object.defineProperty(Damage,WRAPPED,{value:true});
 }
 if(Actor&&!Object.hasOwn(Actor,WRAPPED)){
  const take=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(packet,...args){
   const state=parryPacketState(packet,this);if(!state)return take.call(this,packet,...args);
   const result=await dispatch({holderUuid:this.uuid,record:state.record,deadline:decisionNow()+decisionBudget(120000)});
   return take.call(this,applyParryPacket(packet,this,result),...args);
  };Object.defineProperty(Actor,WRAPPED,{value:true});
 }
}
export function registerWeaponParry(){
 CONFIG.queries[QUERY]=resolveParry;
 installParry(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,request=>{
  const gm=game.users.activeGM;if(!gm)throw Error('Parry needs an active GM.');
  return gm.isSelf?resolveParry(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
 });
 Hooks.on('daggerheart.preUseAction',action=>{
  if(parryWeapons(action.actor).some(item=>item.uuid===action.item?.uuid&&item.system.weaponFeatures.some(f=>f.value==='parry'&&f.actionIds?.includes(action.id)))){
   ui.notifications.info('Parry rolls automatically when attack damage is applied to you.');return false;
  }
 });
}
