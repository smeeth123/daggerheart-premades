import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const POISON_KEY='poisoners-poison-compendium';
export function poisonData(folder){const data={
  "type": "feature",
  "name": "Poison Compendium",
  "img": "icons/skills/toxins/poison-skull-herbs-bottle-pink.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You also know these poisons:</p><ul><li><p><strong>Midnight Vine:</strong> The target has disadvantage on attack rolls until it marks a Stress to clear this condition.</p></li><li><p><strong>Gorgon Root:</strong> The target becomes temporarily <em>Restrained</em>.</p></li></ul>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "GUWDhuWJiqwANvR3": {
        "type": "effect",
        "_id": "GUWDhuWJiqwANvR3",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>The target has disadvantage on attack rolls until it marks a Stress to clear this condition.</p>",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "bNPKUrkGNZLkWRoF",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Midnight Vine",
        "range": "",
        "img": "icons/magic/nature/plant-undersea-glow-green.webp"
      },
      "tuUUVH5JxDjzF4O9": {
        "type": "effect",
        "_id": "tuUUVH5JxDjzF4O9",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>The target becomes temporarily <em>Restrained</em>.</p>",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "8YpVnj2tXjIZr8PG",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Gorgon Root",
        "range": "",
        "img": "icons/commodities/flowers/dandelion-pod-blue.webp"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": [
    {
      "name": "Midnight Vine",
      "disabled": false,
      "img": "icons/magic/nature/plant-undersea-glow-green.webp",
      "description": "<p>The target has disadvantage on attack rolls until it marks a Stress to clear this condition.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [
          {
            "key": "system.disadvantageSources",
            "type": "add",
            "value": "Attack Rolls",
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
      "_id": "bNPKUrkGNZLkWRoF",
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
      "flags": {
        "daggerheart-premades": {
          "midnightVine": true
        }
      }
    },
    {
      "name": "Gorgon Root",
      "disabled": false,
      "img": "icons/commodities/flowers/dandelion-pod-blue.webp",
      "description": "",
      "transfer": false,
      "statuses": [
        "restrain"
      ],
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "8YpVnj2tXjIZr8PG",
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
data.folder=folder;data.flags={[ID]:{premade:{key:POISON_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.RrYxuotaN5JAjHdT']}}};return data;}
export async function ensurePoisonCompendium() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === POISON_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Poisoners Guild');
  if (!folder) throw new Error('The Poisoners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(poisonData(folder.id)) : await Item.create(poisonData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Poison Compendium creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
