import {brawlerStrike} from '../primary-weapon.js';
export function isWeaponAttack(data){
 const action=data?.action;if(action?.type!=='attack')return false;
 if(data.item?.type==='weapon'||action.item?.type==='weapon')return true;
 const actor=action.actor;
 const native=brawlerStrike(actor);
 return Boolean(native&&action.item?.uuid===actor.uuid&&(action===native||Boolean(action.id&&action.id===(native.id??native._id))));
}
