import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {allied,ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {whirlwindRange as veryCloseLimit} from './whirlwind.js';
import {loyalPacket,redirectedLoyalPacket} from './loyal-protector.js';
import {markReactiveStress} from './stress-payment.js';
import {withHopeLock} from './hope-lock.js';
import {SHIELD_KEY} from './i-am-your-shield-data.js';

const QUERY=`${ID}.iAmYourShield`,PROMPT=`${QUERY}Prompt`,ARMOR=`${QUERY}Armor`,WRAPPED=Symbol.for(QUERY);
const receipts=new Map(),armorContexts=new Map(),actorContexts=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function alive(actor){
  const hp=actor?.system?.resources?.hitPoints;
  return !unavailableActor(actor)&&(!hp||Number(hp.value)<Number(hp.max));
}
export function shieldItem(actor){
  if(actor?.type!=='character'||!alive(actor))return null;
  return actor.items?.find(item=>{const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&
      !system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===SHIELD_KEY;
  })??null;
}
const canPay=actor=>Number(actor?.system?.resources?.stress?.value)<Number(actor?.system?.resources?.stress?.max);
export function shieldPacket(args){
  const packet=loyalPacket(args),source=packet?.main.options?.[ID]?.friendAttack;
  // Use the shared serialized attack provenance; environmental/resource-only damage is not an attack.
  return typeof source==='string'&&source?packet:null;
}
export function shieldCandidates(target){
  if(!alive(target))return [];
  const victim=sourceToken(target),limit=veryCloseLimit();
  if(!victim||victim.document.hidden||!Number.isFinite(limit)||limit<0)return [];
  const candidates=new Map();
  for(const token of canvas.tokens.placeables){
    const actor=token.actor,item=shieldItem(actor);
    if(!item||!canPay(actor)||token.document.hidden||!allied(token.document,victim.document))continue;
    const distance=token.distanceTo(victim);if(!Number.isFinite(distance)||distance<0||distance>limit)continue;
    // Keep an unambiguous token for each protector, matching the existing source-token helper.
    const origin=sourceToken(actor);if(origin?.document.uuid!==token.document.uuid)continue;
    candidates.set(actor.uuid,{actor,item,tokenUuid:token.document.uuid,victimUuid:victim.document.uuid});
  }
  return [...candidates.values()].sort((a,b)=>a.actor.uuid.localeCompare(b.actor.uuid));
}
export async function promptShield(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!shieldItem(actor)||!canPay(actor))return false;
  return Boolean(await timedDialog(`I Am Your Shield — ${actor.name}`,
    `<p><strong>${esc(data.targetName)}</strong> within Very Close would take attack damage.</p><p>Mark <strong>1 Stress</strong> to take the damage instead? Your own defenses apply, and you can mark <strong>any available Armor Slots</strong> for this attack. Position your token manually.</p>`,[
      {action:'use',label:'Mark Stress & Protect',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveShield(request,{user},ask=promptShield){
  const now=decisionNow();
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||request.id.length>128||typeof request.targetUuid!=='string'||
    !Number.isFinite(request.deadline)||request.deadline<=now||request.deadline>now+decisionBudget(305000))return false;
  for(const [key,receipt]of receipts)if(receipt.expires<now)receipts.delete(key);
  const key=`${user.id}:${request.id}`;if(receipts.has(key))return receipts.get(key).promise;
  const promise=(async()=>{
    const target=await fromUuid(request.targetUuid),packet=shieldPacket(request.packet);
    const source=packet?await fromUuid(packet.main.options[ID].friendAttack):null;
    const authorized=()=>Boolean(user.active&&game.user.isActiveGM&&(user.isGM||target?.testUserPermission(user,'OWNER')||source?.testUserPermission(user,'OWNER')));
    if(!target||!packet||!source||!authorized()||!(target.calculateDamage(packet.main.total,packet.main.options.damageTypes??[])>0))return false;
    for(const candidate of shieldCandidates(target)){
      const valid=()=>{
        if(!authorized()||request.deadline<=decisionNow()||!(target.calculateDamage(packet.main.total,packet.main.options.damageTypes??[])>0))return null;
        return shieldCandidates(target).find(current=>current.actor.uuid===candidate.actor.uuid&&current.item.uuid===candidate.item.uuid&&
          current.tokenUuid===candidate.tokenUuid&&current.victimUuid===candidate.victimUuid)??null;
      };
      if(!valid())continue;
      const owner=ownerFor(candidate.actor,[...game.users],game.user),data={actorUuid:candidate.actor.uuid,targetName:target.name};
      const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
      if(accepted!==true)continue;
      // Serialize redirected damage as well as payment: each native Armor query gets the correct attack-scoped receipt.
      const result=await withHopeLock(`shield-damage:${candidate.actor.uuid}`,async()=>{
        let fresh=valid();if(!fresh||!owner.active||!fresh.actor.testUserPermission(owner,'OWNER'))return false;
        const paid=await markReactiveStress(fresh.actor.uuid,actor=>Boolean(valid()?.actor.uuid===actor.uuid&&owner.active&&actor.testUserPermission(owner,'OWNER')));
        if(!paid)return false;
        const id=foundry.utils.randomID(),context={id,actorUuid:fresh.actor.uuid,deadline:decisionNow()+decisionBudget(300000),used:false};
        armorContexts.set(id,context);
        const redirected=redirectedLoyalPacket(packet,target,fresh.actor);
        redirected.main.options[ID].shieldDamageContext=id;
        try{
          await fresh.actor.takeDamage(redirected,Boolean(request.isDirect));
        }catch(error){
          ui.notifications.error('I Am Your Shield failed after Stress was paid. Check the protector’s damage and resources before retrying.');throw error;
        }finally{armorContexts.delete(id);}
        // Chat is advisory after the actual damage is committed; a chat failure must not damage the ally too.
        try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:fresh.actor}),content:
          `<p><strong>I Am Your Shield:</strong> ${esc(fresh.actor.name)} takes ${esc(target.name)}’s attack damage instead after marking 1 Stress. Position the protecting token manually.</p>`});
        }catch(error){console.error(`${ID} | I Am Your Shield chat`,error);ui.notifications.warn('I Am Your Shield resolved, but its chat notification failed.');}
        return {redirected:true,actorUuid:fresh.actor.uuid};
      });
      if(result)return result;
    }
    return false;
  })();
  receipts.set(key,{promise,expires:now+decisionBudget(600000)});return promise;
}
export function shieldArmorRequest(actorUuid){
  if(!game.user.isActiveGM)return null;
  const id=actorContexts.get(actorUuid),context=armorContexts.get(id);
  return context&&context.deadline>decisionNow()?id:null;
}
export async function resolveShieldArmor(request,{user}){
  const context=armorContexts.get(request?.id);
  if(!game.user.isActiveGM||!user?.active||!context||context.used||context.deadline<=decisionNow()||context.actorUuid!==request.actorUuid)return null;
  const actor=await fromUuid(context.actorUuid);
  if(!actor?.testUserPermission(user,'OWNER')||actorContexts.get(actor.uuid)!==context.id)return null;
  context.used=true;return {id:context.id,actorUuid:actor.uuid};
}
export async function shieldArmorFor(data){
  const id=data?.[ID]?.iAmYourShield;if(typeof id!=='string')return null;
  const gm=game.users.activeGM;if(!gm)return null;
  const request={id,actorUuid:data.actorId};
  return gm.isSelf?resolveShieldArmor(request,{user:game.user}):gm.query(ARMOR,request,{timeout:decisionBudget(15000)});
}
export function configureShieldArmor(dialog,context){
  if(!context||context.actorUuid!==dialog.actor?.uuid)return false;
  // Change only this native dialog's allowance, never actor rules, effects or Armor Score.
  const native=dialog.newMoonBaseDamageInfo??dialog.getDamageInfo.bind(dialog);
  const info=()=>{
    const result=native(),marks=dialog.marks.armor.flatMap(source=>Object.values(source.marks));
    const maxArmorUsed=marks.filter(mark=>!mark.spent&&!mark.disabled).length;
    return {...result,maxArmorUsed,availableArmor:Math.max(0,maxArmorUsed-marks.filter(mark=>mark.selected).length)};
  };
  dialog.marks.stress={};dialog.iAmYourShield=context;
  if(dialog.newMoonBaseDamageInfo)dialog.newMoonBaseDamageInfo=info;else dialog.getDamageInfo=info;
  return true;
}
export function installShield(Actor,dispatch){
  if(Actor[WRAPPED])return;const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(args,...rest){
    const packet=shieldPacket(args);
    if(packet&&shieldCandidates(this).length&&this.calculateDamage(packet.main.total,packet.main.options.damageTypes??[])>0){
      const result=await dispatch({id:foundry.utils.randomID(),targetUuid:this.uuid,packet,isDirect:Boolean(rest[0]),deadline:decisionNow()+decisionBudget(300000)});
      if(result?.redirected)return [];
    }
    const raw=args?.main??args?.damage??args,id=raw?.options?.[ID]?.shieldDamageContext;
    // Serialize only the native damage phase, not decisions on different allies. An
    // unrelated concurrent hit must never borrow an interception's Armor receipt.
    if(game.user.isActiveGM&&(shieldItem(this)||armorContexts.get(id)?.actorUuid===this.uuid||actorContexts.has(this.uuid))){
      return withHopeLock(`shield-native:${this.uuid}`,async()=>{
        const context=armorContexts.get(id);
        if(context?.actorUuid===this.uuid)actorContexts.set(this.uuid,id);
        try{return await native.call(this,args,...rest);}
        finally{if(actorContexts.get(this.uuid)===id)actorContexts.delete(this.uuid);}
      });
    }
    return native.call(this,args,...rest);
  };Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerIAmYourShield(){
  CONFIG.queries[QUERY]=resolveShield;CONFIG.queries[PROMPT]=promptShield;CONFIG.queries[ARMOR]=resolveShieldArmor;
  installShield(CONFIG.Actor.documentClass,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('I Am Your Shield needs an active GM on the target’s scene.');
    return gm.isSelf?resolveShield(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(305000)});
  });
}
