import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {honedAction} from './honed.js';
import {withHopeLock} from './hope-lock.js';
import {installVigilantBefore} from './vigilant.js';
import {WEAPON_DEFLECTING_KEY} from './weapon-deflecting-data.js';
const QUERY=`${ID}.weaponDeflecting`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
export function deflectingWeapon(actor){
 const armor=actor?.system?.armorScore;
 if(actor?.type!=='character'||unavailableActor(actor)||!Number.isSafeInteger(Number(armor?.max))||Number(armor.max)<=0||!(Number(armor.value)<Number(armor.max)))return null;
 return actor.items?.find(item=>item.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
  item.flags?.[ID]?.applied?.key===WEAPON_DEFLECTING_KEY&&item.system.weaponFeatures?.some(f=>f.value==='deflecting'))??null;
}
export function deflectingTargets(actor,config){
 if(!canvas.ready||!deflectingWeapon(actor))return [];
 return (config.targets??[]).filter(t=>t.actorId===actor.uuid&&Number.isFinite(Number(t.evasion))&&(!t.difficulty||Number(t.difficulty)===Number(t.evasion)))
  .map(t=>canvas.tokens.get(t.id)?.document).filter(t=>t?.actor?.uuid===actor.uuid).map(t=>({id:t.id,uuid:t.uuid}));
}
export async function validateDeflecting(request,user){
 if(!user?.active||!Number.isFinite(request?.deadline)||request.deadline<=decisionNow()||!Array.isArray(request.targets)||!request.targets.length||request.targets.length>100||
  new Set(request.targets.map(t=>t.uuid)).size!==request.targets.length)return null;
 const attacker=await fromUuid(request.source?.actor),actor=await fromUuid(request.actorUuid),weapon=deflectingWeapon(actor);
 if(!weapon||!attacker?.testUserPermission(user,'OWNER')||honedAction(attacker,request.source)?.type!=='attack')return null;
 const targets=await Promise.all(request.targets.map(t=>fromUuid(t.uuid)));
 if(targets.some((t,i)=>t?.documentName!=='Token'||t.id!==request.targets[i].id||t.actor?.uuid!==actor.uuid))return null;
 return {actor,weapon,attacker,targets};
}
export async function promptDeflecting(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!deflectingWeapon(actor))return false;
 const bonus=Number(actor.system.armorScore.max);
 return Boolean(await timedDialog(`Deflecting — ${actor.name}`,`<p>You are targeted by an attack. Before it rolls, mark <strong>1 Armor Slot</strong> for <strong>+${bonus} Evasion</strong> against this attack?</p>`,
  [{action:'use',label:'Mark Armor Slot',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveDeflecting(request,{user},ask=promptDeflecting){
 if(!game.user.isActiveGM||typeof request?.id!=='string'||!request.id||request.id.length>64||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return null;
 for(const [key,record]of receipts)if(record.expires<decisionNow())receipts.delete(key);
 const key=`${user?.id}:${request.id}`;if(receipts.has(key))return null;
 let valid=await validateDeflecting(request,user);if(!valid||receipts.has(key))return null;
 receipts.set(key,{expires:decisionNow()+decisionBudget(300000)});
 const owner=ownerFor(valid.actor,[...game.users],game.user),weaponUuid=valid.weapon.uuid;
 const data={actorUuid:valid.actor.uuid},accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(accepted!==true||!owner.active)return null;
 return withHopeLock(valid.actor.uuid,async()=>{
  valid=await validateDeflecting(request,user);
  if(!valid||valid.weapon.uuid!==weaponUuid||!owner.active||!valid.actor.testUserPermission(owner,'OWNER'))return null;
  const score=Number(valid.actor.system.armorScore.max),before=Number(valid.actor.system.armorScore.value);
  // Native updateArmorValue awaits the embedded armor/effect writes and uses
  // the system's ordered armor sources, including temporary Armor Slots.
  await valid.actor.system.updateArmorValue({value:1});
  if(Number(valid.actor.system.armorScore.value)!==before+1)throw Error('Deflecting could not mark an Armor Slot. Check Armor before retrying.');
  return {bonus:score,bearerName:valid.actor.name,targetIds:valid.targets.map(t=>t.id)};
 });
}
export function installWeaponDeflecting(RollClass,dispatch){
 if(Object.hasOwn(RollClass,WRAPPED))return;
 installVigilantBefore(RollClass,(request,config)=>{
  const actor=canvas.tokens.placeables.find(t=>t.actor?.uuid===request.actorUuid)?.actor,targets=actor&&deflectingTargets(actor,config);
  return targets?.length?dispatch({...request,targets}):null;
 },(actor,config,target)=>deflectingTargets(actor,config).some(t=>t.id===target.id),'weaponDeflecting',{label:'Deflecting',allowReactions:true});
 Object.defineProperty(RollClass,WRAPPED,{value:true});
}
export function registerWeaponDeflecting(){
 CONFIG.queries[QUERY]=resolveDeflecting;CONFIG.queries[PROMPT]=promptDeflecting;
 const dispatch=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Deflecting needs an active GM.');return gm.isSelf?resolveDeflecting(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});};
 for(const RollClass of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installWeaponDeflecting(RollClass,dispatch);
 Hooks.on('daggerheart.preUseAction',action=>{
  if(deflectingWeapon(action.actor)?.uuid===action.item?.uuid&&action.item?.system.weaponFeatures?.some(f=>f.value==='deflecting'&&f.actionIds?.includes(action.id))){
   ui.notifications.info('Deflecting is offered before an incoming attack rolls.');return false;
  }
 });
}
