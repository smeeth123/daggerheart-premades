import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const PHANTOM_KEY='midnight-phantom-retreat',PHANTOM_ACTIVATE='SE2C9Andtlw3OQLL',PHANTOM_RETREAT='1AJRAbFtDx8Pm26q';
const nativeCard={
  "name": "Phantom Retreat",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/midnight.png",
  "type": "domainCard",
  "system": {
    "description": "<p><strong>Spend a Hope</strong> to activate Phantom Retreat where you're currently standing. <strong>Spend another Hope</strong> at any time before your next rest to disappear from where you are and reappear where you were standing when you activated Phantom Retreat. This spell ends after you reappear.</p>",
    "domain": "midnight",
    "recallCost": 2,
    "level": 5,
    "type": "spell",
    "actions": {
      "SE2C9Andtlw3OQLL": {
        "type": "effect",
        "_id": "SE2C9Andtlw3OQLL",
        "systemPath": "actions",
        "description": "<p>Spend a <strong>Hope</strong> to activate Phantom Retreat where you're currently standing.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
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
        "name": "Activate",
        "img": "icons/magic/air/air-smoke-casting.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "1AJRAbFtDx8Pm26q": {
        "type": "effect",
        "_id": "1AJRAbFtDx8Pm26q",
        "systemPath": "actions",
        "description": "<p><strong>Spend another Hope</strong> at any time before your next rest to disappear from where you are and reappear where you were standing when you activated Phantom Retreat. This spell ends after you reappear.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
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
        "name": "Retreat",
        "img": "icons/magic/control/silhouette-hold-beam-blue.webp",
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
    "gmNotes": "Activate uses the native 1 Hope cost and saves the selected/unambiguous caster token’s standing position, scene, level and elevation. A small unlocked map marker and visible active-effect reminder show the return point. Retreat uses the native second 1 Hope cost, teleports the selected caster token back, then clears the point. Linked characters can return between scenes; synthetic/unlinked actors require GM handling for cross-scene returns. Missing/unsafe tokens, scenes or levels and Retreat without a prepared point spend nothing. A completed rest or GM rest refresh clears saved points; opening/canceling/incomplete downtime does not. Scene/session refresh does not clear them. Re-activating successfully replaces the previous point; canceled activations preserve it. No extra dice, range limit or limited-use resource.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": []
};
export function phantomData(folder){return {...clone(nativeCard),folder,flags:{[ID]:{premade:{key:PHANTOM_KEY,version:'1.0.1',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.0vdpIn06ifF3xxqZ']}}}};}
export async function ensurePhantom(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const old=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===PHANTOM_KEY);if(old?.getFlag(ID,'premade')?.version==='1.0.1')return old;const folder=pack.folders.find(f=>!f.folder&&f.name==='Midnight');if(!folder)throw Error('The Midnight compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=phantomData(folder.id),item=old?await old.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Phantom Retreat creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

