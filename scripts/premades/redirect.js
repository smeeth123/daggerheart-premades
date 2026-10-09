import {ID,featureActive} from '../core.js';
import {attackTargetOutcome,resolvedAttackTargets} from '../attack-outcome.js';
import {timedDialog} from '../dialog.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {sourceToken} from './hallowed-aura.js';
import {meleeLimit} from './kick.js';
import {veryCloseLimit} from '../attack-resolution.js';
import {markReactiveStress} from './stress-payment.js';
import {withHopeLock} from './hope-lock.js';
import {REDIRECT_KEY,REDIRECT_ACTION} from './redirect-data.js';
const QUERY=ID+'.redirect',PROMPT=QUERY+'Prompt',WRAP=Symbol.for(QUERY),receipts=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function redirectItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const f=item.flags?.[ID],s=item.system;return item.type==='domainCard'&&featureActive(item)&&!f?.disabled&&(!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===REDIRECT_KEY;})??null:null;}
const alive=a=>!unavailableActor(a)&&!(Number(a?.system?.resources?.hitPoints?.max)>0&&Number(a.system.resources.hitPoints.value)>=Number(a.system.resources.hitPoints.max));
const canPay=a=>Number(a?.system?.resources?.stress?.max)>Number(a?.system?.resources?.stress?.value);
export function redirectContext(message){const d=message?.system,a=d?.action;return a?.type==='attack'&&a.hasDamage&&!a.hasHealing&&a.actionType!=='reaction'&&d.actionType!=='reaction'&&d.hasRoll!==false&&!d.hasHealing&&d.roll?._evaluated!==false&&Number.isFinite(d.roll?.total)&&a.actor?.uuid===d.source?.actor&&typeof a.id==='string'&&a.id===d.source.action&&!message.flags?.[ID]?.redirectSource?{action:a,attacker:a.actor}:null;}
export function redirectState(message,tokenId,requireCapacity=true){
 const context=redirectContext(message);if(!context||!canvas.ready||message.speaker?.scene&&message.speaker.scene!==canvas.scene?.id)return null;
 const saved=message.speaker?.token&&canvas.tokens.get(message.speaker.token),origin=saved?.actor?.uuid===context.attacker.uuid?saved:sourceToken(context.attacker),defender=canvas.tokens.get(tokenId);
 if(!origin||!defender||!defender.visible||!alive(defender.actor)||!redirectItem(defender.actor)||requireCapacity&&!canPay(defender.actor))return null;
 const hit=resolvedAttackTargets(message).find(t=>t.id===tokenId&&t.actorId===defender.actor.uuid);
 if(!hit||attackTargetOutcome(message.system.roll,hit)!=='failure')return null;
 const distance=origin.distanceTo(defender),melee=Number(canvas.scene.rangeSettings?.melee??meleeLimit(canvas.scene)),close=Number(canvas.scene.rangeSettings?.veryClose??veryCloseLimit(canvas.scene));
 if(!Number.isFinite(distance)||!Number.isFinite(melee)||!Number.isFinite(close)||distance<=melee||close<0)return null;
 const seen=new Set(),candidates=(canvas.tokens.placeables??[]).filter(t=>{const a=t.actor,d=defender.distanceTo(t);if(a?.type!=='adversary'||!t.visible||t.document.hidden||!alive(a)||seen.has(a.uuid)||!Number.isFinite(d)||d<0||d>close)return false;seen.add(a.uuid);return true;});
 return candidates.length?{...context,defender,candidates}:null;
}
export async function promptRedirect(data,{user}){
 if(!user?.isGM)return null;const message=await fromUuid(data.messageUuid),state=redirectState(message,data.tokenId);
 if(!state||!state.defender.actor.testUserPermission(game.user,'OWNER'))return null;
 const allowed=new Set(data.targets),targets=state.candidates.filter(t=>allowed.has(t.document.uuid));if(!targets.length)return null;
 return timedDialog('Redirect — '+state.defender.actor.name,`<p>You rolled a 6. Mark <strong>1 Stress</strong> to redirect the missed attack’s damage?</p><div class="form-group"><label>Adversary within Very Close</label><select name="redirectTarget">${targets.map(t=>`<option value="${esc(t.document.uuid)}">${esc(t.name)}</option>`).join('')}</select></div>`,[{action:'redirect',label:'Mark Stress & Redirect',callback:(_e,_b,dialog)=>dialog.element.querySelector('[name="redirectTarget"]')?.value},{action:'decline',label:'Decline',default:true,callback:()=>null}]);
}
export async function rollRedirectDice(actor,message){
 const prof=Number(actor.system.proficiency);if(!Number.isInteger(prof)||prof<1||prof>100)throw Error('Redirect needs a valid Proficiency.');
 const roll=await new Roll(prof+'d6').evaluate(),posted=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),whisper:[...(message.whisper??[])],blind:Boolean(message.blind),flags:{[ID]:{unshakeableRoll:true}},flavor:'<strong>Redirect</strong> — Proficiency dice'});
 if(posted&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(posted.id);
 const values=(roll.dice??[]).flatMap(d=>(d.results??[]).filter(r=>r.active!==false&&!r.discarded).map(r=>Number(r.result)));
 if(values.length!==prof||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('Redirect produced invalid dice.');return values;
}
const damageSource=d=>({...d.toObject(),main:d.main?.toJSON?.()??d.main,resources:Object.fromEntries(Object.entries(d.resources??{}).map(([k,v])=>[k,v.toJSON?.()??v]))});
export async function launchRedirect(message,state,target){
 const {action}=state,Field=game.system.api.fields.ActionFields.DamageField,config=action.prepareConfig({shiftKey:false},{dialog:{configure:false}});
 if(!config||!action.hasDamage||action.hasHealing)throw Error('The original attack has no damage action.');
 const targetData={id:target.id,actorId:target.actor.uuid,name:target.name,img:target.actor.img,difficulty:target.actor.system.difficulty??null,evasion:Number(target.actor.system.evasion??0),hitResult:{success:true}};
 Object.assign(config,{title:'Redirect — '+action.name,hasRoll:false,hasSave:false,hasEffect:false,hasHealing:false,isCritical:false,onSave:null,actionType:'reaction',targets:[targetData],roll:null,evaluate:true});
 delete config.source.message;delete config.damage;config.effects=await game.system.api.data.actions.actionsTypes.base.getActionRelevantEffects(action.getRollData(),action.actor);
 const original=message.system.damage;
 // A native render-only roll supplies the standard card/buttons without rolling
 // another attack. A duality card without Duality dice crashes native styling.
 const display=new CONFIG.Dice.daggerheart.DHRoll('',config.data,{effects:[]});display._evaluated=true;
 const card=await ChatMessage.create({type:'damageRoll',user:game.user.id,title:config.title,speaker:message.speaker,whisper:[...(message.whisper??[])],blind:Boolean(message.blind),rolls:[display],
  system:{source:{...config.source},title:config.title,actionType:'reaction',hasRoll:false,hasDamage:true,hasTarget:true,hasHealing:false,hasEffect:false,hasSave:false,isDirect:config.isDirect,targets:[targetData],targeting:{usingSelect:false},actionDescription:'<p><strong>Redirect:</strong> '+esc(state.defender.actor.name)+' redirects the missed attack to '+esc(target.name)+'.</p>',...(original?.main&&Number.isFinite(original.main.total)?{damage:damageSource(original)}:{})},
  flags:{[ID]:{redirectSource:{messageUuid:message.uuid,defenderUuid:state.defender.actor.uuid}}}});
 if(!card)throw Error('Could not create Redirect’s damage card.');config.message=card;
 if(original?.main&&Number.isFinite(original.main.total))config.damage=new original.constructor(damageSource(original));
 else if(Field.getAutomation()!==CONFIG.DH.SETTINGS.actionAutomationChoices.never.id){
  const result=await Field.execute.call(action,config,card.id,true);if(result===false)return card;
  if(config.damage)await card.update({'system.damage':damageSource(config.damage)});
 }
 if(config.damage)await Field.applyDamage.call(action,config,[targetData]);
 return card;
}
export async function resolveRedirect(request,{user},dependencies={}){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||typeof request.tokenId!=='string'||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(185000))return false;
 const message=await fromUuid(request.messageUuid),state=redirectState(message,request.tokenId);if(!state||( !user.isGM&&!state.attacker.testUserPermission(user,'OWNER')))return false;
 const key=message.uuid+':'+request.tokenId,signature=JSON.stringify(request),old=receipts.get(key);if(old)return old.signature===signature?old.promise:false;
 const operation=withHopeLock('redirect:'+key,async()=>{
  const record=message.flags?.[ID]?.redirect??{};if(record[request.tokenId])return false;
  let status={status:'rolling',defenderUuid:state.defender.actor.uuid};
  const save=async()=>{const updated=await message.setFlag(ID,'redirect',{...message.flags?.[ID]?.redirect,[request.tokenId]:status});if(!updated)throw Error('Could not save Redirect’s resolution.');};
  await save();const values=await (dependencies.roll??rollRedirectDice)(state.defender.actor,message);status={...status,values,status:values.includes(6)?'choosing':'noSix'};await save();if(!values.includes(6))return false;
  const valid=()=>Boolean(game.user.isActiveGM&&user.active&&request.deadline>decisionNow()&&redirectState(message,request.tokenId));if(!valid())return false;
  const owner=ownerFor(state.defender.actor,[...game.users],game.user),identities=new Map(state.candidates.map(t=>[t.document.uuid,t.actor.uuid])),data={messageUuid:message.uuid,tokenId:request.tokenId,targets:[...identities.keys()]};
  const choice=owner.isSelf?await(dependencies.ask??promptRedirect)(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  const fresh=valid()?redirectState(message,request.tokenId):null,target=fresh?.candidates.find(t=>t.document.uuid===choice&&identities.get(choice)===t.actor.uuid);
  if(!target||!owner.active||!state.defender.actor.testUserPermission(owner,'OWNER')){status.status='declined';await save();return false;}
  if(!await(dependencies.pay??markReactiveStress)(state.defender.actor.uuid,actor=>valid()&&actor.uuid===state.defender.actor.uuid&&redirectState(message,request.tokenId)?.candidates.some(t=>t.document.uuid===target.document.uuid)))return false;
  status={...status,status:'paid',targetUuid:target.document.uuid};await save();
  // Payment can use the last Stress slot; don't require capacity again after committing it.
  const paidState=redirectState(message,request.tokenId,false),paidTarget=paidState?.candidates.find(t=>t.document.uuid===target.document.uuid&&t.actor.uuid===identities.get(choice));
  if(!paidTarget||!game.user.isActiveGM||!user.active||!owner.active||!state.defender.actor.testUserPermission(owner,'OWNER'))throw Error('Redirect’s target became unavailable after payment.');
  const card=await(dependencies.launch??launchRedirect)(message,paidState,paidTarget);status={...status,status:'redirected',cardUuid:card?.uuid};await save();return card;
 });receipts.set(key,{signature,promise:operation});if(receipts.size>512)receipts.delete(receipts.keys().next().value);return operation;
}
export function installRedirect(Action,send){
 if(!Action||Object.hasOwn(Action,WRAP))return;const use=Action.prototype.use;
 Action.prototype.use=async function(...args){const result=await use.apply(this,args),message=result?.message;if(!redirectContext(message))return result;
  try{if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
   if(result.damage?.main&&Number.isFinite(result.damage.main.total)&&resolvedAttackTargets(message).some(t=>redirectState(message,t.id)))await message.update({'system.damage':damageSource(result.damage)});
   for(const t of resolvedAttackTargets(message))if(redirectState(message,t.id))await send({messageUuid:message.uuid,tokenId:t.id,deadline:decisionNow()+decisionBudget(180000)});
  }catch(error){console.error(ID+' | Redirect',error);ui.notifications.error('The attack was preserved, but Redirect needs manual review: '+error.message);}
  return result;
 };Object.defineProperty(Action,WRAP,{value:true});
}
export function registerRedirect(){
 CONFIG.queries[QUERY]=resolveRedirect;CONFIG.queries[PROMPT]=promptRedirect;
 installRedirect(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Redirect needs an active GM.');return gm.isSelf?resolveRedirect(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(185000)});});
 Hooks.on('daggerheart.preUseAction',action=>{if(action.id===REDIRECT_ACTION&&redirectItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Redirect rolls automatically after an incoming attack misses you from beyond Melee.');return false;}});
}
