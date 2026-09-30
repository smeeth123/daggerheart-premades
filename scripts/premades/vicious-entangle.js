import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {overwhelmHits} from './overwhelm.js';
import {whirlwindRange as veryCloseLimit} from './whirlwind.js';
import {ENTANGLE_KEY,ENTANGLE_CAST,ENTANGLE_EXTRA_EFFECT} from './vicious-entangle-data.js';

const QUERY=`${ID}.viciousEntangle`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),pending=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function viciousEntangleAction(action){
  const item=action?.item,flags=item?.flags?.[ID],system=item?.system;
  return Boolean(action?.id===ENTANGLE_CAST&&action.type==='attack'&&action.actionType!=='reaction'&&action.actor?.type==='character'&&
    item?.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&
    (flags?.applied?.key??flags?.premade?.key)===ENTANGLE_KEY);
}
export function viciousEntangleState(message){
  const data=message?.system,action=data?.action,actor=action?.actor;
  if(!canvas.ready||!viciousEntangleAction(action)||message.speaker?.scene&&message.speaker.scene!==canvas.scene?.id)return null;
  const limit=veryCloseLimit();if(!Number.isFinite(limit)||limit<0)return null;
  const anchors=overwhelmHits(message).filter(hit=>{
    const threshold=Number(hit.difficulty||hit.evasion),roll=data.roll;
    return roll.isCritical||roll.options?.[ID]?.trueStrike||roll.options?.[ID]?.witchsCharm||Number.isFinite(threshold)&&threshold>0;
  }).map(hit=>canvas.tokens.get(hit.id)).filter(token=>token&&token.actor?.uuid===data.targets.find(hit=>hit.id===token.id)?.actorId&&!token.document.hidden);
  if(!anchors.length)return null;
  const seen=new Set([actor.uuid,...data.targets.map(target=>target.actorId)]),targets=[];
  for(const token of canvas.tokens.placeables){
    const target=token.actor,hp=target?.system?.resources?.hitPoints;
    if(target?.type!=='adversary'||seen.has(target.uuid)||token.document.hidden||unavailableActor(target)||target.statuses?.has('restrained')||
      target.system?.rules?.conditionImmunities?.restrained||hp&&Number(hp.value)>=Number(hp.max))continue;
    const anchor=anchors.find(origin=>{const distance=origin.distanceTo(token);return Number.isFinite(distance)&&distance>=0&&distance<=limit;});
    if(!anchor)continue;seen.add(target.uuid);
    targets.push({id:token.id,actorId:target.uuid,name:token.name??target.name,tokenUuid:token.document.uuid,
      anchorId:anchor.id,anchorUuid:anchor.document.uuid,anchorActorId:anchor.actor.uuid});
  }
  return targets.length?{actor,item:action.item,targets}:null;
}
export async function promptViciousEntangle(data,{user}){
  const actor=await fromUuid(data.actorUuid),item=actor?.items?.get?.(data.itemId);
  const action=item?.system?.actions?.get?.(ENTANGLE_CAST)??item?.system?.actions?.[ENTANGLE_CAST];
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!viciousEntangleAction(action)||
    !(Number(actor.system.resources?.hope?.value)>=1)||!data.targets?.length)return false;
  return timedDialog(`Vicious Entangle — ${actor.name}`,
    '<p>Spend <strong>1 Hope</strong> to temporarily <strong>Restrain</strong> one other adversary within Very Close of the target you hit? The extra target takes no damage.</p>'+
    data.targets.map((target,index)=>`<label style="display:block;margin:.35rem 0"><input type="radio" name="entangleTarget" value="${esc(target.id)}" ${index?'':'checked'}> ${esc(target.name)}</label>`).join(''),
    [{action:'use',label:'Spend 1 Hope',callback:(_event,_button,dialog)=>dialog.element.querySelector('[name="entangleTarget"]:checked')?.value??false},
      {action:'decline',label:'Decline',default:true,callback:()=>false}]);
}
export async function resolveViciousEntangle(request,{user},ask=promptViciousEntangle){
  if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string'||pending.has(request.messageUuid)||
    !Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  pending.add(request.messageUuid);
  try{
    const message=await fromUuid(request.messageUuid),state=viciousEntangleState(message);
    if(!state||!state.actor.testUserPermission(user,'OWNER')||!(Number(state.actor.system.resources?.hope?.value)>=1)||
      !state.item.effects?.get?.(ENTANGLE_EXTRA_EFFECT)||message.flags?.[ID]?.viciousEntangleOffered)return false;
    await message.setFlag(ID,'viciousEntangleOffered',true);
    const owner=ownerFor(state.actor,[...game.users],game.user),data={actorUuid:state.actor.uuid,itemId:state.item.id,targets:state.targets};
    const selected=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    const chosen=state.targets.find(target=>target.id===selected);if(!chosen)return false;
    return await withHopeLock(state.actor.uuid,async()=>{
      const fresh=viciousEntangleState(message),target=fresh?.targets.find(target=>target.id===chosen.id&&target.actorId===chosen.actorId&&
        target.tokenUuid===chosen.tokenUuid&&target.anchorUuid===chosen.anchorUuid&&target.anchorActorId===chosen.anchorActorId);
      if(!fresh||!target||!game.user.isActiveGM||!owner.active||!user.active||!fresh.actor.testUserPermission(user,'OWNER')||
        !fresh.actor.testUserPermission(owner,'OWNER')||request.deadline<=decisionNow()||message.flags?.[ID]?.viciousEntangle)return false;
      const recipient=canvas.tokens.get(target.id)?.actor,effect=fresh.item.effects?.get?.(ENTANGLE_EXTRA_EFFECT),hope=Number(fresh.actor.system.resources?.hope?.value);
      if(!recipient||recipient.uuid!==target.actorId||!effect||!(hope>=1))return false;
      const paid=await fresh.actor.update({'system.resources.hope.value':hope-1});
      if(!paid||Number(fresh.actor.system.resources.hope.value)!==hope-1)throw Error('Vicious Entangle could not spend Hope.');
      // Apply only the native extra effect, not another attack workflow or damage target.
      const before=new Set([...recipient.effects].map(effect=>effect.id));
      try{
        await game.system.api.fields.ActionFields.EffectsField.applyEffect(effect,recipient);
        if(![...recipient.effects].some(applied=>!before.has(applied.id)&&applied.origin===effect.uuid&&!applied.disabled&&applied.statuses?.has('restrained')))
          throw Error('The extra Restrained effect was not created.');
      }catch(error){await fresh.actor.update({'system.resources.hope.value':hope});throw error;}
      const record={actorUuid:fresh.actor.uuid,targetUuid:recipient.uuid,tokenUuid:target.tokenUuid,anchorUuid:target.anchorUuid};
      // Once the effect is committed, a receipt/chat failure must not refund a real benefit.
      await message.setFlag(ID,'viciousEntangle',record);
      await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:fresh.actor}),content:
        `<p><strong>Vicious Entangle:</strong> ${esc(fresh.actor.name)} spends 1 Hope; ${esc(recipient.name)} becomes temporarily Restrained.</p>`});
      return record;
    });
  }finally{pending.delete(request.messageUuid);}
}
export function installViciousEntangle(Action,dispatch){
  if(Action[WRAPPED])return;const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
    const config=await native.apply(this,args);
    // Native use commits roll Hope before returning. Damage and primary effects remain native.
    if(config?.message&&viciousEntangleAction(this)&&!config.message.flags?.[ID]?.viciousEntangleOffered&&
      Number(this.actor.system.resources?.hope?.value)>=1&&viciousEntangleState(config.message)){
      try{
        if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);
        await dispatch({messageUuid:config.message.uuid,deadline:decisionNow()+decisionBudget(120000)});
      }catch(error){console.error(`${ID} | Vicious Entangle`,error);ui.notifications.error(`Vicious Entangle extra target failed: ${error.message}. The completed cast was preserved.`);}
    }
    return config;
  };
  Object.defineProperty(Action,WRAPPED,{value:true});
}
export function registerViciousEntangle(){
  CONFIG.queries[QUERY]=resolveViciousEntangle;CONFIG.queries[PROMPT]=promptViciousEntangle;
  installViciousEntangle(game.system.api.data.actions.actionsTypes.base,request=>{
    const gm=game.users.activeGM;if(!gm)throw Error('Vicious Entangle needs an active GM on the target’s scene.');
    return gm.isSelf?resolveViciousEntangle(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  });
}
