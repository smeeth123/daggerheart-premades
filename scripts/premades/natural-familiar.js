import {ID,featureActive} from '../core.js';
import {hopeCapacity} from './hope-payment.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {restComplete} from '../rest-loadout.js';
import {FAMILIAR_KEY,FAMILIAR_SUMMON,FAMILIAR_FLYING,FAMILIAR_TASK,FAMILIAR_EFFECT,FAMILIAR_FLYING_IMAGE} from './natural-familiar-data.js';
import {installFamiliarDamage,familiarDamageLines} from './natural-familiar-damage.js';

const QUERY=`${ID}.naturalFamiliar`,USE=Symbol.for(`${QUERY}Use`),ROLL=Symbol.for(`${QUERY}Roll`),REST=Symbol.for(`${QUERY}Rest`),REFRESH=Symbol.for(`${QUERY}Refresh`);
const requests=new Map(),building=new WeakSet();
const image='icons/creatures/amphibians/bullfrog-glass-teal.webp';
const state=document=>document?.flags?.[ID]?.naturalFamiliar;
const key=item=>item?.flags?.[ID]?.applied?.key??item?.flags?.[ID]?.premade?.key;
const generation=value=>typeof value==='string'&&/^[a-zA-Z0-9]{16}$/.test(value);
export function familiarItem(actor){
  return actor?.type==='character'?actor.items?.find(item=>item.type==='domainCard'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    (!item.system?.inVault||item.system.vaultActive)&&!item.system?.isDomainTouchedSuppressed&&key(item)===FAMILIAR_KEY)??null:null;
}
export function familiarSnapshot(actorUuid){
  const generations=new Set();
  for(const scene of game.scenes??[])for(const token of scene.tokens??[]){const info=state(token);if(info?.casterUuid===actorUuid&&generation(info.generation))generations.add(info.generation);}
  const actor=foundry.utils.fromUuidSync(actorUuid);
  for(const effect of actor?.effects??[]){const info=state(effect);if(info?.casterUuid===actorUuid&&generation(info.generation))generations.add(info.generation);}
  return [...generations];
}
export function familiarNpcData(caster,info){
  const ownership={default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  for(const user of game.users)if(!user.isGM&&caster.testUserPermission(user,'OWNER'))ownership[user.id]=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  return {name:`${info.flying?'Flying Familiar':'Natural Familiar'} — ${caster.name}`,type:'npc',img:info.flying?FAMILIAR_FLYING_IMAGE:image,ownership,
    system:{description:'<p>A small nature spirit or forest critter. Move it manually; use Natural Familiar on the caster’s sheet to command it or see through its eyes.</p>'},
    prototypeToken:{actorLink:true,width:1,height:1,texture:{src:info.flying?FAMILIAR_FLYING_IMAGE:image,scaleX:0.65,scaleY:0.65},disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,sight:{enabled:false},bar1:{attribute:null},bar2:{attribute:null}},
    effects:info.flying?[{name:'Flying',img:FAMILIAR_FLYING_IMAGE,type:'base',disabled:false,transfer:false,statuses:['fly'],showIcon:1,
      system:{changes:[],duration:{description:''},conditionals:[],targetDispositions:[],rangeDependence:null,stacking:null}}]:[],
    flags:{[ID]:{naturalFamiliar:info}}};
}
export function familiarTokenData(npc,origin,scene,info){
  const size=Number(scene.grid?.size);if(!(size>0&&Number.isFinite(size))||!Number.isFinite(origin.x)||!Number.isFinite(origin.y))throw Error('Natural Familiar could not determine a summon position.');
  let x=origin.x+(Number(origin.width)||1)*size;
  const bounds=scene.dimensions?.sceneRect;if(bounds&&x+size>bounds.right)x=origin.x;
  return {name:npc.name,actorId:npc.id,actorLink:true,x,y:origin.y,elevation:origin.elevation??0,
    ...(origin.level?{level:origin.level}:{}),width:1,height:1,texture:{src:npc.img,scaleX:0.65,scaleY:0.65},alpha:1,disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,
    hidden:Boolean(origin.hidden),displayName:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,displayBars:CONST.TOKEN_DISPLAY_MODES.NONE,
    bar1:{attribute:null},bar2:{attribute:null},sight:{enabled:false},flags:{[ID]:{naturalFamiliar:info}}};
}
export function familiarEffectData(item,info){
  return {name:'Natural Familiar',img:image,type:'base',origin:item.uuid,disabled:false,transfer:false,showIcon:1,statuses:[],
    description:'<p>Your familiar persists until your next rest, recasting, or being targeted by an attack.</p>',
    system:{changes:[],duration:{type:'shortRest',description:'Until your next rest, recast, or targeted by an attack.'},conditionals:[],targetDispositions:[],rangeDependence:null,stacking:null},
    duration:{value:null,units:'seconds',expiry:null,expired:false},flags:{[ID]:{naturalFamiliar:info}}};
}
async function removeNpc(actorUuid,casterUuid,gen){
  if(typeof actorUuid!=='string')return;
  return withHopeLock(`familiar-npc:${actorUuid}`,async()=>{
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
export async function clearNaturalFamiliars(casterUuid,gens){
  if(!game.user.isActiveGM||!Array.isArray(gens)||gens.length>1000||!gens.every(generation))return false;
  return withHopeLock(`natural-familiar:${casterUuid}`,()=>clearUnlocked(casterUuid,gens));
}
async function createFamiliar(request,caster,item){
  return withHopeLock(`natural-familiar:${caster.uuid}`,async()=>{
    const origin=await fromUuid(request.originUuid),scene=origin?.parent;
    if(!game.user.isActiveGM||familiarItem(caster)?.uuid!==item.uuid||origin?.documentName!=='Token'||origin.actor?.uuid!==caster.uuid||scene?.id!==request.sceneId)throw Error('Natural Familiar’s caster, card or scene changed before summoning.');
    const prior=familiarSnapshot(caster.uuid),info={casterUuid:caster.uuid,itemUuid:item.uuid,generation:request.id,flying:request.flying===true,actorUuid:null};
    let npc,token,effect;
    try{
      npc=await Actor.create(familiarNpcData(caster,info),{renderSheet:false});if(!npc)throw Error('Natural Familiar NPC creation was canceled.');
      info.actorUuid=npc.uuid;
      [token]=await scene.createEmbeddedDocuments('Token',[familiarTokenData(npc,origin,scene,info)]);if(!token)throw Error('Natural Familiar token creation was canceled.');
      [effect]=await caster.createEmbeddedDocuments('ActiveEffect',[familiarEffectData(item,{...info,tokenUuid:token.uuid})]);if(!effect)throw Error('Natural Familiar marker creation was canceled.');
    }catch(error){
      try{if(token)await scene.deleteEmbeddedDocuments('Token',[token.id]);if(effect)await caster.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);if(npc)await removeNpc(npc.uuid,caster.uuid,request.id);}
      catch(cleanup){console.error(`${ID} | Natural Familiar creation cleanup`,cleanup);}
      throw error;
    }
    // Keep the previous familiar until all replacement documents have been created.
    await clearUnlocked(caster.uuid,prior);
    const legacy=[...(caster.effects??[])].filter(e=>e.origin===`${item.uuid}.ActiveEffect.${FAMILIAR_EFFECT}`&&!state(e));
    if(legacy.length)await caster.deleteEmbeddedDocuments('ActiveEffect',legacy.map(e=>e.id));
    return {tokenUuid:token.uuid,actorUuid:npc.uuid};
  });
}
export async function resolveNaturalFamiliar(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.casterUuid!=='string')return false;
  const caster=await fromUuid(request.casterUuid);if(!caster)return false;
  if(request.op==='clear'){
    let attackMessage,clearGenerations=request.generations;
    if(request.messageUuid){
      const message=await fromUuid(request.messageUuid),action=message?.system?.action;
      if(action?.type!=='attack'||(action.id===FAMILIAR_TASK&&key(action.item)===FAMILIAR_KEY)||!action.actor?.testUserPermission(user,'OWNER')||!Number.isFinite(message.system.roll?.total))return false;
      if(!Array.isArray(request.generations)||request.generations.length>1000||!request.generations.every(generation)||!Array.isArray(request.actorUuids)||!request.actorUuids.every(uuid=>typeof uuid==='string')||request.generations.length!==request.actorUuids.length)return false;
      clearGenerations=[];
      for(let i=0;i<request.generations.length;i++){
        const npc=await fromUuid(request.actorUuids[i]),info=state(npc);
        if(!(message.system.targets??[]).some(t=>t.actorId===request.actorUuids[i]))return false;
        // A recast/deletion may already have removed this captured old NPC.
        // Prune its saved recipient, without clearing any claimed generation.
        if(!npc)continue;
        if(info?.casterUuid!==caster.uuid||info.generation!==request.generations[i])return false;
        clearGenerations.push(info.generation);
      }
      attackMessage=message;
    }else if(!caster.testUserPermission(user,'OWNER'))return false;
    const result=await clearNaturalFamiliars(caster.uuid,clearGenerations);
    if(result!==false&&attackMessage){
      const expired=new Set(request.actorUuids),removed=attackMessage.system.targets.filter(t=>expired.has(t.actorId));
      // Expired summons cannot receive later saves/status effects. Keep their
      // identity as a receipt, but remove dangling native workflow recipients.
      await attackMessage.update({'system.targets':attackMessage.system.targets.filter(t=>!expired.has(t.actorId)),
        [`flags.${ID}.naturalFamiliarExpiredTargets`]:[...(attackMessage.flags?.[ID]?.naturalFamiliarExpiredTargets??[]),...removed]});
    }
    return result;
  }
  if(!caster.testUserPermission(user,'OWNER'))return false;
  const item=familiarItem(caster);
  if(request.op!=='summon'||!generation(request.id)||item?.uuid!==request.itemUuid||typeof request.originUuid!=='string'||typeof request.sceneId!=='string')return false;
  const receipt=`${user.id}:${request.id}`,signature=JSON.stringify(request),prior=requests.get(receipt);
  if(prior)return prior.signature===signature?prior.operation:false;
  const operation=createFamiliar(request,caster,item);requests.set(receipt,{signature,operation});if(requests.size>512)requests.delete(requests.keys().next().value);return operation;
}
async function settledUse(actor,callback){
  const prior=Object.getOwnPropertyDescriptor(actor,'update'),native=actor.update,pending=[];
  const capture=function(...args){const result=native.apply(this,args);pending.push(Promise.resolve(result));return result;};
  if(typeof native==='function')Object.defineProperty(actor,'update',{value:capture,writable:true,configurable:true});
  try{const result=await callback();let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}return result;}
  finally{if(actor.update===capture){if(prior)Object.defineProperty(actor,'update',prior);else delete actor.update;}}
}
async function expireFamiliar(send,request){
  try{const result=await send(request);if(result===false)throw Error('Natural Familiar cleanup was rejected.');return true;}
  catch(error){console.error(`${ID} | Natural Familiar cleanup`,error);ui.notifications.error('Natural Familiar could not dissipate. Remove its token manually; the completed roll or rest was preserved.');}
}
export function installFamiliarSummon(Action,send){
  if(Object.hasOwn(Action,USE))return;const native=Action.prototype.use;
  Action.prototype.use=async function(...args){
    if(![FAMILIAR_SUMMON,FAMILIAR_FLYING].includes(this.id)||familiarItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);
    if(!game.user.active||!this.actor.testUserPermission(game.user,'OWNER'))return false;
    const origin=sourceToken(this.actor)?.document;
    if(!origin||!game.users.activeGM){ui.notifications.warn('Place or select your caster’s token and connect an active GM before summoning Natural Familiar.');return false;}
    return withHopeLock(`familiar-cast:${this.actor.uuid}`,async()=>{
      const required=this.id===FAMILIAR_FLYING?2:1;
      const hope=hopeCapacity(this.actor);
      if(!Number.isFinite(hope)||hope<required){ui.notifications.warn(`Summoning this familiar requires ${required} Hope.`);return false;}
      const result=await settledUse(this.actor,()=>native.apply(this,args));
      if(!result||result.source?.action!==this.id)return result;
      try{
        const created=await send({op:'summon',flying:this.id===FAMILIAR_FLYING,id:foundry.utils.randomID(),casterUuid:this.actor.uuid,itemUuid:this.item.uuid,originUuid:origin.uuid,sceneId:origin.parent.id});
        if(!created)throw Error('Natural Familiar creation was rejected.');
      }catch(error){console.error(`${ID} | Natural Familiar summon`,error);ui.notifications.error('Summon Familiar completed, but its token could not be confirmed. Check Hope and existing familiars before retrying.');}
      return result;
    });
  };Object.defineProperty(Action,USE,{value:true});
}
export function installFamiliarAttack(Roll,send){
  if(!Roll||Object.hasOwn(Roll,ROLL))return;const native=Roll.build;
  Roll.build=async function(config={},...args){
    if(building.has(config))return native.call(this,config,...args);
    if(config.source?.message||config.evaluate===false||!['attack','spellcast'].includes(config.roll?.type)||config.source?.action===FAMILIAR_TASK)return native.call(this,config,...args);
    const captured=[...(game.actors??[])].filter(npc=>npc.type==='npc'&&state(npc)?.casterUuid&&generation(state(npc).generation));building.add(config);
    try{
      const result=await native.call(this,config,...args);
      if(result?.message?.uuid&&result.message.system.action?.type==='attack'&&Number.isFinite(result.roll?.total)){
        const groups=new Map(),targeted=new Set((result.targets??result.message.system.targets??[]).map(t=>t.actorId));
        for(const npc of captured){if(!targeted.has(npc.uuid))continue;const info=state(npc);if(!groups.has(info.casterUuid))groups.set(info.casterUuid,[]);groups.get(info.casterUuid).push(npc);}
        for(const [casterUuid,npcs]of groups){
          const actorUuids=npcs.map(n=>n.uuid),expired=await expireFamiliar(send,{op:'clear',casterUuid,generations:npcs.map(n=>state(n).generation),actorUuids,messageUuid:result.message.uuid});
          if(expired&&Array.isArray(result.targets))result.targets=result.targets.filter(t=>!actorUuids.includes(t.actorId));
        }
      }
      return result;
    }finally{building.delete(config);}
  };Object.defineProperty(Roll,ROLL,{value:true});
}
export function installFamiliarRest(Downtime,send){
  if(!Downtime||Object.hasOwn(Downtime,REST))return;const native=Downtime.prototype.close;
  Downtime.prototype.close=async function(...args){
    const actor=this.actor,generations=restComplete(this)?familiarSnapshot(actor.uuid):[],result=await native.apply(this,args);
    if(generations.length)await expireFamiliar(send,{op:'clear',casterUuid:actor.uuid,generations});return result;
  };Object.defineProperty(Downtime,REST,{value:true});
}
export function installFamiliarRefresh(actions,send){
  const native=actions?.refreshActors;if(typeof native!=='function'||native[REFRESH])return;
  const refresh=async function(...args){
    const rest=game.user.isGM&&(this.refreshSelections?.shortRest?.selected||this.refreshSelections?.longRest?.selected);
    const captured=rest?[...game.actors].filter(actor=>actor.type==='character'&&actor.prototypeToken?.actorLink).map(actor=>({op:'clear',casterUuid:actor.uuid,generations:familiarSnapshot(actor.uuid)})).filter(request=>request.generations.length):[];
    const result=await native.apply(this,args);for(const request of captured)await expireFamiliar(send,request);return result;
  };Object.defineProperty(refresh,REFRESH,{value:true});actions.refreshActors=refresh;
}
export function registerNaturalFamiliar(){
  CONFIG.queries[QUERY]=resolveNaturalFamiliar;
  const send=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Natural Familiar needs an active GM.');return gm.isSelf?resolveNaturalFamiliar(request,{user:game.user}):gm.query(QUERY,request,{timeout:30000});};
  installFamiliarSummon(game.system.api.data.actions.actionsTypes.base,send);
  installFamiliarDamage(CONFIG.Dice.daggerheart.DamageRoll,game.system.api.fields.ActionFields.DamageField,CONFIG.Actor.documentClass);
  for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installFamiliarAttack(Roll,send);
  installFamiliarRest(game.system.api.applications.dialogs.Downtime,send);
  installFamiliarRefresh(CONFIG.ui.daggerheartMenu?.DEFAULT_OPTIONS?.actions,send);installFamiliarRefresh(ui.daggerheartMenu?.options?.actions,send);
  Hooks.on('renderDaggerheartMenu',app=>installFamiliarRefresh(app.options.actions,send));
  const removed=document=>{
    const info=state(document);if(!game.user.isActiveGM||!info?.casterUuid||!generation(info.generation))return;
    void clearNaturalFamiliars(info.casterUuid,[info.generation]).catch(error=>{console.error(`${ID} | Natural Familiar deleted-document cleanup`,error);ui.notifications.error('Natural Familiar cleanup failed. Check its token, marker and temporary NPC.');});
  };
  Hooks.on('deleteActiveEffect',removed);Hooks.on('deleteToken',removed);Hooks.on('deleteActor',removed);
  Hooks.on('renderChatMessageHTML',(message,html)=>{const line=familiarDamageLines(message);if(!line||html.querySelector('.dhp-natural-familiar'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-natural-familiar';note.textContent=line;html.querySelector('.message-content')?.append(note);});
}
