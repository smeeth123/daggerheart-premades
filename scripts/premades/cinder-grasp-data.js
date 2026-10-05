import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';

export const CINDER_GRASP_KEY='arcana-cinder-grasp';
export const CINDER_GRASP_CAST='9qebkHgxdWVFhIqd';
export const CINDER_GRASP_DAMAGE='z9vUmnLXfskowwsc';
export const CINDER_GRASP_EFFECT='HNKkaWi507whJuYN';
const cast='<p>Make a <strong>Spellcast Roll</strong> against a target within Melee range. On a success, the target instantly bursts into flames, takes <strong>1d20+3</strong> magic damage, and is temporarily lit <em>On Fire</em>.</p>';
const burning='<p>When a creature acts while <em>On Fire</em>, they must take an extra <strong>2d6</strong> magic damage if they are still <em>On Fire</em> at the end of their action.</p>';
function action(id,type,name,img,description,dice,number,bonus){
  return {type,_id:id,systemPath:'actions',description,chatDisplay:true,actionType:'action',cost:[],
    uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},
    damage:{main:{value:{custom:{enabled:false,formula:''},multiplier:'flat',flatMultiplier:number,dice,bonus},
      applyTo:'hitPoints',type:['magical'],base:false,resultBased:false,valueAlt:null,includeBase:false,direct:false,fullRestore:false,itemId:null},resources:{}},
    target:{type:'any',amount:null},effects:[],name,img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]};
}
export function cinderGraspData(folder){
  const attack=action(CINDER_GRASP_CAST,'attack','Cast','icons/magic/fire/flame-burning-fist-strike.webp',cast,'d20',1,3);
  attack.effects=[{_id:CINDER_GRASP_EFFECT,onSave:false}];
  attack.roll={type:'spellcast',trait:null,difficulty:null,bonus:null,advState:'neutral',
    diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false};
  attack.save={trait:null,difficulty:null,damageMod:'none'};
  return {name:'Cinder Grasp',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/arcana.png',
    system:{description:cast+burning,domain:'arcana',recallCost:1,level:2,type:'spell',resource:null,
      inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'The native cast, damage, targeting and temporary On Fire effect remain unchanged. A creature already bearing this marked effect takes one automatic 2d6 magic-damage packet after a completed action if the captured effect is still active. Reactions, canceled/preview rolls, grouped choosers and damage-only bookkeeping do not trigger it. Removing/disabling the effect extinguishes the automated damage. Direct action trait/Spellcast rolls also count. On Fire: Damage remains a manual fallback for narrative actions performed outside Foundry; do not use it again for an already automated action.',
      actions:{[CINDER_GRASP_CAST]:attack,[CINDER_GRASP_DAMAGE]:action(CINDER_GRASP_DAMAGE,'damage','On Fire: Damage','icons/magic/fire/flame-burning-earth-orange.webp',burning,'d6',2,null)}},
    effects:[{name:'On Fire',img:'icons/magic/fire/flame-burning-creature-skeleton.webp',transfer:false,_id:CINDER_GRASP_EFFECT,type:'base',
      system:{changes:[],duration:{type:'temporary',description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
      disabled:false,duration:{value:null,units:'seconds',expiry:null,expired:false},description:burning,tint:'#ffffff',
      statuses:['burning'],sort:0,flags:{[ID]:{cinderGrasp:true}},showIcon:1,folder:null}],
    flags:{[ID]:{premade:{key:CINDER_GRASP_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.5EP2Lgf7ojfrc0Is']}}}};
}
export async function ensureCinderGrasp(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===CINDER_GRASP_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Arcana');
  if(!folder)throw Error('The Arcana compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=cinderGraspData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Cinder Grasp creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
