import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { venomItem,twinEligible,applyVenom } from './venomancer.js';
import { poisonItem } from './poison-compendium.js';
import { ID,featureActive } from '../core.js';
import { TOXIC_KEY,GAIN,GHOST } from './toxic-concoctions-data.js';
import { markHit } from './marked-for-death.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { markReactiveStress } from './stress-payment.js';
const QUERY=`${ID}.toxic`,PROMPT=`${ID}.toxicPrompt`,queues=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toxicItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===TOXIC_KEY;})??null;}

export function poisonOptions(actor){return {ghost:'Ghost Petal — temporarily Vulnerable',grave:'Grave Spore — mark 1 Stress',leech:'Leech Weed — +1d6 damage',...(poisonItem(actor)?{midnight:'Midnight Vine — attack disadvantage',gorgon:'Gorgon Root — temporarily Restrained'}:{}),...(venomItem(actor)?{blight:'Blight Seed — −3 damage thresholds',fear:'Fear Leaf — Fear Die bonus damage',corpse:'Corpse Thorn — Reaction disadvantage'}:{})};}
export function validPoisons(actor,target,choices,tokens){return choices.length>=1&&choices.length<=2&&new Set(choices).size===choices.length&&choices.length<=tokens&&choices.every(p=>Object.hasOwn(poisonOptions(actor),p))&&(choices.length===1||twinEligible(actor,target));}
export async function promptToxic(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!toxicItem(actor))return false;
 const options=Object.entries(poisonOptions(actor)).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
 return timedDialog(`Toxic Concoctions — ${actor.name}`,`<p>Spend 1 token to poison <strong>${esc(data.targetName)}</strong>?</p><select name="poison" style="width:100%">${options}</select>${data.twin?`<p>Twin Fang: optional second poison for 1 additional token.</p><select name="secondPoison" style="width:100%"><option value="">No second poison</option>${options}</select>`:''}`,[{action:'use',label:'Spend Token(s)',callback:(_e,_b,dialog)=>[dialog.element.querySelector('[name="poison"]').value,dialog.element.querySelector('[name="secondPoison"]')?.value].filter(Boolean)},{action:'decline',label:'Decline',default:true,callback:()=>false}]);
}
export async function resolveToxic(request,{user},ask=promptToxic){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!toxicItem(actor))return false;
 const pending=(queues.get(actor.uuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const item=toxicItem(actor);if(!item)return false;
  if(request.op==='gain'){
   if(!await markReactiveStress(actor.uuid,a=>Boolean(toxicItem(a))))return false;
   const roll=await new Roll('1d4+1').evaluate();
   await item.update({'system.resource.value':Number(item.system.resource.value??0)+roll.total});
   await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`Toxic Concoctions — gain ${roll.total} tokens`});return true;
  }
  if(request.op!=='poison'||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const message=await fromUuid(request.messageUuid),hit=markHit(message);
  if(!hit||message.system.action.actor.uuid!==actor.uuid||message.flags?.[ID]?.toxic||Number(item.system.resource.value)<1)return false;
  const target=await fromUuid(hit.actorId);if(!target||!['character','adversary'].includes(target.type))return false;
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,targetName:target.name,twin:twinEligible(actor,target)&&Number(item.system.resource.value)>=2};
  const answer=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  const poisons=Array.isArray(answer)?answer:answer?[answer]:[];
  if(!validPoisons(actor,target,poisons,Number(item.system.resource.value))||decisionNow()>request.deadline||!toxicItem(actor)||!markHit(message))return false;
  const fear=Number(message.system.roll?.dFear?.total);if(poisons.includes('fear')&&!Number.isFinite(fear))return false;
  const next=Number(item.system.resource.value)-poisons.length;await item.update({'system.resource.value':next});if(Number(item.system.resource.value)!==next)throw new Error('Could not spend poison token.');
  await message.update({[`flags.${ID}.toxic`]:{poison:poisons[0],poisons,fear:Number.isFinite(fear)?fear:null,itemUuid:item.uuid,targetUuid:target.uuid}});
  for(const poison of poisons){
  await applyVenom(actor,target,poison);
  if(poison==='ghost')await game.system.api.fields.ActionFields.EffectsField.applyEffect(item.effects.get(GHOST),target);
  if(['midnight','gorgon'].includes(poison))await game.system.api.fields.ActionFields.EffectsField.applyEffect(poisonItem(actor).effects.get(poison==='midnight'?'bNPKUrkGNZLkWRoF':'8YpVnj2tXjIZr8PG'),target);
  if(poison==='grave')await target.modifyResource([{key:'stress',value:1}]);
  await ChatMessage.create({flags:poison==='midnight'?{[ID]:{midnightTarget:target.uuid}}:{},speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Toxic Concoctions</strong>: ${esc(target.name)} — ${ {ghost:'Ghost Petal: temporarily Vulnerable',grave:'Grave Spore: mark 1 Stress',leech:'Leech Weed: +1d6 damage',midnight:'Midnight Vine: disadvantage on attacks until marking 1 Stress to clear',gorgon:'Gorgon Root: temporarily Restrained',blight:'Blight Seed: −3 damage thresholds (nonstacking)',fear:`Fear Leaf: +${fear} damage`,corpse:'Corpse Thorn: Reaction disadvantage'}[poison]}.</p>`});}return true;
 });queues.set(actor.uuid,pending);try{return await pending;}finally{if(queues.get(actor.uuid)===pending)queues.delete(actor.uuid);}
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw new Error('Toxic Concoctions needs an active GM.');return gm.isSelf?resolveToxic(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});}
export function selectLeech(roll,config){
 const message=game.messages.get(config.source?.message),poison=message?.flags?.[ID]?.toxic;
 if(config.hasHealing||!poison||toxicItem(message.system.action.actor)?.uuid!==poison.itemUuid)return;
 const poisons=poison.poisons??[poison.poison];roll.options.bonusEffects??={};
 if(poisons.includes('leech'))roll.options.bonusEffects[TOXIC_KEY]={name:'Leech Weed (+1d6)',description:'Toxic Concoctions bonus damage.',selected:true,changes:[]};
 if(poisons.includes('fear')&&Number.isFinite(poison.fear))roll.options.bonusEffects[`${TOXIC_KEY}-fear`]={name:`Fear Leaf (+${poison.fear})`,description:'Damage equal to the attack Fear Die.',selected:true,changes:[],amount:poison.fear};
 config.bonusEffects=roll.options.bonusEffects;
}
export function registerToxic(){
 CONFIG.queries[QUERY]=resolveToxic;CONFIG.queries[PROMPT]=promptToxic;
 Hooks.on('daggerheart.preUseAction',(action)=>{
  if(!toxicItem(action.actor))return;
  if(action.type==='attack')prioritizeFaerieWings(action,true);
  if(action.item?.uuid!==toxicItem(action.actor)?.uuid)return;
  if(action.id===GAIN){void dispatch({op:'gain',actorUuid:action.actor.uuid}).catch(e=>ui.notifications.error(e.message));return false;}
  if(['RStmr0d20BrcSQpu','2cu2lGBt48HOvb3Q'].includes(action.id)){ui.notifications.info('Choose a poison after a successful weapon attack.');return false;}
 });
 const Target=game.system.api.fields.ActionFields.TargetField,execute=Target.execute;
 Target.execute=async function(config,...args){const result=await execute.call(this,config,...args);if(result!==false&&markHit(config.message)&&Number(toxicItem(this.actor)?.system.resource.value)>0)await dispatch({op:'poison',actorUuid:this.actor.uuid,messageUuid:config.message.uuid,deadline:decisionNow()+decisionBudget(120000)});return result;};
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,create=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus;
 Damage.createRollInstance=function(config){const roll=create.call(this,config);selectLeech(roll,config);return roll;};
 Damage.prototype.applyBaseBonus=function(part){const result=bonus.call(this,part);if(part.applyTo==='hitPoints'&&!this.options.hasHealing&&this.options.bonusEffects?.[TOXIC_KEY]?.selected)result.push({label:'Leech Weed',value:'1d6'});const fear=this.options.bonusEffects?.[`${TOXIC_KEY}-fear`];if(part.applyTo==='hitPoints'&&!this.options.hasHealing&&fear?.selected)result.push({label:'Fear Leaf',value:fear.amount});return result;};
}
