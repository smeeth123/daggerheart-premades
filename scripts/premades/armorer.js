import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {unavailableActor} from './aura-rules.js';
import {ARMORER_KEY,ARMORER_ACTION} from './armorer-data.js';
const WRAP=Symbol.for(ID+'.armorer'),running=new Map();
const keyed=item=>item?.type==='domainCard'&&(item.flags?.[ID]?.applied?.key??item.flags?.[ID]?.premade?.key)===ARMORER_KEY;
export function armorerItem(actor){return actor?.type==='character'?actor.items?.find(i=>keyed(i)&&featureActive(i)&&!i.flags?.[ID]?.disabled&&(!i.system?.inVault||i.system.vaultActive)&&!i.system?.isDomainTouchedSuppressed)??null:null;}
export function armorerSuppressed(effect){if(!effect.flags?.[ID]?.armorer)return false;const item=effect.item??(effect.parent?.type==='domainCard'?effect.parent:null),actor=effect.actor??item?.actor;if(!keyed(item)||!actor)return false;return armorerItem(actor)?.uuid!==item.uuid||actor.system?.armor?.type!=='armor'||actor.system.armor.system?.equipped!==true;}
export function installArmorerEffect(Effect){if(!Effect||Object.hasOwn(Effect,WRAP))return;let proto=Effect.prototype,descriptor;while(proto&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(proto,'isSuppressed');proto=Object.getPrototypeOf(proto);}if(!descriptor?.get)return;Object.defineProperty(Effect.prototype,'isSuppressed',{...descriptor,get(){return descriptor.get.call(this)||armorerSuppressed(this);}});Object.defineProperty(Effect,WRAP,{value:true});}
export function armorerRepairCount(message){return [...message?.system?.moves??[]].filter(m=>['shortRest.moves.repairArmor','longRest.moves.repairArmor'].includes(m.movePath)).length;}
export function tagArmorerDowntime(message){const source=message?.system?.actor,actor=typeof source==='string'?foundry.utils.fromUuidSync(source):source,item=armorerRepairCount(message)?armorerItem(actor):null;if(item&&actor.testUserPermission(game.user,'OWNER'))message.updateSource({['flags.'+ID+'.armorerSource']:{actorUuid:actor.uuid,itemUuid:item.uuid,key:ARMORER_KEY}});}
export function armorerAllies(actor){return [...new Map([...(game.actors.party?.system?.partyMembers??[])].filter(a=>a?.type==='character'&&a.uuid!==actor.uuid&&!unavailableActor(a)).map(a=>[a.uuid,a])).values()];}
export async function resolveArmorer(message){
 if(!game.user.isActiveGM||typeof message?.uuid!=='string')return false;const prior=running.get(message.uuid);if(prior)return prior;
 const operation=withHopeLock('armorer:'+message.uuid,async()=>{
  const proof=message.flags?.[ID]?.armorerSource,count=armorerRepairCount(message),actor=typeof message.system?.actor==='string'?await fromUuid(message.system.actor):message.system?.actor,item=proof?.itemUuid?await fromUuid(proof.itemUuid):null;
  const author=game.users.get?.(message.author?.id??message.user?.id??message.user??message._source?.user),valid=()=>game.user.isActiveGM&&author?.active&&actor?.type==='character'&&actor.testUserPermission(author,'OWNER')&&keyed(item)&&item.actor?.uuid===actor.uuid&&proof?.actorUuid===actor.uuid&&proof?.key===ARMORER_KEY;
  if(!valid()||count<1||count>10||message.flags[ID].armorerRecovery)return false;
  const recipients=armorerAllies(actor).filter(a=>Number(a.system?.armorScore?.value)>0),receipt={state:'committing',source:actor.uuid,count,recipients:recipients.map(a=>a.uuid),completed:[]};
  await message.setFlag(ID,'armorerRecovery',receipt);if(message.flags?.[ID]?.armorerRecovery?.state!=='committing')throw Error('Armorer recovery receipt could not be saved.');
  const summaries=[];
  for(const ally of recipients)await withHopeLock(ally.uuid,async()=>{
   if(!valid()||!armorerAllies(actor).some(a=>a.uuid===ally.uuid))return;
   const before=Number(ally.system.armorScore?.value),amount=Math.min(count,Math.max(0,before));if(!amount)return;
   await ally.system.updateArmorValue({value:-amount});const cleared=before-Number(ally.system.armorScore.value);if(cleared!==amount)throw Error('Armorer recovery could not be confirmed for '+ally.name+'.');
   receipt.completed.push(ally.uuid);summaries.push(`${String(ally.name??'Ally').replace(/[<>&]/g,'')} clears ${cleared} Armor ${cleared===1?'Slot':'Slots'}`);await message.setFlag(ID,'armorerRecovery',{...receipt});
  });
  await message.setFlag(ID,'armorerRecovery',{...receipt,state:'complete'});
  if(summaries.length)try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:'<p><strong>Armorer:</strong> '+summaries.join('; ')+'.</p>',whisper:[...(message.whisper??[])],blind:Boolean(message.blind)});}catch(error){console.warn(ID+' | Armorer notification',error);}return true;
 });running.set(message.uuid,operation);try{return await operation;}finally{if(running.get(message.uuid)===operation)running.delete(message.uuid);}
}
export function registerArmorer(){installArmorerEffect(CONFIG.ActiveEffect?.documentClass??game.system.api.documents?.DhActiveEffect);Hooks.on('preCreateChatMessage',tagArmorerDowntime);Hooks.on('createChatMessage',message=>{if(game.user.isActiveGM&&message.flags?.[ID]?.armorerSource)void resolveArmorer(message).catch(error=>{console.error(ID+' | Armorer',error);ui.notifications.error('Armorer needs manual Armor recovery review: '+error.message+' The downtime choice was preserved.');});});Hooks.on('daggerheart.preUseAction',action=>{if(action.id===ARMORER_ACTION&&armorerItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Armorer clears allies’ Armor Slots automatically when you choose Repair Armor through Take Downtime.');return false;}});}
