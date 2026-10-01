import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const TIME_KEY='wizard-not-this-time',TIME_ACTION='lX5FtnuXaKOdRlLF';
export function timeData(folder){const data={
  "name": "Not This Time",
  "type": "feature",
  "img": "icons/magic/control/hypnosis-mesmerism-swirl.webp",
  "system": {
    "description": "<p><strong>Spend 3 Hope</strong> to force an adversary within Far range to reroll an attack or damage roll.</p>",
    "resource": null,
    "actions": {
      "lX5FtnuXaKOdRlLF": {
        "type": "effect",
        "_id": "lX5FtnuXaKOdRlLF",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 3,
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
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Spend Hope",
        "img": "icons/magic/control/hypnosis-mesmerism-swirl.webp",
        "range": "far",
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
    "gmNotes": "",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:TIME_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.h3VE0jhcM5xHKBs4']}}};return data;}
export async function ensureNotThisTime() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === TIME_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Wizard');
  if (!folder) throw new Error('The Wizard compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(timeData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Not This Time creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
