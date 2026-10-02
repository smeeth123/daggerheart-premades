import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {WEAPON_RICOCHET_KEY} from './weapon-ricochet-data.js';

const QUERY=`${ID}.weaponRicochet`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY);
const pending=new Set(),completed=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canPay=actor=>Number(actor?.system?.resources?.stress?.value)<Number(actor?.system?.resources?.stress?.max);
export function weaponRicochetActive(item){
  return Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===WEAPON_RICOCHET_KEY&&item.system.weaponFeatures?.some(feature=>feature.value==='ricochet'));
}
export function weaponRicochetAction(actor,source){
  if(actor?.type!=='character'||unavailableActor(actor)||source?.actor!==actor.uuid)return null;
  const item=actor.items?.get(source.item);
  if(!weaponRicochetActive(item))return null;
  const action=item.system.attack?.id===source.action?item.system.attack:
    item.system.actions?.get?.(source.action)??item.system.actionsList?.find(action=>action.id===source.action);
  return action?.type==='attack'&&action.actionType!=='reaction'?action:null;
}
export function weaponRicochetTargets(action,targets){
  if(!canvas?.ready||!targets?.length||!targets.every(target=>canvas.tokens.get(target.id)?.actor?.uuid===target.actorId))return [];
  const first=canvas.tokens.get(targets[0].id);
  if(first.document.hidden||unavailableActor(first.actor))return [];
  const ranges=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
  const local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
  const limit=Number(ranges.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:ranges.veryClose);
  if(!Number.isFinite(limit)||limit<0)return [];
  const excluded=new Set(targets.map(target=>target.actorId));excluded.add(action.actor.uuid);
  const candidates=[];
  for(const token of canvas.tokens.placeables){
    const actor=token.actor,hp=actor?.system?.resources?.hitPoints;
    if(!['character','adversary','companion'].includes(actor?.type)||excluded.has(actor.uuid)||token.document.hidden||unavailableActor(actor)||
      hp&&Number(hp.value)>=Number(hp.max))continue;
    const distance=first.distanceTo(token);
    if(!Number.isFinite(distance)||distance<0||distance>limit)continue;
    excluded.add(actor.uuid);candidates.push(token);
  }
  return candidates;
}
export async function promptWeaponRicochet(request,{user}){
  const actor=await fromUuid(request.source?.actor),action=weaponRicochetAction(actor,request.source);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!action||!canPay(actor))return null;
  const targets=weaponRicochetTargets(action,request.targets);
  if(!targets.length)return null;
  return timedDialog(`Ricochet — ${action.item.name}`,
    '<p>Mark <strong>1 Stress</strong> to add one creature within <strong>Very Close of the first target</strong> to this attack.</p>'+
    `<select name="ricochetTarget" aria-label="Additional target" style="width:100%">${targets.map(token=>`<option value="${esc(token.id)}">${esc(token.name)}</option>`).join('')}</select>`,[
      {action:'use',label:'Mark 1 Stress',callback:(_event,_button,dialog)=>dialog.element.querySelector('[name="ricochetTarget"]').value},
      {action:'decline',label:'Decline',default:true,callback:()=>null}]);
}
export async function resolveWeaponRicochet(request,{user},ask=promptWeaponRicochet){
  if(!game.user.isActiveGM||!user?.active||typeof request?.offerId!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.offerId)||request.sceneId!==canvas?.scene?.id)return null;
  const actor=await fromUuid(request.source?.actor),action=weaponRicochetAction(actor,request.source),receipt=`${actor?.uuid}:${request.offerId}`;
  const candidates=action?weaponRicochetTargets(action,request.targets).map(token=>({id:token.id,actorUuid:token.actor.uuid})):[];
  if(!action||!actor.testUserPermission(user,'OWNER')||!canPay(actor)||!candidates.length||pending.has(actor.uuid)||completed.has(receipt))return null;
  pending.add(actor.uuid);
  try{
    const owner=ownerFor(actor,[...game.users],game.user),data={source:request.source,targets:request.targets};
    const targetId=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    completed.add(receipt);if(completed.size>1000)completed.delete(completed.values().next().value);
    const current=weaponRicochetAction(actor,request.source),target=current&&weaponRicochetTargets(current,request.targets).find(token=>token.id===targetId);
    if(!target||!candidates.some(candidate=>candidate.id===target.id&&candidate.actorUuid===target.actor.uuid)||!owner.active)return null;
    const eligible=fresh=>{
      const action=weaponRicochetAction(fresh,request.source);
      return Boolean(user.active&&owner.active&&request.sceneId===canvas?.scene?.id&&fresh.testUserPermission(user,'OWNER')&&action&&
        weaponRicochetTargets(action,request.targets).some(token=>token.id===targetId&&token.actor.uuid===target.actor.uuid));
    };
    const formatted=game.system.api.fields.ActionFields.TargetField.formatTarget.call(current,target);
    return await markReactiveStress(actor.uuid,eligible)?formatted:null;
  }finally{pending.delete(actor.uuid);}
}
export function installWeaponRicochet(Roll,offer){
  if(Object.hasOwn(Roll,WRAPPED))return;
  const configure=Roll.buildConfigure;
  Roll.buildConfigure=async function(config,...args){
    const roll=await configure.call(this,config,...args);
    if(!roll||roll._evaluated||config.evaluate===false||config.actionType==='reaction'||config[ID]?.weaponRicochetOffered)return roll;
    const actor=config.data?.parent??foundry.utils.fromUuidSync?.(config.source?.actor),action=weaponRicochetAction(actor,config.source);
    if(!action||!canPay(actor)||!weaponRicochetTargets(action,config.targets).length)return roll;
    config[ID]={...config[ID],weaponRicochetOffered:true};
    const target=await offer({source:config.source,targets:config.targets,sceneId:canvas.scene.id,offerId:foundry.utils.randomID()});
    if(target&&!config.targets.some(entry=>entry.actorId===target.actorId))config.targets.push(target);
    return roll;
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function registerWeaponRicochet(){
  CONFIG.queries[QUERY]=resolveWeaponRicochet;CONFIG.queries[PROMPT]=promptWeaponRicochet;
  installWeaponRicochet(CONFIG.Dice.daggerheart.DualityRoll,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Ricochet needs an active GM.');
    return gm.isSelf?resolveWeaponRicochet(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(75000)});
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    if(weaponRicochetActive(action.item)&&action.item.system.weaponFeatures.some(feature=>feature.value==='ricochet'&&feature.actionIds?.includes(action.id))){
      ui.notifications.info('Make an attack with this weapon. Ricochet will offer an additional target before the roll.');return false;
    }
  });
}
