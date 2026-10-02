import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const ARMOR_BULKY_KEY='armor-bulky';
export function armorBulkyData(){
  return {name:'Bulky',type:'feature',img:'icons/commodities/metal/ingot-stamped-steel.webp',
    system:{description:'<p>−1 to Evasion; when you take Severe damage, you must mark a Stress.</p>',
      gmNotes:'Medkit the armor with native Bulky. The native Evasion penalty and all armor stats/effects stay unchanged. Positive damage that still causes 3 or more HP after reductions/prevention automatically marks 1 Stress through the native resource-damage workflow, including Stress prevention and full-Stress overflow. This is mandatory, not an optional prompt. Restart Foundry to discover the Armor Features compendium.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:ARMOR_BULKY_KEY,version:'1.0.0',category:'armor-features',armorFeature:'bulky',aliases:[],sourceUuids:[]}}}};
}
export async function ensureArmorBulky(){
  const pack=game.packs.get(`${ID}.armor-features`);
  if(!pack)throw Error('The Armor Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===ARMOR_BULKY_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(armorBulkyData()):await Item.create(armorBulkyData(),{pack:pack.collection});
    if(!item)throw Error('Bulky armor feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
