import { decisionBudget } from '../settings.js';
import {ID,featureActive} from '../core.js';
import {PROTECTION_KEY,PROTECTION_ACTION} from './wardens-protection-data.js';
import {sourceToken} from './hallowed-aura.js';
import {allied,closeDistance} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {timedDialog} from '../dialog.js';
const QUERY=`${ID}.wardensProtection`,busy=new Set(),dialogs=new Set();
const esc=s=>foundry.utils.escapeHTML(String(s??''));
const actionFor=item=>item?.system.actions?.get?.(PROTECTION_ACTION)??item?.system.actions?.[PROTECTION_ACTION];
export function protectionItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===PROTECTION_KEY;})??null;}
export function protectionPending(item){return Number(actionFor(item)?.uses.value)===1?item?.flags?.[ID]?.protectionPending:null;}
export function protectionAllies(actor){
 const origin=sourceToken(actor);if(!origin)return [];
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
 const limit=closeDistance(canvas.scene,rules,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id),result=new Map();
 for(const token of canvas.tokens.placeables){const target=token.actor;if(!allied(origin.document,token.document)||target.statuses?.has('dead')||!(Number(target.system?.resources?.hitPoints?.value)>0))continue;
  const distance=origin.distanceTo(token);if(Number.isFinite(distance)&&distance<=limit&&!result.has(target.uuid))result.set(target.uuid,{actor:target,tokenUuid:token.document.uuid,name:target.name,hp:Number(target.system.resources.hitPoints.value)});
 }return [...result.values()];
}
const choices=actor=>protectionAllies(actor).map(({actor,...data})=>({...data,actorUuid:actor.uuid}));
export async function startProtection(actor){return withHopeLock(actor.uuid,async()=>{
 const item=protectionItem(actor),action=actionFor(item);if(!item||!action)throw new Error('Medkit the active Warden’s Protection feature first.');
 const pending=protectionPending(item);if(pending)return {...pending,allies:choices(actor)};
 if(Number(action.uses.value??0)>=1)throw new Error('Warden’s Protection has already been used this long rest.');
 if(!protectionAllies(actor).length)throw new Error('No injured allies within Close range. Place or select your token on the active scene.');
 const hope=Number(actor.system.resources.hope?.value);if(!(hope>=2))throw new Error('Warden’s Protection requires 2 Hope.');
 const path=`system.actions.${PROTECTION_ACTION}.uses.value`;const spent=await item.update({[path]:1});if(!spent||Number(actionFor(item).uses.value)!==1)throw new Error('Could not spend Warden’s Protection use.');
 let paid=false,stored=false;
 try{
  const updated=await actor.update({'system.resources.hope.value':hope-2});if(!updated||Number(actor.system.resources.hope.value)!==hope-2)throw new Error('Could not spend 2 Hope.');paid=true;
  const roll=await new foundry.dice.Roll('1d4').evaluate(),count=Number(roll.total);
  if(!Number.isInteger(count)||count<1||count>4)throw new Error('Invalid Warden’s Protection roll.');
  const result={id:foundry.utils.randomID(),count,completed:[]};await item.update({[`flags.${ID}.protectionPending`]:result});stored=true;
  const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`<strong>Warden’s Protection — ${esc(actor.name)}</strong><p>Spends 2 Hope. Choose up to ${count} allies within Close to clear 2 HP each.</p>`});
  if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  return {...result,allies:choices(actor)};
 }catch(error){if(!stored){await item.update({[path]:0});if(paid)await actor.update({'system.resources.hope.value':hope});}throw error;}
});}
export async function finishProtection(actor,request){
 const item=protectionItem(actor),pending=protectionPending(item);
 if(!pending||request.id!==pending.id)throw new Error('The Warden’s Protection selection expired. Reopen the action.');
 const ids=request.targets;if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.length>pending.count)throw new Error('Choose no more allies than the d4 result.');
 const eligible=new Map(protectionAllies(actor).map(x=>[x.actor.uuid,x]));
 if(ids.some(id=>!eligible.has(id)||(pending.completed??[]).includes(id)))throw new Error('An ally is no longer eligible. Reopen the selection.');
 if(ids.length+(pending.completed?.length??0)>pending.count)throw new Error('Too many allies selected.');
 const summaries=[];
 for(const id of ids){const target=eligible.get(id).actor;
  await withHopeLock(target.uuid,async()=>{
   if(!protectionAllies(actor).some(x=>x.actor.uuid===id))throw new Error(`${target.name} is no longer within Close or has no marked HP.`);
   const before=Number(target.system.resources.hitPoints.value),next=Math.max(0,before-2);
   const result=await target.update({'system.resources.hitPoints.value':next});if(!result||Number(target.system.resources.hitPoints.value)!==next)throw new Error(`Could not clear HP for ${target.name}.`);
   pending.completed=[...(pending.completed??[]),id];await item.update({[`flags.${ID}.protectionPending`]:pending});
   summaries.push(`${esc(target.name)} clears ${before-next} HP`);
  });
 }
 await item.update({[`flags.${ID}.-=protectionPending`]:null});
 await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Warden’s Protection</strong>: ${summaries.join('; ')}.</p>`});return true;
}
export async function resolveProtection(request,{user}){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;
 if(busy.has(actor.uuid))return false;busy.add(actor.uuid);
 try{return request.op==='start'?await startProtection(actor):request.op==='finish'?await finishProtection(actor,request):false;}finally{busy.delete(actor.uuid);}
}
export async function promptProtection(actor,data){
 const completed=data.completed??[],allies=data.allies.filter(a=>!completed.includes(a.actorUuid)),max=data.count-completed.length;
 if(!allies.length){ui.notifications.info('No eligible allies remain nearby. Reopen Protect Allies when ready; your d4 result is saved.');return null;}
 const read=dialog=>[...dialog.element.querySelectorAll('[data-protection]:checked')].map(input=>allies[Number(input.dataset.protection)].actorUuid);
 return timedDialog(`Warden’s Protection — ${actor.name}`,`<p>Your d4 rolled <strong>${data.count}</strong>. Choose up to <strong>${max}</strong> allies to clear 2 HP each.</p>${allies.map((a,i)=>`<label style="display:flex;align-items:center;gap:.75rem;margin:.75rem 0"><input type="checkbox" data-protection="${i}"><span>${esc(a.name)} — ${a.hp} HP marked</span></label>`).join('')}<p data-protection-count></p><p>Closing saves your roll. Reopen Protect Allies to finish choosing.</p>`,[{action:'apply',label:'Clear HP',callback:(_e,_b,d)=>read(d)},{action:'cancel',label:'Choose Later',default:true,callback:()=>null}],dialog=>{const refresh=()=>{const count=read(dialog).length;dialog.element.querySelector('[data-protection-count]').textContent=`${count} of ${max} allies selected`;const button=dialog.element.querySelector('[data-action="apply"]');if(button)button.disabled=count<1||count>max;};dialog.element.querySelectorAll('[data-protection]').forEach(input=>input.addEventListener('change',refresh));refresh();});
}
export function registerWardensProtection(){
 CONFIG.queries[QUERY]=resolveProtection;const Action=game.system.api.data.actions.actionsTypes.base,native=Action.prototype.use;
 Action.prototype.use=async function(...args){
  if(this.id!==PROTECTION_ACTION||protectionItem(this.actor)?.uuid!==this.item?.uuid)return native.apply(this,args);
  const actor=this.actor;if(!actor.testUserPermission(game.user,'OWNER')||dialogs.has(actor.uuid))return false;
  const gm=game.users.activeGM;if(!gm)throw new Error('Warden’s Protection needs an active GM.');
  const call=request=>gm.isSelf?resolveProtection(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(180000)});dialogs.add(actor.uuid);
  try{const data=await call({op:'start',actorUuid:actor.uuid});if(!data)return false;const targets=await promptProtection(actor,data);if(!targets?.length)return false;return await call({op:'finish',actorUuid:actor.uuid,id:data.id,targets});}finally{dialogs.delete(actor.uuid);}
 };
}
