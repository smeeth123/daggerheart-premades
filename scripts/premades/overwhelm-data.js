import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const OVERWHELM_KEY='juggernaut-overwhelm';
export function overwhelmData(folder){const data={
  "type": "feature",
  "name": "Overwhelm",
  "img": "icons/magic/movement/trail-streak-impact-blue.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you succeed on an attack against a target, you can <strong>spend a Hope</strong> to throw the target within Close range or to force them to mark a Stress.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "mjIdxGa5T9MzPk3D": {
        "type": "damage",
        "damage": {
          "main": null,
          "resources": {
            "stress": {
              "base": false,
              "applyTo": "stress",
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
        "_id": "mjIdxGa5T9MzPk3D",
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
            "itemId": null,
            "key": "hope",
            "value": 1,
            "scalable": false,
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
        "name": "Spend Hope",
        "range": ""
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:OVERWHELM_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.36POMgbO969M38Ky']}}};return data;}
export async function ensureOverwhelm() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === OVERWHELM_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Juggernaut');
  if (!folder) throw new Error('The Juggernaut compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(overwhelmData(folder.id)) : await Item.create(overwhelmData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Overwhelm creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
