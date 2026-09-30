import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {registerResolutionProvider,consumeResolutionTicket} from '../resolution-manager.js';
import {UMBRAL_VEIL_KEY,UMBRAL_VEIL_ACTIVATE,UMBRAL_VEIL_SPEND} from './umbral-veil-data.js';

const QUERY=`${ID}.umbralVeil`,PROMPT=`${QUERY}Prompt`;
const ACTIVATION_WRAP=Symbol.for(`${QUERY}Activation`);
const activating=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function umbralVeilItem(actor){
  if(actor?.type!=='character'||unavailableActor(actor))return null;
  return actor.items?.find(item=>{
    const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&
      !system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===UMBRAL_VEIL_KEY;
  })??null;
}
export function umbralVeilTokens(item){
  const count=Number(item?.system.resource?.value);return Number.isSafeInteger(count)&&count>0?count:0;
}
export function installUmbralVeilActivation(Action){
  if(Action[ACTIVATION_WRAP])return;const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
    if(this.id!==UMBRAL_VEIL_ACTIVATE||umbralVeilItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);
    if(activating.has(this.item.uuid))return false;activating.add(this.item.uuid);
    try{
      const result=await native.apply(this,args);
      if(!result||umbralVeilItem(this.actor)?.uuid!==this.item.uuid)return result;
      // Native use handles confirmation, Stress, uses and the card. Only add tokens after it commits.
      const fear=Number(game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.Resources.Fear));
      if(!Number.isSafeInteger(fear)||fear<0)throw Error('Umbral Veil could not read the GM Fear pool.');
      await withHopeLock(this.item.uuid,async()=>{
        const next=umbralVeilTokens(this.item)+fear,updated=await this.item.update({'system.resource.value':next});
        if(!updated||Number(this.item.system.resource.value)!==next)throw Error('Could not add Umbral Veil tokens.');
      });
      return result;
    }finally{activating.delete(this.item.uuid);}
  };
  Object.defineProperty(Action,ACTIVATION_WRAP,{value:true});
}
const threshold=target=>{const dc=Number(target.difficulty||target.evasion);return Number.isFinite(dc)&&dc>0?dc:null;};
function available(actor,roll,target){
  const item=umbralVeilItem(actor),dc=threshold(target);
  return Boolean(item&&umbralVeilTokens(item)&&Number.isFinite(roll?.total)&&!roll.isCritical&&
    (dc===null||roll.total>=dc));
}
export function collectUmbralVeilChoices(attacker,config,used=new Set()){
  if(!config.message?.uuid||!Number.isFinite(config.roll?.total)||config.roll.isCritical)return [];
  const rows=new Map();
  for(const target of config.targets??[]){
    const actor=canvas.tokens?.get(target.id)?.actor??foundry.utils.fromUuidSync?.(target.actorId),item=umbralVeilItem(actor);
    if(!item||used.has(item.uuid)||!available(actor,config.roll,target)||config.message.flags?.[ID]?.umbralVeil?.some(entry=>entry.itemUuid===item.uuid))continue;
    rows.set(item.uuid,{id:`umbral-veil:${item.uuid}`,usageKey:item.uuid,kind:'umbral-veil',request:{attackerUuid:attacker.uuid,actorUuid:actor.uuid,
      targetId:target.id,messageUuid:config.message.uuid,total:config.roll.total,critical:false,candidate:{itemUuid:item.uuid}}});
  }
  return [...rows.values()];
}
export async function validateUmbralVeil(request,user){
  if(!user?.active||!Number.isFinite(request.deadline)||request.deadline<=decisionNow())return null;
  const message=await fromUuid(request.messageUuid),action=message?.system?.action,attacker=action?.actor;
  const actor=await fromUuid(request.actorUuid),item=umbralVeilItem(actor),roll=message?.system?.roll;
  const target=message?.system?.targets?.find(entry=>entry.id===request.targetId&&entry.actorId===actor?.uuid);
  if(action?.type!=='attack'||attacker?.uuid!==request.attackerUuid||!attacker?.testUserPermission(user,'OWNER')||!item||
    item.uuid!==request.candidate?.itemUuid||!target||roll?.total!==request.total||Boolean(roll?.isCritical)!==request.critical||
    !available(actor,roll,target)||message.flags?.[ID]?.umbralVeil?.some(entry=>entry.itemUuid===item.uuid))return null;
  return {message,actor,item,roll,target,attacker,owner:ownerFor(actor,[...game.users],game.user)};
}
export function umbralVeilOptions(count,needed){
  return Array.from({length:count},(_,index)=>{
    const amount=index+1;return `<option value="${amount}"${amount===Math.min(count,Math.max(1,needed??1))?' selected':''}>${amount} token${amount===1?'':'s'} (−${amount})</option>`;
  }).join('');
}
export async function promptUmbralVeil(data,{user}){
  const actor=await fromUuid(data.actorUuid),item=umbralVeilItem(actor),count=umbralVeilTokens(item);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!count)return null;
  const needed=data.threshold==null?null:Math.max(1,data.total-data.threshold+1);
  return timedDialog(`Umbral Veil — ${actor.name}`,
    `<p><strong>${esc(data.attackerName)}</strong> rolled <strong>${data.total}</strong> against you. You have <strong>${count}</strong> Veil tokens.</p>`+
    `<p>${needed===null?'Difficulty/Evasion is unknown; resolve the final outcome manually.':`${needed} token${needed===1?'':'s'} would turn this hit into a miss${needed>count?' (more than your current pool; other defenses can combine with this penalty)':''}.`}</p>`+
    `<label>Tokens to spend <select name="veilTokens" style="width:100%">${umbralVeilOptions(count,needed)}</select></label>`,
    [{action:'spend',label:'Spend Tokens',callback:(_event,_button,dialog)=>Number(dialog.element.querySelector('[name="veilTokens"]').value)},
      {action:'decline',label:'Decline',default:true,callback:()=>null}]);
}
export function penalizeUmbralTargets(targets,actorUuid,amount,total){
  return targets.map(target=>{
    if(target.actorId!==actorUuid)return {...target};
    const dc=threshold(target),result={...target};
    if(dc!==null){
      if(Number.isFinite(Number(target.evasion)))result.evasion=Number(target.evasion)+amount;
      if(target.difficulty)result.difficulty=Number(target.difficulty)+amount;
      result.hit=total>=dc+amount;result.hitResult={...target.hitResult,success:result.hit};
    }else{
      // Native zero placeholders otherwise become spurious successes on recalculation.
      result.difficulty=null;result.evasion=null;result.hit=false;result.hitResult={...target.hitResult,success:false};
    }
    return result;
  });
}
export async function resolveUmbralVeil(request,{user},ask=promptUmbralVeil,authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const valid=await validateUmbralVeil(request,user);
  if(!valid||!authorize(request.resolutionToken,'umbral-veil',valid.item.uuid,user))return false;
  const owner=valid.owner,data={actorUuid:valid.actor.uuid,attackerName:valid.attacker.name,total:valid.roll.total,threshold:threshold(valid.target)};
  const amount=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!Number.isSafeInteger(amount)||amount<1||amount>umbralVeilTokens(valid.item)||!owner.active)return false;
  return withHopeLock(valid.item.uuid,async()=>{
    const current=await validateUmbralVeil(request,user),count=umbralVeilTokens(current?.item);
    if(!game.user.isActiveGM||!current||!owner.active||!current.actor.testUserPermission(owner,'OWNER')||amount>count)return false;
    const targets=penalizeUmbralTargets(current.message.system.targets,current.actor.uuid,amount,current.roll.total);
    const entry={itemUuid:current.item.uuid,actorUuid:current.actor.uuid,name:current.actor.name,amount,
      targetIds:targets.filter(target=>target.actorId===current.actor.uuid).map(target=>target.id)};
    const updated=await current.item.update({'system.resource.value':count-amount});
    if(!updated||umbralVeilTokens(current.item)!==count-amount)throw Error('Could not spend Umbral Veil tokens.');
    try{
      const saved=await current.message.update({'system.targets':targets,[`flags.${ID}.umbralVeil`]:[...(current.message.flags?.[ID]?.umbralVeil??[]),entry]});
      if(!saved)throw Error('Could not apply the Umbral Veil penalty.');
    }catch(error){await current.item.update({'system.resource.value':count});throw error;}
    return {...entry,targets,bearerName:current.actor.name};
  });
}
export function umbralVeilLines(message){
  if(!message.isContentVisible)return [];
  return (message.flags?.[ID]?.umbralVeil??[]).map(entry=>`${entry.name}: Umbral Veil −${entry.amount} to this attack against you (${message.system.roll.total-entry.amount}).`);
}
export function registerUmbralVeil(){
  CONFIG.queries[QUERY]=resolveUmbralVeil;CONFIG.queries[PROMPT]=promptUmbralVeil;
  installUmbralVeilActivation(game.system.api.data.actions.actionsTypes.base);
  registerResolutionProvider('umbral-veil',async(request,user)=>{
    const valid=await validateUmbralVeil({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:valid.owner,name:'Umbral Veil',bearerName:valid.actor.name,cost:`${umbralVeilTokens(valid.item)} tokens available`,description:valid.item.system.description};
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    if(action.id===UMBRAL_VEIL_SPEND&&umbralVeilItem(action.actor)?.uuid===action.item?.uuid){
      ui.notifications.info('Spend Umbral Veil tokens in Roll Resolution after an incoming attack.');return false;
    }
  });
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const lines=umbralVeilLines(message);if(!lines.length||html.querySelector('.dhp-umbral-veil'))return;
    const box=html.ownerDocument.createElement('div');box.className='dhp-umbral-veil';
    for(const line of lines){const p=html.ownerDocument.createElement('p');p.textContent=line;box.append(p);}
    html.querySelector('.message-content')?.append(box);
  });
}
