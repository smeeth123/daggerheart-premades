import {ID} from '../core.js';

export const BOOK_OF_ILLIAT_KEY='codex-book-of-illiat';
export const SLUMBER_ACTION='gd4zjBV1UvXhgAid';
export const SLUMBER_EFFECT='gfZTHSgwYSDKsePW';
const TELEPATHY_EFFECT='zAEaETYSOE2fmcyB';
const sleep='icons/magic/control/sleep-bubble-purple.webp';
const mind='icons/magic/perception/third-eye-blue-red.webp';
const slumber="<p><em><strong>Slumber:</strong></em> Make a <strong>Spellcast Roll</strong> against a target within Very Close range. On a success, they're <em>Asleep</em> until they take damage or the GM spends a <strong>Fear</strong> on their turn to clear this condition.</p>";
const barrage='<p>Once per rest, <strong>spend any number of Hope</strong> and shoot magical projectiles that strike a target of your choice within Close range. Roll a number of <strong>d6s</strong> equal to the Hope spent and deal that much magic damage to the target.</p>';
const telepathy='<p><strong>Spend a Hope</strong> to open a line of mental communication with one target you can see. This connection lasts until your next rest or you cast Telepathy again.</p>';
function action(id,name,img,description,extra){
  return {type:'effect',_id:id,systemPath:'actions',description,chatDisplay:true,actionType:'action',cost:[],
    uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:1},
    name,img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[],...extra};
}
function effect(id,name,img,description,duration){
  return {name,img,transfer:false,_id:id,type:'base',disabled:false,
    system:{changes:[],duration,rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
    duration:{value:null,units:'seconds',expiry:null,expired:false},description,tint:'#ffffff',statuses:[],sort:0,
    flags:id===SLUMBER_EFFECT?{[ID]:{slumber:true}}:{},showIcon:1,folder:null};
}

export function bookOfIlliatData(folder){
  return {name:'Book of Illiat',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/codex.png',
    system:{description:`${slumber}<p><em><strong>Arcane Barrage:</strong></em> ${barrage.slice(3,-4)}</p><p><em><strong>Telepathy:</strong></em> ${telepathy.slice(3,-4)}</p>`,
      domain:'codex',recallCost:2,level:1,type:'grimoire',resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'Native spells, rolls, costs and targeting are preserved. Slumber expires after completed damage leaves positive HP damage on its recipient (or positive damage Stress on a companion). Canceled, redirected or fully prevented damage does not expire it. GM Fear spending/removal, Arcane Barrage and Telepathy stay native/manual; Telepathy recast expiration is not automated by this premade.',
      actions:{
        [SLUMBER_ACTION]:action(SLUMBER_ACTION,'Slumber',sleep,slumber,{type:'attack',damage:{main:null,resources:{}},effects:[{_id:SLUMBER_EFFECT,onSave:false}],
          roll:{type:'spellcast',trait:null,difficulty:null,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},
          save:{trait:null,difficulty:null,damageMod:'none'},range:'veryClose'}),
        tOHoeUFjdPw2TGrw:action('tOHoeUFjdPw2TGrw','Arcane Barrage','icons/magic/light/projectiles-trio-pink.webp',barrage,{type:'damage',
          cost:[{scalable:true,key:'hope',value:1,step:1,itemId:null,consumeOnSuccess:false}],uses:{value:null,max:'1',recovery:'shortRest',consumeOnSuccess:false},
          damage:{main:{value:{custom:{enabled:false,formula:''},multiplier:'scale',dice:'d6',bonus:null,flatMultiplier:1},applyTo:'hitPoints',type:[],base:false,resultBased:false,valueAlt:null,includeBase:false,direct:false,fullRestore:false,itemId:null},resources:{}},range:'close'}),
        Ya1vttriJRLbuyhk:action('Ya1vttriJRLbuyhk','Telepathy',mind,telepathy,{cost:[{key:'hope',value:1,scalable:false,step:null,itemId:null,consumeOnSuccess:false}],effects:[{_id:TELEPATHY_EFFECT,onSave:false}]})
      }},
    effects:[
      effect(TELEPATHY_EFFECT,'Telepathy',mind,'<p>Lasts until your next rest or the caster casts Telepathy again.</p>',{type:'shortRest',description:''}),
      effect(SLUMBER_EFFECT,'Slumber',sleep,'<p>Asleep until they take damage or the GM spends a Fear on their turn to clear this condition.</p>',{type:'temporary',description:'<p>Until they take damage or the GM spends a Fear on their turn to clear this condition.</p>'})
    ],
    flags:{[ID]:{premade:{key:BOOK_OF_ILLIAT_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.df4iRqQzRntrF6Qw']}}}
  };
}

export async function ensureBookOfIlliat(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===BOOK_OF_ILLIAT_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Codex');
  if(!folder)throw Error('The Codex compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await pack.configure({locked:false});
    const data=bookOfIlliatData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Book of Illiat creation was cancelled.');
    return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
