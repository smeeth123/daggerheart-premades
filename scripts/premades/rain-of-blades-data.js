import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const RAIN_OF_BLADES_KEY='midnight-rain-of-blades',RAIN_OF_BLADES_ACTION='WTnjKQs2uI1TuF9r';
const cast='<p><strong>Spend a Hope</strong> to make a <strong>Spellcast Roll</strong> and conjure throwing blades that strike out at all targets within Very Close range. Targets you succeed against take <strong>d8+2</strong> magic damage using your Proficiency.</p>';
export function rainOfBladesData(folder){return {
  name:'Rain of Blades',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/midnight.png',
  system:{description:`${cast}<p>If a target you hit is <em>Vulnerable</em>, they take an extra <strong>1d8</strong> damage.</p>`,domain:'midnight',recallCost:1,level:1,type:'spell',
    actions:{[RAIN_OF_BLADES_ACTION]:{type:'attack',_id:RAIN_OF_BLADES_ACTION,systemPath:'actions',description:cast,chatDisplay:true,actionType:'action',
      cost:[{key:'hope',value:1,scalable:false,step:null,itemId:null,consumeOnSuccess:false}],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},
      damage:{main:{resultBased:false,value:{custom:{enabled:false,formula:''},multiplier:'prof',dice:'d8',bonus:2,flatMultiplier:1},applyTo:'hitPoints',type:['magical'],
        base:false,valueAlt:null,includeBase:false,direct:false,fullRestore:false,itemId:null},resources:{}},target:{type:'any',amount:null},effects:[],
      roll:{type:'spellcast',trait:null,difficulty:null,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},
      save:{trait:null,difficulty:null,damageMod:'none'},name:'Cast',img:'icons/skills/melee/spear-tips-three-green.webp',range:'veryClose',
      areas:[{name:'Rain of Blades',type:'placed',shape:'emanation',size:'veryClose',effects:[],hasHole:false}],baseAction:false,originItem:{type:'itemCollection'},triggers:[]}},
    attribution:{source:'Daggerheart SRD',page:null,artist:''},gmNotes:'Native cast, Hope cost, area, targeting and base damage are unchanged. When a damage roll includes Vulnerable targets, its labeled extra d8 is rolled with the native damage dice and remains eligible for damage rerolls. Only Vulnerable recipients receive that extra damage; other recipients receive base damage. Recipient-specific damage is adjusted before defenses, preserves native multipliers, and is not adjusted again on redirection. Use fresh cast/damage cards after Medkit.',
    resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null},effects:[],
  flags:{[ID]:{premade:{key:RAIN_OF_BLADES_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.Ucenef6JpjQxwXni']}}}
};}
export async function ensureRainOfBlades(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===RAIN_OF_BLADES_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Midnight');if(!folder)throw Error('The Midnight compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});const data=rainOfBladesData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Rain of Blades creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
