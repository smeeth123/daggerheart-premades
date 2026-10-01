import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const VOLATILE_KEY='sorcerer-volatile-magic',VOLATILE_ACTION='JQPMlMLYMs84rWIy';
export function volatileData(folder){const data={
  "name": "Volatile Magic",
  "type": "feature",
  "img": "icons/magic/lightning/barrier-shield-orb-pink.webp",
  "system": {
    "description": "<p><strong>Spend 3 Hope</strong> to reroll any number of your damage dice on an attack that deals magic damage.</p>",
    "resource": null,
    "actions": {
      "JQPMlMLYMs84rWIy": {
        "type": "effect",
        "_id": "JQPMlMLYMs84rWIy",
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
            "consumeOnSuccess": false,
            "itemId": null
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Spend 3 Hope",
        "img": "icons/commodities/gems/gem-faceted-octagon-yellow.webp",
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
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:VOLATILE_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.ieiQlD0joWSqt53D']}}};return data;}
export async function ensureVolatileMagic() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === VOLATILE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Sorcerer');
  if (!folder) throw new Error('The Sorcerer compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(volatileData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Volatile Magic creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
