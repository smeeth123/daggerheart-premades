import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const FLIGHT_KEY='arcana-flight',FLIGHT_CAST='sAE4ZDLyU9CmNzES',FLIGHT_SPEND='2wzlrOPefdowBtRr',FLIGHT_EFFECT='gd8crfrvMGWXLWGP';
const nativeId='54GUjNuBEy7xdzMz',img='icons/creatures/birds/corvid-flying-wings-purple.webp';
const description='<p>Make a <strong>Spellcast Roll (15)</strong>. On a success, place a number of tokens equal to your Agility on this card (minimum 1). When you make an action roll while flying, spend a token from this card. After the action that spends the last token is resolved, you descend to the ground directly below you.</p>';
const tokenDescription='<p>When you make an action roll while flying, spend a token from this card. After the action that spends the last token is resolved, you descend to the ground directly below you.</p>';
const action=(id,name,extra)=>({type:'effect',_id:id,systemPath:'actions',description:'',chatDisplay:true,actionType:'action',cost:[],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name,img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[],...extra});
export function flightData(folder){return {
 name:'Flight',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/arcana.png',
 system:{description,domain:'arcana',recallCost:1,level:3,type:'spell',resource:{type:'simple',value:0,max:'',icon:'',recovery:null,progression:'increasing',diceStates:{},dieFaces:'d4'},
  attribution:{source:'Daggerheart SRD',page:null,artist:''},inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
  gmNotes:'Successful Cast automatically sets tokens to current Agility (minimum 1) and applies Flying to the caster. Completed action rolls spend one token after the whole workflow resolves; the final action retains Flying through damage and effects. Reactions, damage-only rolls, no-roll actions, canceled rolls and the successful activation do not spend tokens. Failed recasts spend an old token if already flying; successful recasts replace the old pool/effect without spending the new pool. Spend Token is a manual fallback, not an additional cost on automated rolls. Setting tokens to zero clears only this card’s Flying effect. Descent/movement remains manual.',
  actions:{
   [FLIGHT_CAST]:action(FLIGHT_CAST,'Cast',{type:'attack',description:'<p>Make a <strong>Spellcast Roll</strong> (15). On a success, place a number of tokens equal to your Agility on this card (minimum 1).</p>',target:{type:'self',amount:null},
    damage:{main:null,resources:{}},roll:{type:'spellcast',trait:null,difficulty:15,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},save:{trait:null,difficulty:null,damageMod:'none'}}),
   [FLIGHT_SPEND]:action(FLIGHT_SPEND,'Spend Token',{description:tokenDescription,img:'icons/commodities/gems/gem-faceted-diamond-blue.webp',cost:[{key:'resource',itemId:nativeId,value:1,scalable:false,step:null,consumeOnSuccess:false}]})
  }},
 effects:[{name:'Flying',img,transfer:false,_id:FLIGHT_EFFECT,type:'base',system:{changes:[],duration:{description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},disabled:true,
  duration:{value:null,units:'seconds',expiry:null,expired:false},description:'<p>You can fly. When you make an action roll while flying, spend a token from this card. After the action that spends the last token is resolved, you descend to the ground directly below you.</p>',tint:'#ffffff',statuses:['fly'],sort:0,flags:{[ID]:{flightTemplate:true}},start:null,showIcon:1,folder:null}],
 flags:{[ID]:{premade:{key:FLIGHT_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:[`Compendium.daggerheart.domains.Item.${nativeId}`]}}}
};}
export async function ensureFlight(){
 const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===FLIGHT_KEY);
 if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Arcana');if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=flightData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Flight creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
