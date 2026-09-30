import { ID } from '../core.js';
export const PACT_KEY='warlock-patrons-pact',PACT_ACTION='7RijWCUdHjGQDkJv';
export function pactData(folder){const data={
  "type": "feature",
  "name": "Patron's Pact",
  "img": "icons/magic/light/explosion-star-glow-silhouette.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You have committed yourself to a supernatural entity —such as a god, fae, or demon—in exchange for power. Write their name on your character sheet, then work with your GM to determine their sphere of influence (such as Nature, Chaos, Wisdom, Mischief, Love, War, Justice, or Death). Before making an action roll that relates to your patron's sphere of influence, you can <strong>spend a Favor</strong> to call upon their aid, rolling your Patron Die and adding its result to the total. Your Patron Die starts at a <strong>[[/r d6]]</strong> and increases to a <strong>[[/r d8]]</strong> at level 5.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "7RijWCUdHjGQDkJv": {
        "type": "attack",
        "damage": {
          "main": null,
          "resources": {}
        },
        "_id": "7RijWCUdHjGQDkJv",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>Before making an action roll that relates to your patron's sphere of influence, you can <strong>spend a Favor</strong> to call upon their aid, rolling your Patron Die and adding its result to the total. Your Patron Die starts at a <strong>[[/r d6]]</strong> and increases to a <strong>[[/r d8]]</strong> at level 5.</p>",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [
          {
            "scalable": false,
            "key": "favor",
            "value": 1,
            "itemId": null,
            "step": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "target": {
          "type": "self",
          "amount": null
        },
        "effects": [],
        "roll": {
          "type": "diceSet",
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "flat",
            "flatMultiplier": 1,
            "dice": "d6",
            "compare": null,
            "treshold": null
          },
          "useDefault": false
        },
        "save": {
          "trait": null,
          "difficulty": null,
          "damageMod": "none"
        },
        "name": "Roll Patron Dice",
        "range": "self"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:PACT_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.IOWBzweDFPoAHtQW']}}};return data;}
export async function ensurePatronsPact() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === PACT_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warlock');
  if (!folder) throw new Error('The Warlock compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(pactData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Patron’s Pact creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
