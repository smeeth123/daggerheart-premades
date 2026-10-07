import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const SCRAMBLE_KEY='blade-scramble',SCRAMBLE_ACTION='lcEmS1XXO5wH54cQ';
export function scrambleData(folder){return {name:'Scramble',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/blade.png',
 system:{description:'<p>Once per rest, when a creature within Melee range would deal damage to you, you can avoid the attack and safely move out of Melee range of the enemy.</p>',
  domain:'blade',recallCost:1,level:3,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
  gmNotes:'Before incoming damage reduction, offers Avoid / Decline when the damage source is a creature within native Melee range. Avoid spends the native once-per-rest use and prevents this damage packet, including its resource damage. Move out of Melee manually. Decline preserves the use and continues normal defenses. Native rests refresh the use. Source-less damage and ambiguous/off-scene tokens need manual adjudication.',
  actions:{[SCRAMBLE_ACTION]:{type:'effect',_id:SCRAMBLE_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[],
   uses:{value:null,max:'1',recovery:'shortRest',consumeOnSuccess:false},effects:[],target:{type:'self',amount:null},name:'Avoid',img:'icons/skills/movement/feet-winged-boots-brown.webp',range:'melee',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}},},
 effects:[],flags:{[ID]:{premade:{key:SCRAMBLE_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.5bBU9jWHOuOY12lR']}}}};}
export async function ensureScramble(){
 const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===SCRAMBLE_KEY);
 if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Blade');if(!folder)throw Error('The Blade compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=scrambleData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Scramble creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
