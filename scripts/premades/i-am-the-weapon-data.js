import { ID } from '../core.js';
export const WEAPON_KEY='brawler-i-am-the-weapon';
export const WEAPON_EFFECT='bGHd7NfUn4fL6u1g';
export function weaponData(folder){
const data={
  "name": "I Am the Weapon",
  "type": "feature",
  "img": "icons/magic/control/buff-strength-muscle-damage-orange.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Your barehanded attacks are as strong as any blade. You have a primary weapon called Brawler's Strike equipped while you have no other Active Weapons. It uses a trait of your choice, has Melee range, and deals <strong>d8+d6</strong> physical damage using your Proficiency (both the <strong>d8</strong> and <strong>d6</strong> scale off your Proficiency). While this weapon is active, you gain a +1 bonus to your Evasion.</p>",
    "gmNotes": "Native Brawler’s Strike setup is preserved. The Evasion change automatically becomes 0 while any weapon is equipped and returns to +1 when unarmed.",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": [
    {
      "name": "I Am the Weapon",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.evasion",
            "type": "add",
            "value": 1,
            "priority": null,
            "phase": "initial"
          },
          {
            "type": "standardAttack",
            "phase": "initial",
            "value": {
              "name": "Brawler's Strike",
              "damageTypes": [
                "physical"
              ],
              "attackRange": "melee",
              "trait": "instinct",
              "damageFormula": "@profd8 + @profd6",
              "img": "icons/skills/melee/unarmed-punch-fist-yellow-red.webp"
            },
            "priority": 0
          }
        ],
        "duration": {
          "description": "",
          "type": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "bGHd7NfUn4fL6u1g",
      "img": "icons/magic/control/buff-strength-muscle-damage-orange.webp",
      "disabled": false,
      "start": {
        "time": 0,
        "combat": null,
        "combatant": null,
        "initiative": null,
        "round": null,
        "turn": null
      },
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>Your barehanded attacks are as strong as any blade. You have a primary weapon called Brawler's Strike equipped while you have no other Active Weapons. It uses a trait of your choice, has Melee range, and deals <strong>d8+d6</strong> physical damage using your Proficiency (both the <strong>d8</strong> and <strong>d6</strong> scale off your Proficiency). While this weapon is active, you gain a +1 bonus to your Evasion.</p>",
      "tint": "#ffffff",
      "transfer": true,
      "statuses": [],
      "showIcon": 1,
      "folder": null,
      "sort": 0,
      "flags": {}
    }
  ]
};
data.folder=folder;data.flags={[ID]:{premade:{key:WEAPON_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.WgUrpNTlX92k0Xs3']}}};return data;
}
export async function ensureIAmTheWeapon() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === WEAPON_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Brawler');
  if (!folder) throw new Error('The Brawler compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(weaponData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('I Am the Weapon creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
