import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const THORN_KEY='sage-thorn-skin',THORN_ACTIVATE='zuiLXexIzTvLmoKF',THORN_USE='IVAyyVf8gqFWB7bP';
const nativeCard={
  "name": "Thorn Skin",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/sage.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Once per rest, <strong>spend a Hope</strong> to sprout thorns all over your body. When you do, place a number of tokens equal to your Spellcast trait on this card. When you take damage, you can spend any number of tokens to roll that number of <strong>d6s</strong>. Add the results together and reduce the incoming damage by that amount. If you're within Melee range of the attacker, deal that amount of damage back to them.</p><p>When you take a rest, clear all unspent tokens.</p>",
    "domain": "sage",
    "recallCost": 1,
    "level": 5,
    "type": "spell",
    "actions": {
      "zuiLXexIzTvLmoKF": {
        "type": "healing",
        "_id": "zuiLXexIzTvLmoKF",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>Once per rest, <strong>spend a Hope</strong> to sprout thorns all over your body. When you do, place a number of tokens equal to your Spellcast trait on this card.</p>",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [
          {
            "itemId": null,
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "1",
          "recovery": "shortRest",
          "consumeOnSuccess": false
        },
        "damage": {
          "main": null,
          "resources": {
            "resource": {
              "base": false,
              "itemId": "oUipGK84E2KjoKqh",
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
          "type": "self",
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
        "name": "Gain Tokens",
        "range": "self",
        "img": "icons/magic/nature/thorns-hand-glow-green.webp"
      },
      "IVAyyVf8gqFWB7bP": {
        "type": "effect",
        "_id": "IVAyyVf8gqFWB7bP",
        "systemPath": "actions",
        "description": "<p>When you take damage, you can spend any number of tokens to roll that number of <strong>d6s</strong>. Add the results together and reduce the incoming damage by that amount. If you're within Melee range of the attacker, deal that amount of damage back to them.</p><p>When you take a rest, clear all unspent tokens.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "resource",
            "itemId": "oUipGK84E2KjoKqh",
            "value": 1,
            "scalable": true,
            "step": 1,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Use Tokens",
        "img": "icons/commodities/gems/gem-faceted-diamond-blue.webp",
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
      "recovery": "shortRest",
      "max": "",
      "icon": "fa-solid fa-road-spikes",
      "dieFaces": "d6",
      "progression": "increasing",
      "diceStates": {}
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "Gain Tokens uses the native once-per-rest 1 Hope activation and grants tokens equal to Spellcast. Incoming positive damage offers a bounded token count before native damage reduction. Spend tokens, roll that many d6s, and subtract the full rolled total (minimum incoming damage zero). If the identifiable attacker is within native Melee range, return the full rolled amount matching the incoming damage type through their normal resistance/Armor/damage workflow after the original damage completes. Unidentified/out-of-range attackers still allow reduction without automatic retaliation. Decline spends nothing. Native short-rest recovery clears unspent tokens and resets activation; scene/session refresh does not. Use Tokens is a reminder instead of a separate payment. No attack roll or Proficiency bonus is added.",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": [
    {
      "name": "Thorn Skin",
      "img": "icons/magic/nature/thorns-hand-glow-green.webp",
      "transfer": false,
      "_id": "KPA1okccsR7AQH0x",
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
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function thornData(folder){return {...clone(nativeCard),folder,flags:{[ID]:{premade:{key:THORN_KEY,version:'1.0.0',category:'domain-cards',aliases:['Thornskin'],sourceUuids:['Compendium.daggerheart.domains.Item.oUipGK84E2KjoKqh']}}}};}
export async function ensureThorn(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===THORN_KEY);if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;const folder=pack.folders.find(f=>!f.folder&&f.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=thornData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Thorn Skin creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

