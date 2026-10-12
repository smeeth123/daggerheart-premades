import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {sourceToken} from './hallowed-aura.js';
import {allied,closeDistance,unavailableActor} from './aura-rules.js';
import {companionPartner} from '../companion-context.js';
import {syncBeastformAttackAction} from '../beastform-roll-damage.js';
import {SPECTRAL_KEY,SPECTRAL_ACTION} from './spectral-mist-data.js';
const QUERY=ID+'.expireSpectralMist',ROLL=Symbol.for(QUERY),ACTION=Symbol.for(QUERY+'Action'),REFRESH=Symbol.for(QUERY+'Refresh'),captures=new WeakMap();
export function spectralMistItem(item){const f=item?.flags?.[ID];return Boolean(item?.type==='domainCard'&&featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===SPECTRAL_KEY&&(!item.system?.inVault||item.system?.vaultActive)&&!item.system?.isDomainTouchedSuppressed);}
export function spectralEffects(actor){return [...(actor?.effects??[])].filter(e=>e.flags?.[ID]?.spectralMist===true&&!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired);}
export function spectralActionRoll(config){return Boolean(config?.actionType==='action'&&config.evaluate!==false&&!config.source?.message&&['attack','trait','spellcast'].includes(config.roll?.type));}
export function spectralTargets(action,config){
 const actor=action.actor,origin=sourceToken(actor),targets=config.targets??[];
 if(!actor||unavailableActor(actor))throw Error('Spectral Mist needs an available caster.');
 const self=origin??actor.token??actor.prototypeToken,seen=new Set([actor.uuid]),chosen=[];
 if(!self?.actor)throw Error('Spectral Mist could not identify the caster token.');
 const settings=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
 const limit=origin?closeDistance(canvas.scene,settings,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id):NaN;
 for(const target of targets){
  if(target.actorId===actor.uuid)continue;
  const token=canvas.tokens.get(target.id),distance=origin&&token?origin.distanceTo(token):NaN;
  if(!origin||!token||token.actor?.uuid!==target.actorId||token.document.hidden&&!game.user.isGM||unavailableActor(token.actor)||!allied(origin.document,token.document)||!Number.isFinite(limit)||!Number.isFinite(distance)||distance<0||distance>limit)throw Error('Spectral Mist targets must be allies within Close range.');
  if(!seen.has(target.actorId)){chosen.push(target);seen.add(target.actorId);}
 }
 return [game.system.api.fields.ActionFields.TargetField.formatTarget.call(action,self),...chosen];
}
export async function expireSpectralMist(request,{user}){
 if(!game.user.isActiveGM||!user?.active||!Array.isArray(request?.effectIds)||!request.effectIds.length||request.effectIds.length>1000||!request.effectIds.every(id=>typeof id==='string')||typeof request.messageUuid!=='string')return false;
 const actor=await fromUuid(request.actorUuid),message=await fromUuid(request.messageUuid),roll=message?.system?.roll,proof=roll?.options?.[ID]?.spectralMist;
 const authorized=()=>Boolean(actor&&(user.isGM||actor.testUserPermission(user,'OWNER')||companionPartner(actor)?.testUserPermission(user,'OWNER')));
 if(!authorized()||message?.system?.source?.actor!==actor.uuid||roll?.options?.actionType!=='action'||!['action','attack','trait','spellcast'].includes(roll?.options?.roll?.type)||!roll._evaluated||!Number.isFinite(roll.total)||proof?.actorUuid!==actor.uuid||!['attack','trait','spellcast'].includes(proof?.rollType)||!Array.isArray(proof.effectIds)||request.effectIds.length!==proof.effectIds.length||request.effectIds.some(id=>!proof.effectIds.includes(id)))return false;
 return withHopeLock('spectral-mist:'+actor.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!authorized())return false;
  const allowed=new Set(request.effectIds),ids=spectralEffects(actor).filter(e=>allowed.has(e.id)).map(e=>e.id);if(!ids.length)return false;
  await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
  if(spectralEffects(actor).some(e=>ids.includes(e.id)))throw Error('Spectral Mist effect deletion was not confirmed.');
  // Effect deletion prepares actor attacks again. Do not rewrite trait sources.
  if(proof.rollType==='attack')await syncBeastformAttackAction(message,actor);
  return true;
 });
}
export function installSpectralRoll(Roll,expire){
 if(Object.hasOwn(Roll,ROLL))return;const native=Roll.build;
 Roll.build=async function(config={},...args){
  // Inherited wrappers share this capture so they do not expire twice.
  const outer=!captures.has(config),actor=config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null);
  if(outer){const held=spectralActionRoll(config)?{actor,ids:spectralEffects(actor).map(e=>e.id),rollType:config.roll.type}:null;captures.set(config,held);
   if(held?.ids.length){config[ID]??={};config[ID].spectralMist={actorUuid:actor.uuid,effectIds:[...held.ids],rollType:held.rollType};}
  }
  try{const result=await native.call(this,config,...args),held=captures.get(config);
   // Native D20.buildEvaluate changes config.roll.type to action/reaction.
   // Eligibility was captured before evaluation; do not require attack/trait now.
   if(outer&&held?.ids.length&&result?.actionType==='action'&&result.evaluate!==false&&!result.source?.message&&Number.isFinite(result.roll?.total)&&result.message?.uuid){
    try{const expired=await expire({actorUuid:held.actor.uuid,effectIds:held.ids,messageUuid:result.message.uuid});if(expired===false&&spectralEffects(held.actor).some(e=>held.ids.includes(e.id)))throw Error('Spectral Mist expiry was not confirmed.');}
    catch(error){console.error(ID+' | Spectral Mist expiry',error);ui.notifications.error('Spectral Mist could not expire. The completed roll was preserved; remove Spectral manually.');}
   }return result;
  }finally{if(outer)captures.delete(config);}
 };Object.defineProperty(Roll,ROLL,{value:true});
}
export function installSpectralAction(Action){
 if(Object.hasOwn(Action,ACTION))return;const native=Action.prototype.executeWorkflow;
 Action.prototype.executeWorkflow=async function(config,...args){
  if((this.id??this._id)===SPECTRAL_ACTION&&spectralMistItem(this.item)){
   try{config.targets=spectralTargets(this,config);}catch(error){ui.notifications.warn(error.message);return false;}
  }return native.call(this,config,...args);
 };Object.defineProperty(Action,ACTION,{value:true});
}
export function installSpectralRefresh(actions){
 const native=actions?.refreshActors;if(typeof native!=='function'||native[REFRESH])return;
 const refresh=async function(...args){
  const actors=new Map([...game.actors??[]].map(a=>[a.uuid,a]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  // Native RefreshFeatures covers linked characters/adversaries only. Supplement
  // companions and synthetic allies, without racing native deletion on the same IDs.
  const captured=game.user.isGM&&this.refreshSelections?.scene?.selected?[...actors.values()].filter(a=>!a.prototypeToken?.actorLink||!['character','adversary'].includes(a.type)).map(actor=>({actor,ids:spectralEffects(actor).map(e=>e.id)})):[];
  const result=await native.apply(this,args);
  for(const {actor,ids}of captured)try{await withHopeLock('spectral-mist:'+actor.uuid,async()=>{const allowed=new Set(ids),remaining=spectralEffects(actor).filter(e=>allowed.has(e.id)).map(e=>e.id);if(remaining.length)await actor.deleteEmbeddedDocuments('ActiveEffect',remaining);});}catch(error){console.error(ID+' | Spectral Mist scene expiry',error);ui.notifications.error('Spectral Mist scene expiry needs manual review. Remove remaining Spectral effects.');}
  return result;
 };Object.defineProperty(refresh,REFRESH,{value:true});actions.refreshActors=refresh;
}
export function registerSpectralMist(){
 CONFIG.queries[QUERY]=expireSpectralMist;
 const expire=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Spectral Mist expiry needs an active GM.');return gm.isSelf?expireSpectralMist(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});};
 installSpectralAction(game.system.api.data.actions.actionsTypes.base);
 for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installSpectralRoll(Roll,expire);
 installSpectralRefresh(CONFIG.ui?.daggerheartMenu?.DEFAULT_OPTIONS?.actions);installSpectralRefresh(ui.daggerheartMenu?.options?.actions);
 Hooks.on('renderDaggerheartMenu',app=>installSpectralRefresh(app.options.actions));
}
