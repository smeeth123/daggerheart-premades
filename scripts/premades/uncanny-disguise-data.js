import {ID} from '../core.js';
export const UNCANNY_DISGUISE_KEY='midnight-uncanny-disguise';
export const UNCANNY_DISGUISE_ACTIVATE='gMdD6cTmUU4qbwq7',UNCANNY_DISGUISE_SPEND='OoNND7VcWoBQdtFK',UNCANNY_DISGUISE_EFFECT='ou3RLeYshTocbNYo';
const nativeId='TV56wSysbU5xAlOa',img='icons/commodities/treasure/mask-bone-white.webp';
const tokenDescription='<p>Place a number of tokens equal to your Spellcast trait on this card. When you take an action while disguised, spend a token from this card. After the action that spends the last token is resolved, the disguise drops.</p>';
function action(id,name,icon,extra){return {type:'effect',_id:id,systemPath:'actions',baseAction:false,description:'',chatDisplay:true,
  originItem:{type:'itemCollection'},actionType:'action',triggers:[],areas:[],cost:[],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},
  effects:[],target:{type:'self',amount:null},name,range:'self',img:icon,...extra};}
export function uncannyDisguiseData(folder){return {
  name:'Uncanny Disguise',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/midnight.png',
  system:{description:`<p>When you have a few minutes to prepare, you can <strong>mark a Stress</strong> to don the facade of any humanoid you can picture clearly in your mind. While disguised, you have advantage on Presence Rolls to avoid scrutiny.</p>${tokenDescription}`,
    domain:'midnight',recallCost:0,level:1,type:'spell',attribution:{source:'Daggerheart SRD',page:null,artist:''},
    gmNotes:'Don Facade retains native Stress payment and self-targeting. After it completes, set tokens to the current Spellcast trait and apply one visible Disguised effect, retaining the native contextual Presence advantage. No healing roll or separate Apply Effects click is needed. Completed action uses and direct action trait/Spellcast rolls spend one token; the last action keeps its disguise until its workflow resolves. Reactions, separate damage rolls, canceled workflows, and activation do not spend tokens. Spend Token remains available for narrative actions and does not pay twice. Recasting replaces the previous disguise and pool; an older pending action cannot consume the new disguise. Manually setting tokens to zero clears the effect.',
    resource:{type:'simple',value:0,max:'@cast',icon:'',recovery:null,progression:'increasing',diceStates:{},dieFaces:'d4'},
    actions:{
      [UNCANNY_DISGUISE_ACTIVATE]:action(UNCANNY_DISGUISE_ACTIVATE,'Don Facade','icons/magic/control/debuff-energy-hold-pink.webp',{
        cost:[{scalable:false,key:'stress',value:1,itemId:null,step:null,consumeOnSuccess:false}]}),
      [UNCANNY_DISGUISE_SPEND]:action(UNCANNY_DISGUISE_SPEND,'Spend Token','icons/commodities/gems/gem-faceted-diamond-blue.webp',{
        description:tokenDescription,cost:[{key:'resource',itemId:nativeId,value:1,scalable:false,step:null,consumeOnSuccess:false}],target:{type:'any',amount:null},range:''})
    },inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null},
  effects:[{name:'Disguised',disabled:true,img,description:`<p>While disguised, you have advantage on Presence Rolls to avoid scrutiny.</p>${tokenDescription}`,
    transfer:false,statuses:[],system:{changes:[{key:'system.advantageSources',type:'add',value:'Presence Rolls to avoid scrutiny',priority:null,phase:'initial'}],
      duration:{description:'Until the action spending the last token resolves.',type:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},
    _id:UNCANNY_DISGUISE_EFFECT,type:'base',start:null,duration:{value:null,units:'seconds',expiry:null,expired:false},tint:'#ffffff',showIcon:1,folder:null,sort:0,
    flags:{[ID]:{uncannyDisguiseTemplate:true}}}],
  flags:{[ID]:{premade:{key:UNCANNY_DISGUISE_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:[`Compendium.daggerheart.domains.Item.${nativeId}`]}}}
};}
export async function ensureUncannyDisguise(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await pack.getDocuments()).find(item=>item.getFlag(ID,'premade')?.key===UNCANNY_DISGUISE_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Midnight');if(!folder)throw Error('The Midnight compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await pack.configure({locked:false});const data=uncannyDisguiseData(folder.id);
    const item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Uncanny Disguise creation was cancelled.');return item;
  }finally{if(locked)await pack.configure({locked:true});}
}
