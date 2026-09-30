import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {UNCANNY_DISGUISE_KEY,UNCANNY_DISGUISE_ACTIVATE,UNCANNY_DISGUISE_SPEND,UNCANNY_DISGUISE_EFFECT} from './uncanny-disguise-data.js';
const QUERY=`${ID}.uncannyDisguise`,ACTION_WRAP=Symbol.for(`${QUERY}Action`),ROLL_WRAP=Symbol.for(`${QUERY}Roll`),activating=new Set(),receipts=new Set();
const operation=()=>foundry.utils.randomID();
export function uncannyDisguiseItem(actor,available=false){
  return actor?.type==='character'?actor.items?.find(item=>{
    const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===UNCANNY_DISGUISE_KEY&&
      (!available||(!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed);
  })??null:null;
}
export function disguiseTokens(item){const count=Number(item?.system.resource?.value);return Number.isSafeInteger(count)&&count>0?count:0;}
function template(item){return item.effects?.get?.(UNCANNY_DISGUISE_EFFECT)??item.effects?.find?.(effect=>(effect.id??effect._id)===UNCANNY_DISGUISE_EFFECT);}
const origin=item=>template(item)?.uuid??`${item.uuid}.ActiveEffect.${UNCANNY_DISGUISE_EFFECT}`;
export function disguiseEffects(item,activeOnly=true){
  return [...(item?.actor?.effects??[])].filter(effect=>effect.origin===origin(item)&&(!activeOnly||!effect.disabled&&!effect.isSuppressed));
}
export function disguiseState(actor){
  const item=uncannyDisguiseItem(actor),effects=item&&disguiseEffects(item);
  if(!item||!disguiseTokens(item)||!effects.length)return null;
  return {actorUuid:actor.uuid,itemUuid:item.uuid,generation:item.flags?.[ID]?.uncannyDisguise?.generation??effects.map(effect=>effect.id).sort().join('|'),effectIds:effects.map(effect=>effect.id)};
}
function effectData(item,generation){
  const source=template(item),data=source?.toObject?source.toObject():source?structuredClone(source):null;
  if(!data)throw Error('Uncanny Disguise effect is missing. Reapply Medkit.');
  delete data._id;delete data.id;delete data.uuid;delete data._stats;
  data.disabled=false;data.transfer=false;data.origin=origin(item);
  data.flags={...data.flags,[ID]:{...data.flags?.[ID],uncannyDisguise:{itemUuid:item.uuid,generation}}};
  return data;
}
function remember(key){receipts.add(key);if(receipts.size>512)receipts.delete(receipts.values().next().value);}
export async function resolveUncannyDisguise(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!['activate','spend','zero'].includes(request?.mode)||typeof request.operationId!=='string'||!request.operationId.length||request.operationId.length>128)return false;
  const actor=await fromUuid(request.actorUuid),item=uncannyDisguiseItem(actor,request.mode==='activate');
  if(!item||item.uuid!==request.itemUuid||!actor.testUserPermission(user,'OWNER'))return false;
  const receipt=`${item.uuid}:${request.operationId}`;
  return withHopeLock(item.uuid,async()=>{
    if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER')||uncannyDisguiseItem(actor,request.mode==='activate')?.uuid!==item.uuid||receipts.has(receipt))return false;
    if(request.mode==='zero'){
      if(disguiseTokens(item))return false;
      const ids=disguiseEffects(item,false).map(effect=>effect.id);if(!ids.length)return false;
      await actor.deleteEmbeddedDocuments('ActiveEffect',ids);remember(receipt);return true;
    }
    const before=disguiseTokens(item),prior=item.flags?.[ID]?.uncannyDisguise??null;
    if(request.mode==='activate'){
      if(prior?.generation===request.operationId)return false;
      const cast=Number(actor.getRollData().cast);if(!Number.isSafeInteger(cast))throw Error('Uncanny Disguise could not read the Spellcast trait.');
      const count=Math.max(0,cast),old=disguiseEffects(item,false).map(effect=>effect.id);
      const created=count?await actor.createEmbeddedDocuments('ActiveEffect',[effectData(item,request.operationId)]):[];
      if(count&&created?.length!==1)throw Error('Could not apply Uncanny Disguise.');
      try{
        const updated=await item.update({'system.resource.value':count,[`flags.${ID}.uncannyDisguise`]:{generation:request.operationId,spentOperations:[]}});
        if(!updated||disguiseTokens(item)!==count)throw Error('Could not set Uncanny Disguise tokens.');
        if(old.length)await actor.deleteEmbeddedDocuments('ActiveEffect',old);
      }catch(error){
        if(created.length)await actor.deleteEmbeddedDocuments('ActiveEffect',created.map(effect=>effect.id));
        await item.update({'system.resource.value':before,[`flags.${ID}.uncannyDisguise`]:prior});throw error;
      }
      remember(receipt);return {tokens:count};
    }
    const state=disguiseState(actor);
    if(!state||state.generation!==request.generation||!Array.isArray(request.effectIds)||!request.effectIds.some(id=>state.effectIds.includes(id))||prior?.spentOperations?.includes(request.operationId))return false;
    const count=before-1,next={generation:state.generation,spentOperations:[...(prior?.spentOperations??[]),request.operationId]};
    const updated=await item.update({'system.resource.value':count,[`flags.${ID}.uncannyDisguise`]:next});
    if(!updated||disguiseTokens(item)!==count)throw Error('Could not spend an Uncanny Disguise token.');
    try{
      if(!count)await actor.deleteEmbeddedDocuments('ActiveEffect',disguiseEffects(item,false).map(effect=>effect.id));
    }catch(error){await item.update({'system.resource.value':before,[`flags.${ID}.uncannyDisguise`]:prior});throw error;}
    remember(receipt);return {tokens:count};
  });
}
async function dispatch(request){
  const gm=game.users.activeGM;if(!gm)throw Error('Uncanny Disguise needs an active GM.');
  return gm.isSelf?resolveUncannyDisguise(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
}
export function installUncannyDisguise(Action,Actor,send=dispatch){
  if(!Action[ACTION_WRAP]){
    const native=Action.prototype.use;
    Action.prototype.use=async function(...args){
      const item=uncannyDisguiseItem(this.actor),ownCard=item?.uuid===this.item?.uuid;
      if(ownCard&&this.id===UNCANNY_DISGUISE_SPEND){
        const state=disguiseState(this.actor);return state?send({...state,mode:'spend',operationId:operation()}):false;
      }
      if(ownCard&&this.id===UNCANNY_DISGUISE_ACTIVATE){
        if(!uncannyDisguiseItem(this.actor,true)||activating.has(item.uuid))return false;
        if(!game.users.activeGM)throw Error('Uncanny Disguise needs an active GM.');
        activating.add(item.uuid);
        try{
          const result=await native.apply(this,args);
          if(result)await send({mode:'activate',actorUuid:this.actor.uuid,itemUuid:item.uuid,operationId:operation()});
          return result;
        }finally{activating.delete(item.uuid);}
      }
      // A grouped action is only a chooser; its native field launches the child
      // action without awaiting it. Charge the child once it actually completes.
      const state=this.actionType==='action'&&!['damage','grouped'].includes(this.type)?disguiseState(this.actor):null;
      // Mark only this workflow's dice roll, so direct sheet trait rolls still count.
      const options=args[1]??{},forward=state?[args[0],{...options,[ID]:{...options[ID],uncannyDisguiseAction:true}},...args.slice(2)]:args;
      const result=await native.apply(this,forward);
      if(state&&result?.actionType==='action'&&(!result.hasRoll||result.evaluate!==false))await send({...state,mode:'spend',operationId:operation()});
      return result;
    };
    Object.defineProperty(Action,ACTION_WRAP,{value:true});
  }
  if(!Actor[ROLL_WRAP]){
    const native=Actor.prototype.diceRoll;
    Actor.prototype.diceRoll=async function(config,...args){
      const state=!config[ID]?.uncannyDisguiseAction&&config.actionType==='action'&&!config.source?.message&&config.evaluate!==false&&
        ['trait','spellcast','attack'].includes(config.roll?.type)?disguiseState(this):null;
      const result=await native.call(this,config,...args);
      if(state&&result?.actionType==='action'&&result.evaluate!==false&&Number.isFinite(result.roll?.total))await send({...state,mode:'spend',operationId:operation()});
      return result;
    };
    Object.defineProperty(Actor,ROLL_WRAP,{value:true});
  }
}
export async function clearEmptyDisguise(item){
  if(!game.user.isActiveGM||uncannyDisguiseItem(item?.actor)?.uuid!==item?.uuid||disguiseTokens(item)||!disguiseEffects(item,false).length)return false;
  return resolveUncannyDisguise({mode:'zero',actorUuid:item.actor.uuid,itemUuid:item.uuid,operationId:operation()},{user:game.user});
}
export function registerUncannyDisguise(){
  CONFIG.queries[QUERY]=resolveUncannyDisguise;
  installUncannyDisguise(game.system.api.data.actions.actionsTypes.base,CONFIG.Actor.documentClass);
  Hooks.on('updateItem',(item,changes)=>{
    if(!Object.hasOwn(changes,'system.resource.value')&&!Object.hasOwn(changes.system?.resource??{},'value'))return;
    void clearEmptyDisguise(item).catch(error=>{console.error(`${ID} | Uncanny Disguise`,error);ui.notifications.error(error.message);});
  });
}
