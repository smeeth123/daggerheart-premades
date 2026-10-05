import {ID,featureActive} from './core.js';
import {WEAPON_KEY} from './premades/i-am-the-weapon-data.js';

const BRAWLER_SOURCE='Compendium.daggerheart.classes.Item.WgUrpNTlX92k0Xs3';
const itemsOf=actor=>[...(actor?.items?.values?.()??actor?.items??[])];
const actionId=action=>action?.id??action?._id;
// Brawler's Strike is the native actor attack, not an embedded weapon Item.
// Return its real Actor source so native attack/chat/damage identities stay intact.
export function brawlerStrike(actor){
  if(actor?.type!=='character'||actor.system?.usesUnarmed===false||actor.system?.activeBeastform||
    [...(actor.effects??[])].some(effect=>effect.type==='beastform'&&!effect.disabled&&!effect.isSuppressed))return null;
  const items=itemsOf(actor),attack=actor.system?.attack;
  if(items.some(item=>item.type==='weapon'&&item.system?.equipped)||attack?.type!=='attack'||!actionId(attack))return null;
  const feature=items.find(item=>item.type==='feature'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    ((item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===WEAPON_KEY||item._stats?.compendiumSource===BRAWLER_SOURCE));
  if(!feature)return null;
  const effects=[...(feature.effects?.values?.()??feature.effects??[])];
  const change=effects.filter(effect=>!effect.disabled&&!effect.isSuppressed&&!effect.duration?.expired)
    .flatMap(effect=>[...(effect.system?.changes??[])])
    .find(change=>change.type==='standardAttack'&&change.value?.name===attack.name&&
      change.value.damageFormula===attack.damage?.main?.value?.custom?.formula);
  return change?attack:null;
}
export function primaryWeapon(actor){
  const equipped=item=>item?.type==='weapon'&&item.system?.equipped&&!item.system?.secondary;
  const primary=actor?.system?.primaryWeapon;
  if(primary!=null)return equipped(primary)?primary:null;
  return itemsOf(actor).find(equipped)??(brawlerStrike(actor)?actor:null);
}
export function primaryWeaponAttack(action){
  const actor=action?.actor,primary=primaryWeapon(actor);
  return Boolean(action?.type==='attack'&&primary&&action.item?.uuid===primary.uuid&&
    (primary.type==='weapon'?actor.system?.primaryWeapon?.uuid===primary.uuid:actionId(action)===actionId(primary.system?.attack)));
}
export function attackSourceDocument(actor,source){
  if(source?.actor!==actor?.uuid)return null;
  const item=actor?.items?.get?.(source.item);
  if(item)return item;
  return source.item===(actor?.id??actor?._id)&&source.action===actionId(actor.system?.attack)?actor:null;
}
