import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { modernDamageEffects } from '../effect-compat.js';
import { ID } from '../core.js';
export const FAVORED_KEY='martial-stance-favored',FAVORED_ACTION='ohod7ZWfrILMq3dc',FAVORED_EFFECT='M3HdEjgCvl15S9HO';
export function favoredData(folder){const data={
  "name": "Favored",
  "type": "feature",
  "img": "icons/magic/defensive/shield-hex-purple.webp",
  "system": {
    "attribution": {},
    "description": "<p>Gain a bonus to damage rolls equal to a trait of your choice.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "ohod7ZWfrILMq3dc": {
        "type": "effect",
        "_id": "ohod7ZWfrILMq3dc",
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
            "_id": "M3HdEjgCvl15S9HO",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Enter Stance",
        "range": "self",
        "img": "icons/magic/defensive/shield-hex-purple.webp"
      }
    },
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Stance: Favored",
      "disabled": false,
      "img": "icons/magic/defensive/shield-hex-purple.webp",
      "description": "<p>Gain a bonus to damage rolls equal to a trait of your choice.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [
          {
            "key": "system.bonuses.damage.physical.bonus",
            "type": "add",
            "value": "@system.traits.instinct.value",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.bonuses.damage.magical.bonus",
            "type": "add",
            "value": "@system.traits.instinct.value",
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
      "_id": "M3HdEjgCvl15S9HO",
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
modernDamageEffects(data);data.folder=folder;data.flags={[ID]:{premade:{key:FAVORED_KEY,version:'1.1.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.W95PSU4iXjg2v5B5']}}};return data;}
export async function ensureFavored() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FAVORED_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.1.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(favoredData(folder.id)) : await Item.create(favoredData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Favored creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
