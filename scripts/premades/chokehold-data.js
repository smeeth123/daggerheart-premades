import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const CHOKEHOLD_KEY='midnight-chokehold',CHOKEHOLD_ACTION='QCMkze8rU0VB1VYL',CHOKEHOLD_EFFECT='yzGem7IfViJdAv1H';
const nativeCard={
  "name": "Chokehold",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/midnight.png",
  "type": "domainCard",
  "system": {
    "description": "<p>When you position yourself behind a creature who's about your size, you can <strong>mark a Stress</strong> to pull them into a chokehold, making them temporarily <em>Vulnerable</em>.</p><p>When a creature attacks a target who is <em>Vulnerable</em> in this way, they deal an extra <strong>2d6</strong> damage.</p>",
    "domain": "midnight",
    "recallCost": 1,
    "level": 3,
    "type": "ability",
    "actions": {
      "QCMkze8rU0VB1VYL": {
        "type": "effect",
        "_id": "QCMkze8rU0VB1VYL",
        "systemPath": "actions",
        "description": "<p>When you position yourself behind a creature who's about your size, you can mark a <strong>Stress</strong> to pull them into a chokehold, making them temporarily <em>Vulnerable</em>.</p>",
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
        "effects": [
          {
            "_id": "yzGem7IfViJdAv1H",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Pull into Chokehold",
        "img": "icons/skills/melee/hand-grip-staff-teal.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "IwiUBldoDTUgT6mh": {
        "type": "damage",
        "_id": "IwiUBldoDTUgT6mh",
        "systemPath": "actions",
        "description": "<p>When a creature attacks a target who is <em>Vulnerable</em> in this way, they deal an extra <strong>2d6</strong> damage.</p>",
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
        "damage": {
          "main": null,
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [],
        "name": "Damage",
        "img": "icons/magic/control/debuff-chains-shackle-movement-red.webp",
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
      "name": "Chokehold",
      "img": "icons/skills/wounds/injury-pain-body-orange.webp",
      "transfer": false,
      "_id": "yzGem7IfViJdAv1H",
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
      "description": "<p>Temporarily Vulnerable</p>",
      "tint": "#ffffff",
      "statuses": [
        "vulnerable"
      ],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function chokeholdData(folder){const data=structuredClone(nativeCard);data.folder=folder;delete data.system.actions.IwiUBldoDTUgT6mh;data.effects[0].flags={[ID]:{chokehold:true}};data.system.gmNotes='Native Pull into Chokehold, Stress cost and temporarily Vulnerable effect remain unchanged. Positioning behind a similarly sized creature and ending the hold are manual. While its Chokehold effect is active and the target is Vulnerable, any creature attacking it automatically rolls a labeled extra 2d6 in its normal damage roll. Other targets receive only base damage. Generic Vulnerable effects do not qualify; multiple holds do not stack. Damage rerolls and native critical/multiplier handling apply normally. The redundant native Damage action is removed; no extra Stress is charged for the bonus.';data.flags={[ID]:{premade:{key:CHOKEHOLD_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.R5GYUalYXLLFRlNl']}}};return data;}
export async function ensureChokehold(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===CHOKEHOLD_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Midnight');if(!folder)throw Error('The Midnight compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=chokeholdData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Chokehold creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
