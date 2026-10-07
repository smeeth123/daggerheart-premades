import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const TERRIFY_KEY='dread-terrify',TERRIFY_ACTION='LL51Prm1G0qJzgdJ';
const nativeCard={
  "type": "domainCard",
  "name": "Terrify",
  "system": {
    "domain": "dread",
    "level": 3,
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Close range. On a success, the target marks <strong>1d4</strong> Stress, and you can make the target flee one range away from you (such as Very Close to Close or Close to Far). On a success with Fear, the target also becomes temporarily <em>Vulnerable</em>.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "LL51Prm1G0qJzgdJ": {
        "type": "attack",
        "damage": {
          "main": null,
          "resources": {
            "stress": {
              "base": false,
              "applyTo": "stress",
              "resultBased": false,
              "fullRestore": false,
              "value": {
                "multiplier": "flat",
                "flatMultiplier": 1,
                "dice": "d4",
                "bonus": null,
                "custom": {
                  "enabled": false,
                  "formula": ""
                }
              },
              "valueAlt": null,
              "itemId": null
            }
          }
        },
        "_id": "LL51Prm1G0qJzgdJ",
        "systemPath": "actions",
        "baseAction": false,
        "description": "",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "target": {
          "type": "any",
          "amount": 1
        },
        "effects": [
          {
            "_id": "Mme0myv2a1mZE5nD",
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
        "name": "Spellcast Roll",
        "range": "close",
        "img": "icons/magic/death/skull-humanoid-white-red.webp"
      }
    },
    "recallCost": 1,
    "type": "spell",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "img": "systems/daggerheart/assets/icons/domains/domain-card/dread.png",
  "effects": [
    {
      "name": "Terrified",
      "disabled": false,
      "img": "icons/magic/death/skull-energy-light-white.webp",
      "description": "",
      "transfer": false,
      "statuses": [
        "vulnerable"
      ],
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": [],
        "conditionals": []
      },
      "_id": "Mme0myv2a1mZE5nD",
      "type": "base",
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "tint": "#ffffff",
      "showIcon": 1,
      "folder": null,
      "sort": 0,
      "flags": {}
    }
  ],
  "flags": {}
};
export function terrifyData(folder){const data=structuredClone(nativeCard);data.folder=folder;data.system.gmNotes='Spellcast Roll and 1d4 Stress remain native. Vulnerable applies only to confirmed successful targets when the final action roll is with Fear, including native chat-card effect application. Hope, critical successes, failures, unknown outcomes and reaction rolls do not apply Vulnerable. Fleeing stays manual.';data.flags={[ID]:{premade:{key:TERRIFY_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.eoC2NFqLs9llBdxC']}}};return data;}
export async function ensureTerrify(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===TERRIFY_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Dread');if(!folder)throw Error('The Dread compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=terrifyData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Terrify creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

