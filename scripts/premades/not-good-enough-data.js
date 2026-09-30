import {ID} from '../core.js';

export const NOT_GOOD_ENOUGH_KEY='blade-not-good-enough';

export function notGoodEnoughData(folder){
  return {
    name:'Not Good Enough', type:'domainCard', folder,
    img:'systems/daggerheart/assets/icons/domains/domain-card/blade.png',
    system:{
      description:'<p>When you roll your damage dice, you can reroll any 1s or 2s.</p>',
      domain:'blade', recallCost:1, level:1, type:'ability',
      attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'After damage dice are displayed, select any dice showing 1 or 2 to reroll once for free. Includes dice discarded by Powerful or Massive and recalculates which results are kept. Replacement rolls are kept even if they show 1 or 2. Requires the card to be available in the loadout.',
      resource:null, actions:{}, inVault:false, vaultActive:false, loadoutIgnore:false, domainTouched:null
    },
    effects:[],
    flags:{[ID]:{premade:{key:NOT_GOOD_ENOUGH_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.xheQZOIYp0ERQhT9']}}}
  };
}

export async function ensureNotGoodEnough(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===NOT_GOOD_ENOUGH_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Blade');
  if(!folder)throw Error('The Blade compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await pack.configure({locked:false});
    const data=notGoodEnoughData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Not Good Enough creation was cancelled.');
    return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
