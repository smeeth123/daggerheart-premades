import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { VOLATILE_KEY,VOLATILE_ACTION } from './volatile-magic-data.js';
import { ownerFor } from './aura-rules.js';
import { withHopeLock } from './hope-lock.js';
import { timedDialog } from '../dialog.js';
import { animateInitialDamage } from './combo-strike.js';
import {selectableDamageDice,rerollDamageDice} from './damage-reroll.js';
const QUERY=`${ID}.volatileMagic`,PROMPT=`${ID}.volatilePrompt`,WRAPPED=Symbol.for(`${ID}.volatileMagic`),requests=new Map();
export function volatileItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===VOLATILE_KEY;})??null;}
export function volatileDice(roll){return selectableDamageDice(roll,{excludeCombo:true});}
export function volatileEligible(actor,message,roll){
  return Boolean(volatileItem(actor)&&hopeCapacity(actor)>=3&&message?.system?.action?.type==='attack'&&
    [...(roll?.options?.damageTypes??[])].includes('magical')&&volatileDice(roll).length);
}
export async function promptVolatile(data,{user}){
  const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!volatileItem(actor)||hopeCapacity(actor)<3)return false;
  return timedDialog(`Volatile Magic — ${actor.name}`,`<p>Damage: <strong>${Number(data.total)}</strong>. Spend <strong>3 Hope</strong> to reroll selected dice.</p>${data.dice.map(d=>`<label style="display:inline-block;margin:0.4rem"><input type="checkbox" name="volatileDie" value="${d.id}"> d${Number(d.faces)}: <strong>${Number(d.value)}</strong>${d.discarded?' <em>(discarded)</em>':''}</label>`).join('')}`,[
    {action:'use',label:'Spend 3 Hope',callback:(_e,_b,dialog)=>[...dialog.element.querySelectorAll('[name="volatileDie"]:checked')].map(input=>input.value)},
    {action:'decline',label:'Decline',default:true,callback:()=>false}
  ]);
}
export async function resolveVolatile(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
  if(!actor?.testUserPermission(user,'OWNER')||!volatileItem(actor)||hopeCapacity(actor)<3||message.system.action.type!=='attack')return false;
  if(!Array.isArray(request.dice)||!request.dice.length||request.dice.some(d=>!/^\d+:\d+$/.test(d.id)||!Number.isInteger(d.faces)||!Number.isInteger(d.value)))return false;
  for(const [id,entry]of requests)if(entry.expires<decisionNow())requests.delete(id);
  if(requests.has(request.id))return false;
  requests.set(request.id,{expires:decisionNow()+decisionBudget(300000)});
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,dice:request.dice,total:request.total};
  const selected=owner.isSelf?await promptVolatile(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||!selected.every(id=>request.dice.some(d=>d.id===id))||decisionNow()>request.deadline)return false;
  return withHopeLock(actor.uuid,async()=>{try{let hopePayment;
    if(!volatileItem(actor)||hopeCapacity(actor)<3)return false;
    const next=hopeCapacity(actor)-3,updated=(hopePayment=await spendHope(actor,3));
    if(!updated||!hopePayment)throw new Error('Could not spend Volatile Magic Hope.');
    return selected;
  }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
}
export async function rerollVolatile(roll,selected){
  await rerollDamageDice(roll,selected,{excludeCombo:true});
  roll.options[ID]={...roll.options[ID],volatileMagic:true};
}
export function installVolatile(Damage,offer){
  if(Damage[WRAPPED])return;const native=Damage.buildEvaluate;
  Damage.buildEvaluate=async function(roll,config,...args){
    const result=await native.call(this,roll,config,...args);
    if(!config.hasHealing&&config.damage?.main&&!config.damage.main.options?.[ID]?.volatileMagic)await offer(config);
    return result;
  };Object.defineProperty(Damage,WRAPPED,{value:true});
}
export function registerVolatileMagic(){
  CONFIG.queries[QUERY]=resolveVolatile;CONFIG.queries[PROMPT]=promptVolatile;
  installVolatile(CONFIG.Dice.daggerheart.DamageRoll,async config=>{
    const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor,roll=config.damage.main;
    if(!volatileEligible(actor,message,roll))return;
    await animateInitialDamage(config,message);
    const gm=game.users.activeGM;if(!gm)throw new Error('Volatile Magic needs an active GM.');
    const request={id:foundry.utils.randomID(),messageUuid:message.uuid,dice:volatileDice(roll),total:roll.total,deadline:decisionNow()+decisionBudget(120000)};
    const selected=gm.isSelf?await resolveVolatile(request,{user:game.user}):await gm.query(QUERY,request,{timeout:decisionBudget(125000)});
    if(selected)await rerollVolatile(roll,selected);
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    if(action.id!==VOLATILE_ACTION||volatileItem(action.actor)?.uuid!==action.item?.uuid)return;
    ui.notifications.info('Volatile Magic is offered after rolling magic attack damage.');return false;
  });
}
