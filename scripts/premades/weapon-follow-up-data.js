import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_FOLLOW_UP_KEY='weapon-follow-up';
export function weaponFollowUpData(){
  return {name:'Follow-Up',type:'feature',img:'icons/skills/melee/strike-sword-steel-yellow.webp',
    system:{description:'<p>On a successful attack with your primary weapon within Melee range, you can mark a Stress to gain a +1 bonus to your Proficiency for this attack.</p>',
      gmNotes:'Medkit the secondary weapon with Follow-Up (the Hatchet series). After a successful primary-weapon attack and its dice animation, the damage workflow offers 1 Stress for +1 Proficiency. The bonus is scoped to that attack card, without a lasting actor effect. Automatic and chat-card damage are supported. If the damage dialog is canceled after payment, reopening that attack’s damage retains the paid bonus without another cost. Native weapon data is preserved.',
      actions:{},resource:null,granter:null,featureForm:'passive'},effects:[],
    flags:{[ID]:{premade:{key:WEAPON_FOLLOW_UP_KEY,version:'1.0.0',category:'weapon-features',weaponFeature:'followUp',aliases:[],sourceUuids:[]}}}};
}
export async function ensureWeaponFollowUp(){
  const pack=game.packs.get(`${ID}.weapon-features`);
  if(!pack)throw Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===WEAPON_FOLLOW_UP_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.0')return existing;
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const item=existing?await existing.update(weaponFollowUpData()):await Item.create(weaponFollowUpData(),{pack:pack.collection});
    if(!item)throw Error('Follow-Up weapon feature creation was cancelled.');
    return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
