import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {ownerFor} from './aura-rules.js';
import {animateInitialDamage} from './combo-strike.js';
import {animateLuckbenderReroll} from './luckbender.js';
import {selectableDamageDice,rerollDamageDice} from './damage-reroll.js';
import {NOT_GOOD_ENOUGH_KEY} from './not-good-enough-data.js';

const QUERY=`${ID}.notGoodEnough`,PROMPT=`${QUERY}Prompt`;
const WRAPPED=Symbol.for(`${ID}.notGoodEnough`),requests=new Map();

export function notGoodEnoughItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items?.find(item=>{
    const flags=item.flags?.[ID],system=item.system;
    return item.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
      (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&
      (flags?.applied?.key??flags?.premade?.key)===NOT_GOOD_ENOUGH_KEY;
  })??null;
}

export function notGoodEnoughDice(roll){return selectableDamageDice(roll).filter(die=>die.value===1||die.value===2);}
export function validNotGoodEnoughSelection(selected,dice){
  return Array.isArray(selected)&&selected.length>0&&new Set(selected).size===selected.length&&
    selected.every(id=>dice.some(die=>die.id===id));
}

export async function promptNotGoodEnough(data,{user}){
  const actor=await fromUuid(data.actorUuid);
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!notGoodEnoughItem(actor))return null;
  return timedDialog(`Not Good Enough — ${actor.name}`,
    `<p>Damage: <strong>${Number(data.total)}</strong>. Reroll any damage dice showing <strong>1 or 2</strong> for free. Keep the new results.</p>`+
    data.dice.map(die=>`<label style="display:inline-block;margin:0.4rem"><input type="checkbox" name="notGoodEnoughDie" value="${die.id}" checked> d${Number(die.faces)}: <strong>${Number(die.value)}</strong>${die.discarded?' <em>(discarded)</em>':''}</label>`).join(''),
    [
      {action:'reroll',label:'Reroll Selected Dice',callback:(_event,_button,dialog)=>[...dialog.element.querySelectorAll('[name="notGoodEnoughDie"]:checked')].map(input=>input.value)},
      {action:'decline',label:'Keep Damage',default:true,callback:()=>null}
    ]);
}

export async function resolveNotGoodEnough(request,{user},ask=promptNotGoodEnough){
  if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||request.id.length>64||
    !Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||
    !Array.isArray(request.dice)||!request.dice.length||request.dice.some(die=>
      !/^\d+:\d+$/.test(die.id)||!Number.isInteger(die.faces)||die.faces<2||!(die.value===1||die.value===2)))return false;
  for(const[key,expires]of requests)if(expires<decisionNow())requests.delete(key);
  const key=`${user.id}:${request.id}`;
  if(requests.has(key))return false;
  const actor=await fromUuid(request.actorUuid),item=notGoodEnoughItem(actor);
  if(!item||item.uuid!==request.itemUuid||!actor.testUserPermission(user,'OWNER'))return false;
  // Reserve before opening the remote prompt: duplicate delivery cannot reroll twice.
  requests.set(key,decisionNow()+decisionBudget(300000));
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,total:request.total,dice:request.dice};
  const selected=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!user.active||request.deadline<=decisionNow()||notGoodEnoughItem(actor)?.uuid!==item.uuid||
    !validNotGoodEnoughSelection(selected,request.dice))return false;
  return selected;
}

function refreshTotals(roll){
  // Multiplied damage can contain a nested Roll whose cached total must change first.
  for(const term of roll.terms??[])if(Array.isArray(term.roll?.terms))refreshTotals(term.roll);
  roll._total=roll._evaluateTotal();
  roll.resetFormula?.();
}

export async function rerollNotGoodEnough(roll,selected){
  if(roll.options?.[ID]?.notGoodEnough||!validNotGoodEnoughSelection(selected,notGoodEnoughDice(roll)))return false;
  const before=Number(roll.total),fresh=await rerollDamageDice(roll,selected);
  refreshTotals(roll);
  roll.options[ID]={...roll.options[ID],notGoodEnough:{count:selected.length,before,after:Number(roll.total)}};
  return fresh;
}

export async function offerNotGoodEnough(config,dependencies={}){
  const roll=config.damage?.main;
  if(config.hasHealing||!roll||roll.options?.[ID]?.notGoodEnough||roll.options?.[ID]?.notGoodEnoughOffered)return false;
  const message=game.messages.get(config.source?.message);
  const actor=message?.system?.action?.actor??config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null);
  const item=notGoodEnoughItem(actor),dice=notGoodEnoughDice(roll);
  if(!item||!dice.length)return false;
  roll.options[ID]={...roll.options[ID],notGoodEnoughOffered:true};
  const audience=message??getDocumentClass('ChatMessage').applyMode({},config.selectedMessageMode??config.rollMode??game.settings.get('core','messageMode'));
  await(dependencies.initial??animateInitialDamage)(config,audience);
  const decide=dependencies.decide??(request=>{
    const gm=game.users.activeGM;
    if(!gm)throw Error('Not Good Enough needs an active GM.');
    return gm.isSelf?resolveNotGoodEnough(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  });
  const selected=await decide({id:foundry.utils.randomID(),actorUuid:actor.uuid,itemUuid:item.uuid,dice,total:Number(roll.total),deadline:decisionNow()+decisionBudget(120000)});
  if(notGoodEnoughItem(actor)?.uuid!==item.uuid||!validNotGoodEnoughSelection(selected,notGoodEnoughDice(roll)))return false;
  const fresh=await rerollNotGoodEnough(roll,selected);
  if(!fresh)return false;
  await(dependencies.animate??animateLuckbenderReroll)(roll,config,audience);
  if(game.dice3d)for(const result of fresh)result.hidden=true;
  // ChatDamageData caches its source independently from the prepared Roll.
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({
    ...config.damage.toObject(),main:roll.toJSON(),
    resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))
  });
  return true;
}

export function installNotGoodEnough(Damage,offer=offerNotGoodEnough){
  if(Damage[WRAPPED])return;
  const native=Damage.buildEvaluate;
  Damage.buildEvaluate=async function(roll,config,...args){
    const result=await native.call(this,roll,config,...args);
    if(!config.hasHealing&&config.damage?.main)await offer(config);
    return result;
  };
  Object.defineProperty(Damage,WRAPPED,{value:true});
}

export function registerNotGoodEnough(){
  CONFIG.queries[QUERY]=resolveNotGoodEnough;
  CONFIG.queries[PROMPT]=promptNotGoodEnough;
  installNotGoodEnough(CONFIG.Dice.daggerheart.DamageRoll);
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const used=message.system?.damage?.main?.options?.[ID]?.notGoodEnough;
    if(!message.isContentVisible||!used||html.querySelector('.dhp-not-good-enough'))return;
    const note=html.ownerDocument.createElement('p');
    note.className='dhp-not-good-enough';
    note.textContent=`Not Good Enough: rerolled ${used.count} damage ${used.count===1?'die':'dice'} (${used.before} → ${used.after}).`;
    html.querySelector('.message-content')?.append(note);
  });
}
