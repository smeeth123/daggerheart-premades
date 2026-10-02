import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {decisionBudget} from '../settings.js';
import {ARMOR_BULKY_KEY} from './armor-bulky-data.js';

const QUERY=`${ID}.armorBulkyDamage`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
export function bulkyArmor(actor){
  const item=actor?.system?.armor;
  return actor?.type==='character'&&item?.type==='armor'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===ARMOR_BULKY_KEY&&item.system.armorFeatures?.some(feature=>feature.value==='bulky')?item:null;
}
export function bulkyDamagePacket(packet){
  const raw=packet?.main??packet?.damage??(typeof packet?.total==='number'?packet:null);
  const main=typeof raw==='number'?{total:raw}:raw?.toJSON?.()??raw;
  if(!main||!Number.isFinite(main.total)||main.total<=0)return null;
  const copy=structuredClone(main);
  if(copy.damageTypes instanceof Set)copy.damageTypes=[...copy.damageTypes];
  if(copy.options?.damageTypes instanceof Set)copy.options.damageTypes=[...copy.options.damageTypes];
  return {main:copy,resources:Object.fromEntries(Object.entries(packet.resources??{}).map(([key,value])=>[key,structuredClone(value?.toJSON?.()??value)]))};
}
export function bulkySevereDamage(updates,excludedHP=0,overflow=new WeakMap()){
  if(!Array.isArray(updates))return false;
  return updates.filter(update=>update.key==='hitPoints'&&!update.clear&&!update.itemId&&update.damageTypes&&Number.isSafeInteger(update.value)&&update.value>0)
    .reduce((total,update)=>total+update.value-(overflow.get(update)??0),0)-excludedHP>=3;
}
export async function resolveBulkyDamage(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.actorUuid!=='string'||typeof request.isDirect!=='boolean')return null;
  const actor=await fromUuid(request.actorUuid),packet=bulkyDamagePacket(request.packet);
  if(!actor||!packet||!bulkyArmor(actor))return null;
  const sourceUuid=packet.main.options?.[ID]?.elementalSource??packet.main.options?.[ID]?.friendAttack;
  const source=typeof sourceUuid==='string'?await fromUuid(sourceUuid):null;
  if(!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return null;
  const key=`${actor.uuid}:${user.id}:${request.id}`;
  if(receipts.has(key))return receipts.get(key);
  const operation=actor.takeDamage(packet,request.isDirect);
  receipts.set(key,operation);if(receipts.size>1000)receipts.delete(receipts.keys().next().value);
  return operation;
}
export function installArmorBulky(Actor,dispatch){
  if(Object.hasOwn(Actor,WRAPPED))return;
  const native=Actor.prototype.takeDamage,update=Actor.prototype.update,convert=Actor.prototype.convertStressDamageToHP,contexts=new WeakMap(),overflow=new WeakMap();
  Actor.prototype.convertStressDamageToHP=function(resources,...args){
    const context=contexts.get(this),before=new Map(resources.filter(row=>row.key==='hitPoints').map(row=>[row,Number(row.value)||0]));
    const result=convert.call(this,resources,...args);
    if(context)for(const row of resources.filter(row=>row.key==='hitPoints')){
      const added=(Number(row.value)||0)-(before.get(row)??0);
      if(added>0)overflow.set(row,(overflow.get(row)??0)+added);
    }
    return result;
  };
  Actor.prototype.update=function(...args){
    const result=update.apply(this,args),context=contexts.get(this);
    if(context)context.push(Promise.resolve(result));
    return result;
  };
  const settle=async(context)=>{
    // Native modifyResource starts update promises in async forEach callbacks.
    // On the GM those callbacks start synchronously; await their actual writes
    // before applying a second packet, rather than racing HP/Stress updates.
    let position=0;
    while(position<context.length){const end=context.length;await Promise.all(context.slice(position,end));position=end;}
  };
  Actor.prototype.takeDamage=async function(packet,...args){
    const armor=bulkyArmor(this),damage=armor&&bulkyDamagePacket(packet);
    if(!damage)return native.call(this,packet,...args);
    if(!game.user.isGM)return dispatch({actorUuid:this.uuid,packet:damage,isDirect:Boolean(args[0]),id:foundry.utils.randomID()});
    return withHopeLock(`bulkyDamage:${this.uuid}`,async()=>{
      const context=[];contexts.set(this,context);
      try{
        const result=await native.call(this,packet,...args);
        await settle(context);
        const resourceHP=damage.resources.hitPoints;
        const excludedHP=resourceHP?.options?.itemId||resourceHP?.options?.fullRestore?0:Math.max(0,Number(typeof resourceHP==='number'?resourceHP:resourceHP?.total)||0);
        if(bulkySevereDamage(result,excludedHP,overflow)&&bulkyArmor(this)?.uuid===armor.uuid){
          try{
            // Mandatory Stress is resource damage, not an optional feature cost:
            // native full-Stress HP conversion and existing prevention still apply.
            await native.call(this,{resources:{stress:1}},true);
            await settle(context);
          }catch(error){
            console.error(`${ID} | Bulky Stress failed after damage`,error);
            ui.notifications.error('Bulky: damage was applied, but its Stress could not be completed. Check this actor’s resources before applying damage again.');
          }
        }
        return result;
      }finally{contexts.delete(this);}
    });
  };
  Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerArmorBulky(){
  CONFIG.queries[QUERY]=resolveBulkyDamage;
  installArmorBulky(CONFIG.Actor.documentClass,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Bulky damage needs an active GM.');
    return gm.isSelf?resolveBulkyDamage(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(305000)});
  });
}
