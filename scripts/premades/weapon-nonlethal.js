import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {WEAPON_NONLETHAL_KEY} from './weapon-nonlethal-data.js';
const WRAPPED=Symbol.for(`${ID}.weaponNonlethal`);
export function nonlethalWeapon(item){return Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_NONLETHAL_KEY&&item.system.weaponFeatures?.some(f=>f.value==='nonlethal'));}
export function nonlethalSource(config){if(config.hasHealing||!config.damage?.main)return null;const source=config.source;if(!source||typeof source.action!=='string'||!source.action)return null;const actor=config.data?.parent??foundry.utils.fromUuidSync?.(source.actor),item=actor?.items?.get?.(source.item);if(actor?.uuid!==source.actor||!nonlethalWeapon(item))return null;const action=item.system.attack?.id===source.action?item.system.attack:item.system.actions?.get?.(source.action)??item.system.actions?.[source.action];return action?.type==='attack'?{weaponUuid:item.uuid,source:{actor:source.actor,item:source.item,action:source.action}}:null;}
export function tagNonlethal(config){const record=nonlethalSource(config),main=config.damage?.main;if(!record||!main)return false;main.options??={};main.options[ID]={...main.options[ID],weaponNonlethal:record};const damage=config.damage;if(typeof damage.toObject==='function')config.damage=new damage.constructor({...damage.toObject(),main:main.toJSON(),resources:Object.fromEntries(Object.entries(damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});return true;}
export function nonlethalPacket(packet){const main=packet?.main??packet?.damage??packet,record=main?.options?.[ID]?.weaponNonlethal;return Number.isFinite(main?.total)&&main.total>0&&typeof record?.weaponUuid==='string'&&['actor','item','action'].every(key=>typeof record.source?.[key]==='string'&&record.source[key])?record:null;}
// Convert only the main attack severity, not separately supplied HP resources.
export function convertNonlethalHP(updates,excludedHP=0,currentStress=0){
 const hp=updates?.find(row=>row.key==='hitPoints'&&!row.itemId&&!row.clear&&row.damageTypes&&Number.isSafeInteger(row.value)&&row.value>0);
 const amount=hp?hp.value-excludedHP:0;
 if(!Number.isSafeInteger(amount)||amount<=0)return false;
 const stress=updates.find(row=>row.key==='stress'&&!row.itemId);
 hp.value-=amount;
 if(stress){stress.value=stress.clear?amount-currentStress:stress.value+amount;stress.clear=false;}
 else updates.unshift({key:'stress',value:amount});
 return true;
}
export function installWeaponNonlethal(Damage,Actor,triggers){
 if(Damage&&!Object.hasOwn(Damage,WRAPPED)){
  const evaluate=Damage.buildEvaluate,post=Damage.buildPost;
  Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagNonlethal(config);return result;};
  Damage.buildPost=async function(roll,config,...args){tagNonlethal(config);return post.call(this,roll,config,...args);};
  Object.defineProperty(Damage,WRAPPED,{value:true});
 }
 if(!Actor||Object.hasOwn(Actor,WRAPPED))return;
 const take=Actor.prototype.takeDamage,update=Actor.prototype.update,run=triggers.runTrigger;
 const parsing=new WeakMap(),receipts=new WeakMap(),contexts=new WeakMap();
 Hooks.on('daggerheart.preTakeDamage',(actor,args)=>{
  const context=parsing.get(actor);
  if(context){parsing.delete(actor);receipts.set(args.resourceUpdates,context);}
 });
 Actor.prototype.update=function(...args){const result=update.apply(this,args);contexts.get(this)?.writes.push(Promise.resolve(result));return result;};
 Actor.prototype.takeDamage=function(packet,...args){
  if(!nonlethalPacket(packet)||this.type==='companion')return take.call(this,packet,...args);
  return withHopeLock(`weaponNonlethalDamage:${this.uuid}`,async()=>{
   const resource=packet.resources?.hitPoints;
   const excludedHP=resource?.options?.itemId||resource?.options?.fullRestore?0:Math.max(0,Number(typeof resource==='number'?resource:resource?.total)||0);
   const context={excludedHP,handled:false,writes:[]};contexts.set(this,context);
   try{
    // Native parsing/preTakeDamage is synchronous. Bind this exact resource
    // array before Armor awaits, so unrelated damage cannot borrow its marker.
    parsing.set(this,context);let pending;
    try{pending=take.call(this,packet,...args);}finally{parsing.delete(this);}
    const result=await pending;let position=0;
    while(position<context.writes.length){const end=context.writes.length;await Promise.all(context.writes.slice(position,end));position=end;}
    return result;
   }finally{contexts.delete(this);}
  });
 };
 triggers.runTrigger=async function(trigger,actor,updates,...args){
  const result=await run.call(this,trigger,actor,updates,...args),context=receipts.get(updates);
  if(trigger===CONFIG.DH.TRIGGER.triggers.postDamageReduction.id&&context&&!context.handled){
   context.handled=true;receipts.delete(updates);convertNonlethalHP(updates,context.excludedHP,Number(actor.system.resources?.stress?.value)||0);
  }
  return result;
 };
 Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerWeaponNonlethal(){
 installWeaponNonlethal(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,game.system.registeredTriggers);
 Hooks.on('daggerheart.preUseAction',action=>{
  if(nonlethalWeapon(action.item)&&action.item.system.weaponFeatures.some(f=>f.value==='nonlethal'&&f.actionIds?.includes(action.id))){
   ui.notifications.info('Nonlethal automatically converts this weapon’s HP damage to Stress.');return false;
  }
 });
}
