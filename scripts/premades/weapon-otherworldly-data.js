import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_OTHERWORLDLY_KEY='weapon-otherworldly';
export const OTHERWORLDLY_WEAPONS=[
  ['Shadowblade','GnllSqInVOWFX3qW'],['Improved Shadowblade','00Cz6w2hSlb4ccrR'],
  ['Advanced Shadowblade','VzzjS5BjASNYKaqc'],['Legendary Shadowblade','vt7KdwDdPHJKHcFt']
].map(([name,id])=>({name,sourceUuid:`Compendium.daggerheart.weapons.Item.${id}`}));
export function weaponOtherworldlyData(){
  return {name:'Otherworldly',type:'feature',img:'icons/weapons/swords/sword-flanged-lightning.webp',
    system:{description:'<p>On a successful attack, you can deal physical or magic damage.</p>',
      gmNotes:'Apply Medkit to a Shadowblade of any tier. Before rolling damage for a successful attack, its owner chooses Physical or Magic damage. The choice applies only to this attack’s main damage; weapon statistics and resource damage remain unchanged. Closing the choice keeps native damage. This is not the Martial Artist feature.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_OTHERWORLDLY_KEY,version:'1.0.0',category:'weapon-features',weaponItems:clone(OTHERWORLDLY_WEAPONS),aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponOtherworldly(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_OTHERWORLDLY_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(weaponOtherworldlyData()):await Item.create(weaponOtherworldlyData(),{pack:pack.collection});
    if(!item)throw Error('Otherworldly weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
