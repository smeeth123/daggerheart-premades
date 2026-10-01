import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const HONED_KEY='martial-stance-honed',HONED_EFFECT='HkFjCOTppPwFhoDD';
export function honedData(folder){const data={
  "name": "Honed",
  "type": "feature",
  "img": "icons/magic/control/buff-strength-muscle-damage-orange.webp",
  "system": {
    "attribution": {},
    "description": "<p><strong>Spend a Focus</strong> before you make an attack roll to gain a +1 bonus to your Proficiency for that attack.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "Xs4xgmFwibfOp6Ky": {
        "type": "effect",
        "_id": "Xs4xgmFwibfOp6Ky",
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
            "_id": "HkFjCOTppPwFhoDD",
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
      "name": "Stance: Honed",
      "disabled": false,
      "img": "icons/magic/control/buff-strength-muscle-damage-orange.webp",
      "description": "<p><strong>Spend a Focus</strong> before you make an attack roll to gain a +1 bonus to your Proficiency for that attack.</p>",
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
      "_id": "HkFjCOTppPwFhoDD",
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
data.folder=folder;data.flags={[ID]:{premade:{key:HONED_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.aJKTuq1Ja5o9lB16']}}};return data;}
export async function ensureHoned() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === HONED_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(honedData(folder.id)) : await Item.create(honedData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Honed creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
