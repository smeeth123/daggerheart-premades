import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {WEAPON_VOLLEYED_KEY} from '../weapon-volley-action.js';
export {WEAPON_VOLLEYED_KEY} from '../weapon-volley-action.js';
export function weaponVolleyedData(){return {name:'Volleyed',type:'feature',img:'icons/weapons/bows/bow-ornamental-carved-brown.webp',system:{
 description:'<p>Spend a Hope to target a group of creatures within range. Targets you succeed against take half damage.</p>',
 gmNotes:'Medkit the actual Volleyed weapon. Its normal Attack remains unchanged; a second native attack, Volley (1 Hope), targets the selected group and halves final damage, rounding up, before defenses. Native Hope cost and attack/damage resolution stay in control. No extra prompt. Re-Medkit after changing weapon statistics to refresh the copied Volley action. Disabling the premade blocks Volley but leaves the original Attack usable.',
 actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],flags:{[ID]:{premade:{key:WEAPON_VOLLEYED_KEY,version:'1.0.0',category:'weapon-features',weaponFeature:'volleyed',aliases:[],sourceUuids:[]}}}};}
export async function ensureWeaponVolleyed(){
 const pack=game.packs.get(`${ID}.weapon-features`);if(!pack)throw Error('The Weapon Features compendium is missing.');
 const existing=(await premadeDocuments(pack)).find(i=>i.getFlag(ID,'premade')?.key===WEAPON_VOLLEYED_KEY);
 if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
 const locked=pack.locked;try{if(locked)await configurePremadePack(pack,{locked:false});
  const item=existing?await existing.update(weaponVolleyedData()):await Item.create(weaponVolleyedData(),{pack:pack.collection});
  if(!item)throw Error('Volleyed creation was cancelled.');return item;
 }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
