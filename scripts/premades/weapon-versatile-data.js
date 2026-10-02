import {ID,clone} from '../core.js';
import {VERSATILE_PROFILES} from '../weapon-modes.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_VERSATILE_KEY='weapon-versatile';
const LEGACY_DESCRIPTION='<p>This weapon can also be used with its alternate statistics. Switch freely between the two modes from the weapon sheet.</p>';
const LEGACY_NOTES='Apply Medkit to a supported Versatile weapon, not to a separate character feature. The weapon sheet gains a Switch Mode button. Original statistics are preserved; no resource cost.';
export function weaponVersatileData(){
  return {name:'Versatile',type:'feature',img:'icons/skills/melee/weapons-crossed-swords-yellow.webp',
    system:{description:'<p>This weapon can also be used with its alternate statistics. Right-click it on the character sheet to switch freely between the two modes.</p>',
      gmNotes:'Apply Medkit to a supported Versatile weapon, not to a separate character feature. Right-click the weapon on the character sheet and choose Switch to Alternate Mode or Switch to Primary Mode. Original statistics are preserved; no resource cost.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_VERSATILE_KEY,version:'1.0.1',category:'weapon-features',weaponProfiles:clone(VERSATILE_PROFILES),aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponVersatile(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_VERSATILE_KEY);
  const version=existing?.getFlag(ID,'premade')?.version,current=['1.0.0','1.0.1'].includes(version),data=weaponVersatileData(),textUpdate={};
  // Correct only known old instructions; keep author customizations and the applied version.
  if(current){
    if(version==='1.0.0')textUpdate[`flags.${ID}.premade.version`]='1.0.1';
    if(existing.system?.description===LEGACY_DESCRIPTION)textUpdate['system.description']=data.system.description;
    if(existing.system?.gmNotes===LEGACY_NOTES)textUpdate['system.gmNotes']=data.system.gmNotes;
    if(!Object.keys(textUpdate).length)return existing;
  }
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(current?textUpdate:data):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Versatile weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
