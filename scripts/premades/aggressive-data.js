import { ID } from '../core.js';
export const AGGRESSIVE_KEY='martial-stance-aggressive',AGGRESSIVE_EFFECT='SbL1r4YtyDX6eYLe';
export function aggressiveData(folder){const data={
  "name": "Aggressive",
  "type": "feature",
  "img": "icons/skills/melee/maneuver-greatsword-yellow.webp",
  "system": {
    "attribution": {},
    "description": "<p>Gain a -1 penalty to your Evasion. On a successful attack, roll an additional damage die and discard the lowest result.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "9AsdA0xwYlajciA0": {
        "type": "effect",
        "_id": "9AsdA0xwYlajciA0",
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
            "_id": "SbL1r4YtyDX6eYLe",
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
      "name": "Stance: Aggressive",
      "disabled": false,
      "img": "icons/skills/melee/maneuver-greatsword-yellow.webp",
      "description": "<p>Gain a -1 penalty to your Evasion. On a successful attack, roll an additional damage die and discard the lowest result.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [
          {
            "key": "system.evasion",
            "type": "subtract",
            "value": 1,
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": "",
          "type": "scene"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "SbL1r4YtyDX6eYLe",
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
data.folder=folder;data.flags={[ID]:{premade:{key:AGGRESSIVE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.RoG3RZWVnTK6TYFI']}}};return data;}
export async function ensureAggressive() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === AGGRESSIVE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(aggressiveData(folder.id)) : await Item.create(aggressiveData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Aggressive creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
