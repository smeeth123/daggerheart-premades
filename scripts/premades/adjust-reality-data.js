import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const ADJUST_REALITY_KEY='arcana-adjust-reality';
export const ADJUST_REALITY_ACTION='3Aiqds9jVXdlWmfm';

const nativeCard={
  "name": "Adjust Reality",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
  "type": "domainCard",
  "system": {
    "description": "<p>After you or a willing ally make any roll, you can <strong>spend 5 Hope</strong> to change the numerical result of that roll to a result of your choice instead. The result must be plausible within the range of the dice.</p>",
    "domain": "arcana",
    "recallCost": 1,
    "level": 10,
    "type": "spell",
    "actions": {
      "3Aiqds9jVXdlWmfm": {
        "type": "effect",
        "_id": "3Aiqds9jVXdlWmfm",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 5,
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
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Spend Hope",
        "img": "icons/magic/fire/flame-burning-hand-purple.webp",
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
    "gmNotes": "Choose a different plausible total before a supported roll resolves. A willing ally must approve the change before you spend 5 Hope. Hope and Fear dice and critical status stay as rolled. Use Spend Hope for rolls outside the automated workflow or formulas the module cannot verify.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": []
};

export function adjustRealityData(folder){
 const data=structuredClone(nativeCard);
 data.folder=folder;
 data.flags={[ID]:{premade:{key:ADJUST_REALITY_KEY,version:'1.0.0',category:'domain-cards',aliases:[],
  sourceUuids:['Compendium.daggerheart.domains.Item.Zp2S2EnLS5Iv3XuT']}}};
 return data;
}

export async function ensureAdjustReality(){
 const pack=game.packs.get(ID+'.domain-cards');
 if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===ADJUST_REALITY_KEY);
 if(existing)return existing;
 const folder=pack.folders.find(folder=>!folder.folder&&folder.name==='Arcana');
 if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;
 try{
  if(locked)await configurePremadePack(pack,{locked:false});
  const item=await Item.create(adjustRealityData(folder.id),{pack:pack.collection});
  if(!item)throw Error('Adjust Reality creation was cancelled.');
  return item;
 }finally{
  if(locked)await configurePremadePack(pack,{locked:true});
 }
}
