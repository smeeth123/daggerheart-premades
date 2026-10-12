import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const DISCORD_KEY='grace-words-of-discord',DISCORD_ACTION='8BKvS2s0IPMA8wF9',DISCORD_EFFECT='DGp7TSriFWotAvP6';
const nativeCard={
  "name": "Words of Discord",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/grace.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Whisper words of discord to an adversary within Melee range and make a <strong>Spellcast Roll (13)</strong>. On a success, the target must mark a Stress and make an attack against another adversary instead of against you or your allies.</p><p>Once this attack is over, the target realizes what happened. The next time you cast Words of Discord on them, gain a -5 penalty to the Spellcast Roll.</p>",
    "domain": "grace",
    "recallCost": 1,
    "level": 5,
    "type": "spell",
    "actions": {
      "8BKvS2s0IPMA8wF9": {
        "type": "attack",
        "_id": "8BKvS2s0IPMA8wF9",
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
            "_id": "DGp7TSriFWotAvP6",
            "onSave": false
          }
        ],
        "roll": {
          "type": "spellcast",
          "trait": null,
          "difficulty": 13,
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
        "img": "icons/skills/melee/strike-axe-energy-pink.webp",
        "range": "melee",
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
    "gmNotes": "Native Spellcast (13), Melee targeting, success-only Stress and compelled attack effect are unchanged. Make the compelled adversary attack manually. After its next completed attack roll, the adversary remembers this caster; later Words of Discord casts by that caster automatically include a labeled -5 modifier. Other casters and other rolls are unaffected. The memory persists through rests and scene refresh. The native effect remains a manual narrative reminder.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": [
    {
      "name": "Words of Discord",
      "img": "icons/skills/melee/strike-axe-energy-pink.webp",
      "transfer": false,
      "_id": "DGp7TSriFWotAvP6",
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
      "description": "<p>The target must make an attack against another adversary instead of against you or your allies. Once this attack is over, the target realizes what happened. The next time you cast Words of Discord on them, gain a -5 penalty to the Spellcast Roll.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {
        "daggerheart-premades": {
          "wordsDiscord": true
        }
      },
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function wordsDiscordData(folder){return {...clone(nativeCard),folder,flags:{[ID]:{premade:{key:DISCORD_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.ZjAdi1FSNCDDHI3X']}}}};}
export async function ensureWordsDiscord(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===DISCORD_KEY);if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;const folder=pack.folders.find(f=>!f.folder&&f.name==='Grace');if(!folder)throw Error('The Grace compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=wordsDiscordData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Words of Discord creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

