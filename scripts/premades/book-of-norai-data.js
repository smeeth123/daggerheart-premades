import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const NORAI_KEY='codex-book-of-norai',FIREBALL_CAST='GI2VkIcGDOjFRxpT',FIREBALL_EXPLOSION='HJ749c2a8WTjkSHY';
const nativeBook={
  "name": "Book of Norai",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/codex.png",
  "type": "domainCard",
  "system": {
    "description": "<p><em><strong>Mystic Tether:</strong></em> Make a <strong>Spellcast Roll</strong> against a target within Far range. On a success, they're temporarily <em>Restrained</em> and must mark a Stress. If you target a flying creature, this spell grounds and temporarily <em>Restrains</em> them.</p><p><em><strong>Fireball:</strong></em> Make a <strong>Spellcast Roll</strong> against a target within Very Far range. On a success, hurl a sphere of fire toward them that explodes on impact. The target and all creatures within Very Close range of them must make a Reaction Roll (13). Targets who fail take<strong> d20+5</strong> magic damage using your Proficiency. Targets who succeed take half damage.</p>",
    "domain": "codex",
    "recallCost": 2,
    "level": 3,
    "type": "grimoire",
    "actions": {
      "ywBVT5mbDKr485Jg": {
        "type": "attack",
        "_id": "ywBVT5mbDKr485Jg",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Far range. On a success, they're temporarily <em>Restrained</em> and must mark a Stress. If you target a flying creature, this spell grounds and temporarily <em>Restrains</em> them.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "damage": {
          "main": null,
          "resources": {
            "stress": {
              "resultBased": false,
              "value": {
                "custom": {
                  "enabled": true,
                  "formula": "1"
                },
                "multiplier": "prof",
                "flatMultiplier": 1,
                "dice": "d6",
                "bonus": null
              },
              "applyTo": "stress",
              "base": false,
              "valueAlt": null,
              "fullRestore": false,
              "itemId": null
            }
          }
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [
          {
            "_id": "iPnT02apql16Zhjf",
            "onSave": false
          }
        ],
        "roll": {
          "type": "spellcast",
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "prof",
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
        "name": "Mystic Tether",
        "img": "icons/magic/control/energy-stream-link-white.webp",
        "range": "far",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "GI2VkIcGDOjFRxpT": {
        "type": "attack",
        "_id": "GI2VkIcGDOjFRxpT",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Very Far range. On a success, hurl a sphere of fire toward them that explodes on impact.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "damage": {
          "main": null,
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": 1
        },
        "effects": [],
        "roll": {
          "type": "spellcast",
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "prof",
            "flatMultiplier": 1,
            "dice": "d6",
            "compare": null,
            "treshold": null
          },
          "useDefault": false
        },
        "save": {
          "trait": null,
          "difficulty": 13,
          "damageMod": "half"
        },
        "name": "Fireball - Cast",
        "img": "icons/magic/fire/explosion-fireball-large-red-orange.webp",
        "range": "veryFar",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "HJ749c2a8WTjkSHY": {
        "type": "attack",
        "_id": "HJ749c2a8WTjkSHY",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>The target and all creatures within Very Close range of them must make a Reaction Roll (13). Targets who fail take<strong> d20+5</strong> magic damage using your Proficiency. Targets who succeed take half damage.</p>",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [
          {
            "name": "Fireball",
            "type": "placed",
            "shape": "emanation",
            "size": "veryClose",
            "effects": [],
            "hasHole": false
          }
        ],
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "damage": {
          "main": {
            "applyTo": "hitPoints",
            "resultBased": false,
            "value": {
              "multiplier": "prof",
              "flatMultiplier": 1,
              "dice": "d20",
              "bonus": 5,
              "custom": {
                "enabled": false,
                "formula": ""
              }
            },
            "valueAlt": null,
            "base": false,
            "type": [
              "magical"
            ],
            "includeBase": false,
            "direct": false,
            "fullRestore": false,
            "itemId": null
          },
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [],
        "roll": {
          "type": null,
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "prof",
            "flatMultiplier": 1,
            "dice": "d6",
            "compare": null,
            "treshold": null
          },
          "useDefault": false
        },
        "save": {
          "trait": "agility",
          "difficulty": 13,
          "damageMod": "half"
        },
        "name": "Fireball - Explosion",
        "range": "",
        "img": "icons/magic/fire/explosion-fireball-large-red-orange.webp"
      }
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": [
    {
      "name": "Mystic Tether",
      "img": "icons/magic/control/energy-stream-link-white.webp",
      "transfer": false,
      "_id": "iPnT02apql16Zhjf",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "type": "temporary",
          "description": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": [],
        "conditionals": []
      },
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "",
      "tint": "#ffffff",
      "statuses": [
        "restrained"
      ],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function bookOfNoraiData(folder){const data=structuredClone(nativeBook);data.folder=folder;
 data.system.actions[FIREBALL_EXPLOSION].areas=[];
 data.system.gmNotes='Mystic Tether remains native. Fireball Cast automatically launches the native Explosion after confirmed success, including later Hope/Prayer/Charm changes on the ready cast card. Every living creature within native Very Close of the original target is included, regardless of disposition, including the caster. Multitarget Reaction Rolls (13), Proficiency d20+5 magic damage, save-based half damage and configured damage application remain entirely native; this premade does not force reaction rolls. No persistent Region or additional cast cost.';
 data.flags={[ID]:{premade:{key:NORAI_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.WtwSWXTRZa7QVvmo']}}};return data;
}
export async function ensureBookOfNorai(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===NORAI_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Codex');if(!folder)throw Error('The Codex compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=bookOfNoraiData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Book of Norai creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
