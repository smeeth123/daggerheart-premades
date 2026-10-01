import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const FORCEFUL_PUSH_KEY='valor-forceful-push',FORCEFUL_PUSH_ATTACK='ForcePushAtk0001';
export const FORCEFUL_PUSH_EFFECT='95oX6QYPySdyyh2v';
const description='<p>Make an attack with your primary weapon against a target within Melee range. On a success, you deal damage and knock them back to Close range. On a success with Hope, add a <strong>d6</strong> to your damage roll.</p><p>Additionally, you can <strong>spend a Hope</strong> to make them temporarily <em>Vulnerable</em>.</p>';
function action(id,name,details={}){return {type:'effect',_id:id,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[],
  uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name,
  img:'icons/skills/melee/shield-block-bash-yellow.webp',range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[],...details};}
export function forcefulPushData(folder){return {
  name:'Forceful Push',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/valor.png',
  system:{description,domain:'valor',recallCost:0,level:1,type:'ability',
    actions:{
      [FORCEFUL_PUSH_ATTACK]:action(FORCEFUL_PUSH_ATTACK,'Forceful Push',{description,target:{type:'any',amount:1},range:'melee'})
    },resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
    attribution:{source:'Daggerheart SRD',page:null,artist:''},
    gmNotes:'Use Forceful Push to attack one target within native Melee range with your equipped primary weapon. Its real attack and damage workflow are preserved, including weapon features and manual Roll Damage. Successful Hope rolls (including critical successes) add one selected, labeled d6 in the damage dialog. After a hit, an optional owner prompt spends 1 Hope to apply the native temporary Vulnerable effect to that target. Movement to Close is manual. Hope payment is handled only by the post-hit prompt, with no separate Spend Hope action.'},
  effects:[{name:'Forcefully Pushed',img:'icons/skills/melee/shield-block-bash-yellow.webp',transfer:false,_id:FORCEFUL_PUSH_EFFECT,type:'base',
    system:{changes:[],duration:{type:'temporary',description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
    disabled:false,duration:{value:null,units:'seconds',expiry:null,expired:false},description:'',tint:'#ffffff',statuses:['vulnerable'],sort:0,flags:{},
    start:{time:0,combat:null,combatant:null,initiative:null,round:null,turn:null},showIcon:1,folder:null}],
  flags:{[ID]:{premade:{key:FORCEFUL_PUSH_KEY,version:'1.0.1',category:'domain-cards',aliases:[],
    sourceUuids:['Compendium.daggerheart.domains.Item.z8FFPhDh2SdFkFfS']}}}
};}
export async function ensureForcefulPush(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===FORCEFUL_PUSH_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.1')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Valor');if(!folder)throw Error('The Valor compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});const data=forcefulPushData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Forceful Push creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
