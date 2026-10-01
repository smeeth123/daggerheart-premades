import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FEATURE_KEY='poisoners-twin-fang';
export function featureData(folder){const data={
  "type": "feature",
  "name": "Twin Fang",
  "img": "icons/skills/melee/strike-dagger-poison-green.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you afflict a target <em>Marked for Death</em> with a poison you know, you can spend an additional token to also inflict the effect of a second poison you know.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FEATURE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.i4iY1IBTBWEI01QU']}}};return data;}
export async function ensureTwinFang() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FEATURE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Poisoners Guild');
  if (!folder) throw new Error('The Poisoners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(featureData(folder.id)) : await Item.create(featureData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Twin Fang creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
