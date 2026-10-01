import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const PRAYER_KEY='seraph-prayer-dice',PRAYER_HOPE_ACTION='PrayerHopeAction';
export function prayerData(folder){const data={
  "name": "Prayer Dice",
  "type": "feature",
  "img": "icons/sundries/gaming/dice-runed-tan.webp",
  "system": {
    "description": "<p>At the beginning of each session, roll a number of d4s equal to your subclass's Spellcast trait and place them on your character sheet in the space provided. These are your Prayer Dice. You can spend any number of Prayer Dice to aid yourself or an ally within Far range. You can use a spent die's value to reduce incoming damage, add to a roll's result after the roll is made, or gain Hope equal to the result. At the end of each session, clear all unspent Prayer Dice.</p>",
    "resource": {
      "type": "diceValue",
      "value": 0,
      "max": "@system.traits.strength.value",
      "icon": "",
      "recovery": "session",
      "progression": "increasing",
      "diceStates": {},
      "dieFaces": "d4"
    },
    "actions": {"PrayerHopeAction": {
      "_id":"PrayerHopeAction","type":"healing","systemPath":"actions","name":"Give Hope","img":"icons/sundries/gaming/dice-runed-tan.webp",
      "description":"Target yourself or one ally within Far range, then choose Prayer Dice to spend.","chatDisplay":true,"actionType":"action",
      "cost":[],"uses":{"value":null,"max":"","recovery":null,"consumeOnSuccess":false},
      "roll":{"type":null,"trait":null,"difficulty":null,"bonus":null,"advState":"neutral","useDefault":false},"target":{"type":"any","amount":1},"range":"far","effects":[],"triggers":[],"areas":[],"baseAction":false,"originItem":{"type":"itemCollection"},
      "damage":{"main":null,"resources":{"hope":{"applyTo":"hope","base":false,"resultBased":false,"fullRestore":false,
        "value":{"custom":{"enabled":true,"formula":"0"},"multiplier":"flat","flatMultiplier":1,"dice":"d4","bonus":null},
        "valueAlt":{"custom":{"enabled":false,"formula":""},"multiplier":"flat","flatMultiplier":1,"dice":"d4","bonus":null}}}}
    }},
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
data.folder=folder;data.flags={[ID]:{premade:{key:PRAYER_KEY,version:'1.1.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.Xd7RYhfTxIj9aWI2']}}};return data;}
export async function ensurePrayerDice() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === PRAYER_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.1.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Seraph');
  if (!folder) throw new Error('The Seraph compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(prayerData(folder.id)) : await Item.create(prayerData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Prayer Dice creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
