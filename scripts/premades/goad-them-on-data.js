import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const GOAD_KEY='valor-goad-them-on',GOAD_ACTION='kiKrK30UMopx3izN',GOAD_EFFECT='Jccsuc48gmA6QAni';
const nativeCard={
  "name": "Goad Them On",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/valor.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Describe how you taunt a target within Close range, then make a <strong>Presence Roll</strong> against them. On a success, the target must mark a Stress, and the next time the GM spotlights them, they must target you with an attack, which they make with disadvantage.</p>",
    "domain": "valor",
    "recallCost": 1,
    "level": 4,
    "type": "ability",
    "actions": {
      "kiKrK30UMopx3izN": {
        "type": "attack",
        "_id": "kiKrK30UMopx3izN",
        "systemPath": "actions",
        "description": "",
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
                  "formula": "1"
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
            "_id": "Jccsuc48gmA6QAni",
            "onSave": false
          }
        ],
        "roll": {
          "type": "trait",
          "trait": "presence",
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
        "name": "Goad",
        "img": "icons/magic/control/mouth-smile-deception-purple.webp",
        "range": "close",
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
    "gmNotes": "Native Goad handles the Presence roll and success-only Stress/effect application. Goaded automatically imposes disadvantage on the targets next completed attack roll, then expires, hit or miss. Canceled, preview, ordinary trait/reaction and damage rolls preserve it. Attack reactions do count. Advantage cancels disadvantage normally. Spotlighting and choosing the goading character as the target remain manual. Applied effects continue after the source card is vaulted or removed.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": [
    {
      "name": "Goaded",
      "img": "icons/magic/control/mouth-smile-deception-purple.webp",
      "transfer": false,
      "_id": "Jccsuc48gmA6QAni",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.disadvantageSources",
            "type": "add",
            "value": "Attacking the goading creature",
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "type": "temporary",
          "description": "Until the next completed attack roll."
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": [],
        "conditionals": []
      },
      "disabled": true,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>The next time this Adversary is spotlighted, they must target the Goading Character with an attack, which they make with disadvantage.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {
        "daggerheart-premades": {
          "goaded": true
        }
      },
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function goadData(folder){return {...clone(nativeCard),folder,flags:{[ID]:{premade:{key:GOAD_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.HufF5KzuNfEb9RTi']}}}};}
export async function ensureGoad(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===GOAD_KEY);if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;const folder=pack.folders.find(f=>!f.folder&&f.name==='Valor');if(!folder)throw Error('The Valor compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const d=goadData(folder.id),item=old?await old.update(d,{diff:false,recursive:false}):await Item.create(d,{pack:pack.collection});if(!item)throw Error('Goad Them On creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
