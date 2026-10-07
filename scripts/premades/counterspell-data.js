import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const COUNTERSPELL_KEY='arcana-counterspell',COUNTERSPELL_ACTION='SeOcGdKAc7egwg9H';
const description='<p>You can interrupt a magical effect taking place by making a reaction roll using your Spellcast trait. On a success, the effect stops and any consequences are avoided, and this card is placed in your vault.</p>';
export function counterspellData(folder){return {
 name:'Counterspell',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/arcana.png',
 system:{description,domain:'arcana',recallCost:2,level:3,type:'spell',resource:null,inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
 attribution:{source:'Daggerheart SRD',page:null,artist:''},gmNotes:'Use Interrupt for a Spellcast reaction. A targeted adversary supplies the default Difficulty; otherwise the GM is asked. The native roll dialog permits a Difficulty override. Success automatically vaults this card. For NPC actions, the GM can enable Counterable magical effect in the action settings; eligible scene characters receive an interruption choice before that whole action begins. Success prevents the action and its consequences. Narrative magic and unmarked effects must be stopped manually.',
 actions:{[COUNTERSPELL_ACTION]:{type:'attack',_id:COUNTERSPELL_ACTION,systemPath:'actions',description:'',chatDisplay:true,actionType:'reaction',cost:[],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},damage:{main:null,resources:{}},target:{type:'any',amount:null},effects:[],roll:{type:'reaction',trait:'spellcast',difficulty:null,bonus:null,advState:'neutral',diceRolling:{multiplier:'prof',flatMultiplier:1,dice:'d6',compare:null,treshold:null},useDefault:false},save:{trait:null,difficulty:null,damageMod:'none'},name:'Interrupt',img:'icons/magic/control/hypnosis-mesmerism-watch.webp',range:'',baseAction:false,originItem:{type:'itemCollection'},triggers:[],areas:[]}}},
 effects:[],flags:{[ID]:{premade:{key:COUNTERSPELL_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.6dhqo1kzGxejCjHa']}}}
};}
export async function ensureCounterspell(){
 const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===COUNTERSPELL_KEY);
 if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Arcana');if(!folder)throw Error('The Arcana compendium folder is missing.');
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});const data=counterspellData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Counterspell creation was cancelled.');return item;}finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
