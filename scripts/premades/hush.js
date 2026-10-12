import {ID,featureActive} from '../core.js';
import {attackTargetOutcome,resolvedAttackTargets} from '../attack-outcome.js';
import {sourceToken} from './hallowed-aura.js';
import {unavailableActor} from './aura-rules.js';
import {isVeilSpell} from './veil-of-night.js';
import {withHopeLock} from './hope-lock.js';
import {gmFear,withFearLock} from './fear-resource.js';
import {absorbingWrites} from './armor-absorbing.js';
import {HUSH_KEY,HUSH_CAST,HUSH_EFFECT} from './hush-data.js';
const QUERY=ID+'.hush',WRAP=Symbol.for(QUERY),WORKFLOW=Symbol.for(QUERY+'Workflow'),DAMAGE=Symbol.for(QUERY+'Damage'),DICE=Symbol.for(QUERY+'Dice'),casting=new Set();
const state=doc=>doc?.flags?.[ID]?.hush;
export const hushSpell=action=>isVeilSpell(action)||action?.type==='damage'&&action.item?.type==='domainCard'&&['spell','grimoire'].includes(action.item.system?.type);
const allActors=()=>{const actors=new Map([...game.actors??[]].map(a=>[a.uuid,a]));for(const s of game.scenes??[])for(const t of s.tokens??[])if(t.actor)actors.set(t.actor.uuid,t.actor);return [...actors.values()];};
export function hushItem(item){const f=item?.flags?.[ID],s=item?.system;return Boolean(item?.type==='domainCard'&&featureActive(item)&&!f?.disabled&&(!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===HUSH_KEY);}
export function hushRegions(actorUuid=null){return [...game.scenes??[]].flatMap(s=>[...s.regions??[]].filter(r=>state(r)?.itemUuid&&(!actorUuid||state(r).actorUuid===actorUuid)));}
export function hushEffects(actor,regionUuid=null){return [...actor?.effects??[]].filter(e=>state(e)?.regionUuid&&(!regionUuid||state(e).regionUuid===regionUuid));}
export function hushRange(scene,key){if(scene?.rangeSettings)return Number(scene.rangeSettings[key]);const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=scene?.flags?.daggerheart?.rangeMeasurement;return Number(world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local[key]:world[key]);}
export function hushContains(region,token){
 if(!canvas.ready||region.parent?.id!==canvas.scene.id||!token?.actor)return false;
 const info=state(region),anchor=canvas.tokens.get(info?.targetId);if(anchor?.actor?.uuid!==info?.targetActorUuid)return false;
 const distance=anchor.distanceTo(token),limit=hushRange(canvas.scene,'veryClose');return Number.isFinite(distance)&&distance>=0&&Number.isFinite(limit)&&distance<=limit;
}
export function hushSilenced(actor){
 const regions=hushRegions(),tokens=canvas.ready?(canvas.tokens.placeables??[]).filter(t=>t.actor?.uuid===actor?.uuid):[];
 if(tokens.some(t=>regions.some(r=>hushContains(r,t))))return true;
 return hushEffects(actor).some(e=>!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired&&!regions.some(r=>r.uuid===state(e).regionUuid&&r.parent?.id===canvas.scene?.id&&tokens.length));
}
export function hushRegionData(item,token,message){
 const shape=CONFIG.Canvas.layers.regions.layerClass.getTemplateShape({shapeType:CONFIG.DH.GENERAL.templateTypes.circle.id,range:hushRange(canvas.scene,'veryClose'),hasHole:false});shape.x=token.center.x;shape.y=token.center.y;
 return {name:'Hush — '+token.name,color:'#673f91',shapes:[shape],levels:canvas.level?.id?[canvas.level.id]:[],restriction:{enabled:false,type:'move',priority:0},behaviors:[],displayMeasurements:true,locked:false,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},visibility:CONST.REGION_VISIBILITY.ALWAYS,flags:{[ID]:{hush:{actorUuid:item.actor.uuid,itemUuid:item.uuid,targetId:token.id,targetActorUuid:token.actor.uuid,generation:message.uuid}}}};
}
export function hushTarget(actor,targets){
 const origin=sourceToken(actor),token=targets?.length===1?canvas.tokens.get(targets[0].id):null,limit=canvas.ready?hushRange(canvas.scene,'close'):NaN,distance=token&&origin?origin.distanceTo(token):NaN;
 if(!token||token.actor?.uuid!==targets[0].actorId||token.document.hidden&&!game.user.isGM||!origin||unavailableActor(actor)||!Number.isFinite(distance)||distance<0||!Number.isFinite(limit)||distance>limit)throw Error('Hush requires one identifiable target within Close range.');
 return token;
}
function silenceData(region){const info=state(region);return {name:'Silenced',img:'icons/magic/unholy/orb-glowing-purple.webp',type:'base',transfer:false,disabled:false,showIcon:2,origin:info.itemUuid+'.ActiveEffect.'+HUSH_EFFECT,description:'<p>Within Hush: cannot make noise or cast spells. Ends when leaving the area or when Hush ends.</p>',system:{changes:[],duration:{type:'temporary',description:'While inside Hush.'},conditionals:[],rangeDependence:null,stacking:null,targetDispositions:[]},flags:{[ID]:{hush:{...info,regionUuid:region.uuid}}}};}
export async function clearHushEffects(regionUuid){return withHopeLock('hush-effects:'+regionUuid,async()=>{for(const actor of allActors()){const ids=hushEffects(actor,regionUuid).map(e=>e.id);if(ids.length){await actor.deleteEmbeddedDocuments('ActiveEffect',ids);if(hushEffects(actor,regionUuid).length)throw Error('Silenced effect deletion was not confirmed.');}}});}
export async function endHush(regions){for(const region of regions){await region.delete();await clearHushEffects(region.uuid);if(region.parent.regions.get(region.id))throw Error('Hush region deletion was not confirmed.');}return true;}
let syncing=Promise.resolve();
export function syncHush(){const run=async()=>{
 if(!game.user.isActiveGM||!canvas.ready)return;
 const regions=hushRegions(),live=new Set(regions.map(r=>r.uuid)),local=new Map((canvas.tokens.placeables??[]).filter(t=>t.actor).map(t=>[t.actor.uuid,t.actor]));
 const orphan=new Set(allActors().flatMap(actor=>hushEffects(actor).filter(e=>!live.has(state(e).regionUuid)).map(e=>state(e).regionUuid)));for(const uuid of orphan)await clearHushEffects(uuid);
 for(const region of regions){if(region.parent.id!==canvas.scene.id)continue;const info=state(region),anchor=canvas.tokens.get(info.targetId);
  if(anchor?.actor?.uuid!==info.targetActorUuid){await endHush([region]);continue;}
  await withHopeLock('hush-effects:'+region.uuid,async()=>{
  if(!region.parent.regions.get(region.id))return;
  const shape=region.shapes[0];if(shape.x!==anchor.center.x||shape.y!==anchor.center.y)await region.update({shapes:[{...(shape.toObject?.()??shape),x:anchor.center.x,y:anchor.center.y}]});
  const wanted=new Set((canvas.tokens.placeables??[]).filter(t=>hushContains(region,t)).map(t=>t.actor.uuid));
  for(const actor of local.values()){const effects=hushEffects(actor,region.uuid);
   if(wanted.has(actor.uuid)){if(!effects.length){const created=await actor.createEmbeddedDocuments('ActiveEffect',[silenceData(region)]);if(!created?.length)throw Error('Silenced effect creation was cancelled.');}else if(effects.length>1)await actor.deleteEmbeddedDocuments('ActiveEffect',effects.slice(1).map(e=>e.id));}
   else if(effects.length)await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));
  }
  });
 }
 };syncing=syncing.catch(()=>{}).then(run);return syncing;}
export async function resolveHush(request,{user}){
 if(!game.user.isActiveGM||!user?.active||!['cast','clear','fear'].includes(request?.op)||typeof request.actorUuid!=='string')return false;
 const actor=await fromUuid(request.actorUuid);if(!actor||!user.isGM&&!actor.testUserPermission(user,'OWNER'))return false;
 return withHopeLock(QUERY+actor.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!user.isGM&&!actor.testUserPermission(user,'OWNER'))return false;
  if(request.op==='clear'){if(!Array.isArray(request.regionUuids)||request.regionUuids.length>1000)return false;return endHush(hushRegions(actor.uuid).filter(r=>request.regionUuids.includes(r.uuid)));}
  if(request.op==='fear'){
   if(!user.isGM)return false;const region=hushRegions(actor.uuid).find(r=>r.uuid===request.regionUuid&&state(r).generation===request.generation);if(!region||state(region).fearPayment)return false;
   return withFearLock(async()=>{const before=gmFear();if(!(before>=1)||!user.active||!game.user.isActiveGM)return false;
    await region.update({['flags.'+ID+'.hush.fearPayment']:'committing'});
    if(state(region).fearPayment!=='committing')throw Error('Fear payment reservation could not be saved.');
    await ui.resources.updateFear(before-1);if(gmFear()!==before-1)throw Error('Fear payment could not be confirmed; do not retry blindly.');
    await region.update({['flags.'+ID+'.hush.fearPayment']:'paid'});await endHush([region]);return true;
   });
  }
  const message=await fromUuid(request.messageUuid),source=message?.system?.source,roll=message?.system?.roll,item=actor.items?.get?.(source?.item);
  if(!hushItem(item)||source?.actor!==actor.uuid||source.action!==HUSH_CAST||!roll?._evaluated||!Number.isFinite(roll.total)||roll.options?.actionType!=='action'||message.flags?.[ID]?.hushCast)return false;
  const targets=resolvedAttackTargets(message);if(targets.length!==1)return false;
  // Commit the receipt before deleting/replacing any paid prior casting.
  await message.update({['flags.'+ID+'.hushCast']:{status:'committing',actorUuid:actor.uuid}});
  if(message.flags?.[ID]?.hushCast?.status!=='committing')throw Error('Hush cast reservation could not be saved.');
  await endHush(hushRegions(actor.uuid));
  let region=null;
  if(attackTargetOutcome(roll,targets[0])==='success'){
   const token=hushTarget(actor,targets);
   [region]=await canvas.scene.createEmbeddedDocuments('Region',[hushRegionData(item,token,message)]);if(!region)throw Error('Hush region creation was cancelled.');
   try{await syncHush();}catch(error){await endHush([region]);throw error;}
  }
  await message.update({['flags.'+ID+'.hushCast']:{status:'completed',actorUuid:actor.uuid,regionUuid:region?.uuid??null}});
  return true;
 });
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw Error('Hush needs an active GM.');return gm.isSelf?resolveHush(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});}
function warn(error){console.error(ID+' | Hush',error);ui.notifications.error('Hush needs manual review: '+error.message+'. The completed action or damage was preserved.');}
export function installHush(Action,send=dispatch){
 if(!Object.hasOwn(Action,WORKFLOW)){const workflow=Action.prototype.executeWorkflow;Action.prototype.executeWorkflow=async function(config,...args){
  if(this.id===HUSH_CAST&&hushItem(this.item)){try{hushTarget(this.actor,config.targets);}catch(error){ui.notifications.warn(error.message);return false;}config.hasEffect=false;}
  return workflow.call(this,config,...args);
 };Object.defineProperty(Action,WORKFLOW,{value:true});}
 if(Object.hasOwn(Action,WRAP))return;const use=Action.prototype.use;Action.prototype.use=async function(...args){
  if(hushSpell(this)&&hushSilenced(this.actor)){ui.notifications.warn('Silenced by Hush: cannot cast spells.');return false;}
  if(this.id!==HUSH_CAST||!hushItem(this.item))return use.apply(this,args);
  if(casting.has(this.item.uuid))return false;if(!canvas.ready||!sourceToken(this.actor)||!game.users.activeGM){ui.notifications.warn('Hush needs a placed caster, target, and active GM viewing this scene.');return false;}
  casting.add(this.item.uuid);try{const result=await absorbingWrites(this.actor,()=>use.apply(this,args));
   if(result?.evaluate!==false&&result?.message?.uuid&&Number.isFinite(result.message.system?.roll?.total))try{if(!await send({op:'cast',actorUuid:this.actor.uuid,messageUuid:result.message.uuid}))throw Error('Cast registration was not confirmed.');}catch(error){warn(error);}return result;
  }finally{casting.delete(this.item.uuid);}
 };Object.defineProperty(Action,WRAP,{value:true});
}
export function hushMajorDamage(updates){return Array.isArray(updates)&&updates.some(u=>u.key==='hitPoints'&&!u.clear&&!u.itemId&&u.damageTypes!=null&&Number(u.value)>=2);}
export function installHushActor(Actor,send=dispatch){
 if(!Object.hasOwn(Actor,DICE)){const dice=Actor.prototype.diceRoll;Actor.prototype.diceRoll=async function(config,...args){if(config?.roll?.type==='spellcast'&&hushSilenced(this)){ui.notifications.warn('Silenced by Hush: cannot cast spells.');return;}return dice.call(this,config,...args);};Object.defineProperty(Actor,DICE,{value:true});}
 if(Object.hasOwn(Actor,DAMAGE))return;const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(...args){
  const regions=hushRegions(this.uuid).map(r=>r.uuid),before=Number(this.system?.resources?.hitPoints?.value),result=regions.length?await absorbingWrites(this,()=>native.apply(this,args)):await native.apply(this,args);
  if(regions.length&&hushMajorDamage(result)&&Number(this.system?.resources?.hitPoints?.value)>before)try{if(!await send({op:'clear',actorUuid:this.uuid,regionUuids:regions}))throw Error('Damage expiration was not confirmed.');}catch(error){warn(error);}return result;
 };Object.defineProperty(Actor,DAMAGE,{value:true});
}
export function renderHushClear(message,html,send=dispatch){
 const info=message.flags?.[ID]?.hushCast;if(!game.user.isGM||!message.isContentVisible||!info?.regionUuid||html.querySelector('.dhp-hush-clear'))return;
 const region=hushRegions(info.actorUuid).find(r=>r.uuid===info.regionUuid);if(!region)return;
 const button=html.ownerDocument.createElement('button');button.type='button';button.className='dhp-hush-clear';button.textContent='Spend 1 Fear to End Hush';button.title='Use on the GM’s turn.';button.disabled=Boolean(state(region).fearPayment);
 button.addEventListener('click',()=>{button.disabled=true;void send({op:'fear',actorUuid:info.actorUuid,regionUuid:region.uuid,generation:state(region).generation}).then(done=>{if(!done){button.disabled=Boolean(state(region).fearPayment);ui.notifications.warn('Hush could not end: check remaining Fear and the active region.');}}).catch(warn);});html.querySelector('.message-content')?.append(button);
}
export function registerHush(){
 CONFIG.queries[QUERY]=resolveHush;installHush(game.system.api.data.actions.actionsTypes.base);installHushActor(CONFIG.Actor.documentClass);
 const refresh=()=>{void syncHush().catch(warn);};for(const hook of ['canvasReady','updateToken','createToken','deleteToken'])Hooks.on(hook,refresh);
 Hooks.on('refreshToken',(_token,flags)=>{if(flags.refreshPosition||flags.refreshSize||flags.refreshElevation)refresh();});
 Hooks.on('deleteRegion',region=>{if(game.user.isActiveGM&&state(region))void clearHushEffects(region.uuid).catch(warn);});
 Hooks.on('renderChatMessageHTML',(message,html)=>renderHushClear(message,html));refresh();
}
