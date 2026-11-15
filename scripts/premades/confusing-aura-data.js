import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const CONFUSING_AURA_KEY='arcana-confusing-aura';
export const CONFUSING_AURA_ACTION='L2hCs7xXO6sD4tUa';

const nativeCard={
  "name": "Confusing Aura",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Make a <strong>Spellcast Roll (14)</strong>. Once per long rest on a success, you create a layer of illusion over your body that makes it hard to tell exactly where you are. <strong>Mark any number of Stress</strong> to make that many additional layers. When an adversary makes an attack against you, roll a number of <strong>d6s</strong> equal to the number of layers currently active. If any roll a 5 or higher, one layer of the aura is destroyed and the attack fails. If all the results are 4 or lower, you take the damage and this spell ends.</p>",
    "domain": "arcana",
    "recallCost": 2,
    "level": 8,
    "type": "spell",
    "actions": {
      "L2hCs7xXO6sD4tUa": {
        "type": "attack",
        "_id": "L2hCs7xXO6sD4tUa",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll (14)</strong>. Once per long rest on a success, you create a layer of illusion over your body that makes it hard to tell exactly where you are.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": null,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": true
        },
        "damage": {
          "main": null,
          "resources": {}
        },
        "target": {
          "type": null,
          "amount": null
        },
        "effects": [],
        "roll": {
          "type": "spellcast",
          "trait": null,
          "difficulty": 14,
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
        "name": "Create First Layer",
        "img": "icons/magic/defensive/illusion-evasion-echo-purple.webp",
        "range": "",
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
      "value": 0,
      "max": null,
      "recovery": null,
      "progression": "increasing",
      "diceStates": {},
      "dieFaces": "d4"
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "Cast with the native Spellcast Roll (14). On success, set one layer and optionally mark Stress for additional layers. Roll one d6 per active layer when an adversary attacks you. Any 5 or 6 blocks the attack against you and consumes one layer. Otherwise, all layers end and any hit resolves normally.",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": []
};

export function confusingAuraData(folder){
 const data=structuredClone(nativeCard);
 data.folder=folder;
 data.flags={[ID]:{premade:{key:CONFUSING_AURA_KEY,version:'1.0.0',category:'domain-cards',aliases:[],
  sourceUuids:['Compendium.daggerheart.domains.Item.R8NDiJXJWmC48WSr']}}};
 return data;
}

export async function ensureConfusingAura(){
 const pack=game.packs.get(ID+'.domain-cards');
 if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===CONFUSING_AURA_KEY);
 if(existing)return existing;
 const folder=pack.folders.find(folder=>!folder.folder&&folder.name==='Arcana');
 if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;
 try{
  if(locked)await configurePremadePack(pack,{locked:false});
  const item=await Item.create(confusingAuraData(folder.id),{pack:pack.collection});
  if(!item)throw Error('Confusing Aura creation was cancelled.');
  return item;
 }finally{
  if(locked)await configurePremadePack(pack,{locked:true});
 }
}
