import {isHopePaymentCancellation,hopeCapacity,spendHope,refundHope} from './hope-payment.js';
import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {FEROCITY_KEY,FEROCITY_ACTION,FEROCITY_EFFECT} from './ferocity-data.js';

const QUERY=`${ID}.ferocity`,PROMPT=`${QUERY}Prompt`,DAMAGE_WRAP=Symbol.for(`${QUERY}Damage`),TAG_WRAP=Symbol.for(`${QUERY}Tag`),TARGET_WRAP=Symbol.for(`${QUERY}Targets`),ACTION_WRAP=Symbol.for(`${QUERY}Action`),requests=new Map(),attackCaptures=new WeakMap();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ferocityItem(actor){
  if(actor?.type!=='character'||actor.statuses?.has('dead')||actor.statuses?.has('defeated'))return null;
  return actor.items?.find(item=>{
    const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&
      (flags?.applied?.key??flags?.premade?.key)===FEROCITY_KEY;
  })??null;
}
export function ferocityEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired&&effect.flags?.[ID]?.ferocity===true);
}
export function ferocityPacketSource(packet){
  const rolls=[packet?.main??packet?.damage??packet,...Object.values(packet?.resources??{})];
  for(const roll of rolls){const flags=roll?.options?.[ID];if(flags?.ferocitySource)return flags.ferocitySource;if(flags?.elementalSource||flags?.friendAttack)return {actorUuid:flags.elementalSource??flags.friendAttack};}
  return null;
}
export function tagFerocityDamage(config){
  if(config.hasHealing)return false;
  const uuid=config.source?.actor??config.source?.actorUUID;
  const actor=config.data?.parent??game.messages?.get(config.source?.message)?.system?.action?.actor??(uuid?foundry.utils.fromUuidSync(uuid):null),item=ferocityItem(actor);
  if(!item)return false;
  const rolls=[config.damage?.main,...Object.values(config.damage?.resources??{})].filter(Boolean);
  if(!rolls.length)return false;
  for(const roll of rolls){roll.options??={};roll.options[ID]={...roll.options[ID],ferocitySource:{actorUuid:actor.uuid,itemUuid:item.uuid}};}
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),
    main:config.damage.main?.toJSON()??null,resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,roll])=>[key,roll.toJSON()]))});
  return true;
}
export async function promptFerocity(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!ferocityItem(actor)||!(hopeCapacity(actor)>=2)||!Number.isSafeInteger(data.hp)||data.hp<1)return false;
  return Boolean(await timedDialog(`Ferocity — ${actor.name}`,`<p>${esc(data.targetName)} marked <strong>${data.hp} HP</strong>.</p><p>Spend <strong>2 Hope</strong> for <strong>+${data.hp} Evasion</strong> until after the next attack against you?</p>`,[
    {action:'use',label:'Spend 2 Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
async function offer(actor,target,hp,ask){
  const item=ferocityItem(actor);if(!item||!(hopeCapacity(actor)>=2))return false;
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,targetName:target.name,hp};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted)return false;
  return withHopeLock(actor.uuid,async()=>{try{let hopePayment;
    if(!game.user.isActiveGM||!owner.active||!actor.testUserPermission(owner,'OWNER')||ferocityItem(actor)?.uuid!==item.uuid)return false;
    const hope=hopeCapacity(actor),template=item.effects?.get?.(FEROCITY_EFFECT)??item.effects?.find?.(e=>(e.id??e._id)===FEROCITY_EFFECT);
    if(!(hope>=2)||!template)return false;
    const effect=template.toObject?.()??structuredClone(template);delete effect._id;delete effect.uuid;
    effect.name=`Ferocity (+${hp} Evasion)`;effect.disabled=false;effect.transfer=false;effect.origin=template.uuid??`${item.uuid}.ActiveEffect.${FEROCITY_EFFECT}`;
    effect.system.changes=[{key:'system.evasion',type:'add',value:hp,priority:null,phase:'initial'}];
    effect.flags={...effect.flags,[ID]:{...effect.flags?.[ID],ferocity:true,ferocityHP:hp}};
    let created=[];
    try{
      const paid=(hopePayment=await spendHope(actor,2));if(!paid||!hopePayment)throw Error('Ferocity could not spend Hope.');
      created=await actor.createEmbeddedDocuments('ActiveEffect',[effect]);if(!created?.length)throw Error('Ferocity effect creation was canceled.');
    }catch(error){
      if(created?.length)await actor.deleteEmbeddedDocuments('ActiveEffect',created.map(e=>e.id));
      await refundHope(actor,hopePayment);throw error;
    }
    // Once the benefit is committed, a chat failure must not refund/repeat it.
    try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Ferocity</strong>: ${esc(actor.name)} spends 2 Hope and gains +${hp} Evasion until after the next attack against them.</p>`});}
    catch(error){console.error(`${ID} | Ferocity notification`,error);}
    return true;
  }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
}
function packetCopy(packet){
  const raw=packet.main??packet.damage??(Number.isFinite(packet.total)?packet:null);
  return {main:raw?.toJSON?.()??raw??null,resources:Object.fromEntries(Object.entries(packet.resources??{}).map(([key,roll])=>[key,roll?.toJSON?.()??roll]))};
}
export async function resolveFerocityDamage(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.isDirect!=='boolean')return null;
  const target=await fromUuid(request.targetUuid),source=ferocityPacketSource(request.packet),actor=source?.actorUuid?await fromUuid(source.actorUuid):null;
  if(target?.type!=='adversary'||!actor||(!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!target.testUserPermission(user,'OWNER')))return null;
  const key=`${target.uuid}:${user.id}:${request.id}`;if(requests.has(key))return requests.get(key);
  const operation=target.takeDamage(request.packet,request.isDirect);requests.set(key,operation);if(requests.size>512)requests.delete(requests.keys().next().value);return operation;
}
export async function expireFerocity(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Array.isArray(request.effectIds)||request.effectIds.length>1000)return false;
  const message=await fromUuid(request.messageUuid),action=message?.system?.action,actor=await fromUuid(request.actorUuid);
  const authorized=()=>game.user.isActiveGM&&user.active&&(user.isGM||action?.actor?.testUserPermission(user,'OWNER'))&&message?.system?.targets?.some(target=>target.actorId===actor?.uuid);
  if(action?.type!=='attack'||!Number.isFinite(message.system.roll?.total)||!actor||(!user.isGM&&!action.actor?.testUserPermission(user,'OWNER'))||
    !message.system.targets?.some(target=>target.actorId===actor.uuid))return false;
  return withHopeLock(`ferocity-expiry:${actor.uuid}`,async()=>{
    if(!authorized())return false;
    const allowed=new Set(request.effectIds),ids=ferocityEffects(actor).filter(effect=>allowed.has(effect.id)).map(effect=>effect.id);
    if(!ids.length)return false;await actor.deleteEmbeddedDocuments('ActiveEffect',ids);return true;
  });
}
export function captureFerocityTargets(action,config){
  if(action.type!=='attack')return;
  const captured=new Map();
  for(const target of config.targets??[]){const actor=foundry.utils.fromUuidSync(target.actorId),ids=ferocityEffects(actor).map(e=>e.id);if(ids.length)captured.set(target.actorId,ids);}
  attackCaptures.set(config,captured);
}
export function installFerocity(Damage,Actor,Target,dispatch,expire,ask=promptFerocity,Action){
  if(!Object.hasOwn(Damage,TAG_WRAP)){
    const evaluate=Damage.buildEvaluate,post=Damage.buildPost;
    Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagFerocityDamage(config);return result;};
    // Native manually entered damage skips evaluation but still posts its packet.
    Damage.buildPost=async function(roll,config,...args){tagFerocityDamage(config);return post.call(this,roll,config,...args);};
    Object.defineProperty(Damage,TAG_WRAP,{value:true});
  }
  if(!Object.hasOwn(Actor,DAMAGE_WRAP)){
    const native=Actor.prototype.takeDamage;
    Actor.prototype.takeDamage=async function(packet,...args){
      if(this.type!=='adversary')return native.call(this,packet,...args);
      const source=ferocityPacketSource(packet),actor=source?.actorUuid?await fromUuid(source.actorUuid):null;
      if(!ferocityItem(actor))return native.call(this,packet,...args);
      if(!game.user.isActiveGM)return dispatch({id:foundry.utils.randomID(),targetUuid:this.uuid,packet:packetCopy(packet),isDirect:Boolean(args[0])});
      return withHopeLock(`ferocity-damage:${this.uuid}`,async()=>{
        const before=Number(this.system.resources?.hitPoints?.value),prior=Object.getOwnPropertyDescriptor(this,'update'),update=this.update,pending=[];
        const capture=function(...args){const result=update.apply(this,args);pending.push(Promise.resolve(result));return result;};
        if(typeof update==='function')Object.defineProperty(this,'update',{value:capture,writable:true,configurable:true});
        let result;
        try{
          result=await native.call(this,packet,...args);
          let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}
        }finally{if(this.update===capture){if(prior)Object.defineProperty(this,'update',prior);else delete this.update;}}
        const marked=Number(this.system.resources?.hitPoints?.value)-before;
        const receiptHP=Array.isArray(result)?result.filter(row=>row.key==='hitPoints'&&!row.clear&&!row.itemId).reduce((n,row)=>n+Math.max(0,Number(row.value)||0),0):0;
        const hp=Math.min(marked,receiptHP);
        if(Number.isSafeInteger(hp)&&hp>0)try{await offer(actor,this,hp,ask);}catch(error){console.error(`${ID} | Ferocity after damage`,error);ui.notifications.error(`Ferocity could not complete: ${error.message}. The adversary’s damage was preserved; check Hope and effects before retrying.`);}
        return result;
      });
    };
    Object.defineProperty(Actor,DAMAGE_WRAP,{value:true});
  }
  if(!Object.hasOwn(Target,TARGET_WRAP)){
    const native=Target.execute;Target.execute=async function(config,...args){
      const captured=new Map();
      if(this.type==='attack')for(const target of config.targets??[]){const actor=await fromUuid(target.actorId);const ids=ferocityEffects(actor).map(e=>e.id);if(ids.length)captured.set(target.actorId,ids);}
      const result=await native.call(this,config,...args);
      if(result!==false&&this.type==='attack'&&config.message&&config.evaluate!==false&&Number.isFinite(config.message.system?.roll?.total))
        for(const [actorUuid,effectIds]of captured)if(config.targets?.some(target=>target.actorId===actorUuid))try{await expire({actorUuid,effectIds,messageUuid:config.message.uuid});}
        catch(error){console.error(`${ID} | Ferocity expiry`,error);ui.notifications.error('Ferocity could not expire its Evasion effect. Remove it manually; the completed attack was preserved.');}
      return result;
    };
    Object.defineProperty(Target,TARGET_WRAP,{value:true});
  }
  if(Action&&!Object.hasOwn(Action,ACTION_WRAP)){
    // Actions can cache bound TargetField methods before ready. The native
    // preTargetAction hook still runs; this fallback does not rewrite that cache.
    const native=Action.prototype.executeWorkflow;
    Action.prototype.executeWorkflow=async function(config,...args){
      captureFerocityTargets(this,config);
      try{
        const result=await native.call(this,config,...args),captured=attackCaptures.get(config);
        if(result!==false&&this.type==='attack'&&config.message&&config.evaluate!==false&&Number.isFinite(config.message.system?.roll?.total))
          for(const [actorUuid,ids]of captured??[]){
            const actor=await fromUuid(actorUuid),effectIds=ferocityEffects(actor).filter(e=>ids.includes(e.id)).map(e=>e.id);
            if(!effectIds.length||!config.targets?.some(target=>target.actorId===actorUuid))continue;
            try{await expire({actorUuid,effectIds,messageUuid:config.message.uuid});}
            catch(error){console.error(`${ID} | Ferocity cached-workflow expiry`,error);ui.notifications.error('Ferocity could not expire its Evasion effect. Remove it manually; the completed attack was preserved.');}
          }
        return result;
      }finally{attackCaptures.delete(config);}
    };
    Object.defineProperty(Action,ACTION_WRAP,{value:true});
  }
}
export function registerFerocity(){
  CONFIG.queries[QUERY]=(request,context)=>request.op==='expire'?expireFerocity(request,context):resolveFerocityDamage(request,context);
  CONFIG.queries[PROMPT]=promptFerocity;
  const dispatch=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Ferocity needs an active GM.');return gm.isSelf?resolveFerocityDamage(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(305000)});};
  const expire=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Ferocity expiry needs an active GM.');return gm.isSelf?expireFerocity(request,{user:game.user}):gm.query(QUERY,{...request,op:'expire'},{timeout:15000});};
  installFerocity(CONFIG.Dice.daggerheart.DamageRoll,CONFIG.Actor.documentClass,game.system.api.fields.ActionFields.TargetField,dispatch,expire,promptFerocity,game.system.api.data.actions.actionsTypes.base);
  Hooks.on('daggerheart.preTargetAction',captureFerocityTargets);
  Hooks.on('daggerheart.preUseAction',action=>{if(action.id===FEROCITY_ACTION&&ferocityItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Ferocity is offered automatically after an adversary marks HP from your damage.');return false;}});
}
