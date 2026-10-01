import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const DEATH_KEY='executioners-death-strike',DEATH_ACTION='9oSm12oXjIl7Xi6m';
export function deathData(folder){const data={
  "type": "feature",
  "name": "Death Strike",
  "img": "icons/weapons/swords/greatsword-evil-green.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you deal Severe damage to a creature, you can <strong>mark a Stress</strong> to force them to mark an additional Hit Point.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "9oSm12oXjIl7Xi6m": {
        "type": "damage",
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
        "_id": "9oSm12oXjIl7Xi6m",
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
data.folder=folder;data.flags={[ID]:{premade:{key:DEATH_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.hdy7nz7hnYkN0tGF']}}};return data;}
export async function ensureDeathStrike() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === DEATH_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Executioners Guild');
  if (!folder) throw new Error('The Executioners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(deathData(folder.id)) : await Item.create(deathData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Death Strike creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
