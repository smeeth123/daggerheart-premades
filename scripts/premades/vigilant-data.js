import { ID } from '../core.js';
export const VIGILANT_KEY='martial-stance-vigilant',VIGILANT_EFFECT='3ywLEf7h2TaVzOCf';
export function vigilantData(folder){const data={
  "name": "Vigilant",
  "type": "feature",
  "img": "icons/magic/perception/eye-ringed-green.webp",
  "system": {
    "attribution": {},
    "description": "<p>When you are targeted by an attack, you can <strong>mark a Stress</strong> to gain a <strong>[[/r d6]]</strong> bonus to your Evasion against the attack.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "4oZ4pFro1PnCoENs": {
        "type": "effect",
        "_id": "4oZ4pFro1PnCoENs",
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
            "_id": "3ywLEf7h2TaVzOCf",
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
      "name": "Stance: Vigilant",
      "disabled": false,
      "img": "icons/magic/perception/eye-ringed-green.webp",
      "description": "<p>When you are targeted by an attack, you can <strong>mark a Stress</strong> to gain a <strong>d6</strong> bonus to your Evasion against the attack.</p>",
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
      "_id": "3ywLEf7h2TaVzOCf",
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
data.folder=folder;data.flags={[ID]:{premade:{key:VIGILANT_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.4bLcpljjJylzM5xg']}}};return data;}
export async function ensureVigilant() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === VIGILANT_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(vigilantData(folder.id)) : await Item.create(vigilantData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Vigilant creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
