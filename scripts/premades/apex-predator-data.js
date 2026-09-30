import {ID} from '../core.js';
export const APEX_KEY='wayfinder-apex-predator';
export function apexData(folder){const data={
  "name":"Apex Predator","type":"feature","img":"icons/creatures/mammals/bat-giant-tattered-purple.webp",
  "system":{"description":"<p>Before you make an attack roll against your Focus, you can spend a Hope. On a successful attack, you remove a Fear from the GM's Fear pool.</p>","resource":null,"actions":{},"attribution":{"source":"Daggerheart SRD","page":null,"artist":""},"gmNotes":"","granter":null,"featureForm":"passive"},
  "effects":[]
};data.folder=folder;data.flags={[ID]:{premade:{key:APEX_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.lwH3E0Zyf4gbVOd0']}}};return data;}
export async function ensureApexPredator(){
 const pack=game.packs.get(`${ID}.subclass-features`);if(!pack)throw new Error('The Subclass Features compendium is missing.');
 const existing=(await pack.getDocuments()).find(i=>i.getFlag(ID,'premade')?.key===APEX_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Wayfinder');if(!folder)throw new Error('The Wayfinder compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await pack.configure({locked:false});const item=existing?await existing.update(apexData(folder.id)):await Item.create(apexData(folder.id),{pack:pack.collection});if(!item)throw new Error('Apex Predator creation was cancelled.');return item;}finally{if(locked)await pack.configure({locked:true});}
}
