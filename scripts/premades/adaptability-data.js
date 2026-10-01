import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const ADAPT_KEY='human-adaptability';
export const ADAPT_ACTION='D7EE2L2Y96nfrfTW';
export function adaptabilityData(folder){
const data={
  "name": "Adaptability",
  "type": "feature",
  "img": "icons/magic/control/silhouette-hold-change-blue.webp",
  "system": {
    "description": "<p>When you fail a roll that utilized one of your Experiences, you can <strong>mark a Stress</strong> to reroll.</p>",
    "resource": null,
    "actions": {
      "D7EE2L2Y96nfrfTW": {
        "type": "effect",
        "_id": "D7EE2L2Y96nfrfTW",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
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
          "type": "any",
          "amount": null
        },
        "name": "Mark Stress",
        "img": "icons/magic/control/silhouette-hold-change-blue.webp",
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
    "gmNotes": "Shared roll resolution: on a failed roll using your Experience, mark 1 Stress to reroll all dice. Unknown difficulty asks the owner to declare failure using Failed — reroll. Once per roll.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:ADAPT_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.BNofV1UC4ZbdFTkb']}}};return data;
}
export async function ensureAdaptability() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === ADAPT_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Human');
  if (!folder) throw new Error('The Human compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(adaptabilityData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Adaptability creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
