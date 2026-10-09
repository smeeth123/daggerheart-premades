import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const CHAIN_KEY='arcana-chain-lightning',CHAIN_CAST='2jjOspoj5HGgUBmE',CHAIN_DAMAGE='tRJNO3DVvVYwW3tt';
const nativeCard={
  "name": "Chain Lightning",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
  "type": "domainCard",
  "system": {
    "description": "<p><strong>Mark 2 Stress</strong> to make a <strong>Spellcast Roll</strong>, unleashing lightning on all targets within Close range. Targets you succeed against must make a reaction roll with a Difficulty equal to the result of your Spellcast Roll. Targets who fail take <strong>2d8+4</strong> magic damage. Additional adversaries not already targeted by Chain Lightning and within Close range of previous targets who took damage must also make the reaction roll. Targets who fail take <strong>2d8+4</strong> magic damage. This chain continues until there are no more adversaries within range.</p>",
    "domain": "arcana",
    "recallCost": 1,
    "level": 5,
    "type": "spell",
    "actions": {
      "2jjOspoj5HGgUBmE": {
        "type": "attack",
        "_id": "2jjOspoj5HGgUBmE",
        "systemPath": "actions",
        "description": "<p><strong>Mark 2 Stress</strong> to make a <strong>Spellcast Roll</strong>, unleashing lightning on all targets within Close range. Targets you succeed against must make a reaction roll with a Difficulty equal to the result of your Spellcast Roll. Targets who fail take <strong>2d8+4</strong> magic damage.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 2,
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
          "main": {
            "resultBased": false,
            "value": {
              "custom": {
                "enabled": false,
                "formula": ""
              },
              "multiplier": "flat",
              "flatMultiplier": 2,
              "dice": "d8",
              "bonus": 4
            },
            "applyTo": "hitPoints",
            "type": [
              "magical"
            ],
            "base": false,
            "valueAlt": null,
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
          "trait": "agility",
          "difficulty": null,
          "damageMod": "none"
        },
        "name": "Cast",
        "img": "icons/magic/lightning/bolts-forked-large-blue-yellow.webp",
        "range": "close",
        "areas": [
          {
            "name": "Chain Lightning",
            "type": "placed",
            "shape": "emanation",
            "size": "close",
            "effects": [],
            "hasHole": false
          }
        ],
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": []
      },
      "tRJNO3DVvVYwW3tt": {
        "type": "damage",
        "_id": "tRJNO3DVvVYwW3tt",
        "systemPath": "actions",
        "description": "<p>Additional adversaries not already targeted by Chain Lightning and within Close range of previous targets who took damage must also make the reaction roll. Targets who fail take <strong>2d8+4</strong> magic damage. This chain continues until there are no more adversaries within range.</p>",
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
          "main": {
            "value": {
              "custom": {
                "enabled": false,
                "formula": ""
              },
              "multiplier": "flat",
              "flatMultiplier": 2,
              "dice": "d8",
              "bonus": 4
            },
            "applyTo": "hitPoints",
            "type": [
              "magical"
            ],
            "base": false,
            "resultBased": false,
            "valueAlt": null,
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
        "name": "Chain Damage",
        "img": "icons/magic/lightning/bolt-forked-large-magenta.webp",
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
  "_id": "0kAVO6rordCfZqYP",
  "effects": []
};
export function chainLightningData(folder){const data=structuredClone(nativeCard);data.folder=folder;const wave=data.system.actions[CHAIN_DAMAGE];wave.type='attack';wave.roll={...data.system.actions[CHAIN_CAST].roll,type:null};wave.save=structuredClone(data.system.actions[CHAIN_CAST].save);data.system.gmNotes='Cast uses the native attack, Stress cost, initial targeting and damage. After damage is applied, the chain automatically reaches previously untargeted adversaries within Close of damaged targets. New waves use native reaction rolls against the original Spellcast result and native 2d8+4 magic damage, with no additional attack or Stress payment. Chain Damage is an automatic-workflow reminder. The GM must view the cast scene.';data.flags={[ID]:{premade:{key:CHAIN_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.0kAVO6rordCfZqYP']}}};return data;}
export async function ensureChainLightning(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===CHAIN_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Arcana');if(!folder)throw Error('The Arcana compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=chainLightningData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Chain Lightning creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
