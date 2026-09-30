import {ID,featureActive} from '../core.js';
import {FRIEND_KEY,FRIEND_ACTION} from './loyal-friend-data.js';
import {companionPartner,linkedCompanion} from '../companion-context.js';
import {unavailable} from '../companions.js';
import {sourceToken} from './hallowed-aura.js';
import {closeDistance,ownerFor} from './aura-rules.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {withHopeLock} from './hope-lock.js';
import {loyalPacket,redirectedLoyalPacket} from './loyal-protector.js';
import {honedAction} from './honed.js';
const QUERY=`${ID}.loyalFriend`,PROMPT=`${ID}.loyalFriendPrompt`;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function friendItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID],a=i.system.actions?.get?.(FRIEND_ACTION)??i.system.actions?.[FRIEND_ACTION];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===FRIEND_KEY&&a?.uses?.recovery==='longRest'&&Number(a.uses.value??0)<1;})??null:null;}
export function friendPair(target,count){
 const ranger=companionPartner(target)??target,companion=linkedCompanion(ranger);
 if(!friendItem(ranger)||!companion||unavailable(companion)||[ranger,companion].some(a=>a.statuses?.has('dead')||a.statuses?.has('defeated')))return null;
 const hp=ranger.system.resources?.hitPoints,stress=companion.system.resources?.stress;
 if(!(Number(hp?.value)<Number(hp?.max))||!(Number(stress?.value)<Number(stress?.max)))return null;
 const track=target===companion?stress:hp;
 if(!(count>0&&Number(track.value)+count>=Number(track.max)))return null;
 const a=sourceToken(ranger),b=sourceToken(companion);if(!a||!b)return null;
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
 const limit=closeDistance(canvas.scene,rules,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id),distance=a.distanceTo(b);
 if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)return null;
 return {ranger,companion,recipient:target===companion?ranger:companion,item:friendItem(ranger)};
}
export async function promptFriend(data,{user}){
 const ranger=await fromUuid(data.rangerUuid);if(!user?.isGM||!ranger?.testUserPermission(game.user,'OWNER')||!friendItem(ranger))return false;
 return Boolean(await timedDialog(`Loyal Friend — ${ranger.name}`,`<p>This attack would mark ${esc(data.targetName)}’s last ${data.companionTarget?'Stress':'Hit Point'}.</p><p>Use <strong>Loyal Friend</strong> to have ${esc(data.recipientName)} take the damage instead? Uses your once-per-long-rest action. Move the protecting token manually.</p>`,[{action:'use',label:'Take Damage Instead',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveFriend(request,{user},ask=promptFriend){
 if(!game.user.isActiveGM||!user?.active||!Number.isInteger(request.count))return false;
 const target=await fromUuid(request.targetUuid),packet=loyalPacket(request.packet),pair=friendPair(target,request.count);
 if(!packet?.main.options?.[ID]?.friendAttack||!pair)return false;
 const source=await fromUuid(packet.main.options[ID].friendAttack);
 if(!user.isGM&&!pair.ranger.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return false;
 const owner=ownerFor(pair.ranger,[...game.users],game.user),data={rangerUuid:pair.ranger.uuid,targetName:target.name,recipientName:pair.recipient.name,companionTarget:target.type==='companion'};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!accepted)return false;
 const spent=await withHopeLock(pair.ranger.uuid,async()=>{
  const current=friendPair(target,request.count);if(!current)return false;
  return Boolean(await current.item.update({[`system.actions.${FRIEND_ACTION}.uses.value`]:1}));
 });if(!spent)return false;
 const redirected=redirectedLoyalPacket(packet,target,pair.recipient);
 // Redirect marker also prevents other redirection abilities from bouncing the attack back.
 await pair.recipient.takeDamage(redirected,Boolean(request.isDirect));
 await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:pair.ranger}),content:`<p><strong>Loyal Friend</strong>: ${esc(pair.recipient.name)} takes the attack’s damage instead of ${esc(target.name)}. Move the protecting token to their side.</p>`});
 return true;
}
export function installLoyalFriend(Actor,offer){
 const damage=Actor.prototype.takeDamage,modify=Actor.prototype.modifyResource,contexts=new WeakMap(),queues=new WeakMap();
 Actor.prototype.takeDamage=async function(args,...rest){
  const packet=loyalPacket(args);
  if(!packet?.main.options?.[ID]?.friendAttack)return damage.call(this,args,...rest);
  const ranger=companionPartner(this)??this;if(!friendItem(ranger))return damage.call(this,args,...rest);
  const run=async()=>{
   const request={targetUuid:this.uuid,packet,isDirect:Boolean(rest[0])};
   if(this.type==='companion'){
    if(friendPair(this,1)&&await offer({...request,count:1}))return [];
    return damage.call(this,args,...rest);
   }
   const context={request};contexts.set(this,context);
   try{return await damage.call(this,args,...rest);}finally{contexts.delete(this);}
  };
  const pending=(queues.get(this)??Promise.resolve()).catch(()=>{}).then(run);queues.set(this,pending);
  try{return await pending;}finally{if(queues.get(this)===pending)queues.delete(this);}
 };
 Actor.prototype.modifyResource=async function(resources){
  const context=contexts.get(this),hp=resources?.filter(r=>r.key==='hitPoints'&&!r.clear&&!r.itemId&&r.value>0)??[],count=hp.reduce((sum,r)=>sum+Number(r.value),0);
  if(context&&!context.handled&&friendPair(this,count)){
   context.handled=true;
   if(await offer({...context.request,count}))for(const r of hp)r.value=0;
  }
  return modify.call(this,resources);
 };
}
export function registerLoyalFriend(){
 CONFIG.queries[QUERY]=resolveFriend;CONFIG.queries[PROMPT]=promptFriend;
 installLoyalFriend(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Loyal Friend needs an active GM.');return gm.isSelf?resolveFriend(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(300000)});});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,evaluate=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){
  const result=await evaluate.call(this,roll,config,...args),actor=config.data?.parent;
  if(!config.hasHealing&&config.damage?.main&&honedAction(actor,config.source)?.type==='attack'){
   config.damage.main.options[ID]={...config.damage.main.options[ID],friendAttack:actor.uuid};
   if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([k,r])=>[k,r.toJSON()]))});
  }return result;
 };
 Hooks.on('daggerheart.preUseAction',action=>{
  if(action.id===FRIEND_ACTION&&friendItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Loyal Friend is offered automatically when attack damage would mark the last HP or companion Stress.');return false;}
 });
}
