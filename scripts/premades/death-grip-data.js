import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const GRIP_KEY='sage-death-grip',GRIP_CAST='9416a3EogNFLRdUX',GRIP_VINES='DhpGripVines0001';
const nativeCard={
  "name": "Death Grip",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/sage.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Close range and choose one of the following options:</p><ul><li class=\"vertical-card-list\"><p>You pull the target into Melee range or pull yourself into Melee range of them.</p></li><li class=\"vertical-card-list\"><p>You constrict the target and force them to mark 2 Stress.</p></li><li class=\"vertical-card-list\"><p>All adversaries between you and the target must succeed on a Reaction Roll (13) or be hit by vines, taking <strong>3d6+2</strong> physical damage.</p></li></ul><p>On a success, vines reach out from your hands, causing the chosen effect and temporarily <em>Restraining</em> the target.</p>",
    "domain": "sage",
    "recallCost": 1,
    "level": 4,
    "type": "spell",
    "actions": {
      "wsXZCKqGKfOUHE1M": {
        "type": "attack",
        "_id": "wsXZCKqGKfOUHE1M",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Close range, and choose the following option:</p><ul><li class=\"vertical-card-list\"><p>You pull the target into Melee range or pull yourself into Melee range of them.</p></li></ul><p>On a success, vines reach out from your hands, causing the chosen effect and temporarily <em>Restraining</em> the target.</p>",
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
          "main": null,
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [
          {
            "_id": "wMXCIQxqLS9IbsEK",
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
        "name": "Pull",
        "img": "icons/magic/nature/root-vine-entangled-hand.webp",
        "range": "close",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "x62SXSpT9bjIEP5e": {
        "type": "attack",
        "_id": "x62SXSpT9bjIEP5e",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Close range and choose the following option:</p><ul><li class=\"vertical-card-list\"><p>You constrict the target and force them to mark 2 Stress.</p></li></ul><p>On a success, vines reach out from your hands, causing the chosen effect and temporarily <em>Restraining</em> the target.</p>",
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
          "main": null,
          "resources": {
            "stress": {
              "resultBased": false,
              "value": {
                "custom": {
                  "enabled": true,
                  "formula": "2"
                },
                "multiplier": "prof",
                "flatMultiplier": 1,
                "dice": "d6",
                "bonus": null
              },
              "applyTo": "stress",
              "base": false,
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
        "effects": [
          {
            "_id": "bZ0xgZ6TT2099OYp",
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
        "name": "Constrict",
        "img": "icons/magic/nature/root-vines-knot-brown.webp",
        "range": "close",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "9416a3EogNFLRdUX": {
        "type": "attack",
        "_id": "9416a3EogNFLRdUX",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> against a target within Close range and choose the following option:</p><ul><li class=\"vertical-card-list\"><p>All adversaries between you and the target must succeed on a Reaction Roll (13) or be hit by vines, taking <strong>3d6+2</strong> physical damage.</p></li></ul><p>On a success, vines reach out from your hands, causing the chosen effect and temporarily <em>Restraining</em> the target.</p>",
        "chatDisplay": true,
        "actionType": "reaction",
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
              "multiplier": "flat",
              "flatMultiplier": 3,
              "dice": "d6",
              "bonus": 2
            },
            "applyTo": "hitPoints",
            "type": [
              "physical"
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
        "effects": [
          {
            "_id": "Oe95zWWY41nH8y5l",
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
        "name": "Hit All Adversaries Between",
        "img": "icons/magic/nature/root-vine-beanstalk-moon.webp",
        "range": "",
        "areas": [
          {
            "name": "Line To Target",
            "type": "placed",
            "shape": "line",
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
  "effects": [
    {
      "name": "Restrained",
      "img": "icons/magic/control/debuff-chains-shackle-movement-red.webp",
      "transfer": false,
      "_id": "wMXCIQxqLS9IbsEK",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": ""
        },
        "rangeDependence": null,
        "stacking": null,
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
      "description": "",
      "tint": "#ffffff",
      "statuses": [
        "restrained"
      ],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Restrained",
      "img": "icons/magic/control/debuff-chains-shackle-movement-red.webp",
      "transfer": false,
      "_id": "bZ0xgZ6TT2099OYp",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": ""
        },
        "rangeDependence": null,
        "stacking": null,
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
      "description": "",
      "tint": "#ffffff",
      "statuses": [
        "restrained"
      ],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Restrained",
      "img": "icons/magic/control/debuff-chains-shackle-movement-red.webp",
      "transfer": false,
      "_id": "Oe95zWWY41nH8y5l",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "description": ""
        },
        "rangeDependence": null,
        "stacking": null,
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
      "description": "",
      "tint": "#ffffff",
      "statuses": [
        "restrained"
      ],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function deathGripData(folder){
 const data=clone(nativeCard),cast=data.system.actions[GRIP_CAST];
 const vines=clone(cast);Object.assign(vines,{_id:GRIP_VINES,type:'attack',name:'Death Grip — Intervening Adversaries',description:'<p>Confirmed adversaries between the caster and the original target must succeed on a <strong>Reaction Roll (13)</strong> or take <strong>3d6+2 physical damage</strong>. This is the follow-up to the successful cast, not another attack. The original target is not included.</p>',actionType:'action',range:'',areas:[],effects:[],cost:[],roll:{...vines.roll,type:null,trait:null},save:{trait:'agility',difficulty:13,damageMod:'none'}});
 // Native hasSave requires a trait. Only NPC adversaries enter this workflow;
 // their native d20 reaction ignores the character trait selector.
 Object.assign(cast,{actionType:'action',range:'close',target:{type:'any',amount:1},areas:[],damage:{main:null,resources:{}}});
 data.system.actions[GRIP_VINES]=vines;data.folder=folder;
 data.system.gmNotes='Pull and Constrict stay native. Hit All Adversaries Between makes a normal single-target Close Spellcast attack and applies its native temporary Restrained effect on success. Then confirm intervening adversaries: token footprints intersecting the caster-to-target line are preselected; adjust the checkboxes for table adjudication. The caster and original target are excluded. No region or movement automation. A native follow-up card runs NPC Reaction Rolls (13) and one shared fixed 3d6+2 physical damage roll. Only recorded failed reactions receive damage through native defenses; unfinished reactions stay pending. Native save/damage automation settings and manual chat buttons remain available. Canceled or failed follow-up preserves the original cast and needs manual review, never automatic replay.';
 data.flags={[ID]:{premade:{key:GRIP_KEY,version:'1.0.1',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.x0FVGE1YbfXalJiw']}}};return data;
}
export async function ensureDeathGrip(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===GRIP_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.1')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=deathGripData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Death Grip creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
