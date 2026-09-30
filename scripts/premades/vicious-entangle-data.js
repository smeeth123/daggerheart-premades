import {ID} from '../core.js';
export const ENTANGLE_KEY='sage-vicious-entangle',ENTANGLE_CAST='lrA95PnD2vOwwmgN',ENTANGLE_EXTRA='vh1IKRvsU4w57lBt';
export const ENTANGLE_CAST_EFFECT='Xh0wrgRUuYpwChBU',ENTANGLE_EXTRA_EFFECT='2xzOqTaPJQzGqFJv';
const cast='<p>Make a <strong>Spellcast Roll</strong> against a target within Far range. On a success, roots and vines reach out from the ground, dealing <strong>1d8+1</strong> physical damage and temporarily <em>Restraining</em> the target.</p>';
const extra='<p>Additionally on a success, you can <strong>spend a Hope</strong> to temporarily <em>Restrain</em> another adversary within Very Close range of your target.</p>';
function action(id,name,img,description,details){return {type:'effect',_id:id,systemPath:'actions',description,chatDisplay:true,actionType:'action',cost:[],
  uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},name,img,range:'',baseAction:false,
  originItem:{type:'itemCollection'},triggers:[],areas:[],...details};}
function restrained(id){return {name:'Restrained',img:'icons/magic/control/debuff-chains-shackle-movement-red.webp',transfer:false,_id:id,type:'base',
  system:{changes:[],duration:{type:'temporary',description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
  disabled:false,duration:{value:null,units:'seconds',expiry:null,expired:false},description:'',tint:'#ffffff',statuses:['restrained'],sort:0,flags:{},
  start:{time:0,combat:null,combatant:null,initiative:null,round:null,turn:null},showIcon:1,folder:null};}
export function viciousEntangleData(folder){return {
  name:'Vicious Entangle',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/sage.png',
  system:{description:cast+extra,domain:'sage',recallCost:1,level:1,type:'spell',
    actions:{
      [ENTANGLE_CAST]:action(ENTANGLE_CAST,'Cast','icons/magic/nature/vines-thorned-curled-glow-teal.webp',cast,{
        type:'attack',damage:{main:{resultBased:false,value:{custom:{enabled:false,formula:''},multiplier:'flat',flatMultiplier:1,dice:'d8',bonus:1},
          applyTo:'hitPoints',type:['physical'],base:false,valueAlt:null,includeBase:false,direct:false,fullRestore:false,itemId:null},resources:{}},
        effects:[{_id:ENTANGLE_CAST_EFFECT,onSave:false}],roll:{type:'spellcast',trait:null,difficulty:null,bonus:null,advState:'neutral',
          diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},save:{trait:null,difficulty:null,damageMod:'none'}}),
      [ENTANGLE_EXTRA]:action(ENTANGLE_EXTRA,'Restrain Another','icons/commodities/gems/gem-faceted-octagon-yellow.webp',extra,{
        cost:[{key:'hope',value:1,scalable:false,step:null,itemId:null,consumeOnSuccess:false}],effects:[{_id:ENTANGLE_EXTRA_EFFECT,onSave:false}]})
    },attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
    gmNotes:'All native actions, costs, damage and temporary Restrained effects are unchanged. After a completed successful Cast, an optional owner picker offers one other visible, living, unrestrained adversary within native Very Close of a successful original target. Spend 1 Hope to apply only the extra temporary Restrained effect: no extra attack roll, damage or change to the original attack targets. Earned cast Hope is available. Decline/cancel costs nothing. Requires the original target’s scene to be displayed by the active GM.'},
  effects:[restrained(ENTANGLE_CAST_EFFECT),restrained(ENTANGLE_EXTRA_EFFECT)],
  flags:{[ID]:{premade:{key:ENTANGLE_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.qvpvTnkAoRn9vYO4']}}}
};}
export async function ensureViciousEntangle(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===ENTANGLE_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Sage');if(!folder)throw Error('The Sage compendium folder is missing.');
  const locked=pack.locked;
  try{if(locked)await pack.configure({locked:false});const data=viciousEntangleData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Vicious Entangle creation was cancelled.');return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
