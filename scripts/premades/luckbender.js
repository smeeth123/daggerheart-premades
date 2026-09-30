import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { withHopeLock } from './hope-lock.js';
import { consumeResolutionTicket, resolutionTicketStatus } from '../resolution-manager.js';
import { ID } from '../core.js';
import { timedDialog } from '../dialog.js';
import { ownerFor, allied, tokenState, closeDistance } from './aura-rules.js';
import { sourceToken } from './hallowed-aura.js';
import { LUCK_KEY, LUCK_ACTION } from './luckbender-data.js';
const OFFER = `${ID}.luckbenderOffer`, PROMPT = `${ID}.luckbenderPrompt`;
const WRAPPED = Symbol.for(`${ID}.luckbenderWrapped`);
const queues = new Map(), requests = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const settings = () => game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
const limit = scene => closeDistance(scene,settings(),CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id);
const rangeState = scene => JSON.stringify([scene.grid,scene.flags?.daggerheart?.rangeMeasurement,settings()]);
export function luckbenderAvailable(item) {
  const flags=item?.flags?.[ID],actions=item?.system?.actions;
  const action=actions?.get?.(LUCK_ACTION)??actions?.[LUCK_ACTION];
  return item?.type==='feature'&&!flags?.disabled&&!item.system.inactive&&
    (flags?.applied?.key??flags?.premade?.key)===LUCK_KEY&&action?.uses?.recovery==='session'&&Number(action.uses.value??0)===0;
}
const affordable = actor => actor?.type==='character' && Number(actor.system.resources.hope.value)>=3;
export function luckbenderCandidates(actor) {
  const found=new Map();
  if(affordable(actor))for(const item of actor.items.filter(luckbenderAvailable))found.set(item.uuid,{itemUuid:item.uuid});
  const origin=sourceToken(actor);
  if(!origin)return [...found.values()];
  for(const token of canvas.tokens.placeables){
    if(!allied(origin.document,token.document)||!affordable(token.actor))continue;
    const distance=origin.distanceTo(token);
    const close=limit(canvas.scene);
    if(!Number.isFinite(distance)||!Number.isFinite(close)||distance>close)continue;
    for(const item of token.actor.items.filter(luckbenderAvailable)){
      const candidate={itemUuid:item.uuid,sourceTokenUuid:origin.document.uuid,bearerTokenUuid:token.document.uuid,
        sourceState:tokenState(origin.document),bearerState:tokenState(token.document),rangeState:rangeState(canvas.scene),distance};
      if(!found.has(item.uuid)||found.get(item.uuid).distance>distance)found.set(item.uuid,candidate);
    }
  }
  return [...found.values()];
}
export async function validateLuckbender(request,user) {
  if(!user?.active||request.deadline<=decisionNow())return null;
  const source=await fromUuid(request.sourceUuid),item=await fromUuid(request.candidate.itemUuid),bearer=item?.actor;
  if(!source?.testUserPermission(user,'OWNER')||source.type!=='character'||!luckbenderAvailable(item)||!affordable(bearer))return null;
  if(source.uuid===bearer.uuid)return {source,bearer,item};
  const sourceDoc=await fromUuid(request.candidate.sourceTokenUuid),bearerDoc=await fromUuid(request.candidate.bearerTokenUuid);
  if(sourceDoc?.actor?.uuid!==source.uuid||bearerDoc?.actor?.uuid!==bearer.uuid||
    sourceDoc.parent?.id!==bearerDoc.parent?.id||!allied(sourceDoc,bearerDoc))return null;
  let distance;
  if(canvas.ready&&canvas.scene.id===sourceDoc.parent.id&&sourceDoc.object&&bearerDoc.object)distance=sourceDoc.object.distanceTo(bearerDoc.object);
  else {
    if(tokenState(sourceDoc)!==request.candidate.sourceState||tokenState(bearerDoc)!==request.candidate.bearerState||rangeState(sourceDoc.parent)!==request.candidate.rangeState)return null;
    distance=request.candidate.distance;
  }
  const close=limit(sourceDoc.parent);
  if(!Number.isFinite(distance)||!Number.isFinite(close)||distance>close)return null;
  return {source,bearer,item};
}
export async function promptLuckbender(data,{user}) {
  if(!user.isGM)throw new Error('Only a GM may request a Luckbender decision.');
  const actor=await fromUuid(data.actorUuid);
  if(!actor?.testUserPermission(game.user,'OWNER'))return false;
  const text=data.consent
    ? `<p>${esc(data.bearerName)} wants to use Luckbender on <strong>${esc(data.sourceName)}’s action roll</strong>.</p><p>Allow your Hope and Fear dice to be rerolled? The new result will replace this result.</p>`
    : `<p><strong>${esc(data.sourceName)}</strong> rolled <strong>${esc(data.total)}</strong> (Hope ${esc(data.hope)}, Fear ${esc(data.fear)}).</p><p>Spend <strong>3 Hope</strong> and <strong>${esc(data.bearerName)}’s once-per-session Luckbender</strong> to reroll the Hope and Fear dice?${data.ally?' Your ally must agree.':''}</p>`;
  return Boolean(await timedDialog(`Luckbender — ${actor.name}`,text,[
    {action:'use',label:data.consent?'Allow reroll':'Spend 3 Hope',icon:'fa-solid fa-dice',callback:()=>true},
    {action:'decline',label:'Decline',default:true,callback:()=>false}
  ]));
}
export async function resolveLuckbender(request,{user}) {
  if(!game.user.isActiveGM)throw new Error('Luckbender needs an active GM.');
  if(typeof request.id!=='string'||request.id.length>64||request.actionType!=='action'||!request.candidate?.itemUuid||
    !Number.isFinite(request.total)||!Number.isFinite(request.hope)||!Number.isFinite(request.fear)||
    !Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(140000))throw new Error('Invalid Luckbender request.');
  const key=`${user.id}:${request.id}`;
  for(const [id,r]of requests)if(r.expires<decisionNow())requests.delete(id);
  if(requests.has(key))return requests.get(key).promise;
  const queueKey=request.candidate.itemUuid.split('.Item.')[0];
  const promise=(queues.get(queueKey)??Promise.resolve()).catch(()=>{}).then(async()=>{
    let valid=await validateLuckbender(request,user);if(!valid)return false;
    const ask=async(actor,consent)=>{
      const recipient=ownerFor(actor,[...game.users],game.user);
      const data={actorUuid:actor.uuid,sourceName:valid.source.name,bearerName:valid.bearer.name,ally:valid.source.uuid!==valid.bearer.uuid,
        total:request.total,hope:request.hope,fear:request.fear,consent};
      const accepted=recipient.isSelf?await promptLuckbender(data,{user:game.user}):await recipient.query(PROMPT,data,{timeout:decisionBudget(65000)});
      return {accepted,recipient};
    };
    const accepted=request.resolutionToken?consumeResolutionTicket(request.resolutionToken,'luck',request.candidate.itemUuid,user):(await ask(valid.bearer,false)).accepted;
    if(!accepted)return false;
    if(valid.source.uuid!==valid.bearer.uuid){
      if(request.resolutionToken)await resolutionTicketStatus(request.resolutionToken,'Awaiting consent');
      if(!(await ask(valid.source,true)).accepted)return false;
      if(request.resolutionToken)await resolutionTicketStatus(request.resolutionToken,'Resolving');
    }
    valid=await validateLuckbender(request,user);if(!valid)return false;
    return withHopeLock(valid.bearer.uuid,async()=>{
    valid=await validateLuckbender(request,user);if(!valid)return false;
    const hope=Number(valid.bearer.system.resources.hope.value),path=`system.actions.${LUCK_ACTION}.uses.value`;
    const spent=await valid.item.update({[path]:1});
    if(!spent||luckbenderAvailable(valid.item))throw new Error('Could not spend Luckbender’s session use.');
    try {
      const updated=await valid.bearer.update({'system.resources.hope.value':hope-3});
      if(!updated||Number(valid.bearer.system.resources.hope.value)!==hope-3)throw new Error('Could not spend Luckbender’s Hope.');
    } catch(error) {await valid.item.update({[path]:0});throw error;}
    return {bearerName:valid.bearer.name,itemUuid:valid.item.uuid};
    });
  });
  queues.set(queueKey,promise);requests.set(key,{promise,expires:decisionNow()+decisionBudget(300000)});
  try{return await promise;}finally{if(queues.get(queueKey)===promise)queues.delete(queueKey);}
}
async function offerLuckbender(roll,showResult) {
  const actor=roll.data?.parent??(roll.options.source?.actor?await fromUuid(roll.options.source.actor):null);
  if(!actor)return null;
  const candidates=luckbenderCandidates(actor);if(!candidates.length)return null;
  const gm=game.users.activeGM;if(!gm)throw new Error('Luckbender needs an active GM.');
  await showResult();
  for(const candidate of candidates){
    const request={id:foundry.utils.randomID(),sourceUuid:actor.uuid,candidate,actionType:'action',deadline:decisionNow()+decisionBudget(135000),
      total:roll.total,hope:roll.dHope.total,fear:roll.dFear.total};
    const result=gm.isSelf?await resolveLuckbender(request,{user:game.user}):await gm.query(OFFER,request,{timeout:decisionBudget(140000)});
    if(result)return result;
  }
  return null;
}
export async function rerollDualityDice(roll) {
  const original=[roll.dHope,roll.dFear];
  const fresh=original.map(die=>{
    const options={...die.options};delete options.sfx;
    return new die.constructor({number:die.number,faces:die.faces,modifiers:[...die.modifiers],options});
  });
  const pair=foundry.dice.Roll.fromTerms([fresh[0],new foundry.dice.terms.OperatorTerm({operator:'+'}),fresh[1]]);
  await pair.evaluate();
  for(let index=0;index<original.length;index++){
    const position=roll.terms.indexOf(original[index]);
    if(position<0)throw new Error('The Duality dice are not in the expected roll structure.');
    roll.terms[position]=fresh[index];
  }
  roll._total=roll._evaluateTotal();
  return pair;
}
export async function animateLuckbenderReroll(pair,config,preview) {
  if(!pair||!game.dice3d)return;
  const cls=getDocumentClass('ChatMessage');
  const message=preview??(config.source?.message?ui.chat.collection.get(config.source.message):null)
    ??cls.applyMode({},config.selectedMessageMode??game.settings.get('core','messageMode'));
  // Updating a roll in place does not trigger Dice So Nice's added-roll hook.
  // Animate only the replacement Duality dice, with the original audience.
  try {
    await game.dice3d.showForRoll(pair,game.user,true,message.whisper?.length?message.whisper:null,Boolean(message.blind));
  } catch(error) {
    console.warn('Daggerheart Premades | Luckbender dice animation failed',error);
  }
}
export async function showLuckbenderResult(RollClass,roll,config) {
  if(config.skips?.createMessage||config.source?.message)return null;
  const cls=getDocumentClass('ChatMessage');
  config.selectedMessageMode??=game.settings.get('core','messageMode');
  const message=await cls.create({type:RollClass.messageType,user:game.user.id,title:roll.title,
    speaker:cls.getSpeaker({actor:roll.data?.parent}),sound:config.mute?null:CONFIG.sounds.dice,
    system:foundry.utils.deepClone(config),rolls:[roll],flags:{[ID]:{luckbenderPending:true}}
  },{messageMode:config.selectedMessageMode});
  if(roll.formula!==''&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  return message;
}
export function installLuckbender(RollClass,offer=offerLuckbender,reroll=rerollDualityDice,showResult=showLuckbenderResult,includeReactions=false) {
  if(RollClass[WRAPPED])return;
  const build=RollClass.buildEvaluate,evaluate=RollClass.prototype._evaluate;
  const pending=new WeakMap(),previews=new WeakMap();
  const toMessage=RollClass.toMessage;
  RollClass.toMessage=async function(roll,config){
    const preview=previews.get(roll);
    if(!preview)return toMessage.call(this,roll,config);
    // Native toMessage builds its complete payload and handles reload at the usual
    // workflow stage. Its unevaluated branch returns that payload without creating
    // another message. The proxy leaves the actual evaluated roll untouched.
    const payload=await toMessage.call(this,new Proxy(roll,{get(target,key,receiver){
      return key==='_evaluated'?false:Reflect.get(target,key,receiver);
    }}),config);
    payload.rolls=[roll.toJSON()];
    payload[`flags.${ID}.-=luckbenderPending`]=null;
    await preview.update(payload);
    previews.delete(roll);
    return preview;
  };
  RollClass.buildEvaluate=async function(roll,...args){
    pending.set(roll,args[0]);try{return await build.call(this,roll,...args);}finally{pending.delete(roll);}
  };
  RollClass.prototype._evaluate=async function(options={}){
    const result=await evaluate.call(this,options);
    if(!pending.has(this)||(!includeReactions&&this.options.actionType!=='action')||options.minimize||options.maximize)return result;
    try{
      const decision=await offer(this,async()=>{
        if(!previews.has(this)){
          const message=await showResult(RollClass,this,pending.get(this));
          if(message)previews.set(this,message);
        }
        return previews.get(this);
      },pending.get(this));if(!decision)return result;
      const original={hope:this.dHope.total,fear:this.dFear.total,total:this.total};
      const pair=await reroll(this);
      await animateLuckbenderReroll(pair,pending.get(this),previews.get(this));
      this.options[ID]={...this.options[ID],luckbender:{...decision,original}};
    }catch(error){ui.notifications.error(`Roll resolution stopped before consequences: ${error.message}`);throw error;}
    return result;
  };
  Object.defineProperty(RollClass,WRAPPED,{value:true});
}
export function registerLuckbender(offer) {
  CONFIG.queries[OFFER]=resolveLuckbender;CONFIG.queries[PROMPT]=promptLuckbender;
  installLuckbender(CONFIG.Dice.daggerheart.DualityRoll,offer,undefined,undefined,Boolean(offer));
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(action.id!==LUCK_ACTION||(flags?.applied?.key??flags?.premade?.key)!==LUCK_KEY)return;
    ui.notifications.info('Luckbender is offered automatically after an eligible action roll, before its consequences.');return false;
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(message.flags?.[ID]?.luckbenderPending){
      for(const control of html.querySelectorAll('button, [data-action]')){
        control.disabled=true;control.setAttribute('aria-disabled','true');
        control.style.pointerEvents='none';
      }
    }
    const used=message.rolls?.find(roll=>roll.options?.[ID]?.luckbender)?.options[ID].luckbender;
    if(!used||html.querySelector('.dhp-luckbender-note'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-luckbender-note';
    note.textContent=`Luckbender: ${used.bearerName} rerolled the Hope and Fear dice.`;
    html.querySelector('.message-content')?.append(note);
  });
}
