import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const DEFENSIVE_KEY='martial-stance-defensive',DEFENSIVE_EFFECT='cEi6RO2te92zNqm2';
export function defensiveData(folder){const data={
  "name": "Defensive",
  "type": "feature",
  "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "system": {
    "attribution": {},
    "description": "<p>Attack rolls targeting you from within Melee range have disadvantage unless the attacker marks a Stress to negate the disadvantage.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "syX0fPaPNwVqpwBP": {
        "type": "effect",
        "_id": "syX0fPaPNwVqpwBP",
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
            "_id": "cEi6RO2te92zNqm2",
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
      "name": "Stance: Defensive",
      "disabled": false,
      "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
      "description": "<p>Attack rolls targeting you from within Melee range have disadvantage unless the attacker marks a Stress to negate the disadvantage.</p>",
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
      "_id": "cEi6RO2te92zNqm2",
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
data.folder=folder;data.flags={[ID]:{premade:{key:DEFENSIVE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.YGQ7hhRGrYm8BFDP']}}};return data;}
export async function ensureDefensive() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === DEFENSIVE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(defensiveData(folder.id)) : await Item.create(defensiveData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Defensive creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
