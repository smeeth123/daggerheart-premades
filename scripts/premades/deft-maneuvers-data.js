import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';

export const DEFT_MANEUVERS_KEY='bone-deft-maneuvers';
export const DEFT_MANEUVERS_ACTION='AKexQGjS5HwPTo19';
export const DEFT_MANEUVERS_EFFECT='gEDGcbsgWY2D2nOo';
const img='icons/skills/movement/arrow-upward-yellow.webp';

export function deftManeuversData(folder){
  return {
    name:'Deft Maneuvers',type:'domainCard',folder,
    img:'systems/daggerheart/assets/icons/domains/domain-card/bone.png',
    system:{
      description:'<p>Once per rest,<strong> mark a Stress</strong> to sprint anywhere within Far range without making an Agility Roll to get there.</p><p>If you end this movement within Melee range of an adversary and immediately make an attack against them, gain a +1 bonus to the attack roll.</p>',
      domain:'bone',recallCost:0,level:1,type:'ability',
      attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'Activate Mark Stress manually. The native action marks 1 Stress, consumes the once-per-rest use, and applies the +1 attack effect to yourself regardless of selected targets. Movement and qualification remain manual. The effect expires after your next completed attack roll, hit or miss; canceled rolls, nonattack rolls, and damage rolls do not consume it.',
      resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      actions:{[DEFT_MANEUVERS_ACTION]:{
        type:'effect',_id:DEFT_MANEUVERS_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',
        cost:[{scalable:false,key:'stress',value:1,step:null,consumeOnSuccess:false,itemId:null}],
        uses:{value:null,max:'1',recovery:'shortRest',consumeOnSuccess:false},
        effects:[{_id:DEFT_MANEUVERS_EFFECT,onSave:false}],target:{type:'self',amount:null},
        name:'Mark Stress',img,range:'self',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]
      }}
    },
    effects:[{
      name:'Deft Maneuvers',img,transfer:false,_id:DEFT_MANEUVERS_EFFECT,type:'base',disabled:true,
      system:{
        changes:[{key:'system.bonuses.roll.bonus',type:'add',value:1,priority:null,phase:'initial'}],
        duration:{type:'temporary',description:'Until your next completed attack roll.'},
        rangeDependence:null,stacking:null,targetDispositions:[],
        conditionals:[{type:'actionType',actionTypes:['attack'],traits:[]}]
      },
      duration:{value:null,units:'seconds',expiry:null,expired:false},
      description:'<p>If you end this movement within Melee range of an adversary and immediately make an attack against them, gain a +1 bonus to the attack roll. Expires after your next completed attack roll.</p>',
      tint:'#ffffff',statuses:[],sort:0,showIcon:1,folder:null,flags:{[ID]:{deftManeuvers:true}}
    }],
    flags:{[ID]:{premade:{key:DEFT_MANEUVERS_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.dc4rAXlv95srZUct']}}}
  };
}

export async function ensureDeftManeuvers(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===DEFT_MANEUVERS_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Bone');
  if(!folder)throw Error('The Bone compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=deftManeuversData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Deft Maneuvers creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
