import { ID } from '../core.js';
export const NOT_DONE_KEY='juggernaut-not-done-yet';
export function notDoneData(folder){const data={
  "type": "feature",
  "name": "Not Done Yet",
  "img": "icons/magic/holy/barrier-shield-winged-blue.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you take Severe damage, you can gain a Hope or clear a Stress.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:NOT_DONE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.kKdC6wJ7YAF4F12p']}}};return data;}
export async function ensureNotDone() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === NOT_DONE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Juggernaut');
  if (!folder) throw new Error('The Juggernaut compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(notDoneData(folder.id)) : await Item.create(notDoneData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Not Done Yet creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
