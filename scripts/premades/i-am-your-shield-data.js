import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const SHIELD_KEY='valor-i-am-your-shield';
export function iAmYourShieldData(folder){return {
  name:'I Am Your Shield',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/valor.png',
  system:{description:'<p>When an ally within Very Close range would take damage, you can <strong>mark a Stress</strong> to stand in the way and make yourself the target of the attack instead. When you take damage from this attack, you can mark any number of Armor Slots.</p>',
    domain:'valor',recallCost:1,level:1,type:'ability',actions:{},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
    attribution:{source:'Daggerheart SRD',page:null,artist:''},
    gmNotes:'Offered automatically before attack damage reaches a visible ally within native Very Close. The owner can mark 1 Stress through the shared reactive-Stress payment and take the attack damage instead. The protector uses their own thresholds, resistance and reduction features. Their native damage-reduction dialog allows any available Armor Slots for this attack only, with no extra Stress for exceeding the ordinary Armor limit. Decline/cancel is free; movement stays manual. Requires an active GM displaying the target scene. No separate Mark Stress action or persistent/global Armor bonus.'},
  effects:[],flags:{[ID]:{premade:{key:SHIELD_KEY,version:'1.0.0',category:'domain-cards',aliases:[],
    sourceUuids:['Compendium.daggerheart.domains.Item.KOf6LLpMRNwjezDx']}}}
};}
export async function ensureIAmYourShield(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===SHIELD_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Valor');if(!folder)throw Error('The Valor compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});const data=iAmYourShieldData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('I Am Your Shield creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
