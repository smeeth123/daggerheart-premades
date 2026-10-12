import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const FORTRESS_KEY='sage-wild-fortress',FORTRESS_CAST='WlcAj8f6THUudbWp';
const nativeCard={
  "name": "Wild Fortress",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/sage.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Make a <strong>Spellcast Roll (13)</strong>. On a success, <strong>spend 2 Hope</strong> to grow a natural barricade in the shape of a dome that you and one ally can take cover within. While inside the dome, a creature can't be targeted by attacks and can't make attacks. Attacks made against the dome automatically succeed. The dome has a Major damage threshold of 15 and a Severe damage threshold of 30, and lasts until it marks 3 Hit Points. Place tokens on this card to represent marking Hit Points.</p>",
    "domain": "sage",
    "recallCost": 1,
    "level": 5,
    "type": "spell",
    "actions": {
      "WlcAj8f6THUudbWp": {
        "type": "attack",
        "_id": "WlcAj8f6THUudbWp",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "consumeOnSuccess": true,
            "scalable": false,
            "key": "hope",
            "value": 2,
            "step": null,
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
        "img": "icons/magic/nature/leaf-armor-scale-green.webp",
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
      "max": "3",
      "icon": "",
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
    "gmNotes": "Cast uses native Spellcast (13) and success-only 2 Hope. After success, choose up to one ally on the caster's scene/level; a damageable dome and unlocked circular shelter region are placed automatically around the chosen tokens. GM may resize the visual footprint; no range category is invented. Chosen occupants within the region cannot make attacks or be targeted by attacks; leaving restores attacks and re-entering restores shelter. The dome has native Major15/Severe30/3HP. Attacks targeting only domes skip the attack roll but retain native action costs, damage rolls, rerolls and Deal Damage; no Hope/Fear/crit is fabricated. Mixed attacks roll normally for other targets while domes always hit. Card HP tokens mirror the latest dome; earlier separately cast domes retain their own HP. At 3HP, or GM deletion of dome/region, remove only that generation and shelter effects. No rest/scene/session/recast expiration or walls/vision changes. Existing domes survive vaulting/removal of the source card.",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": []
};
export function fortressData(folder){return {...clone(nativeCard),folder,flags:{[ID]:{premade:{key:FORTRESS_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.9dFvcM1i3bxG3BSA']}}}};}
export async function ensureFortress(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===FORTRESS_KEY);if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;const folder=pack.folders.find(f=>!f.folder&&f.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=fortressData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Wild Fortress creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

