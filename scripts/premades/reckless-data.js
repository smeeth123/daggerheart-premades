import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';

export const RECKLESS_KEY='blade-reckless';
export const RECKLESS_ACTION='1vOYZjiUbRBmLcVr';
export const RECKLESS_EFFECT='DhpRecklessAdv01';
const img='icons/magic/control/silhouette-aura-energy.webp';
export function recklessData(folder){
  return {name:'Reckless',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/blade.png',
    system:{description:'<p><strong>Mark a Stress</strong> to gain advantage on an attack.</p>',domain:'blade',recallCost:1,level:2,type:'ability',
      attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      gmNotes:'Activate Mark a Stress manually. The native action pays 1 Stress and applies Reckless to yourself. Its visible effect automatically supplies advantage on your next completed attack roll, hit or miss, then expires. Advantage does not stack and cancels disadvantage normally. Canceling a roll preserves the effect. Trait, nonattack Spellcast, reaction and damage rolls do not consume it.',
      actions:{[RECKLESS_ACTION]:{type:'effect',_id:RECKLESS_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',
        cost:[{scalable:false,key:'stress',value:1,step:null,consumeOnSuccess:false,itemId:null}],
        uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[{_id:RECKLESS_EFFECT,onSave:false}],target:{type:'self',amount:null},
        name:'Mark a Stress',img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}}},
    effects:[{name:'Reckless',img,transfer:false,_id:RECKLESS_EFFECT,type:'base',disabled:true,
      system:{changes:[],duration:{type:'temporary',description:'Until your next completed attack roll.'},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
      duration:{value:null,units:'seconds',expiry:null,expired:false},description:'<p>Advantage on your next attack. Expires after the attack roll, hit or miss.</p>',
      tint:'#ffffff',statuses:[],sort:0,showIcon:1,folder:null,flags:{[ID]:{reckless:true}}}],
    flags:{[ID]:{premade:{key:RECKLESS_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.2ooUo2yoilGifY81']}}}};
}
export async function ensureReckless(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===RECKLESS_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Blade');
  if(!folder)throw Error('The Blade compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=recklessData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Reckless creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
