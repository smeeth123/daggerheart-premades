import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const CRITICAL_INSPIRATION_KEY='valor-critical-inspiration',CRITICAL_INSPIRATION_ACTION='kyPCNwzwrbb3LhWm';
const nativeCard={
  "name": "Critical Inspiration",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/valor.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Once per rest, when you critically succeed on an attack, all allies within Very Close range can clear a Stress or gain a Hope.</p>",
    "domain": "valor",
    "recallCost": 1,
    "level": 3,
    "type": "ability",
    "actions": {
      "kyPCNwzwrbb3LhWm": {
        "type": "healing",
        "_id": "kyPCNwzwrbb3LhWm",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": null,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": false
        },
        "damage": {
          "main": null,
          "resources": {}
        },
        "target": {
          "type": "friendly",
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
        "name": "Critically Succeed",
        "img": "icons/magic/light/hand-sparks-glow-yellow.webp",
        "range": "veryClose",
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
  "effects": []
};
export function criticalInspirationData(folder){const data=structuredClone(nativeCard);data.folder=folder;data.system.actions[CRITICAL_INSPIRATION_ACTION].uses.value=0;data.system.actions[CRITICAL_INSPIRATION_ACTION].uses.recovery='shortRest';data.system.gmNotes='After a critical attack, choose whether to use Critical Inspiration. Other friendly allies within Very Close each choose to clear 1 Stress or gain 1 Hope; choices are grouped by their owner. Once per rest, refreshed natively on short or long rest. The sheet action redirects to this automatic workflow.';data.flags={[ID]:{premade:{key:CRITICAL_INSPIRATION_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.ABp9pUfBS69NomTD']}}};return data;}
export async function ensureCriticalInspiration(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===CRITICAL_INSPIRATION_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Valor');if(!folder)throw Error('The Valor compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=criticalInspirationData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Critical Inspiration creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

