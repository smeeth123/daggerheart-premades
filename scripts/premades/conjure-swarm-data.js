import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const SWARM_KEY='sage-conjure-swarm',BEETLES_ACTION='qygTUSNldYNbP7vN',BEETLES_EFFECT='dImnF8ZT2rVybiIP',FLIES_ACTION='nugW0yPOG08pqBAT';
const beetles='<p><em><strong>Tekaira Armored Beetles:</strong></em> <strong>Mark a Stress</strong> to conjure armored beetles that encircle you. When you next take damage, reduce the severity by one threshold.</p>';
const flies='<p><em><strong>Fire Flies:</strong></em> Make a <strong>Spellcast Roll</strong> against all adversaries within Close range. <strong>Spend a Hope</strong> to deal <strong>2d8+3</strong> magic damage to targets you succeeded against.</p>';
function action(id,type,name,img,description,cost,target,range){
  return {type,_id:id,systemPath:'actions',description,chatDisplay:true,actionType:'action',cost,
    uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:target,amount:null},name,img,range,
    baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]};
}
const cost=(key,consumeOnSuccess=false)=>[{key,value:1,scalable:false,step:null,itemId:null,consumeOnSuccess}];
export function conjureSwarmData(folder){
  const armor=action(BEETLES_ACTION,'effect',"Tekaira's Armored Beetles: Stress",'icons/creatures/invertebrates/wasp-swarm-attack.webp',beetles,cost('stress'),'self','self');
  armor.effects=[{_id:BEETLES_EFFECT,onSave:false}];
  const fire=action(FLIES_ACTION,'attack','Fire Flies: Cast','icons/creatures/invertebrates/wasp-swarm-movement.webp',flies,cost('hope',true),'any','close');
  fire.damage={main:{resultBased:false,value:{custom:{enabled:false,formula:''},multiplier:'flat',flatMultiplier:2,dice:'d8',bonus:3},applyTo:'hitPoints',type:['magical'],base:false,valueAlt:null,includeBase:false,direct:false,fullRestore:false,itemId:null},resources:{}};
  fire.roll={type:'spellcast',trait:null,difficulty:null,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false};
  fire.save={trait:null,difficulty:null,damageMod:'none'};
  fire.areas=[{name:'Conjure Swarm',type:'placed',shape:'emanation',size:'close',effects:[],hasHole:false}];
  return {name:'Conjure Swarm',img:'systems/daggerheart/assets/icons/domains/domain-card/sage.png',type:'domainCard',folder,
    system:{description:'<p><em><strong>Tekaira Armored Beetles:</strong></em> <strong>Mark a Stress</strong> to conjure armored beetles that encircle you. When you next take damage, reduce the severity by one threshold. You can <strong>spend a Hope</strong> to keep the beetles conjured after taking damage.</p>'+flies,
      domain:'sage',recallCost:1,level:2,type:'spell',actions:{[BEETLES_ACTION]:armor,[FLIES_ACTION]:fire},attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,
      inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      gmNotes:'Armored Beetles uses the native self-targeted Stress cost and physical/magic severity-reduction effect. After completed incoming damage, including Minor reduced to None, the owner can spend 1 Hope to keep the captured beetles; otherwise they expire. Canceled, immune/zero, redirected and resource-only damage preserve them. The native damage-reduction preview is unchanged. Recasting replaces older beetles without stacking, and copies gained during pending damage survive. The redundant manual Keep Beetles action is replaced by the automatic post-damage decision. Fire Flies remains entirely native; no swarm token, region, rest expiry or custom damage roll is added.'},
    effects:[{name:'Tekaira Armored Beetles',img:'icons/magic/defensive/shield-barrier-flaming-diamond-acid.webp',transfer:false,_id:BEETLES_EFFECT,type:'base',
      system:{changes:['magical','physical'].map(type=>({key:`system.rules.damageReduction.reduceSeverity.${type}`,value:1,priority:null,type:'add',phase:'initial'})),duration:{description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
      disabled:false,duration:{value:null,units:'seconds',expiry:null,expired:false},description:'Reduce the next incoming damage by one threshold. Afterward, spend 1 Hope to keep these beetles or let them dissipate.',tint:'#ffffff',statuses:[],sort:0,flags:{[ID]:{conjureBeetles:true}},start:null,showIcon:1,folder:null}],
    flags:{[ID]:{premade:{key:SWARM_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.rZPH0BY8Sznc9sFG']}}}};
}
export async function ensureConjureSwarm(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===SWARM_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});const data=conjureSwarmData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Conjure Swarm creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
