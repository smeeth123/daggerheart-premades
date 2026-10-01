import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const BOON_KEY='warlock-patrons-boon',BOON_ACTION='zpFHqkrFkUNhB5hB';
export function boonData(folder){const data={
  "type": "feature",
  "name": "Patron's Boon",
  "img": "icons/magic/symbols/runes-triangle-orange.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you fail a roll, you can <strong>spend 3 Hope</strong> to reroll with advantage.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "zpFHqkrFkUNhB5hB": {
        "type": "effect",
        "_id": "zpFHqkrFkUNhB5hB",
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
            "value": 3,
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
data.folder=folder;data.flags={[ID]:{premade:{key:BOON_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.QmFMbJzPV7DPLvjk']}}};return data;}
export async function ensurePatronsBoon() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === BOON_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warlock');
  if (!folder) throw new Error('The Warlock compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(boonData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Patron’s Boon creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
