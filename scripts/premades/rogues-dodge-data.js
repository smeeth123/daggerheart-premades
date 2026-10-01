import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const DODGE_KEY='rogue-dodge',DODGE_EFFECT='hhVjBro2osGDTT5g';
export function dodgeData(folder){const data={
  "name": "Rogue's Dodge",
  "type": "feature",
  "img": "icons/skills/movement/feet-winged-boots-glowing-yellow.webp",
  "system": {
    "description": "<p><strong>Spend 3 Hope</strong> to gain a +2 bonus to your Evasion until the next time an attack succeeds against you. Otherwise, this bonus lasts until your next rest.</p>",
    "resource": null,
    "actions": {
      "GbQca7YphTh7skHG": {
        "type": "effect",
        "_id": "GbQca7YphTh7skHG",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 3,
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
            "_id": "hhVjBro2osGDTT5g",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Spend Hope",
        "img": "icons/skills/movement/feet-winged-boots-glowing-yellow.webp",
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
    "gmNotes": "Expires after a resolved successful attack against you, or when taking Short or Long Rest downtime.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Rogue's Dodge",
      "img": "icons/skills/movement/feet-winged-boots-glowing-yellow.webp",
      "transfer": false,
      "_id": "hhVjBro2osGDTT5g",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.evasion",
            "type": "add",
            "value": "2 * @stacks",
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "type": "shortRest",
          "description": "<p>Until the next time an attack succeeds against you.</p>"
        },
        "stacking": {
          "max": null,
          "value": 1
        },
        "rangeDependence": null,
        "targetDispositions": []
      },
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p><strong>Spend 3 Hope</strong> to gain a +2 bonus to your Evasion until the next time an attack succeeds against you. Otherwise, this bonus lasts until your next rest.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "_stats": {
        "compendiumSource": null,
        "coreVersion": "14.364",
        "systemId": "daggerheart",
        "systemVersion": "2.9.2"
      },
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
data.folder=folder;data.flags={[ID]:{premade:{key:DODGE_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.hVaaPIjxoextIgSL']}}};return data;}
export async function ensureRoguesDodge() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === DODGE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Rogue');
  if (!folder) throw new Error('The Rogue compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(dodgeData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Rogue’s Dodge creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
