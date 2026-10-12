import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {absorbingWrites} from './armor-absorbing.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {retributionSource} from './hideous-retribution.js';
import {THORN_KEY,THORN_USE} from './thorn-skin-data.js';
const QUERY=ID+'.thornSkinDamage',PROMPT=QUERY+'Prompt',WRAP=Symbol.for(QUERY),requests=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function melee(){if(canvas.scene?.rangeSettings)return Number(canvas.scene.rangeSettings.melee);const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene?.flags?.daggerheart?.rangeMeasurement;return Number(world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.melee:world.melee);}
export function thornItem(actor){return actor?.type==='character'&&!unavailableActor(actor)&&!(Number(actor.system.resources?.hitPoints?.max)>0&&Number(actor.system.resources.hitPoints.value)>=Number(actor.system.resources.hitPoints.max))?actor.items?.find(i=>{const f=i.flags?.[ID],s=i.system;return i.type==='domainCard'&&featureActive(i)&&!f?.disabled&&(!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===THORN_KEY;})??null:null;}
export function thornTokens(item){const n=Number(item?.system.resource?.value);return Number.isSafeInteger(n)&&n>0?n:0;}
function damaging(actor,packet){return typeof actor.calculateDamage!=='function'||actor.calculateDamage(packet.main.total,Array.from(packet.main.options?.damageTypes??packet.main.damageTypes??[]))>0;}
export async function thornAttacker(actor,packet){
 const sourceUuid=retributionSource(packet),source=sourceUuid?await fromUuid(sourceUuid):null;
 if(!canvas.ready||!source||source.uuid===actor.uuid||!['character','adversary','companion'].includes(source.type))return null;
 const victim=sourceToken(actor),attacker=sourceToken(source),limit=melee();
 if(!victim||!attacker||!Number.isFinite(limit)||limit<0)return null;
 const distance=attacker.distanceTo(victim);return Number.isFinite(distance)&&distance>=0&&distance<=limit?source:null;
}
export async function promptThorn(data,{user}){
 const actor=await fromUuid(data.actorUuid),item=thornItem(actor),max=thornTokens(item);
 if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||item?.uuid!==data.itemUuid||!max)return 0;
 return await timedDialog('Thorn Skin — '+actor.name,`<p>You are taking <strong>${esc(data.total)} damage</strong>. Spend tokens to reduce it before damage reduction.</p><label>Tokens<select name="tokens">${Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1} token${i?'s':''} — ${i+1}d6</option>`).join('')}</select></label>`,[{action:'spend',label:'Spend Tokens & Roll',callback:(_e,_b,d)=>Number(d.element.querySelector('[name="tokens"]').value)},{action:'decline',label:'Decline',default:true,callback:()=>0}]);
}
export async function offerThorn(actor,packet,ask=promptThorn,rollDice=async n=>new Roll(n+'d6',{}, {damageTypes:packet.main.options?.damageTypes??packet.main.damageTypes??[]}).evaluate()){
 const item=thornItem(actor),max=thornTokens(item);if(!max||!damaging(actor,packet))return null;
 const owner=ownerFor(actor,[...game.users],game.user),deadline=decisionNow()+decisionBudget(120000),data={actorUuid:actor.uuid,itemUuid:item.uuid,total:packet.main.total};
 const count=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(125000)});
 if(!Number.isSafeInteger(count)||count<1||count>max)return null;
 return withHopeLock(item.uuid,async()=>{
  const current=thornItem(actor),tokens=thornTokens(current);
  if(!game.user.isActiveGM||!owner.active||!actor.testUserPermission(owner,'OWNER')||deadline<=decisionNow()||current?.uuid!==item.uuid||count>tokens||!damaging(actor,packet))return null;
  const paid=await item.update({'system.resource.value':tokens-count});
  if(!paid||Number(item.system.resource.value)!==tokens-count)throw Error('Thorn Skin token payment was not confirmed. Review the card and pending damage; do not pay again.');
  // A paid failure is not refunded or rerolled automatically.
  const roll=await rollDice(count),total=Number(roll.total);
  if(!Number.isSafeInteger(total)||total<count||total>count*6)throw Error('Thorn Skin produced an invalid damage-reduction roll. Tokens were spent; resolve the pending damage manually.');
  const attacker=await thornAttacker(actor,packet);
  try{const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flags:{[ID]:{unshakeableRoll:true,thornSkin:true}},flavor:`<strong>Thorn Skin</strong><p>${count} token${count>1?'s':''}: reduce damage by ${total}.${attacker?' Return '+total+' damage to '+esc(attacker.name)+'.':''}</p>`});if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);}
  catch(error){console.warn(ID+' | Thorn Skin dice notification',error);ui.notifications.warn('Thorn Skin spent its tokens and rolled '+total+'. The dice notification failed; damage resolution continues.');}
  return {reduction:total,attackerUuid:attacker?.uuid??null,types:Array.from(packet.main.options?.damageTypes??packet.main.damageTypes??[])};
 });
}
// Reflected damage is its own normal damage packet. Queue it outside the
// original recipient's wrapper locks: two Thorn Skin holders must not deadlock
// when each elects to spend their finite tokens in response to the other.
let reflections=Promise.resolve();
export function queueThornReflection(actor,result){
 if(!result?.attackerUuid)return;
 const run=async()=>{await new Promise(resolve=>setTimeout(resolve,0));const attacker=await fromUuid(result.attackerUuid);if(!game.user.isActiveGM||!attacker||unavailableActor(attacker))return;
  const multiplier=Number(attacker.system?.rules?.attack?.damage?.hpDamageTakenMultiplier??1);if(!Number.isFinite(multiplier)||multiplier<0)throw Error('Invalid Thorn Skin recipient damage multiplier.');
  await absorbingWrites(attacker,()=>attacker.takeDamage({main:{total:Math.ceil(result.reduction*multiplier),options:{damageTypes:result.types,[ID]:{retributionSource:{actorUuid:actor.uuid},thornSkinReturn:true}}},resources:{}},false));
 };
 reflections=reflections.then(run).catch(error=>{console.error(ID+' | Thorn Skin returned damage',error);ui.notifications.error('Thorn Skin reduction completed, but returned damage needs manual review: '+error.message+'. Do not repeat the original damage.');});
}
export async function settleThornReflections(){let pending;do{pending=reflections;await pending;}while(pending!==reflections);}
export async function resolveThornDamage(request,{user}){
 if(!game.user.isActiveGM||!user?.active||!/^\w{16}$/.test(request?.id??'')||typeof request.actorUuid!=='string'||typeof request.isDirect!=='boolean')return null;
 const key=user.id+':'+request.id,sig=JSON.stringify(request),old=requests.get(key);if(old)return old.sig===sig?old.promise:null;
 const promise=(async()=>{const actor=await fromUuid(request.actorUuid),packet=bulkyDamagePacket(request.packet),sourceUuid=retributionSource(packet),source=sourceUuid?await fromUuid(sourceUuid):null;
  if(!actor||!packet||!thornItem(actor)||!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return null;
  return actor.takeDamage(packet,request.isDirect);
 })();requests.set(key,{sig,promise});if(requests.size>512)requests.delete(requests.keys().next().value);return promise;
}
export function installThorn(Actor,send,ask=promptThorn,rollDice){
 if(Object.hasOwn(Actor,WRAP))return;const native=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(packet,...args){
  const normalized=bulkyDamagePacket(packet);if(!normalized||!thornTokens(thornItem(this)))return native.call(this,packet,...args);
  if(!game.user.isActiveGM){const result=await send({id:foundry.utils.randomID(),actorUuid:this.uuid,packet:normalized,isDirect:Boolean(args[0])});if(result===null)throw Error('Thorn Skin damage coordination failed. Review the pending damage.');return result;}
  let paid;
  const result=await withHopeLock('thorn-damage:'+this.uuid,async()=>{
   paid=await offerThorn(this,normalized,ask,rollDice);if(!paid)return native.call(this,packet,...args);
   const adjusted={...normalized,main:{...normalized.main,total:Math.max(0,normalized.main.total-paid.reduction)}};
   return absorbingWrites(this,()=>native.call(this,adjusted,...args));
  });
  // Cancellation is not damage taken; zero-HP completed damage still qualifies.
  if(paid&&Array.isArray(result)&&result.some(r=>r.key==='hitPoints'&&!r.itemId&&!r.clear&&r.damageTypes))queueThornReflection(this,paid);
  return result;
 };Object.defineProperty(Actor,WRAP,{value:true});
}
export function registerThorn(){CONFIG.queries[QUERY]=resolveThornDamage;CONFIG.queries[PROMPT]=promptThorn;installThorn(CONFIG.Actor.documentClass,r=>{const gm=game.users.activeGM;if(!gm)throw Error('Thorn Skin needs an active GM.');return gm.isSelf?resolveThornDamage(r,{user:game.user}):gm.query(QUERY,r,{timeout:decisionBudget(605000)});});Hooks.on('daggerheart.preUseAction',a=>{if(a.id===THORN_USE&&thornItem(a.actor)?.uuid===a.item?.uuid){ui.notifications.info('Thorn Skin offers token spending automatically before incoming damage reduction.');return false;}});}
