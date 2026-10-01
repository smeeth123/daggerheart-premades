import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const COMBO_KEY='brawler-combo-strike';
export const COMBO_ACTION='ZRZ0l8WZQdzg656w';
export function comboData(folder){
const data={
  "name": "Combo Strike",
  "type": "feature",
  "img": "icons/skills/melee/unarmed-punch-fist-blue.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>After rolling damage on a successful attack with a Melee weapon, you can <strong>mark a Stress</strong> to start a combo strike. When you do, roll your Combo Die and note the result, then continue rolling your Combo Die until the result of your latest roll is lower than the roll that preceded it. You deal extra damage equal to the total of all rolled Combo Die results on this attack. The results can't be modified by any means.</p><p>Your Combo Die starts as a <strong>d4</strong>. Once per tier, you can increase your Combo Die by one step as a level advancement option.</p>",
    "gmNotes": "After successful Melee weapon damage, prompts for 1 Stress and adds a native Combo Die sequence to that damage before application. Uses current Combo Die size. One hit target required.",
    "resource": null,
    "actions": {
      "ZRZ0l8WZQdzg656w": {
        "type": "damage",
        "damage": {
          "main": {
            "base": false,
            "applyTo": "hitPoints",
            "resultBased": false,
            "fullRestore": false,
            "value": {
              "multiplier": "flat",
              "flatMultiplier": 1,
              "dice": "d6",
              "bonus": null,
              "custom": {
                "enabled": true,
                "formula": "2d(@system.rules.roll.comboDieFaces)c"
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
            },
            "includeBase": false,
            "direct": false,
            "type": [
              "physical"
            ]
          },
          "resources": {}
        },
        "_id": "ZRZ0l8WZQdzg656w",
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
            "key": "stress",
            "value": 1,
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
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [],
        "name": "Mark Stress",
        "range": ""
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:COMBO_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.LtG3pKzd4gtfLgFJ']}}};return data;
}
export async function ensureComboStrike() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === COMBO_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Brawler');
  if (!folder) throw new Error('The Brawler compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(comboData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Combo Strike creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
