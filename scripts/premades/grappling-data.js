import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const GRAPPLING_KEY='martial-stance-grappling',GRAPPLING_EFFECT='zmML95HUwWUM8RqY',GRABBED='0aPQdN2Anbw7WLph';
export function grapplingData(folder){const data={
  "name": "Grappling",
  "type": "feature",
  "img": "icons/magic/control/debuff-chains-blue.webp",
  "system": {
    "attribution": {},
    "description": "<p>On a successful attack within Melee range, you can <strong>spend a Focu</strong>s or <strong>mark a Stress</strong> to temporarily <em>Restrain</em> the target or throw the target up to Close range.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "K7VYEEaUWQN0hifO": {
        "type": "effect",
        "_id": "K7VYEEaUWQN0hifO",
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
            "_id": "zmML95HUwWUM8RqY",
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
      "name": "Stance: Grappling",
      "disabled": false,
      "img": "icons/magic/control/debuff-chains-blue.webp",
      "description": "<p>On a successful attack within Melee range, you can <strong>spend a Focu</strong>s or <strong>mark a Stress</strong> to temporarily <em>Restrain</em> the target or throw the target up to Close range.</p>",
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
      "_id": "zmML95HUwWUM8RqY",
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
    },
    {
      "name": "Grabbed",
      "disabled": false,
      "img": "icons/magic/control/debuff-chains-shackle-movement-red.webp",
      "description": "",
      "transfer": false,
      "statuses": [
        "restrained"
      ],
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": "temporary"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "0aPQdN2Anbw7WLph",
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
data.folder=folder;data.flags={[ID]:{premade:{key:GRAPPLING_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.aN9OhwIJXTCDc11u']}}};return data;}
export async function ensureGrappling() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === GRAPPLING_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(grapplingData(folder.id)) : await Item.create(grapplingData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Grappling creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
