import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_PIERCING_KEY='weapon-piercing';
export const PIERCING_WEAPONS=[
  ['Twisted Dagger','DEKB75Vz2SW76Y4g'],['Improved Twisted Dagger','rLQqUhtDXphRwS49'],
  ['Advanced Twisted Dagger','LDOzJ72iAWShxnf3'],['Legendary Twisted Dagger','ayhbVOYel64OfAf0'],
  ['Platinum Estoc','y5eF0ORiMmJLlKvz'],['Crystal Spear','wHWKdgOayBwRB8R3']
].map(([name,id])=>({name,sourceUuid:`Compendium.daggerheart.weapons.Item.${id}`}));
export function weaponPiercingData(){
  return {name:'Piercing',type:'feature',img:'icons/skills/melee/strike-spear-red.webp',
    system:{description:'<p>Damage dealt with this weapon treats the target’s Major threshold as having a −2 penalty.</p>',
      gmNotes:'Apply Medkit to a Twisted Dagger (any tier), Platinum Estoc, or Crystal Spear. Piercing automatically follows this weapon’s native damage, including chat-card damage application and redirection. Only the recipient’s effective Major threshold changes for that damage; Severe thresholds, damage totals, Armor, and stored actor statistics stay native. No activation or cost.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_PIERCING_KEY,version:'1.0.1',category:'weapon-features',weaponItems:clone(PIERCING_WEAPONS),aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponPiercing(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_PIERCING_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.1')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(weaponPiercingData()):await Item.create(weaponPiercingData(),{pack:pack.collection});
    if(!item)throw Error('Piercing weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
