import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const BRAVE_KEY='warborne-brave-face';
export const BRAVE_ACTION='sguCcIhnp8FjwVZd';
export function braveData(folder){
const data={
  "name": "Brave Face",
  "type": "feature",
  "img": "icons/magic/control/control-influence-rally-purple.webp",
  "system": {
    "attribution": {},
    "description": "<p>Once per session when you would be forced to mark a Stress, you can <strong>spend a Hope</strong> instead.</p>",
    "gmNotes": "Prompts before incoming Stress through the native damage workflow. Spend 1 Hope and the session use to prevent 1 Stress before overflow. Voluntary costs and manual tracker edits are excluded.",
    "resource": null,
    "actions": {
      "sguCcIhnp8FjwVZd": {
        "type": "effect",
        "_id": "sguCcIhnp8FjwVZd",
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
          "recovery": "session",
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
data.folder=folder;data.flags={[ID]:{premade:{key:BRAVE_KEY,version:'1.0.0',category:'community-features',aliases:[],sourceUuids:['Compendium.daggerheart.communities.Item.E7QiHAoOxQIZEVR1']}}};return data;
}
export async function ensureBraveFace() {
  const pack = game.packs.get(`${ID}.community-features`);
  if (!pack) throw new Error('The Community Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === BRAVE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warborne');
  if (!folder) throw new Error('The Warborne compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(braveData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Brave Face creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
