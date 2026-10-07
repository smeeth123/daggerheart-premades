import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const VF_KEY='blade-versatile-fighter',VF_ACTION='XAaygVE635axvBX7';
export function versatileFighterData(folder){return {name:'Versatile Fighter',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/blade.png',
 system:{description:'<p>You can use a different character trait for an equipped weapon, rather than the trait the weapon calls for.</p><p>When you deal damage, you can <strong>mark a Stress</strong> to use the maximum result of one of your damage dice instead of rolling it.</p>',
 domain:'blade',recallCost:1,level:3,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
 gmNotes:'Entering Loadout prompts for each equipped weapon’s trait; newly equipped weapons prompt individually. Choices affect prepared weapon traits only while this card is available; native weapon statistics and Versatile modes are never overwritten. Before damage is rolled, optionally choose one die to maximize. Mark 1 Stress after its native evaluation succeeds, before damage rerolls or application. Healing/resource-only rolls do not qualify. The selected die uses its maximum instead of random/manual fulfillment; other dice and native keep/drop/critical math remain unchanged.',
 actions:{[VF_ACTION]:{type:'effect',_id:VF_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[{scalable:false,key:'stress',value:1,step:null,consumeOnSuccess:false,itemId:null}],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name:'Mark a Stress',img:'icons/magic/control/silhouette-aura-energy.webp',range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}}},
 effects:[],flags:{[ID]:{premade:{key:VF_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.wQ53ImDswEHv5SGQ']}}}};}
export async function ensureVersatileFighter(){
 const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===VF_KEY);if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Blade');if(!folder)throw Error('The Blade compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=versatileFighterData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Versatile Fighter creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
