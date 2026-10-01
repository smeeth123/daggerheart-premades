import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const UNBOUND_KEY='freeborne-unbound';
export const UNBOUND_ACTION='L03g0jA9msxRiuXL';
export function unboundData(folder){
const data={
  "name": "Unbound",
  "type": "feature",
  "img": "icons/magic/control/buff-flight-wings-runes-blue-white.webp",
  "system": {
    "attribution": {},
    "description": "<p>Once per session when you roll with Fear, you can change it into a roll with Hope instead.</p>",
    "gmNotes": "Offered in shared roll resolution on Fear, including Reaction rolls. Converts to Hope before consequences and spends the native once-per-session action use.",
    "resource": null,
    "actions": {
      "L03g0jA9msxRiuXL": {
        "type": "effect",
        "_id": "L03g0jA9msxRiuXL",
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
        "cost": [],
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
        "name": "Fear To Hope",
        "range": ""
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:UNBOUND_KEY,version:'1.0.0',category:'community-features',aliases:[],sourceUuids:['Compendium.daggerheart.communities.Item.OyzEkHdHYwmoofQx']}}};return data;
}
export async function ensureUnbound() {
  const pack = game.packs.get(`${ID}.community-features`);
  if (!pack) throw new Error('The Community Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === UNBOUND_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Freeborne');
  if (!folder) throw new Error('The Freeborne compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(unboundData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Unbound creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
