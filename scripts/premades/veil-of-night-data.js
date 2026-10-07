import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const VEIL_KEY='midnight-veil-of-night',VEIL_CAST='br6UQ0toK4ZYpP2s';
const nativeCard={
  "name": "Veil of Night",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/midnight.png",
  "type": "domainCard",
  "system": {
    "description": "<p>Make a <strong>Spellcast Roll</strong><strong> (13)</strong>. On a success, you can create a temporary curtain of darkness between two points within Far range. Only you can see through this darkness. You're considered <em>Hidden</em> to adversaries on the other side of the veil, and you have advantage on attacks you make through the darkness. The veil remains until you cast another spell.</p>",
    "domain": "midnight",
    "recallCost": 1,
    "level": 3,
    "type": "spell",
    "actions": {
      "br6UQ0toK4ZYpP2s": {
        "type": "attack",
        "_id": "br6UQ0toK4ZYpP2s",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll</strong> (13). On a success, you can create a temporary curtain of darkness between two points within Far range. Only you can see through this darkness. You're considered <em>Hidden</em> to adversaries on the other side of the veil, and you have advantage on attacks you make through the darkness. The veil remains until you cast another spell.</p>",
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
          "type": "self",
          "amount": null
        },
        "effects": [
          {
            "_id": "eSfBBZ7IP8qirLu7",
            "onSave": false
          }
        ],
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
        "img": "icons/magic/unholy/barrier-shield-glowing-pink.webp",
        "range": "self",
        "areas": [
          {
            "name": "Veil of Night",
            "type": "placed",
            "shape": "line",
            "size": "far",
            "effects": [],
            "hasHole": false
          }
        ],
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": []
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
  "effects": []
};
export function veilData(folder){const data=structuredClone(nativeCard);data.folder=folder;data.system.actions[VEIL_CAST].areas=[];data.system.actions[VEIL_CAST].effects=[];data.system.gmNotes='After a successful native Cast, click two endpoints, each within native Far range of the caster. A fixed thin Region represents the curtain; it does not block vision or movement and applies no global Hidden status. Attacks by the caster crossing the finite curtain automatically gain advantage. Adversaries attacking that caster through the curtain have disadvantage. Token centers and the actual Region polygon determine crossing; extending the line beyond its endpoints does not count. One qualifying target grants the source on a shared multitarget roll. The veil ends after the caster completes another spell (even a failed cast); canceled/preview casts, weapon attacks and damage-only rolls do not end it. It persists across rests/scene refreshes. Recasting ends the old veil even if the new cast fails or placement is canceled. GM deletion ends it manually.';data.flags={[ID]:{premade:{key:VEIL_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.gV4L5ZZmfPrEbIDh']}}};return data;}
export async function ensureVeilOfNight(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===VEIL_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Midnight');if(!folder)throw Error('The Midnight compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=veilData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Veil of Night creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
