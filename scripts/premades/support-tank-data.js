import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const SUPPORT_KEY='valor-support-tank',SUPPORT_ACTION='YEzqOIIV4HqzCKx4';
const nativeCard={
  "name": "Support Tank",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/valor.png",
  "type": "domainCard",
  "system": {
    "description": "<p>When an ally within Close range fails a roll, you can <strong>spend 2 Hope</strong> to allow them to reroll either their Hope or Fear Die.</p>",
    "domain": "valor",
    "recallCost": 2,
    "level": 4,
    "type": "ability",
    "actions": {
      "YEzqOIIV4HqzCKx4": {
        "type": "effect",
        "_id": "YEzqOIIV4HqzCKx4",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 2,
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
          "type": "friendly",
          "amount": 1
        },
        "name": "Spend Hope",
        "img": "icons/magic/holy/barrier-shield-winged-blue.webp",
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
    "gmNotes": "Support Tank is offered in Roll Resolution when another friendly character within native Close fails an action or reaction Duality roll. The holder offers 2 Hope, then the rolling ally chooses Hope Die, Fear Die or Keep this roll. Pay only after consent and current eligibility/range rechecks. Unknown Difficulty allows an explicit failed-roll declaration; known successes and criticals are excluded. Each holder can assist once per resolution. Ordinary Hope/Fear consequences remain native (reactions have neither). Sheet Spend Hope is a reminder, not a second payment.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": []
};
export function supportData(folder){return {...clone(nativeCard),folder,flags:{[ID]:{premade:{key:SUPPORT_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.stId5syX7YpP2JGz']}}}};}
export async function ensureSupport(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===SUPPORT_KEY);if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;const folder=pack.folders.find(f=>!f.folder&&f.name==='Valor');if(!folder)throw Error('The Valor compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const d=supportData(folder.id),item=old?await old.update(d,{diff:false,recursive:false}):await Item.create(d,{pack:pack.collection});if(!item)throw Error('Support Tank creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
