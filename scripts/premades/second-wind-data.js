import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const SECOND_WIND_KEY='splendor-second-wind';
const nativeCard={
  "name": "Second Wind",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/splendor.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Once per rest, when you succeed on an attack against an adversary, you can clear 3 Stress or a Hit Point. On a success with Hope, you also clear 3 Stress or a Hit Point on an ally within Close range of you.</p>",
    "domain": "splendor",
    "recallCost": 2,
    "level": 3,
    "type": "ability",
    "actions": {
      "1w6rcNGdI6H9wVIz": {
        "type": "healing",
        "_id": "1w6rcNGdI6H9wVIz",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "resource",
            "itemId": "ffPbSEvLuFrFsMxl",
            "value": 1,
            "scalable": false,
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
        "damage": {
          "main": null,
          "resources": {
            "stress": {
              "value": {
                "custom": {
                  "enabled": true,
                  "formula": "3"
                },
                "multiplier": "prof",
                "flatMultiplier": 1,
                "dice": "d6",
                "bonus": null
              },
              "applyTo": "stress",
              "base": false,
              "resultBased": false,
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
        "name": "Clear Three Stress",
        "img": "icons/commodities/gems/gem-faceted-navette-red.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "OIrSjtVdt4b2yJ2t": {
        "type": "healing",
        "_id": "OIrSjtVdt4b2yJ2t",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "resource",
            "itemId": "ffPbSEvLuFrFsMxl",
            "value": 1,
            "scalable": false,
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
        "damage": {
          "main": null,
          "resources": {
            "hitPoints": {
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
              "applyTo": "hitPoints",
              "base": false,
              "resultBased": false,
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
        "name": "Clear Hit Point",
        "img": "icons/commodities/gems/gem-faceted-diamond-green.webp",
        "range": "close",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      }
    },
    "resource": {
      "type": "simple",
      "value": 1,
      "recovery": "shortRest",
      "max": "1",
      "icon": "",
      "progression": "decreasing",
      "diceStates": {},
      "dieFaces": "d4"
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": []
};
export function secondWindData(folder){const data=structuredClone(nativeCard);data.folder=folder;data.system.gmNotes='Offered after a successful attack against an adversary, once per rest. Choose to clear 3 Stress or 1 HP; Hope successes (including criticals) also allow one ally within Close to clear 3 Stress or 1 HP. Native rest recovery refreshes the card resource; sheet actions redirect to the automatic prompt.';data.flags={[ID]:{premade:{key:SECOND_WIND_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.ffPbSEvLuFrFsMxl']}}};return data;}
export async function ensureSecondWind(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===SECOND_WIND_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Splendor');if(!folder)throw Error('The Splendor compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=secondWindData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Second Wind creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

