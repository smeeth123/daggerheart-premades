import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const CRUSHING_KEY='martial-stance-crushing',CRUSHING_EFFECT='wTLu5PCb5tVANoXR';
export function crushingData(folder){const data={
  "name": "Crushing",
  "type": "feature",
  "img": "icons/skills/melee/strike-hammer-destructive-blue.webp",
  "system": {
    "attribution": {},
    "description": "<p>When you deal Severe damage, you can <strong>spend a Hope</strong> to force the target to mark an additional Hit Point.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "TAnFMnKyuU8AvRvm": {
        "type": "effect",
        "_id": "TAnFMnKyuU8AvRvm",
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
            "_id": "wTLu5PCb5tVANoXR",
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
      "name": "Stance: Crushing",
      "disabled": false,
      "img": "icons/skills/melee/strike-hammer-destructive-blue.webp",
      "description": "<p>When you deal Severe damage, you can <strong>spend a Hope</strong> to force the target to mark an additional Hit Point.</p>",
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
      "_id": "wTLu5PCb5tVANoXR",
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
data.folder=folder;data.flags={[ID]:{premade:{key:CRUSHING_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.3IT4w3WExpGFD3Mm']}}};return data;}
export async function ensureCrushing() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === CRUSHING_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(crushingData(folder.id)) : await Item.create(crushingData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Crushing creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
