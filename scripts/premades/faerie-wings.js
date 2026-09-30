import {recordEvasionBonus,saveEvasionBonuses} from '../evasion-indicators.js';
import { decisionBudget } from '../settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { ID } from '../core.js';
import { ownerFor } from './aura-rules.js';
import { markReactiveStress } from './stress-payment.js';
import { FAERIE_KEY, FAERIE_ACTION } from './faerie-wings-data.js';
const QUERY = `${ID}.faerieWingsOffer`;
const PROMPT = `${ID}.faerieWingsPrompt`;
const WRAPPED = Symbol.for(`${ID}.faerieWingsWrapped`);
export const AVOIDED = Symbol('faerieWingsAvoided');
const preparedWorkflows = new WeakSet();
const queues = new Map(), requests = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function faerieWingsItem(actor) {
  const stress=actor?.system?.resources?.stress;
  if (actor?.type!=='character'||!actor.statuses?.has('fly')||!(Number(stress?.value)<Number(stress?.max))) return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!item.flags?.[ID]?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===FAERIE_KEY;
  })??null;
}
export function wingsWouldMiss(actor,total,critical=false,evasion=Number(actor?.system?.evasion),allowAdjustedEvasion=false) {
  return Boolean(!critical&&Number.isFinite(total)&&Number.isFinite(evasion)&&
    total>=evasion&&total<evasion+2&&(allowAdjustedEvasion||Number(actor?.system?.evasion)===evasion)&&faerieWingsItem(actor));
}
export async function promptFaerieWings(data,{user}) {
  if(!user.isGM)throw new Error('Only a GM may request a Wings decision.');
  const actor=await fromUuid(data.actorUuid);
  if(!actor?.testUserPermission(game.user,'OWNER')||!wingsWouldMiss(actor,data.total,false,data.evasion))return false;
  const deadline=Math.min(data.deadline,decisionNow()+decisionBudget(60000));
  if(deadline<=decisionNow())return false;
  let dialog,timer,interval;
  const title=()=>`Wings — ${actor.name} ${decisionCountdown(deadline)}`;
  const decision=foundry.applications.api.DialogV2.wait({
    window:{title:title()},position:{width:470},
    content:`<p><strong>${esc(data.attackerName)}</strong> rolled <strong>${esc(data.total)}</strong> against ${esc(actor.name)}’s Evasion of <strong>${esc(data.evasion)}</strong>.</p>
      <p>Mark <strong>1 Stress</strong> to use Wings? Your Evasion becomes <strong>${esc(data.evasion+2)}</strong> against this attack, making it <strong>miss</strong>.</p>`,
    buttons:[{action:'use',label:'Mark 1 Stress',icon:'fa-solid fa-bolt',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}],rejectClose:false,
    render:(_event,app)=>{dialog=app;clearInterval(interval);interval=setInterval(()=>{if(dialog?.window?.title)dialog.window.title.textContent=title();},250);}
  });
  try{return Boolean(await Promise.race([decision,new Promise(resolve=>{timer=decisionTimeout(()=>resolve(false),deadline-decisionNow());})]));}
  finally{clearDecisionTimeout(timer);clearInterval(interval);if(dialog?.rendered)await dialog.close();}
}
export async function resolveFaerieWings(request,{user}) {
  if(!game.user.isActiveGM)throw new Error('Wings needs the active GM.');
  if(!user?.active||typeof request.id!=='string'||request.id.length>64||request.critical||
    !Number.isFinite(request.total)||!Number.isFinite(request.evasion)||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid Wings request.');
  const key=`${user.id}:${request.id}`;
  for(const [id,entry]of requests)if(entry.expires<decisionNow())requests.delete(id);
  if(requests.has(key))return requests.get(key).promise;
  const promise=(queues.get(request.actorUuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
    const attacker=await fromUuid(request.attackerUuid);
    if(attacker?.type!=='adversary'||!attacker.testUserPermission(user,'OWNER'))throw new Error('You do not own the attacking adversary.');
    const actor=await fromUuid(request.actorUuid);
    if(request.deadline<=decisionNow()||!wingsWouldMiss(actor,request.total,false,request.evasion))return false;
    let recipient=ownerFor(actor,[...game.users],game.user);
    const data=()=>({...request,attackerName:attacker.name,deadline:Math.min(request.deadline-2000,decisionNow()+decisionBudget(60000))});
    let accepted;
    try{accepted=recipient.isSelf?await promptFaerieWings(data(),{user:game.user}):await recipient.query(PROMPT,data(),{timeout:decisionBudget(65000)});}
    catch(error){if(recipient.active)throw error;recipient=ownerFor(actor,[...game.users],game.user);accepted=recipient.isSelf?await promptFaerieWings(data(),{user:game.user}):await recipient.query(PROMPT,data(),{timeout:decisionBudget(65000)});}
    if(!accepted||!user.active||request.deadline<=decisionNow())return false;
    return markReactiveStress(request.actorUuid,actor=>wingsWouldMiss(actor,request.total,false,request.evasion));
  });
  queues.set(request.actorUuid,promise);requests.set(key,{promise,expires:decisionNow()+decisionBudget(300000)});
  try{return await promise;}finally{if(queues.get(request.actorUuid)===promise)queues.delete(request.actorUuid);}
}
async function offerFaerieWings(attacker,actor,total,evasion) {
  const gm=game.users.activeGM;
  if(!gm)throw new Error('Wings needs an active GM.');
  const request={id:foundry.utils.randomID(),attackerUuid:attacker.uuid,actorUuid:actor.uuid,total,evasion,critical:false,deadline:decisionNow()+decisionBudget(120000)};
  return gm.isSelf?resolveFaerieWings(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
}
export function installFaerieWings(TargetField,offer=offerFaerieWings) {
  if(TargetField[WRAPPED])return;
  const native=TargetField.execute;
  if(typeof native!=='function')throw new Error('Unsupported Daggerheart target resolution API.');
  TargetField.execute=async function(config) {
    const result=await native.call(this,config);
    if(this.actor?.type!=='adversary'||this.type!=='attack'||!config.hasRoll||config.roll?.isCritical)return result;
    const resolved=new Map();let changed=false;
    for(const target of config.targets??[]) {
      if(!target.hitResult?.success)continue;
      const actor=await fromUuid(target.actorId),evasion=Number(target.evasion);
      // A custom difficulty is not necessarily an Evasion attack.
      if(target.difficulty&&Number(target.difficulty)!==evasion)continue;
      if(!Number.isFinite(evasion)||config.roll.total<evasion||config.roll.total>=evasion+2)continue;
      if(!wingsWouldMiss(actor,config.roll.total,false,evasion)&&!resolved.has(actor?.uuid))continue;
      let accepted=resolved.get(actor.uuid);
      if(accepted===undefined){
        try{accepted=await offer(this.actor,actor,config.roll.total,evasion);}
        catch(error){ui.notifications.error(`Wings stopped attack resolution: ${error.message}`);throw error;}
        resolved.set(actor.uuid,accepted);
      }
      if(!accepted)continue;
      recordEvasionBonus(config,target,'Wings',2,actor.name);
      target.evasion=evasion+2;
      if(target.difficulty)target.difficulty=evasion+2;
      target.hit=false;target.hitResult={...target.hitResult,success:false};
      changed=true;
    }
    if(changed){
      config[AVOIDED]=true;
      config.roll.success=config.targets.some(target=>target.hitResult?.success);
      config.successConsumed=config.roll.success;
      if(config.message?.update)await config.message.update({'system.targets':config.targets,'system.roll.success':config.roll.success});
      await saveEvasionBonuses(config);
    }
    return result;
  };
  Object.defineProperty(TargetField,WRAPPED,{value:true});
}
export function prioritizeFaerieWings(action, includeCharacters = false) {
  if ((!includeCharacters && action.actor?.type !== 'adversary') || action.type !== 'attack') return;
  const workflow = action.workflow;
  if (!workflow || preparedWorkflows.has(workflow)) return;
  const steps = [...workflow];
  const target = steps.find(([key]) => key === 'target');
  const damage = steps.find(([key]) => key === 'damage');
  if (!target || !damage || !workflow.has('roll')) return;
  // Native TargetField and DamageField both have order 20; put target resolution
  // directly after the attack roll, including already-cached action workflows.
  const ordered = steps.filter(([key]) => key !== 'target');
  ordered.splice(ordered.findIndex(([key]) => key === 'roll') + 1, 0, target);
  const nativeDamage = damage[1].execute;
  const guardedDamage = { ...damage[1], execute: async function(config, messageId, force = false) {
    if (!force && config[AVOIDED] && config.targets?.length &&
        config.targets.every(target => !target.hitResult?.success)) return;
    return nativeDamage.call(this, config, messageId, force);
  } };
  workflow.clear();
  for (const [key, step] of ordered) workflow.set(key, key === 'damage' ? guardedDamage : step);
  preparedWorkflows.add(workflow);
}
export function registerFaerieWings(managed=false) {
  CONFIG.queries[QUERY]=resolveFaerieWings;CONFIG.queries[PROMPT]=promptFaerieWings;
  if(!managed)installFaerieWings(game.system.api.fields.ActionFields.TargetField);
  Hooks.on('daggerheart.preUseAction',action=>{
    prioritizeFaerieWings(action);
    const flags=action.item?.flags?.[ID];
    if(action.id!==FAERIE_ACTION||(flags?.applied?.key??flags?.premade?.key)!==FAERIE_KEY)return;
    ui.notifications.info('Wings is offered automatically when +2 Evasion would avoid an adversary attack while Flying.');return false;
  });
}
