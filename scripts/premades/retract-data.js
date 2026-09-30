import { ID } from '../core.js';
export const RETRACT_KEY='galapa-retract';
export function retractData(folder){
  const data={
  "name": "Retract",
  "type": "feature",
  "img": "icons/magic/defensive/shield-barrier-flaming-diamond-teal.webp",
  "system": {
    "description": "<p><strong>Mark a Stress</strong> to retract into your shell. While in your shell, you have resistance to physical damage, you have disadvantage on action rolls, and you can’t move.</p>",
    "resource": null,
    "actions": {
      "HfiAg14hrYt7Yvnj": {
        "type": "effect",
        "_id": "HfiAg14hrYt7Yvnj",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "step": null,
            "consumeOnSuccess": false,
            "itemId": null
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
            "_id": "3V4FPoyjJUnFP9WS",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Mark Stress",
        "img": "icons/magic/defensive/shield-barrier-flaming-diamond-teal.webp",
        "range": "self",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      }
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "<p>Enable the existing Retract effect while in your shell; disable it when you emerge. While this premade is enabled, the active effect automatically gives disadvantage on action rolls. Opposing advantage cancels it. Physical resistance and activation use the native effect; movement is manual.</p>",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Retract",
      "img": "icons/magic/defensive/shield-barrier-flaming-diamond-teal.webp",
      "transfer": true,
      "_id": "3V4FPoyjJUnFP9WS",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.resistance.physical.resistance",
            "type": "override",
            "value": 1,
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.disadvantageSources",
            "type": "add",
            "value": "Action rolls",
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "type": "",
          "description": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "disabled": true,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>While in your shell, you have resistance to physical damage, you have disadvantage on action rolls, and you can't move.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": {
        "time": 0,
        "combat": null,
        "combatant": null,
        "initiative": null,
        "round": null,
        "turn": null
      },
      "showIcon": 1,
      "folder": null
    }
  ]
};
  data.folder=folder;
  data.flags={ [ID]:{premade:{key:RETRACT_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.UFR67BUOhNGLFyg9']}}};
  return data;
}
export async function ensureRetract() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === RETRACT_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Galapa');
  if (!folder) throw new Error('The Galapa compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(retractData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Retract creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
