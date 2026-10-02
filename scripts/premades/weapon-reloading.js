import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {markReactiveStress} from './stress-payment.js';
import {WEAPON_RELOADING_KEY} from './weapon-reloading-data.js';

const QUERY=`${ID}.weaponReloading`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY);
const pending=new Set(),completed=new Set(),checks=new Map();
export function reloadingWeapon(item){
  return Boolean(item?.type==='weapon'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_RELOADING_KEY&&
    item.system?.weaponFeatures?.some(feature=>feature.value==='reloading')&&item.system.resource);
}
export function reloadingAttack(action){
  return Boolean(action?.type==='attack'&&reloadingWeapon(action.item)&&action.actor?.type==='character'&&!unavailableActor(action.actor));
}
export function reloadMaximum(item){
  const max=String(item.system.resource.max??'');
  const value=Number(max);
  if(Number.isFinite(value)&&value>0)return value;
  const Roll=foundry.dice.Roll;
  try{const value=Number(Roll.safeEval(Roll.replaceFormulaData(max.replace(/item\.@/gi,'@'),item.getRollData())));return Number.isFinite(value)?value:NaN;}catch{return NaN;}
}
const needsReload=item=>Number(item.system.resource.value)===0;
const canPay=actor=>Number(actor.system.resources?.stress?.value)<Number(actor.system.resources?.stress?.max);
export async function promptWeaponReload(request,{user}){
  const item=await fromUuid(request.itemUuid),actor=item?.actor;
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!reloadingWeapon(item)||!needsReload(item))return false;
  const payable=canPay(actor);
  return Boolean(await timedDialog(`Reload — ${item.name}`,payable?'<p>This weapon is not loaded. Mark <strong>1 Stress</strong> to reload it and continue the attack?</p>':'<p>This weapon is not loaded. You have no Stress slots available to reload it.</p>',[
    ...(payable?[{action:'reload',label:'Mark 1 Stress and Reload',callback:()=>true}]:[]),
    {action:'cancel',label:'Cancel Attack',default:true,callback:()=>false}]));
}
export async function resolveWeaponReload(request,{user},ask=promptWeaponReload){
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||pending.has(request.itemUuid)||completed.has(`${request.itemUuid}:${request.id}`))return false;
  const item=await fromUuid(request.itemUuid),actor=item?.actor;
  if(!reloadingWeapon(item)||actor?.type!=='character'||unavailableActor(actor)||!item.isOwner||!actor.testUserPermission(user,'OWNER')||
    (item.pack&&game.packs.get(item.pack)?.locked)||!needsReload(item)||!(reloadMaximum(item)>0))return false;
  pending.add(item.uuid);completed.add(`${item.uuid}:${request.id}`);if(completed.size>1000)completed.delete(completed.values().next().value);
  try{
    const owner=ownerFor(actor,[...game.users],game.user),accepted=owner.isSelf?await ask(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
    if(accepted!==true)return false;
    return await withHopeLock(`reload:${item.uuid}`,async()=>{
      const eligible=fresh=>user.active&&owner.active&&fresh===actor&&!unavailableActor(fresh)&&fresh.testUserPermission(user,'OWNER')&&fresh.testUserPermission(owner,'OWNER')&&
        reloadingWeapon(item)&&item.isOwner&&needsReload(item)&&!(item.pack&&game.packs.get(item.pack)?.locked)&&reloadMaximum(item)>0;
      if(!eligible(actor))return false;
      const maximum=reloadMaximum(item);
      if(!await markReactiveStress(actor.uuid,eligible))return false;
      if(!eligible(actor)||reloadMaximum(item)!==maximum)throw Error('Reload changed after paying its cost. Check Stress and the weapon’s loaded state before retrying.');
      // After a committed cost, do not silently retry or refund a cost that may
      // have used Brave Face/Unshakeable. A failed document write needs review.
      if(!await item.update({'system.resource.value':maximum})||Number(item.system.resource.value)!==maximum)
        throw Error('Reload failed after paying its cost. Check Stress and the weapon’s loaded state before retrying.');
      return true;
    });
  }finally{pending.delete(item.uuid);}
}
export async function automaticReloadCheck(action,config){
  const message=config?.message;
  if(!reloadingAttack(action)||!message?.uuid||!Number.isFinite(message.system?.roll?.total)||
    message.system.source?.actor!==action.actor.uuid||message.system.source?.item!==action.item.id||message.system.source?.action!==action.id)return;
  if(Number.isInteger(message.system.reloadCheckValue)&&message.system.reloadCheckValue>=1&&message.system.reloadCheckValue<=6)return;
  if(checks.has(message.uuid))return checks.get(message.uuid);
  const operation=(async()=>{
    if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
    if(!reloadingAttack(action))return;
    const result=await action.handleReload({awaitRoll:true});
    if(!await message.update({'system.reloadCheckValue':result.rollValue}))throw Error('Could not save the reload check. Check the weapon’s loaded state before continuing.');
    return result;
  })();
  checks.set(message.uuid,operation);
  try{return await operation;}finally{checks.delete(message.uuid);}
}
export function installWeaponReloading(Attack,dispatch){
  if(!Attack||Object.hasOwn(Attack,WRAPPED))return;
  const use=Attack.prototype.use,handle=Attack.prototype.handleReload;
  Attack.prototype.handleReload=async function(options={awaitRoll:false}){
    if(!reloadingAttack(this))return handle.call(this,options);
    const roll=await new foundry.dice.Roll('1d6').evaluate(),needs=roll.total===1;
    if(game.dice3d){const animation=game.dice3d.showForRoll(roll,game.user,true);if(options.awaitRoll)await animation;}
    if(needs&&(!await this.item.update({'system.resource.value':0})||Number(this.item.system.resource.value)!==0))throw Error('Could not mark the weapon as unloaded.');
    return {needsReload:needs,rollValue:roll.total};
  };
  Attack.prototype.use=async function(...args){
    if(!reloadingAttack(this))return use.apply(this,args);
    if(needsReload(this.item)){
      const loaded=await dispatch({itemUuid:this.item.uuid,id:foundry.utils.randomID()});
      if(!loaded||!reloadingAttack(this)||needsReload(this.item))return;
    }
    const result=await use.apply(this,args);
    try{await automaticReloadCheck(this,result);}
    catch(error){console.error(`${ID} | Automatic Reloading check failed`,error);ui.notifications.error(`Reloading check failed: ${error.message}`);}
    return result;
  };
  Object.defineProperty(Attack,WRAPPED,{value:true});
}
export function registerWeaponReloading(){
  CONFIG.queries[QUERY]=resolveWeaponReload;CONFIG.queries[PROMPT]=promptWeaponReload;
  installWeaponReloading(game.system.api.models.actions.actionsTypes.attack,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Reloading needs an active GM.');
    return gm.isSelf?resolveWeaponReload(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  });
}
