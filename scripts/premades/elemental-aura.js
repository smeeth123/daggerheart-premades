import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { ELEMENTAL_AURA_KEY,ELEMENTAL_AURA_ACTION } from './elemental-aura-data.js';
import { ELEMENTS } from './elemental-incarnation-data.js';
import { elementalItem } from './elemental-incarnation.js';
import { sourceToken } from './hallowed-aura.js';
import { meleeLimit } from './kick.js';
import { closeDistance,allied,ownerFor } from './aura-rules.js';
import { markReactiveStress } from './stress-payment.js';
import { withHopeLock } from './hope-lock.js';
import { timedDialog } from '../dialog.js';
const ACTIVATE=`${ID}.elementalAuraActivate`,AIR=`${ID}.elementalAuraAir`,WATER=`${ID}.elementalAuraWater`,PROMPT=`${ID}.elementalAuraPrompt`;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function auraItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===ELEMENTAL_AURA_KEY;})??null;}
export function channelState(actor){const item=elementalItem(actor);if(!item)return null;for(const [element,id] of Object.entries(ELEMENTS)){const origin=item.effects.get(id)?.uuid;const effect=actor.effects.find(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed);if(effect)return {element,effect};}return null;}
export function activeAura(actor){if(!auraItem(actor))return null;const channel=channelState(actor);if(!channel)return null;return actor.effects.find(e=>{const f=e.flags?.[ID]?.elementalAura;return !e.disabled&&!e.isSuppressed&&f?.channel===channel.effect.uuid&&f.element===channel.element;})??null;}
export function inAura(bearer,target){const a=sourceToken(bearer),b=sourceToken(target);if(!a||!b)return false;const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;const limit=closeDistance(canvas.scene,rules,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id);const distance=a.distanceTo(b);return Number.isFinite(distance)&&distance<=limit;}
function friends(a,b){if(a.uuid===b.uuid)return true;const x=sourceToken(a),y=sourceToken(b);return Boolean(x&&y&&allied(x.document,y.document));}
function sceneActors(){return [...new Map((canvas.tokens?.placeables??[]).filter(t=>t.actor).map(t=>[t.actor.uuid,t.actor])).values()];}
function allActors(){const result=new Map([...(game.actors??[])].map(a=>[a.uuid,a]));for(const scene of game.scenes??[])for(const t of scene.tokens??[])if(t.actor)result.set(t.actor.uuid,t.actor);return [...result.values()];}
export function auraBearers(element,target,allies=false){return sceneActors().filter(a=>activeAura(a)?.flags[ID].elementalAura.element===element&&inAura(a,target)&&(!allies||friends(a,target)));}
export async function activateAura(request,{user}){const actor=await fromUuid(request.actorUuid);if(!game.user.isActiveGM||!user?.active||!actor?.testUserPermission(user,'OWNER'))return false;return withHopeLock(actor.uuid,async()=>{const item=auraItem(actor),channel=channelState(actor),action=item?.system.actions?.get?.(ELEMENTAL_AURA_ACTION)??item?.system.actions?.[ELEMENTAL_AURA_ACTION];if(!item||!channel)throw new Error('Channel an element with Elemental Incarnation first.');if(!action||Number(action.uses.value)>=1||activeAura(actor))throw new Error('Elemental Aura has already been used this rest.');const path=`system.actions.${ELEMENTAL_AURA_ACTION}.uses.value`;const updated=await item.update({[path]:1});if(!updated||Number((item.system.actions?.get?.(ELEMENTAL_AURA_ACTION)??item.system.actions?.[ELEMENTAL_AURA_ACTION])?.uses.value)!==1)throw new Error('Could not spend the Elemental Aura use.');try{const created=await actor.createEmbeddedDocuments('ActiveEffect',[{name:`Elemental Aura (${channel.element})`,img:item.img,type:'base',transfer:false,system:{changes:[],duration:{type:'shortRest'}},flags:{[ID]:{elementalAura:{element:channel.element,channel:channel.effect.uuid}}}}]);if(!created.length)throw new Error('Aura activation was canceled.');}catch(error){await item.update({[path]:0});throw error;}await syncEarth();await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Elemental Aura</strong>: ${esc(actor.name)} activates ${channel.element} within Close range.</p>`});return true;});}
let syncing=Promise.resolve();
export function syncEarth(){const run=async()=>{if(!game.user.isActiveGM||!canvas.ready)return;const actors=allActors(),local=sceneActors(),wanted=new Set();for(const actor of local)if(auraBearers('earth',actor,true).some(b=>b.uuid!==actor.uuid))wanted.add(actor.uuid);
 for(const actor of actors){const old=actor.effects.filter(e=>e.flags?.[ID]?.elementalEarth);if(wanted.has(actor.uuid)){if(!old.length)await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Elemental Aura — Earth',img:'icons/magic/earth/construct-stone.webp',type:'base',transfer:false,system:{changes:[{key:'system.traits.strength.value',type:'add',value:1,phase:'initial'}],duration:{type:''}},flags:{[ID]:{elementalEarth:true}}}]);if(old.length>1)await actor.deleteEmbeddedDocuments('ActiveEffect',old.slice(1).map(e=>e.id));}else if(old.length)await actor.deleteEmbeddedDocuments('ActiveEffect',old.map(e=>e.id));
 const stale=actor.effects.filter(e=>e.flags?.[ID]?.elementalAura&&e!==activeAura(actor));if(stale.length)await actor.deleteEmbeddedDocuments('ActiveEffect',stale.map(e=>e.id));
 }};syncing=syncing.catch(()=>{}).then(run);return syncing;}
async function validateDamage(request,user){const target=await fromUuid(request.targetUuid),source=await fromUuid(request.sourceUuid);return user?.active&&target&&source&&(target.testUserPermission(user,'OWNER')||source.testUserPermission(user,'OWNER'))?{target,source}:null;}
export async function reduceAir(request,{user}){if(!game.user.isActiveGM)return 0;const pair=await validateDamage(request,user);if(!pair||!auraBearers('air',pair.target,true).length)return 0;const a=sourceToken(pair.source),b=sourceToken(pair.target),distance=a&&b&&a.distanceTo(b);if(!Number.isFinite(distance)||distance<=meleeLimit(canvas.scene))return 0;const roll=await new Roll('1d8').evaluate();await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:pair.target}),flavor:'Elemental Aura — Air damage reduction'});return roll.total;}
export async function promptWater(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER'))return false;return Boolean(await timedDialog(`Elemental Aura — ${actor.name}`,`<p>Mark <strong>1 Stress</strong> to move ${esc(data.targetName)} anywhere within Very Close of their current position? Move the token manually.</p>`,[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
export async function moveWater(request,{user}){if(!game.user.isActiveGM)return false;const pair=await validateDamage(request,user);if(!pair||pair.source.type!=='adversary'||!request.water||!auraItem(pair.target)||!inAura(pair.target,pair.source))return false;const r=pair.target.system.resources.stress;if(!(Number(r.value)<Number(r.max)))return false;const owner=ownerFor(pair.target,[...game.users],game.user),data={actorUuid:pair.target.uuid,targetName:pair.source.name};const accepted=owner.isSelf?await promptWater(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});if(!accepted||!await markReactiveStress(pair.target.uuid,()=>true))return false;await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:pair.target}),content:`<p><strong>Elemental Aura — Water</strong>: ${esc(pair.target.name)} marks 1 Stress. Move ${esc(pair.source.name)} up to Very Close from their current position.</p>`});return true;}
async function gmCall(name,request){const gm=game.users.activeGM;if(!gm)throw new Error('Elemental Aura needs an active GM.');return gm.isSelf?CONFIG.queries[name](request,{user:game.user}):gm.query(name,request,{timeout:decisionBudget(125000)});}
export function installAuraDamage(Actor,air,water){
 const native=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(args,...rest){
  const meta=args?.main?.options?.[ID],sourceUuid=meta?.elementalSource;
  const waterActive=activeAura(this)?.flags[ID].elementalAura.element==='water';
  let damage=args;
  if(sourceUuid&&meta.elementalAttack&&Number(args.main.total)>0){
   const reduction=await air({sourceUuid,targetUuid:this.uuid});
   if(reduction>0)damage={...args,main:{...(args.main.toJSON?.()??args.main),total:Math.max(0,Number(args.main.total)-reduction)}};
  }
  const waterDamage=Number(damage?.main?.total)>0&&this.calculateDamage(Number(damage.main.total),damage.main.options?.damageTypes??[])>0;
  const result=await native.call(this,damage,...rest);
  if(result&&sourceUuid&&waterActive&&waterDamage)await water({sourceUuid,targetUuid:this.uuid,water:true});
  return result;
 };
}
// Daggerheart measures rendered token centers. Document updates can arrive before
// those centers move, so reconcile again after position/size rendering settles.
export function registerAuraMovement(hooks,refresh){
 let timer;
 hooks.on('refreshToken',(token,flags)=>{
  if(!game.user.isActiveGM||token.isPreview||!canvas.tokens?.placeables.includes(token))return;
  if(!flags.refreshPosition&&!flags.refreshSize&&!flags.refreshElevation)return;
  clearTimeout(timer);timer=setTimeout(refresh,60);
 });
}
export function registerElementalAura(){CONFIG.queries[ACTIVATE]=activateAura;CONFIG.queries[AIR]=reduceAir;CONFIG.queries[WATER]=moveWater;CONFIG.queries[PROMPT]=promptWater;
 const Action=game.system.api.data.actions.actionsTypes.base,native=Action.prototype.use;Action.prototype.use=async function(...args){if(this.id===ELEMENTAL_AURA_ACTION&&auraItem(this.actor)?.uuid===this.item.uuid)return gmCall(ACTIVATE,{actorUuid:this.actor.uuid});return native.apply(this,args);};
 installAuraDamage(CONFIG.Actor.documentClass,request=>gmCall(AIR,request),request=>gmCall(WATER,request));
 const safe=()=>{void syncEarth().catch(e=>ui.notifications.error(e.message));};
 registerAuraMovement(Hooks,safe);
 for(const name of ['canvasReady','updateToken','createToken','deleteToken','createActiveEffect','updateActiveEffect','deleteActiveEffect','updateItem','deleteItem'])Hooks.on(name,safe);
 Hooks.on('preUpdateActor',(actor,change,options)=>{const value=change['system.resources.hitPoints.value']??change.system?.resources?.hitPoints?.value;if(value!==undefined)options.dhpAuraPreviousHP=Number(actor.system.resources?.hitPoints?.value);});
 Hooks.on('updateActor',(actor,change,options)=>{if(!game.user.isActiveGM||actor.type!=='adversary'||options.dhpAuraPreviousHP===undefined)return;const value=change['system.resources.hitPoints.value']??change.system?.resources?.hitPoints?.value;if(Number(value)>options.dhpAuraPreviousHP&&auraBearers('fire',actor).length)void markReactiveStress(actor.uuid,()=>true).then(paid=>paid&&ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Elemental Aura — Fire</strong>: ${esc(actor.name)} marks 1 Stress.</p>`})).catch(e=>ui.notifications.error(e.message));});safe();
}
