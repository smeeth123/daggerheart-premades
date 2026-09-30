import { ID } from '../core.js';
export const ELOQUENT_KEY='wordsmith-eloquent',ELOQUENT_ACTION='o1MWnafbLsXnvSUl';
export function eloquentData(folder){const data={
  "name": "Eloquent",
  "type": "feature",
  "img": "icons/skills/social/diplomacy-writing-letter.webp",
  "system": {
    "description": "<p>Your moving words boost morale. Once per session, when you encourage an ally, you can do one of the following:</p><ul><li><p>Allow them to find a mundane object or tool they need.</p></li><li><p>Help an Ally without spending Hope.</p></li><li><p>Give them an additional downtime move during their next rest.</p></li></ul>",
    "resource": null,
    "actions": {
      "o1MWnafbLsXnvSUl": {
        "type": "effect",
        "_id": "o1MWnafbLsXnvSUl",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "session",
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "eloquentRestMove",
            "onSave": false
          }
        ],
        "target": {
          "type": "friendly",
          "amount": 1
        },
        "name": "Grant Extra Downtime Move",
        "img": "icons/skills/social/diplomacy-writing-letter.webp",
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
    "gmNotes": "",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "_id": "eloquentRestMove",
      "name": "Eloquent — Extra Downtime Move",
      "img": "icons/skills/social/diplomacy-writing-letter.webp",
      "type": "base",
      "transfer": false,
      "disabled": false,
      "system": {
        "changes": [
          {
            "key": "system.bonuses.rest.shortRest.shortMoves",
            "type": "add",
            "value": "1",
            "phase": "initial",
            "priority": null
          },
          {
            "key": "system.bonuses.rest.longRest.longMoves",
            "type": "add",
            "value": "1",
            "phase": "initial",
            "priority": null
          }
        ],
        "duration": {
          "type": "shortRest",
          "description": "One additional move during your next rest."
        },
        "stacking": null,
        "rangeDependence": null,
        "targetDispositions": []
      },
      "statuses": [],
      "flags": {
        "daggerheart-premades": {
          "eloquentRest": true
        }
      },
      "description": "Gain one additional downtime move during your next short or long rest.",
      "showIcon": 1
    }
  ]
};
data.folder=folder;data.flags={[ID]:{premade:{key:ELOQUENT_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.5bmB1YcxiJVNVXDM']}}};return data;}
export async function ensureEloquent() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === ELOQUENT_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Wordsmith');
  if (!folder) throw new Error('The Wordsmith compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(eloquentData(folder.id)) : await Item.create(eloquentData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Eloquent creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
