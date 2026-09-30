import { ID,featureActive,normalize } from '../core.js';
export function isWeaponAttack(data){
 const action=data?.action;if(action?.type!=='attack')return false;
 if(data.item?.type==='weapon'||action.item?.type==='weapon')return true;
 const actor=action.actor;
 if(actor?.type!=='character'||action.range!=='melee'||actor.system?.usesUnarmed===false)return false;
 const native=actor.system?.attack;
 const actorAttack=action.item?.documentName==='Actor'&&(action===native||Boolean(action.id&&action.id===(native?.id??native?._id)));
 if(!actorAttack)return false;
 return actor.items?.some(item=>featureActive(item)&&(
  normalize(item.name)==='i am the weapon'||item._stats?.compendiumSource==='Compendium.daggerheart.classes.Item.WgUrpNTlX92k0Xs3'||
  (item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)==='brawler-i-am-the-weapon'
 ))??false;
}
