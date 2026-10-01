import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const CHARM_KEY='witch-witchs-charm',CHARM_ACTION='iQwgbgc04oIW6h8p';
export function charmData(folder){const data={
  "type": "feature",
  "name": "Witch's Charm",
  "img": "icons/magic/control/debuff-energy-hold-pink.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When you or an ally within Far range fails an action roll, you can <strong>spend 3 Hope</strong> to change it into a success with Fear instead.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "iQwgbgc04oIW6h8p": {
        "type": "effect",
        "_id": "iQwgbgc04oIW6h8p",
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
        "range": "far"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:CHARM_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.7nIDpcWOGzO8Y6gq']}}};return data;}
export async function ensureWitchsCharm() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === CHARM_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Witch');
  if (!folder) throw new Error('The Witch compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(charmData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Witch’s Charm creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
