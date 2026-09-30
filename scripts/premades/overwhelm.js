import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { OVERWHELM_KEY } from './overwhelm-data.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
const QUERY=`${ID}.overwhelm`,PROMPT=`${ID}.overwhelmPrompt`,pending=new Set();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function overwhelmItem(actor){return Number(actor?.system?.resources?.hope?.value)>=1?actor.items.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===OVERWHELM_KEY;})??null:null;}
export function overwhelmHits(message){const d=message?.system;if(d?.action?.type!=='attack'||!Number.isFinite(d.roll?.total))return [];return (d.targets??[]).filter(t=>{const threshold=t.difficulty||t.evasion;return threshold!=null&&(d.roll.options?.[ID]?.trueStrike||d.roll.options?.[ID]?.witchsCharm||d.roll.isCritical||d.roll.total>=threshold);});}
export async function promptOverwhelm(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!overwhelmItem(actor))return null;return timedDialog(`Overwhelm — ${actor.name}`,`<p>Spend <strong>1 Hope</strong> after hitting <strong>${esc(data.targetName)}</strong> to choose one:</p>`,[{action:'stress',label:'Mark 1 Stress on Target',callback:()=> 'stress'},{action:'throw',label:'Throw within Close (manual)',callback:()=> 'throw'},{action:'decline',label:'Decline',default:true,callback:()=>null}]);}
async function validate(request,user){const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor,hit=overwhelmHits(message).find(t=>t.id===request.targetId);if(!user?.active||!actor?.testUserPermission(user,'OWNER')||!overwhelmItem(actor)||!hit)return null;const target=await fromUuid(hit.actorId);return target&&['character','adversary'].includes(target.type)?{message,actor,target}:null;}
export async function resolveOverwhelm(request,{user},ask=promptOverwhelm){
 if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
 const key=`${request.messageUuid}:${request.targetId}`;if(pending.has(key))return false;
 let v=await validate(request,user);if(!v||v.message.flags?.[ID]?.overwhelm?.[request.targetId]||pending.has(key))return false;
 pending.add(key);try{
  // Persist the offer so replaying the same workflow cannot spend twice.
  await v.message.update({[`flags.${ID}.overwhelm.${request.targetId}`]:'offered'});
  const owner=ownerFor(v.actor,[...game.users],game.user),data={actorUuid:v.actor.uuid,targetName:v.target.name};
  const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!['stress','throw'].includes(choice)||decisionNow()>request.deadline)return false;
  return await withHopeLock(v.actor.uuid,async()=>{
   v=await validate(request,user);if(!v)return false;
   const before=Number(v.actor.system.resources.hope.value);
   const paid=await v.actor.update({'system.resources.hope.value':before-1});
   if(!paid||Number(v.actor.system.resources.hope.value)!==before-1)throw new Error('Overwhelm could not spend Hope.');
   if(choice==='stress')await v.target.modifyResource([{key:'stress',value:1}]);
   await v.message.update({[`flags.${ID}.overwhelm.${request.targetId}`]:choice});
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:v.actor}),content:`<p><strong>Overwhelm</strong>: ${esc(v.actor.name)} spends 1 Hope. ${choice==='stress'?`${esc(v.target.name)} marks 1 Stress.`:`Throw ${esc(v.target.name)} within Close range; move the token manually.`}</p>`});return true;
  });
 }finally{pending.delete(key);}
}
export function installOverwhelmPost(Action,offer){
 const native=Action.prototype.use;
 Action.prototype.use=async function(...args){
  const config=await native.apply(this,args);
  // Native Action.use commits queued Hope/Fear rewards after executeWorkflow.
  if(config&&overwhelmItem(this.actor))for(const hit of overwhelmHits(config.message)){
   if(!overwhelmItem(this.actor))break;
   await offer({messageUuid:config.message.uuid,targetId:hit.id,deadline:decisionNow()+decisionBudget(120000)});
  }
  return config;
 };
}
export function registerOverwhelm(){CONFIG.queries[QUERY]=resolveOverwhelm;CONFIG.queries[PROMPT]=promptOverwhelm;installOverwhelmPost(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Overwhelm needs an active GM.');return gm.isSelf?resolveOverwhelm(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});Hooks.on('daggerheart.preUseAction',action=>{if(overwhelmItem(action.actor))prioritizeFaerieWings(action,true);const f=action.item?.flags?.[ID];if(!f?.disabled&&(f?.applied?.key??f?.premade?.key)===OVERWHELM_KEY&&action.id==='mjIdxGa5T9MzPk3D'){ui.notifications.info('Overwhelm is offered automatically after a successful attack.');return false;}});}
