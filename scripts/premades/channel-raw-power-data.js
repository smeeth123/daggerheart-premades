import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const RAW_KEY='sorcerer-channel-raw-power',RAW_ACTION='YFmqnbMx540su2Ni';
export function rawData(folder){const data={
  "name": "Channel Raw Power",
  "type": "feature",
  "img": "icons/magic/unholy/strike-body-explode-disintegrate.webp",
  "system": {
    "description": "<p>Once per long rest, you can place a domain card from your loadout into your vault and choose to either:</p><ul><li><p>Gain Hope equal to the level of the card.</p></li><li><p>Enhance a spell that deals damage, gaining a bonus to your damage roll equal to twice the level of the card.</p></li></ul>",
    "resource": null,
    "actions": {
      "YFmqnbMx540su2Ni": {
        "type": "effect",
        "_id": "YFmqnbMx540su2Ni",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": null,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Channel",
        "img": "icons/magic/unholy/strike-body-explode-disintegrate.webp",
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
data.folder=folder;data.flags={[ID]:{premade:{key:RAW_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.P02cbN50LIoD662z']}}};return data;}
export async function ensureChannelRawPower() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === RAW_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Sorcerer');
  if (!folder) throw new Error('The Sorcerer compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(rawData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Channel Raw Power creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
