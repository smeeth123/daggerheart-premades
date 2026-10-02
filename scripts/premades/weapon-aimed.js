import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {allied,ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {markReactiveStress} from './stress-payment.js';
import {WEAPON_AIMED_KEY} from './weapon-aimed-data.js';

const QUERY=`${ID}.weaponAimed`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY);
const pending=new Set(),completed=new Set();
const canPay=actor=>Number(actor?.system?.resources?.stress?.value)<Number(actor?.system?.resources?.stress?.max);
export function weaponAimedActive(item){
  return Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===WEAPON_AIMED_KEY&&item.system.weaponFeatures?.some(feature=>feature.value==='aimed'));
}
export function weaponAimedAction(actor,source){
  if(actor?.type!=='character'||unavailableActor(actor)||source?.actor!==actor.uuid)return null;
  const item=actor.items?.get(source.item);
  if(!weaponAimedActive(item))return null;
  const action=item.system.attack?.id===source.action?item.system.attack:
    item.system.actions?.get?.(source.action)??item.system.actionsList?.find(action=>action.id===source.action);
  return action?.type==='attack'&&action.actionType!=='reaction'?action:null;
}
export function weaponAimedPenalty(actor,source,targets){
  if(!weaponAimedAction(actor,source)||!globalThis.canvas?.ready||!Array.isArray(targets)||!targets.length)return false;
  const origin=sourceToken(actor);if(!origin)return false;
  const ranges=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
  const local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
  const limits=canvas.scene.rangeSettings??(ranges.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local:ranges);
  const within=(a,b,key)=>{const limit=Number(limits[key]),distance=a.distanceTo(b);return Number.isFinite(limit)&&limit>=0&&Number.isFinite(distance)&&distance>=0&&distance<=limit;};
  const allies=canvas.tokens.placeables.filter(token=>!token.document.hidden&&allied(origin.document,token.document)&&!unavailableActor(token.actor));
  return targets.some(target=>{
    const token=canvas.tokens.get(target.id);
    if(!token||token.actor?.uuid!==target.actorId||token.document.hidden||unavailableActor(token.actor))return false;
    return within(origin,token,'veryClose')||allies.some(ally=>ally.actor.uuid!==token.actor.uuid&&within(ally,token,'melee'));
  });
}
export function aimedDisadvantage(config){
  if(!config.source?.item||config.actionType==='reaction'||config[ID]?.weaponAimedIgnored)return false;
  const actor=config.data?.parent??foundry.utils.fromUuidSync?.(config.source?.actor);
  return weaponAimedPenalty(actor,config.source,config.targets);
}
export async function promptWeaponAimed(request,{user}){
  const actor=await fromUuid(request.source?.actor);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!canPay(actor)||!weaponAimedPenalty(actor,request.source,request.targets))return false;
  return timedDialog('Aimed',
    '<p>A target is within <strong>Very Close</strong> of you or within <strong>Melee</strong> of an ally. This attack has disadvantage.</p><p>Mark <strong>1 Stress</strong> to ignore Aimed’s penalty for this attack?</p>',[
      {action:'use',label:'Mark 1 Stress',callback:()=>true},
      {action:'decline',label:'Keep Penalty',default:true,callback:()=>false}]);
}
export async function resolveWeaponAimed(request,{user},ask=promptWeaponAimed){
  if(!game.user.isActiveGM||!user?.active||typeof request?.offerId!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.offerId)||request.sceneId!==canvas?.scene?.id)return false;
  const actor=await fromUuid(request.source?.actor),receipt=`${actor?.uuid}:${request.offerId}`;
  const eligible=fresh=>Boolean(user.active&&request.sceneId===canvas?.scene?.id&&fresh.testUserPermission(user,'OWNER')&&weaponAimedPenalty(fresh,request.source,request.targets));
  if(!actor||!eligible(actor)||!canPay(actor)||pending.has(actor.uuid)||completed.has(receipt))return false;
  pending.add(actor.uuid);
  try{
    const owner=ownerFor(actor,[...game.users],game.user);
    const use=owner.isSelf?await ask(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
    completed.add(receipt);if(completed.size>1000)completed.delete(completed.values().next().value);
    return use===true&&owner.active?await markReactiveStress(actor.uuid,fresh=>owner.active&&fresh.testUserPermission(owner,'OWNER')&&eligible(fresh)):false;
  }finally{pending.delete(actor.uuid);}
}
export function installWeaponAimed(Roll,offer){
  if(Object.hasOwn(Roll,WRAPPED))return;
  const configure=Roll.buildConfigure;
  Roll.buildConfigure=async function(config={},...args){
    if(config.source?.item&&config.evaluate!==false&&config.actionType!=='reaction'&&!config[ID]?.weaponAimedOffered){
      const actor=config.data?.parent??foundry.utils.fromUuidSync?.(config.source?.actor);
      if(canPay(actor)&&weaponAimedPenalty(actor,config.source,config.targets)){
        config[ID]={...config[ID],weaponAimedOffered:true};
        const ignored=await offer({source:{...config.source},targets:config.targets.map(target=>({...target})),sceneId:canvas.scene.id,offerId:foundry.utils.randomID()});
        if(ignored===true)config[ID].weaponAimedIgnored=true;
      }
    }
    return configure.call(this,config,...args);
  };
  Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function registerWeaponAimed(){
  CONFIG.queries[QUERY]=resolveWeaponAimed;CONFIG.queries[PROMPT]=promptWeaponAimed;
  installWeaponAimed(CONFIG.Dice.daggerheart.DualityRoll,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Aimed needs an active GM.');
    return gm.isSelf?resolveWeaponAimed(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(75000)});
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    if(weaponAimedActive(action.item)&&action.item.system.weaponFeatures.some(feature=>feature.value==='aimed'&&feature.actionIds?.includes(action.id))){
      ui.notifications.info('Make an attack with this weapon. Aimed will check the penalty and offer to ignore it before the roll.');return false;
    }
  });
}
