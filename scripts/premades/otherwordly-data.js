import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const OTHERWORDLY_KEY='martial-stance-otherwordly',OTHERWORDLY_EFFECT='RtscqiOS754ouvOM';
export function otherwordlyData(folder){const data={
  "name": "Otherwordly",
  "type": "feature",
  "img": "icons/skills/melee/strike-weapon-polearm-ice-blue.webp",
  "system": {
    "attribution": {},
    "description": "<p>On a successful attack, you can deal physical or magic damage.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "R6KliyvYNNvAzMbz": {
        "type": "effect",
        "_id": "R6KliyvYNNvAzMbz",
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
            "key": "focus",
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
        "effects": [
          {
            "_id": "RtscqiOS754ouvOM",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Enter Stance",
        "range": "self"
      }
    },
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Stance: Otherwordly",
      "disabled": false,
      "img": "icons/skills/melee/strike-weapon-polearm-ice-blue.webp",
      "description": "<p>On a successful attack, you can deal physical or magic damage.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": "scene"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "RtscqiOS754ouvOM",
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
data.folder=folder;data.flags={[ID]:{premade:{key:OTHERWORDLY_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.K2R2i8dhtNnY9MYR']}}};return data;}
export async function ensureOtherwordly() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === OTHERWORDLY_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(otherwordlyData(folder.id)) : await Item.create(otherwordlyData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Otherwordly creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
