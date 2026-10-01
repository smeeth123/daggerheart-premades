import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const STORM_KEY='skykin-eye-of-the-storm';
export const STORM_ACTION='q5tGBckJzCGyIbmu';
export function stormData(folder){
const data={
  "name": "Eye of the Storm",
  "type": "feature",
  "img": "icons/magic/air/wind-vortex-swirl-blue-purple.webp",
  "system": {
    "attribution": {},
    "description": "<p><strong>Spend 2 Hope</strong> to grant you or an ally within Melee range a +1 bonus to Evasion until you take Severe damage or you use this feature again.</p>",
    "gmNotes": "Preserves native action and Evasion effect. Existing applications expire when the originating Skykin takes Severe-or-higher damage after reduction, or successfully uses this feature again.",
    "resource": null,
    "actions": {
      "q5tGBckJzCGyIbmu": {
        "type": "effect",
        "_id": "q5tGBckJzCGyIbmu",
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
            "value": 2,
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
        "effects": [
          {
            "_id": "2XEJf5yXdvk1r81V",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": 1
        },
        "name": "Spend Hope",
        "range": "veryClose"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": [
    {
      "name": "Eye Of The Storm",
      "disabled": false,
      "img": "icons/magic/air/wind-vortex-swirl-blue-purple.webp",
      "description": "<p>+1 bonus to Evasion.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [
          {
            "key": "system.evasion",
            "type": "add",
            "value": 1,
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": "",
          "type": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "2XEJf5yXdvk1r81V",
      "type": "base",
      "start": {
        "time": 0,
        "combat": null,
        "combatant": null,
        "initiative": null,
        "round": null,
        "turn": null
      },
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "tint": "#ffffff",
      "showIcon": 1,
      "folder": null,
      "sort": 0,
      "flags": {}
    }
  ]
};
data.folder=folder;data.flags={[ID]:{premade:{key:STORM_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.H18ab3im0cn6gYdC']}}};return data;
}
export async function ensureEyeOfTheStorm() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === STORM_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Skykin');
  if (!folder) throw new Error('The Skykin compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(stormData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Eye of the Storm creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
