import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const FEROCITY_KEY='bone-ferocity',FEROCITY_ACTION='2X4CqDTpEQjfSE8r',FEROCITY_EFFECT='DhpFerocityEv001';
const img='icons/skills/melee/maneuver-sword-katana-yellow.webp';
export function ferocityData(folder){
  return {name:'Ferocity',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/bone.png',
    system:{description:'<p>When you cause an adversary to mark 1 or more Hit Points, you can <strong>spend 2 Hope</strong> to increase your Evasion by the number of Hit Points they marked. This bonus lasts until after the next attack made against you.</p>',
      domain:'bone',recallCost:2,level:2,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},
      resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      gmNotes:'After native damage actually marks an adversary’s HP, offer its source Ferocity holder Spend 2 Hope / Decline. The visible effect adds the number of HP actually marked, accounting for reduction and remaining HP, to Evasion. It expires after the next completed incoming attack, hit or miss, after defensive resolution. Canceled/unrolled attacks do not consume it. Native damage rolls and resource damage retain source provenance for later chat-card application. Unattributed manual HP edits remain manual. The Spend Hope action is a reminder while Medkitted; do not pay twice.',
      actions:{[FEROCITY_ACTION]:{type:'effect',_id:FEROCITY_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',
        cost:[{scalable:false,key:'hope',value:2,itemId:null,step:null,consumeOnSuccess:false}],
        uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name:'Spend Hope',img,
        range:'',triggers:[],baseAction:false,originItem:{type:'itemCollection'},areas:[]}}},
    effects:[{name:'Ferocity',img,transfer:false,_id:FEROCITY_EFFECT,type:'base',disabled:true,
      system:{changes:[{key:'system.evasion',type:'add',value:1,priority:null,phase:'initial'}],duration:{type:'temporary',description:'Until after the next attack made against you.'},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
      duration:{value:null,units:'seconds',expiry:null,expired:false},description:'<p>Bonus Evasion until after the next attack made against you.</p>',tint:'#ffffff',statuses:[],sort:0,showIcon:1,folder:null,flags:{[ID]:{ferocity:true}}}],
    flags:{[ID]:{premade:{key:FEROCITY_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.jSQsSP61CX4MhSN7']}}}};
}
export async function ensureFerocity(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===FEROCITY_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Bone');if(!folder)throw Error('The Bone compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=ferocityData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Ferocity creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
