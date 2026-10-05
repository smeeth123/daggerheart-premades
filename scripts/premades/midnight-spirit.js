import {ID,featureActive} from '../core.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {restComplete} from '../rest-loadout.js';
import {MIDNIGHT_KEY,MIDNIGHT_SUMMON,MIDNIGHT_ATTACK} from './midnight-spirit-data.js';

const QUERY=`${ID}.midnightSpirit`,USE=Symbol.for(`${QUERY}Use`),ROLL=Symbol.for(`${QUERY}Roll`),REST=Symbol.for(`${QUERY}Rest`),REFRESH=Symbol.for(`${QUERY}Refresh`);
const requests=new Map(),building=new WeakSet();
const image='icons/creatures/magical/spirit-undead-ghost-blue.webp';
const state=document=>document?.flags?.[ID]?.midnightSpirit;
const key=item=>item?.flags?.[ID]?.applied?.key??item?.flags?.[ID]?.premade?.key;
const generation=value=>typeof value==='string'&&/^[a-zA-Z0-9]{16}$/.test(value);
export function midnightItem(actor){
  return actor?.type==='character'?actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    (!item.system?.inVault||item.system.vaultActive)&&!item.system?.isDomainTouchedSuppressed&&key(item)===MIDNIGHT_KEY)??null:null;
}
export function midnightSnapshot(actorUuid){
  const generations=new Set();
  for(const scene of game.scenes??[])for(const token of scene.tokens??[]){const info=state(token);if(info?.casterUuid===actorUuid&&generation(info.generation))generations.add(info.generation);}
  const actor=foundry.utils.fromUuidSync(actorUuid);
  for(const effect of actor?.effects??[]){const info=state(effect);if(info?.casterUuid===actorUuid&&generation(info.generation))generations.add(info.generation);}
  return [...generations];
}
export function midnightNpcData(caster,info){
  const ownership={default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  for(const user of game.users)if(!user.isGM&&caster.testUserPermission(user,'OWNER'))ownership[user.id]=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  return {name:`Midnight Spirit — ${caster.name}`,type:'npc',img:image,ownership,
    system:{description:'<p>A humanoid-sized summoned spirit. Movement and carrying are manual; use Midnight Spirit on the caster’s sheet to attack.</p>'},
    prototypeToken:{actorLink:true,width:1,height:1,texture:{src:image},disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,sight:{enabled:false},bar1:{attribute:null},bar2:{attribute:null}},
    flags:{[ID]:{midnightSpirit:info}}};
}
export function midnightTokenData(npc,origin,scene,info){
  const size=Number(scene.grid?.size);if(!(size>0&&Number.isFinite(size))||!Number.isFinite(origin.x)||!Number.isFinite(origin.y))throw Error('Midnight Spirit could not determine a summon position.');
  let x=origin.x+(Number(origin.width)||1)*size;
  const bounds=scene.dimensions?.sceneRect;if(bounds&&x+size>bounds.right)x=origin.x;
  return {name:npc.name,actorId:npc.id,actorLink:true,x,y:origin.y,elevation:origin.elevation??0,
    ...(origin.level?{level:origin.level}:{}),width:1,height:1,texture:{src:image},alpha:0.8,disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,
    hidden:Boolean(origin.hidden),displayName:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,displayBars:CONST.TOKEN_DISPLAY_MODES.NONE,
    bar1:{attribute:null},bar2:{attribute:null},sight:{enabled:false},flags:{[ID]:{midnightSpirit:info}}};
}
export function midnightEffectData(item,info){
  return {name:'Midnight Spirit',img:image,type:'base',origin:item.uuid,disabled:false,transfer:false,showIcon:1,statuses:[],
    description:'<p>Your summoned spirit persists until your next rest, its completed Spellcast attack, or a replacement summon.</p>',
    system:{changes:[],duration:{type:'shortRest',description:'Until your next rest, spirit attack, or replacement summon.'},conditionals:[],targetDispositions:[],rangeDependence:null,stacking:null},
    duration:{value:null,units:'seconds',expiry:null,expired:false},flags:{[ID]:{midnightSpirit:info}}};
}
async function removeNpc(actorUuid,casterUuid,gen){
  if(typeof actorUuid!=='string')return;
  return withHopeLock(`midnight-npc:${actorUuid}`,async()=>{
    const npc=await fromUuid(actorUuid),info=state(npc);
    if(npc?.type!=='npc'||info?.casterUuid!==casterUuid||info.generation!==gen)return;
    // Preserve a generated actor if a user has reused it on an unrelated token.
    if([...game.scenes??[]].some(scene=>[...scene.tokens??[]].some(token=>token.actorId===npc.id)))return;
    await npc.delete();
  });
}
async function clearUnlocked(casterUuid,gens){
  const allowed=new Set(gens),npcs=new Map();let count=0;
  for(const scene of game.scenes??[]){
    const tokens=[...(scene.tokens??[])].filter(token=>{const info=state(token);return info?.casterUuid===casterUuid&&allowed.has(info.generation)&&
      (!token.actorId||token.actorId===info.actorUuid?.split('.').at(-1));});
    for(const token of tokens){const info=state(token);npcs.set(info.actorUuid,info.generation);}
    if(tokens.length){await scene.deleteEmbeddedDocuments('Token',tokens.map(token=>token.id));count+=tokens.length;}
  }
  const caster=await fromUuid(casterUuid),effects=[...(caster?.effects??[])].filter(effect=>{const info=state(effect);return info?.casterUuid===casterUuid&&allowed.has(info.generation);});
  for(const effect of effects){const info=state(effect);npcs.set(info.actorUuid,info.generation);}
  if(effects.length)await caster.deleteEmbeddedDocuments('ActiveEffect',effects.map(effect=>effect.id));
  for(const npc of game.actors??[]){const info=state(npc);if(info?.casterUuid===casterUuid&&allowed.has(info.generation))npcs.set(npc.uuid,info.generation);}
  for(const [uuid,gen]of npcs)await removeNpc(uuid,casterUuid,gen);
  return count;
}
export async function clearMidnightSpirits(casterUuid,gens){
  if(!game.user.isActiveGM||!Array.isArray(gens)||gens.length>1000||!gens.every(generation))return false;
  return withHopeLock(`midnight-spirit:${casterUuid}`,()=>clearUnlocked(casterUuid,gens));
}
async function createSpirit(request,caster,item){
  return withHopeLock(`midnight-spirit:${caster.uuid}`,async()=>{
    const origin=await fromUuid(request.originUuid),scene=origin?.parent;
    if(!game.user.isActiveGM||midnightItem(caster)?.uuid!==item.uuid||origin?.documentName!=='Token'||origin.actor?.uuid!==caster.uuid||scene?.id!==request.sceneId)throw Error('Midnight Spirit’s caster, card or scene changed before summoning.');
    const prior=midnightSnapshot(caster.uuid),info={casterUuid:caster.uuid,itemUuid:item.uuid,generation:request.id,actorUuid:null};
    let npc,token,effect;
    try{
      npc=await Actor.create(midnightNpcData(caster,info),{renderSheet:false});if(!npc)throw Error('Midnight Spirit NPC creation was canceled.');
      info.actorUuid=npc.uuid;
      [token]=await scene.createEmbeddedDocuments('Token',[midnightTokenData(npc,origin,scene,info)]);if(!token)throw Error('Midnight Spirit token creation was canceled.');
      [effect]=await caster.createEmbeddedDocuments('ActiveEffect',[midnightEffectData(item,{...info,tokenUuid:token.uuid})]);if(!effect)throw Error('Midnight Spirit marker creation was canceled.');
    }catch(error){
      try{if(token)await scene.deleteEmbeddedDocuments('Token',[token.id]);if(effect)await caster.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);if(npc)await removeNpc(npc.uuid,caster.uuid,request.id);}
      catch(cleanup){console.error(`${ID} | Midnight Spirit creation cleanup`,cleanup);}
      throw error;
    }
    // Keep the previous spirit until all replacement documents have been created.
    await clearUnlocked(caster.uuid,prior);
    return {tokenUuid:token.uuid,actorUuid:npc.uuid};
  });
}
export async function resolveMidnightSpirit(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.casterUuid!=='string')return false;
  const caster=await fromUuid(request.casterUuid);if(!caster?.testUserPermission(user,'OWNER'))return false;
  if(request.op==='clear'){
    if(request.messageUuid){
      const message=await fromUuid(request.messageUuid),action=message?.system?.action;
      if(action?.id!==MIDNIGHT_ATTACK||action.actor?.uuid!==caster.uuid||action.type!=='attack'||action.actionType==='reaction'||key(action.item)!==MIDNIGHT_KEY||!Number.isFinite(message.system.roll?.total))return false;
    }
    return clearMidnightSpirits(caster.uuid,request.generations);
  }
  const item=midnightItem(caster);
  if(request.op!=='summon'||!generation(request.id)||item?.uuid!==request.itemUuid||typeof request.originUuid!=='string'||typeof request.sceneId!=='string')return false;
  const receipt=`${user.id}:${request.id}`,signature=JSON.stringify(request),prior=requests.get(receipt);
  if(prior)return prior.signature===signature?prior.operation:false;
  const operation=createSpirit(request,caster,item);requests.set(receipt,{signature,operation});if(requests.size>512)requests.delete(requests.keys().next().value);return operation;
}
async function settledUse(actor,callback){
  const prior=Object.getOwnPropertyDescriptor(actor,'update'),native=actor.update,pending=[];
  const capture=function(...args){const result=native.apply(this,args);pending.push(Promise.resolve(result));return result;};
  if(typeof native==='function')Object.defineProperty(actor,'update',{value:capture,writable:true,configurable:true});
  try{const result=await callback();let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}return result;}
  finally{if(actor.update===capture){if(prior)Object.defineProperty(actor,'update',prior);else delete actor.update;}}
}
async function expireSpirit(send,request){
  try{if(await send(request)===false)throw Error('Midnight Spirit cleanup was rejected.');}
  catch(error){console.error(`${ID} | Midnight Spirit cleanup`,error);ui.notifications.error('Midnight Spirit could not dissipate. Remove its token manually; the completed roll or rest was preserved.');}
}
export function installMidnightSummon(Action,send){
  if(Object.hasOwn(Action,USE))return;const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
    if(this.id!==MIDNIGHT_SUMMON||midnightItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);
    if(!game.user.active||!this.actor.testUserPermission(game.user,'OWNER'))return false;
    const origin=sourceToken(this.actor)?.document;
    if(!origin||!game.users.activeGM){ui.notifications.warn('Place or select your caster’s token and connect an active GM before summoning Midnight Spirit.');return false;}
    return withHopeLock(`midnight-cast:${this.actor.uuid}`,async()=>{
      const result=await settledUse(this.actor,()=>native.apply(this,args));
      if(!result||result.source?.action!==MIDNIGHT_SUMMON)return result;
      try{
        const created=await send({op:'summon',id:foundry.utils.randomID(),casterUuid:this.actor.uuid,itemUuid:this.item.uuid,originUuid:origin.uuid,sceneId:origin.parent.id});
        if(!created)throw Error('Midnight Spirit creation was rejected.');
      }catch(error){console.error(`${ID} | Midnight Spirit summon`,error);ui.notifications.error('Summon Spirit completed, but its token could not be confirmed. Check Hope and existing spirits before retrying.');}
      return result;
    });
  };Object.defineProperty(Action,USE,{value:true});
}
export function installMidnightAttack(Roll,send){
  if(!Roll||Object.hasOwn(Roll,ROLL))return;const native=Roll.build;
  Roll.build=async function(config={},...args){
    if(building.has(config))return native.call(this,config,...args);
    const actor=config.data?.parent??(typeof config.source?.actor==='string'?foundry.utils.fromUuidSync(config.source.actor):null),item=midnightItem(actor);
    const eligible=item&&config.source?.item===item.id&&config.source?.action===MIDNIGHT_ATTACK&&config.actionType!=='reaction'&&!config.source?.message&&config.evaluate!==false;
    if(!eligible)return native.call(this,config,...args);
    const generations=midnightSnapshot(actor.uuid);building.add(config);
    try{
      const result=await native.call(this,config,...args);
      if(generations.length&&result?.message?.uuid&&Number.isFinite(result.roll?.total))await expireSpirit(send,{op:'clear',casterUuid:actor.uuid,generations,messageUuid:result.message.uuid});
      return result;
    }finally{building.delete(config);}
  };Object.defineProperty(Roll,ROLL,{value:true});
}
export function installMidnightRest(Downtime,send){
  if(!Downtime||Object.hasOwn(Downtime,REST))return;const native=Downtime.prototype.close;
  Downtime.prototype.close=async function(...args){
    const actor=this.actor,generations=restComplete(this)?midnightSnapshot(actor.uuid):[],result=await native.apply(this,args);
    if(generations.length)await expireSpirit(send,{op:'clear',casterUuid:actor.uuid,generations});return result;
  };Object.defineProperty(Downtime,REST,{value:true});
}
export function installMidnightRefresh(actions,send){
  const native=actions?.refreshActors;if(typeof native!=='function'||native[REFRESH])return;
  const refresh=async function(...args){
    const rest=game.user.isGM&&(this.refreshSelections?.shortRest?.selected||this.refreshSelections?.longRest?.selected);
    const captured=rest?[...game.actors].filter(actor=>actor.type==='character'&&actor.prototypeToken?.actorLink).map(actor=>({op:'clear',casterUuid:actor.uuid,generations:midnightSnapshot(actor.uuid)})).filter(request=>request.generations.length):[];
    const result=await native.apply(this,args);for(const request of captured)await expireSpirit(send,request);return result;
  };Object.defineProperty(refresh,REFRESH,{value:true});actions.refreshActors=refresh;
}
export function registerMidnightSpirit(){
  CONFIG.queries[QUERY]=resolveMidnightSpirit;
  const send=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Midnight Spirit needs an active GM.');return gm.isSelf?resolveMidnightSpirit(request,{user:game.user}):gm.query(QUERY,request,{timeout:30000});};
  installMidnightSummon(game.system.api.data.actions.actionsTypes.base,send);
  for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installMidnightAttack(Roll,send);
  installMidnightRest(game.system.api.applications.dialogs.Downtime,send);
  installMidnightRefresh(CONFIG.ui.daggerheartMenu?.DEFAULT_OPTIONS?.actions,send);installMidnightRefresh(ui.daggerheartMenu?.options?.actions,send);
  Hooks.on('renderDaggerheartMenu',app=>installMidnightRefresh(app.options.actions,send));
  const removed=document=>{
    const info=state(document);if(!game.user.isActiveGM||!info?.casterUuid||!generation(info.generation))return;
    void clearMidnightSpirits(info.casterUuid,[info.generation]).catch(error=>{console.error(`${ID} | Midnight Spirit deleted-document cleanup`,error);ui.notifications.error('Midnight Spirit cleanup failed. Check its token, marker and temporary NPC.');});
  };
  Hooks.on('deleteActiveEffect',removed);Hooks.on('deleteToken',removed);Hooks.on('deleteActor',removed);
}
