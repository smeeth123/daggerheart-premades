import { ID } from '../core.js';
export const DANGER_KEY='goblin-danger-sense';
export const DANGER_ACTION='V2K3pMWOCVwBUnjq';
export function dangerData(folder){
const data={
  "name": "Danger Sense",
  "type": "feature",
  "img": "icons/magic/perception/orb-eye-scrying.webp",
  "system": {
    "description": "<p>Once per rest, <strong>mark a Stress</strong> to force an adversary to reroll an attack against you or an ally within Very Close range.</p>",
    "resource": null,
    "actions": {
      "V2K3pMWOCVwBUnjq": {
        "type": "effect",
        "_id": "V2K3pMWOCVwBUnjq",
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
          "value": 0,
          "max": "1",
          "recovery": "shortRest",
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "friendly",
          "amount": null
        },
        "name": "Mark Stress",
        "img": "icons/magic/perception/orb-eye-scrying.webp",
        "range": "veryClose",
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
    "gmNotes": "<p>On a hit against you or an ally within native Very Close range, offers marking 1 Stress and spending the once-per-rest use to reroll the adversary attack. Shares defensive resolution with Wings before damage.</p>",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:DANGER_KEY,version:'1.0.0',category:'ancestry-features',aliases:[],sourceUuids:['Compendium.daggerheart.ancestries.Item.AXqcoxnRoWBbbKpK']}}};return data;
}
export async function ensureDangerSense() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === DANGER_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Goblin');
  if (!folder) throw new Error('The Goblin compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(dangerData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Danger Sense creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
