import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {AVOIDED,prioritizeFaerieWings} from './faerie-wings.js';
import {flightCastSuccess} from './flight.js';
import {withHopeLock} from './hope-lock.js';
import {markReactiveStress} from './stress-payment.js';
import {CONFUSING_AURA_ACTION,CONFUSING_AURA_KEY} from './confusing-aura-data.js';

const QUERY=ID+'.confusingAura',PROMPT=QUERY+'Prompt',WRAP=Symbol.for(QUERY);
const boundWorkflows=new WeakSet();
export function auraCard(actor){
 if(actor?.type!=='character'||unavailableActor(actor))return null;
 return actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
  (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===CONFUSING_AURA_KEY)??null;
}
export function auraLayers(item){
 const count=Number(item?.system?.resource?.value);
 return Number.isSafeInteger(count)&&count>0?count:0;
}
const available=item=>item&&(!item.system.inVault||item.system.vaultActive)&&!item.system.isDomainTouchedSuppressed;
function stressCapacity(actor){
 const {max,value}=actor.system.resources.stress;
 return Math.max(0,Math.floor(Number(max)-Number(value)))||0;
}
async function askLayers({actorUuid},{user}){
 const actor=await fromUuid(actorUuid);
 if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!available(auraCard(actor)))return 0;
 const max=stressCapacity(actor);
 if(!max)return 0;
 const values=Array.from({length:max+1},(_,index)=>`<option>${index}</option>`).join('');
 return timedDialog('Confusing Aura','<p>You created one layer. Mark Stress to add one layer per Stress marked.</p>'+
  `<label>Additional layers <select name="layers">${values}</select></label>`,[
  {action:'add',label:'Confirm Layers',callback:(_event,button)=>Number(button.form.elements.layers.value)},
  {action:'base',label:'Keep One Layer',default:true,callback:()=>0}
 ]);
}
async function writeLayers(item,count,flags={}){
 const updated=await item.update({'system.resource.value':count,...flags});
 if(!updated||auraLayers(item)!==count)throw Error('Could not confirm the Confusing Aura layer count.');
}
const rollLayers=count=>new Roll(`${count}d6`).evaluate();
async function rollDefense(count,rollDice){
 const roll=await rollDice(count);
 const values=roll.dice.flatMap(die=>die.results.filter(row=>row.active!==false&&!row.discarded).map(row=>row.result));
 if(values.length!==count||values.some(value=>!Number.isInteger(value)||value<1||value>6))throw Error('Could not verify the Confusing Aura dice.');
 return {roll,blocked:values.some(value=>value>=5)};
}
async function postDefense(actor,message,roll,blocked,layers){
 try{
  const card=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),whisper:[...(message.whisper??[])],blind:Boolean(message.blind),
   flavor:`<strong>Confusing Aura</strong><p>${blocked?`Attack blocked. ${layers} layers remain.`:'The aura ends. Resolve the attack normally.'}</p>`});
  if(card?.id&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(card.id);
 }catch(error){console.warn(ID+' | Confusing Aura chat',error);}
}

export async function resolveConfusingAura(request,{user},{ask=askLayers,rollDice=rollLayers,pay=markReactiveStress}={}){
 if(!game.user.isActiveGM||!user?.active||!['cast','defend'].includes(request?.mode)||
  typeof request.messageUuid!=='string'||typeof request.actorUuid!=='string')return false;
 const message=await fromUuid(request.messageUuid),data=message?.system,action=data?.action,source=action?.actor;
 if(!source?.testUserPermission(user,'OWNER')||data.source?.actor!==source.uuid)return false;
 const actor=request.mode==='cast'?source:await fromUuid(request.actorUuid),item=auraCard(actor);
 if(!item||actor.uuid!==request.actorUuid)return false;
 if(request.mode==='cast'){
  if(!available(item)||action.id!==CONFUSING_AURA_ACTION||action.item?.uuid!==item.uuid||
   data.source?.action!==CONFUSING_AURA_ACTION||!flightCastSuccess(message))return false;
  return withHopeLock('confusing-aura:'+item.uuid,async()=>{
   if(auraCard(actor)?.uuid!==item.uuid||message.flags?.[ID]?.confusingAuraCast||
    item.flags?.[ID]?.confusingAuraCast===message.uuid)return false;
   await writeLayers(item,1,{[`flags.${ID}.confusingAuraCast`]:message.uuid});
   if(!await message.setFlag(ID,'confusingAuraCast',true))throw Error('Could not record the Confusing Aura cast.');
   if(!stressCapacity(actor))return true;
   const owner=ownerFor(actor,[...game.users],game.user),input={actorUuid:actor.uuid};
   const count=owner.isSelf?await ask(input,{user:game.user}):await owner.query(PROMPT,input,{timeout:decisionBudget(65000)});
   const eligible=current=>game.user.isActiveGM&&user.active&&owner.active&&
    current.testUserPermission(owner,'OWNER')&&auraCard(current)?.uuid===item.uuid&&available(item)&&auraLayers(item)===1;
   if(Number.isSafeInteger(count)&&count>0&&eligible(actor)&&count<=stressCapacity(actor)&&await pay(actor.uuid,eligible,count)){
    await writeLayers(item,1+count);
   }
   return true;
  });
 }
 const roll=data.roll,target=data.targets?.find(row=>row.id===request.targetId&&row.actorId===actor.uuid);
 if(source.type!=='adversary'||action.type!=='attack'||data.source.action!==action.id||!target||!Number.isFinite(roll?.total)||roll?._evaluated===false)return false;
 return withHopeLock(message.uuid,()=>withHopeLock('confusing-aura:'+item.uuid,async()=>{
  const previous=message.flags?.[ID]?.confusingAura??[];
  const prior=previous.find(row=>row.actorId===actor.uuid&&row.id===target.id);
  if(prior)return prior;
  const count=auraLayers(item);
  if(!game.user.isActiveGM||!user.active||!source.testUserPermission(user,'OWNER')||auraCard(actor)?.uuid!==item.uuid||!count)return false;
  const {roll:defense,blocked}=await rollDefense(count,rollDice);
  const layers=blocked?count-1:0,record={id:target.id,actorId:actor.uuid,blocked};
  await writeLayers(item,layers);
  // Read the current records after rolling so other targets retain their decisions.
  try{
   const saved=await message.setFlag(ID,'confusingAura',[...previous,record]);
   if(!saved)throw Error('Could not save the Confusing Aura outcome on the attack card.');
  }catch(error){
   const stored=message.flags?.[ID]?.confusingAura?.some(row=>row.id===record.id&&row.actorId===record.actorId);
   if(!stored)await writeLayers(item,count);
   throw error;
  }
  await postDefense(actor,message,defense,blocked,layers);
  return record;
 }));
}
export function blockedByConfusingAura(target,records){
 return records?.some(row=>row.blocked&&row.actorId===target.actorId&&row.id===target.id)??false;
}
function blockTarget(target){
 target.hit=false;
 target.hitResult={...target.hitResult,success:false};
 target.confusingAuraBlocked=true;
}
export function installConfusingAura(Action,Target,send){
 const use=Action.prototype.use;
 Action.prototype.use=async function(...args){
  const result=await use.apply(this,args);
  if(this.id===CONFUSING_AURA_ACTION&&this.item?.uuid===auraCard(this.actor)?.uuid&&flightCastSuccess(result?.message)){
   try{
    if(game.dice3d&&result.message.id)await game.dice3d.waitFor3DAnimationByMessageID(result.message.id);
    await send({mode:'cast',messageUuid:result.message.uuid,actorUuid:this.actor.uuid});
   }catch(error){ui.notifications.error('Confusing Aura: '+error.message);}
  }
  return result;
 };
 const execute=Target.execute;
 Target.execute=async function(config,...args){
  const result=await execute.call(this,config,...args);
  if(result===false||this.type!=='attack'||this.actor?.type!=='adversary'||!config.message||
   !Number.isFinite(config.evaluated?.total??config.roll?.total))return result;
  let blocked=false;
  for(const target of config.targets??[]){
   const actor=target.actorId?await fromUuid(target.actorId):null;
   if(!auraLayers(auraCard(actor)))continue;
   const decision=await send({mode:'defend',messageUuid:config.message.uuid,actorUuid:actor.uuid,targetId:target.id});
   if(decision?.blocked){blockTarget(target);blocked=true;}
  }
  if(blocked&&config.roll){
   config[AVOIDED]=true;
   config.roll.success=config.targets.some(target=>target.hitResult?.success);
   config.successConsumed=config.roll.success;
  }
  return result;
 };
}
export function installConfusingAuraChat(models){
 const patched=new Set();
 for(const Model of Object.values(models)){
  let proto=Model.prototype;
  while(proto&&!Object.hasOwn(proto,'_getCurrentTargets'))proto=Object.getPrototypeOf(proto);
  if(!proto||patched.has(proto)||Object.hasOwn(proto,WRAP))continue;
  patched.add(proto);
  const native=proto._getCurrentTargets;
  proto._getCurrentTargets=function(...args){
   const targets=native.apply(this,args);
   if(!this.targeting?.usingSelect){
    const records=this.parent?.flags?.[ID]?.confusingAura;
    for(const target of targets)if(blockedByConfusingAura(target,records))blockTarget(target);
   }
   return targets;
  };
  Object.defineProperty(proto,WRAP,{value:true});
 }
}
export function registerConfusingAura(){
 CONFIG.queries[QUERY]=resolveConfusingAura;
 CONFIG.queries[PROMPT]=askLayers;
 const {actions}=game.system.api.data;
 const Target=game.system.api.fields.ActionFields.TargetField;
 installConfusingAura(actions.actionsTypes.base,Target,request=>{
  const gm=game.users.activeGM;
  if(!gm)throw Error('Confusing Aura needs an active GM.');
  return gm.isSelf?resolveConfusingAura(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(185000)});
 });
 installConfusingAuraChat(CONFIG.ChatMessage.dataModels);
 Hooks.on('daggerheart.preUseAction',action=>{
  if(action.type!=='attack'||action.actor?.type!=='adversary')return;
  const workflow=action.workflow,step=workflow?.get('target');
  if(!step||boundWorkflows.has(workflow))return;
  // Some actor actions cache a bound native TargetField before ready.
  prioritizeFaerieWings(action);
  workflow.set('target',{...step,execute:Target.execute.bind(action)});
  boundWorkflows.add(workflow);
 });
}
