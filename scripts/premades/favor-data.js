import { ID } from '../core.js';
export const FAVOR_KEY='warlock-favor';
export function favorData(folder){const data={
  "type": "feature",
  "name": "Favor",
  "img": "icons/creatures/magical/spirit-fear-energy-pink.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You start with 3 Favor. You can use a downtime move to show tribute to your patron. Describe how and gain Favor equal to your Spellcast trait. Additionally, when you succeed on an action roll with Hope, you can choose to gain a Favor instead of a Hope.</p>",
    "gmNotes": "",
    "resource": {
      "type": "simple",
      "value": 3,
      "max": "6",
      "progression": "decreasing",
      "recovery": null,
      "icon": "fa-solid fa-spaghetti-monster-flying"
    },
    "actions": {},
    "featureForm": "passive",
    "granter": null,
    "actorResources": [
      "favor"
    ]
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FAVOR_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.OGPn7DUJoJwAXh8o']}}};return data;}
export async function ensureFavor() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === FAVOR_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warlock');
  if (!folder) throw new Error('The Warlock compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(favorData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Favor creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
