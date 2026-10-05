import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const RETRIBUTION_KEY='dread-hideous-retribution';
export const RETRIBUTION_ACTION='9pclL7t5Tq5XQAGO';
const nativeCard={
  "type": "domainCard",
  "name": "Hideous Retribution",
  "system": {
    "domain": "dread",
    "level": 2,
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>When an ally within Close range takes damage from a target you can see, you can make a reaction roll against the target using your Spellcast trait. On a success, <strong>mark a Stress</strong> to deal <strong>d6</strong> magic damage using your Proficiency.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "9pclL7t5Tq5XQAGO": {
        "type": "attack",
        "damage": {
          "main": {
            "base": false,
            "applyTo": "hitPoints",
            "resultBased": false,
            "fullRestore": false,
            "value": {
              "multiplier": "cast",
              "flatMultiplier": 1,
              "dice": "d6",
              "bonus": null,
              "custom": {
                "enabled": false,
                "formula": ""
              }
            },
            "valueAlt": null,
            "includeBase": false,
            "direct": false,
            "type": [
              "magical"
            ],
            "itemId": null
          },
          "resources": {}
        },
        "_id": "9pclL7t5Tq5XQAGO",
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
        "cost": [
          {
            "consumeOnSuccess": true,
            "scalable": false,
            "key": "stress",
            "value": 1,
            "itemId": null,
            "step": null
          }
        ],
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
        "effects": [],
        "roll": {
          "type": "reaction",
          "trait": "spellcast",
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
        "name": "Reaction Roll",
        "range": "close",
        "img": "icons/magic/unholy/hand-claw-glow-orange.webp"
      }
    },
    "recallCost": 2,
    "type": "spell",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "img": "systems/daggerheart/assets/icons/domains/domain-card/dread.png",
  "effects": [],
  "flags": {}
};
export function hideousRetributionData(folder){
  const data=structuredClone(nativeCard);data.folder=folder;
  const action=data.system.actions[RETRIBUTION_ACTION];
  action.actionType='reaction';action.range='';action.damage.main.value.multiplier='prof';
  // Native CostField runs after damage; shared success payment gates damage instead.
  action.cost=[];
  action.description=data.system.description;
  data.system.gmNotes='After a nearby friendly ally actually takes damage from a visible creature, offer a Spellcast reaction against that creature. Only the ally must be within Close; the source has no added range restriction. Accept opens the native reaction roll and keeps its normal configuration, rerolls and damage workflow. Successful reactions spend 1 Stress through shared reactive payment before damage; failures, canceled rolls and decline cost nothing. Damage is Proficiency d6 magic. Narrative damage without source provenance and visibility/line-of-sight adjudication remain manual; the native Reaction Roll action is retained for manual use.';
  data.flags={[ID]:{premade:{key:RETRIBUTION_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.PM0kAvB1lRMiZujr']}}};
  return data;
}
export async function ensureHideousRetribution(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===RETRIBUTION_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Dread');if(!folder)throw Error('The Dread compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=hideousRetributionData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Hideous Retribution creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
