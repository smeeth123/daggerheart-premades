import {ID} from '../core.js';
export const CLARITY_KEY='warden-clarity-nature',CLARITY_ACTION='az7YUpxy1ysn12tO';
export function clarityNatureData(folder){const data={
  "name": "Clarity of Nature",
  "type": "feature",
  "img": "icons/magic/nature/tree-twisted-glow-yellow.webp",
  "system": {
    "description": "<p>Once per long rest, you can create a space of natural serenity within Close range. When you spend a few minutes resting within the space, clear Stress equal to your Instinct, distributed as you choose between you and your allies.</p>",
    "resource": null,
    "actions": {
      "az7YUpxy1ysn12tO": {
        "type": "effect",
        "_id": "az7YUpxy1ysn12tO",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": false,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": false
        },
        "target": {
          "type": "friendly",
          "amount": null
        },
        "effects": [],
        "name": "Distribute Stress Relief",
        "img": "icons/magic/nature/plant-seed-hands-glow-yellow.webp",
        "range": "close",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:CLARITY_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.etaQ01yGJhBLDUqZ']}}};return data;}
export async function ensureClarityNature() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === CLARITY_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warden of Renewal');
  if (!folder) throw new Error('The Warden of Renewal compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(clarityNatureData(folder.id)) : await Item.create(clarityNatureData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('ClarityNature creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
