import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { FLOW_KEY } from './flow-state-data.js';
import { STANCE_EFFECTS } from './stance-effects.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
import { syncFocus } from './stance-fighter.js';
const PROMPT=`${ID}.flowStance`,pending=new Set();
export function flowActive(actor){return Boolean(actor?.items?.some(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===FLOW_KEY;}));}
export function flowPayments(actor){const r=actor?.system?.resources;return [Number(r?.focus?.value)>=1?'focus':null,Number(r?.stress?.value)<Number(r?.stress?.max)?'stress':null].filter(Boolean);}
export async function spendFlowFocus(actorUuid,eligible=()=>true){return withHopeLock(actorUuid,async()=>{const actor=await fromUuid(actorUuid);if(!flowActive(actor)||!eligible(actor)||!flowPayments(actor).includes('focus'))return false;const next=Number(actor.system.resources.focus.value)-1;const updated=await actor.update({'system.resources.focus.value':next});if(!updated||Number(actor.system.resources.focus.value)!==next)throw new Error('Could not spend Flow State Focus.');await syncFocus(actor);return true;});}
export function flowStance(action){return flowActive(action.actor)&&featureActive(action.item)&&action.effects?.some(e=>STANCE_EFFECTS.has(e._id))&&action.cost?.some(c=>c.key==='focus'&&Number(c.value)===1);}
export async function promptFlowStance(data,{user}){const actor=await fromUuid(data.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!actor.testUserPermission(game.user,'OWNER')||!flowActive(actor))return null;return timedDialog(`Flow State — ${actor.name}`,'<p>Choose how to pay for entering the stance.</p>',[...flowPayments(actor).map(payment=>({action:payment,label:payment==='focus'?'Spend 1 Focus':'Mark 1 Stress',callback:()=>payment})),{action:'cancel',label:'Cancel',default:true,callback:()=>null}]);}
export function installFlowStances(Action,ask){const native=Action.prototype.use;Action.prototype.use=async function(...args){if(!flowStance(this))return native.apply(this,args);const actor=this.actor;if(pending.has(actor.uuid))return;pending.add(actor.uuid);try{const payment=await ask(actor);if(!flowStance(this)||!flowPayments(actor).includes(payment))return;const data=this.toObject();data.cost=data.cost.map(c=>c.key==='focus'&&Number(c.value)===1?{...c,key:payment}:c);const action=new this.constructor(data,{parent:this.parent});return await native.apply(action,args);}finally{pending.delete(actor.uuid);}};}
export function registerFlowState(){CONFIG.queries[PROMPT]=promptFlowStance;installFlowStances(game.system.api.data.actions.actionsTypes.base,actor=>{const owner=ownerFor(actor,[...game.users],game.users.activeGM??game.user),data={actorUuid:actor.uuid};return owner.isSelf?promptFlowStance(data,{user:game.user}):owner.query(PROMPT,data,{timeout:decisionBudget(65000)});});}
