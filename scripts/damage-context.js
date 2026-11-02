import {damageDefenseOffers,openDamageDefenses,finishDamageDefenses} from './damage-defenses.js';
import {ID} from './core.js';
import {decisionBudget} from './settings.js';

const transforms=new Map(),pending=new Map(),WRAP=Symbol.for(`${ID}.damageContext`),CANCEL=Symbol('cancelDamage');
let current=null,wardAvailable=null;
export const nativeDamageContext=()=>{
 const [major,minor]=String(globalThis.game?.system?.version??'').split('.').map(Number);
 return major>2||major===2&&minor>=12;
};
export function registerDamageTransform(key,qualify,apply){transforms.set(key,{qualify,apply});}
export function registerWardDamageFallback(available){wardAvailable=available;}
export function countDamage(value,thresholds){
 if(!(value>0))return 0;
 const massive=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules)?.massiveDamage?.enabled;
 return massive&&value>=thresholds.severe*2?4:thresholds.severe&&value>=thresholds.severe?3:thresholds.major&&value>=thresholds.major?2:1;
}
function rulesFor(record){
 const rules={thresholds:{...record.actor.system.damageThresholds},severity:0};
 for(const transform of transforms.values())if(transform.qualify(record.packet))transform.apply(rules,record.actor);
 return rules;
}
export function configureDamageContext(dialog,record){
 if(!record)return;
 const original=dialog.getDamageInfo;
 dialog.getDamageInfo=function(...args){
  const info=original.apply(this,args),raw=this.getReducedDamage()??this.damage;
  const armor=this.marks.armor.flatMap(source=>Object.values(source.marks)).filter(mark=>mark.selected).length;
  let damage=Math.max(0,countDamage(raw,record.thresholds)-armor*this.increasePerArmorMark-info.stressReductions.length-
   Number(this.reduceSeverity??0)-record.severity);
  if(this.thresholdImmunities[damage])damage=0;
  return {...info,currentDamage:damage};
 };
 if(record.wardOnly){
  dialog.marks.armor=[];dialog.marks.stress={};dialog.availableStressReductions=null;
  dialog.maxArmorUsed={value:0};dialog.reduceSeverity=0;dialog.thresholdImmunities={};
 }
}

async function finalizeDamage(record,updates){
 const marker=updates.findIndex(row=>row.key===record.id);
 if(marker<0)return;
 updates.splice(marker,1);
 const hp=updates.find(row=>row.key==='hitPoints');
 if(!hp||record.raw===undefined)return;
 const rules=rulesFor(record);
 if(!record.queried&&record.actor.type==='character'&&record.raw>0&&(wardAvailable?.(record.actor)||record.defenses)){
  const result=await record.actor.owner.query('armorSlot',{actorId:record.actor.uuid,actionUuid:record.options?.actionUuid,
   damage:record.raw,type:record.types,[ID]:{damageContext:{...rules,defenses:record.defenses,wardOnly:Boolean(record.options?.isDirect||record.actor.system.rules.damageReduction.disabledArmor)}}},{timeout:decisionBudget(record.defenses?185000:65000)});
  if(!result)throw CANCEL;
  hp.value=record.manualHP+result.modifiedDamage;
  for(const row of result.armorChanges??[])updates.push({key:'armor',value:row.amount,uuid:row.uuid});
  for(const cost of result.resourceCosts??[]){const row=updates.find(row=>row.key===cost.key);if(row)row.value+=cost.value;else updates.push({...cost});}
  record.queried=true;
 }
 if(record.queried)return;
 let before=countDamage(record.raw,record.actor.system.damageThresholds);
 let after=Math.max(0,countDamage(record.raw,rules.thresholds)-rules.severity);
 if(record.actor.type==='adversary'){
  const action=record.options?.actionUuid?await fromUuid(record.options.actionUuid):null;
  const rule=record.actor.getActionClone(action,{role:'target'}).system.rules.damageReduction;
  const finish=count=>{let value=Math.max(count-Number(rule.reduceSeverity??0),0);if(rule.thresholdImmunities?.[['none','minor','major','severe','massive'][value]])value=Math.max(0,value-1);return value;};
  before=finish(before);after=finish(after);
 }
 hp.value+=after-before;
}

export function installDamageContext(Actor){
 if(!nativeDamageContext()||!Actor||Object.hasOwn(Actor,WRAP))return;
 const take=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(packet={},options,...args){
  if(this.type==='companion')return take.call(this,packet,options,...args);
  const main='total'in packet?packet:packet.main??packet.damage;
  if(!(Number(typeof main==='number'?main:main?.total)>0))return take.call(this,packet,options,...args);
  if(![...transforms.values()].some(row=>row.qualify(packet))&&!wardAvailable?.(this)&&!damageDefenseOffers({actor:this,packet,options}).length)return take.call(this,packet,options,...args);
  const record={actor:this,packet,options,id:`dhpDamage${foundry.utils.randomID()}`,queried:false,
   manualHP:Number(typeof packet.resources?.hitPoints==='number'?packet.resources.hitPoints:packet.resources?.hitPoints?.total)||0};
  pending.set(record.id,record);openDamageDefenses(record);
  const input='total'in packet?{main:packet,resources:{[record.id]:0}}:{...packet,resources:{...packet.resources,[record.id]:0}};
  const previous=current;let result;
  try{current=record;result=take.call(this,input,options,...args);}
  catch(error){pending.delete(record.id);await finishDamageDefenses(record,null);throw error;}
  finally{current=previous;}
  try{const updates=await result;await finishDamageDefenses(record,updates);return updates;}catch(error){if(error===CANCEL)return [];throw error;}
  finally{pending.delete(record.id);await finishDamageDefenses(record,null);}
 };
 Hooks.on('daggerheart.postCalculateDamage',(actor,args)=>{
  if(current?.actor===actor&&args.main){current.raw=args.main.value;current.types=args.main.damageTypes;}
 });
 installDamageContextQuery();
 const triggers=game.system.registeredTriggers,run=triggers.runTrigger;
 triggers.runTrigger=async function(name,actor,updates,...args){
  if(name===CONFIG.DH.TRIGGER.triggers.postDamageReduction.id){
   const row=updates.find(row=>pending.has(row.key));
   if(row)await finalizeDamage(pending.get(row.key),updates);
  }
  return run.call(this,name,actor,updates,...args);
 };
 Object.defineProperty(Actor,WRAP,{value:true});
}

// Install this again after the module's other query wrappers. Packet identity
// must be attached synchronously, before an async wrapper looks up the actor.
const QUERY_BRIDGE=Symbol.for(`${ID}.damageContextQuery`);
export function installDamageContextQuery(User=CONFIG.User?.documentClass){
 if(!nativeDamageContext()||!User||User.prototype.query?.[QUERY_BRIDGE])return;
 const query=User.prototype.query;
 const wrapped=function(name,data,...args){
  if(name==='armorSlot'&&current?.actor.uuid===data.actorId&&data[ID]?.damageContext?.packetId!==current.id){
   const record=current;record.queried=true;
   const rules={...rulesFor(record),defenses:record.defenses,...data[ID]?.damageContext,packetId:record.id};
   if(rules.severity>0&&countDamage(data.damage,rules.thresholds)<=rules.severity)return Promise.resolve({modifiedDamage:0,armorChanges:[],resourceCosts:[]});
   data={...data,[ID]:{...data[ID],damageContext:rules}};
   if(record.defenses)args[0]={...args[0],timeout:decisionBudget(185000)};
  }
  return query.call(this,name,data,...args);
 };
 Object.defineProperty(wrapped,QUERY_BRIDGE,{value:true});User.prototype.query=wrapped;
}
