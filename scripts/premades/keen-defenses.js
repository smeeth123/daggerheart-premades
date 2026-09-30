import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { KEEN_KEY } from './keen-defenses-data.js';
import { installVigilantBefore } from './vigilant.js';
import { honedAction } from './honed.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
import { syncFocus } from './stance-fighter.js';
const QUERY=`${ID}.keenDefenses`,PROMPT=`${ID}.keenDefensesPrompt`,seen=new Map();
export function keenItem(actor){return actor?.type==='character'&&Number(actor.system.resources.focus?.value)>=1&&Number(actor.system.tier)>=1?actor.items.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===KEEN_KEY;})??null:null;}
export async function promptKeen(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!keenItem(actor))return false;return Boolean(await timedDialog(`Keen Defenses — ${actor.name}`,`<p>You are targeted by an attack. Spend <strong>1 Focus</strong> for <strong>+${Number(actor.system.tier)} Evasion</strong> against it, before the attack rolls?</p>`,[{action:'use',label:'Spend Focus',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
export async function resolveKeen(request,{user},ask=promptKeen){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||seen.has(request.id)||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return null;
 const attacker=await fromUuid(request.source?.actor),actor=await fromUuid(request.actorUuid);
 if(!attacker?.testUserPermission(user,'OWNER')||honedAction(attacker,request.source)?.type!=='attack'||!keenItem(actor))return null;
 for(const[id,expiry]of seen)if(expiry<decisionNow())seen.delete(id);seen.set(request.id,decisionNow()+decisionBudget(300000));
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!accepted||decisionNow()>request.deadline)return null;
 return withHopeLock(actor.uuid,async()=>{if(!keenItem(actor))return null;const next=Number(actor.system.resources.focus.value)-1;const updated=await actor.update({'system.resources.focus.value':next});if(!updated||Number(actor.system.resources.focus.value)!==next)throw new Error('Could not spend Keen Defenses Focus.');await syncFocus(actor);return {bonus:Number(actor.system.tier),bearerName:actor.name};});
}
export function registerKeenDefenses(){CONFIG.queries[QUERY]=resolveKeen;CONFIG.queries[PROMPT]=promptKeen;installVigilantBefore(CONFIG.Dice.daggerheart.D20Roll,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Keen Defenses needs an active GM.');return gm.isSelf?resolveKeen(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});},keenItem,'keenDefenses');}
