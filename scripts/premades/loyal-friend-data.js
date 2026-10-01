import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const FRIEND_KEY='beastbound-loyal-friend',FRIEND_ACTION='Z82YQzYWo4eektMa';
export function loyalFriendData(folder){const data={
  "name": "Loyal Friend",
  "type": "feature",
  "img": "icons/creatures/mammals/humanoid-wolf-dog-blue.webp",
  "system": {
    "description": "<p>Once per long rest, when the damage from an attack would mark your companion's last Stress or your last Hit Point and you're within Close range of each other, you or your companion can rush to the other's side and take that damage instead.</p>",
    "resource": null,
    "actions": {
      "Z82YQzYWo4eektMa": {
        "type": "effect",
        "_id": "Z82YQzYWo4eektMa",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Rush",
        "img": "icons/creatures/mammals/humanoid-wolf-dog-blue.webp",
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
    "featureForm": "passive",
    "actorResources": []
  },
  "effects": []
};data.folder=folder;data.flags={[ID]:{premade:{key:FRIEND_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.xjZHD5Yo3Tu26rLm']}}};return data;}
export async function ensureLoyalFriend() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FRIEND_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Beastbound');
  if (!folder) throw new Error('The Beastbound compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(loyalFriendData(folder.id)) : await Item.create(loyalFriendData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Loyal Friend creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
