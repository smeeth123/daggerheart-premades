import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FEARLESS_KEY='infernis-fearless';
export const FEARLESS_ACTION='G1H7k5RdvS1EJgFu';
export function fearlessData(folder){
const data={
  "name": "Fearless",
  "type": "feature",
  "img": "icons/magic/light/orb-container-orange.webp",
  "system": {
    "description": "<p>When you roll with Fear, you can <strong>mark 2 Stress</strong> to change it into a roll with Hope instead.</p>",
    "resource": null,
    "actions": {
      "G1H7k5RdvS1EJgFu": {
        "type": "effect",
        "_id": "G1H7k5RdvS1EJgFu",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 2,
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
        "effects": [],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Mark Stress",
        "img": "icons/magic/light/orb-container-orange.webp",
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
    "gmNotes": "Shared roll resolution: mark 2 Stress to convert Fear to Hope before consequences. Dice and total are preserved. Action rolls only; reaction rolls have no Hope/Fear outcome. Once per roll.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FEARLESS_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.IlWvn5kCqCBMuUJn']}}};return data;
}
export async function ensureFearless() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FEARLESS_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Infernis');
  if (!folder) throw new Error('The Infernis compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(fearlessData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Fearless creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
