import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {BOOK_OF_AVA_KEY,TAVAS_ARMOR_ACTION,TAVAS_ARMOR_EFFECT} from './book-of-ava-data.js';

const QUERY=`${ID}.expireTavasArmor`,WRAPPED=Symbol.for(QUERY),latest=new Map();
const effectUuid=effect=>effect.uuid??`${effect.parent.uuid}.ActiveEffect.${effect.id}`;

export function bookOfAvaItem(item){
  const flags=item?.flags?.[ID];
  return Boolean(item?.actor?.type==='character'&&item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (flags?.applied?.key??flags?.premade?.key)===BOOK_OF_AVA_KEY);
}
export function tavasArmorAction(action){
  return action?.id===TAVAS_ARMOR_ACTION&&bookOfAvaItem(action.item);
}
export function tavasArmorOrigin(item){
  return item.effects?.get?.(TAVAS_ARMOR_EFFECT)?.uuid??`${item.uuid}.ActiveEffect.${TAVAS_ARMOR_EFFECT}`;
}
export function tavasArmorEffects(item){
  const actors=new Map([...game.actors].map(actor=>[actor.uuid,actor]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  return [...actors.values()].flatMap(actor=>[...(actor.effects??[])].filter(effect=>effect.origin===tavasArmorOrigin(item)));
}

export async function expireTavasArmor(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Array.isArray(request.effectUuids)||request.effectUuids.length>1000)return false;
  const message=await fromUuid(request.messageUuid),action=message?.system?.action;
  if(!tavasArmorAction(action)||action.item.uuid!==request.itemUuid||!action.actor?.testUserPermission(user,'OWNER'))return false;
  return withHopeLock(`tavas:${tavasArmorOrigin(action.item)}`,async()=>{
    if(!tavasArmorAction(action)||!user.active||!action.actor.testUserPermission(user,'OWNER'))return false;
    const allowed=new Set(request.effectUuids),effects=tavasArmorEffects(action.item).filter(effect=>allowed.has(effectUuid(effect)));
    for(const effect of effects)await effect.delete();
    return effects.length>0;
  });
}

export async function replaceTavasArmor(effect){
  // Creation is authoritative even when the native EffectsField starts application without awaiting it,
  // or when the user applies the effect later from a chat card with automation disabled.
  if(!game.user.isActiveGM||effect.parent?.documentName!=='Actor'||effect.disabled||!effect.origin)return false;
  const uuid=effectUuid(effect);latest.set(effect.origin,uuid);
  return withHopeLock(`tavas:${effect.origin}`,async()=>{
    if(latest.get(effect.origin)!==uuid)return false;
    const template=await fromUuid(effect.origin),item=template?.parent;
    if(latest.get(effect.origin)!==uuid||!bookOfAvaItem(item)||tavasArmorOrigin(item)!==effect.origin)return false;
    const effects=tavasArmorEffects(item);
    if(!effects.some(current=>effectUuid(current)===uuid))return false;
    const old=effects.filter(current=>effectUuid(current)!==uuid);
    for(const current of old)await current.delete();
    return old.length>0;
  });
}

export function installBookOfAva(Action,expire){
  if(Action[WRAPPED])return;
  const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
    if(!tavasArmorAction(this))return native.apply(this,args);
    const old=tavasArmorEffects(this.item).map(effectUuid),result=await native.apply(this,args);
    // Do not expire on pre-use, canceled configuration, failed workflow or failed cost payment.
    // Only captured effects are removed: the replacement may already exist by this point.
    if(result?.message&&old.length)await expire({itemUuid:this.item.uuid,messageUuid:result.message.uuid,effectUuids:old});
    return result;
  };
  Object.defineProperty(Action,WRAPPED,{value:true});
}

export function registerBookOfAva(){
  CONFIG.queries[QUERY]=expireTavasArmor;
  installBookOfAva(game.system.api.data.actions.actionsTypes.base,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error("Tava's Armor expiry needs an active GM.");
    return gm.isSelf?expireTavasArmor(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
  });
  Hooks.on('createActiveEffect',effect=>{
    // Only this template ID needs asynchronous source lookup; unrelated effects are untouched.
    if(!effect.origin?.endsWith(`.ActiveEffect.${TAVAS_ARMOR_EFFECT}`))return;
    void replaceTavasArmor(effect).catch(error=>{
      console.error(`${ID} | Tava's Armor expiry failed`,error);
      ui.notifications.error("Tava's Armor could not replace its previous effect. Check the console for details.");
    });
  });
}
