import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { SCARY_KEY,SCARY_EFFECT } from './scary-data.js';
import { overwhelmHits } from './overwhelm.js';
import { markReactiveStress } from './stress-payment.js';
const QUERY=`${ID}.scary`,pending=new Set();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function scaryActive(actor){
 const item=actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===SCARY_KEY;});
 const origin=item?.effects?.get(SCARY_EFFECT)?.uuid;
 return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));
}
export async function resolveScary(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request.messageUuid!=='string'||pending.has(request.messageUuid))return false;
 const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
 if(!actor?.testUserPermission(user,'OWNER')||!scaryActive(actor)||message.flags?.[ID]?.scary||pending.has(request.messageUuid))return false;
 const hits=overwhelmHits(message);if(!hits.length)return false;
 pending.add(request.messageUuid);
 try{
  await message.setFlag(ID,'scary',{started:true});
  const results=[];
  for(const uuid of new Set(hits.map(h=>h.actorId))){
   const target=await fromUuid(uuid);
   if(!target||!['character','adversary'].includes(target.type))continue;
   const paid=await markReactiveStress(uuid,()=>true);
   results.push(`${esc(target.name)}: ${paid?'marks 1 Stress':'no unmarked Stress remaining'}`);
  }
  await message.setFlag(ID,'scary',{complete:true});
  if(results.length)await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Scary</strong> — ${results.join('; ')}.</p>`});
  return true;
 }finally{pending.delete(request.messageUuid);}
}
export function installScary(Action,apply){const native=Action.prototype.use;Action.prototype.use=async function(...args){const config=await native.apply(this,args);if(config&&scaryActive(this.actor)&&overwhelmHits(config.message).length)await apply({messageUuid:config.message.uuid});return config;};}
export function registerScary(){CONFIG.queries[QUERY]=resolveScary;installScary(game.system.api.data.actions.actionsTypes.base,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Scary needs an active GM.');return gm.isSelf?resolveScary(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});});}
