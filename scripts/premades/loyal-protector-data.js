import {ID} from '../core.js';
export const LOYAL_KEY='vengeance-loyal-protector';
export function loyalProtectorData(folder){const data={
  "name": "Loyal Protector",
  "type": "feature",
  "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "system": {
    "description": "<p>When an ally within Close range has 2 or fewer Hit Points and would take damage, you can <strong>mark a Stress</strong> to sprint to their side and take the damage instead.</p>",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:LOYAL_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.hd7UeBPr86Mz21Pe']}}};return data;}
export async function ensureLoyalProtector() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === LOYAL_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Vengeance');
  if (!folder) throw new Error('The Vengeance compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(loyalProtectorData(folder.id)) : await Item.create(loyalProtectorData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('LoyalProtector creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
