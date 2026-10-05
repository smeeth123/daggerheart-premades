import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const SIPHON_KEY='dread-siphon-essence',SIPHON_ACTION='atYHfdIRwhIVLVt3',SIPHON_FEAR_ACTION='2WSDK7psPlgjOnSG';
const nativeCard={
  "type": "domainCard",
  "name": "Siphon Essence",
  "system": {
    "domain": "dread",
    "level": 2,
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Very Close range. Once per long rest on a success, the target takes <strong>d12+4</strong> magic damage using your Proficiency. On a success with Fear, you gain a +1 bonus to your Proficiency for this attack.</p><p>You clear a number of Hit Points equal to the number of Hit Points the target marked from this attack.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "atYHfdIRwhIVLVt3": {
        "type": "attack",
        "damage": {
          "main": {
            "base": false,
            "applyTo": "hitPoints",
            "resultBased": false,
            "fullRestore": false,
            "value": {
              "multiplier": "prof",
              "flatMultiplier": 1,
              "dice": "d12",
              "bonus": 4,
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
        "_id": "atYHfdIRwhIVLVt3",
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
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": true
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
          "difficulty": null,
          "damageMod": "none"
        },
        "name": "Spellcast Roll",
        "range": "veryClose",
        "img": "icons/magic/unholy/energy-smoke-pink.webp"
      },
      "2WSDK7psPlgjOnSG": {
        "type": "damage",
        "damage": {
          "main": {
            "base": false,
            "applyTo": "hitPoints",
            "resultBased": false,
            "fullRestore": false,
            "value": {
              "multiplier": "flat",
              "flatMultiplier": 1,
              "dice": "d6",
              "bonus": null,
              "custom": {
                "enabled": true,
                "formula": "(@prof+1)d12 + 4"
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
        "_id": "2WSDK7psPlgjOnSG",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>On a success with Fear, you gain a +1 bonus to your Proficiency for this attack.</p>",
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
          "amount": null
        },
        "effects": [],
        "name": "With Fear",
        "range": "",
        "img": "icons/magic/unholy/orb-hands-pink.webp"
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
  "effects": [],
  "flags": {}
};
export function siphonEssenceData(folder){
  const data=structuredClone(nativeCard);data.folder=folder;
  data.system.gmNotes='Use the native Spellcast Roll action. Its once-per-long-rest successful use and Very Close range stay native. Success with Fear automatically grants +1 Proficiency for this attack before the damage dialog; critical success counts as Hope, not Fear. Apply the attack damage normally, including from its chat card. After reductions and committed target HP writes, the caster automatically clears the actual HP the successful target marked, capped by remaining HP on both actors. The old With Fear action is retained but directs you to the attack chat card to avoid duplicate damage. Unattributed/manual HP edits and redirected damage marked by someone other than the successful target do not heal the caster.';
  data.flags={[ID]:{premade:{key:SIPHON_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.21mofokzGa4yryRZ']}}};
  return data;
}
export async function ensureSiphonEssence(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===SIPHON_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Dread');if(!folder)throw Error('The Dread compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=siphonEssenceData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Siphon Essence creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}

