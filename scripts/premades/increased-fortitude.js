import { decisionBudget } from '../settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { ID } from '../core.js';
import { ownerFor } from './aura-rules.js';
import { FORTITUDE_KEY, FORTITUDE_ACTION } from './increased-fortitude-data.js';
const QUERY = `${ID}.fortitudeOffer`;
const PROMPT = `${ID}.fortitudePrompt`;
const WRAPPED = Symbol.for(`${ID}.fortitudeWrapped`);
const queues = new Map();
const receipts = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function fortitudeItem(actor) {
  if (actor?.type !== 'character' || !(Number(actor.system.resources.hope.value) >= 3)) return null;
  return actor.items.find(item => {
    const flags = item.flags?.[ID];
    return item.type === 'feature' && !item.flags?.[ID]?.disabled && !item.system.inactive &&
      (flags?.applied?.key ?? flags?.premade?.key) === FORTITUDE_KEY;
  }) ?? null;
}
export function incomingPhysical(args = {}) {
  const damage = 'total' in args ? args : (args.main ?? args.damage);
  const total = typeof damage === 'number' ? damage : damage?.total;
  const types = Array.from(damage?.options?.damageTypes ?? damage?.damageTypes ?? []);
  // A mixed/unspecified packet has no separate physical amount to halve safely.
  if (!Number.isFinite(total) || total <= 0 || !types.length || !types.every(type => type === 'physical')) return null;
  return { total, types, halved: Math.ceil(total / 2) };
}
export function reducedArguments(args, damage) {
  return { main: { total: damage.halved, options: { damageTypes: [...damage.types] } }, resources: args.resources };
}
async function serial(actorUuid, task) {
  const pending = (queues.get(actorUuid) ?? Promise.resolve()).catch(() => {}).then(task);
  queues.set(actorUuid, pending);
  try { return await pending; }
  finally { if (queues.get(actorUuid) === pending) queues.delete(actorUuid); }
}
export async function promptFortitude(data, { user }) {
  if (!user.isGM) throw new Error('Only a GM may request an Increased Fortitude decision.');
  const actor = await fromUuid(data.actorUuid);
  if (!actor?.testUserPermission(game.user,'OWNER') || !fortitudeItem(actor)) return false;
  const deadline = Math.min(data.deadline, decisionNow() + decisionBudget(60000));
  if (deadline <= decisionNow()) return false;
  let dialog, timer, interval;
  const title = () => `Increased Fortitude — ${actor.name} ${decisionCountdown(deadline)}`;
  const decision = foundry.applications.api.DialogV2.wait({
    window: { title: title() }, position: { width: 470 },
    content: `<p><strong>${esc(actor.name)}</strong> is taking <strong>${esc(data.total)} physical damage</strong>.</p>
      <p>Spend <strong>3 Hope</strong> to reduce it to <strong>${esc(Math.ceil(data.total/2))}</strong> before damage thresholds and Armor reduction?</p>`,
    buttons: [
      { action:'use',label:'Spend 3 Hope',icon:'fa-solid fa-sun',callback:()=>true },
      { action:'decline',label:'Decline',default:true,callback:()=>false }
    ], rejectClose:false,
    render:(_event,app)=>{
      dialog=app;
      clearInterval(interval);
      interval=setInterval(()=>{ if (dialog?.window?.title) dialog.window.title.textContent=title(); },250);
    }
  });
  try { return Boolean(await Promise.race([decision,new Promise(resolve=>{timer=decisionTimeout(()=>resolve(false),deadline-decisionNow());})])); }
  finally { clearDecisionTimeout(timer); clearInterval(interval); if (dialog?.rendered) await dialog.close(); }
}
export async function resolveFortitude(request, { user }) {
  if (!game.user.isActiveGM) throw new Error('Increased Fortitude requires an active GM.');
  if (!user?.active || typeof request.id !== 'string' || request.id.length > 64 ||
      !Number.isFinite(request.deadline) || request.deadline > decisionNow()+decisionBudget(125000) ||
      !Number.isFinite(request.total) || request.total <= 0) throw new Error('Invalid Increased Fortitude request.');
  const key = `${user.id}:${request.id}`;
  if (receipts.has(key)) return receipts.get(key).promise;
  // Deduplicate repeated delivery of the same request for five minutes.
  for (const [id, receipt] of receipts) if (receipt.expires < decisionNow()) receipts.delete(id);
  const record = {expires:decisionNow()+decisionBudget(300000)};
  const promise = serial(request.actorUuid, async()=>{
    let actor = await fromUuid(request.actorUuid);
    if (!actor || (!user.isGM && !actor.testUserPermission(user,'OWNER'))) throw new Error('You do not own this actor.');
    if (request.deadline <= decisionNow() || !fortitudeItem(actor)) return false;
    let recipient = ownerFor(actor,[...game.users],game.user);
    const ask = () => ({actorUuid:actor.uuid,total:request.total,deadline:Math.min(request.deadline-2000,decisionNow()+decisionBudget(60000))});
    let accepted;
    try { accepted = recipient.isSelf ? await promptFortitude(ask(),{user:game.user}) : await recipient.query(PROMPT,ask(),{timeout:decisionBudget(65000)}); }
    catch(error) {
      if (recipient.active) throw error;
      recipient=ownerFor(actor,[...game.users],game.user);
      accepted=recipient.isSelf ? await promptFortitude(ask(),{user:game.user}) : await recipient.query(PROMPT,ask(),{timeout:decisionBudget(65000)});
    }
    if (!accepted || request.deadline <= decisionNow() || !user.active) return false;
    actor=await fromUuid(request.actorUuid);
    if (!fortitudeItem(actor)) return false;
    const hope=Number(actor.system.resources.hope.value);
    const updated=await actor.update({'system.resources.hope.value':hope-3});
    if (!updated || Number(actor.system.resources.hope.value)!==hope-3) throw new Error('Increased Fortitude could not spend Hope.');
    return true;
  });
  record.promise=promise;
  receipts.set(key,record);
  return promise;
}
async function offerFortitude(actor,damage) {
  const gm=game.users.activeGM;
  if (!gm) throw new Error('Increased Fortitude needs an active GM.');
  const request={id:foundry.utils.randomID(),actorUuid:actor.uuid,total:damage.total,deadline:decisionNow()+decisionBudget(120000)};
  const accepted=gm.isSelf ? await resolveFortitude(request,{user:game.user}) : await gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  if (!accepted) return null;
  return true;
}
export function installFortitude(ActorClass,offer=offerFortitude) {
  if (ActorClass[WRAPPED]) return;
  const native=ActorClass.prototype.takeDamage;
  if (typeof native!=='function') throw new Error('Unsupported Daggerheart damage API.');
  ActorClass.prototype.takeDamage=async function(args={},isDirect=false) {
    const damage=incomingPhysical(args);
    if (!damage || !fortitudeItem(this) || this.calculateDamage(damage.total,damage.types)<=0)
      return native.call(this,args,isDirect);
    let decision;
    try { decision=await offer(this,damage); }
    catch(error) { ui.notifications.error(`Increased Fortitude stopped damage application: ${error.message}`); throw error; }
    if (!decision) return native.call(this,args,isDirect);
    let result;
    try { result=await native.call(this,reducedArguments(args,damage),isDirect); }
    catch(error) {
      // A workflow exception can occur after partial application; do not assume that damage was cancelled.
      ui.notifications.error('Damage application failed after Increased Fortitude was paid. Check this actor’s damage and Hope before retrying.');
      throw error;
    }
    // Native null can also mean a postTakeDamage hook returned false after damage
    // was applied, so it is not reliable evidence that the payment should be refunded.
    if (result === null) ui.notifications.warn('The damage workflow returned no result after Increased Fortitude was paid. Check the actor before retrying.');
    return result;
  };
  Object.defineProperty(ActorClass,WRAPPED,{value:true});
}
export function registerIncreasedFortitude() {
  CONFIG.queries[QUERY]=resolveFortitude;
  CONFIG.queries[PROMPT]=promptFortitude;
  installFortitude(CONFIG.Actor.documentClass);
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if (action.id!==FORTITUDE_ACTION || (flags?.applied?.key ?? flags?.premade?.key)!==FORTITUDE_KEY) return;
    ui.notifications.info('Increased Fortitude is offered automatically when physical damage is applied.');
    return false;
  });
}
