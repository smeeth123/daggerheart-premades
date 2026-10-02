import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_RELOADING_KEY='weapon-reloading';
export function weaponReloadingData(){
  return {name:'Reloading',type:'feature',img:'icons/weapons/ammunition/shot-round-blue.webp',
    system:{description:'<p>After you make an attack, roll a d6. On a result of 1, you must mark a Stress to reload this weapon before you can fire it again.</p>',
      gmNotes:'Apply Medkit to a weapon with native Reloading. A completed attack automatically performs the native d6 check unless the attack card already records a check. Attempting to fire unloaded offers its owner the option to mark 1 Stress and reload before continuing. Native weapon resource, check display, damage and manual reload controls are preserved.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_RELOADING_KEY,version:'1.0.0',category:'weapon-features',weaponFeature:'reloading',aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponReloading(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_RELOADING_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(weaponReloadingData()):await Item.create(weaponReloadingData(),{pack:pack.collection});
    if(!item)throw Error('Reloading weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
