import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const DEFENDER_KEY='warden-defender';
export function defenderData(folder){const data={
  "name": "Defender",
  "type": "feature",
  "img": "icons/magic/defensive/shield-barrier-flaming-diamond-acid.webp",
  "system": {
    "description": "<p>Your animal transformation embodies a healing guardian spirit. When you're in Beastform and an ally within Close range marks 2 or more Hit Points, you can mark a Stress to reduce the number of Hit Points they mark by 1.</p>",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:DEFENDER_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.Jdktv5p1K2PfgxrT']}}};return data;}
export async function ensureDefender() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === DEFENDER_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warden of Renewal');
  if (!folder) throw new Error('The Warden of Renewal compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(defenderData(folder.id)) : await Item.create(defenderData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Defender creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
