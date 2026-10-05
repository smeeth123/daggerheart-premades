import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {ARMOR_HOPEFUL_KEY} from './armor-hopeful-data.js';
const QUERY=`${ID}.hopePayment`,PROMPT=`${QUERY}Prompt`,REFUND=`${QUERY}Refund`,PLAN=`${QUERY}Plan`,receipts=new Map(),committed=new Map();
const spendObservers=new Map();
export function onHopeSpent(key,callback){spendObservers.set(key,callback);}
// Optional consequences cannot hold up a payment or nest its actor resource lock.
// Observers receive the actual receipt, so refunds can invalidate queued offers.
export function reportHopeSpent(actor,receipt){if(!(receipt?.hope>0))return;for(const callback of spendObservers.values())Promise.resolve().then(()=>callback(actor,receipt)).catch(error=>console.warn(`${ID} | Hope spend observer`,error));}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class HopePaymentCanceled extends Error{constructor(message='Hopeful payment canceled.'){super(message);this.code='DHP_HOPE_PAYMENT_CANCELED';}}
export const isHopePaymentCancellation=error=>error?.code==='DHP_HOPE_PAYMENT_CANCELED';
export function hopefulArmor(actor){const item=actor?.system?.armor;return actor?.type==='character'&&item?.type==='armor'&&item.system.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===ARMOR_HOPEFUL_KEY&&item.system.armorFeatures?.some(f=>f.value==='hopeful')?item:null;}
const hopeValue=actor=>Math.max(0,Number(actor?.system?.resources?.hope?.value)||0);
export function hopefulSlots(actor){const score=actor?.system?.armorScore;if(!hopefulArmor(actor)||!Number.isSafeInteger(Number(score?.value))||!Number.isSafeInteger(Number(score?.max))||Number(score.value)<0)return 0;return Math.max(0,Number(score.max)-Number(score.value));}
export function hopeCapacity(actor){return hopeValue(actor)+hopefulSlots(actor);}
export function canSpendHope(actor,count=1){return Number.isSafeInteger(count)&&count>=0&&hopeCapacity(actor)>=count;}
export async function promptHopePayment(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!hopefulArmor(actor)||!canSpendHope(actor,data.count))return null;const min=Math.max(0,data.count-hopeValue(actor)),max=Math.min(data.count,hopefulSlots(actor)),buttons=[];
  for(let armor=min;armor<=max;armor++){const hope=data.count-armor;buttons.push({action:`armor${armor}`,label:armor===0?`Spend ${hope} Hope`:hope===0?`Mark ${armor} Armor Slot${armor===1?'':'s'}`:`${hope} Hope + ${armor} Armor Slot${armor===1?'':'s'}`,callback:()=>armor});}
  buttons.push({action:'cancel',label:'Cancel',default:true,callback:()=>null});return timedDialog(`Hopeful — ${actor.name}`,`<p>${esc(data.label||'Ability')} costs <strong>${data.count} Hope</strong>. You can mark an Armor Slot instead of each Hope.</p>`,buttons);
}
export async function chooseHopePayment(actor,count,label='Ability',ask=promptHopePayment){if(!canSpendHope(actor,count))return null;if(!hopefulSlots(actor))return 0;if(!game.user.isActiveGM){const gm=game.users.activeGM;if(!gm)throw Error('Hopeful requires an active GM.');return gm.query(PLAN,{actorUuid:actor.uuid,count,label,deadline:decisionNow()+decisionBudget(120000)},{timeout:decisionBudget(125000)});}const source=hopefulArmor(actor)?.uuid,owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,count,label};const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});return owner.active&&actor.testUserPermission(owner,'OWNER')&&hopefulArmor(actor)?.uuid===source&&Number.isSafeInteger(choice)&&choice>=0&&choice<=count&&hopefulSlots(actor)>=choice&&hopeValue(actor)>=count-choice?choice:null;}
// Prepared changes carry effect/parent references. Receipts must contain only
// persisted data, both for socket serialization and exact refund comparisons.
function armorValue(doc,path){const system=doc?.toObject?.(true)?.system??doc?.system?.toObject?.(true)??doc?.system;return path==='system.changes'?system?.changes:system?.armor?.current;}
function armorSnapshot(actor){return [...new Set([actor.system.armor,...(actor.allApplicableEffects?.()??[])])].filter(d=>d?.uuid&&(d.type==='armor'||d.system?.armorData)).map(d=>{const path=d.type==='armor'?'system.armor.current':'system.changes';return {uuid:d.uuid,path,value:structuredClone(armorValue(d,path))};});}
async function commit(actor,count,armor,id){if(!canSpendHope(actor,count)||!Number.isSafeInteger(armor)||armor<0||armor>count||hopefulSlots(actor)<armor||hopeValue(actor)<count-armor)return false;const source=hopefulArmor(actor)?.uuid,before=armor?armorSnapshot(actor):[],hope=count-armor;
  if(armor){const marked=Number(actor.system.armorScore.value);await actor.system.updateArmorValue({value:armor});if(Number(actor.system.armorScore.value)!==marked+armor)throw Error('Hopeful could not confirm Armor payment. Check Armor before retrying.');}
  const changes=(armor?armorSnapshot(actor):[]).flatMap(after=>{const old=before.find(b=>b.uuid===after.uuid&&b.path===after.path);return old&&JSON.stringify(old.value)!==JSON.stringify(after.value)?[{...after,before:old.value}]:[];});
  const receipt={id,actorUuid:actor.uuid,count,hope,armor,source,changes,paid:true};
  if(hope){const beforeHope=hopeValue(actor),updated=await actor.update({'system.resources.hope.value':beforeHope-hope});if(!updated||hopeValue(actor)!==beforeHope-hope){if(armor)await refundHope(actor,{...receipt,hope:0});throw Error('Could not confirm Hope payment. Check Hope before retrying.');}}
  committed.set(id,{receipt,refunded:false});if(committed.size>2000)committed.delete(committed.keys().next().value);return receipt;
}
export async function spendHope(actor,count,{locked=true,choice,label='Ability',ask=promptHopePayment}={}){
  if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid Hope cost.');
  // Unaffected actors retain the existing awaited payment path and need no GM query.
  if(!hopefulArmor(actor)){const value=hopeValue(actor);if(value<count)throw Error('Not enough Hope.');const updated=await actor.update({'system.resources.hope.value':value-count});if(!updated||hopeValue(actor)!==value-count)throw Error('Could not spend Hope.');const receipt={actorUuid:actor.uuid,hope:count,armor:0,changes:[],paid:true};reportHopeSpent(actor,receipt);return receipt;}
  const id=foundry.utils.randomID();if(!game.user.isActiveGM){const gm=game.users.activeGM;if(!gm)throw Error('Hopeful requires an active GM.');const result=await gm.query(QUERY,{id,actorUuid:actor.uuid,count,choice,label,deadline:decisionNow()+decisionBudget(120000)},{timeout:decisionBudget(125000)});if(!result)throw new HopePaymentCanceled();return result;}
  const armor=choice??await chooseHopePayment(actor,count,label,ask);if(armor===null)throw new HopePaymentCanceled();
  const run=async()=>{const result=await commit(actor,count,armor,id);if(!result)throw Error('Hopeful payment is no longer available.');return result;};return locked?run():withHopeLock(actor.uuid,run);
}
export async function refundHope(actor,receipt){if(!receipt?.paid)return;if(receipt.id&&!game.user.isActiveGM){const gm=game.users.activeGM;if(!gm||!await gm.query(REFUND,{id:receipt.id},{timeout:15000}))throw Error('Hopeful refund needs manual review.');receipt.paid=false;return;}
  const changes=await Promise.all((receipt.changes??[]).map(async change=>({...change,doc:await fromUuid(change.uuid)}))),value=change=>armorValue(change.doc,change.path);
  if(changes.some(change=>!change.doc||JSON.stringify(value(change))!==JSON.stringify(change.value)))throw Error('Hopeful refund needs manual review: Armor changed after payment.');
  for(const change of changes){const updated=await change.doc.update({[change.path]:change.before});if(!updated||JSON.stringify(value(change))!==JSON.stringify(change.before))throw Error('Hopeful could not confirm Armor refund. Check Armor before retrying.');}
  if(receipt.hope){const value=hopeValue(actor),max=Number(actor.system.resources.hope.max),next=Number.isFinite(max)?Math.min(max,value+receipt.hope):value+receipt.hope;const updated=await actor.update({'system.resources.hope.value':next});if(!updated||hopeValue(actor)!==next)throw Error('Could not refund Hope.');}receipt.paid=false;
}
export function registerHopePaymentPlans(){CONFIG.queries[PLAN]=async(request,{user})=>{if(!game.user.isActiveGM||!user?.active||!Number.isSafeInteger(request?.count)||request.count<1||request.count>100||typeof request.label!=='string'||request.label.length>500||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return null;const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!hopefulArmor(actor))return null;return chooseHopePayment(actor,request.count,request.label);};}
export function registerHopePaymentQueries(){
  CONFIG.queries[PROMPT]=promptHopePayment;
  CONFIG.queries[QUERY]=(request,{user})=>{
    if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/ .test(request.id)||!Number.isSafeInteger(request.count)||request.count<1||request.count>100||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
    const key=JSON.stringify([user.id,request.id]),signature=JSON.stringify(request),prior=receipts.get(key);if(prior)return prior.signature===signature?prior.promise:false;
    const promise=(async()=>{const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!hopefulArmor(actor))return false;
      const source=hopefulArmor(actor).uuid,choice=request.choice??await chooseHopePayment(actor,request.count,request.label);if(choice===null||request.deadline<decisionNow())return false;
      return withHopeLock(actor.uuid,()=>user.active&&actor.testUserPermission(user,'OWNER')&&hopefulArmor(actor)?.uuid===source?commit(actor,request.count,choice,request.id):false);
    })();receipts.set(key,{signature,promise});if(receipts.size>2000)receipts.delete(receipts.keys().next().value);return promise;
  };
  CONFIG.queries[REFUND]=async(request,{user})=>{const record=committed.get(request?.id),actor=record?await fromUuid(record.receipt.actorUuid):null;if(!game.user.isActiveGM||!user?.active||!actor?.testUserPermission(user,'OWNER')||record.refunded)return false;
    return withHopeLock(actor.uuid,async()=>{if(record.refunded)return false;record.refunded=true;await refundHope(actor,record.receipt);return true;});};
}
