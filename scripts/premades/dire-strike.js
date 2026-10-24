import {damageOptions,damageCallOptions} from '../damage-options.js';
import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor} from './aura-rules.js';
import {honedAction} from './honed.js';
import {withHopeLock} from './hope-lock.js';
import {absorbingWrites} from './armor-absorbing.js';
import {canSpendHope,chooseHopePayment,spendHope,isHopePaymentCancellation} from './hope-payment.js';
import {gmFear,withFearLock} from './fear-resource.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
import {DIRE_KEY,DIRE_ACTION} from './dire-strike-data.js';
const QUERY=ID+'.direStrikeDamage',PROMPT=ID+'.direStrikePrompt',WRAP=Symbol.for(QUERY),TAG=Symbol.for(QUERY+'Tag'),requests=new Map();
const REWARD=ID+'.direStrikeFearReward',ROLL=Symbol.for(REWARD);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function direItem(actor){return actor?.type==='character'?actor.items?.find(i=>i.type==='domainCard'&&featureActive(i)&&!i.flags?.[ID]?.disabled&&(!i.system.inVault||i.system.vaultActive)&&!i.system.isDomainTouchedSuppressed&&(i.flags?.[ID]?.applied?.key??i.flags?.[ID]?.premade?.key)===DIRE_KEY)??null:null;}
export function tagDireDamage(config){if(config.hasHealing||!config.damage)return false;const source=config.source,actor=config.data?.parent??foundry.utils.fromUuidSync?.(source?.actor),message=game.messages?.get(source?.message)??config.message,action=message?.system?.action??honedAction(actor,source),item=direItem(actor);if(!item||action?.type!=='attack'||actor.uuid!==source?.actor)return false;
 const prior=config[ID]?.direStrike,record=prior??{id:foundry.utils.randomID(),actorUuid:actor.uuid,itemUuid:item.uuid,source:{actor:source.actor,item:source.item??null,action:source.action},messageUuid:message?.uuid??null,actorAttack:action===actor.system?.attack};
 const parts=[config.damage.main,...Object.values(config.damage.resources??{})].filter(Boolean);if(!parts.some(p=>typeof p==='object'&&p.options))return false;
 for(const part of parts)if(typeof part==='object'&&part.options)part.options[ID]={...part.options[ID],direStrike:record};config[ID]={...config[ID],direStrike:record};
 if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main?.toJSON?.()??null,resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});return true;
}
export function direPacket(packet){const raw=packet?.main??packet?.damage,main=raw?.toJSON?.()??raw,resources=Object.fromEntries(Object.entries(packet?.resources??{}).map(([k,v])=>[k,v?.toJSON?.()??v]));const record=[main,...Object.values(resources)].find(p=>p?.options?.[ID]?.direStrike)?.options[ID].direStrike;
 if(!record||!/^\w{16}$/.test(record.id??'')||typeof record.actorUuid!=='string'||typeof record.itemUuid!=='string'||record.source?.actor!==record.actorUuid||typeof record.source.action!=='string'||!record.source.action)return null;
 if(!(Number.isFinite(main?.total)&&main.total>0)&&!Object.values(resources).some(r=>Number.isFinite(r?.total)&&r.total>0))return null;
 return {packet:structuredClone({main:main??null,resources}),record};
}
async function context(record){const actor=await fromUuid(record.actorUuid),item=direItem(actor);if(!item||item.uuid!==record.itemUuid)return null;const message=record.messageUuid?await fromUuid(record.messageUuid):null;
 const action=message?.system?.source?.actor===actor.uuid?message.system.action:honedAction(actor,record.source);
 if(action?.type!=='attack'||action.actor?.uuid&&action.actor.uuid!==actor.uuid||message&&(message.system.source.item??null)!==record.source.item||message&&message.system.source.action!==record.source.action&&!(record.actorAttack&&action===actor.system.attack))return null;
 return {actor,item,message};
}
export function direHpMarked(target,updates,before){const after=Number(target.system?.resources?.hitPoints?.value);return target.type!=='companion'&&Number.isFinite(before)&&after>before&&Array.isArray(updates)&&updates.some(r=>r.key==='hitPoints'&&!r.clear&&!r.itemId&&Number(r.value)>0);}
export async function promptDire(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!direItem(actor)||!canSpendHope(actor,1)||!(gmFear()>0))return false;return Boolean(await timedDialog('Dire Strike — '+actor.name,`<p><strong>${esc(data.targetName)}</strong> marked HP from your attack.</p><p>Spend <strong>1 Hope</strong> to remove <strong>1 GM Fear</strong>?</p>`,[{action:'use',label:'Spend Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
async function receipt(item,key,status){const rows=item.flags?.[ID]?.direStrikeReceipts??[],next=[...rows.filter(r=>r.key!==key),{key,status}].slice(-512);const updated=await item.update({['flags.'+ID+'.direStrikeReceipts']:next});if(!updated||JSON.stringify(item.flags?.[ID]?.direStrikeReceipts)!==JSON.stringify(next))throw Error('Could not confirm Dire Strike receipt');}
async function repair(state,record){if(state.message&&record.actorAttack)await syncBeastformAttackAction(state.message,state.actor);}
export async function offerDire(record,target,ask=promptDire){const initial=await context(record);if(!initial||!(gmFear()>0)||!canSpendHope(initial.actor,1))return false;
 return withHopeLock(ID+'.direStrikeOffer:'+initial.actor.uuid,async()=>{const state=await context(record);if(!state||!game.user.isActiveGM||!(gmFear()>0)||!canSpendHope(state.actor,1))return false;const key=record.id+':'+target.uuid;if(state.item.flags?.[ID]?.direStrikeReceipts?.some(r=>r.key===key))return false;const deadline=decisionNow()+decisionBudget(120000),owner=ownerFor(state.actor,[...game.users],game.user);
  try{await receipt(state.item,key,'offered');await repair(state,record);const data={actorUuid:state.actor.uuid,targetName:target.name};const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
   const valid=async()=>game.user.isActiveGM&&owner.active&&state.actor.testUserPermission(owner,'OWNER')&&decisionNow()<deadline&&(await context(record))?.item.uuid===state.item.uuid&&canSpendHope(state.actor,1)&&gmFear()>0;
   if(accepted!==true||!await valid()){await receipt(state.item,key,'declined');return false;}
   return await withHopeLock(state.actor.uuid,async()=>{if(!await valid())return false;const choice=await chooseHopePayment(state.actor,1,'Dire Strike');if(choice===null||!await valid())return false;
    return withFearLock(async()=>{if(!await valid())return false;await receipt(state.item,key,'committing');await repair(state,record);if(!await valid())return false;
     try{await spendHope(state.actor,1,{choice,label:'Dire Strike'});}catch(error){if(isHopePaymentCancellation(error))return false;throw error;}
     const before=gmFear();if(!(before>0))throw Error('Hope was spent but GM Fear is no longer available');await ui.resources.updateFear(before-1);if(gmFear()!==before-1)throw Error('Hope was spent but GM Fear reduction was not confirmed');await receipt(state.item,key,'completed');
     try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:state.actor}),content:`<p><strong>Dire Strike:</strong> ${esc(state.actor.name)} spends 1 Hope to drain ${esc(target.name)}. The GM loses 1 Fear.</p>`});}catch(error){console.warn(ID+' | Dire Strike notification',error);}return true;
    });
   });
  }finally{await repair(state,record);}
 });
}
export async function resolveDireDamage(request,{user}){if(!game.user.isActiveGM||!user?.active||!/^\w{16}$/.test(request?.id??'')||typeof request.targetUuid!=='string'||typeof request.isDirect!=='boolean')return null;const parsed=direPacket(request.packet),target=await fromUuid(request.targetUuid),state=parsed&&await context(parsed.record);if(!target||!state||!user.isGM&&!state.actor.testUserPermission(user,'OWNER')&&!target.testUserPermission(user,'OWNER'))return null;const key=user.id+':'+request.id,signature=JSON.stringify(request),prior=requests.get(key);if(prior)return prior.signature===signature?prior.promise:null;const promise=target.takeDamage(parsed.packet,damageCallOptions(request));requests.set(key,{signature,promise});if(requests.size>512)requests.delete(requests.keys().next().value);return promise;}
export function installDire(Damage,Actor,send,ask=promptDire){if(!Object.hasOwn(Damage,TAG)){const evaluate=Damage.buildEvaluate,post=Damage.buildPost;Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagDireDamage(config);return result;};Damage.buildPost=async function(roll,config,...args){tagDireDamage(config);return post.call(this,roll,config,...args);};Object.defineProperty(Damage,TAG,{value:true});}
 if(Object.hasOwn(Actor,WRAP))return;const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(packet,...args){const parsed=direPacket(packet),state=parsed&&await context(parsed.record);if(!state||state.actor.uuid===this.uuid||this.type==='companion')return native.call(this,packet,...args);
  if(!game.user.isActiveGM){const result=await send({id:foundry.utils.randomID(),targetUuid:this.uuid,packet:parsed.packet,...damageOptions(args[0])});if(result===null)throw Error('Dire Strike could not coordinate attack damage; check the pending target before applying again');return result;}
  const completed=await withHopeLock(ID+'.direStrikeDamage:'+this.uuid,async()=>{const before=Number(this.system?.resources?.hitPoints?.value),result=await absorbingWrites(this,()=>native.call(this,packet,...args));return {result,marked:direHpMarked(this,result,before)};});
  if(completed.marked)try{await offerDire(parsed.record,this,ask);}catch(error){console.error(ID+' | Dire Strike',error);ui.notifications.error('Dire Strike needs manual review: '+error.message+'. Target damage was preserved; do not reapply it.');}return completed.result;
 };Object.defineProperty(Actor,WRAP,{value:true});
}
export async function settleDireFear(request,{user}){if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string')return false;const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor,roll=message?.system?.roll;if(!direItem(actor)||!actor.testUserPermission(user,'OWNER')||message.system.action.type!=='attack'||roll?.options?.actionType!=='action'||roll.options.roll?.type==='reaction'||roll.withFear!==true||roll.isCritical||!Number.isFinite(roll.total))return false;
 return withFearLock(async()=>{if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER')||!direItem(actor))return false;const status=message.flags?.[ID]?.direStrikeFearReward;if(status==='completed')return true;if(status)throw Error('Attack Fear reward needs manual review');await message.setFlag(ID,'direStrikeFearReward','committing');if(message.flags?.[ID]?.direStrikeFearReward!=='committing')throw Error('Could not reserve attack Fear reward');const before=gmFear();await ui.resources.updateFear(before+1);if(gmFear()!==before+1)throw Error('Attack Fear reward was not confirmed');await message.setFlag(ID,'direStrikeFearReward','completed');if(message.flags?.[ID]?.direStrikeFearReward!=='completed')throw Error('Could not confirm attack Fear receipt');return true;});
}
// Automatic damage occurs before the native action commits its resource map.
// Settle its already-earned Fear first, so a zero-Fear GM can still lose that
// Fear to Dire Strike. Remove only that pending row; never rerun consequences.
export function installDireFear(Roll,send){if(!Roll||Object.hasOwn(Roll,ROLL))return;const native=Roll.buildPost;Roll.buildPost=async function(roll,config,...args){const result=await native.call(this,roll,config,...args),actor=config.message?.system?.action?.actor,updates=config.resourceUpdates,fear=updates?.get?.('fear');if(config.actionType==='action'&&config.message?.system?.action?.type==='attack'&&direItem(actor)&&fear?.value===1&&fear.enabled!==false&&!fear.itemId&&!fear.clear){try{if(await send({messageUuid:config.message.uuid}))updates.delete('fear');}catch(error){updates.delete('fear');console.error(ID+' | Dire Strike Fear reward',error);ui.notifications.error('The attack completed, but its Fear reward needs manual review. Do not reroll the attack.');}}return result;};Object.defineProperty(Roll,ROLL,{value:true});}
export function registerDireStrike(){CONFIG.queries[QUERY]=resolveDireDamage;CONFIG.queries[PROMPT]=promptDire;CONFIG.queries[REWARD]=settleDireFear;const dispatch=(query,request,timeout)=>{const gm=game.users.activeGM;if(!gm)throw Error('Dire Strike needs an active GM');return gm.isSelf?CONFIG.queries[query](request,{user:game.user}):gm.query(query,request,{timeout});};installDireFear(CONFIG.Dice.daggerheart.DualityRoll,r=>dispatch(REWARD,r,decisionBudget(65000)));installDire(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,request=>dispatch(QUERY,request,decisionBudget(305000)));Hooks.on('daggerheart.preUseAction',action=>{if(action.id===DIRE_ACTION&&direItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Dire Strike is offered automatically after your attack marks target HP.');return false;}});}
