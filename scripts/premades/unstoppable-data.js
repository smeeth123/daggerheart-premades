import { ID } from '../core.js';
import {modernDamageEffects} from '../effect-compat.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const UNSTOPPABLE_KEY='guardian-unstoppable';
export function unstoppableData(folder){const data={
  "name": "Unstoppable",
  "type": "feature",
  "img": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
  "system": {
    "description": "<p>Once per long rest, you can become Unstoppable. You gain an Unstoppable Die. At level 1, your Unstoppable Die is a d4. Place it on your character sheet in the space provided, starting with the 1 value facing up. After you make a damage roll that deals 1 or more Hit Points to a target, increase the Unstoppable Die value by one. When the die's value would exceed its maximum value or when the scene ends, remove the die and drop out of Unstoppable. At level 5, your Unstoppable Die increases to a d6. While Unstoppable, you gain the following benefits:</p><ul><li><p>You reduce the severity of physical damage by one threshold (Severe to Major, Major to Minor, Minor to None).</p></li><li><p>You add the current value of the Unstoppable Die to your damage roll.</p></li><li><p>You can't be Restrained or Vulnerable.</p></li></ul><blockquote><p>Tip: If your Unstoppable Die is a d4 and the 4 is currently facing up, you remove the die the next time you would increase it. However, if your Unstoppable Die has increased to a d6 and the 4 is currently facing up, you'll turn it to 5 the next time you would increase it. In this case, you'll remove the die after you would need to increase it higher than 6.</p></blockquote>",
    "resource": {
      "type": "die",
      "value": 0,
      "max": "",
      "icon": "",
      "recovery": null,
      "progression": "increasing",
      "diceStates": {},
      "dieFaces": "d4"
    },
    "actions": {
      "KZiZ8m8uqH5iG96d": {
        "type": "effect",
        "_id": "KZiZ8m8uqH5iG96d",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "xzQtFSuDS48kUdAZ",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Become Unstoppable",
        "img": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
        "range": "",
        "baseAction": false,
        "triggers": [],
        "areas": []
      }
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "Starts the Unstoppable Die at 1 when applied. After a damage roll causes at least 1 HP to be marked, advances once per roll. Exceeding the current die size ends the effect and resets the die to 0. Scene refresh also ends the effect and resets the die.",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": [
    {
      "name": "Unstoppable",
      "img": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
      "transfer": false,
      "_id": "xzQtFSuDS48kUdAZ",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.bonuses.damage.physical.bonus",
            "type": "add",
            "value": "ORIGIN.@item.resource.value",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.bonuses.damage.magical.bonus",
            "type": "add",
            "value": "ORIGIN.@item.resource.value",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.rules.damageReduction.reduceSeverity.physical",
            "type": "add",
            "value": 1,
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.rules.conditionImmunities.vulnerable",
            "type": "override",
            "value": 1,
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.rules.conditionImmunities.restrained",
            "type": "override",
            "value": 1,
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": "",
          "type": "scene"
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
          "unstoppable": true
        }
      },
      "start": null,
      "showIcon": 1
    }
  ],
  "flags": {}
};
modernDamageEffects(data);data.folder=folder;data.flags={[ID]:{premade:{key:UNSTOPPABLE_KEY,version:'1.0.1',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.PnD2UCgzIlwX6cY3']}}};return data;}
export async function ensureUnstoppable(){
 const pack=game.packs.get(ID+'.class-features');if(!pack)throw Error('The Class Features compendium is missing.');
 const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===UNSTOPPABLE_KEY);
 if(old?.getFlag(ID,'premade')?.version==='1.0.1')return old;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Guardian');if(!folder)throw Error('The Guardian compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=unstoppableData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Unstoppable creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
