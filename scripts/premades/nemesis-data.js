import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const NEMESIS_KEY='vengeance-nemesis',NEMESIS_ACTION='Rgc7kBmU3kjHKvfx';
export function nemesisData(folder){const data={
  "name": "Nemesis",
  "type": "feature",
  "img": "icons/magic/unholy/silhouette-robe-evil-power.webp",
  "system": {
    "description": "<p><strong>Spend 2 Hope</strong> to Prioritize an adversary until your next rest. When you make an attack against your Prioritized adversary, you can swap the results of your Hope and Fear Dice. You can only Prioritize one adversary at a time.</p>",
    "resource": null,
    "actions": {
      "Rgc7kBmU3kjHKvfx": {
        "type": "effect",
        "_id": "Rgc7kBmU3kjHKvfx",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
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
          "type": "hostile",
          "amount": 1
        },
        "name": "Prioritize Adversary",
        "img": "icons/magic/unholy/silhouette-robe-evil-power.webp",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:NEMESIS_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.DPKmipNRlSAMs2Cg']}}};return data;}
export async function ensureNemesis() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === NEMESIS_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Vengeance');
  if (!folder) throw new Error('The Vengeance compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(nemesisData(folder.id)) : await Item.create(nemesisData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Nemesis creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
