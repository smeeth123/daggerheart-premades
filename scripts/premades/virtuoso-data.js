import { ID } from '../core.js';
export const VIRTUOSO_KEY='troubadour-virtuoso';
export function virtuosoData(folder){const data={
  "type": "feature",
  "name": "Virtuoso",
  "img": "icons/magic/light/explosion-star-small-teal.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You are among the greatest of your craft and your skill is boundless. You can perform each of your <strong>Gifted Performer</strong> feature’s songs <strong>twice per long rest.</strong></p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:VIRTUOSO_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.kn2t409o0FDFQieo']}}};return data;}
export async function ensureVirtuoso() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === VIRTUOSO_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Troubadour');
  if (!folder) throw new Error('The Troubadour compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(virtuosoData(folder.id)) : await Item.create(virtuosoData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Virtuoso creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
