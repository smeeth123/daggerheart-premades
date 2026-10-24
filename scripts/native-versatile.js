import {ID,clone} from './core.js';
import {weaponModeProfile} from './weapon-modes.js';
import {premadeDocuments,configurePremadePack} from './premade-setup-context.js';
import {nativeDamageOptions} from './damage-options.js';
export const nativeVersatile=()=>nativeDamageOptions()&&Boolean(globalThis.CONFIG?.DH?.ITEM?.weaponFeatures?.versatile||globalThis.CONFIG?.DH?.ITEM?.allWeaponFeatures?.()?.versatile);
const key='weapon-versatile';
const migrating=new Set();
export function nativeVersatileUpdate(item){
 if(item.type!=='weapon'||item.flags?.[ID]?.applied?.key!==key)return null;
 const data=item.toObject(),saved=data.flags?.[ID]?.weaponMode,profile=weaponModeProfile(item);
 const existing=data.system.itemFeatures?.versatile;
 const active=saved?saved.current==='alternate':data.flags?.daggerheart?.versatileActive===true,primary=saved?.primary;
 const attack=data.system.attack,main=attack.damage.main;
 const alternate=saved?.current==='alternate'?{trait:attack.roll.trait,range:attack.range,dice:main.value.dice,bonus:main.value.bonus,custom:main.value.custom,type:main.type}:saved?.alternate;
 if(saved&&!['primary','alternate'].includes(saved.current))throw Error('Unknown saved Versatile mode on '+item.name);
 if(saved&&active&&!primary)throw Error('Missing primary Versatile statistics on '+item.name);
 const alt=alternate??profile;
 if(!existing&&!alt)throw Error('Missing alternate Versatile statistics on '+item.name);
 if(alternate?.custom?.enabled)throw Error(item.name+' uses a custom alternate formula; migrate its Versatile statistics manually.');
 const update={[`flags.${ID}.versatileLegacyBackup`]:{applied:clone(data.flags[ID].applied),weaponMode:clone(saved??null)},
  [`flags.${ID}.-=applied`]:null,[`flags.${ID}.-=weaponMode`]:null,
  'flags.daggerheart.versatileActive':active};
 if(saved&&active){for(const [k,v]of Object.entries(primary)){const path=k==='trait'?'roll.trait':k==='range'?'range':k==='type'?'damage.main.type':'damage.main.value.'+k;update['system.attack.'+path]=clone(v);}}
 if(!existing||alternate)update['system.itemFeatures.versatile']={...existing,value:'versatile',effectIds:existing?.effectIds??[],actionIds:existing?.actionIds??[],
  config:{trait:alt.trait,range:alt.range,damage:{dice:alt.dice,bonus:Number(alt.bonus)||0,type:clone(Array.isArray(alt.type)?alt.type:alt.type?[alt.type]:data.system.attack.damage.main.type)}}};
 return update;
}
export async function migrateNativeVersatile(selected=null){
 if(!game.user.isActiveGM||!nativeVersatile())return;
 const items=new Map();
 if(selected){for(const item of selected)items.set(item.uuid,item);}
 else{
  for(const item of game.items??[])items.set(item.uuid,item);
  for(const actor of game.actors??[])for(const item of actor.items??[])items.set(item.uuid,item);
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(!token.actorLink)for(const item of token.actor?.items??[])items.set(item.uuid,item);
 }
 for(const item of items.values()){if(migrating.has(item.uuid))continue;migrating.add(item.uuid);try{
  const update=nativeVersatileUpdate(item);if(!update)continue;
  const changed=await item.update(update);
  if(!changed||item.flags?.[ID]?.applied?.key===key)throw Error('Could not confirm native Versatile migration for '+item.name);
 }catch(error){console.error(ID+' | Native Versatile',error);ui.notifications.error(error.message);}finally{migrating.delete(item.uuid);}}
}
export async function retireNativeVersatile(){
 if(!nativeVersatile())return;
 const pack=game.packs.get(ID+'.weapon-features');if(!pack)return;
 const entries=(await premadeDocuments(pack)).filter(i=>i.getFlag(ID,'premade')?.key===key);if(!entries.length)return;
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});for(const item of entries)await item.delete();}
 finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
