import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';

export const UMBRAL_VEIL_KEY='dread-umbral-veil';
export const UMBRAL_VEIL_ACTIVATE='I2Ifm2A6C1fkcQJS',UMBRAL_VEIL_SPEND='oeuSyzRQ7Qtg6JaT';
const nativeId='SZS0WYAdFBPuzOrh';
const spendDescription='<p>After an attack roll is made against you, you can spend any number of tokens to give the result a -1 penalty per token spent.</p>';
function action(id,name,img,extra){return {type:'effect',_id:id,systemPath:'actions',baseAction:false,description:'',chatDisplay:true,
  originItem:{type:'itemCollection'},actionType:'action',triggers:[],areas:[],cost:[],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},
  effects:[],target:{type:'self',amount:null},name,range:'self',img,...extra};}

export function umbralVeilData(folder){return {
  type:'domainCard',name:'Umbral Veil',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/dread.png',
  system:{domain:'dread',level:1,attribution:{source:'Daggerheart SRD',page:null},
    description:"<p>Once per rest, you can <strong>mark a Stress</strong> to encase yourself in shadowy energy. When you do, place a number of tokens on this card equal to the number of Fear in the GM's pool. After an attack roll is made against you, you can spend any number of tokens to give the result a -1 penalty per token spent.</p><p>At the end of the scene, clear all unspent tokens.</p>",
    gmNotes:'Activate manually with Mark Stress: the native once-per-rest use and Stress payment are preserved; after completing activation, add tokens equal to current GM Fear directly, without a separate healing roll/application. Tokens clear on native End Scene refresh. Roll Resolution offers spending after an incoming attack rolls, before damage applies. Choose a bounded token amount; cancel spends nothing. Known misses and critical hits are not offered. The penalty is attack-specific to the holder (represented by an increased hit threshold, not a permanent Evasion bonus), preserving other targets and later rerolls. The native Spend Tokens sheet action is a reminder, not a second untracked cost.',
    resource:{type:'simple',value:0,max:'',recovery:'scene',progression:'increasing',dieFaces:'d4',icon:'fa-solid fa-skull',diceStates:{}},
    actions:{
      [UMBRAL_VEIL_ACTIVATE]:action(UMBRAL_VEIL_ACTIVATE,'Mark Stress','icons/magic/unholy/barrier-shield-glowing-pink.webp',{
        cost:[{scalable:false,key:'stress',value:1,itemId:null,step:null,consumeOnSuccess:false}],
        uses:{value:null,max:'1',recovery:'shortRest',consumeOnSuccess:false}}),
      [UMBRAL_VEIL_SPEND]:action(UMBRAL_VEIL_SPEND,'Spend Tokens','icons/magic/defensive/barrier-shield-dome-pink.webp',{
        description:spendDescription,cost:[{scalable:true,key:'resource',value:1,step:1,itemId:nativeId,consumeOnSuccess:false}]})
    },recallCost:1,type:'spell',inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null},effects:[],
  flags:{[ID]:{premade:{key:UMBRAL_VEIL_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:[`Compendium.daggerheart.domains.Item.${nativeId}`]}}}
};}

export async function ensureUmbralVeil(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===UMBRAL_VEIL_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Dread');if(!folder)throw Error('The Dread compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});const data=umbralVeilData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Umbral Veil creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
