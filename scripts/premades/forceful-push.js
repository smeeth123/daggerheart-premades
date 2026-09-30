import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {primaryWeapon} from './menacing-reach.js';
import {meleeLimit} from './kick.js';
import {withHopeLock} from './hope-lock.js';
import {FORCEFUL_PUSH_KEY,FORCEFUL_PUSH_ATTACK,FORCEFUL_PUSH_EFFECT} from './forceful-push-data.js';

const QUERY=`${ID}.forcefulPush`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),pending=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function forcefulPushItem(item){
  const flags=item?.flags?.[ID],system=item?.system;
  return Boolean(item?.actor?.type==='character'&&item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===FORCEFUL_PUSH_KEY);
}
export function prepareForcefulPush(item){
  const actor=item?.actor,weapon=primaryWeapon(actor),origin=sourceToken(actor),targets=[...game.user.targets],target=targets[0];
  if(!forcefulPushItem(item)||!actor.testUserPermission(game.user,'OWNER')||unavailableActor(actor)||!weapon?.system?.attack?.use||
    !origin||targets.length!==1||!target?.actor||target.actor.uuid===actor.uuid||target.document.hidden||unavailableActor(target.actor))return null;
  const distance=origin.distanceTo(target),limit=meleeLimit(canvas.scene);
  if(!Number.isFinite(distance)||distance<0||!Number.isFinite(limit)||limit<0||distance>limit)return null;
  return {itemUuid:item.uuid,itemId:item.id,weaponUuid:weapon.uuid,originUuid:origin.document.uuid,sceneId:canvas.scene.id,
    targetId:target.id,targetUuid:target.document.uuid,targetActorUuid:target.actor.uuid};
}
function confirmedForcefulPush(config){
  const marker=config?.[ID]?.forcefulPush,actor=config.data?.parent,item=actor?.items?.get?.(marker?.itemId);
  const fresh=marker&&prepareForcefulPush(item),targets=config.targets??[];
  return Boolean(fresh&&Object.keys(fresh).every(key=>fresh[key]===marker[key])&&targets.length===1&&
    targets[0].id===marker.targetId&&targets[0].actorId===marker.targetActorUuid&&
    config.source?.item===primaryWeapon(actor)?.id&&config.source?.action===primaryWeapon(actor)?.system?.attack?.id);
}
export function forcefulPushHit(message){
  const marker=message?.flags?.[ID]?.forcefulPush,data=message?.system,action=data?.action,actor=action?.actor;
  const item=actor?.items?.get?.(marker?.itemId),roll=data?.roll,targets=data?.targets??[];
  if(!marker||!forcefulPushItem(item)||item.uuid!==marker.itemUuid||action?.type!=='attack'||action.actionType==='reaction'||
    action.item?.uuid!==marker.weaponUuid||action.id!==action.item?.system?.attack?.id||!Number.isFinite(roll?.total)||
    message.speaker?.scene&&message.speaker.scene!==marker.sceneId)return null;
  // Other post-hit features can append targets; the captured original still decides eligibility.
  const hit=targets.find(target=>target.id===marker.targetId&&target.actorId===marker.targetActorUuid);
  if(!hit)return null;const threshold=Number(hit.difficulty||hit.evasion);
  if(!(roll.isCritical||roll.options?.[ID]?.trueStrike||
    roll.options?.[ID]?.witchsCharm||Number.isFinite(threshold)&&threshold>0&&roll.total>=threshold))return null;
  return {actor,item,hit,marker};
}
export function forcefulPushHope(message){
  if(!forcefulPushHit(message))return false;
  const roll=message.system.roll,serialized=message.rolls?.find(entry=>entry.options?.roll)?.options.roll;
  const duality=roll.result?.duality??serialized?.result?.duality;
  return Boolean(roll.isCritical||duality===1||duality==null&&Number(roll.hope?.value??serialized?.hope?.value)>Number(roll.fear?.value??serialized?.fear?.value));
}
export function addForcefulPushBonus(roll,config){
  const message=game.messages.get(config.source?.message);
  if(config.hasHealing||!config.damageFormula||!forcefulPushHope(message)){
    if(config.bonusEffects)delete config.bonusEffects[FORCEFUL_PUSH_KEY];return null;
  }
  const effect={name:'Forceful Push (+1d6)',description:'Successful primary-weapon attack with Hope.',selected:true,changes:[],dice:'1d6'};
  config.bonusEffects??={};config.bonusEffects[FORCEFUL_PUSH_KEY]=effect;roll.options.bonusEffects=config.bonusEffects;return effect;
}
async function vulnerableState(message){
  const state=forcefulPushHit(message);if(!state||unavailableActor(state.actor))return null;
  const token=await fromUuid(state.marker.targetUuid),origin=await fromUuid(state.marker.originUuid),target=token?.actor;
  const hp=target?.system?.resources?.hitPoints;
  if(token?.id!==state.hit.id||target?.uuid!==state.hit.actorId||token.parent?.id!==state.marker.sceneId||
    origin?.actor?.uuid!==state.actor.uuid||origin.parent?.id!==state.marker.sceneId||token.hidden||unavailableActor(target)||
    target.statuses?.has('vulnerable')||target.system?.rules?.conditionImmunities?.vulnerable||hp&&Number(hp.value)>=Number(hp.max))return null;
  return {...state,target};
}
export async function promptForcefulPush(data,{user}){
  const actor=await fromUuid(data.actorUuid),item=actor?.items?.get?.(data.itemId);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!forcefulPushItem(item)||!(Number(actor.system.resources?.hope?.value)>=1))return false;
  return Boolean(await timedDialog(`Forceful Push — ${actor.name}`,
    `<p>You hit <strong>${esc(data.targetName)}</strong>. Move them to Close range manually.</p><p>Spend <strong>1 Hope</strong> to make them temporarily <strong>Vulnerable</strong>?</p>`,[
      {action:'use',label:'Spend 1 Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveForcefulPush(request,{user},ask=promptForcefulPush){
  if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||pending.has(request.messageUuid)||
    !Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  pending.add(request.messageUuid);
  try{
    const message=await fromUuid(request.messageUuid),state=await vulnerableState(message);
    if(!state||!state.actor.testUserPermission(user,'OWNER')||!(Number(state.actor.system.resources?.hope?.value)>=1)||
      !state.item.effects?.get?.(FORCEFUL_PUSH_EFFECT)||message.flags?.[ID]?.forcefulPushOffered)return false;
    await message.setFlag(ID,'forcefulPushOffered',true);
    const owner=ownerFor(state.actor,[...game.users],game.user),data={actorUuid:state.actor.uuid,itemId:state.item.id,targetName:state.target.name};
    const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(accepted!==true)return false;
    return await withHopeLock(state.actor.uuid,async()=>{
      const fresh=await vulnerableState(message);
      if(!fresh||fresh.item.uuid!==state.item.uuid||fresh.target.uuid!==state.target.uuid||fresh.marker.targetUuid!==state.marker.targetUuid||!game.user.isActiveGM||
        !owner.active||!user.active||!fresh.actor.testUserPermission(user,'OWNER')||!fresh.actor.testUserPermission(owner,'OWNER')||
        request.deadline<=decisionNow()||message.flags?.[ID]?.forcefulPushPaid)return false;
      const effect=fresh.item.effects?.get?.(FORCEFUL_PUSH_EFFECT),hope=Number(fresh.actor.system.resources?.hope?.value);
      if(!effect||!(hope>=1))return false;
      const paid=await fresh.actor.update({'system.resources.hope.value':hope-1});
      if(!paid||Number(fresh.actor.system.resources.hope.value)!==hope-1)throw Error('Forceful Push could not spend Hope.');
      const before=new Set([...fresh.target.effects].map(effect=>effect.id));
      try{
        await game.system.api.fields.ActionFields.EffectsField.applyEffect(effect,fresh.target);
        if(![...fresh.target.effects].some(applied=>!before.has(applied.id)&&applied.origin===effect.uuid&&!applied.disabled&&applied.statuses?.has('vulnerable')))
          throw Error('The Vulnerable effect was not created.');
      }catch(error){await fresh.actor.update({'system.resources.hope.value':hope});throw error;}
      const record={actorUuid:fresh.actor.uuid,targetUuid:fresh.target.uuid,tokenUuid:fresh.marker.targetUuid};
      await message.setFlag(ID,'forcefulPushPaid',record);
      await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:fresh.actor}),content:
        `<p><strong>Forceful Push:</strong> ${esc(fresh.actor.name)} spends 1 Hope; ${esc(fresh.target.name)} becomes temporarily Vulnerable.</p>`});
      return record;
    });
  }finally{pending.delete(request.messageUuid);}
}
export function installForcefulPush(Action,Duality,Damage,dispatch){
  if(!Action[WRAPPED]){
    const native=Action.prototype.use;
    Action.prototype.use=async function(event,options={},...rest){
      if(this.id!==FORCEFUL_PUSH_ATTACK||!forcefulPushItem(this.item))return native.call(this,event,options,...rest);
      const marker=prepareForcefulPush(this.item);
      if(!marker){ui.notifications.warn('Forceful Push requires an equipped primary weapon and one living target within Melee range.');return;}
      // Delegate to the real weapon, never forge a weapon action or damage source.
      const config=await primaryWeapon(this.actor).system.attack.use(event,{...options,[ID]:{...options[ID],forcefulPush:marker}},...rest);
      if(config?.message&&forcefulPushHit(config.message)&&Number(this.actor.system.resources?.hope?.value)>=1){
        try{
          if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);
          await dispatch({messageUuid:config.message.uuid,deadline:decisionNow()+decisionBudget(120000)});
        }catch(error){console.error(`${ID} | Forceful Push`,error);ui.notifications.error(`Forceful Push Vulnerable failed: ${error.message}. The completed weapon attack was preserved.`);}
      }
      return config;
    };Object.defineProperty(Action,WRAPPED,{value:true});
  }
  if(!Duality[WRAPPED]){
    const native=Duality.buildConfigure,build=Duality.build;
    Duality.buildConfigure=async function(config,...args){
      const roll=await native.call(this,config,...args);
      if(roll&&config[ID]?.forcefulPush&&!confirmedForcefulPush(config)){
        ui.notifications.warn('Forceful Push target, range or primary weapon changed. Attack canceled without spending resources.');return null;
      }return roll;
    };
    Duality.build=async function(config,...args){
      const result=await build.call(this,config,...args),marker=result?.[ID]?.forcefulPush;
      if(result?.message&&result.evaluate!==false&&Number.isFinite(result.roll?.total)&&marker&&
        result.data?.parent?.items?.get?.(result.source?.item)?.uuid===marker.weaponUuid){
        // Finish shared reroll decisions and persist before native DamageField (order 20).
        // Using build also covers actions whose native workflow was cached before ready.
        try{
          await result.message.setFlag(ID,'forcefulPush',marker);
          if(JSON.stringify(result.message.flags?.[ID]?.forcefulPush)!==JSON.stringify(marker))throw Error('Attack marker was not saved.');
        }catch(error){
          console.error(`${ID} | Forceful Push attack marker`,error);
          ui.notifications.error('Forceful Push could not mark the attack. Its native workflow was preserved; add the Hope d6 and apply optional Vulnerable manually.');
        }
      }return result;
    };Object.defineProperty(Duality,WRAPPED,{value:true});
  }
  if(!Damage[WRAPPED]){
    const native=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus;
    Damage.createRollInstance=function(config){const roll=native.call(this,config);addForcefulPushBonus(roll,config);return roll;};
    Damage.prototype.applyBaseBonus=function(part){const result=bonus.call(this,part),effect=this.options.bonusEffects?.[FORCEFUL_PUSH_KEY];
      if(part.applyTo==='hitPoints'&&!this.options.hasHealing&&effect?.selected)result.push({label:'Forceful Push',value:'1d6'});return result;};
    Object.defineProperty(Damage,WRAPPED,{value:true});
  }
}
export function registerForcefulPush(){
  CONFIG.queries[QUERY]=resolveForcefulPush;CONFIG.queries[PROMPT]=promptForcefulPush;
  installForcefulPush(game.system.api.data.actions.actionsTypes.base,CONFIG.Dice.daggerheart.DualityRoll,
    CONFIG.Dice.daggerheart.DamageRoll,request=>{
      const gm=game.users.activeGM;if(!gm)throw Error('Forceful Push needs an active GM.');
      return gm.isSelf?resolveForcefulPush(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
    });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const state=forcefulPushHit(message);if(!message.isContentVisible||!state||html.querySelector('.dhp-forceful-push'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-forceful-push';
    note.textContent=`Forceful Push: move ${state.hit.name??'the target'} to Close manually.${forcefulPushHope(message)?' +1d6 damage with Hope.':''}`;
    html.querySelector('.message-content')?.append(note);
  });
}
