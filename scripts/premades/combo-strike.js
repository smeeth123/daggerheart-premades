import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { flowActive,flowPayments,spendFlowFocus } from './flow-state.js';
import { isWeaponAttack } from './weapon-attack.js';
import { ID } from '../core.js';
import { COMBO_KEY,COMBO_ACTION } from './combo-strike-data.js';
import { markReactiveStress } from './stress-payment.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
const QUERY=`${ID}.comboStrike`,PROMPT=`${ID}.comboPrompt`,WRAPPED=Symbol.for(`${ID}.comboStrike`),decisions=new Map();
export function comboItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];return !flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===COMBO_KEY;})??null;
}
export function comboHit(message){
  const data=message?.system,action=data?.action;
  if(action?.type!=='attack'||action.range!=='melee'||!Number.isFinite(data.roll?.total))return false;
  if(!isWeaponAttack(data))return false;
  return (data.targets??[]).filter(target=>{const threshold=target.difficulty||target.evasion;return threshold!=null&&(data.roll.isCritical||data.roll.total>=threshold);}).length===1;
}
export const comboPayments=actor=>[Number(actor?.system.resources?.stress?.value)<Number(actor?.system.resources?.stress?.max)?'stress':null,flowActive(actor)&&flowPayments(actor).includes('focus')?'focus':null].filter(Boolean);
const canPay=actor=>comboPayments(actor).length>0;
export async function promptCombo(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!comboItem(actor)||!canPay(actor))return false;
  return await timedDialog(`Combo Strike — ${actor.name}`,`<p>Your damage roll is <strong>${Number(data.damage)}</strong>.</p><p>Choose a payment to roll your Combo Die and add the combo total to this attack.</p>`,[
    ...comboPayments(actor).map(payment=>({action:payment,label:payment==='focus'?'Spend 1 Focus':'Mark 1 Stress',callback:()=>payment})),{action:'decline',label:'Decline',default:true,callback:()=>false}
  ]);
}
export async function resolveCombo(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!Number.isFinite(request.deadline)||request.deadline<decisionNow()||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const message=await fromUuid(request.messageUuid),actor=message?.system?.action?.actor;
  if(!actor?.testUserPermission(user,'OWNER')||!comboItem(actor)||!comboHit(message))return false;
  const key=message.uuid;if(decisions.has(key))return false;
  const operation=(async()=>{
    if(!canPay(actor))return false;
    const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,damage:request.damage};
    const accepted=owner.isSelf?await promptCombo(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
    if(!accepted||!comboHit(message)||request.deadline<decisionNow())return false;
    if(accepted==='focus')return spendFlowFocus(actor.uuid,current=>Boolean(comboItem(current)));
    if(accepted!=='stress'&&accepted!==true)return false;
    return markReactiveStress(actor.uuid,current=>Boolean(comboItem(current)));
  })();decisions.set(key,operation);
  try{return await operation;}finally{if(decisions.get(key)===operation)decisions.delete(key);}
}
export async function addComboDamage(damage,faces){
  if(![4,6,8,10,12,20].includes(Number(faces)))throw new Error('Unsupported Combo Die size.');
  const combo=await new Roll(`2d${Number(faces)}c`).evaluate();
  if(!Number.isFinite(combo.total))throw new Error('Combo Strike did not produce a valid result.');
  // Add the completed sequence after criticals and all other damage modifiers.
  damage.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),...combo.terms);
  damage._total=damage._evaluateTotal();damage.resetFormula();
  damage.options[ID]={...damage.options[ID],comboStrike:{total:combo.total,faces:Number(faces)}};
  return combo.total;
}
export async function animateInitialDamage(config,message){
  if(!game.dice3d)return;
  const rolls=[config.damage.main,...Object.values(config.damage.resources??{})].filter(Boolean);
  const pool=foundry.dice.terms.PoolTerm.fromRolls(rolls);
  await game.dice3d.showForRoll(Roll.fromTerms([pool]),game.user,true,
    message.whisper?.length?message.whisper:null,message.blind);
  // Native damage posting still runs; DSN ignores results already displayed here.
  for(const roll of rolls)for(const die of roll.dice)for(const result of die.results)result.hidden=true;
}
export function installComboStrike(DamageRoll,offer){
  if(DamageRoll[WRAPPED])return;
  const native=DamageRoll.buildEvaluate;
  DamageRoll.buildEvaluate=async function(roll,config,...args){
    const result=await native.call(this,roll,config,...args);
    if(!config.hasHealing&&config.damage?.main&&!config.damage.main.options?.[ID]?.comboStrike)await offer(config);
    return result;
  };
  Object.defineProperty(DamageRoll,WRAPPED,{value:true});
}
export function registerComboStrike(){
  CONFIG.queries[QUERY]=resolveCombo;CONFIG.queries[PROMPT]=promptCombo;
  installComboStrike(CONFIG.Dice.daggerheart.DamageRoll,async config=>{
    const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor;
    if(!comboItem(actor)||!canPay(actor)||!comboHit(message))return;
    const gm=game.users.activeGM;if(!gm)throw new Error('Combo Strike needs an active GM.');
    await animateInitialDamage(config,message);
    const request={messageUuid:message.uuid,damage:config.damage.main.total,deadline:decisionNow()+decisionBudget(120000)};
    const accepted=gm.isSelf?await resolveCombo(request,{user:game.user}):await gm.query(QUERY,request,{timeout:decisionBudget(125000)});
    if(accepted)await addComboDamage(config.damage.main,actor.system.rules.roll.comboDieFaces??4);
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];if(flags?.disabled||action.id!==COMBO_ACTION||(flags?.applied?.key??flags?.premade?.key)!==COMBO_KEY)return;
    ui.notifications.info('Combo Strike is offered after damage on a successful Melee weapon attack.');return false;
  });
}
