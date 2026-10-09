import {ID,featureActive} from '../core.js';
import {sourceToken} from './hallowed-aura.js';
import {unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {markReactiveStress} from './stress-payment.js';
import {decisionBudget} from '../settings.js';
import {KORVAX_KEY,RUNE_ACTION} from './book-of-korvax-data.js';
const QUERY=`${ID}.runeCircle`,WRAP=Symbol.for(QUERY),requests=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function korvaxItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return i.type==='domainCard'&&featureActive(i)&&!i.system.inVault&&!i.system.isDomainTouchedSuppressed&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===KORVAX_KEY;})??null:null;}
export const runeAdversary=token=>token?.actor?.type==='adversary'&&!unavailableActor(token.actor)&&!(Number(token.actor.system?.resources?.hitPoints?.max)>0&&Number(token.actor.system.resources.hitPoints.value)>=Number(token.actor.system.resources.hitPoints.max));
const state=region=>region?.flags?.[ID]?.runeCircle;
const live=region=>Boolean(state(region)?.ready&&region.parent?.regions?.get(region.id)===region);
export function runeRegionData(item,token){const shape=CONFIG.Canvas.layers.regions.layerClass.getTemplateShape({shapeType:CONFIG.DH.GENERAL.templateTypes.circle.id,range:'melee',hasHole:false});if(!Number.isFinite(shape.radius)||shape.radius<=0)throw Error('Rune Circle needs a positive Melee range in this scene.');shape.x=token.center.x;shape.y=token.center.y;
 return {name:`Rune Circle — ${item.actor.name}`,shapes:[shape],restriction:{enabled:false,type:'move',priority:0},behaviors:[{name:'Rune Circle',type:'executeScript',system:{events:[CONST.REGION_EVENTS.TOKEN_ENTER,CONST.REGION_EVENTS.TOKEN_EXIT],source:`await game.modules.get('${ID}')?.api?.runeCircleEvent?.(region, event);`}}],locked:false,displayMeasurements:true,visibility:CONST.REGION_VISIBILITY.ALWAYS,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},flags:{[ID]:{runeCircle:{ready:false,actorUuid:item.actor.uuid,itemUuid:item.uuid,tokenUuid:token.document.uuid,inside:[]}}}};
}
async function applyRuneDamage(actor,packet){return withHopeLock(`runeDamage:${actor.uuid}`,async()=>{const descriptor=Object.getOwnPropertyDescriptor(actor,'update'),native=actor.update,pending=[];
 const capture=function(...args){const result=native.apply(this,args);pending.push(Promise.resolve(result));return result;};actor.update=capture;
 try{const result=await actor.takeDamage(packet,false);let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}return result;}finally{if(actor.update===capture){if(descriptor)Object.defineProperty(actor,'update',descriptor);else delete actor.update;}}
 });}
export async function damageRuneTargets(region,tokens,rollDice=async()=>new foundry.dice.Roll('2d12+4',{}, {damageTypes:['magical']}).evaluate()){
 if(!game.user.isActiveGM||!live(region))return false;const targets=[...new Map(tokens.filter(t=>runeAdversary(t)&&t.parent===region.parent&&region.parent.tokens.get(t.id)===t).map(t=>[t.actor.uuid,t])).values()];if(!targets.length)return false;
 const caster=await fromUuid(state(region).actorUuid),roll=await rollDice();if(!Number.isInteger(roll.total)||roll.total<6||roll.total>28)throw Error('Invalid Rune Circle damage roll.');if(!live(region))return false;
 const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:caster??undefined}),flags:{[ID]:{unshakeableRoll:true,runeCircleDamage:true}},flavor:`<strong>Rune Circle — 2d12+4 magic damage</strong><p>${targets.map(t=>esc(t.name??t.actor.name)).join(', ')}. Knock affected adversaries back to Very Close manually.</p>`},{messageMode:game.settings.get('core','messageMode')});
 if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
 const results=[];for(const token of targets){if(!game.user.isActiveGM||!live(region))break;if(!runeAdversary(token)||token.parent!==region.parent||region.parent.tokens.get(token.id)!==token)continue;
  const multiplier=Number(token.actor.system?.rules?.attack?.damage?.hpDamageTakenMultiplier??1);if(!Number.isFinite(multiplier)||multiplier<0)throw Error('Invalid Rune Circle damage multiplier.');const main=roll.toJSON();main.total=Math.ceil(roll.total*multiplier);main.options={...main.options,damageTypes:['magical'],[ID]:{...main.options?.[ID],runeCircleDamage:true,retributionSource:{actorUuid:state(region).actorUuid,tokenUuid:state(region).tokenUuid}}};
  results.push(await applyRuneDamage(token.actor,{main,resources:{}}));
 }return results;
}
export async function runeCircleEvent(region,event,damage=damageRuneTargets){
 if(!game.user.isActiveGM||!live(region)||event?.region&&event.region!==region)return false;const token=event?.data?.token;if(!token||token.parent!==region.parent||region.parent.tokens.get(token.id)!==token)return false;
 return withHopeLock(`runeRegion:${region.uuid}`,async()=>{if(!game.user.isActiveGM||!live(region))return false;const inside=new Set(state(region).inside??[]);
  if(event.name===CONST.REGION_EVENTS.TOKEN_EXIT){if(!inside.delete(token.id))return false;await region.update({[`flags.${ID}.runeCircle.inside`]:[...inside]});return true;}
  if(event.name!==CONST.REGION_EVENTS.TOKEN_ENTER||inside.has(token.id))return false;inside.add(token.id);const updated=await region.update({[`flags.${ID}.runeCircle.inside`]:[...inside]});if(!updated)throw Error('Rune Circle could not record entry. Check damage manually.');return damage(region,[token]);
 });
}
export async function activateRuneCircle(request,{user},damage=damageRuneTargets,pay=markReactiveStress){
 if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id))return false;const actor=await fromUuid(request.actorUuid),item=korvaxItem(actor),token=sourceToken(actor);if(!item||request.itemUuid!==item.uuid||!actor.testUserPermission(user,'OWNER')||!token||unavailableActor(actor))return false;
 const key=`${user.id}:${request.id}`,signature=JSON.stringify(request),previous=requests.get(key);if(previous)return previous.signature===signature?previous.promise:false;
 const promise=withHopeLock(`runeCast:${actor.uuid}`,async()=>{if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER')||korvaxItem(actor)?.uuid!==item.uuid||sourceToken(actor)?.document.uuid!==token.document.uuid)return false;
  const scene=canvas.scene;let region,paid=false;try{[region]=await scene.createEmbeddedDocuments('Region',[runeRegionData(item,token)]);if(!region)throw Error('Could not create Rune Circle.');
   paid=await pay(actor.uuid,a=>game.user.isActiveGM&&user.active&&a.testUserPermission(user,'OWNER')&&korvaxItem(a)?.uuid===item.uuid&&canvas.scene===scene&&!unavailableActor(a));if(!paid){await region.delete();return false;}
   const tokens=[...(region.tokens??[])],inside=tokens.map(t=>t.id);const updated=await region.update({[`flags.${ID}.runeCircle.ready`]:true,[`flags.${ID}.runeCircle.inside`]:inside});if(!updated||!live(region))throw Error('Could not activate the paid Rune Circle.');
   await damage(region,tokens);return {regionUuid:region.uuid};
  }catch(error){if(region&&!paid)await region.delete();if(paid)ui.notifications.error('Rune Circle was paid for but did not finish. Check its Region and damage manually before retrying.');throw error;}
 });requests.set(key,{signature,promise});if(requests.size>512)requests.delete(requests.keys().next().value);return promise;
}
export function installRuneCircle(Action,send){if(Object.hasOwn(Action,WRAP))return;const native=Action.prototype.use;Action.prototype.use=async function(...args){const item=korvaxItem(this.actor);if(this.id!==RUNE_ACTION||item?.uuid!==this.item?.uuid)return native.apply(this,args);return send({id:foundry.utils.randomID(),actorUuid:this.actor.uuid,itemUuid:item.uuid});};Object.defineProperty(Action,WRAP,{value:true});}
export function registerBookOfKorvax(){CONFIG.queries[QUERY]=activateRuneCircle;game.modules.get(ID).api.runeCircleEvent=async(...args)=>{try{return await runeCircleEvent(...args);}catch(error){console.error(`${ID} | Rune Circle`,error);ui.notifications.error(`Rune Circle damage stopped: ${error.message}. Check damage manually.`);return false;}};
 installRuneCircle(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Rune Circle needs an active GM.');return gm.isSelf?activateRuneCircle(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(600000)});});
}
