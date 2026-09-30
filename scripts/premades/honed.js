import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { HONED_KEY,HONED_EFFECT } from './honed-data.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
import { syncFocus } from './stance-fighter.js';
const QUERY=`${ID}.honed`,PROMPT=`${ID}.honedPrompt`,pending=new Set();
export function honedActive(actor){const item=actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===HONED_KEY;});const origin=item?.effects?.get(HONED_EFFECT)?.uuid;return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));}
export function honedAction(actor,source){if(source?.action&&(actor?.system.attack?.id===source.action||actor?.system.attack?._id===source.action))return actor.system.attack;const item=actor?.items?.get?.(source?.item);return item?.system.actions?.get?.(source?.action)??item?.system.actionsList?.find(a=>a.id===source?.action);}
export async function promptHoned(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!honedActive(actor))return false;return Boolean(await timedDialog(`Honed — ${actor.name}`,'<p>Spend <strong>1 Focus</strong> for <strong>+1 Proficiency</strong> on this attack?</p>',[{action:'use',label:'Spend Focus',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
export async function resolveHoned(request,{user},ask=promptHoned){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.source?.actor);
 const eligible=()=>actor?.testUserPermission(user,'OWNER')&&honedActive(actor)&&honedAction(actor,request.source)?.type==='attack'&&Number(actor.system.resources.focus?.value)>=1;
 if(!eligible()||pending.has(actor.uuid))return false;
 pending.add(actor.uuid);try{
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted)return false;
  return await withHopeLock(actor.uuid,async()=>{if(!eligible())return false;const next=Number(actor.system.resources.focus.value)-1;const updated=await actor.update({'system.resources.focus.value':next});if(!updated||Number(actor.system.resources.focus.value)!==next)throw new Error('Could not spend Honed Focus.');await syncFocus(actor);return true;});
 }finally{pending.delete(actor.uuid);}
}
export function installHoned(Duality,Damage,offer){
 const configure=Duality.buildConfigure,post=Duality.buildPost,damage=Damage.buildConfigure;
 Duality.buildConfigure=async function(config,...args){const roll=await configure.call(this,config,...args),actor=config.data?.parent;if(roll&&!roll._evaluated&&config.actionType!=='reaction'&&honedActive(actor)&&honedAction(actor,config.source)?.type==='attack'&&Number(actor.system.resources.focus?.value)>=1&&await offer({source:config.source}))config[ID]={...config[ID],honed:true};return roll;};
 Duality.buildPost=async function(roll,config,...args){const result=await post.call(this,roll,config,...args);if(config[ID]?.honed&&config.message)await config.message.setFlag(ID,'honed',true);return result;};
 Damage.buildConfigure=async function(config,...args){const message=game.messages.get(config.source?.message);if(!config.hasHealing&&message?.flags?.[ID]?.honed&&!config[ID]?.honedProficiency&&Number.isFinite(Number(config.data?.prof))){
  const prof=Number(config.data.prof)+1;config.data={...config.data,prof,system:{...config.data.system,proficiency:prof}};config[ID]={...config[ID],honedProficiency:true};
  const action=message.system.action;
  if(action.damage?.main&&config.damageFormula){const context=new Proxy(action,{get(target,key){if(key==='getRollData')return (...a)=>({...target.getRollData(...a),prof});return Reflect.get(target,key,target);}});const formulas=game.system.api.fields.ActionFields.DamageField.formatFormulas.call(context,[action.damage.main],config);if(formulas[0])config.damageFormula={...config.damageFormula,formula:formulas[0].formula};}
 }return damage.call(this,config,...args);};
}
export function registerHoned(){CONFIG.queries[QUERY]=resolveHoned;CONFIG.queries[PROMPT]=promptHoned;installHoned(CONFIG.Dice.daggerheart.DualityRoll,CONFIG.Dice.daggerheart.DamageRoll,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Honed needs an active GM.');return gm.isSelf?resolveHoned(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});});}
