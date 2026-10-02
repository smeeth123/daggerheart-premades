import {ID,featureActive} from '../core.js';
import {weaponModeProfile} from '../weapon-modes.js';
import {PIERCING_WEAPONS,WEAPON_PIERCING_KEY} from './weapon-piercing-data.js';
const WRAPPED=Symbol.for(`${ID}.weaponPiercing`);
export function piercingWeapon(item){
  return Boolean(item?.type==='weapon'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===WEAPON_PIERCING_KEY&&weaponModeProfile(item,PIERCING_WEAPONS));
}
export function piercingSource(config){
  if(config.hasHealing)return null;
  const source=config.source,actor=config.data?.parent??foundry.utils.fromUuidSync?.(source?.actor);
  if(!source||actor?.uuid!==source.actor)return null;
  const item=actor.items?.get?.(source.item);
  if(!piercingWeapon(item))return null;
  const action=item.system.attack?.id===source.action?item.system.attack:
    item.system.actions?.get?.(source.action)??item.system.actions?.[source.action];
  return action?.type==='attack'?{weaponUuid:item.uuid,source:{actor:source.actor,item:source.item,action:source.action},penalty:2}:null;
}
export function tagPiercing(config){
  const main=config.damage?.main,record=piercingSource(config);
  if(!main||!record)return false;
  main.options??={};main.options[ID]={...main.options[ID],weaponPiercing:record};
  const damage=config.damage;
  // Prepared ChatDamageData and its serialized source must carry the same marker.
  if(typeof damage.toObject==='function')config.damage=new damage.constructor({...damage.toObject(),main:main.toJSON(),
    resources:Object.fromEntries(Object.entries(damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
  return true;
}
export function piercingPacket(packet){
  const main=packet?.main??packet?.damage??packet;
  const record=main?.options?.[ID]?.weaponPiercing;
  return Boolean(Number.isFinite(main?.total)&&main.total>0&&record?.penalty===2&&typeof record.weaponUuid==='string'&&
    typeof record.source?.actor==='string'&&typeof record.source?.item==='string'&&typeof record.source?.action==='string');
}
export function installPiercing(Damage,Actor){
  if(Damage&&!Damage[WRAPPED]){
    const evaluate=Damage.buildEvaluate,post=Damage.buildPost;
    Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagPiercing(config);return result;};
    // Also covers native manually entered damage which skips evaluation.
    Damage.buildPost=async function(roll,config,...args){tagPiercing(config);return post.call(this,roll,config,...args);};
    Object.defineProperty(Damage,WRAPPED,{value:true});
  }
  if(Actor&&!Actor[WRAPPED]){
    const take=Actor.prototype.takeDamage,convert=Actor.prototype.convertDamageToThreshold,contexts=new WeakMap();
    // Register before the module's async defense/redirection wrappers. Native
    // takeDamage converts thresholds synchronously, before its first await for
    // Armor (companions take Stress without threshold conversion). End context
    // immediately when it returns its Promise, not after an async dialog ends.
    Actor.prototype.takeDamage=function(packet,...args){
      const previous=contexts.get(this);contexts.set(this,piercingPacket(packet));
      try{return take.call(this,packet,...args);}
      finally{if(previous===undefined)contexts.delete(this);else contexts.set(this,previous);}
    };
    Actor.prototype.convertDamageToThreshold=function(damage,...args){
      const major=Number(this.system.damageThresholds?.major);
      if(!contexts.get(this)||!Number.isFinite(major)||major<=0)return convert.call(this,damage,...args);
      // A facade is used only for the native synchronous conversion method;
      // the actual actor/system/threshold object is never changed, even briefly.
      const facade=Object.create(this),system=Object.create(this.system);
      Object.defineProperty(system,'damageThresholds',{value:{...this.system.damageThresholds,major:Math.max(Number.MIN_VALUE,major-2)}});
      Object.defineProperty(facade,'system',{value:system});
      return convert.call(facade,damage,...args);
    };
    Object.defineProperty(Actor,WRAPPED,{value:true});
  }
}
export function registerWeaponPiercing(){
  installPiercing(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass);
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible||!piercingPacket(message.system?.damage)||html.querySelector('.dhp-weapon-piercing'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-weapon-piercing';
    note.textContent='Piercing: Major threshold −2 for this weapon’s damage.';
    html.querySelector('.message-content')?.append(note);
  });
}
