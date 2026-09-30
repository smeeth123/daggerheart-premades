import {ID} from '../core.js';
export const REASSURANCE_KEY='splendor-reassurance',REASSURANCE_ACTION='QZGSuYgLE6BMbFsD';
export function reassuranceData(folder){return {
  name:'Reassurance',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/splendor.png',
  system:{description:'<p>Once per rest, after an ally attempts an action roll but before the consequences take place, you can offer assistance or words of support. When you do, your ally can reroll their dice.</p>',
    domain:'splendor',recallCost:0,level:1,type:'ability',actions:{
      [REASSURANCE_ACTION]:{type:'effect',_id:REASSURANCE_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[],
        uses:{value:0,max:'1',recovery:'shortRest',consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name:'Reassure',
        img:'icons/sundries/gaming/dice-pair-white-green.webp',range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}
    },attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
    gmNotes:'Reassurance appears in the shared Roll Resolution window after another active Party character makes an action roll, before consequences. The holder offers the reroll; the rolling ally must consent. It rerolls all action dice, including Advantage/Disadvantage and extra dice, retaining native special dice classes and flat modifiers. No Hope/Stress cost or distance limit is added. Native once-per-rest use is spent only after consent; native short/long rest refresh restores it. Reassure on the sheet is a reminder, not a second payment. Each holder can assist once per resolution; different holders can each offer their available use.'},
  effects:[],flags:{[ID]:{premade:{key:REASSURANCE_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.iYNVTB7uAD1FTCZu']}}}
};}
export async function ensureReassurance(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===REASSURANCE_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Splendor');if(!folder)throw Error('The Splendor compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await pack.configure({locked:false});const data=reassuranceData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Reassurance creation was cancelled.');return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
