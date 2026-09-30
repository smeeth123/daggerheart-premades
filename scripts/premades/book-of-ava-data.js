import {ID} from '../core.js';

export const BOOK_OF_AVA_KEY='codex-book-of-ava';
export const TAVAS_ARMOR_ACTION='4N7ViDYt9Na3zwzi';
export const TAVAS_ARMOR_EFFECT='ptYT10JZ2WJHvFMd';
const shield='icons/magic/defensive/shield-barrier-glowing-triangle-blue.webp';
const push='<p>Make a <strong>Spellcast Roll</strong> against a target within Melee range. On a success, they\'re knocked back to Far range and take <strong>d10+2</strong> magic damage using your Proficiency.</p>';
const armor='<p><strong>Spend a Hope</strong> to give a target you can touch a +1 bonus to their Armor Score until their next rest or you cast Tava\'s Armor again.</p>';
const ice='<p>Make a <strong>Spellcast Roll (12)</strong> to summon a large ice spike within Far range. If you use it as a weapon, make the Spellcast Roll against the target\'s Difficulty instead. On a success, deal <strong>d6</strong> physical damage using your Proficiency.</p>';
const damage=(dice,bonus,type)=>({main:{resultBased:false,value:{custom:{enabled:false,formula:''},multiplier:'prof',dice,bonus,flatMultiplier:1},applyTo:'hitPoints',type:[type],base:false,valueAlt:null,includeBase:false,direct:false,fullRestore:false,itemId:null},resources:{}});
function action(id,name,img,description,extra){
  return {type:'attack',_id:id,systemPath:'actions',description,chatDisplay:true,actionType:'action',cost:[],
    uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},effects:[],target:{type:'any',amount:null},
    name,img,range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[],...extra};
}
const spellcast=difficulty=>({type:'spellcast',trait:null,difficulty,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false});
const save=()=>({trait:null,difficulty:null,damageMod:'none'});

export function bookOfAvaData(folder){
  const spike='icons/magic/water/projectile-icecicle.webp';
  return {name:'Book of Ava',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/codex.png',
    system:{description:`<p><em><strong>Power Push:</strong></em> ${push.slice(3,-4)}</p><p><em><strong>Tava's Armor:</strong></em> ${armor.slice(3,-4)}</p><p><em><strong>Ice Spike:</strong></em> ${ice.slice(3,-4)}</p>`,
      domain:'codex',recallCost:2,level:1,type:'grimoire',resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
      attribution:{source:'Daggerheart SRD',page:null,artist:''},
      gmNotes:'All spells retain native behavior. Tava\'s Armor keeps its native Hope cost, targeting, +1 Armor Score, and recipient next-rest expiration. Completing another Tava\'s Armor cast removes this card\'s previous armor from any recipient. Applying the native effect also replaces older copies from this caster/card, including manual chat-card application. Other casters are unaffected.',
      actions:{
        jX4wg2HR2xkdtbIU:action('jX4wg2HR2xkdtbIU','Power Push','icons/magic/movement/trail-streak-impact-blue.webp',push,{damage:damage('d10',2,'magical'),target:{type:'any',amount:1},roll:spellcast(null),save:save(),range:'melee'}),
        [TAVAS_ARMOR_ACTION]:action(TAVAS_ARMOR_ACTION,"Tava's Armor",shield,armor,{type:'effect',cost:[{key:'hope',value:1,scalable:false,step:null,itemId:null,consumeOnSuccess:false}],effects:[{_id:TAVAS_ARMOR_EFFECT,onSave:false}],target:{type:'any',amount:1}}),
        XU1joyIDFZrQiToF:action('XU1joyIDFZrQiToF','Ice Spike',spike,ice,{damage:{main:null,resources:{}},roll:spellcast(12),save:save()}),
        enit3ZkPp0nY5lN1:action('enit3ZkPp0nY5lN1','Ice Spike (Attack)',spike,ice,{damage:damage('d6',null,'physical'),roll:spellcast(null),save:save()})
      }},
    effects:[{name:"Tava's Armor",img:shield,transfer:false,_id:TAVAS_ARMOR_EFFECT,type:'base',disabled:false,
      system:{changes:[{type:'armor',phase:'initial',priority:20,value:{max:'1',current:0,damageThresholds:null,interaction:'none'}}],duration:{type:'shortRest',description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
      duration:{value:null,units:'seconds',expiry:null,expired:false},description:'<p>+1 bonus to your Armor Score until your next rest, or the caster casts Tava\'s Armor again.</p>',tint:'#ffffff',statuses:[],sort:0,flags:{},showIcon:1,folder:null}],
    flags:{[ID]:{premade:{key:BOOK_OF_AVA_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.YtZzYBtR0yLPPA93']}}}
  };
}

export async function ensureBookOfAva(){
  const pack=game.packs.get(`${ID}.domain-cards`);
  if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===BOOK_OF_AVA_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Codex');
  if(!folder)throw Error('The Codex compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await pack.configure({locked:false});
    const data=bookOfAvaData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Book of Ava creation was cancelled.');
    return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
