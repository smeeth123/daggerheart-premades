import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FEATURE_KEY='executioners-true-strike';
export function featureData(folder){const data={
  "type": "feature",
  "name": "True Strike",
  "img": "icons/magic/death/weapon-sword-skull-purple.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Once per long rest when you fail an attack, you can <strong>spend a Hope</strong> to make it a success instead.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "kECUBjkHOxnSOVqE": {
        "type": "effect",
        "_id": "kECUBjkHOxnSOVqE",
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
          "value": 0,
          "max": "1",
          "recovery": "longRest",
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
data.folder=folder;data.flags={[ID]:{premade:{key:FEATURE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.D0Kno09So9aRO2Lf']}}};return data;}
export async function ensureTrueStrike() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FEATURE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Executioners Guild');
  if (!folder) throw new Error('The Executioners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(featureData(folder.id)) : await Item.create(featureData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('True Strike creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
