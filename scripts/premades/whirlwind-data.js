import {ID} from '../core.js';

export const WHIRLWIND_KEY='blade-whirlwind';
export const WHIRLWIND_ACTION='g9X0wRuCtAYzF576';

export function whirlwindData(folder){
  return {
    name:'Whirlwind',type:'domainCard',folder,
    img:'systems/daggerheart/assets/icons/domains/domain-card/blade.png',
    system:{
      description:'<p>When you make a successful attack against a target within Very Close range, you can <strong>spend a Hope</strong> to use the attack against all other targets within Very Close range. All additional adversaries you succeed against with this ability take half damage.</p>',
      domain:'blade',recallCost:0,level:1,type:'ability',
      attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'After a successful attack against a target within Very Close, the owner can spend 1 Hope to add the other visible, living adversaries within Very Close to the same attack. Compare the final attack result against each adversary; additional hits take half the final damage, rounded up, before resistance and damage reduction. Original targets keep normal damage. Requires the card in the loadout. No new attack or damage roll and no template placement.',
      resource:null,actions:{},inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null
    },effects:[],
    flags:{[ID]:{premade:{key:WHIRLWIND_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.anO0arioUy7I5zBg']}}}
  };
}

export async function ensureWhirlwind(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===WHIRLWIND_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Blade');
  if(!folder)throw Error('The Blade compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await pack.configure({locked:false});
    const data=whirlwindData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Whirlwind creation was cancelled.');
    return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
