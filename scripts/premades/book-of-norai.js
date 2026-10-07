import {ID,featureActive} from '../core.js';
import {attackTargetOutcome,resolvedAttackTargets} from '../attack-outcome.js';
import {unavailableActor} from './aura-rules.js';
import {whirlwindRange} from './whirlwind.js';
import {withHopeLock} from './hope-lock.js';
import {decisionBudget} from '../settings.js';
import {NORAI_KEY,FIREBALL_CAST,FIREBALL_EXPLOSION} from './book-of-norai-data.js';
const QUERY=`${ID}.fireball`,WRAP=Symbol.for(QUERY),CTX=Symbol(QUERY),contexts=new WeakMap(),authorized=new WeakSet();
export function noraiItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return i.type==='domainCard'&&featureActive(i)&&!i.system.inVault&&!i.system.isDomainTouchedSuppressed&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===NORAI_KEY;})??null:null;}
function castState(message){const data=message?.system,action=data?.action,actor=action?.actor,item=noraiItem(actor);return item&&action.item?.uuid===item.uuid&&(action.id??action._id)===FIREBALL_CAST&&action.type==='attack'&&action.actionType!=='reaction'&&data.roll?.options?.actionType!=='reaction'&&Number.isFinite(data.roll?.total)?{actor,item,action,data}:null;}
export function fireballTargets(message){const state=castState(message);if(!state||!canvas.ready||message.speaker?.scene&&message.speaker.scene!==canvas.scene?.id)return [];const originals=resolvedAttackTargets(message);if(originals.length!==1||attackTargetOutcome(state.data.roll,originals[0])!=='success')return [];
 const center=canvas.tokens.placeables.find(t=>t.id===originals[0].id&&t.actor?.uuid===originals[0].actorId),limit=whirlwindRange();if(!center||!Number.isFinite(limit)||limit<0)return [];
 const seen=new Set(),targets=[];for(const token of canvas.tokens.placeables){const actor=token.actor,hp=actor?.system?.resources?.hitPoints;if(!['character','adversary','companion'].includes(actor?.type)||unavailableActor(actor)||Number(hp?.max)>0&&Number(hp.value)>=Number(hp.max)||seen.has(actor.uuid))continue;
  const distance=token===center?0:center.distanceTo(token);if(!Number.isFinite(distance)||distance<0||distance>limit)continue;seen.add(actor.uuid);targets.push({id:token.id,actorId:actor.uuid,name:token.name??actor.name,img:actor.img,difficulty:actor.system?.difficulty??null,evasion:actor.system?.evasion??null,hitResult:{success:true},saveResult:{success:false}});
 }return targets;
}
export async function resolveFireball(request,{user},explode=async(action,targets,message)=>{const key={};contexts.set(key,{action,targets,messageUuid:message.uuid});try{return await action.use({shiftKey:false},{[CTX]:key});}finally{contexts.delete(key);}}){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string')return false;const message=await fromUuid(request.messageUuid),state=castState(message);if(!state||!state.actor.testUserPermission(user,'OWNER'))return false;
 return withHopeLock(`fireball:${state.item.uuid}`,async()=>{if(!game.user.isActiveGM||!user.active||!state.actor.testUserPermission(user,'OWNER')||!castState(message)||message.flags?.[ID]?.fireball?.started)return false;
  if(!message.flags?.[ID]?.fireball?.ready)await message.setFlag(ID,'fireball',{ready:true,started:false});
  const originals=resolvedAttackTargets(message);if(originals.length!==1||attackTargetOutcome(message.system.roll,originals[0])!=='success')return false;
  const targets=fireballTargets(message);if(!targets.length)throw Error('Fireball cannot locate its blast targets. The GM must view the cast scene; resolve the explosion manually if no targets remain.');
  const action=state.item.system.actions?.get?.(FIREBALL_EXPLOSION)??state.item.system.actions?.[FIREBALL_EXPLOSION];if(typeof action?.use!=='function')throw Error('The native Fireball Explosion action is missing. Re-Medkit Book of Norai.');
  const updated=await message.setFlag(ID,'fireball',{ready:true,started:true,targets:targets.map(t=>({id:t.id,actorId:t.actorId}))});if(!updated)throw Error('Fireball could not reserve this explosion.');
  try{const result=await explode(action,targets,message);if(!result)throw Error('Fireball Explosion was canceled.');const messageUuid=result.message?.uuid??null;await message.setFlag(ID,'fireball',{ready:true,started:true,completed:true,messageUuid});return {completed:true,messageUuid,targets};}
  catch(error){ui.notifications.error(`Fireball stopped: ${error.message}. Check the explosion chat card and reactions before applying damage manually. Do not recast just to retry.`);throw error;}
 });
}
export function installNorai(Action,send){if(Object.hasOwn(Action,WRAP))return;
 const prepare=Action.prototype.prepareConfig;Action.prototype.prepareConfig=function(event,options={},...args){const config=prepare.call(this,event,options,...args),context=contexts.get(options[CTX]);if(config&&context?.action===this){config.targets=structuredClone(context.targets);config[ID]={...config[ID],noraiExplosion:{castMessageUuid:context.messageUuid}};delete config[CTX];authorized.add(config);}return config;};
 const workflow=Action.prototype.executeWorkflow;Action.prototype.executeWorkflow=async function(config,...args){if(!authorized.has(config))return workflow.call(this,config,...args);
  // Native workflows cache bound field methods. Scope changes to this instance's
  // existing entries, delegating those methods rather than rebuilding the pipeline.
  const parts=this.workflow,target=parts.get('target');if(!target)throw Error('Fireball native target workflow is missing.');
  const wrappedTarget={...target,execute:async(...a)=>{const result=await target.execute(...a);if(a[0]===config)for(const t of config.targets)t.hitResult={success:true};return result;}};
  // Leave the native multitarget SaveField/chat-card handling untouched.
  parts.set('target',wrappedTarget);try{return await workflow.call(this,config,...args);}finally{if(parts.get('target')===wrappedTarget)parts.set('target',target);authorized.delete(config);}
 };
 const use=Action.prototype.use;Action.prototype.use=async function(...args){const item=noraiItem(this.actor),own=item?.uuid===this.item?.uuid;
  if(own&&this.id===FIREBALL_EXPLOSION&&!contexts.has(args[1]?.[CTX])){ui.notifications.info('Use Fireball — Cast. Its explosion follows a successful cast automatically.');return false;}
  const result=await use.apply(this,args);if(own&&this.id===FIREBALL_CAST&&result?.message&&result.actionType==='action'&&Number.isFinite(result.roll?.total))await send({messageUuid:result.message.uuid});return result;
 };Object.defineProperty(Action,WRAP,{value:true});
}
export function registerBookOfNorai(){CONFIG.queries[QUERY]=resolveFireball;const send=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Fireball needs an active GM.');return gm.isSelf?resolveFireball(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(600000)});};installNorai(game.system.api.data.actions.actionsTypes.base,send);
 Hooks.on('updateChatMessage',message=>{if(!game.user.isActiveGM||!message.flags?.[ID]?.fireball?.ready||message.flags[ID].fireball.started||!castState(message))return;void resolveFireball({messageUuid:message.uuid},{user:game.user}).catch(error=>{console.error(`${ID} | Fireball`,error);ui.notifications.error(error.message);});});
}
