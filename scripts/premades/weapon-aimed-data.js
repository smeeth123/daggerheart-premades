import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_AIMED_KEY='weapon-aimed';
export function weaponAimedData(){
  return {name:'Aimed',type:'feature',img:'icons/skills/ranged/target-bullseye-arrow-yellow.webp',
    system:{description:'<p>Your attack has disadvantage if the target is within Very Close range of you or within Melee range of one of your allies. You can mark a Stress to ignore this penalty.</p>',
      gmNotes:'Apply Medkit to a weapon with the native Aimed property. Before attack configuration, nearby targets and friendly allies are checked using native scene ranges. Mark 1 Stress to ignore only Aimed’s penalty for this attack, or keep the disadvantage. Shared advantage cancellation remains native. A preparation cost remains spent if the later attack dialog is canceled. No weapon data is replaced.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_AIMED_KEY,version:'1.0.0',category:'weapon-features',weaponFeature:'aimed',aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponAimed(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_AIMED_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(weaponAimedData()):await Item.create(weaponAimedData(),{pack:pack.collection});
    if(!item)throw Error('Aimed weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
