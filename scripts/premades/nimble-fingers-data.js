import { ID } from '../core.js';
export const NIMBLE_KEY='gnome-nimble-fingers';
export const NIMBLE_ACTION='eIaosYhBPLBmFMSr';
export function nimbleData(folder){
const data={
  "name": "Nimble Fingers",
  "type": "feature",
  "img": "icons/skills/social/peace-luck-insult.webp",
  "system": {
    "attribution": {},
    "description": "<p>When you make a Finesse Roll, you can <strong>spend 2 Hope</strong> to reroll your Hope Die.</p>",
    "gmNotes": "<p>On Finesse Duality rolls, offers spending 2 Hope in the shared roll-resolution panel to reroll only the Hope Die, before consequences. Available once per roll; no rest/session counter.</p>",
    "resource": null,
    "actions": {
      "eIaosYhBPLBmFMSr": {
        "type": "effect",
        "_id": "eIaosYhBPLBmFMSr",
        "systemPath": "actions",
        "baseAction": false,
        "description": "",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 2,
            "itemId": null,
            "step": null,
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
        "range": ""
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:NIMBLE_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.tsX9rZ2JRkzgF8DR']}}};return data;
}
export async function ensureNimbleFingers() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === NIMBLE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Gnome');
  if (!folder) throw new Error('The Gnome compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(nimbleData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Nimble Fingers creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
