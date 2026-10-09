import {ID,clone} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const SPEECH_KEY='grace-soothing-speech';
const nativeCard={
  "name": "Soothing Speech",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/grace.png",
  "type": "domainCard",
  "system": {
    "description": "<p>During a short rest, when you take the time to comfort another character while using the Tend to Wounds downtime move on them, clear an additional Hit Point on that character. When you do, you also clear 2 Hit Points.</p>",
    "domain": "grace",
    "recallCost": 1,
    "level": 4,
    "type": "ability",
    "actions": {},
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "During a short rest, choose Tend to Wounds and another character on the native downtime chat card. Confirm that you comfort them to add 1 HP to the native healing roll and clear 2 HP on yourself. Self-targeted moves, long rests and un-Medkitted/vaulted/disabled cards stay native. Each selected downtime move can grant this benefit once. Recovery uses native takeHealing and respects HP caps/prevention; canceled or uncertain workflows need manual review, not replay. No independent Heal Another/Heal Self buttons or extra downtime activity.",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": []
};
export function speechData(folder){const data=clone(nativeCard);data.folder=folder;data.flags={[ID]:{premade:{key:SPEECH_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.QED2PDYePOSTbLtC']}}};return data;}
export async function ensureSpeech(){const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===SPEECH_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;const folder=pack.folders.find(f=>!f.folder&&f.name==='Grace');if(!folder)throw Error('The Grace compendium folder is missing.');const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=speechData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Soothing Speech creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}}

