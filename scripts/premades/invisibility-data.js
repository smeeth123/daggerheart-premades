import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const INVISIBILITY_KEY='grace-invisibility',INVISIBILITY_CAST='jD03JDo0H9Q9QV2E',INVISIBILITY_EFFECT='Mt4qol2YB9uzEKGS';
const nativeCard={
  "name": "Invisibility",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/grace.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Make a <strong>Spellcast Roll (10)</strong>. On a success, <strong>mark a Stress</strong> and choose yourself or an ally within Melee range to become <em>Invisible</em>. An <em>Invisible</em> creature can't be seen except through magical means and attack rolls against them are made with disadvantage. Place a number of tokens on this card equal to your Spellcast trait. When the <em>Invisible</em> creature takes an action, spend a token from this card. After the action that spends the last token is resolved, the effect ends.</p><p>You can only hold Invisibility on one creature at a time.</p>",
    "domain": "grace",
    "recallCost": 1,
    "level": 3,
    "type": "spell",
    "actions": {
      "jD03JDo0H9Q9QV2E": {
        "type": "healing",
        "_id": "jD03JDo0H9Q9QV2E",
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
        "damage": {
          "main": null,
          "resources": {
            "resource": {
              "base": false,
              "itemId": "KHkzA4Zrw8EWN1CH",
              "applyTo": "resource",
              "resultBased": false,
              "fullRestore": false,
              "value": {
                "multiplier": "flat",
                "flatMultiplier": 1,
                "dice": "d6",
                "bonus": null,
                "custom": {
                  "enabled": true,
                  "formula": "@cast"
                }
              },
              "valueAlt": null
            }
          }
        },
        "target": {
          "type": "any",
          "amount": 1
        },
        "effects": [
          {
            "_id": "Mt4qol2YB9uzEKGS",
            "onSave": false
          }
        ],
        "roll": {
          "type": "spellcast",
          "trait": null,
          "difficulty": 10,
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
        "name": "Spellcast Roll",
        "range": "melee",
        "img": "icons/magic/perception/silhouette-stealth-shadow.webp"
      }
    },
    "resource": {
      "type": "simple",
      "value": 0,
      "max": "@cast",
      "icon": "fa-solid fa-eye-low-vision",
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
    "gmNotes": "",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": [
    {
      "name": "Invisible",
      "disabled": false,
      "img": "icons/magic/perception/silhouette-stealth-shadow.webp",
      "description": "<p>An <em>Invisible</em> creature can't be seen except through magical means and attack rolls against them are made with disadvantage. Place a number of tokens on this card equal to your Spellcast trait. When the <em>Invisible</em> creature takes an action, spend a token from this card. After the action that spends the last token is resolved, the effect ends.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": [],
        "conditionals": []
      },
      "_id": "Mt4qol2YB9uzEKGS",
      "type": "base",
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "tint": "#ffffff",
      "showIcon": 1,
      "folder": null,
      "sort": 0,
      "flags": {}
    }
  ]
};
export function invisibilityData(folder){const data=structuredClone(nativeCard);data.folder=folder;const cast=data.system.actions[INVISIBILITY_CAST];cast.type='attack';cast.damage={main:null,resources:{}};cast.target={type:'self',amount:null};cast.effects=[];cast.save={trait:null,difficulty:null,damageMod:'none'};data.effects[0].disabled=true;data.effects[0].statuses=['invisible'];data.system.gmNotes='Target one ally within Melee before casting, or leave targets empty to cast on yourself. Successful casts pay the native Stress cost, set tokens to current Spellcast trait and apply Foundry invisible status. Attacks against the holder automatically have disadvantage. Completed actions (including no-roll actions) spend a token after resolution; reactions and damage-only rolls do not. The last action retains invisibility through resolution. A successful recast replaces the old holder; no rest/scene expiry is added. Setting the card tokens to zero removes only its own Invisible effect.';data.flags={[ID]:{premade:{key:INVISIBILITY_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.KHkzA4Zrw8EWN1CH']}}};return data;}
export async function ensureInvisibility(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===INVISIBILITY_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Grace');if(!folder)throw Error('The Grace compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=invisibilityData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Invisibility creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

