import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const VOICE_REASON_KEY='splendor-voice-of-reason',VOICE_REASON_EFFECT='i5dnpOxTtWV1J46k';
const nativeCard={
  "name": "Voice of Reason",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/splendor.png",
  "type": "domainCard",
  "system": {
    "description": "<p>You speak with an unmatched power and authority. You have advantage on action rolls to de-escalate violent situations or convince someone to follow your lead.</p><p>Additionally, you're emboldened in moments of duress. When all of your Stress slots are marked, you gain a +1 bonus to your Proficiency for damage rolls.</p>",
    "domain": "splendor",
    "recallCost": 1,
    "level": 3,
    "type": "ability",
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": [
    {
      "name": "Advantage",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.advantageSources",
            "type": "add",
            "value": "De-escalate violent situations.",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.advantageSources",
            "type": "add",
            "value": "Convince someone to follow your lead.",
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
        "conditionals": []
      },
      "_id": "qWDojebJXMPIP629",
      "img": "icons/skills/social/diplomacy-handshake.webp",
      "disabled": false,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>You have advantage on action rolls to de-escalate violent situations or convince someone to follow your lead.</p>",
      "tint": "#ffffff",
      "transfer": true,
      "statuses": [],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    },
    {
      "name": "Emboldened (activate manually)",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.proficiency",
            "type": "add",
            "value": "+1",
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
        "conditionals": []
      },
      "_id": "i5dnpOxTtWV1J46k",
      "img": "icons/skills/melee/unarmed-punch-fist-yellow-red.webp",
      "disabled": true,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>When all of your Stress slots are marked, you gain a +1 bonus to your Proficiency for damage rolls.</p>",
      "tint": "#ffffff",
      "transfer": true,
      "statuses": [],
      "sort": 0,
      "flags": {},
      "showIcon": 1,
      "folder": null
    }
  ]
};
export function voiceOfReasonData(folder){const data=structuredClone(nativeCard);data.folder=folder;const effect=data.effects.find(e=>e._id===VOICE_REASON_EFFECT);effect.name='Emboldened';effect.disabled=false;effect.showIcon=2;effect.system.conditionals=[{type:'dataCompare',key:'system.resources.stress.max',comparator:'greater',value:'0'},{type:'dataCompare',key:'system.resources.stress.value',comparator:'greaterEquals',value:'@system.resources.stress.max'}];data.system.gmNotes='Emboldened automatically applies while all Stress slots are marked, and stops applying when Stress falls below maximum. Native conditionals also suppress it when the card is unavailable in the Vault. Situational advantage remains native/manual.';data.flags={[ID]:{premade:{key:VOICE_REASON_KEY,version:'1.0.1',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.t3RRGH6mMYYJJCcF']}}};return data;}
export async function ensureVoiceOfReason(){const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===VOICE_REASON_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.1')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Splendor');if(!folder)throw Error('The Splendor compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=voiceOfReasonData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Voice of Reason creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}
