import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const ARCANA_TOUCHED_KEY='arcana-arcana-touched';
export const ARCANA_TOUCHED_ACTION='hBh4Lt0Bdd9CtJY7';

const nativeCard={
  "name": "Arcana-Touched",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
  "type": "domainCard",
  "system": {
    "description": "<p>When 4 or more of the domain cards in your loadout are from the Arcana domain, gain the following benefits:</p><ul><li class=\"vertical-card-list-found\"><p>+1 bonus to your Spellcast Rolls</p></li><li class=\"vertical-card-list-found\"><p>Once per rest, you can switch the results of your Hope and Fear Dice.</p></li></ul>",
    "domain": "arcana",
    "recallCost": 2,
    "level": 7,
    "type": "ability",
    "resource": {
      "type": "simple",
      "value": 1,
      "recovery": "shortRest",
      "max": "1",
      "icon": "",
      "progression": "decreasing",
      "diceStates": {},
      "dieFaces": "d4"
    },
    "actions": {
      "hBh4Lt0Bdd9CtJY7": {
        "type": "effect",
        "_id": "hBh4Lt0Bdd9CtJY7",
        "systemPath": "actions",
        "description": "<p>Once per rest, you can switch the results of your Hope and Fear Dice.</p>",
        "chatDisplay": false,
        "actionType": "action",
        "cost": [],
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
        "name": "Switch Duality Results",
        "img": "icons/commodities/gems/gem-faceted-octagon-yellow.webp",
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
    "domainTouched": 4,
    "gmNotes": "The system handles the +1 to Spellcast Rolls and the four-Arcana-card requirement. Use Swap Dice in Roll Resolution after an action roll and before its consequences. One use per rest.",
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false
  },
  "effects": [
    {
      "name": "Arcana-Touched",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.bonuses.roll.bonus",
            "type": "add",
            "value": "1",
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
        "conditionals": [
          {
            "type": "actionType",
            "actionTypes": [
              "spellcast"
            ],
            "traits": []
          }
        ]
      },
      "_id": "vTW98Xha0HP8ITrs",
      "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>When 4 or more of the domain cards in your loadout are from the Arcana domain, gain the following benefits:</p><ul><li class=\"vertical-card-list-found\"><p>+1 bonus to your Spellcast Rolls</p></li><li class=\"vertical-card-list-found\"><p>Once per rest, you can switch the results of your Hope and Fear Dice.</p></li></ul>",
      "tint": "#ffffff",
      "transfer": true,
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};

export function arcanaTouchedData(folder){
 const data=structuredClone(nativeCard);
 data.folder=folder;
 data.flags={[ID]:{premade:{key:ARCANA_TOUCHED_KEY,version:'1.0.0',category:'domain-cards',aliases:[],
  sourceUuids:['Compendium.daggerheart.domains.Item.5PvMQKCjrgSxzstn']}}};
 return data;
}

export async function ensureArcanaTouched(){
 const pack=game.packs.get(ID+'.domain-cards');
 if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===ARCANA_TOUCHED_KEY);
 if(existing)return existing;
 const folder=pack.folders.find(folder=>!folder.folder&&folder.name==='Arcana');
 if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;
 try{
  if(locked)await configurePremadePack(pack,{locked:false});
  const item=await Item.create(arcanaTouchedData(folder.id),{pack:pack.collection});
  if(!item)throw Error('Arcana-Touched creation was cancelled.');
  return item;
 }finally{
  if(locked)await configurePremadePack(pack,{locked:true});
 }
}
