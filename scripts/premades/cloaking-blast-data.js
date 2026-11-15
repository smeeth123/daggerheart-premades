import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const CLOAKING_BLAST_KEY='arcana-cloaking-blast';
export const CLOAKING_BLAST_ACTION='A12J0jyQrOaQoLf7';

export const CLOAKING_BLAST_EFFECT='twCBqXytmRkMz0kV';

const nativeCard={
  "name": "Cloaking Blast",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/arcana.png",
  "type": "domainCard",
  "system": {
    "description": "<p>When you make a successful <strong>Spellcast Roll</strong> to cast a different spell, you can <strong>spend a Hope</strong> to become <em>Cloaked</em>. While <em>Cloaked</em>, you remain unseen if you are stationary when an adversary moves to where they would normally see you. When you move into or within an adversary's line of sight or make an attack, you are no longer <em>Cloaked</em>.</p>",
    "domain": "arcana",
    "recallCost": 2,
    "level": 7,
    "type": "spell",
    "actions": {
      "A12J0jyQrOaQoLf7": {
        "type": "effect",
        "_id": "A12J0jyQrOaQoLf7",
        "systemPath": "actions",
        "description": "",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "scalable": false,
            "key": "hope",
            "value": 1,
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
        "effects": [
          {
            "_id": "twCBqXytmRkMz0kV",
            "onSave": false
          }
        ],
        "target": {
          "type": "self",
          "amount": null
        },
        "name": "Become Cloaked",
        "img": "icons/magic/perception/shadow-stealth-eyes-purple.webp",
        "range": "self",
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
    "gmNotes": "After a successful Spellcast Roll for a different spell, offer to spend 1 Hope and become Cloaked. Sneak Attack uses the Cloaked state at the start of the next attack, which ends Cloaked whether the attack hits or misses. Remove Cloaked manually when movement exposes the character. Become Cloaked remains available for manually adjudicated casts.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "effects": [
    {
      "name": "Cloaked",
      "img": "icons/magic/perception/shadow-stealth-eyes-purple.webp",
      "transfer": false,
      "_id": "twCBqXytmRkMz0kV",
      "type": "base",
      "system": {
        "changes": [],
        "duration": {
          "type": "temporary",
          "description": "<p>When you move into or within an adversary's line of sight or make an attack, you are no longer Cloaked.</p>"
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
      "description": "<p>While <em>Cloaked</em>, you remain unseen if you are stationary when an adversary moves to where they would normally see you. When you move into or within an adversary's line of sight or make an attack, you are no longer <em>Cloaked</em>.</p>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {
        "daggerheart-premades": {
          "cloakingBlast": true
        }
      },
      "start": {
        "time": 0,
        "combat": null,
        "combatant": null,
        "initiative": null,
        "round": null,
        "turn": null
      },
      "showIcon": 1,
      "folder": null
    }
  ]
};

export function cloakingBlastData(folder){
 const data=structuredClone(nativeCard);
 data.folder=folder;
 data.flags={[ID]:{premade:{key:CLOAKING_BLAST_KEY,version:'1.0.0',category:'domain-cards',aliases:[],
  sourceUuids:['Compendium.daggerheart.domains.Item.Zhw7PtK8nMPlsOqD']}}};
 return data;
}

export async function ensureCloakingBlast(){
 const pack=game.packs.get(ID+'.domain-cards');
 if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===CLOAKING_BLAST_KEY);
 if(existing)return existing;
 const folder=pack.folders.find(folder=>!folder.folder&&folder.name==='Arcana');
 if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;
 try{
  if(locked)await configurePremadePack(pack,{locked:false});
  const item=await Item.create(cloakingBlastData(folder.id),{pack:pack.collection});
  if(!item)throw Error('Cloaking Blast creation was cancelled.');
  return item;
 }finally{
  if(locked)await configurePremadePack(pack,{locked:true});
 }
}
