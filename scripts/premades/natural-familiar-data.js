import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const FAMILIAR_KEY='sage-natural-familiar',FAMILIAR_SUMMON='BhVDgty2nqoOhn97',FAMILIAR_FLYING='DhpFamiliarFly01',FAMILIAR_TASK='kHAwq8lfsEPd9Qga',FAMILIAR_EFFECT='0BumAWKw2aK4A5al';
export const FAMILIAR_FLYING_IMAGE='icons/creatures/birds/raptor-owl-flying-moon.webp';
const nativeCard={
  "name": "Natural Familiar",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/sage.png",
  "type": "domainCard",
  "system": {
    "description": "<p><strong>Spend a Hope</strong> to summon a small nature spirit or forest critter to your side until your next rest, you cast Natural Familiar again, or the familiar is targeted by an attack. If you <strong>spend an additional Hope</strong>, you can summon a familiar that flies. You can communicate with them, make a <strong>Spellcast Roll</strong> to command them to perform simple tasks, and <strong>mark a Stress</strong> to see through their eyes.</p><p>When you deal damage to an adversary within Melee range of your familiar, you add a <strong>d6</strong> to your damage roll.</p>",
    "domain": "sage",
    "recallCost": 1,
    "level": 2,
    "type": "spell",
    "actions": {
      "BhVDgty2nqoOhn97": {
        "type": "effect",
        "_id": "BhVDgty2nqoOhn97",
        "systemPath": "actions",
        "description": "<p><strong>Spend a Hope</strong> to summon a small nature spirit or forest critter to your side until your next rest, you cast Natural Familiar again, or the familiar is targeted by an attack. If you <strong>spend an additional Hope</strong>, you can summon a familiar that flies.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": true,
            "key": "hope",
            "value": 1,
            "step": null,
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
        "effects": [
          {
            "_id": "0BumAWKw2aK4A5al",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Summon Familiar",
        "img": "icons/creatures/amphibians/bullfrog-glass-teal.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "kHAwq8lfsEPd9Qga": {
        "type": "attack",
        "_id": "kHAwq8lfsEPd9Qga",
        "systemPath": "actions",
        "description": "<p>You can communicate with them, make a <strong>Spellcast Roll</strong> to command them to perform simple tasks.</p>",
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
        "name": "Perform Task",
        "img": "icons/creatures/amphibians/treefrog-leaf-green.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "8Y03LcPgXF30DfzZ": {
        "type": "effect",
        "_id": "8Y03LcPgXF30DfzZ",
        "systemPath": "actions",
        "description": "<p><strong>Mark a Stress</strong> to see through their eyes.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "step": null,
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
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "See Through Eyes",
        "img": "icons/magic/perception/eye-ringed-green.webp",
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
  "effects": [
    {
      "name": "Familiar Damage",
      "img": "icons/sundries/gaming/dice-pair-white-green.webp",
      "transfer": false,
      "_id": "0BumAWKw2aK4A5al",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.bonuses.damage.dice",
            "type": "add",
            "value": "d6",
            "priority": null,
            "phase": "initial"
          }
        ],
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
      "_stats": {
        "compendiumSource": null,
        "coreVersion": "14.364",
        "systemId": "daggerheart",
        "systemVersion": "2.10.8"
      },
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function naturalFamiliarData(folder){
  const data=structuredClone(nativeCard);data.folder=folder;
  const summon=data.system.actions[FAMILIAR_SUMMON];summon.target={type:'self',amount:null};summon.effects=[];summon.cost[0].scalable=false;
  data.system.actions[FAMILIAR_FLYING]={...structuredClone(summon),_id:FAMILIAR_FLYING,name:'Summon Flying Familiar',img:FAMILIAR_FLYING_IMAGE,description:'<p>Spend 2 Hope to summon a flying natural familiar.</p>',cost:[{...summon.cost[0],value:2}]};
  const effect=data.effects[0];effect.name='Natural Familiar';effect.disabled=true;effect.system.changes=[];effect.system.duration={type:'shortRest',description:'Until your next rest, recast, or the familiar is targeted by an attack.'};
  data.system.gmNotes='Summon Familiar costs 1 Hope; Summon Flying Familiar costs 2 Hope total. Creates a friendly, controllable small token backed by a temporary NPC. Movement, task adjudication and viewing through its eyes remain manual/native. The summon expires on the caster’s next completed rest, recasting, or a completed attack targeting the familiar, hit or miss. Natural Familiar adds one normal d6 to HP damage only for adversaries within native Melee of its token when damage is rolled; mixed-range targets do not share the bonus. No blanket actor damage bonus.';
  data.flags={[ID]:{premade:{key:FAMILIAR_KEY,version:'1.0.1',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.Tag303LoRNC5zGgl']}}};return data;
}
export async function ensureNaturalFamiliar(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===FAMILIAR_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.1')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});const data=naturalFamiliarData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Natural Familiar creation was cancelled.');return item;}
  finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
