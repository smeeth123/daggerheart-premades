import { ID } from '../core.js';
export const HARDY_KEY='frostborne-hardy';
export const HARDY_ACTION='kMZnJpFvVJlloXGO';
export function hardyData(folder){
const data={
  "name": "Hardy",
  "type": "feature",
  "img": "icons/magic/life/cross-worn-green.webp",
  "system": {
    "attribution": {},
    "description": "<p>When you take a rest, you clear a Hit Point.</p>",
    "gmNotes": "Automatically clears 1 marked HP when you open a Short or Long Rest, once per rest window before downtime moves. No prompt.",
    "resource": null,
    "actions": {
      "kMZnJpFvVJlloXGO": {
        "type": "healing",
        "_id": "kMZnJpFvVJlloXGO",
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
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "damage": {
          "main": null,
          "resources": {
            "hitPoints": {
              "base": false,
              "applyTo": "hitPoints",
              "resultBased": false,
              "fullRestore": false,
              "value": {
                "multiplier": "flat",
                "flatMultiplier": 0,
                "dice": "d6",
                "bonus": 1,
                "custom": {
                  "enabled": false,
                  "formula": ""
                }
              },
              "valueAlt": {
                "multiplier": "flat",
                "flatMultiplier": 1,
                "dice": "d6",
                "bonus": null,
                "custom": {
                  "enabled": false,
                  "formula": ""
                }
              }
            }
          }
        },
        "target": {
          "type": "self",
          "amount": null
        },
        "effects": [],
        "roll": {
          "type": null,
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "prof",
            "flatMultiplier": 1,
            "dice": "d6",
            "compare": null,
            "treshold": null
          },
          "useDefault": false
        },
        "name": "",
        "range": "self"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:HARDY_KEY,version:'1.0.0',category:'community-features',aliases:[],sourceUuids:['Compendium.daggerheart.communities.Item.z8HhzWZUZCSrbzTc']}}};return data;
}
export async function ensureHardy() {
  const pack = game.packs.get(`${ID}.community-features`);
  if (!pack) throw new Error('The Community Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === HARDY_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Frostborne');
  if (!folder) throw new Error('The Frostborne compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(hardyData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Hardy creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
