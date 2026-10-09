import {ID,featureActive} from '../core.js';
import {sourceToken} from './hallowed-aura.js';
import {withHopeLock} from './hope-lock.js';
import {absorbingWrites} from './armor-absorbing.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {retributionSource} from './hideous-retribution.js';
import {EXOTA_KEY,CONSTRUCT_SUMMON,CONSTRUCT_COMMAND} from './book-of-exota-data.js';
const QUERY=ID+'.exotaConstruct',USE=Symbol.for(QUERY+'Use'),DAMAGE=Symbol.for(QUERY+'Damage'),STATS=Symbol.for(QUERY+'Stats'),requests=new Map(),captures=new WeakMap();
const image='icons/creatures/magical/construct-golem-stone-blue.webp',traits=['agility','strength','finesse','instinct','presence','knowledge'];
const info=doc=>doc?.flags?.[ID]?.exotaConstruct;
const generation=v=>typeof v==='string'&&/^[a-zA-Z0-9]{16}$/.test(v);
const key=item=>item?.flags?.[ID]?.applied?.key??item?.flags?.[ID]?.premade?.key;
export function exotaItem(actor){return actor?.type==='character'?actor.items?.find(i=>i.type==='domainCard'&&featureActive(i)&&!i.flags?.[ID]?.disabled&&(!i.system.inVault||i.system.vaultActive)&&!i.system.isDomainTouchedSuppressed&&key(i)===EXOTA_KEY)??null:null;}
export function constructSnapshot(casterUuid){const found=new Set();for(const scene of game.scenes??[])for(const token of scene.tokens??[]){const f=info(token);if(f?.casterUuid===casterUuid&&generation(f.generation))found.add(f.generation);}const caster=foundry.utils.fromUuidSync(casterUuid);for(const e of caster?.effects??[]){const f=info(e);if(f?.casterUuid===casterUuid&&generation(f.generation))found.add(f.generation);}return [...found];}
export function constructActorData(caster,record){const ownership={default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};for(const u of game.users)if(!u.isGM&&caster.testUserPermission(u,'OWNER'))ownership[u.id]=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
 return {name:'Construct — '+caster.name,type:'character',img:image,ownership,items:[],
  system:{evasion:Number(caster.system.evasion??0),traits:Object.fromEntries(traits.map(t=>[t,{value:Number(caster.system.traits?.[t]?.value??0)}])),resources:{hitPoints:{value:0,max:1},hope:{value:0,max:0},stress:{value:0,max:0}},damageThresholds:{major:999999,severe:999999},description:'<p>Animated objects. Move manually and use Book of Exota on the caster’s sheet to command or attack. Shares caster Evasion and traits; falls apart on any damage. Not a party member.</p>'},
  prototypeToken:{actorLink:true,width:1,height:1,texture:{src:image},disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,sight:{enabled:false},bar1:{attribute:null},bar2:{attribute:null}},flags:{[ID]:{exotaConstruct:record}}};
}
export function constructTokenData(actor,origin,scene,record){const size=Number(scene.grid?.size);if(!(size>0)||!Number.isFinite(origin.x)||!Number.isFinite(origin.y))throw Error('Could not determine the construct position.');let x=origin.x+(Number(origin.width)||1)*size;if(scene.dimensions?.sceneRect&&x+size>scene.dimensions.sceneRect.right)x=origin.x;return {name:actor.name,actorId:actor.id,actorLink:true,x,y:origin.y,width:1,height:1,elevation:origin.elevation??0,...(origin.level?{level:origin.level}:{}),texture:{src:image},disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,hidden:Boolean(origin.hidden),displayName:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,displayBars:CONST.TOKEN_DISPLAY_MODES.NONE,sight:{enabled:false},bar1:{attribute:null},bar2:{attribute:null},flags:{[ID]:{exotaConstruct:record}}};}
export function constructEffectData(item,record){return {name:'Create Construct',type:'base',img:image,origin:item.uuid,disabled:false,transfer:false,showIcon:1,statuses:[],description:'<p>Your construct persists until damaged, replaced or manually dismissed. Command it using Book of Exota.</p>',system:{changes:[],duration:{type:'',description:'Until damage or replacement.'},conditionals:[],targetDispositions:[],rangeDependence:null,stacking:null},duration:{value:null,units:'seconds',expiry:null,expired:false},flags:{[ID]:{exotaConstruct:record}}};}
export function prepareConstructStats(actor){const f=info(actor),caster=f&&foundry.utils.fromUuidSync(f.casterUuid);if(actor?.type!=='character'||!generation(f?.generation)||caster?.type!=='character'||caster.uuid===actor.uuid)return false;
 if(Number.isFinite(Number(caster.system.evasion)))actor.system.evasion=Number(caster.system.evasion);
 for(const t of traits)if(actor.system.traits?.[t]&&Number.isFinite(Number(caster.system.traits?.[t]?.value)))actor.system.traits[t].value=Number(caster.system.traits[t].value);
 return true;
}
async function removeActor(actorUuid,casterUuid,gen){const actor=typeof actorUuid==='string'?await fromUuid(actorUuid):null,f=info(actor);if(f?.casterUuid!==casterUuid||f.generation!==gen||actor?.type!=='character')return;
 if([...game.scenes??[]].some(scene=>[...scene.tokens??[]].some(t=>t.actorId===actor.id)))return;await actor.delete();
}
async function clearUnlocked(casterUuid,gens){const allowed=new Set(gens),actors=new Map();let count=0;
 for(const scene of game.scenes??[]){const tokens=[...scene.tokens??[]].filter(t=>{const f=info(t);return f?.casterUuid===casterUuid&&allowed.has(f.generation)&&(!t.actorId||t.actorId===f.actorUuid?.split('.').at(-1));});for(const t of tokens){const f=info(t);actors.set(f.actorUuid,f.generation);}if(tokens.length){await scene.deleteEmbeddedDocuments('Token',tokens.map(t=>t.id));count+=tokens.length;}}
 const caster=await fromUuid(casterUuid),effects=[...caster?.effects??[]].filter(e=>{const f=info(e);return f?.casterUuid===casterUuid&&allowed.has(f.generation);});for(const e of effects){const f=info(e);actors.set(f.actorUuid,f.generation);}if(effects.length)await caster.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));
 for(const a of game.actors??[]){const f=info(a);if(f?.casterUuid===casterUuid&&allowed.has(f.generation))actors.set(a.uuid,f.generation);}for(const [uuid,gen]of actors)await removeActor(uuid,casterUuid,gen);return count;
}
export async function clearConstructs(casterUuid,gens){if(!game.user.isActiveGM||!Array.isArray(gens)||gens.length>1000||!gens.every(generation))return false;return withHopeLock('exota-construct:'+casterUuid,()=>clearUnlocked(casterUuid,gens));}
async function createConstruct(request,caster,item){return withHopeLock('exota-construct:'+caster.uuid,async()=>{
 const origin=await fromUuid(request.originUuid),scene=origin?.parent;if(!game.user.isActiveGM||exotaItem(caster)?.uuid!==item.uuid||origin?.documentName!=='Token'||origin.actor?.uuid!==caster.uuid||scene?.id!==request.sceneId)throw Error('Construct caster, card or scene changed before summoning.');
 const prior=constructSnapshot(caster.uuid),record={casterUuid:caster.uuid,itemUuid:item.uuid,generation:request.id,actorUuid:null};let actor,token,effect;
 try{actor=await Actor.create(constructActorData(caster,record),{renderSheet:false});if(!actor)throw Error('Construct actor creation was canceled.');record.actorUuid=actor.uuid;
  [token]=await scene.createEmbeddedDocuments('Token',[constructTokenData(actor,origin,scene,record)]);if(!token)throw Error('Construct token creation was canceled.');
  [effect]=await caster.createEmbeddedDocuments('ActiveEffect',[constructEffectData(item,{...record,tokenUuid:token.uuid})]);if(!effect)throw Error('Construct marker creation was canceled.');
 }catch(error){try{if(token)await scene.deleteEmbeddedDocuments('Token',[token.id]);if(effect)await caster.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);if(actor)await removeActor(actor.uuid,caster.uuid,request.id);}catch(cleanup){console.error(ID+' | Construct rollback',cleanup);}throw error;}
 prepareConstructStats(actor);await clearUnlocked(caster.uuid,prior);return {actorUuid:actor.uuid,tokenUuid:token.uuid};
 });}
export async function resolveConstruct(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request?.casterUuid!=='string')return false;const caster=await fromUuid(request.casterUuid);if(!caster)return false;
 if(request.op==='damage'){const actor=await fromUuid(request.actorUuid),f=info(actor),sourceUuid=retributionSource(request.packet),source=sourceUuid&&await fromUuid(sourceUuid);
  if(f?.casterUuid!==caster.uuid||!generation(request.id)||typeof request.isDirect!=='boolean'||!bulkyDamagePacket(request.packet)||!user.isGM&&!actor?.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return null;
  const k=user.id+':'+request.id,sig=JSON.stringify(request),old=requests.get(k);if(old)return old.sig===sig?old.promise:null;const promise=actor.takeDamage(request.packet,request.isDirect);requests.set(k,{sig,promise});if(requests.size>512)requests.delete(requests.keys().next().value);return promise;
 }
 if(!caster.testUserPermission(user,'OWNER'))return false;if(request.op==='clear')return clearConstructs(caster.uuid,request.generations);
 const item=exotaItem(caster);if(request.op!=='summon'||!generation(request.id)||item?.uuid!==request.itemUuid||typeof request.originUuid!=='string'||typeof request.sceneId!=='string')return false;
 const k=user.id+':'+request.id,sig=JSON.stringify(request),old=requests.get(k);if(old)return old.sig===sig?old.promise:false;const promise=createConstruct(request,caster,item);requests.set(k,{sig,promise});if(requests.size>512)requests.delete(requests.keys().next().value);return promise;
}
export function installConstructUse(Action,send){if(!Action||Object.hasOwn(Action,USE))return;const native=Action.prototype.use;
 Action.prototype.use=async function(...args){const marked=key(this.item)===EXOTA_KEY;
  if(marked&&this.id===CONSTRUCT_COMMAND){if(exotaItem(this.actor)?.uuid!==this.item?.uuid||!constructSnapshot(this.actor.uuid).length){ui.notifications.warn('Create your construct before commanding it with Book of Exota.');return false;}return native.apply(this,args);}
  if(!marked||this.id!==CONSTRUCT_SUMMON)return native.apply(this,args);
  if(exotaItem(this.actor)?.uuid!==this.item?.uuid||!game.user.active||!this.actor.testUserPermission(game.user,'OWNER'))return false;const origin=sourceToken(this.actor)?.document;
  if(!origin||!game.users.activeGM){ui.notifications.warn('Place or select your caster’s token and connect an active GM before creating a construct.');return false;}
  return withHopeLock('exota-cast:'+this.actor.uuid,async()=>{const result=await absorbingWrites(this.actor,()=>native.apply(this,args));if(!result||result.source?.action!==CONSTRUCT_SUMMON)return result;
   try{const created=await send({op:'summon',id:foundry.utils.randomID(),casterUuid:this.actor.uuid,itemUuid:this.item.uuid,originUuid:origin.uuid,sceneId:origin.parent.id});if(!created)throw Error('Construct creation was rejected.');}
   catch(error){console.error(ID+' | Construct creation',error);ui.notifications.error('Create Construct completed, but its token could not be confirmed. Check Hope and summons before retrying: '+error.message);}return result;});
 };Object.defineProperty(Action,USE,{value:true});}
export function installConstructStats(Actor){if(!Actor||Object.hasOwn(Actor,STATS))return;const native=Actor.prototype.prepareDerivedData;
 Actor.prototype.prepareDerivedData=function(...args){const result=native.apply(this,args);prepareConstructStats(this);return result;};Object.defineProperty(Actor,STATS,{value:true});}
export function installConstructDamage(Actor,send){if(!Actor||Object.hasOwn(Actor,DAMAGE))return;const native=Actor.prototype.takeDamage;
 Hooks.on('daggerheart.preTakeDamage',(actor,parsed)=>{const c=captures.get(actor);if(c&&!c.parsed)c.parsed=parsed;});
 Hooks.on('daggerheart.postCalculateDamage',(actor,parsed)=>{const c=captures.get(actor);if(c?.parsed===parsed)c.positive=Number(parsed.main?.value)>0;});
 Actor.prototype.takeDamage=async function(packet,...args){const f=info(this);if(!generation(f?.generation)||!bulkyDamagePacket(packet))return native.call(this,packet,...args);
  if(!game.user.isActiveGM)return send({op:'damage',id:foundry.utils.randomID(),casterUuid:f.casterUuid,actorUuid:this.uuid,packet:bulkyDamagePacket(packet),isDirect:Boolean(args[0])});
  return withHopeLock('exota-damage:'+this.uuid,async()=>{const captured={parsed:null,positive:false},old=captures.get(this);captures.set(this,captured);let result;try{result=await absorbingWrites(this,()=>native.call(this,packet,...args));}finally{if(old)captures.set(this,old);else captures.delete(this);}
   if(captured.positive&&Array.isArray(result)&&result.some(r=>r.key==='hitPoints'&&!r.clear&&!r.itemId&&Number.isFinite(r.value)&&r.value>=0))try{await clearConstructs(f.casterUuid,[f.generation]);}catch(error){ui.notifications.error('Construct damage was preserved; remove the summon manually: '+error.message);}return result;});
 };Object.defineProperty(Actor,DAMAGE,{value:true});}
export function refreshConstructStats(casterUuid){for(const a of game.actors??[])if(info(a)?.casterUuid===casterUuid){a.prepareData?.();a.sheet?.render?.({force:false});}}
export function registerExota(){CONFIG.queries[QUERY]=resolveConstruct;const send=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Create Construct needs an active GM.');return gm.isSelf?resolveConstruct(request,{user:game.user}):gm.query(QUERY,request,{timeout:300000});};
 installConstructUse(game.system.api.data.actions.actionsTypes.base,send);installConstructStats(CONFIG.Actor.documentClass);installConstructDamage(CONFIG.Actor.documentClass,send);
 const removed=doc=>{const f=info(doc);if(game.user.isActiveGM&&f?.casterUuid&&generation(f.generation))void clearConstructs(f.casterUuid,[f.generation]).catch(e=>ui.notifications.error('Construct cleanup needs manual review: '+e.message));};
 for(const h of ['deleteToken','deleteActor','deleteActiveEffect'])Hooks.on(h,removed);
 for(const h of ['updateActor','createActiveEffect','updateActiveEffect','deleteActiveEffect','createItem','updateItem','deleteItem'])Hooks.on(h,doc=>refreshConstructStats(doc.documentName==='Actor'?doc.uuid:doc.parent?.uuid));
 Hooks.on('daggerheart.preUseAction',action=>{if(info(action.actor)){ui.notifications.info('Command this construct using Book of Exota on its caster’s sheet.');return false;}});
}
