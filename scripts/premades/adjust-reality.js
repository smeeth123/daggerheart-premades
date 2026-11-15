import {ID,featureActive} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {timedDialog} from '../dialog.js';
import {helpRecipients,validHelpRecipient} from '../help-ally.js';
import {snapshotRollResult} from '../workflow-compat.js';
import {consumeResolutionTicket,registerResolutionProvider,resolutionRequest,resolutionTicketStatus} from '../resolution-manager.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {installPendingRollCard,showPendingRollCard} from './luckbender.js';
import {animateInitialDamage} from './combo-strike.js';
import {withHopeLock} from './hope-lock.js';
import {hopeCapacity,chooseHopePayment,spendHope} from './hope-payment.js';
import {ADJUST_REALITY_KEY} from './adjust-reality-data.js';

const QUERY=ID+'.adjustReality',PICK=QUERY+'Pick',CONSENT=QUERY+'Consent';
const COST=5;
function available(item){
 const actor=item?.actor,system=item?.system,flags=item?.flags?.[ID];
 return item?.type==='domainCard'&&actor?.type==='character'&&!unavailableActor(actor)&&featureActive(item)&&
  !flags?.disabled&&(!system.inVault||system.vaultActive)&&!system.isDomainTouchedSuppressed&&
  (flags?.applied?.key??flags?.premade?.key)===ADJUST_REALITY_KEY&&hopeCapacity(actor)>=COST;
}

// Each supported term contributes a continuous integer interval. More complex
// formulas can have gaps between their extrema, so they use the manual action.
function termRange(term){
 if(Array.isArray(term.results)&&Number.isInteger(term.faces)){
  // Native Hope, Fear, Advantage and Disadvantage markers do not change die bounds.
  if((term.modifiers??[]).some(modifier=>!/^(?:[hfad]|(?:k[hl]?|d[hl]?)\d*)$/.test(modifier)))return null;
  const active=term.results.filter(result=>result.active!==false&&!result.discarded);
  const low=term.minResult??1,high=term.maxResult??term.faces;
  if(!active.length||!Number.isSafeInteger(low)||!Number.isSafeInteger(high)||low>=high||
   active.some(result=>!Number.isInteger(result.result)||result.result<low||result.result>high))return null;
  return {min:active.length*low,max:active.length*high,current:term.total};
 }
 if(term.roll?.terms)return diceRange(term.roll);
 if(Number.isSafeInteger(term.number)&&Number.isSafeInteger(term.total))return {min:term.total,max:term.total,current:term.total};
 return null;
}
function diceRange(roll){
 if(!roll.terms?.length)return null;
 let min=0,max=0,current=0,sign=1;
 for(const [index,term] of roll.terms.entries()){
  if(index%2){
   if(term.operator!=='+'&&term.operator!=='-')return null;
   sign=term.operator==='+'?1:-1;
   continue;
  }
  const range=termRange(term);
  if(!range||!Number.isSafeInteger(range.current))return null;
  min+=sign===1?range.min:-range.max;
  max+=sign===1?range.max:-range.min;
  current+=sign*range.current;
 }
 if(roll.terms.length%2===0)return null;
 return {min,max,current};
}
export function adjustRealityRange(roll){
 if(!Number.isSafeInteger(roll?.total)||roll.options?.[ID]?.adjustReality)return null;
 const range=diceRange(roll);
 if(!range||range.min===range.max)return null;
 const offset=roll.total-range.current;
 return {min:range.min+offset,max:range.max+offset,total:roll.total};
}
function validRange(range){
 return [range?.min,range?.max,range?.total].every(Number.isSafeInteger)&&
  range.min<range.max&&range.total>=range.min&&range.total<=range.max;
}
const validChoice=(range,value)=>Number.isSafeInteger(value)&&value>=range.min&&value<=range.max&&value!==range.total;

export function applyAdjustedTotal(roll,value,decision){
 const range=adjustRealityRange(roll);
 if(!validRange(range)||!validChoice(range,value)||!Number.isSafeInteger(roll._total))return false;
 const delta=value-roll.total;
 const {OperatorTerm,NumericTerm}=foundry.dice.terms;
 const term=new NumericTerm({number:Math.abs(delta),options:{flavor:'Adjust Reality'},evaluated:true});
 roll.terms.push(new OperatorTerm({operator:delta>0?'+':'-',evaluated:true}),term);
 roll._total+=delta;
 roll.resetFormula();
 roll.options[ID]={...roll.options[ID],adjustReality:{before:range.total,after:value,bearerName:decision.bearerName}};
 return true;
}

async function validate(request,user){
 if(!user?.active||!validRange(request?.range))return null;
 const source=await fromUuid(request.sourceUuid),item=await fromUuid(request.candidate?.itemUuid),bearer=item?.actor;
 if(source?.type!=='character'||!source.testUserPermission(user,'OWNER')||!available(item))return null;
 if(source.uuid!==bearer.uuid&&(!request.publicRoll||!validHelpRecipient(source,bearer)||!validHelpRecipient(bearer,source)))return null;
 return {source,item,bearer};
}
function promptValue({range},{user}){
 if(!user?.isGM||!validRange(range))return null;
 return timedDialog('Adjust Reality',
  `<p>Rolled <strong>${range.total}</strong>. Choose a new total from ${range.min} to ${range.max} for 5 Hope.</p>
  <label>New total <input name="adjustedTotal" type="number" step="1" min="${range.min}" max="${range.max}" required></label>`,[
  {action:'change',label:'Propose Total',callback:(_e,button)=>button.form.elements.adjustedTotal.valueAsNumber},
  {action:'decline',label:'Keep Roll',default:true,callback:()=>null}
 ]);
}
function promptConsent({before,after},{user}){
 if(!user?.isGM||![before,after].every(Number.isSafeInteger))return false;
 return timedDialog('Adjust Reality',`<p>Allow your ally to change your roll from <strong>${before}</strong> to <strong>${after}</strong>?</p>`,[
  {action:'accept',label:'Allow Change',callback:()=>true},
  {action:'decline',label:'Keep Roll',default:true,callback:()=>false}
 ]);
}
export async function resolveAdjustReality(request,{user}){
 if(!game.user.isActiveGM)return false;
 const valid=await validate(request,user);
 if(!valid||!consumeResolutionTicket(request.resolutionToken,'adjust-reality',valid.item.uuid,user))return false;
 const holder=ownerFor(valid.bearer,[...game.users],game.user),recipient=ownerFor(valid.source,[...game.users],game.user);
 await resolutionTicketStatus(request.resolutionToken,'Awaiting consent');
 const call=(owner,key,data,ask)=>owner.isSelf?ask(data,{user:game.user}):owner.query(key,data,{timeout:decisionBudget(65000)});
 const total=await call(holder,PICK,{range:request.range},promptValue);
 if(!validChoice(request.range,total)||!holder.active)return false;
 if(valid.source.uuid!==valid.bearer.uuid&&
  !await call(recipient,CONSENT,{before:request.range.total,after:total},promptConsent))return false;
 if(!recipient.active||!holder.active||!valid.bearer.testUserPermission(holder,'OWNER')||
  !valid.source.testUserPermission(recipient,'OWNER')||!await validate(request,user))return false;
 const armor=await chooseHopePayment(valid.bearer,COST,'Adjust Reality');
 if(armor===null)return false;
 await resolutionTicketStatus(request.resolutionToken,'Resolving');
 return withHopeLock(valid.bearer.uuid,async()=>{
  const current=await validate(request,user);
  if(!game.user.isActiveGM||!current||!holder.active||!recipient.active||
   !current.bearer.testUserPermission(holder,'OWNER')||!current.source.testUserPermission(recipient,'OWNER'))return false;
  await spendHope(current.bearer,COST,{choice:armor,label:'Adjust Reality'});
  return {total,bearerName:current.bearer.name};
 });
}

async function offerAdjustment(roll,config,actor,kind,beforeOffer){
 const range=adjustRealityRange(roll),gm=globalThis.game?.users?.activeGM;
 if(!gm||actor?.type!=='character'||!validRange(range)||!Number.isSafeInteger(roll._total))return false;
 const message=game.messages?.get(config.source?.message);
 const mode=config.selectedMessageMode??config.rollMode??game.settings.get('core','messageMode');
 if(message?.blind||['blind','blindroll'].includes(mode))return false;
 const publicRoll=['public','publicroll'].includes(mode)&&!message?.whisper?.length;
 const holders=publicRoll?[actor,...helpRecipients(actor)]:[actor];
 const rows=holders.flatMap(holder=>[...(holder.items??[])].filter(available).map(item=>({
  id:`adjust-reality:${item.uuid}`,kind:'adjust-reality',
  request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},range,publicRoll}
 })));
 if(!rows.length)return false;
 const preview=await beforeOffer?.();
 const id=foundry.utils.randomID();
 let used=false;
 try{
  const choice=await resolutionRequest({op:'round',id,actorUuid:actor.uuid,messageUuid:preview?.uuid,roll:{total:range.total,numeric:kind},rows});
  if(!choice)return false;
  const request={...choice.request,resolutionToken:choice.token};
  const decision=gm.isSelf?await resolveAdjustReality(request,{user:game.user}):
   await gm.query(QUERY,request,{timeout:decisionBudget(185000)});
  if(decision)used=applyAdjustedTotal(roll,decision.total,decision);
  return used;
 }finally{await resolutionRequest({op:'close',id,used});}
}

export function registerAdjustReality(){
 CONFIG.queries[QUERY]=resolveAdjustReality;
 CONFIG.queries[PICK]=promptValue;
 CONFIG.queries[CONSENT]=promptConsent;
 registerResolutionProvider('adjust-reality',async(request,user)=>{
  const valid=await validate(request,user);
  if(!valid)return null;
  return {owner:ownerFor(valid.bearer,[...game.users],game.user),name:'Adjust Reality',bearerName:valid.bearer.name,
   cost:'5 Hope',description:valid.item.system.description,useLabel:'Change Total'};
 });
 const {DHRoll,DamageRoll}=CONFIG.Dice.daggerheart;
 installPendingRollCard(DHRoll);
 const evaluate=DHRoll.buildEvaluate;
 DHRoll.buildEvaluate=async function(roll,config,...args){
  const result=await evaluate.call(this,roll,config,...args);
  if(config.evaluate!==false&&!config.skips?.createMessage&&!config.source?.message&&
    await offerAdjustment(roll,config,config.actor??roll.data?.parent,'roll',()=>showPendingRollCard(this,roll,config))){
   snapshotRollResult(roll,config);
   const choice=roll.options[ID].adjustReality;
   config.roll.breakdown=[...(config.roll.breakdown??[]),{label:'Adjust Reality',value:choice.after-choice.before}];
  }
  return result;
 };
 const damage=DamageRoll.buildEvaluate;
 DamageRoll.buildEvaluate=async function(roll,config,...args){
  const result=await damage.call(this,roll,config,...args);
  const packet=config.damage;
  if(!packet||config.evaluate===false||config.skips?.createMessage)return result;
  const message=game.messages?.get(config.source?.message);
  const actor=message?.system?.action?.actor??config.actor??config.data?.parent;
  if(actor?.type!=='character')return result;
  let changed=false,shown=false;
  const show=async()=>{
   if(shown)return;
   shown=true;
   const audience=message??getDocumentClass('ChatMessage').applyMode({},config.selectedMessageMode??config.rollMode??game.settings.get('core','messageMode'));
   await animateInitialDamage(config,audience);
  };
  const rolls=[packet.main,...Object.values(packet.resources??{})].filter(Boolean);
  for(const component of rolls){
   const kind=config.hasHealing?'healing':component===packet.main?'damage':'resource';
   if(await offerAdjustment(component,config,actor,kind,show)){
    const choice=component.options[ID].adjustReality;
    component.options.breakdown=[...(component.options.breakdown??[]),{label:'Adjust Reality',value:choice.after-choice.before}];
    changed=true;
   }
  }
  if(changed&&typeof packet.toObject==='function')config.damage=new packet.constructor({...packet.toObject(),main:packet.main?.toJSON()??null,
   resources:Object.fromEntries(Object.entries(packet.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
  return result;
 };
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!message.isContentVisible||html.querySelector('.dhp-adjust-reality'))return;
  const damage=message.system?.damage;
  const rolls=[...(message.rolls??[]),damage?.main,...Object.values(damage?.resources??{})];
  const changes=rolls.flatMap(roll=>roll?.options?.[ID]?.adjustReality??[]);
  if(!changes.length)return;
  const note=html.ownerDocument.createElement('p');
  note.className='dhp-adjust-reality';
  note.textContent=changes.map(change=>`Adjust Reality: ${change.before} → ${change.after}.`).join(' ');
  html.querySelector('.message-content')?.append(note);
 });
}
