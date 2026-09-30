import { ID } from '../core.js';
export const FOCUS_KEY='ranger-focus',FOCUS_ACTION='dTkLqUxZpW4xOEKW',FOCUS_EFFECT='SXi2dQWqpwY9fap4';
export function focusData(folder){
const data={
  "name": "Ranger's Focus",
  "type": "feature",
  "img": "icons/magic/perception/eye-ringed-green.webp",
  "system": {
    "description": "<p>Spend a Hope and make an attack against a target. On a success, deal your attack's normal damage and temporarily make the attack's target your Focus. Until this feature ends or you make a different creature your Focus, you gain the following benefits against your Focus:</p><ul><li><p>You know precisely what direction they are in.</p></li><li><p>When you deal damage to them, they must mark a Stress.</p></li><li><p>When you fail an attack against them, you can end your Ranger's Focus feature to reroll your Duality Dice.</p></li></ul>",
    "resource": null,
    "actions": {
      "dTkLqUxZpW4xOEKW": {
        "type": "effect",
        "_id": "dTkLqUxZpW4xOEKW",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
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
            "_id": "SXi2dQWqpwY9fap4",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Prime Focus",
        "img": "icons/magic/perception/eye-ringed-green.webp",
        "range": "",
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
    "gmNotes": "Activate before attacking: spends 1 Hope and primes the next single-target attack. A hit applies Focus. Focus damage marks 1 Stress; end Focus in roll resolution to reroll a failed attack’s Duality Dice.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Ranger's Focus",
      "img": "icons/magic/perception/eye-ringed-green.webp",
      "transfer": false,
      "_id": "SXi2dQWqpwY9fap4",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": ""
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
      "description": "<p>Until this feature ends or the ranger makes a different creature their Focus, they gain the following benefits against this adversary:</p><ul><li><p>They know precisely what direction they are in.</p></li><li><p>When they deal damage to them, the adverasry must mark a Stress.</p></li><li><p>When they fail an attack against them, they can end their Ranger's Focus feature to reroll their Duality Dice.</p></li></ul>",
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
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
data.folder=folder;data.flags={[ID]:{premade:{key:FOCUS_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.ncLx2P8BOUtrAD38']}}};return data;
}
export async function ensureRangersFocus() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === FOCUS_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Ranger');
  if (!folder) throw new Error('The Ranger compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(focusData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Ranger’s Focus creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
