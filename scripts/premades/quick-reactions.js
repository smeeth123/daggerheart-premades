import { decisionBudget } from '../settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { markReactiveStress } from './stress-payment.js';
import { ID } from '../core.js';
import { ownerFor } from './aura-rules.js';
import { QUICK_KEY, QUICK_ACTION } from './quick-reactions-data.js';
const QUERY = `${ID}.quickReactionsOffer`;
const PROMPT = `${ID}.quickReactionsPrompt`;
const WRAPPED = Symbol.for(`${ID}.quickReactionsWrapped`);
const queues = new Map();
const requests = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function quickReactionsItem(actor) {
  const stress=actor?.system?.resources?.stress;
  if (actor?.type!=='character' || !Number.isFinite(Number(stress?.value)) || !(Number(stress.value)<Number(stress.max))) return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature' && !item.flags?.[ID]?.disabled && !item.system.inactive && (flags?.applied?.key ?? flags?.premade?.key)===QUICK_KEY;
  }) ?? null;
}
export function reactionMode(roll) {
  const mode=roll.options?.roll?.advantage;
  return Number(mode?.type ?? mode ?? 0);
}
export function grantReactionAdvantage(roll,config) {
  const mode=reactionMode(roll) === -1 ? 0 : 1;
  config.roll.advantage=mode;
  roll.options.roll.advantage=mode;
  if (mode===1) {
    const faces=Number.parseInt(config.data?.rules?.roll?.defaultAdvantageDice);
    if (Number.isFinite(faces) && faces>0) roll.advantageFaces=faces;
  }
  roll.options[ID]={...roll.options[ID],quickReactions:true};
  // Rebuild the unevaluated native formula, retaining the configured traits/bonuses.
  roll.constructFormula();
}
export async function promptQuickReactions(data,{user}) {
  if (!user.isGM) throw new Error('Only a GM may request a Quick Reactions decision.');
  const actor=await fromUuid(data.actorUuid);
  if (!actor?.testUserPermission(game.user,'OWNER') || !quickReactionsItem(actor)) return false;
  const deadline=Math.min(data.deadline,decisionNow()+decisionBudget(60000));
  if (deadline<=decisionNow()) return false;
  let dialog,timer,interval;
  const title=()=>`Quick Reactions — ${actor.name} ${decisionCountdown(deadline)}`;
  const decision=foundry.applications.api.DialogV2.wait({
    window:{title:title()},position:{width:470},
    content:`<p><strong>${esc(actor.name)}</strong> is making a Reaction roll.</p>
      <p>Mark <strong>1 Stress</strong> to ${data.mode===-1 ? 'cancel disadvantage and roll normally' : 'gain advantage on this roll'}?</p>`,
    buttons:[
      {action:'use',label:'Mark 1 Stress',icon:'fa-solid fa-bolt',callback:()=>true},
      {action:'decline',label:'Decline',default:true,callback:()=>false}
    ],rejectClose:false,
    render:(_event,app)=>{dialog=app;clearInterval(interval);interval=setInterval(()=>{if(dialog?.window?.title)dialog.window.title.textContent=title();},250);}
  });
  try{return Boolean(await Promise.race([decision,new Promise(resolve=>{timer=decisionTimeout(()=>resolve(false),deadline-decisionNow());})]));}
  finally{clearDecisionTimeout(timer);clearInterval(interval);if(dialog?.rendered)await dialog.close();}
}
export async function resolveQuickReactions(request,{user}) {
  if (!game.user.isActiveGM) throw new Error('Quick Reactions needs the active GM.');
  if (!user?.active || typeof request.id!=='string' || request.id.length>64 || ![0,-1].includes(request.mode) ||
    !Number.isFinite(request.deadline) || request.deadline>decisionNow()+decisionBudget(125000)) throw new Error('Invalid Quick Reactions request.');
  const key=`${user.id}:${request.id}`;
  for(const [id,entry]of requests)if(entry.expires<decisionNow())requests.delete(id);
  if(requests.has(key))return requests.get(key).promise;
  const promise=(queues.get(request.actorUuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
    let actor=await fromUuid(request.actorUuid);
    if(!actor?.testUserPermission(user,'OWNER'))throw new Error('You do not own this actor.');
    if(request.deadline<=decisionNow()||!quickReactionsItem(actor))return false;
    let recipient=ownerFor(actor,[...game.users],game.user);
    const data=()=>({actorUuid:actor.uuid,mode:request.mode,deadline:Math.min(request.deadline-2000,decisionNow()+decisionBudget(60000))});
    let accepted;
    try{accepted=recipient.isSelf?await promptQuickReactions(data(),{user:game.user}):await recipient.query(PROMPT,data(),{timeout:decisionBudget(65000)});}
    catch(error){
      if(recipient.active)throw error;
      recipient=ownerFor(actor,[...game.users],game.user);
      accepted=recipient.isSelf?await promptQuickReactions(data(),{user:game.user}):await recipient.query(PROMPT,data(),{timeout:decisionBudget(65000)});
    }
    actor=await fromUuid(request.actorUuid);
    if(!accepted||!user.active||request.deadline<=decisionNow()||!quickReactionsItem(actor))return false;
    return markReactiveStress(request.actorUuid,quickReactionsItem);
  });
  queues.set(request.actorUuid,promise);
  requests.set(key,{promise,expires:decisionNow()+decisionBudget(300000)});
  try{return await promise;}finally{if(queues.get(request.actorUuid)===promise)queues.delete(request.actorUuid);}
}
async function offerQuickReactions(actor,mode) {
  const gm=game.users.activeGM;
  if(!gm)throw new Error('Quick Reactions needs an active GM.');
  const request={id:foundry.utils.randomID(),actorUuid:actor.uuid,mode,deadline:decisionNow()+decisionBudget(120000)};
  return gm.isSelf?resolveQuickReactions(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
}
export function installQuickReactions(D20Roll,offer=offerQuickReactions) {
  if(D20Roll[WRAPPED])return;
  const native=D20Roll.buildConfigure;
  if(typeof native!=='function')throw new Error('Unsupported Daggerheart roll configuration API.');
  // DualityRoll.buildConfigure calls this parent method as well, covering both roll types.
  D20Roll.buildConfigure=async function(config={},message={}) {
    const roll=await native.call(this,config,message);
    if(!roll||typeof roll.constructFormula!=='function'||roll._evaluated||roll.options?.actionType!=='reaction'||reactionMode(roll)===1)return roll;
    const actor=roll.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null);
    if(!quickReactionsItem(actor))return roll;
    try{if(await offer(actor,reactionMode(roll)))grantReactionAdvantage(roll,config);}
    catch(error){ui.notifications.error(`Quick Reactions stopped the roll before evaluation: ${error.message}`);throw error;}
    return roll;
  };
  Object.defineProperty(D20Roll,WRAPPED,{value:true});
}
export function registerQuickReactions() {
  CONFIG.queries[QUERY]=resolveQuickReactions;
  CONFIG.queries[PROMPT]=promptQuickReactions;
  installQuickReactions(CONFIG.Dice.daggerheart.D20Roll);
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(action.id!==QUICK_ACTION||(flags?.applied?.key??flags?.premade?.key)!==QUICK_KEY)return;
    ui.notifications.info('Quick Reactions is offered automatically before an eligible Reaction roll.');return false;
  });
}
