import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {sourceToken} from './hallowed-aura.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {absorbingWrites} from './armor-absorbing.js';
import {bulkyDamagePacket} from './armor-bulky.js';
import {retributionSource} from './hideous-retribution.js';
import {decisionBudget} from '../settings.js';
import {flightCastSuccess} from './flight.js';
import {FORTRESS_KEY,FORTRESS_CAST} from './wild-fortress-data.js';
import {installFortressAttacks,installFortressChatTargets,renderFortressAttack,tagFortressHitTargets,FORTRESS_PAYMENT,resolveFortressPayment} from './wild-fortress-attacks.js';
const QUERY=ID+'.wildFortress',PICK=QUERY+'Pick',USE=Symbol.for(QUERY+'Use'),DAMAGE=Symbol.for(QUERY+'Damage'),casting=new Map(),requests=new Map();
const image='icons/magic/nature/leaf-armor-scale-green.webp';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fortressInfo=doc=>doc?.flags?.[ID]?.wildFortress;
const shelterInfo=effect=>effect?.flags?.[ID]?.wildFortressShelter;
const actors=()=>{const found=new Map([...game.actors??[]].map(a=>[a.uuid,a]));for(const s of game.scenes??[])for(const t of s.tokens??[])if(t.actor)found.set(t.actor.uuid,t.actor);return [...found.values()];};
export function fortressItem(item){const s=item?.system,f=item?.flags?.[ID];return Boolean(item?.type==='domainCard'&&item.actor?.type==='character'&&featureActive(item)&&!f?.disabled&&(!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===FORTRESS_KEY);}
export function fortressDome(actor){const f=fortressInfo(actor);return Boolean(actor?.type==='adversary'&&f?.actorUuid===actor.uuid&&f?.casterUuid&&f?.itemUuid&&f?.generation&&f.stage==='ready'&&Number(actor.system.resources?.hitPoints?.value)<3);}
export function fortressRegions(){return [...game.scenes??[]].flatMap(s=>[...s.regions??[]].filter(r=>fortressInfo(r)?.actorUuid&&fortressInfo(r).generation));}
export function fortressContains(region,token){
 if(token?.parent?.uuid!==region?.parent?.uuid||token?.documentName!=='Token')return false;
 const level=token._source?.level,levels=Array.from(region.levels??[]);if(level&&levels.length&&!levels.includes(level))return false;
 const size=Number(token.parent.grid?.size),point={x:token.x+token.width*size/2,y:token.y+token.height*size/2,elevation:token.elevation??0};
 if(!Object.values(point).every(Number.isFinite))return false;
 if(typeof region.testPoint==='function')return region.testPoint(point);
 // Offline fixtures / unavailable native shape tree: only our own circle.
 return region.shapes?.some(s=>s.type==='circle'&&!s.hole&&Math.hypot(point.x-s.x,point.y-s.y)<=s.radius)??false;
}
export function fortressProtected(token){return Boolean(token?.actor&&fortressRegions().some(region=>{
 const f=fortressInfo(region),dome=foundry.utils.fromUuidSync(f.actorUuid);return fortressDome(dome)&&f.occupants?.some(o=>o.tokenUuid===token.uuid&&o.actorUuid===token.actor.uuid)&&fortressContains(region,token);
}));}
export function fortressSheltered(actor){const token=sourceToken(actor)?.document;if(token)return fortressProtected(token);return [...actor?.effects??[]].some(e=>shelterInfo(e)&&!e.disabled&&!e.isSuppressed&&e.active!==false);}
export function fortressCandidates(casterToken){return [...casterToken?.parent?.tokens??[]].filter(t=>t.actor&&t.actor.uuid!==casterToken.actor.uuid&&!unavailableActor(t.actor)&&!fortressInfo(t.actor)&&t._source?.level===casterToken._source?.level&&t.disposition===casterToken.disposition&&(!t.hidden||game.user.isGM)).map(t=>({tokenUuid:t.uuid,actorUuid:t.actor.uuid,name:t.name??t.actor.name}));}
export async function pickFortressAlly(data,{user}){const caster=await fromUuid(data.casterUuid),token=await fromUuid(data.tokenUuid);if(!user?.isGM||!caster?.testUserPermission(game.user,'OWNER')||token?.actor?.uuid!==caster.uuid)return 'none';const candidates=fortressCandidates(token).filter(t=>data.candidates.some(c=>c.tokenUuid===t.tokenUuid&&c.actorUuid===t.actorUuid));
 return await timedDialog('Wild Fortress — Shelter',`<p>The cast succeeded. Choose up to one ally to shelter with you.</p><label>Ally<select name="ally"><option value="none">Caster only</option>${candidates.map(t=>`<option value="${esc(t.tokenUuid)}">${esc(t.name)}</option>`).join('')}</select></label><p>The unlocked circle is the shelter footprint; the GM can resize it.</p>`,[{action:'choose',label:'Create Fortress',callback:(_e,_b,d)=>d.element.querySelector('[name="ally"]').value},{action:'solo',label:'Caster Only',default:true,callback:()=> 'none'}])??'none';}
export function fortressFootprint(tokens){const scene=tokens[0]?.parent,size=Number(scene?.grid?.size);if(!(size>0)||tokens.some(t=>t.parent!==scene||![t.x,t.y,t.width,t.height].every(Number.isFinite)))throw Error('Wild Fortress token positions are invalid.');const left=Math.min(...tokens.map(t=>t.x)),top=Math.min(...tokens.map(t=>t.y)),right=Math.max(...tokens.map(t=>t.x+t.width*size)),bottom=Math.max(...tokens.map(t=>t.y+t.height*size));return {type:'circle',x:(left+right)/2,y:(top+bottom)/2,radius:Math.max(size*1.2,Math.hypot(right-left,bottom-top)/2),hole:false};}
export function fortressActorData(caster,record){const ownership={default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};for(const u of game.users)if(!u.isGM&&caster.testUserPermission(u,'OWNER'))ownership[u.id]=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;return {name:'Wild Fortress — '+caster.name,type:'adversary',img:image,ownership,items:[],system:{difficulty:1,damageThresholds:{major:15,severe:30},resources:{hitPoints:{value:0,max:3},stress:{value:0,max:0}},notes:'<p>Natural barricade: attacks automatically succeed. Major15, Severe30, 3HP. Cannot attack. Delete dome or region to dismiss.</p>'},prototypeToken:{actorLink:true,texture:{src:image},sight:{enabled:false},bar1:{attribute:'resources.hitPoints'},bar2:{attribute:null}},flags:{[ID]:{wildFortress:record}}};}
export function fortressEffectData(record,occupant){return {name:'Sheltered — Wild Fortress',img:image,type:'base',origin:null,transfer:false,disabled:false,showIcon:2,statuses:[],description:'<p>Inside Wild Fortress: cannot make attacks or be targeted by attacks. Leaving the dome restores attacks; re-entering restores shelter.</p>',system:{changes:[],duration:{type:'',description:'While inside this dome.'},conditionals:[],targetDispositions:[],rangeDependence:null,stacking:null},flags:{[ID]:{wildFortressShelter:{actorUuid:record.actorUuid,generation:record.generation,tokenUuid:occupant.tokenUuid,occupantActorUuid:occupant.actorUuid}}}};}
export async function clearFortress(record){return withHopeLock('fortress-clear:'+record.actorUuid,async()=>{
 const matches=d=>fortressInfo(d)?.actorUuid===record.actorUuid&&fortressInfo(d)?.generation===record.generation;
 const actor=await fromUuid(record.actorUuid);if(matches(actor)&&fortressInfo(actor).stage!=='ended')await actor.update({['flags.'+ID+'.wildFortress.stage']:'ended'});
 for(const a of actors()){const ids=[...a.effects??[]].filter(e=>shelterInfo(e)?.actorUuid===record.actorUuid&&shelterInfo(e)?.generation===record.generation).map(e=>e.id);if(ids.length){await a.deleteEmbeddedDocuments('ActiveEffect',ids);if([...a.effects??[]].some(e=>ids.includes(e.id)))throw Error('Shelter effect deletion was not confirmed.');}}
 for(const s of game.scenes??[]){for(const r of [...s.regions??[]].filter(matches)){await r.delete();if(s.regions.get(r.id))throw Error('Dome region deletion was not confirmed.');}const ids=[...s.tokens??[]].filter(t=>matches(t)&&t.actorId===record.actorUuid.split('.').at(-1)).map(t=>t.id);if(ids.length){await s.deleteEmbeddedDocuments('Token',ids);if(ids.some(id=>s.tokens.has(id)))throw Error('Dome token deletion was not confirmed.');}}
 // Never delete a generated actor reused on an unrelated scene token.
 if(matches(actor)&&![...game.scenes??[]].some(s=>[...s.tokens??[]].some(t=>t.actorId===actor.id)))await actor.delete();return true;
});}
let syncing=Promise.resolve();
export function syncFortressShelter(){const run=async()=>{
 if(!game.user.isActiveGM)return;const regions=fortressRegions(),desired=new Map();
 for(const r of regions){const f=fortressInfo(r),dome=await fromUuid(f.actorUuid);if(!fortressDome(dome))continue;
  for(const o of f.occupants??[]){const t=await fromUuid(o.tokenUuid);if(t?.actor?.uuid!==o.actorUuid||!fortressContains(r,t))continue;const key=f.actorUuid+':'+o.tokenUuid;desired.set(key,{actor:t.actor,data:fortressEffectData(f,o)});}
 }
 for(const actor of actors()){const seen=new Set();for(const e of [...actor.effects??[]]){const f=shelterInfo(e);if(!f)continue;const key=f.actorUuid+':'+f.tokenUuid;if(!desired.has(key)||f.occupantActorUuid!==actor.uuid||seen.has(key)||e.disabled||e.isSuppressed){await actor.deleteEmbeddedDocuments('ActiveEffect',[e.id]);continue;}seen.add(key);desired.delete(key);}}
 for(const {actor,data}of desired.values()){const made=await actor.createEmbeddedDocuments('ActiveEffect',[data]);if(!made.length)throw Error('Shelter effect creation was canceled.');}
};syncing=syncing.then(run,run);return syncing;}
export async function syncFortressHP(actor){return withHopeLock('fortress-hp:'+actor.uuid,async()=>{const f=fortressInfo(actor);if(!game.user.isActiveGM||!f?.actorUuid||f.actorUuid!==actor.uuid||f.stage!=='ready')return false;
 const hp=Number(actor.system.resources?.hitPoints?.value);if(!Number.isSafeInteger(hp)||hp<0)return false;
 const item=await fromUuid(f.itemUuid);if(item)await withHopeLock('fortress-card:'+item.uuid,async()=>{if(item.flags?.[ID]?.wildFortressLatest!==actor.uuid||Number(item.system.resource.value)===Math.min(3,hp))return;const updated=await item.update({'system.resource.value':Math.min(3,hp)});if(!updated||Number(item.system.resource.value)!==Math.min(3,hp))throw Error('Dome HP could not be mirrored on the card.');});
 if(hp>=3)await clearFortress(f);return true;});}
export async function syncFortressCard(item){const uuid=item?.flags?.[ID]?.wildFortressLatest,actor=uuid&&await fromUuid(uuid),hp=Number(item?.system?.resource?.value);if(!game.user.isActiveGM||!fortressDome(actor)||!Number.isSafeInteger(hp)||hp<0||hp>3)return false;return withHopeLock('fortress-hp:'+actor.uuid,async()=>{if(!fortressDome(actor)||fortressInfo(actor).itemUuid!==item.uuid||item.flags[ID].wildFortressLatest!==actor.uuid||Number(actor.system.resources.hitPoints.value)===hp)return false;await actor.update({'system.resources.hitPoints.value':hp});if(Number(actor.system.resources.hitPoints.value)!==hp)throw Error('Manual dome HP edit was not confirmed.');if(hp>=3)await clearFortress(fortressInfo(actor));return true;});}
export async function resolveFortress(request,{user},ask=pickFortressAlly){
 if(!game.user.isActiveGM||!user?.active)return false;
 if(request?.op==='damage'){
  if(!/^\w{16}$/.test(request.id??'')||typeof request.isDirect!=='boolean')return null;const actor=await fromUuid(request.actorUuid),packet=bulkyDamagePacket(request.packet),sourceUuid=retributionSource(packet),source=sourceUuid?await fromUuid(sourceUuid):null;
  if(!fortressDome(actor)||!packet||!user.isGM&&!actor.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return null;
  const key=user.id+':'+request.id,sig=JSON.stringify(request),old=requests.get(key);if(old)return old.sig===sig?old.promise:null;const promise=actor.takeDamage(packet,request.isDirect);requests.set(key,{sig,promise});if(requests.size>512)requests.delete(requests.keys().next().value);return promise;
 }
 if(request?.op!=='cast'||typeof request.messageUuid!=='string')return false;
 const message=await fromUuid(request.messageUuid),source=message?.system?.source,caster=source?.actor?await fromUuid(source.actor):null,item=caster?.items?.get?.(source?.item),proof=message?.flags?.[ID]?.wildFortressOrigin;
 if(!fortressItem(item)||source.action!==FORTRESS_CAST||!caster.testUserPermission(user,'OWNER')||!proof||proof.actorUuid!==caster.uuid||proof.itemUuid!==item.uuid||!flightCastSuccess(message)||message.system.roll?._evaluated===false||(message.system.roll?.options?.actionType??message.system.actionType)!=='action'||Number(message.system.roll?.options?.roll?.difficulty??message.system.roll?.difficulty)!==13)return false;
 return withHopeLock('fortress-cast:'+message.uuid,async()=>{
  if(fortressInfo(message)?.status||!user.active||!game.user.isActiveGM||!fortressItem(item))return false;
  await message.update({['flags.'+ID+'.wildFortress']:{status:'committing'}});if(fortressInfo(message)?.status!=='committing')throw Error('Wild Fortress cast reservation was not confirmed.');
  const origin=await fromUuid(proof.tokenUuid),scene=origin?.parent;if(origin?.actor?.uuid!==caster.uuid||origin.documentName!=='Token'||scene?.uuid!==proof.sceneUuid||scene.tokens.get(origin.id)!==origin)throw Error('The paid cast has no valid caster token on its original scene.');
  const candidates=fortressCandidates(origin),owner=ownerFor(caster,[...game.users],game.user),data={casterUuid:caster.uuid,tokenUuid:origin.uuid,candidates};
  if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  const selected=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PICK,data,{timeout:decisionBudget(65000)});
  if(!owner.active||!caster.testUserPermission(owner,'OWNER')||!user.active||!game.user.isActiveGM||scene.tokens.get(origin.id)!==origin)throw Error('Caster or owner became unavailable after the paid cast.');
  const choice=candidates.find(c=>c.tokenUuid===selected),ally=choice&&await fromUuid(choice.tokenUuid);if(selected&&selected!=='none'&&(!choice||ally?.actor?.uuid!==choice.actorUuid||!fortressCandidates(origin).some(c=>c.tokenUuid===selected)))throw Error('Chosen ally changed after the paid cast.');
  const chosen=[origin,...(ally?[ally]:[])],occupants=chosen.map(t=>({tokenUuid:t.uuid,actorUuid:t.actor.uuid})),shape=fortressFootprint(chosen),record={casterUuid:caster.uuid,itemUuid:item.uuid,generation:message.uuid,actorUuid:null,occupants,stage:'pending'};let dome,token,region;
  try{
   dome=await Actor.create(fortressActorData(caster,record),{renderSheet:false});if(!dome)throw Error('Dome actor creation was canceled.');record.actorUuid=dome.uuid;
   const common={flags:{[ID]:{wildFortress:{...record}}}};
   [token]=await scene.createEmbeddedDocuments('Token',[{name:dome.name,actorId:dome.id,actorLink:true,x:Math.round(shape.x-shape.radius),y:Math.round(shape.y-shape.radius),width:2*shape.radius/scene.grid.size,height:2*shape.radius/scene.grid.size,elevation:origin.elevation??0,level:origin._source.level,texture:{src:image},alpha:0.35,hidden:Boolean(origin.hidden),disposition:origin.disposition,sight:{enabled:false},bar1:{attribute:'resources.hitPoints'},bar2:{attribute:null},displayBars:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,...common}]);if(!token)throw Error('Dome token creation was canceled.');
   [region]=await scene.createEmbeddedDocuments('Region',[{name:dome.name,color:'#68a849',shapes:[shape],levels:[origin._source.level],locked:false,visibility:CONST.REGION_VISIBILITY.ALWAYS,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},restriction:{enabled:false,type:'move',priority:0},behaviors:[],displayMeasurements:false,...common}]);if(!region)throw Error('Dome region creation was canceled.');
   await dome.update({['flags.'+ID+'.wildFortress']:{...record,stage:'ready',tokenUuid:token.uuid,regionUuid:region.uuid}});if(!fortressDome(dome))throw Error('Dome readiness was not confirmed.');
   await withHopeLock('fortress-card:'+item.uuid,async()=>{const updated=await item.update({'system.resource.value':0,['flags.'+ID+'.wildFortressLatest']:dome.uuid});if(!updated||item.flags[ID].wildFortressLatest!==dome.uuid)throw Error('Card HP tracking was not confirmed.');});
   await syncFortressShelter();await message.update({['flags.'+ID+'.wildFortress']:{status:'completed',actorUuid:dome.uuid,tokenUuid:token.uuid,regionUuid:region.uuid}});
  }catch(error){if(dome)try{await clearFortress({...record,actorUuid:dome.uuid});}catch(cleanup){console.error(ID+' | Wild Fortress creation cleanup',cleanup);}throw Error('The cast was paid, but '+error.message+' Do not recast automatically; review Hope and the dome.');}
  return {actorUuid:dome.uuid,tokenUuid:token.uuid,regionUuid:region.uuid};
 });
}
async function dispatch(r){const gm=game.users.activeGM;if(!gm)throw Error('Wild Fortress needs an active GM.');return gm.isSelf?resolveFortress(r,{user:game.user}):gm.query(QUERY,r,{timeout:decisionBudget(605000)});}
function warn(e){console.error(ID+' | Wild Fortress',e);ui.notifications.error('Wild Fortress needs manual review: '+e.message+'. Completed actions or damage were preserved.');}
export function installFortressCast(Action,send=dispatch){if(Object.hasOwn(Action,USE))return;const use=Action.prototype.use,workflow=Action.prototype.executeWorkflow;
 Action.prototype.executeWorkflow=async function(config,...args){if(this.id===FORTRESS_CAST&&fortressItem(this.item)){config.targets=[];config.roll={...config.roll,difficulty:13};}return workflow.call(this,config,...args);};
 Action.prototype.use=async function(...args){if(this.id!==FORTRESS_CAST||!fortressItem(this.item))return use.apply(this,args);const token=sourceToken(this.actor)?.document;if(!token||!game.users.activeGM){ui.notifications.warn('Wild Fortress needs a selected caster token and an active GM.');return false;}if(casting.has(this.item.uuid))return false;casting.set(this.item.uuid,{actorUuid:this.actor.uuid,itemUuid:this.item.uuid,tokenUuid:token.uuid,sceneUuid:token.parent.uuid});
  try{const result=await absorbingWrites(this.actor,()=>use.apply(this,args));if(result?.message&&result.evaluate!==false&&flightCastSuccess(result.message))try{if(!await send({op:'cast',messageUuid:result.message.uuid}))throw Error('Dome creation was rejected.');}catch(e){warn(e);}return result;}finally{casting.delete(this.item.uuid);}
 };Object.defineProperty(Action,USE,{value:true});}
export function tagFortressCast(message){const source=message.system?.source,actor=source?.actor&&foundry.utils.fromUuidSync(source.actor),item=actor?.items?.get?.(source?.item),proof=casting.get(item?.uuid);if(proof&&source.action===FORTRESS_CAST&&fortressItem(item))message.updateSource({['flags.'+ID+'.wildFortressOrigin']:proof});}
export function installFortressDamage(ActorClass,send=dispatch){if(Object.hasOwn(ActorClass,DAMAGE))return;const take=ActorClass.prototype.takeDamage;
 const modify=ActorClass.prototype.modifyResource;if(typeof modify==='function')ActorClass.prototype.modifyResource=function(rows,...args){const f=fortressInfo(this);if(f?.actorUuid===this.uuid&&f.stage==='ready'&&Array.isArray(rows))for(let i=rows.length-1;i>=0;i--)if(rows[i].key==='stress'&&!rows[i].itemId)rows.splice(i,1);return modify.call(this,rows,...args);};
 // A barricade has no Stress. Native zero-Stress adversaries otherwise turn
 // any Stress row into extra HP through convertStressDamageToHP.
 ActorClass.prototype.takeDamage=async function(packet,...args){if(!fortressDome(this)||!bulkyDamagePacket(packet))return take.call(this,packet,...args);if(!game.user.isActiveGM){const result=await send({op:'damage',id:foundry.utils.randomID(),actorUuid:this.uuid,packet:bulkyDamagePacket(packet),isDirect:Boolean(args[0])});if(result===null)throw Error('Dome damage coordination was rejected.');return result;}
  const result=await withHopeLock('fortress-damage:'+this.uuid,()=>absorbingWrites(this,()=>take.call(this,packet,...args)));try{await syncFortressHP(this);}catch(e){warn(e);}return result;
 };Object.defineProperty(ActorClass,DAMAGE,{value:true});}
export function registerFortress(){CONFIG.queries[QUERY]=resolveFortress;CONFIG.queries[PICK]=pickFortressAlly;CONFIG.queries[FORTRESS_PAYMENT]=resolveFortressPayment;installFortressCast(game.system.api.data.actions.actionsTypes.base);installFortressDamage(CONFIG.Actor.documentClass);installFortressAttacks(game.system.api.data.actions.actionsTypes.base,CONFIG.Actor.documentClass,game.system.api.fields.ActionFields,CONFIG.ChatMessage.documentClass??ChatMessage);for(const Model of new Set([CONFIG.ChatMessage.dataModels.damageRoll,CONFIG.ChatMessage.dataModels.dualityRoll,CONFIG.ChatMessage.dataModels.adversaryRoll]))installFortressChatTargets(Model);
 Hooks.on('preCreateChatMessage',tagFortressCast);Hooks.on('preCreateChatMessage',tagFortressHitTargets);Hooks.on('renderChatMessageHTML',renderFortressAttack);const sync=()=>{void syncFortressShelter().catch(warn);};for(const h of ['canvasReady','updateToken','createToken','deleteToken','updateRegion'])Hooks.on(h,sync);
 Hooks.on('updateActor',(a,changes)=>{if(game.user.isActiveGM&&fortressInfo(a)&&(Object.hasOwn(changes,'system.resources.hitPoints.value')||changes.system?.resources?.hitPoints))void syncFortressHP(a).catch(warn);});
 Hooks.on('updateItem',(item,changes)=>{if(game.user.isActiveGM&&item.flags?.[ID]?.wildFortressLatest&&(Object.hasOwn(changes,'system.resource.value')||changes.system?.resource))void syncFortressCard(item).catch(warn);});
 const cleanup=doc=>{const f=fortressInfo(doc);if(game.user.isActiveGM&&f?.actorUuid&&f.generation)void clearFortress(f).catch(warn);};for(const h of ['deleteToken','deleteRegion','deleteActor'])Hooks.on(h,cleanup);sync();
}
