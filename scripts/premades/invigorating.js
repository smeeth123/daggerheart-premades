import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { INVIGORATING_KEY,INVIGORATING_EFFECT } from './invigorating-data.js';
import { overwhelmHits } from './overwhelm.js';
import { withHopeLock } from './hope-lock.js';
import { syncFocus } from './stance-fighter.js';
const QUERY=`${ID}.invigorating`,pending=new Set();
export function invigoratingActive(actor){const item=actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===INVIGORATING_KEY;});const origin=item?.effects?.get(INVIGORATING_EFFECT)?.uuid;return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));}
export async function resolveInvigorating(request,{user},rollDie=async()=>new Roll('1d4').evaluate()){
 if(!game.user.isActiveGM||!user?.active||typeof request.messageUuid!=='string'||pending.has(request.messageUuid))return false;
 const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
 if(!actor?.testUserPermission(user,'OWNER')||!invigoratingActive(actor)||!overwhelmHits(message).length||message.flags?.[ID]?.invigorating||pending.has(request.messageUuid))return false;
 pending.add(request.messageUuid);try{
  await message.setFlag(ID,'invigorating',{started:true});
  const roll=await rollDie();if(!Number.isInteger(roll.total)||roll.total<1||roll.total>4)throw new Error('Invalid Invigorating die result.');
  let gained=0;
  if(roll.total===4)await withHopeLock(actor.uuid,async()=>{const before=Number(actor.system.resources.focus.value),next=Math.min(6,before+1);if(next>before){const updated=await actor.update({'system.resources.focus.value':next});if(!updated||Number(actor.system.resources.focus.value)!==next)throw new Error('Could not gain Invigorating Focus.');gained=next-before;await syncFocus(actor);}});
  await message.setFlag(ID,'invigorating',{result:roll.total,gained});
  await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`Invigorating — ${gained?'gain 1 Focus':roll.total===4?'Focus already at maximum':'no Focus gained'}`});return true;
 }finally{pending.delete(request.messageUuid);}
}
export function installInvigorating(Action,offer){
 const native=Action.prototype.use;
 Action.prototype.use=async function(...args){
  const config=await native.apply(this,args);
  if(config&&invigoratingActive(this.actor)&&overwhelmHits(config.message).length)await offer({messageUuid:config.message.uuid});
  return config;
 };
}
export function registerInvigorating(){CONFIG.queries[QUERY]=resolveInvigorating;installInvigorating(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Invigorating needs an active GM.');return gm.isSelf?resolveInvigorating(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});});}
