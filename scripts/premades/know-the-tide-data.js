import { ID } from '../core.js';
export const TIDE_KEY='seaborne-know-the-tide';
export function tideData(folder){
const data={
  "name": "Know the Tide",
  "type": "feature",
  "img": "icons/environment/wilderness/cave-entrance-island.webp",
  "system": {
    "description": "<p>You can sense the ebb and flow of life. When you roll with Fear, place a token on your community card. You can hold a number of tokens equal to your level. Before you make an action roll, you can spend any number of these tokens to gain a +1 bonus to the roll for each token spent. At the end of each session, clear all unspent tokens.</p>",
    "resource": {
      "type": "simple",
      "value": 0,
      "max": "@system.levelData.level.current",
      "icon": "fa-solid fa-water",
      "recovery": "session",
      "diceStates": {},
      "dieFaces": "d4",
      "progression": "increasing"
    },
    "actions": {
      "tFlus34KotJjHfTe": {
        "type": "effect",
        "_id": "tFlus34KotJjHfTe",
        "systemPath": "actions",
        "baseAction": false,
        "description": "",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [
          {
            "trigger": "fearRoll",
            "triggeringActorType": "self",
            "command": "const { max, value } = this.item.system.resource;\nconst maxValue = actor.system.levelData.level.current;\nconst afterUpdate = value+1;\nif (afterUpdate > maxValue) return;\n\nui.notifications.info(game.i18n.localize('DAGGERHEART.UI.Notifications.knowTheTide'));\nreturn { updates: [{\n  key: 'resource',\n  itemId: this.item.id,\n  target: this.item,\n  value: 1,\n}]};"
          }
        ],
        "cost": [],
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
        "name": "Know The Tide",
        "range": "",
        "areas": []
      }
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "Preserves native Fear token automation. Action-roll dialogs offer a token count; each token adds +1 and is consumed when rolling. Reactions excluded.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:TIDE_KEY,version:'1.0.0',category:'community-features',aliases:[],sourceUuids:['Compendium.daggerheart.communities.Item.07x6Qe6qMzDw2xN4']}}};return data;
}
export async function ensureKnowTheTide() {
  const pack = game.packs.get(`${ID}.community-features`);
  if (!pack) throw new Error('The Community Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === TIDE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Seaborne');
  if (!folder) throw new Error('The Seaborne compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(tideData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Know the Tide creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
