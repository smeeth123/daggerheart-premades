import {recordEvasionBonus} from '../evasion-indicators.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID,featureActive } from '../core.js';
import { VIGILANT_KEY,VIGILANT_EFFECT } from './vigilant-data.js';
export function vigilantItem(actor){
 const stress=actor?.system?.resources?.stress;
 if(actor?.type!=='character'||!(Number(stress?.value)<Number(stress?.max)))return null;
 const item=actor.items.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===VIGILANT_KEY;});
 const origin=item?.effects?.get(VIGILANT_EFFECT)?.uuid;
 return origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed)?item:null;
}
import { honedAction } from './honed.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { markReactiveStress } from './stress-payment.js';
const QUERY=`${ID}.vigilantBeforeAttack`,PROMPT=`${ID}.vigilantBeforePrompt`,seen=new Map();
export async function promptVigilant(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!vigilantItem(actor))return false;return Boolean(await timedDialog(`Vigilant — ${actor.name}`,'<p>You are targeted by an attack. Before the attack rolls, mark <strong>1 Stress</strong> for <strong>+1d6 Evasion</strong> against it?</p>',[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));}
export async function resolveVigilant(request,{user},ask=promptVigilant){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||seen.has(request.id)||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return null;
 const attacker=await fromUuid(request.source?.actor),actor=await fromUuid(request.actorUuid);
 if(!attacker?.testUserPermission(user,'OWNER')||honedAction(attacker,request.source)?.type!=='attack'||!vigilantItem(actor))return null;
 for(const [id,expiry]of seen)if(expiry<decisionNow())seen.delete(id);
 seen.set(request.id,decisionNow()+decisionBudget(300000));
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!accepted||decisionNow()>request.deadline||!await markReactiveStress(actor.uuid,a=>Boolean(vigilantItem(a))))return null;
 const roll=await new Roll('1d6').evaluate();
 if(!Number.isInteger(roll.total)||roll.total<1||roll.total>6)throw new Error('Invalid Vigilant result.');
 await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`Vigilant — +${roll.total} Evasion against the incoming attack`});
 return {bonus:roll.total,bearerName:actor.name};
}
export function installVigilantBefore(RollClass,offer,eligible=vigilantItem,flag='vigilant',options={}){const configure=RollClass.buildConfigure,post=RollClass.buildPost;
 const label=options.label??(flag==='keenDefenses'?'Keen Defenses':'Vigilant');
 RollClass.buildConfigure=async function(config,...args){const roll=await configure.call(this,config,...args),attacker=config.data?.parent;
  if(!roll||roll._evaluated||config.actionType==='reaction'&&!options.allowReactions||honedAction(attacker,config.source)?.type!=='attack')return roll;
  const handled=new Set(),names=[];
  for(const target of config.targets??[]){
   if(handled.has(target.actorId)||!Number.isFinite(Number(target.evasion))||(target.difficulty&&Number(target.difficulty)!==Number(target.evasion)))continue;
   const actor=await fromUuid(target.actorId);if(!eligible(actor,config,target,attacker))continue;handled.add(target.actorId);
   const result=await offer({id:foundry.utils.randomID(),source:config.source,actorUuid:actor.uuid,deadline:decisionNow()+decisionBudget(120000)},config,target,attacker);
   if(!result)continue;
   for(const same of config.targets.filter(t=>t.actorId===actor.uuid&&(!result.targetIds||result.targetIds.includes(t.id)))){recordEvasionBonus(config,same,label,result.bonus,result.bearerName);same.evasion=Number(same.evasion)+result.bonus;if(same.difficulty)same.difficulty=Number(same.difficulty)+result.bonus;}
   names.push(result.bearerName);
  }
  if(names.length)config[ID]={...config[ID],[flag]:names.join(', ')};
  return roll;
 };
 RollClass.buildPost=async function(roll,config,...args){const result=await post.call(this,roll,config,...args);if(config[ID]?.[flag]&&config.message)await config.message.setFlag(ID,flag,config[ID][flag]);return result;};
}
export function registerVigilant(){CONFIG.queries[QUERY]=resolveVigilant;CONFIG.queries[PROMPT]=promptVigilant;installVigilantBefore(CONFIG.Dice.daggerheart.D20Roll,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Vigilant needs an active GM.');return gm.isSelf?resolveVigilant(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});});}
