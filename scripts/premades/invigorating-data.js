import { ID } from '../core.js';
export const INVIGORATING_KEY='martial-stance-invigorating',INVIGORATING_EFFECT='ZW4pQL4QoTFKL7Ry';
export function invigoratingData(folder){const data={
  "name": "Invigorating",
  "type": "feature",
  "img": "icons/magic/life/cross-beam-green.webp",
  "system": {
    "attribution": {},
    "description": "<p>On a successful attack, roll a d4. On a result of 4, gain a Focus.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "1xtWty9JmQwHDr5p": {
        "type": "effect",
        "_id": "1xtWty9JmQwHDr5p",
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
            "_id": "ZW4pQL4QoTFKL7Ry",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Enter Stance",
        "range": "self",
        "img": "icons/magic/life/cross-beam-green.webp"
      }
    },
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Stance: Invigorating",
      "disabled": false,
      "img": "icons/magic/life/cross-beam-green.webp",
      "description": "<p>On a successful attack, roll a d4. On a result of 4, gain a Focus.</p>",
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
      "_id": "ZW4pQL4QoTFKL7Ry",
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
data.folder=folder;data.flags={[ID]:{premade:{key:INVIGORATING_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.ewgpPblJAcHCHPUO']}}};return data;}
export async function ensureInvigorating() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === INVIGORATING_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(invigoratingData(folder.id)) : await Item.create(invigoratingData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Invigorating creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
