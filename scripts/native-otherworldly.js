import {ID,clone} from './core.js';
import {premadeDocuments,configurePremadePack} from './premade-setup-context.js';

const WEAPON='weapon-otherworldly',STANCE='martial-stance-otherwordly',EFFECT='RtscqiOS754ouvOM';
const RULE='system.rules.attack.canChooseDamageType',busy=new Set();
export const nativeOtherworldly=()=>{
 const [major,minor]=String(globalThis.game?.system?.version??'').split('.').map(Number);
 const items=globalThis.CONFIG?.DH?.ITEM;
 return (major>2||major===2&&minor>=12)&&Boolean(items?.weaponFeatures?.otherwordly||items?.allWeaponFeatures?.()?.otherwordly);
};
const change=()=>({key:RULE,type:'override',value:1,priority:null,phase:'initial'});
const hasRule=effect=>effect.system?.changes?.some(row=>row.key===RULE);
function stanceEffect(effect){
 const data=effect.toObject?effect.toObject():clone(effect);
 if(hasRule(data))return null;
 data.system={...data.system,changes:[...(data.system?.changes??[]),change()],
  conditionals:[...(data.system?.conditionals??[]),{type:'actionType',actionTypes:['attack'],traits:[]}]};
 return data;
}
export function nativeOtherworldlyUpdate(item){
 const data=item.toObject(),key=data.flags?.[ID]?.applied?.key;
 if(![WEAPON,STANCE].includes(key))return null;
 const effects=data.effects??[],update={
  [`flags.${ID}.otherworldlyLegacyBackup`]:{applied:clone(data.flags[ID].applied),effects:clone(effects)},
  [`flags.${ID}.-=applied`]:null
 };
 if(key===STANCE){
  const effect=effects.find(e=>e._id===EFFECT);
  if(!effect)throw Error('Missing Otherwordly stance effect on '+item.name);
  const replacement=stanceEffect(effect);
  if(replacement)update.effects=effects.map(e=>e===effect?replacement:e);
 }else{
  const feature=data.system.itemFeatures?.otherwordly;
  const existing=effects.find(e=>feature?.effectIds?.includes(e._id)&&hasRule(e));
  if(!existing){
   const id=foundry.utils.randomID();
   const effect={_id:id,name:'Otherwordly',type:'base',img:item.img,transfer:true,disabled:Boolean(data.flags?.[ID]?.disabled),
    system:{changes:[change()],conditionals:[{type:'weaponRestriction',weaponType:'sameWeapon'}],duration:{type:'',description:''}},
    flags:{[ID]:{nativeOtherworldly:true}}};
   update.effects=[...effects,effect];
   update['system.itemFeatures.otherwordly']={...feature,value:'otherwordly',effectIds:[...(feature?.effectIds??[]),id],actionIds:feature?.actionIds??[]};
  }
 }
 return update;
}
export async function migrateNativeOtherworldly(selected=null){
 if(!game.user.isActiveGM||!nativeOtherworldly())return;
 const items=new Map();
 if(selected){for(const item of selected)items.set(item.uuid,item);}
 else{
  for(const item of game.items??[])items.set(item.uuid,item);
  for(const actor of game.actors??[])for(const item of actor.items??[])items.set(item.uuid,item);
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(!token.actorLink)for(const item of token.actor?.items??[])items.set(item.uuid,item);
 }
 for(const item of items.values()){
  if(busy.has(item.uuid))continue;busy.add(item.uuid);
  try{
   const update=nativeOtherworldlyUpdate(item);if(!update)continue;
   // An already-entered stance has independent actor effects. Upgrade those
   // before clearing ownership, so a failed write can be retried safely.
   if(item.flags?.[ID]?.applied?.key===STANCE&&item.actor){
    const origin=item.uuid+'.ActiveEffect.'+EFFECT;
    const changes=[...(item.actor.effects??[])].filter(e=>e.origin===origin).map(e=>{
     const replacement=stanceEffect(e);return replacement?{_id:e.id,'system.changes':replacement.system.changes,'system.conditionals':replacement.system.conditionals}:null;
    }).filter(Boolean);
    if(changes.length){const result=await item.actor.updateEmbeddedDocuments('ActiveEffect',changes);if(result?.length!==changes.length)throw Error('Could not upgrade active Otherwordly stance.');}
   }
   const result=await item.update(update);
   if(!result||[WEAPON,STANCE].includes(item.flags?.[ID]?.applied?.key))throw Error('Could not confirm native Otherworldly migration for '+item.name);
  }catch(error){console.error(ID+' | Native Otherworldly',error);ui.notifications.error(error.message);}
  finally{busy.delete(item.uuid);}
 }
}
export async function retireNativeOtherworldly(category,key){
 if(!nativeOtherworldly())return false;
 const pack=game.packs.get(ID+'.'+category);if(!pack)return true;
 const entries=(await premadeDocuments(pack)).filter(item=>item.getFlag(ID,'premade')?.key===key);
 if(!entries.length)return true;
 const locked=pack.locked;
 try{if(locked)await configurePremadePack(pack,{locked:false});for(const item of entries)await item.delete();}
 finally{if(locked)await configurePremadePack(pack,{locked:true});}
 return true;
}
export async function registerNativeOtherworldly(){
 if(!nativeOtherworldly())return;
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,key=Symbol.for(`${ID}.nativeOtherworldly`);
 if(!Object.hasOwn(Damage,key)){
  const configure=Damage.buildConfigure;
  Damage.buildConfigure=async function(config,...args){
   const message=game.messages?.get(config.source?.message),action=config.action??message?.system?.action;
   const actor=config.actor??config.data?.parent??action?.actor;
   if(!config.hasHealing&&config.damageFormula&&actor?.getActionClone(action,{role:'origin'}).system.rules.attack.canChooseDamageType){
    config.actor??=actor;config.dialog={...config.dialog,configure:true};
   }
   return configure.call(this,config,...args);
  };
  Object.defineProperty(Damage,key,{value:true});
 }
 await migrateNativeOtherworldly();
 Hooks.on('createItem',item=>migrateNativeOtherworldly([item]));
 Hooks.on('createActor',actor=>migrateNativeOtherworldly([...actor.items]));
}
