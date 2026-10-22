import { ID } from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const HOLD_KEY='ranger-hold-them-off', HOLD_ACTION='yhVUna5biFAN0o2Y';
export function holdData(folder){const data={
  "name": "Hold Them Off",
  "type": "feature",
  "img": "icons/magic/defensive/barrier-shield-dome-deflect-teal.webp",
  "system": {
    "description": "<p><strong>Spend 3 Hope</strong> when you succeed on an attack with a weapon to use that same roll against two additional adversaries within range of the attack.</p>",
    "resource": null,
    "actions": {
      "yhVUna5biFAN0o2Y": {
        "type": "effect",
        "_id": "yhVUna5biFAN0o2Y",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 3,
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
        "name": "Spend Hope",
        "img": "icons/magic/defensive/barrier-shield-dome-deflect-teal.webp",
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
    "gmNotes": "After a successful weapon attack, offers a range-filtered picker for two additional adversaries. Spend 3 Hope to reuse the original attack roll against their Difficulties. Selected targets join the native damage workflow.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [],
  "flags": {}
};
data.folder=folder;data.flags={[ID]:{premade:{key:HOLD_KEY,version:'1.0.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.2Cyb9ZeuAesf5Sb3']}}};return data;}
export async function ensureHoldThemOff(){
 const pack=game.packs.get(ID+'.class-features');if(!pack)throw Error('The Class Features compendium is missing.');
 const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===HOLD_KEY);
 if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Ranger');if(!folder)throw Error('The Ranger compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=holdData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Hold Them Off creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
