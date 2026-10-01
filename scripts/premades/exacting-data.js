import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const EXACTING_KEY='martial-stance-exacting',EXACTING_EFFECT='lDRAICtZPyjMWKgB';
export function exactingData(folder){const data={
  "name": "Exacting",
  "type": "feature",
  "img": "icons/skills/melee/strike-axe-red.webp",
  "system": {
    "attribution": {},
    "description": "<p>When you roll a 1 on a damage die, you can treat it as the highest value on the die instead.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "HJqhV6t6uDlh7aWd": {
        "type": "effect",
        "_id": "HJqhV6t6uDlh7aWd",
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
            "_id": "lDRAICtZPyjMWKgB",
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
      "name": "Stance: Exacting",
      "disabled": false,
      "img": "icons/skills/melee/strike-axe-red.webp",
      "description": "<p>When you roll a 1 on a damage die, you can treat it as the highest value on the die instead.</p>",
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
      "_id": "lDRAICtZPyjMWKgB",
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
data.folder=folder;data.flags={[ID]:{premade:{key:EXACTING_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.hzDDTkBp1cqMOq7z']}}};return data;}
export async function ensureExacting() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === EXACTING_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(exactingData(folder.id)) : await Item.create(exactingData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Exacting creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
