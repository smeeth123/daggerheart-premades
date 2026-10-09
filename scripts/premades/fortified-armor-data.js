import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const FORTIFIED_ARMOR_KEY='blade-fortified-armor',FORTIFIED_ARMOR_EFFECT='jx8KWAdyoPV2hV0s';
export function fortifiedArmorData(folder){return {
 name:'Fortified Armor',type:'domainCard',folder,img:'systems/daggerheart/assets/icons/domains/domain-card/blade.png',
 system:{description:'<p>While you are wearing armor, gain a +2 bonus to your damage thresholds.</p>',domain:'blade',recallCost:0,level:4,type:'ability',attribution:{source:'Daggerheart SRD',page:null,artist:''},resource:null,actions:{},inVault:false,vaultActive:false,loadoutIgnore:false,domainTouched:null,
  gmNotes:'The native transferred +2 Major and Severe threshold effect applies only while an actual armor item is equipped. Unequipping or deleting the armor suppresses the bonus; equipping armor restores it. Magical Armor Slots alone do not count as wearing armor. No extra Armor Slots, costs, actions or managed actor effects.'},
 effects:[{name:'Fortified Armor',type:'base',_id:FORTIFIED_ARMOR_EFFECT,img:'icons/equipment/chest/breastplate-helmet-metal.webp',system:{changes:[{key:'system.damageThresholds.major',type:'add',value:2,priority:null,phase:'initial'},{key:'system.damageThresholds.severe',type:'add',value:2,priority:null,phase:'initial'}],duration:{description:''},rangeDependence:null,stacking:null,targetDispositions:[],conditionals:[]},disabled:false,duration:{value:null,units:'seconds',expiry:null,expired:false},description:'',tint:'#ffffff',transfer:true,statuses:[],sort:0,flags:{[ID]:{fortifiedArmor:true}},start:null,showIcon:1,folder:null}],
 flags:{[ID]:{premade:{key:FORTIFIED_ARMOR_KEY,version:'1.0.0',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.oVa49lI107eZILZr']}}}
};}
export async function ensureFortifiedArmor(){
 const pack=game.packs.get(ID+'.domain-cards');if(!pack)throw Error('The Domain Cards compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===FORTIFIED_ARMOR_KEY);
 if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const folder=pack.folders.find(f=>!f.folder&&f.name==='Blade');if(!folder)throw Error('The Blade compendium folder is missing.');
 const locked=pack.locked;
 try{if(locked)await configurePremadePack(pack,{locked:false});const data=fortifiedArmorData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});if(!item)throw Error('Fortified Armor creation was cancelled.');return item;}
 finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
