import {ID,featureActive} from '../core.js';
import {damageOptions,damageCallOptions} from '../damage-options.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {absorbingWrites} from './armor-absorbing.js';
import {retributionSource} from './hideous-retribution.js';
import {redirectedLoyalPacket} from './loyal-protector.js';
import {chooseHopePayment,hopeCapacity,refundHope,spendHope} from './hope-payment.js';
import {withHopeLock} from './hope-lock.js';
import {ARCANE_REFLECTION_KEY} from './arcane-reflection-data.js';

const QUERY=ID+'.arcaneReflection',PROMPT=QUERY+'Prompt',WRAP=Symbol.for(QUERY);
const receipts=new Map();
const damageTypes=main=>main?.options?.damageTypes??main?.damageTypes??[];
const esc=text=>foundry.utils.escapeHTML(String(text));

export function reflectionItem(actor){
 if(actor?.type!=='character'||unavailableActor(actor)||hopeCapacity(actor)<1)return null;
 return actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
  (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===ARCANE_REFLECTION_KEY&&
  (!item.system.inVault||item.system.vaultActive)&&!item.system.isDomainTouchedSuppressed)??null;
}
function reflectionPacket(actor,packet){
 const data=bulkyDamagePacket(packet),main=data?.main;
 if(!main||main.options?.[ID]?.arcaneReflection||!damageTypes(main).includes('magical')||!retributionSource(data))return null;
 if(actor.calculateDamage?.(main.total,damageTypes(main))===0)return null;
 return data;
}
async function promptReflection({actorUuid,sourceName,amount},{user}){
 const actor=await fromUuid(actorUuid);
 if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!reflectionItem(actor))return null;
 const options=Array.from({length:Math.floor(hopeCapacity(actor))},(_,index)=>`<option>${index+1}</option>`).join('');
 return timedDialog('Arcane Reflection',
  `<p>${esc(sourceName)} would deal <strong>${esc(amount)} damage</strong>. Roll one d6 per Hope spent. Any 6 reflects the damage.</p>
   <label>Hope to spend <select name="hope">${options}</select></label>`,
  [{action:'reflect',label:'Spend Hope & Roll',callback:(_event,button)=>Number(button.form.elements.hope.value)},
   {action:'decline',label:'Decline',default:true,callback:()=>null}]);
}

export function reflectedPacket(packet,target,caster){
 const adjusted=redirectedLoyalPacket(packet,target,caster);
 return {main:{total:adjusted.main.total,options:{damageTypes:[...damageTypes(packet.main)],
  [ID]:{arcaneReflection:true,retributionSource:{actorUuid:target.uuid}}}},resources:{}};
}

const rollReflection=count=>new Roll(`${count}d6`).evaluate();
async function offerReflection(request,user,ask,rollDice){
 const target=await fromUuid(request.actorUuid),item=reflectionItem(target);
 const packet=item&&reflectionPacket(target,request.packet);
 const caster=packet?await fromUuid(retributionSource(packet)):null;
 if(!game.user.isActiveGM||!user.active||!packet||!['character','adversary','companion'].includes(caster?.type)||
  caster.uuid===target.uuid||(!user.isGM&&!caster.testUserPermission(user,'OWNER')))return false;
 // Only a GM or the caster's owner may send damage back to that caster.
 const owner=ownerFor(target,[...game.users],game.user);
 const data={actorUuid:target.uuid,sourceName:caster.name,amount:packet.main.total};
 const count=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!Number.isSafeInteger(count)||count<1||count>hopeCapacity(target))return false;
 const armor=await chooseHopePayment(target,count,'Arcane Reflection');
 if(armor===null)return false;
 const result=await withHopeLock(target.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!owner.active||!target.testUserPermission(owner,'OWNER')||
   (!user.isGM&&!caster.testUserPermission(user,'OWNER'))||
   reflectionItem(target)?.uuid!==item.uuid||!reflectionPacket(target,packet)||count>hopeCapacity(target))return null;
  const payment=await spendHope(target,count,{choice:armor,label:'Arcane Reflection'});
  try{
   const roll=await rollDice(count);
   const results=roll.dice.flatMap(die=>die.results.filter(row=>row.active!==false));
   if(results.length!==count||results.some(row=>!Number.isInteger(row.result)||row.result<1||row.result>6))throw Error('Could not verify the Arcane Reflection dice.');
   return {roll,reflected:results.some(row=>row.result===6)};
  }catch(error){
   await refundHope(target,payment);
   console.warn(ID+' | Arcane Reflection roll failed',error);
   return null;
  }
 });
 if(!result)return false;
 try{
  const message=await result.roll.toMessage({speaker:ChatMessage.getSpeaker({actor:target}),
   flavor:`<strong>Arcane Reflection</strong><p>${result.reflected?`Damage reflected to ${esc(caster.name)}.`:'No 6 rolled. Resolve the incoming damage normally.'}</p>`});
  if(message?.id&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
 }catch(error){console.warn(ID+' | Arcane Reflection chat',error);}
 if(!result.reflected)return false;
 // Recipient defenses receive a new packet with the reflector as its source.
 // The marker prevents a return trip if the caster also has Arcane Reflection.
 await absorbingWrites(caster,()=>caster.takeDamage(reflectedPacket(packet,target,caster),
  damageCallOptions({isDirect:request.isDirect,actionUuid:null})));
 return true;
}

export async function resolveArcaneReflection(request,{user},ask=promptReflection,rollDice=rollReflection){
 if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||
  typeof request.actorUuid!=='string'||typeof request.isDirect!=='boolean')return false;
 const key=user.id+':'+request.id,signature=JSON.stringify(request),prior=receipts.get(key);
 if(prior)return prior.signature===signature?prior.promise:false;
 const promise=offerReflection(request,user,ask,rollDice);
 receipts.set(key,{signature,promise});
 if(receipts.size>512)receipts.delete(receipts.keys().next().value);
 return promise;
}

export function installArcaneReflection(Actor,send){
 if(!Actor||Object.hasOwn(Actor,WRAP))return;
 const native=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(packet,...args){
  const candidate=reflectionItem(this)&&reflectionPacket(this,packet);
  if(!candidate)return native.call(this,packet,...args);
  const reflected=await send({id:foundry.utils.randomID(),actorUuid:this.uuid,packet:candidate,...damageOptions(args[0])});
  if(!reflected)return native.call(this,packet,...args);
  return Object.keys(candidate.resources).length?native.call(this,{resources:candidate.resources},...args):[];
 };
 Object.defineProperty(Actor,WRAP,{value:true});
}

export function registerArcaneReflection(){
 CONFIG.queries[QUERY]=resolveArcaneReflection;
 CONFIG.queries[PROMPT]=promptReflection;
 installArcaneReflection(CONFIG.Actor.documentClass,request=>{
  const gm=game.users.activeGM;
  if(!gm)return false;
  return gm.isSelf?resolveArcaneReflection(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(605000)});
 });
}
