import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const ARCANE_REFLECTION_KEY='arcana-arcane-reflection';
export const ARCANE_REFLECTION_ACTION='45ywf6Juwz4mmn9j';

const nativeCard={
  "name": "Arcane Reflection",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
  "type": "domainCard",
  "system": {
    "description": "<p>When you would take magic damage, you can <strong>spend any number of Hope</strong> to roll that many <strong>d6s</strong>. If any roll a 6, the attack is reflected back to the caster, dealing the damage to them instead.</p>",
    "domain": "arcana",
    "recallCost": 1,
    "level": 8,
    "type": "spell",
    "actions": {
      "45ywf6Juwz4mmn9j": {
        "type": "attack",
        "_id": "45ywf6Juwz4mmn9j",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": true,
            "key": "hope",
            "value": 1,
            "step": 1,
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
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [],
        "roll": {
          "type": "diceSet",
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "scale",
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
        "name": "Reflect Back",
        "img": "icons/magic/defensive/barrier-shield-dome-deflect-blue.webp",
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
    "gmNotes": "Before reducing incoming magic damage from a known caster, choose how much Hope to spend and roll one d6 per Hope. Any 6 sends the damage to the caster instead. Their own defenses apply. Separately supplied resource changes remain on the original recipient. Use Reflect Back manually when the caster is not identified.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": []
};

export function arcaneReflectionData(folder){
 const data=structuredClone(nativeCard);
 data.folder=folder;
 data.flags={[ID]:{premade:{key:ARCANE_REFLECTION_KEY,version:'1.0.0',category:'domain-cards',aliases:[],
  sourceUuids:['Compendium.daggerheart.domains.Item.JzSvxy9Mu3RJp1jV']}}};
 return data;
}

export async function ensureArcaneReflection(){
 const pack=game.packs.get(ID+'.domain-cards');
 if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===ARCANE_REFLECTION_KEY);
 if(existing)return existing;
 const folder=pack.folders.find(folder=>!folder.folder&&folder.name==='Arcana');
 if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;
 try{
  if(locked)await configurePremadePack(pack,{locked:false});
  const item=await Item.create(arcaneReflectionData(folder.id),{pack:pack.collection});
  if(!item)throw Error('Arcane Reflection creation was cancelled.');
  return item;
 }finally{
  if(locked)await configurePremadePack(pack,{locked:true});
 }
}
