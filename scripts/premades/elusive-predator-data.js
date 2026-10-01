import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const ELUSIVE_KEY='wayfinder-elusive-predator';
export function elusiveData(folder){const data={
  "name": "Elusive Predator",
  "type": "feature",
  "img": "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp",
  "system": {
    "description": "<p>When your Focus makes an attack against you, you gain a +2 bonus to your Evasion against the attack.</p>",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:ELUSIVE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.Cjtc43V3IzAmfIFG']}}};return data;}
export async function ensureElusivePredator() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === ELUSIVE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Wayfinder');
  if (!folder) throw new Error('The Wayfinder compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(elusiveData(folder.id)) : await Item.create(elusiveData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Elusive Predator creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
