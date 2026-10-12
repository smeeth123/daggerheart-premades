import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {absorbingWrites} from './armor-absorbing.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
import {ROUSING_KEY,ROUSING_ACTION} from './rousing-strike-data.js';
const QUERY=ID+'.rousingStrike',PROMPT=QUERY+'Prompt',WRAP=Symbol.for(QUERY),pending=new Set();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actionFor=item=>item?.system.actions?.get?.(ROUSING_ACTION)??item?.system.actions?.[ROUSING_ACTION];
export function rousingItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID],s=i.system,a=actionFor(i);return i.type==='domainCard'&&featureActive(i)&&!f?.disabled&&(!s?.inVault||s.vaultActive)&&!s?.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===ROUSING_KEY&&a?.uses?.recovery==='shortRest'&&Number(a.uses.max)===1&&Number(a.uses.value??0)===0;})??null:null;}
export function rousingAttack(message){const d=message?.system;return Boolean(d?.action?.type==='attack'&&d.action.actionType!=='reaction'&&d.actionType!=='reaction'&&d.roll?.options?.actionType!=='reaction'&&d.hasRoll!==false&&d.roll?._evaluated!==false&&Number.isFinite(d.roll?.total)&&d.roll.isCritical===true);}
export function rousingBenefits(actor){if(actor?.type!=='character'||unavailableActor(actor))return [];const resources=actor.system?.resources;return ['hitPoints','stress'].filter(k=>Number(resources?.[k]?.value)>0);}
export function rousingRecipients(actor){return [...new Map([actor,...game.actors.party?.system?.partyMembers??[]].filter(a=>rousingBenefits(a).length).map(a=>[a.uuid,a])).values()];}
export async function promptRousing(data,{user}){
 if(!user?.isGM||!user.active)return false;
 if(data.mode==='activate'){const actor=await fromUuid(data.actorUuid);if(!actor?.testUserPermission(game.user,'OWNER')||rousingItem(actor)?.uuid!==data.itemUuid)return false;
  return timedDialog('Rousing Strike — '+actor.name,`<p>Use your once-per-rest Rousing Strike? You are included automatically. Select allies who can <strong>see or hear you</strong>.</p>${data.allies.map(a=>`<label class="form-group"><input type="checkbox" name="rousingAlly" value="${esc(a.uuid)}" data-dhp-token="${esc(a.uuid)}"><span>${esc(a.name)}</span></label>`).join('')}<p>Each owner chooses 1 HP or 1d4 Stress recovery.</p>`,[{action:'use',label:'Use Rousing Strike',callback:(_e,_b,d)=>({allies:[...d.element.querySelectorAll('[name="rousingAlly"]:checked')].map(e=>e.value)})},{action:'decline',label:'Decline',default:true,callback:()=>false}]);
 }
 if(data.mode!=='benefits'||!Array.isArray(data.rows)||!data.rows.length)return false;
 for(const row of data.rows){const actor=await fromUuid(row.uuid);if(!actor?.testUserPermission(game.user,'OWNER'))return false;}
 return timedDialog('Rousing Strike — '+data.sourceName,`<p>Choose your recovery.</p>${data.rows.map((row,i)=>`<div class="form-group"><label>${esc(row.name)}</label><select data-rousing-choice data-index="${i}" data-dhp-token="${esc(row.uuid)}"><option value="">Decline</option>${row.keys.map(k=>`<option value="${k}">${k==='hitPoints'?'Clear 1 HP':'Roll 1d4 — Clear Stress'}</option>`).join('')}</select></div>`).join('')}`,[{action:'apply',label:'Apply Choices',callback:(_e,_b,d)=>[...d.element.querySelectorAll('[data-rousing-choice]')].map(e=>({actorUuid:data.rows[Number(e.dataset.index)]?.uuid,choice:e.value}))},{action:'decline',label:'Decline All',default:true,callback:()=>false}]);
}
export async function grantRousing(actor,choice,message,valid=()=>true,rollDie=async()=>new Roll('1d4').evaluate()){
 return withHopeLock(actor.uuid,async()=>{if(!valid()||!rousingBenefits(actor).includes(choice))return null;let amount=1;
  if(choice==='stress'){const roll=await rollDie();amount=Number(roll.total);if(!Number.isInteger(amount)||amount<1||amount>4)throw Error('Rousing Strike produced an invalid d4.');
   try{const card=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),whisper:[...message.whisper??[]],blind:Boolean(message.blind),flags:{[ID]:{unshakeableRoll:true}},flavor:'<strong>Rousing Strike — Stress recovery</strong>'});if(card&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(card.id);}catch(error){console.warn(ID+' | Rousing Strike dice notification',error);}
  }
  if(!valid()||!rousingBenefits(actor).includes(choice))return null;const before=Number(actor.system.resources[choice].value),expected=Math.max(0,before-amount);
  await absorbingWrites(actor,()=>actor.takeHealing({resources:{[choice]:{total:amount}}}));const after=Number(actor.system.resources[choice].value);if(after!==expected)throw Error('Rousing Strike recovery could not be confirmed for '+actor.name+'.');return {actorUuid:actor.uuid,name:actor.name,choice,cleared:before-after,rolled:amount};
 });
}
export async function resolveRousing(request,{user},ask=promptRousing,grant=grantRousing){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(185000)||pending.has(request.messageUuid))return false;
 const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor,item=rousingItem(actor);
 const valid=()=>game.user.isActiveGM&&user.active&&actor?.testUserPermission(user,'OWNER')&&rousingAttack(message)&&rousingItem(actor)?.uuid===item?.uuid&&decisionNow()<=request.deadline;
 if(!item||!valid()||message.flags?.[ID]?.rousingOffered)return false;pending.add(message.uuid);
 try{
  const recipients=rousingRecipients(actor);if(!recipients.length)return false;await message.setFlag(ID,'rousingOffered',true);if(message.flags?.[ID]?.rousingOffered!==true)throw Error('Could not save Rousing Strike offer.');
  const owner=ownerFor(actor,[...game.users],game.user),data={mode:'activate',actorUuid:actor.uuid,itemUuid:item.uuid,allies:recipients.filter(a=>a.uuid!==actor.uuid).map(a=>({uuid:a.uuid,name:a.name}))};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted||!Array.isArray(accepted.allies)||new Set(accepted.allies).size!==accepted.allies.length||accepted.allies.some(uuid=>!data.allies.some(a=>a.uuid===uuid))||!owner.active||!actor.testUserPermission(owner,'OWNER')||!valid())return false;
  const chosen=recipients.filter(a=>a.uuid===actor.uuid||accepted.allies.includes(a.uuid)),groups=new Map();
  for(const ally of chosen){const recipientOwner=ownerFor(ally,[...game.users],game.user);if(!groups.has(recipientOwner.id))groups.set(recipientOwner.id,{owner:recipientOwner,rows:[]});groups.get(recipientOwner.id).rows.push({uuid:ally.uuid,name:ally.name,keys:rousingBenefits(ally)});}
  const choices=[];await Promise.all([...groups.values()].map(async group=>{const data={mode:'benefits',sourceName:actor.name,rows:group.rows},reply=group.owner.isSelf?await ask(data,{user:game.user}):await group.owner.query(PROMPT,data,{timeout:decisionBudget(65000)});if(!Array.isArray(reply)||!group.owner.active)return;const seen=new Set();for(const row of reply){const offered=group.rows.find(a=>a.uuid===row?.actorUuid),ally=chosen.find(a=>a.uuid===row?.actorUuid);if(!offered||seen.has(row.actorUuid)||!offered.keys.includes(row.choice)||!ally?.testUserPermission(group.owner,'OWNER'))continue;seen.add(row.actorUuid);choices.push({actor:ally,choice:row.choice,owner:group.owner});}}));
  return await withHopeLock(item.uuid,async()=>{
   if(!valid()||!owner.active||!actor.testUserPermission(owner,'OWNER'))return false;
   const eligible=row=>row.owner.active&&row.actor.testUserPermission(row.owner,'OWNER')&&rousingRecipients(actor).some(a=>a.uuid===row.actor.uuid)&&rousingBenefits(row.actor).includes(row.choice),selected=choices.filter(eligible);if(!selected.length)return false;
   await message.setFlag(ID,'rousingApplied',{state:'committing',itemUuid:item.uuid,recipients:selected.map(r=>r.actor.uuid)});if(message.flags?.[ID]?.rousingApplied?.state!=='committing')throw Error('Could not reserve Rousing Strike resolution.');
   const spent=await item.update({['system.actions.'+ROUSING_ACTION+'.uses.value']:1});if(!spent||Number(actionFor(item).uses.value)!==1)throw Error('Rousing Strike rest use could not be confirmed.');
   await syncBeastformAttackAction(message,actor);const applied=[];
   try{for(const row of selected){const result=await grant(row.actor,row.choice,message,()=>game.user.isActiveGM&&user.active&&eligible(row));if(result)applied.push(result);}}finally{await syncBeastformAttackAction(message,actor);}
   await message.setFlag(ID,'rousingApplied',{state:'complete',itemUuid:item.uuid,recipients:applied});
   try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),whisper:[...message.whisper??[]],blind:Boolean(message.blind),content:'<p><strong>Rousing Strike:</strong> '+applied.map(r=>`${esc(r.name)} clears ${r.cleared} ${r.choice==='hitPoints'?'HP':'Stress'}`).join('; ')+'.</p>'});}catch(error){console.warn(ID+' | Rousing Strike notification',error);}return true;
  });
 }finally{pending.delete(message.uuid);}
}
export function installRousing(Action,send){if(!Action||Object.hasOwn(Action,WRAP))return;const native=Action.prototype.use;Action.prototype.use=async function(...args){const observe=this.type==='attack'&&rousingItem(this.actor),result=observe?await absorbingWrites(this.actor,()=>native.apply(this,args)):await native.apply(this,args);if(result?.message&&result.evaluate!==false&&this.type==='attack'&&rousingItem(this.actor))try{await syncBeastformAttackAction(result.message,this.actor);if(rousingAttack(result.message)&&!result.message.flags?.[ID]?.rousingOffered){if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(result.message.id);await send({messageUuid:result.message.uuid,deadline:decisionNow()+decisionBudget(180000)});}}catch(error){console.error(ID+' | Rousing Strike',error);ui.notifications.error('Rousing Strike needs manual recovery/use review: '+error.message+' The completed attack was preserved.');}return result;};Object.defineProperty(Action,WRAP,{value:true});}
export function registerRousing(){CONFIG.queries[QUERY]=resolveRousing;CONFIG.queries[PROMPT]=promptRousing;installRousing(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Rousing Strike needs an active GM.');return gm.isSelf?resolveRousing(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(185000)});});Hooks.on('daggerheart.preUseAction',action=>{if(action.id===ROUSING_ACTION&&rousingItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Rousing Strike is offered automatically after your critical attack.');return false;}});}
