import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const AMBUSH_KEY='executioners-ambush';
export function ambushData(folder){const data={
  "type": "feature",
  "name": "Ambush",
  "img": "icons/magic/perception/silhouette-stealth-shadow.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Your \"Marked for Death\" feature uses <strong>d6s</strong> instead of d4s.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:AMBUSH_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.WkrwX3w8K4wLpaY8']}}};return data;}
export async function ensureAmbush() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === AMBUSH_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Executioners Guild');
  if (!folder) throw new Error('The Executioners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(ambushData(folder.id)) : await Item.create(ambushData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Ambush creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
