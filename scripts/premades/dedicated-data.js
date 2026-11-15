import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';

export const DEDICATED_KEY='orderborne-dedicated';
export const DEDICATED_ACTION='ZBVqSlsDUKf8uGrI';
const img='icons/environment/people/cleric-orange.webp';

export function dedicatedData(folder){
 return {
  name:'Dedicated',type:'feature',img,folder,effects:[],
  system:{
   description:"<p>Record three sayings or values your upbringing instilled in you. Once per rest, when you describe how you're embodying one of these principles through your current action, you can roll a d20 as your Hope Die.</p>",
   gmNotes:'Use Dedicated to prepare a d20 Hope Die for your next completed action roll. Use it again to cancel. Reactions and canceled rolls preserve preparation. A rest clears preparation and restores the use.',
   resource:null,granter:null,featureForm:'passive',actorResources:[],
   actions:{[DEDICATED_ACTION]:{
    _id:DEDICATED_ACTION,type:'effect',systemPath:'actions',description:'',chatDisplay:true,actionType:'action',
    cost:[],uses:{value:null,max:'1',recovery:'shortRest',consumeOnSuccess:false},effects:[],
    target:{type:'self',amount:1},name:'Use',img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]
   }}
  },
  flags:{[ID]:{premade:{key:DEDICATED_KEY,version:'1.0.0',category:'community-features',aliases:[],
   sourceUuids:['Compendium.daggerheart.communities.Item.7aXWdH3gzaYREK0X']}}}
 };
}

export async function ensureDedicated(){
 const pack=game.packs.get(`${ID}.community-features`);
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===DEDICATED_KEY);
 if(existing)return existing;
 const folder=pack.folders.find(folder=>!folder.folder&&folder.name==='Orderborne');
 if(!folder)throw Error('The Orderborne compendium folder is missing.');
 const locked=pack.locked;
 try{
  if(locked)await configurePremadePack(pack,{locked:false});
  const item=await Item.create(dedicatedData(folder.id),{pack:pack.collection});
  if(!item)throw Error('Dedicated creation was cancelled.');
  return item;
 }finally{
  if(locked)await configurePremadePack(pack,{locked:true});
 }
}
