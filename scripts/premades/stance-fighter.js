import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { STANCE_KEY,REFOCUS } from './stance-fighter-data.js';
const QUERY=`${ID}.refocus`,SYNC=`${ID}FocusSync`,pending=new Set();
export function stanceItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===STANCE_KEY;})??null;}
export function instinctDice(actor){return Math.max(0,Math.floor(Number(actor.system.traits?.instinct?.value??actor.system.traits?.instinct?.data?.value??0)));}
export async function syncFocus(actor){if(!game.user.isActiveGM)return;const item=stanceItem(actor),value=Number(actor?.system?.resources?.focus?.value);if(item&&Number.isFinite(value)&&Number(item.system.resource.value)!==value)await item.update({'system.resource.value':value},{[SYNC]:true});}
export async function refocus(request,{user},rollDice=async n=>new Roll(`${n}d6kh1`).evaluate()){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid),item=stanceItem(actor);
 if(!item||!actor.testUserPermission(user,'OWNER')||pending.has(actor.uuid))return false;
 const action=item.system.actions?.get?.(REFOCUS)??item.system.actions?.[REFOCUS];
 if(!action||Number(action.uses.value??0)>=1)return false;
 const count=instinctDice(actor);if(!Number.isInteger(count)||count<1)throw new Error('Refocus needs a positive Instinct to roll its dice.');
 pending.add(actor.uuid);const before=Number(actor.system.resources.focus.value);
 try{
  await item.update({[`system.actions.${REFOCUS}.uses.value`]:1});
  let roll;
  try{await actor.update({'system.resources.focus.value':0});roll=await rollDice(count);if(!Number.isInteger(roll.total)||roll.total<1||roll.total>6)throw new Error('Invalid Refocus roll.');await actor.update({'system.resources.focus.value':roll.total});}
  catch(error){await actor.update({'system.resources.focus.value':before});await item.update({[`system.actions.${REFOCUS}.uses.value`]:0});throw error;}
  await syncFocus(actor);
  await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`Refocus — gain ${roll.total} Focus (highest of ${count}d6)`});return true;
 }finally{pending.delete(actor.uuid);}
}
export function registerStanceFighter(){
 CONFIG.queries[QUERY]=refocus;
 Hooks.on('daggerheart.preUseAction',action=>{if(action.id!==REFOCUS||stanceItem(action.actor)?.uuid!==action.item?.uuid)return;const gm=game.users.activeGM;if(!gm){ui.notifications.error('Refocus needs an active GM.');return false;}const request={actorUuid:action.actor.uuid};void (gm.isSelf?refocus(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)})).catch(e=>ui.notifications.error(e.message));return false;});
 Hooks.on('updateActor',actor=>{void syncFocus(actor).catch(console.error);});
 Hooks.on('updateItem',(item,change,options)=>{if(options?.[SYNC]||!game.user.isActiveGM||stanceItem(item.actor)?.uuid!==item.uuid)return;if(change.flags?.[ID]?.applied||change[`flags.${ID}.applied`]){void syncFocus(item.actor).catch(console.error);return;}const value=change['system.resource.value']??change.system?.resource?.value;if(value!==undefined&&Number.isFinite(Number(value)))void item.actor.update({'system.resources.focus.value':Math.max(0,Math.min(6,Number(value)))}).catch(console.error);else void syncFocus(item.actor).catch(console.error);});
 Hooks.on('createItem',item=>{if(item.actor)void syncFocus(item.actor).catch(console.error);});for(const actor of game.actors)void syncFocus(actor).catch(console.error);
}
