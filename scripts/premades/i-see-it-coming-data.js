import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';

export const I_SEE_IT_COMING_KEY='bone-i-see-it-coming';
export const I_SEE_IT_COMING_ACTION='lVyTDd44pGJgF3w7';

export function iSeeItComingData(folder){
  return {
    name:'I See It Coming',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/bone.png',
    system:{
      description:'<p>When you\'re targeted by an attack made from beyond Melee range, you can <strong>mark a Stress</strong> to roll a <strong>d4</strong> and gain a bonus to your Evasion equal to the result against the attack.</p>',
      domain:'bone',recallCost:1,level:1,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'Offered before an incoming attack rolls, after confirming its roll dialog. Requires the attacker to be beyond native Melee distance from your targeted token. Mark 1 Stress through the shared reactive-Stress workflow and roll 1d4; the result increases only your Evasion against that attack. The bonus survives attack rerolls and does not change permanent Evasion. No active effect or separate sheet roll is needed.',
      actions:{},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null
    },effects:[],
    flags:{[ID]:{premade:{key:I_SEE_IT_COMING_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.Kp6RejHGimnuoBom']}}}
  };
}

export async function ensureISeeItComing(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===I_SEE_IT_COMING_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Bone');
  if(!folder)throw Error('The Bone compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=iSeeItComingData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('I See It Coming creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
