import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_RICOCHET_KEY='weapon-ricochet';
export function weaponRicochetData(){
  return {name:'Ricochet',type:'feature',img:'icons/magic/light/beam-impact-deflect-teal.webp',
    system:{description:'<p>When you make an attack, you can mark a Stress to target another creature within Very Close range of the first target with that attack.</p>',
      gmNotes:'Apply Medkit to a weapon with the native Ricochet property. Before rolling the attack, choose one additional creature within Very Close of the first target and mark 1 Stress. Both targets use the same native attack and damage roll. The extra target need not be within range of the attacker. No weapon statistics, actions or effects are replaced.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_RICOCHET_KEY,version:'1.0.0',category:'weapon-features',weaponFeature:'ricochet',aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponRicochet(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_RICOCHET_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(weaponRicochetData()):await Item.create(weaponRicochetData(),{pack:pack.collection});
    if(!item)throw Error('Ricochet weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
