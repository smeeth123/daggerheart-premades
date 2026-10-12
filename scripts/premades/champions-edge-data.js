import {ID,clone} from "../core.js";
import {premadeDocuments,configurePremadePack} from "../premade-setup-context.js";
export const CHAMPION_KEY="blade-champions-edge",CHAMPION_ACTIONS=["CbKKgf1TboGPZitf","hsI4QDa6Br52P2mc","IqLoK4KHMpoTGQIM"];
const nativeCard={
  "name": "Champion's Edge",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/blade.png",
  "type": "domainCard",
  "system": {
    "description": "<p>When you critically succeed on an attack, you can <strong>spend up to 3 Hope</strong> and choose one of the following options for each Hope spent:</p><ul><li class=\"vertical-card-list\"><p>You clear a Hit Point.</p></li><li class=\"vertical-card-list\"><p>You clear an Armor Slot.</p></li><li class=\"vertical-card-list\">The target must mark an additional Hit Point.</li></ul><p>You can't choose the same option more than once.</p>",
    "domain": "blade",
    "recallCost": 1,
    "level": 5,
    "type": "ability",
    "actions": {
      "CbKKgf1TboGPZitf": {
        "type": "healing",
        "_id": "CbKKgf1TboGPZitf",
        "systemPath": "actions",
        "description": "<p>When you critically succeed on an attack, you can <strong>spend up to 3 Hope</strong> and choose one of the following options for each Hope spent:</p><ul class=\"\"><li class=\"vertical-card-list\"><p>You clear a Hit Point.</p></li><li class=\"vertical-card-list\"><p>You clear an Armor Slot.</p></li><li class=\"vertical-card-list\">The target must mark an additional Hit Point.</li></ul><p>You can't choose the same option more than once.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "consumeOnSuccess": false,
            "itemId": null
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
        "name": "Clear 1 HP",
        "img": "icons/magic/life/heart-cross-green.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "hsI4QDa6Br52P2mc": {
        "type": "healing",
        "_id": "hsI4QDa6Br52P2mc",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "consumeOnSuccess": false,
            "itemId": null
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
            "armor": {
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
              "applyTo": "armor",
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
        "name": "Clear 1 Armor Slot",
        "img": "icons/equipment/chest/breastplate-helmet-metal.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "IqLoK4KHMpoTGQIM": {
        "type": "damage",
        "_id": "IqLoK4KHMpoTGQIM",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "consumeOnSuccess": false,
            "itemId": null
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
              "base": false,
              "applyTo": "hitPoints",
              "resultBased": false,
              "value": {
                "multiplier": "flat",
                "flatMultiplier": 0,
                "dice": "d6",
                "bonus": 1,
                "custom": {
                  "enabled": false,
                  "formula": ""
                }
              },
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
        "name": "Deal 1 HP Damage",
        "img": "icons/skills/melee/strike-axe-blood-red.webp",
        "range": "",
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
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "_id": "rnejRbUQsNGX1GMC",
  "effects": []
};
export function championData(folder){const data=clone(nativeCard);data.folder=folder;data.system.gmNotes="After a completed critical attack and its dice animation, one optional prompt chooses up to three distinct benefits at 1 Hope each: clear 1 HP, clear 1 Armor Slot, or have one living hit target mark 1 additional HP. Decline is free. Native attack rewards settle first. Recovery and extra HP use native resource APIs, not a new damage roll; a defeated target is not offered. Choosing Armor recovery requires real Hope for the selected package, never Hopeful Armor substitution. Otherwise Hopeful remains available. Native sheet actions are reminders to use the critical-attack prompt. No rest tracker, extra effect, or repeated benefit on the same attack.";data.flags={[ID]:{premade:{key:CHAMPION_KEY,version:"1.0.0",category:"domain-cards",aliases:[],sourceUuids:["Compendium.daggerheart.domains.Item.rnejRbUQsNGX1GMC"]}}};return data;}
export async function ensureChampion(){const pack=game.packs.get(ID+".domain-cards");if(!pack)throw Error("The Domain Cards compendium is missing.");const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,"premade")?.key===CHAMPION_KEY);if(existing?.getFlag(ID,"premade")?.version==="1.0.0")return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==="Blade");if(!folder)throw Error("The Blade compendium folder is missing.");const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=championData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error("Champions Edge creation was cancelled.");return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
