import { ID } from '../core.js';
export const POISE_KEY='executioners-scorpions-poise';
export function poiseData(folder){const data={
  "type": "feature",
  "name": "Scorpion's Poise",
  "img": "icons/magic/defensive/illusion-evasion-echo-purple.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You gain a +2 bonus to your Evasion against attacks made by a creature you've <em>Marked for Death</em>.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:POISE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.lg7f25bLIJWWLOcB']}}};return data;}
export async function ensureScorpionsPoise() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === POISE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Executioners Guild');
  if (!folder) throw new Error('The Executioners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(poiseData(folder.id)) : await Item.create(poiseData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Scorpion’s Poise creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
