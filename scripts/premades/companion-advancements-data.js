import {ID} from '../core.js';
export const COMFORT_KEY='companion-creature-comfort',ARMORED_KEY='companion-armored',BONDED_KEY='companion-bonded',COMFORT_ACTION='dhpComfort000001';
const definitions=[
 [COMFORT_KEY,'Creature Comfort','icons/magic/life/heart-cross-purple-orange.webp','Once per rest, when you take time during a quiet moment to give your companion love and attention, you can gain a Hope or you can both clear a Stress.'],
 [ARMORED_KEY,'Armored','icons/equipment/shield/kite-wooden-oak-glow.webp','When your companion takes damage, you can mark one of your Armor Slots instead of marking one of their Stress.'],
 [BONDED_KEY,'Bonded','icons/magic/life/heart-red-blue.webp','When you mark your last Hit Point, your companion rushes to your side to comfort you. Roll a number of d6s equal to the unmarked Stress slots they have and mark them. If any roll a 6, your companion helps you up. Clear your last Hit Point and return to the scene.']
];
export function companionAdvancementData(key,folder){
 const [_,name,img,description]=definitions.find(d=>d[0]===key);
 const actions=key===COMFORT_KEY?{[COMFORT_ACTION]:{type:'effect',_id:COMFORT_ACTION,systemPath:'actions',name:'Comfort Companion',img,description:'Choose to gain 1 Hope or both clear 1 Stress.',chatDisplay:false,actionType:'action',cost:[],uses:{value:0,max:'1',recovery:'shortRest',consumeOnSuccess:false},effects:[],target:{type:'self'},range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}}:{};
 return {name,type:'feature',img,folder,system:{description:`<p>${description}</p>`,resource:null,actions,actorResources:[],featureForm:'passive',granter:null,attribution:{source:'Daggerheart SRD',page:null,artist:''},gmNotes:''},effects:[],flags:{[ID]:{premade:{key,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:[]}}}};
}
export async function ensureCompanionAdvancements(){
 const pack=game.packs.get(`${ID}.subclass-features`);if(!pack)throw new Error('The Subclass Features compendium is missing.');
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Beastbound');if(!folder)throw new Error('The Beastbound folder is missing.');
 const docs=await pack.getDocuments(),locked=pack.locked;
 try{
  if(locked)await pack.configure({locked:false});
  for(const [key]of definitions){const existing=docs.find(i=>i.getFlag(ID,'premade')?.key===key);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')continue;
   const data=companionAdvancementData(key,folder.id);if(existing)await existing.update(data);else await Item.create(data,{pack:pack.collection});
  }
 }finally{if(locked)await pack.configure({locked:true});}
}
