import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const NATURES_TONGUE_KEY='sage-natures-tongue',NATURES_TONGUE_SPEAK='qQEeyIGs0wKjW3a1',NATURES_TONGUE_BONUS='IIJC4HGdilVv3YMo',NATURES_TONGUE_EFFECT='0JYDk5CQ66bHGQO0';
const speak="<p>You can speak the language of the natural world. When you want to speak to the plants and animals around you, make an <strong>Instinct Roll (12)</strong>. On a success, they'll give you the information they know. On a roll with Fear, their knowledge might be limited or come at a cost.</p>";
const bonus='<p>Additionally, before you make a Spellcast Roll while within a natural environment, you can <strong>spend a Hope</strong> to gain a +2 bonus to the roll.</p>';
function action(id,name,img,description,extra){return {type:'effect',_id:id,systemPath:'actions',description,chatDisplay:true,actionType:'action',cost:[],
  uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name,img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[],...extra};}
export function naturesTongueData(folder){return {
  name:"Nature's Tongue",type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/sage.png',
  system:{description:speak+bonus,domain:'sage',recallCost:0,level:1,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},
    gmNotes:'Native actions, Hope cost, targeting and the +2 Spellcast conditional are unchanged. Only the placed bonus effect gains automation: it expires after the recipient’s next completed native roll (action, reaction, damage or healing), after roll decisions resolve. Canceling or unevaluated configuration does not consume it. Only effects present when the roll started are removed; newly activated and unrelated effects remain. Natural-environment qualification stays manual.',
    actions:{
      [NATURES_TONGUE_SPEAK]:action(NATURES_TONGUE_SPEAK,'Speak with Nature','icons/creatures/birds/corvid-call-sound-blue.webp',speak,{
        type:'attack',damage:{main:null,resources:{}},roll:{type:'trait',trait:'instinct',difficulty:12,bonus:null,advState:'neutral',
          diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},save:{trait:null,difficulty:null,damageMod:'none'}}),
      [NATURES_TONGUE_BONUS]:action(NATURES_TONGUE_BONUS,'Gain Bonus','icons/magic/nature/beam-hand-leaves-green.webp',bonus,{
        cost:[{key:'hope',value:1,scalable:false,step:null,itemId:null,consumeOnSuccess:false}],effects:[{_id:NATURES_TONGUE_EFFECT,onSave:false}]})
    },resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null},
  effects:[{name:'Bonus to Spellcast',img:'icons/magic/nature/beam-hand-leaves-green.webp',transfer:false,_id:NATURES_TONGUE_EFFECT,type:'base',
    system:{changes:[{key:'system.bonuses.roll.bonus',type:'add',value:'2',priority:null,phase:'initial'}],duration:{description:''},rangeDependence:null,stacking:null,targetDispositions:[],
      conditionals:[{type:'actionType',actionTypes:['spellcast'],traits:[]}]},disabled:false,duration:{value:null,units:'seconds',expiry:null,expired:false},description:'',tint:'#ffffff',statuses:[],sort:0,
    flags:{[ID]:{naturesTongue:true}},start:null,showIcon:1,folder:null}],
  flags:{[ID]:{premade:{key:NATURES_TONGUE_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.atWLorlCOxcrq8WB']}}}
};}
export async function ensureNaturesTongue(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===NATURES_TONGUE_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});const data=naturesTongueData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error("Nature's Tongue creation was cancelled.");return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
