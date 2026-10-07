import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const CORROSIVE_KEY='sage-corrosive-projectile',CORROSIVE_CAST='WqHLiHxP2enmJaHx',CORROSIVE_EFFECT='zB95bjSSdVlApQnR';
const nativeCard={
  "name": "Corrosive Projectile",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/sage.png",
  "type": "domainCard",
  "folder": "uXGugK72AffddFdH",
  "system": {
    "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Far range. On a success, deal <strong>d6+4</strong> magic damage using your Proficiency. Additionally, <strong>mark 2 or more Stress</strong> to make them permanently <em>Corroded</em>. While a target is <em>Corroded</em>, they gain a -1 penalty to their Difficulty for every 2 Stress you spent. This condition can stack.</p>",
    "domain": "sage",
    "recallCost": 1,
    "level": 3,
    "type": "spell",
    "actions": {
      "WqHLiHxP2enmJaHx": {
        "type": "attack",
        "_id": "WqHLiHxP2enmJaHx",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Far range. On a success, deal <strong>d6+4</strong> magic damage using your Proficiency.</p>",
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
            "resultBased": false,
            "value": {
              "custom": {
                "enabled": false,
                "formula": ""
              },
              "multiplier": "prof",
              "dice": "d6",
              "bonus": 4,
              "flatMultiplier": 1
            },
            "applyTo": "hitPoints",
            "type": [],
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
          "trait": null,
          "difficulty": null,
          "damageMod": "none"
        },
        "name": "Cast",
        "img": "icons/magic/acid/projectile-smoke-glowing.webp",
        "range": "far",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "maf0whws7wgRnFsH": {
        "type": "effect",
        "_id": "maf0whws7wgRnFsH",
        "systemPath": "actions",
        "description": "<p>Additionally, <strong>mark 2 or more Stress</strong> to make them permanently <em>Corroded</em>. While a target is <em>Corroded</em>, they gain a -1 penalty to their Difficulty for every 2 Stress you spent. This condition can stack.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": true,
            "key": "stress",
            "value": 0,
            "step": 2,
            "itemId": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "zB95bjSSdVlApQnR",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Corrode",
        "img": "icons/magic/acid/dissolve-bone-white.webp",
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
  "sort": 3400000,
  "effects": [
    {
      "name": "Corroded",
      "img": "icons/magic/acid/dissolve-bone-white.webp",
      "transfer": false,
      "_id": "zB95bjSSdVlApQnR",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.difficulty",
            "type": "add",
            "value": "-@stack",
            "priority": null,
            "phase": "initial"
          }
        ],
        "stacking": {
          "max": null,
          "value": 1
        },
        "duration": {
          "type": "",
          "description": ""
        },
        "rangeDependence": null,
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
      "description": "<p>While a target is Corroded, they gain a -1 penalty to their Difficulty for every 2 Stress you spent. This condition can stack.</p>",
      "tint": "#ffffff",
      "statuses": [
        "corrode"
      ],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function corrosiveProjectileData(folder){
  const data=structuredClone(nativeCard);data.folder=folder;
  // The paid post-hit picker replaces the separate native zero-cost scalable action.
  delete data.system.actions.maf0whws7wgRnFsH;
  data.effects[0].system.changes[0].value='-@stacks';
  data.system.gmNotes='After a successful Cast, choose one hit adversary and an even Stress cost (at least 2). Corroded permanently reduces Difficulty by 1 per 2 Stress; repeated applications stack. Damage and Spellcast resolution remain native.';
  data.flags={[ID]:{premade:{key:CORROSIVE_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.qJaSNTuDfbPVr8Lb']}}};return data;
}
export async function ensureCorrosiveProjectile(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===CORROSIVE_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(f=>!f.folder&&f.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');
  const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=corrosiveProjectileData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Corrosive Projectile creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}

