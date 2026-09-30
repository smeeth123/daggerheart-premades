import {ID} from '../core.js';
export const REVENGE_KEY='vengeance-revenge';
export function revengeData(folder){const data={
  "name": "Revenge",
  "type": "feature",
  "img": "icons/magic/unholy/silhouette-robe-evil-glow.webp",
  "system": {
    "description": "<p>When an adversary within Melee range succeeds on an attack against you, you can mark 2 Stress to force the attacker to mark a Hit Point.</p>",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:REVENGE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.oNfA5F9cKwNR7joq']}}};return data;}
export async function ensureRevenge() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === REVENGE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Vengeance');
  if (!folder) throw new Error('The Vengeance compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(revengeData(folder.id)) : await Item.create(revengeData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Revenge creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
