import { ID } from '../core.js';
export const ISOLATING_KEY='martial-stance-isolating',ISOLATING_EFFECT='GcjxmDtqCU7J0IU3';
export function isolatingData(folder){const data={
  "name": "Isolating",
  "type": "feature",
  "img": "icons/magic/control/control-influence-rally-purple.webp",
  "system": {
    "attribution": {},
    "description": "<p>Gain advantage on attack rolls when there are no other creatures within Very Close range of you or your target.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "ZqZgI5Pc2qFFBt5o": {
        "type": "effect",
        "_id": "ZqZgI5Pc2qFFBt5o",
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
            "_id": "GcjxmDtqCU7J0IU3",
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
      "name": "Stance: Isolating",
      "disabled": false,
      "img": "icons/magic/control/control-influence-rally-purple.webp",
      "description": "<p>Gain advantage on attack rolls when there are no other creatures within Very Close range of you or your target.</p>",
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
      "_id": "GcjxmDtqCU7J0IU3",
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
data.folder=folder;data.flags={[ID]:{premade:{key:ISOLATING_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.QVKgnF8eUwbX8K9H']}}};return data;}
export async function ensureIsolating() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === ISOLATING_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(isolatingData(folder.id)) : await Item.create(isolatingData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Isolating creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
