import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const STURDY_KEY='orc-sturdy';
export function sturdyData(folder){
const data={name:'Sturdy',type:'feature',img:'icons/magic/defensive/shield-barrier-glowing-triangle-purple-orange.webp',system:{description:'<p>When you have 1 Hit Point remaining, attacks against you have disadvantage.</p>',resource:null,actions:{},attribution:{source:'Daggerheart SRD',page:null,artist:''},gmNotes:'Automatically applies disadvantage to targeted attacks while exactly 1 Hit Point is unmarked. Uses shared advantage/disadvantage cancellation; no prompt.',granter:null,featureForm:'passive'},effects:[]};
data.folder=folder;data.flags={[ID]:{premade:{key:STURDY_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.60o3cKUZzxO9EDQF']}}};return data;
}
export async function ensureSturdy() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === STURDY_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Orc');
  if (!folder) throw new Error('The Orc compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(sturdyData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Sturdy creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
