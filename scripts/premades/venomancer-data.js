import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FEATURE_KEY='poisoners-venomancer';
export function featureData(folder){const data={
  "type": "feature",
  "name": "Venomancer",
  "img": "icons/magic/death/skull-poison-green.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You also know these poisons:</p><ul><li><p><strong>Blight Seed:</strong> The target gains a -3 penalty to their damage thresholds until the end of the scene. This effect can't stack.</p></li><li><p><strong>Fear Leaf:</strong> You deal extra damage equal to the result of your Fear Die on this attack.</p></li><li><p><strong>Corpse Thorn:</strong> The target gains disadvantage on reaction rolls until the end of the scene.</p></li></ul>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "uTNhXJiy5YAG0FdS": {
        "type": "effect",
        "_id": "uTNhXJiy5YAG0FdS",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>The target gains a -3 penalty to their damage thresholds until the end of the scene. This effect can't stack.</p>",
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
            "_id": "BAHnbGqeiUj2Eep3",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Blight Seed",
        "range": "",
        "img": "icons/magic/unholy/orb-glowing-purple.webp"
      },
      "8CcarGtcoIg3Dmah": {
        "type": "effect",
        "_id": "8CcarGtcoIg3Dmah",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>The target gains disadvantage on reaction rolls until the end of the scene.</p>",
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
            "_id": "QDYqKyEjiJiTEv6C",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Corpse Thorn",
        "range": "",
        "img": "icons/magic/nature/root-vines-silhouette-teal.webp"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": [
    {
      "name": "Blight Seed",
      "disabled": false,
      "img": "icons/magic/unholy/orb-glowing-purple.webp",
      "description": "<p>The target gains a -3 penalty to their damage thresholds until the end of the scene. This effect can't stack.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [
          {
            "key": "system.damageThresholds.major",
            "type": "subtract",
            "value": "3",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.damageThresholds.severe",
            "type": "subtract",
            "value": "3",
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
      "_id": "BAHnbGqeiUj2Eep3",
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
          "venomPoison": "blight"
        }
      }
    },
    {
      "name": "Corpse Thorn",
      "disabled": false,
      "img": "icons/magic/nature/root-vines-silhouette-teal.webp",
      "description": "<p>The target gains disadvantage on reaction rolls until the end of the scene.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [
          {
            "key": "system.disadvantageSources",
            "type": "add",
            "value": "Reaction Rolls",
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
      "_id": "QDYqKyEjiJiTEv6C",
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
          "venomPoison": "corpse"
        }
      }
    }
  ]
};
data.folder=folder;data.flags={[ID]:{premade:{key:FEATURE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.WAkxLnKbtic1O6pC']}}};return data;}
export async function ensureVenomancer() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FEATURE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Poisoners Guild');
  if (!folder) throw new Error('The Poisoners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(featureData(folder.id)) : await Item.create(featureData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Venomancer creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
