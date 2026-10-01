import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const LUCKBRINGER_KEY='halfling-luckbringer';
export const LUCKBRINGER_ACTION='8sK3t73bFkpb999C';
export function luckbringerData(folder){
const data={
  "name": "Luckbringer",
  "type": "feature",
  "img": "icons/magic/life/heart-hand-gold-green.webp",
  "system": {
    "description": "<p>At the start of each session, everyone in your party gains a Hope.</p>",
    "resource": null,
    "actions": {
      "8sK3t73bFkpb999C": {
        "type": "healing",
        "_id": "8sK3t73bFkpb999C",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "session",
          "consumeOnSuccess": false
        },
        "damage": {
          "main": null,
          "resources": {
            "hope": {
              "value": {
                "custom": {
                  "enabled": true,
                  "formula": "1"
                },
                "multiplier": "prof",
                "flatMultiplier": 1,
                "dice": "d6",
                "bonus": null
              },
              "applyTo": "hope",
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
              "fullRestore": false
            }
          }
        },
        "target": {
          "type": "friendly",
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
        "name": "Gain Hope",
        "img": "icons/magic/life/heart-hand-gold-green.webp",
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
    "gmNotes": "Automatically grants 1 Hope to every active Party member after a GM Session refresh, then spends this session action use. No prompt.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:LUCKBRINGER_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.8O6SQQMxKWr430QA']}}};return data;
}
export async function ensureLuckbringer() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === LUCKBRINGER_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Halfling');
  if (!folder) throw new Error('The Halfling compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(luckbringerData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Luckbringer creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
