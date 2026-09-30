import { ID } from '../core.js';
export const PUMMEL_KEY='juggernaut-pummeljoy';
export function pummelData(folder){const data={
  "type": "feature",
  "name": "Pummeljoy",
  "img": "icons/magic/movement/abstract-ribbons-red-orange.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you critically succeed on a Melee weapon attack, you gain an additional Hope, clear an additional Stress, and gain a +1 bonus to your Proficiency for that attack.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:PUMMEL_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.vAZFKiSCZYHBbmtb']}}};return data;}
export async function ensurePummeljoy() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === PUMMEL_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Juggernaut');
  if (!folder) throw new Error('The Juggernaut compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(pummelData(folder.id)) : await Item.create(pummelData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Pummeljoy creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
