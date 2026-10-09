import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const BOOST_KEY='bone-boost',BOOST_ACTION='EA3lGjFhJAX1xoT4',BOOST_EFFECT='DhpBoostReady001';
const img='icons/skills/movement/arrow-upward-yellow.webp';
export function boostData(folder){return {
 name:'Boost',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/bone.png',
 system:{description:'<p><strong>Mark a Stress</strong> to boost off a willing ally within Close range, fling yourself into the air, and perform an aerial attack against a target within Far range. You have advantage on the attack, add a<strong> d10</strong> to the damage roll, and end your move within Melee range of the target.</p>',domain:'bone',recallCost:1,level:4,type:'ability',resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,attribution:{source:'Daggerheart SRD',page:null,artist:''},
  gmNotes:'Activate Mark Stress before your aerial attack: native payment marks 1 Stress and applies Boost to yourself, not the willing ally. Movement, the willing ally within Close, aerial positioning, Far target and landing within Melee are manual. Boost grants automatic advantage on your next completed attack, canceling disadvantage normally, and adds one d10 to that attack’s native damage Effects section. The ready effect expires after the attack roll, hit or miss; its damage bonus stays on that attack’s chat card for automatic or later manual damage. Canceled/preview/reaction/nonattack rolls preserve readiness. No new attack, movement, range override or second payment.',
  actions:{[BOOST_ACTION]:{type:'effect',_id:BOOST_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[{scalable:false,key:'stress',value:1,step:null,consumeOnSuccess:false,itemId:null}],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[{_id:BOOST_EFFECT,onSave:false}],target:{type:'self',amount:1},name:'Mark Stress',img,range:'self',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}}},
 effects:[{name:'Boost',type:'base',_id:BOOST_EFFECT,img,transfer:false,disabled:true,system:{changes:[],duration:{type:'temporary',description:'Until your next completed attack roll.'},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},duration:{value:null,units:'seconds',expiry:null,expired:false},description:'<p>Advantage and +1d10 damage on your next aerial attack. Movement is manual.</p>',tint:'#ffffff',statuses:[],sort:0,showIcon:1,folder:null,flags:{[ID]:{boost:true}}}],
 flags:{[ID]:{premade:{key:BOOST_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.VKAHS6eWz28ukcDs']}}}
};}
export async function ensureBoost(){
 const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===BOOST_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Bone');if(!folder)throw Error('The Bone compendium folder is missing.');const locked=pack.locked;
 try{if(locked)await configurePremadePack(pack,{locked:false});const data=boostData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Boost creation was cancelled.');return item;}
 finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
