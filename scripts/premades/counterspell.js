import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {registerResolutionProvider,resolutionRequest,consumeResolutionTicket} from '../resolution-manager.js';
import {COUNTERSPELL_KEY,COUNTERSPELL_ACTION} from './counterspell-data.js';
const QUERY=`${ID}.counterspell`,ROLL=`${QUERY}Roll`,DIFFICULTY=`${QUERY}Difficulty`,WRAPPED=Symbol.for(QUERY);
const pending=new Map(),attempts=new Map(),vaults=new Map(),rollReceipts=new Map(),reservations=new Map();
const values=collection=>[...(collection?.values?.()??collection??[])];
const actionId=action=>action?.id??action?._id;
const actionFor=(item,id)=>item?.system?.attack?.id===id?item.system.attack:item?.system?.actions?.get?.(id)??item?.system?.actions?.[id];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function counterspellAvailable(item){const flags=item?.flags?.[ID];return Boolean(item?.type==='domainCard'&&item.actor?.type==='character'&&!unavailableActor(item.actor)&&featureActive(item)&&!flags?.disabled&&!item.system?.inVault&&!item.system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===COUNTERSPELL_KEY&&actionFor(item,COUNTERSPELL_ACTION)?.actionType==='reaction');}
export function counterableAction(action){return Boolean(action?.actor?.type==='adversary'&&action.item?.flags?.[ID]?.counterableActions?.[actionId(action)]===true);}
export function casterDifficulty(actor){const value=actor?.type==='adversary'?actor.system?.difficulty:null;return value!=null&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;}
export function counterspellCandidates(){const actors=new Map;for(const token of canvas.tokens?.placeables??[])if(token.actor?.type==='character')actors.set(token.actor.uuid,token.actor);return [...actors.values()].flatMap(actor=>values(actor.items).filter(counterspellAvailable));}
export async function setCounterableAction(action,enabled){if(!game.user.isGM||action.actor?.type!=='adversary'||!action.item?.isOwner)throw Error('Only a GM may configure an owned adversary action.');return action.item.setFlag(ID,`counterableActions.${actionId(action)}`,enabled===true);}
export function renderCounterspellSetting(app,html){
 const action=app.action??(app.document?.type==='adversary'?app.document.system?.attack:null);if(!game.user.isGM||action?.actor?.type!=='adversary'||!action.item?.isOwner||html.querySelector('.dhp-counterable'))return false;
 // Native navigation links share data-tab with the content; never append to a link.
 const section=html.querySelector(app.action?'section.tab[data-tab="base"]':'section.tab[data-tab="attack"]');if(!section)return false;
 const row=html.ownerDocument.createElement('fieldset');row.className='dhp-counterable';
 row.innerHTML='<legend>Counterspell</legend><label class="dhp-counterable-toggle"><input type="checkbox" aria-label="Counterable magical effect"><span>Counterable magical effect</span></label><p class="hint">Offer Counterspell before this whole action begins. A successful interruption prevents all of its consequences.</p>';
 const input=row.querySelector('input');input.checked=counterableAction(action);
 input.addEventListener('change',async event=>{event.stopImmediatePropagation();input.disabled=true;try{await setCounterableAction(action,input.checked);}catch(error){input.checked=!input.checked;ui.notifications.error(error.message);}finally{input.disabled=false;}},true);
 section.append(row);return true;
}
export async function promptCounterspellDifficulty(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!game.user.isGM||!user?.active||!actor?.testUserPermission(user,'OWNER'))return null;
 return timedDialog('Counterspell Difficulty',`<p>Set the Difficulty for ${esc(actor.name)}’s Spellcast reaction.</p><div class="form-group"><label>Difficulty</label><input name="difficulty" type="number" min="1" step="1" value="${data.defaultDifficulty??10}"></div>`,[{action:'roll',label:'Set Difficulty',default:true,callback:(_e,_b,dialog)=>{const n=Number(dialog.element.querySelector('[name="difficulty"]').value);return Number.isInteger(n)&&n>0?n:false;}},{action:'cancel',label:'Cancel',callback:()=>false}]);
}
async function send(request){const gm=game.users.activeGM;if(!gm)throw Error('Counterspell needs an active GM.');return gm.isSelf?resolveCounterspell(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(300000)});}
export function configureCounterspell(action,config,difficulty){
 config.actionType='reaction';config.roll={...config.roll,type:'reaction',trait:action.roll?.rollTrait??config.roll?.trait,difficulty};
 config.targets=[];config.hasDamage=false;config.hasHealing=false;config.hasEffect=false;
 config.dialog={...config.dialog,configure:true};return config;
}
// DHActorRoll exposes the native Roll through system.roll; actionType is not a chat schema field.
const counterspellReaction=message=>(message?.system?.roll?.options?.actionType??message?.rolls?.[0]?.options?.actionType)==='reaction';
export function counterspellSuccess(message){const roll=message?.system?.roll,actual=message?.rolls?.[0],difficulty=roll?.options?.roll?.difficulty??actual?.options?.roll?.difficulty??roll?.difficulty;return counterspellReaction(message)&&Number.isFinite(roll?.total)&&(actual?.isCritical===true||roll.isCritical===true||Number.isFinite(Number(difficulty))&&Number(difficulty)>0&&roll.total>=Number(difficulty));}
export async function vaultCounterspell(request,{user}){
 if(!game.user.isActiveGM||!user?.active)return false;
 const item=await fromUuid(request.itemUuid),message=await fromUuid(request.messageUuid),source=message?.system?.source;
 if(!item?.actor?.testUserPermission(user,'OWNER')||source?.actor!==item.actor.uuid||source.item!==item.id||source.action!==COUNTERSPELL_ACTION||!counterspellSuccess(message))return false;
 const key=`${item.uuid}:${message.uuid}`;if(vaults.has(key))return vaults.get(key);
 const operation=withHopeLock(item.actor.uuid,async()=>{if(!counterspellAvailable(item))return false;const updated=await item.update({'system.inVault':true});if(!updated||!item.system.inVault)throw Error('Counterspell succeeded but its card could not be moved to the Vault. Stop the effect and move the card manually.');return true;});vaults.set(key,operation);if(vaults.size>1000)vaults.delete(vaults.keys().next().value);return operation;
}
async function validPending(request,user){
 const state=pending.get(request.pendingId),item=await fromUuid(request.candidate?.itemUuid);
 if(!game.user.isActiveGM||!user?.active||!state||state.executor!==user.id||state.closed||state.sceneId!==canvas.scene?.id||!counterableAction(state.action)||!counterspellAvailable(item)||reservations.has(item.uuid)||state.used.has(item.uuid)||!counterspellCandidates().some(i=>i.uuid===item.uuid))return null;
 const currentItem=await fromUuid(state.action.item.uuid),currentAction=currentItem?.uuid===state.action.actor.uuid?currentItem.system.attack:actionFor(currentItem,actionId(state.action));
 if(!currentAction||!counterableAction(currentAction)||!currentAction.actor.testUserPermission(user,'OWNER'))return null;
 return {state,item,owner:ownerFor(item.actor,values(game.users),game.user)};
}
export async function rollCounterspell(data,{user}){
 if(!user?.active||!user.isGM||!data.attemptId)return null;
 if(rollReceipts.has(data.attemptId))return rollReceipts.get(data.attemptId);
 const operation=runCounterspellRoll(data);rollReceipts.set(data.attemptId,operation);if(rollReceipts.size>1000)rollReceipts.delete(rollReceipts.keys().next().value);return operation;
}
async function runCounterspellRoll(data){
 const item=await fromUuid(data.itemUuid);if(!counterspellAvailable(item)||!item.actor.testUserPermission(game.user,'OWNER'))return null;
 // The active GM must confirm this opaque live attempt before any roll is started.
 if(!await send({op:'checkAttempt',attemptId:data.attemptId,itemUuid:item.uuid}))return null;
 const result=await actionFor(item,COUNTERSPELL_ACTION).use(new Event('click'),{[ID]:{counterspell:{difficulty:data.difficulty,attemptId:data.attemptId}}});
 return result?.message?.uuid??null;
}
export async function resolveCounterspell(request,{user},dependencies={}){
 if(!game.user.isActiveGM||!user?.active)return false;
 if(request.op==='vault')return vaultCounterspell(request,{user});
 if(request.op==='checkAttempt'){const attempt=attempts.get(request.attemptId);if(!attempt||attempt.done||attempt.started||attempt.ownerId!==user.id||attempt.itemUuid!==request.itemUuid||!pending.has(attempt.pendingId))return false;attempt.started=true;return true;}
 if(request.op==='open'){
  if(!user.isGM)return false;const actor=await fromUuid(request.actorUuid),item=await fromUuid(request.itemUuid),action=item?.uuid===actor?.uuid?actor.system.attack:actionFor(item,request.actionId);
  if(!actor?.testUserPermission(user,'OWNER')||action?.actor?.uuid!==actor.uuid||actionId(action)!==request.actionId||!counterableAction(action))return false;
  const id=foundry.utils.randomID();pending.set(id,{action,executor:user.id,sceneId:canvas.scene?.id,used:new Set(),closed:false});return id;
 }
 if(request.op==='close'){const state=pending.get(request.pendingId);if(state?.executor!==user.id)return false;state.closed=true;pending.delete(request.pendingId);for(const [id,attempt]of attempts)if(attempt.pendingId===request.pendingId)attempts.delete(id);return true;}
 if(request.op!=='use')return false;
 const valid=await validPending(request,user);if(!valid||!(dependencies.authorize??consumeResolutionTicket)(request.resolutionToken,'counterspell',valid.item.uuid,user))return false;
 if(reservations.has(valid.item.uuid)||valid.state.used.has(valid.item.uuid))return false;
 const {state,item,owner}=valid;state.used.add(item.uuid);
 reservations.set(item.uuid,request.pendingId);let attemptId;
 try{
  let difficulty=casterDifficulty(state.action.actor);if(difficulty==null)difficulty=await promptCounterspellDifficulty({actorUuid:item.actor.uuid},{user:game.user});if(!difficulty)return {attempted:false,success:false};
  attemptId=foundry.utils.randomID();attempts.set(attemptId,{pendingId:request.pendingId,itemUuid:item.uuid,ownerId:owner.id,done:false});
  const data={attemptId,itemUuid:item.uuid,difficulty};
  const messageUuid=dependencies.roll?await dependencies.roll(data,owner):owner.isSelf?await rollCounterspell(data,{user:game.user}):await owner.query(ROLL,data,{timeout:decisionBudget(300000)});
  const attempt=attempts.get(attemptId);if(attempt)attempt.done=true;
  const message=messageUuid?await fromUuid(messageUuid):null,source=message?.system?.source;
  if(!message)return {attempted:true,success:false};
  if(source?.actor!==item.actor.uuid||source.item!==item.id||source.action!==COUNTERSPELL_ACTION||!counterspellReaction(message))throw Error('Counterspell returned an unrelated roll. The original effect remains paused for review.');
  // Successful rolls vault through the same authoritative path as manual use.
  const success=counterspellSuccess(message);if(success&&!await vaultCounterspell({itemUuid:item.uuid,messageUuid},{user:owner}))throw Error('Counterspell succeeded but vaulting was not confirmed. Review the interrupted action manually.');
  return {attempted:true,success};
 }finally{attempts.delete(attemptId);if(reservations.get(item.uuid)===request.pendingId)reservations.delete(item.uuid);}
}
export async function interruptCounterable(action,config,dependencies={}){
 if(!counterableAction(action)||!game.user.isGM||config.hasRoll!==false&&config.evaluate===false||!counterspellCandidates().length)return false;
 const dispatch=dependencies.send??send,request=dependencies.request??resolutionRequest;
 const pendingId=await dispatch({op:'open',actorUuid:action.actor.uuid,itemUuid:action.item.uuid,actionId:actionId(action)});if(!pendingId)throw Error('Counterspell could not open its interruption window.');
 const session=foundry.utils.randomID(),used=new Set();let previous=null,lastUsed=false;
 try{for(let n=0;n<100;n++){
  const rows=counterspellCandidates().filter(item=>!used.has(item.uuid)).map(item=>({id:`counterspell:${item.uuid}`,usageKey:item.uuid,kind:'counterspell',request:{pendingId,candidate:{itemUuid:item.uuid}}}));
  if(!rows.length)return false;
  const choice=await request({op:'round',id:session,actorUuid:action.actor.uuid,roll:{effect:action.name,total:0,hope:0,fear:0},rows,previous});if(!choice)return false;
  used.add(choice.request.candidate.itemUuid);const result=await dispatch({...choice.request,op:'use',resolutionToken:choice.token});lastUsed=Boolean(result?.attempted);previous={used:lastUsed,declined:!result?.attempted};
  if(result?.success){try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:action.actor}),content:`<p><strong>Counterspell:</strong> ${esc(action.name)} was interrupted. Its consequences were prevented.</p>`,whisper:['gmroll','blindroll'].includes(config.selectedMessageMode)?values(game.users).filter(u=>u.isGM).map(u=>u.id):config.selectedMessageMode==='selfroll'?[game.user.id]:[],blind:config.selectedMessageMode==='blindroll'});}catch(error){console.warn(`${ID} | Counterspell notification`,error);}return true;}
 }}finally{try{await request({op:'close',id:session,used:lastUsed});}finally{await dispatch({op:'close',pendingId});}}
 return false;
}
export function installCounterspell(Action,interrupt=interruptCounterable){
 if(Object.hasOwn(Action,WRAPPED))return;
 const use=Action.prototype.use,prepare=Action.prototype.prepareConfig,workflow=Action.prototype.executeWorkflow;
 Action.prototype.prepareConfig=function(...args){const config=prepare.apply(this,args),data=config?.[ID]?.counterspell;if(config&&data&&counterspellAvailable(this.item)&&actionId(this)===COUNTERSPELL_ACTION)configureCounterspell(this,config,data.difficulty);return config;};
 Action.prototype.executeWorkflow=async function(config,...args){if(counterableAction(this)){try{if(await interrupt(this,config))return false;}catch(error){ui.notifications.error(`Counterspell check failed; the original action stopped before consequences: ${error.message}`);throw error;}}return workflow.call(this,config,...args);};
 Action.prototype.use=async function(event,options={},...args){
  const key=this.item?.flags?.[ID]?.applied?.key??this.item?.flags?.[ID]?.premade?.key;
  if(actionId(this)!==COUNTERSPELL_ACTION||key!==COUNTERSPELL_KEY)return use.call(this,event,options,...args);
  if(!counterspellAvailable(this.item)){ui.notifications.warn('Counterspell must be active in your Loadout.');return;}
  let difficulty=options[ID]?.counterspell?.difficulty;
  if(difficulty==null){const targets=values(game.user.targets).filter(t=>t.actor?.type==='adversary');difficulty=targets.length===1?casterDifficulty(targets[0].actor):null;}
  if(difficulty==null){const gm=game.users.activeGM;if(!gm)throw Error('Ask an active GM to set Counterspell’s Difficulty.');const data={actorUuid:this.actor.uuid};difficulty=gm.isSelf?await promptCounterspellDifficulty(data,{user:game.user}):await gm.query(DIFFICULTY,data,{timeout:decisionBudget(65000)});}
  if(!difficulty)return;
  const result=await use.call(this,event??new Event('click'),{...options,[ID]:{...options[ID],counterspell:{...options[ID]?.counterspell,difficulty}}},...args);
  if(result?.message&&counterspellSuccess(result.message)&&!await send({op:'vault',itemUuid:this.item.uuid,messageUuid:result.message.uuid}))throw Error('Counterspell succeeded but vaulting was not confirmed. Stop the effect and review the card manually.');return result;
 };
 Object.defineProperty(Action,WRAPPED,{value:true});
}
export function registerCounterspell(){
 CONFIG.queries[QUERY]=resolveCounterspell;CONFIG.queries[ROLL]=rollCounterspell;CONFIG.queries[DIFFICULTY]=promptCounterspellDifficulty;
 registerResolutionProvider('counterspell',async(request,user)=>{const valid=await validPending(request,user);return valid?{owner:valid.owner,name:'Counterspell',bearerName:valid.item.actor.name,cost:'Vault card on success',description:valid.item.system.description,useLabel:'Interrupt',declineLabel:'Pass'}:null;});
 installCounterspell(game.system.api.data.actions.actionsTypes.base);
 Hooks.on('renderActionConfig',renderCounterspellSetting);
 Hooks.on('renderApplicationV2',(app,html)=>{const configs=game.system.api.applications.sheetConfigs;if(app.constructor===configs?.ActionConfig||app.constructor===configs?.AdversarySettings)renderCounterspellSetting(app,html);});
}
