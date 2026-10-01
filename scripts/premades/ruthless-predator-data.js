import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const RUTHLESS_KEY='wayfinder-ruthless-predator';
export function ruthlessData(folder){const data={
  "name": "Ruthless Predator",
  "type": "feature",
  "img": "icons/creatures/mammals/wolf-shadow-black.webp",
  "system": {
    "description": "<p>When you make a damage roll, you can mark a Stress to gain a +1 bonus to your Proficiency. Additionally, when you deal Severe damage to an adversary, they must mark a Stress.</p>",
    "resource": null,
    "actions": {},
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};data.folder=folder;data.flags={[ID]:{premade:{key:RUTHLESS_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.Qny2J3R35bvC0Cey']}}};return data;}
export async function ensureRuthlessPredator() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === RUTHLESS_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Wayfinder');
  if (!folder) throw new Error('The Wayfinder compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(ruthlessData(folder.id)) : await Item.create(ruthlessData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Ruthless Predator creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
