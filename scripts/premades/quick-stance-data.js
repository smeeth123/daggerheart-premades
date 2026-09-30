import { ID } from '../core.js';
export const QUICK_STANCE_KEY='martial-stance-quick',QUICK_STANCE_EFFECT='E3nMTwKEtVGuqaqS';
export function quickStanceData(folder){const data={
  "name": "Quick",
  "type": "feature",
  "img": "icons/skills/movement/arrows-up-trio-red.webp",
  "system": {
    "attribution": {},
    "description": "<p>When you make an attack, you can spend a Focus or <strong>mark a Stress</strong> to target another creature within range with that attack.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "PQCbbHf8YZVe6Xqr": {
        "type": "effect",
        "_id": "PQCbbHf8YZVe6Xqr",
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
            "_id": "E3nMTwKEtVGuqaqS",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Enter Stance",
        "img": "icons/skills/movement/arrows-up-trio-red.webp",
        "range": "self"
      }
    },
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Stance: Quick",
      "disabled": false,
      "img": "icons/skills/movement/arrows-up-trio-red.webp",
      "description": "<p>When you make an attack, you can spend a Focus or <strong>mark a Stress</strong> to target another creature within range with that attack.</p>",
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
      "_id": "E3nMTwKEtVGuqaqS",
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
data.folder=folder;data.flags={[ID]:{premade:{key:QUICK_STANCE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.bGXfEQV5TLujvgp7']}}};return data;}
export async function ensureQuickStance() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === QUICK_STANCE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(quickStanceData(folder.id)) : await Item.create(quickStanceData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Quick creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
