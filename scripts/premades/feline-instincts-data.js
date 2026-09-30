import { ID } from '../core.js';
export const FELINE_KEY='katari-feline-instincts';
export const FELINE_ACTION='ALsGHOy0q5THGxz5';
export function felineData(folder){
const data={
  "name": "Feline Instincts",
  "type": "feature",
  "img": "icons/magic/perception/eye-slit-orange.webp",
  "system": {
    "description": "<p>When you make an Agility Roll, you can <strong>spend 2 Hope</strong> to reroll your Hope Die.</p>",
    "resource": null,
    "actions": {
      "ALsGHOy0q5THGxz5": {
        "type": "effect",
        "_id": "ALsGHOy0q5THGxz5",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 2,
            "step": null,
            "itemId": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Spend Hope",
        "img": "icons/magic/perception/eye-slit-orange.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      }
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "Shared roll resolution: spend 2 Hope on an Agility roll to reroll only the Hope Die before consequences. Includes Reaction rolls; once per roll.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FELINE_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.lNgbbYnCKgrdvA85']}}};return data;
}
export async function ensureFelineInstincts() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === FELINE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Katari');
  if (!folder) throw new Error('The Katari compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(felineData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Feline Instincts creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
