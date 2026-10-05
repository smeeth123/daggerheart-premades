import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const BOOK_OF_SITIL_KEY='codex-book-of-sitil';
export const PARALLELA_ACTION='wBQkw3P4Esj6kOx2';
export const PARALLELA_EFFECT='klUaU5KeQCu7KCBI';
const nativeBook={
  "name": "Book of Sitil",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/codex.png",
  "type": "domainCard",
  "system": {
    "description": "<p><em><strong>Adjust Appearance:</strong></em> You magically shift your appearance and clothing to avoid recognition.</p><p><em><strong>Parallela:</strong></em><strong> Spend 2 Hope</strong> to cast this spell on yourself or an ally within Close range. The next time the target makes an attack, they can hit an additional target within range that their attack roll would succeed against. You can only hold this spell on one creature at a time.</p><p><em><strong>Illusion:</strong></em> Make a <strong>Spellcast Roll (14)</strong>. On a success, create a temporary visual illusion no larger than you within Close range that lasts for as long as you look at it. It holds up to scrutiny until an observer is within Melee range.</p>",
    "domain": "codex",
    "recallCost": 2,
    "level": 2,
    "type": "grimoire",
    "actions": {
      "cc1ahwawL16OEu2r": {
        "type": "effect",
        "_id": "cc1ahwawL16OEu2r",
        "systemPath": "actions",
        "description": "<p>You magically shift your appearance and clothing to avoid recognition.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "wnrHSvvB6pydTVcC",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Adjust Appearance",
        "img": "icons/magic/defensive/shield-barrier-blades-teal.webp",
        "range": "self",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "wBQkw3P4Esj6kOx2": {
        "type": "effect",
        "_id": "wBQkw3P4Esj6kOx2",
        "systemPath": "actions",
        "description": "<p><strong>Spend 2 Hope</strong> to cast this spell on yourself or an ally within Close range. The next time the target makes an attack, they can hit an additional target within range that their attack roll would succeed against. You can only hold this spell on one creature at a time.</p>",
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
        "effects": [
          {
            "_id": "klUaU5KeQCu7KCBI",
            "onSave": false
          }
        ],
        "target": {
          "type": "friendly",
          "amount": 1
        },
        "name": "Parallela",
        "img": "icons/magic/defensive/illusion-evasion-echo-purple.webp",
        "range": "close",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "rsyxORrTH5oU2DkV": {
        "type": "attack",
        "_id": "rsyxORrTH5oU2DkV",
        "systemPath": "actions",
        "description": "<p>Make a <strong>Spellcast Roll (14)</strong>. On a success, create a temporary visual illusion no larger than you within Close range that lasts for as long as you look at it. It holds up to scrutiny until an observer is within Melee range.</p>",
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
          "difficulty": 14,
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
        "name": "Illusion",
        "img": "icons/magic/control/silhouette-hold-change-green.webp",
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
      "name": "Parallela",
      "img": "icons/magic/defensive/illusion-evasion-echo-purple.webp",
      "transfer": false,
      "_id": "klUaU5KeQCu7KCBI",
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
      "description": "<p>The next time you make an attack, you can hit an additional target within range that your attack roll would succeed against.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Adjust Appearance",
      "img": "icons/magic/defensive/shield-barrier-blades-teal.webp",
      "transfer": false,
      "_id": "wnrHSvvB6pydTVcC",
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
      "description": "<p>You magically shift your appearance and clothing to avoid recognition.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};

export function bookOfSitilData(folder){
  const data=structuredClone(nativeBook);data.folder=folder;
  data.flags={[ID]:{premade:{key:BOOK_OF_SITIL_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.eq8VNqYMRHhF9xw9']}}};
  data.effects.find(effect=>effect._id===PARALLELA_EFFECT).flags={[ID]:{parallela:true}};
  data.system.gmNotes='Native casting, 2 Hope cost, targeting and other spells are unchanged. Parallela offers one additional creature within the next attack\'s range that the final roll would hit, after roll decisions and dice animation, before damage. The same native attack/damage/effects include that target. The held spell expires after that completed attack even when declined or no extra target qualifies; canceled rolls preserve it. Recasting replaces this caster\'s previous held spell. Movement and narrative spell use stay manual.';
  return data;
}
export async function ensureBookOfSitil(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===BOOK_OF_SITIL_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Codex');
  if(!folder)throw Error('The Codex compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=bookOfSitilData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Book of Sitil creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}

