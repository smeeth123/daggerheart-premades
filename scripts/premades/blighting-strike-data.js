import {ID} from '../core.js';

export const BLIGHTING_KEY='dread-blighting-strike';
export const BLIGHTING_ACTION='bwqmvRSWdnkxaHLl';
export const BLIGHTING_EFFECT='5Sk45YMLZWn0kRla';
const img='icons/magic/lightning/bolt-strike-beam-pink.webp';
const value=dice=>({multiplier:'prof',flatMultiplier:1,dice,bonus:1,custom:{enabled:false,formula:''}});

export function blightingStrikeData(folder){
  return {name:'Blighting Strike',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/dread.png',
    system:{domain:'dread',level:1,recallCost:1,type:'spell',attribution:{source:'Daggerheart SRD',page:null},
      description:"<p>Make a <strong>Spellcast Roll</strong> against a target within Far range. On a success:</p><ul><li><p>On a roll with Hope, deal <strong>d6+1</strong> magic damage using your Proficiency. On a roll with Fear, deal <strong>d10+1</strong> magic damage using your Proficiency.</p></li><li><p>The target's next successful attack deals half damage.</p></li></ul><p>On a failure, you must spend a Hope or mark a Stress.</p>",
      gmNotes:'Use the single Spellcast Roll action. Native result-based damage automatically uses Proficiency d6+1 with Hope (including critical successes), or d10+1 with Fear. Hit targets receive a visible Blighted marker. It is consumed by their next successful attack, not by misses or other rolls; that attack card retains half damage for automatic and later manual damage/application. Half damage rounds up before recipient reductions. Failed casts prompt to spend 1 Hope or mark 1 Stress using shared payment helpers. Unknown outcomes and dismissed/unpayable costs remain explicitly unresolved/manual.',
      resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      actions:{[BLIGHTING_ACTION]:{type:'attack',_id:BLIGHTING_ACTION,systemPath:'actions',baseAction:false,description:'',chatDisplay:true,
        originItem:{type:'itemCollection'},actionType:'action',triggers:[],areas:[],cost:[],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},
        target:{type:'any',amount:1},effects:[],
        damage:{main:{base:false,applyTo:'hitPoints',resultBased:true,fullRestore:false,value:value('d6'),valueAlt:value('d10'),includeBase:false,direct:false,type:['magical'],itemId:null},resources:{}},
        roll:{type:'spellcast',trait:null,difficulty:null,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},
        save:{trait:null,difficulty:null,damageMod:'none'},name:'Spellcast Roll',range:'far',img}},
    },
    effects:[{name:'Blighted — Blighting Strike',disabled:false,img,description:"<p>Your next successful attack deals half damage. Misses and nonattack rolls do not consume this effect.</p>",transfer:false,statuses:[],
      system:{changes:[],duration:{description:'Until your next successful attack.',type:'temporary'},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
      _id:BLIGHTING_EFFECT,type:'base',duration:{value:null,units:'seconds',expiry:null,expired:false},tint:'#ffffff',showIcon:1,folder:null,sort:0,flags:{[ID]:{blightingStrike:true}}}],
    flags:{[ID]:{premade:{key:BLIGHTING_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.CEOM585jIX8V9PHz']}}}
  };
}

export async function ensureBlightingStrike(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===BLIGHTING_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Dread');if(!folder)throw Error('The Dread compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await pack.configure({locked:false});const data=blightingStrikeData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Blighting Strike creation was cancelled.');return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
