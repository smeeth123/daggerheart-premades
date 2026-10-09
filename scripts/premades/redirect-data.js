import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const REDIRECT_KEY='bone-redirect',REDIRECT_ACTION='DRluINMGyhCR84ok';
export function redirectData(folder){return {
 name:'Redirect',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/bone.png',
 system:{description:'<p>When an attack made against you from beyond Melee range fails, roll a number of <strong>d6s</strong> equal to your Proficiency. If any roll a 6, you can <strong>mark a Stress</strong> to redirect the attack to damage an adversary within Very Close range instead.</p>',domain:'bone',recallCost:1,level:4,type:'ability',resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,attribution:{source:'Daggerheart SRD',page:null,artist:''},
  gmNotes:'After a completed incoming attack misses you from beyond Melee, automatically roll Proficiency d6. On any 6, optionally mark 1 Stress and choose a living adversary within Very Close of you. The picker highlights exact tokens. A separate native damage card redirects the original attack’s damage without turning its miss against you into a hit. Existing rolled damage is reused; otherwise use the native damage roll and Deal Damage controls. Armor, resistance and damage reactions remain native. No new attack roll or attack costs. Requires an unambiguous attacker token on the current scene. Mark Stress on the sheet is a reminder, not a second payment.',
  actions:{[REDIRECT_ACTION]:{type:'effect',_id:REDIRECT_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[{scalable:false,key:'stress',value:1,step:null,consumeOnSuccess:false,itemId:null}],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name:'Mark Stress',img:'icons/skills/melee/sword-twirl-orange.webp',range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}}},effects:[],
 flags:{[ID]:{premade:{key:REDIRECT_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.faU0XkJCbar69PiN']}}}
};}
export async function ensureRedirect(){
 const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===REDIRECT_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Bone');if(!folder)throw Error('The Bone compendium folder is missing.');const locked=pack.locked;
 try{if(locked)await configurePremadePack(pack,{locked:false});const data=redirectData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Redirect creation was cancelled.');return item;}
 finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
