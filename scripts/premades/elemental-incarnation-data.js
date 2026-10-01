import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const ELEMENTAL_KEY='warden-elemental-incarnation';
export const ELEMENTS={fire:'ANle8tuOEZIevTWv',earth:'7xyUtUbBk5jbNnqY',water:'Jy6dpEbzkZ2eRDf5',air:'3ck6CeapLxQVjE2W'};
export function elementalData(folder){const data={
  "name": "Elemental Incarnation",
  "type": "feature",
  "img": "icons/magic/nature/thorns-hand-glow-green.webp",
  "system": {
    "description": "<p>Mark a Stress to Channel one of the following elements until you take Severe damage or until your next rest:</p><ul><li><p><strong>Fire</strong>: When an adversary within Melee range deals damage to you, they take 1d10 magic damage.</p></li><li><p><strong>Earth</strong>: Gain a bonus to your damage thresholds equal to your Proficiency.</p></li><li><p><strong>Wate</strong>r: When you deal damage to an adversary within Melee range, all other adversaries within Very Close range must mark a Stress.</p></li><li><p><strong>Air</strong>: You can hover, gaining advantage on Agility Rolls.</p></li></ul>",
    "resource": null,
    "actions": {
      "wVGSzAnJGs5eXKqI": {
        "type": "effect",
        "_id": "wVGSzAnJGs5eXKqI",
        "systemPath": "actions",
        "description": "<p>When an adversary within Melee range deals damage to you, they take @Damage[type:magical|value:1d10].</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "step": null,
            "itemId": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "target": {
          "type": "self",
          "amount": null
        },
        "effects": [
          {
            "_id": "ANle8tuOEZIevTWv",
            "onSave": false
          }
        ],
        "name": "Channel Fire",
        "img": "icons/magic/fire/elemental-fire-flying.webp",
        "range": "self",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "6QXTThhnJpGDIvhJ": {
        "type": "effect",
        "_id": "6QXTThhnJpGDIvhJ",
        "systemPath": "actions",
        "description": "<p>Gain a bonus to your damage thresholds equal to your Proficiency.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "step": null,
            "itemId": null,
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
            "_id": "7xyUtUbBk5jbNnqY",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Channel Earth",
        "img": "icons/magic/earth/construct-stone.webp",
        "range": "self",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "pY2EdEMoyLGYWjK5": {
        "type": "effect",
        "_id": "pY2EdEMoyLGYWjK5",
        "systemPath": "actions",
        "description": "<p>When you deal damage to an adversary within Melee range, all other adversaries within Very Close range must mark a Stress.</p><p>@Template[type:emanation|range:vc]</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "step": null,
            "itemId": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "target": {
          "type": "self",
          "amount": null
        },
        "effects": [
          {
            "_id": "Jy6dpEbzkZ2eRDf5",
            "onSave": false
          }
        ],
        "name": "Channel Water",
        "img": "icons/magic/water/wave-water-blue.webp",
        "range": "self",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "uk8EgHMxCgoWENzt": {
        "type": "effect",
        "_id": "uk8EgHMxCgoWENzt",
        "systemPath": "actions",
        "description": "<p>You can hover, gaining advantage on Agility Rolls.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "step": null,
            "itemId": null,
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
            "_id": "3ck6CeapLxQVjE2W",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Channel Air",
        "img": "icons/magic/air/fog-gas-smoke-dense-white.webp",
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
    "gmNotes": "",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Elemental Incarnation (Earth)",
      "img": "icons/magic/earth/construct-stone.webp",
      "transfer": false,
      "_id": "7xyUtUbBk5jbNnqY",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.damageThresholds.major",
            "type": "add",
            "value": "@system.proficiency",
            "priority": 21,
            "phase": "initial"
          },
          {
            "key": "system.damageThresholds.severe",
            "type": "add",
            "value": "@system.proficiency",
            "priority": 21,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": "",
          "type": "shortRest"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Elemental Incarnation (Air)",
      "img": "icons/magic/air/fog-gas-smoke-dense-white.webp",
      "transfer": false,
      "_id": "3ck6CeapLxQVjE2W",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": "shortRest"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>You can hover, gaining advantage on Agility Rolls.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Elemental Incarnation (Water)",
      "img": "icons/magic/water/wave-water-blue.webp",
      "transfer": false,
      "_id": "Jy6dpEbzkZ2eRDf5",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": "shortRest"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Elemental Incarnation (Fire)",
      "img": "icons/magic/fire/elemental-fire-flying.webp",
      "transfer": false,
      "_id": "ANle8tuOEZIevTWv",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": "shortRest"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
data.folder=folder;data.flags={[ID]:{premade:{key:ELEMENTAL_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.f37TTgCc0Q3Ih1A1']}}};return data;}
export async function ensureElementalIncarnation() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === ELEMENTAL_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warden of the Elements');
  if (!folder) throw new Error('The Warden of the Elements compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(elementalData(folder.id)) : await Item.create(elementalData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('ElementalIncarnation creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
