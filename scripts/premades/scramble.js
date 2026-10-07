import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {retributionSource} from './hideous-retribution.js';
import {SCRAMBLE_KEY,SCRAMBLE_ACTION} from './scramble-data.js';
const QUERY=`${ID}.scrambleDamage`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const action=item=>item?.system.actions?.get?.(SCRAMBLE_ACTION)??item?.system.actions?.[SCRAMBLE_ACTION];
export function scrambleItem(actor){
 const hp=actor?.system.resources?.hitPoints;
 if(actor?.type!=='character'||unavailableActor(actor)||Number(hp?.max)>0&&Number(hp.value)>=Number(hp.max))return null;
 return actor.items?.find(item=>{const flags=item.flags?.[ID],s=item.system;return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
  (!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===SCRAMBLE_KEY;})??null;
}
export function scrambleAvailable(actor){const item=scrambleItem(actor),uses=action(item)?.uses;return uses?.recovery==='shortRest'&&Number(uses.max)===1&&Number(uses.value??0)===0?item:null;}
function melee(){
 if(canvas.scene?.rangeSettings)return Number(canvas.scene.rangeSettings.melee);
 const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene?.flags?.daggerheart?.rangeMeasurement;
 return Number(world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.melee:world.melee);
}
export async function scrambleCandidate(actor,packet,tokens=null){
 if(!canvas.ready||!scrambleAvailable(actor)||!bulkyDamagePacket(packet))return null;
 const sourceUuid=retributionSource(packet),source=typeof sourceUuid==='string'?await fromUuid(sourceUuid):null;
 if(!['character','adversary','companion'].includes(source?.type)||source.uuid===actor.uuid)return null;
 const find=(uuid,a)=>canvas.tokens.placeables.find(t=>t.document.uuid===uuid&&t.actor?.uuid===a.uuid);
 const victim=tokens?find(tokens.target,actor):sourceToken(actor),attacker=tokens?find(tokens.source,source):sourceToken(source),limit=melee();
 if(!victim||!attacker||!Number.isFinite(limit)||limit<0)return null;
 const distance=attacker.distanceTo(victim);if(!Number.isFinite(distance)||distance<0||distance>limit)return null;
 return {source,item:scrambleAvailable(actor),tokens:{source:attacker.document.uuid,target:victim.document.uuid}};
}
export async function promptScramble(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||scrambleAvailable(actor)?.uuid!==data.itemUuid)return false;
 return Boolean(await timedDialog(`Scramble — ${actor.name}`,
  '<p>A creature within Melee would deal damage to you. Use <strong>Scramble</strong> to avoid the attack before any damage reduction?</p><p>Afterward, safely move your token out of Melee manually. <strong>Once per rest.</strong></p>',
  [{action:'avoid',label:'Avoid Attack',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function offerScramble(actor,packet,ask=promptScramble){
 const valid=await scrambleCandidate(actor,packet);if(!valid)return false;
 const itemUuid=valid.item.uuid,owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,itemUuid},deadline=decisionNow()+decisionBudget(120000);
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(125000)});
 if(accepted!==true)return false;
 return withHopeLock(itemUuid,async()=>{
  const current=await scrambleCandidate(actor,packet,valid.tokens);
  if(!game.user.isActiveGM||!owner.active||!actor.testUserPermission(owner,'OWNER')||deadline<=decisionNow()||current?.item.uuid!==itemUuid)return false;
  const updated=await current.item.update({[`system.actions.${SCRAMBLE_ACTION}.uses.value`]:1});
  if(!updated||Number(action(current.item)?.uses.value)!==1)throw Error('Scramble could not confirm its use. Check the card before continuing damage.');
  try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Scramble:</strong> ${esc(actor.name)} avoids the attack and takes no damage. Move out of Melee range manually.</p>`});}
  catch(error){console.warn(`${ID} | Scramble notification after avoidance`,error);}
  return true;
 });
}
export async function resolveScrambleDamage(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.actorUuid!=='string'||typeof request.isDirect!=='boolean')return null;
 const key=`${user.id}:${request.id}`,signature=JSON.stringify(request),prior=receipts.get(key);if(prior)return prior.signature===signature?prior.promise:null;
 const promise=(async()=>{const actor=await fromUuid(request.actorUuid),packet=bulkyDamagePacket(request.packet),sourceUuid=retributionSource(packet),source=typeof sourceUuid==='string'?await fromUuid(sourceUuid):null;
  if(!game.user.isActiveGM||!user.active||!scrambleItem(actor)||!packet||(!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER')))return null;
  return actor.takeDamage(packet,request.isDirect);
 })();receipts.set(key,{signature,promise});if(receipts.size>512)receipts.delete(receipts.keys().next().value);return promise;
}
export function installScramble(Actor,dispatch,ask=promptScramble){
 if(Object.hasOwn(Actor,WRAPPED))return;const native=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(packet,...args){
  if(!scrambleAvailable(this)||!bulkyDamagePacket(packet)||!retributionSource(packet))return native.call(this,packet,...args);
  if(!game.user.isActiveGM){const result=await dispatch({id:foundry.utils.randomID(),actorUuid:this.uuid,packet:bulkyDamagePacket(packet),isDirect:Boolean(args[0])});if(result===null)throw Error('Scramble damage coordination failed. Check the pending damage before continuing.');return result;}
  return withHopeLock(`scramble-damage:${this.uuid}`,async()=>await offerScramble(this,packet,ask)?[]:native.call(this,packet,...args));
 };Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerScramble(){
 CONFIG.queries[QUERY]=resolveScrambleDamage;CONFIG.queries[PROMPT]=promptScramble;
 installScramble(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Scramble needs an active GM.');return gm.isSelf?resolveScrambleDamage(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(605000)});});
 Hooks.on('daggerheart.preUseAction',a=>{if(a.id===SCRAMBLE_ACTION&&scrambleItem(a.actor)?.uuid===a.item?.uuid){ui.notifications.info('Scramble is offered automatically before incoming damage reduction.');return false;}});
}
