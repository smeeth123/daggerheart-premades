import { ID } from '../core.js';
export const COMPASS_KEY='halfling-internal-compass';
export function compassData(folder){
const data={name:'Internal Compass',type:'feature',img:'icons/tools/navigation/compass-worn-copper.webp',system:{description:'<p>When you roll a 1 on your Hope Die, you can reroll it.</p>',resource:null,actions:{},attribution:{source:'Daggerheart SRD',page:null,artist:''},gmNotes:'Offered in shared roll resolution when your Hope Die shows 1, including Reaction rolls. No cost; once per roll. Rerolls only Hope before consequences.',granter:null,featureForm:'passive'},effects:[]};
data.folder=folder;data.flags={[ID]:{premade:{key:COMPASS_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.e2Cu6exxtvfQzc1e']}}};return data;
}
export async function ensureInternalCompass() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === COMPASS_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Halfling');
  if (!folder) throw new Error('The Halfling compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(compassData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Internal Compass creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
