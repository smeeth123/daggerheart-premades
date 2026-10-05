import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const STRATEGIC_KEY='bone-strategic-approach',STRATEGIC_ACTION='jTC0GbsBpGmaQLi7';
export const STRATEGIC_ADV_ACTION='DhpStrategicAv01',STRATEGIC_STRESS_ACTION='DhpStrategicSt01',STRATEGIC_DAMAGE_ACTION='DhpStrategicDm01';
export const STRATEGIC_ADV_EFFECT='DhpStrategicAvFx',STRATEGIC_DAMAGE_EFFECT='DhpStrategicDmFx';
const img='icons/skills/targeting/crosshair-arrowhead-blue.webp';
const action=(id,name)=>({type:'effect',_id:id,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',
  cost:[{key:'resource',itemId:'5b1awkgTmMp3FVrm',value:1,scalable:false,step:null,consumeOnSuccess:false}],
  uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'self',amount:null},name,img,range:'',
  baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]});
const effect=(id,mode,name)=>({_id:id,name:`Strategic Approach — ${name}`,img,type:'base',disabled:true,transfer:false,
  system:{changes:[],duration:{type:'temporary',description:'Until your next completed attack.'},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
  duration:{value:null,units:'seconds',expiry:null,expired:false},description:`<p>${name} on your next attack. Activate only for the card’s first-approach condition.</p>`,
  tint:'#ffffff',statuses:[],sort:0,showIcon:1,folder:null,flags:{[ID]:{strategicApproach:mode}}});
export function strategicApproachData(folder){
  const advantage=action(STRATEGIC_ADV_ACTION,'Attack with Advantage');advantage.effects=[{_id:STRATEGIC_ADV_EFFECT,onSave:false}];
  const damage=action(STRATEGIC_DAMAGE_ACTION,'Add d8 Damage');damage.effects=[{_id:STRATEGIC_DAMAGE_EFFECT,onSave:false}];
  const stress=action(STRATEGIC_STRESS_ACTION,'Clear an Ally’s Stress');stress.type='healing';stress.target={type:'any',amount:1};
  stress.description='<p>Select an ally within Melee range of the adversary you are approaching. Clear 1 Stress.</p>';
  stress.damage={main:null,resources:{stress:{base:false,applyTo:'stress',resultBased:false,fullRestore:false,
    value:{multiplier:'flat',flatMultiplier:0,dice:'d6',bonus:1,custom:{enabled:false,formula:''}},valueAlt:null,itemId:null}}};
  stress.roll={type:null,trait:null,difficulty:null,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false};
  const choice=action(STRATEGIC_ACTION,'Spend Token');choice.type='grouped';choice.cost=[];choice.target={type:'any',amount:null};
  choice.description='<p>Use only the first time you move within Close range of an adversary and attack them. Choose one benefit; the selected action spends 1 token.</p>';
  choice.grouped={selectionType:'selected',groupedActions:[STRATEGIC_ADV_ACTION,STRATEGIC_STRESS_ACTION,STRATEGIC_DAMAGE_ACTION]};
  return {name:'Strategic Approach',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/bone.png',
    system:{description:'<p>After a long rest, place a number of tokens equal to your Knowledge on this card (minimum 1). The first time you move within Close range of an adversary and make an attack against them, you can spend one token to choose one of the following options:</p><ul><li class="vertical-card-list-found"><p>You make the attack with advantage.</p></li><li class="vertical-card-list-found"><p>You clear a Stress on an ally within Melee range of the adversary.</p></li><li class="vertical-card-list-found"><p>You add a <strong>d8</strong> to your damage roll.</p></li></ul><p>When you take a long rest, clear all unspent tokens.</p>',
      domain:'bone',recallCost:1,level:2,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},
      resource:{type:'simple',value:0,max:'max(@system.traits.knowledge.value, 1)',icon:'fa-solid fa-bullseye',recovery:'longRest',progression:'decreasing',diceStates:{},dieFaces:'d4'},
      inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      gmNotes:'Activate Spend Token before the qualifying attack and choose one benefit. The selected native child action pays exactly 1 token; canceling the chooser pays nothing. Native long-rest recovery replaces unspent tokens with current Knowledge (minimum 1). First approach, adversary choice and the ally’s Melee range from that adversary are player-controlled. Advantage automatically applies to the next completed attack and expires hit or miss. The damage marker binds +1d8 to that attack’s damage, including later native Roll Damage, and expires after the attack without leaking to other attacks. The damage dialog shows a selected Strategic Approach effect; dice, criticals and rerolls stay native. The ally option uses native targeted healing to clear exactly 1 Stress.',
      actions:{[STRATEGIC_ACTION]:choice,[STRATEGIC_ADV_ACTION]:advantage,[STRATEGIC_STRESS_ACTION]:stress,[STRATEGIC_DAMAGE_ACTION]:damage}},
    effects:[effect(STRATEGIC_ADV_EFFECT,'advantage','Advantage'),effect(STRATEGIC_DAMAGE_EFFECT,'damage','+1d8 Damage')],
    flags:{[ID]:{premade:{key:STRATEGIC_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.5b1awkgTmMp3FVrm']}}}};
}
export async function ensureStrategicApproach(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===STRATEGIC_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Bone');if(!folder)throw Error('The Bone compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});const data=strategicApproachData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Strategic Approach creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
