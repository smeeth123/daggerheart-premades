import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const TUSKS_KEY='orc-tusks';
export const TUSKS_ACTION='ytSFDCONRi5L4THz';
export function tusksData(folder){
const data={
  "name": "Tusks",
  "type": "feature",
  "img": "icons/creatures/abilities/fang-tooth-blood-red.webp",
  "system": {
    "description": "<p>When you succeed on an attack against a target within Melee range, you can <strong>spend a Hope</strong> to gore the target with your tusks, dealing an extra <strong>1d6</strong> damage.</p>",
    "resource": null,
    "actions": {
      "ytSFDCONRi5L4THz": {
        "type": "damage",
        "_id": "ytSFDCONRi5L4THz",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "consumeOnSuccess": false,
            "itemId": null
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "damage": {
          "main": {
            "value": {
              "custom": {
                "enabled": false,
                "formula": ""
              },
              "multiplier": "flat",
              "dice": "d6",
              "bonus": null,
              "flatMultiplier": 1
            },
            "applyTo": "hitPoints",
            "type": [],
            "base": false,
            "resultBased": false,
            "valueAlt": {
              "multiplier": "prof",
              "flatMultiplier": 1,
              "dice": "d6",
              "bonus": null,
              "custom": {
                "enabled": false,
                "formula": ""
              }
            },
            "includeBase": false,
            "direct": false,
            "fullRestore": false
          },
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": 1
        },
        "effects": [],
        "name": "Spend Hope",
        "img": "icons/creatures/abilities/fang-tooth-blood-red.webp",
        "range": "melee",
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
    "gmNotes": "After a successful attack within Melee range, prompts to spend 1 Hope and adds Tusks (+1d6) to the damage dialog Effects. Works with automatic damage; requires exactly one hit target.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:TUSKS_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.YhxD1ujZpftPu19w']}}};return data;
}
export async function ensureTusks() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === TUSKS_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Orc');
  if (!folder) throw new Error('The Orc compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(tusksData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Tusks creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
