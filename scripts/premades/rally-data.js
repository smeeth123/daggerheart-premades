import { ID } from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const RALLY_KEY = 'bard-rally';
export function rallyData(folder) {
  const data = {
  "name": "Rally",
  "type": "feature",
  "img": "icons/tools/instruments/drum-hand-tan.webp",
  "system": {
    "description": "<p>Once per session, describe how you rally the party and give yourself and each of your allies a Rally Die. At level 1, your Rally Die is a d6. A PC can spend their Rally Die to roll it, adding the result to their action roll, reaction roll, damage roll, or to clear a number of Stress equal to the result. At the end of each session, clear all unspent Rally Dice. At level 5, your Rally Die increases to a d8.</p>",
    "resource": null,
    "actions": {
      "vI4Fph3y9ygsya9e": {
        "type": "effect",
        "_id": "vI4Fph3y9ygsya9e",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": false,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "session",
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "FrSJH9vzDHkFGYQL",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Rally your allies!",
        "img": "icons/tools/instruments/drum-hand-tan.webp",
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
    "gmNotes": "Applies Rally to the active party regardless of targets. The bard’s level determines the die. Spending the die on damage or to clear Stress removes its effect and temporary feature; unspent dice expire on session refresh.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Rally",
      "img": "icons/tools/instruments/drum-hand-tan.webp",
      "transfer": false,
      "_id": "FrSJH9vzDHkFGYQL",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.bonuses.rally",
            "type": "add",
            "value": "6 + min((floor(@system.levelData.level.current / 5)*2), 2)",
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": "",
          "type": "session"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
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
      "flags": {
        "daggerheart-premades": {
          "rally": true
        }
      },
      "start": null,
      "showIcon": 1
    }
  ],
  "flags": {}
};
  data.folder = folder;
  data.flags = { [ID]: { premade: { key: RALLY_KEY, version: '1.0.0', category: 'class-features', aliases: [], sourceUuids: ['Compendium.daggerheart.classes.Item.PydiMnNCKpd44SGS'] } } };
  return data;
}
export async function ensureRally(){
 const pack=game.packs.get(ID+'.class-features');if(!pack)throw Error('The Class Features compendium is missing.');
 const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===RALLY_KEY);
 if(old?.getFlag(ID,'premade')?.version==='1.0.0')return old;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Bard');if(!folder)throw Error('The Bard compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=rallyData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Rally creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
