import { decisionBudget } from '../settings.js';
import { notifyPending } from '../resolution-manager.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { ID } from '../core.js';
import {resolvedAttackTargets,attackHitTargets} from '../attack-outcome.js';
import { PRAYER_KEY,PRAYER_HOPE_ACTION } from './prayer-dice-data.js';
import { ownerFor } from './aura-rules.js';
import { sourceToken } from './hallowed-aura.js';
import { timedDialog } from '../dialog.js';
const QUERY=`${ID}.spendPrayer`,REFRESH=`${ID}.refreshPrayer`,WRAPPED=Symbol.for(`${ID}.prayerDice`),locks=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function prayerItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===PRAYER_KEY;})??null;}
export function prayerDice(item){return Object.entries(item?.system.resource?.diceStates??{}).filter(([,d])=>!d.used&&Number.isInteger(d.value)&&d.value>0);}
function actors(){const all=new Map([...game.actors].map(a=>[a.uuid,a]));for(const t of canvas.tokens?.placeables??[])if(t.actor)all.set(t.actor.uuid,t.actor);return [...all.values()];}
export function prayerRange(bearer,recipient){
  if(!recipient)return false;if(bearer.uuid===recipient.uuid)return true;
  if(!canvas.ready)return false;const a=sourceToken(bearer),b=sourceToken(recipient);
  if(!a||!b||!a.document.disposition||a.document.disposition!==b.document.disposition)return false;
  const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
  const limit=Number(rules.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.far:rules.far),distance=a.distanceTo(b);
  return Number.isFinite(distance)&&Number.isFinite(limit)&&distance<=limit;
}
const applied=(message,target)=>message.flags?.daggerheart?.resourcesUpdates?.some(entry=>entry.token?.id===target.id&&!entry.token.reverted);
export function prayerHasDice(message){
  const damage=message.system?.damage;
  return [message.system?.roll,...(message.rolls??[]),damage?.main,...Object.values(damage?.resources??{})]
    .some(roll=>roll?.dice?.some(die=>die.results?.some(result=>result.active!==false)));
}
export function prayerOptions(message,bearer){
  if(!prayerHasDice(message))return [];
  if(message.flags?.[ID]?.defensePending||(message.type==='dualityRoll'&&!message.system?.roll?.options?.[ID]?.resolutionComplete))return [];
  const options=[],data=message.system,roller=data?.action?.actor??data?.actionActor??(data?.source?.actor?foundry.utils.fromUuidSync(data.source.actor):null)??game.actors.get?.(message.speaker?.actor);
  if(roller&&prayerRange(bearer,roller)){
    if(Number.isFinite((data?.roll??(!data?.damage?.main?message.rolls?.[0]:null))?.total))options.push({mode:'roll',actorUuid:roller.uuid,label:`Add to ${roller.name}’s roll`});
    if(!data.hasHealing&&Number(data.damage?.main?.total)>0)options.push({mode:'damageBonus',actorUuid:roller.uuid,label:`Add to ${roller.name}’s damage`});
  }
  if(!data?.hasHealing&&Number(data?.damage?.main?.total)>0)for(const target of (data.roll?attackHitTargets(message):resolvedAttackTargets(message))){
    const recipient=foundry.utils.fromUuidSync(target.actorId);
    if(recipient&&prayerRange(bearer,recipient)&&!applied(message,target))options.push({mode:'damage',actorUuid:recipient.uuid,targetId:target.id,label:`Reduce damage to ${recipient.name}`});
  }
  return options;
}
export async function refreshPrayer(request,{user}){
  const item=await fromUuid(request.itemUuid),actor=item?.actor;
  if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||prayerItem(actor)?.uuid!==item.uuid)return false;
  const Dialog=game.system.api.applications.dialogs.ResourceDiceDialog,app=new Dialog(item,actor);
  let timer,interval;
  const deadline=decisionNow()+decisionBudget(60000);
  const done=await notifyPending(`Prayer Dice — ${actor.name}`,deadline);
  const values=await new Promise(resolve=>{
    app.addEventListener('close',()=>{clearDecisionTimeout(timer);clearInterval(interval);resolve(app.rollValues);},{once:true});
    app.render({force:true});
    timer=decisionTimeout(()=>{void app.close();},decisionBudget(60000));
    interval=setInterval(()=>{if(app.window?.title)app.window.title.textContent=`Prayer Dice ${decisionCountdown(deadline)}`;},250);
  }).finally(done);
  if(!values)return false;
  await item.update({'system.resource.diceStates':Object.fromEntries(values.map((d,i)=>[i,{value:d.value,used:Boolean(d.used)}]))});return true;
}
export async function promptSessionPrayer(){
  if(!game.user.isGM)return;
  const jobs=[];
  for(const actor of game.actors){
    const item=prayerItem(actor);if(!item||!actor.prototypeToken.actorLink)continue;
    // A new session invalidates every die from the previous session.
    const clear=Object.fromEntries(Object.keys(item.system.resource.diceStates??{}).map(key=>[`system.resource.diceStates.-=${key}`,null]));
    if(Object.keys(clear).length)await item.update(clear);
    const owner=ownerFor(actor,[...game.users],game.user),request={itemUuid:item.uuid};
    jobs.push(owner.isSelf?refreshPrayer(request,{user:game.user}):owner.query(REFRESH,request,{timeout:decisionBudget(65000)}));
  }
  const results=await Promise.allSettled(jobs);
  for(const result of results)if(result.status==='rejected'){console.error(`${ID} | Prayer Dice refresh`,result.reason);ui.notifications.error('A Prayer Dice resource window could not be opened.');}
}
const refreshRuns=new WeakMap();
export function installPrayerRefresh(actions,refresh=promptSessionPrayer){
  const native=actions?.refreshActors;if(!native||native[WRAPPED])return;
  const wrapped=async function(...args){
    const running=refreshRuns.get(this);
    // Other modules can wrap our handler during render. Only the outermost
    // Prayer wrapper owns the refresh prompt, even across those wrappers.
    if(running)return running.entering?native.apply(this,args):running.promise;
    const session=game.user.isGM&&this.refreshSelections?.session?.selected;
    const state={entering:false,promise:null};refreshRuns.set(this,state);
    state.promise=Promise.resolve().then(async()=>{
      let result;
      state.entering=true;
      try{result=native.apply(this,args);}finally{state.entering=false;}
      result=await result;
      if(session)await refresh();return result;
    });
    try{return await state.promise;}finally{if(refreshRuns.get(this)===state)refreshRuns.delete(this);}
  };Object.defineProperty(wrapped,WRAPPED,{value:true});actions.refreshActors=wrapped;
}
async function addRollBonus(message,total){
  const roll=message.system.roll??message.rolls[0];
  const bonus=await new Roll(String(total)).evaluate();
  roll.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),...bonus.terms);
  roll._total=roll._evaluateTotal();roll.resetFormula();
  await message.update({rolls:message.rolls.map(r=>r===roll?roll.toJSON():r.toJSON())});
}
export async function spendPrayer(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const item=await fromUuid(request.itemUuid),bearer=item?.actor;
  if(!bearer?.testUserPermission(user,'OWNER')||prayerItem(bearer)?.uuid!==item.uuid)return false;
  const key='spend',prior=locks.get(key)??Promise.resolve();
  const operation=prior.catch(()=>{}).then(async()=>{
    const message=await fromUuid(request.messageUuid);
    if(!message||(!user.isGM&&(message.blind||(message.whisper?.length&&!message.whisper.includes(user.id)))))return false;
    const option=prayerOptions(message,bearer).find(o=>o.mode===request.mode&&o.actorUuid===request.actorUuid&&o.targetId===request.targetId);
    if(!option||!Array.isArray(request.dice)||!request.dice.length||new Set(request.dice).size!==request.dice.length)return false;
    const available=new Map(prayerDice(item));if(!request.dice.every(key=>available.has(key)))return false;
    const total=request.dice.reduce((n,key)=>n+available.get(key).value,0);
    const updates=Object.fromEntries(request.dice.map(key=>[`system.resource.diceStates.${key}.used`,true]));
    const paid=await item.update(updates);if(!paid)throw new Error('Could not spend Prayer Dice.');
    // Commit on the GM so players never need ownership of another actor or card.
    if(option.mode==='roll')await addRollBonus(message,total);
    else if(option.mode==='damageBonus'){
      const main=message.system.damage.main,bonus=await new Roll(String(total)).evaluate();
      main.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),...bonus.terms);main._total=main._evaluateTotal();main.resetFormula();
      await message.update({'system.damage.main':main.toJSON()});
    }
    else{
      const main=message.system.damage.main;
      const reductions={...main.options[ID]?.prayerReductions};reductions[option.actorUuid]=Number(reductions[option.actorUuid]??0)+total;
      const hits=message.system.roll?attackHitTargets(message):resolvedAttackTargets(message);
      if(hits.length===1){
        await reducePrayerCardDamage(main,reductions[option.actorUuid]);
        delete reductions[option.actorUuid];
      }
      main.options[ID]={...main.options[ID],prayerReductions:reductions};
      await message.update({'system.damage.main':main.toJSON()});
    }
    const notes=[...(message.flags?.[ID]?.prayerNotes??[]),`${bearer.name}: ${request.dice.map(key=>available.get(key).value).join(' + ')} Prayer Dice — ${option.label}.`];
    await message.update({[`flags.${ID}.prayerNotes`]:notes});return true;
  });locks.set(key,operation);try{return await operation;}finally{if(locks.get(key)===operation)locks.delete(key);}
}
export async function reducePrayerCardDamage(main,amount){
  const reduction=Math.min(Number(main.total),amount);
  const delta=await new Roll(String(-reduction)).evaluate();
  main.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),...delta.terms);
  main._total=main._evaluateTotal();main.resetFormula();
}
export function installPrayerDamage(Actor){
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(args,...rest){
    const reduction=Number(args?.main?.options?.[ID]?.prayerReductions?.[this.uuid]??0);
    if(reduction>0){
      // ChatDamageData.clone() rebuilds from its stored source, discarding
      // per-target adjustments already made by native damage application.
      // Pass current values directly to the native damage parser instead.
      args={main:{total:Math.max(0,Number(args.main.total)-reduction),options:{...args.main.options}},resources:args.resources};
    }
    return native.call(this,args,...rest);
  };
}
async function choosePrayer(message,bearer){
  const item=prayerItem(bearer),dice=prayerDice(item),options=prayerOptions(message,bearer);if(!dice.length||!options.length)return;
  const content=`<p>Choose Prayer Dice to spend.</p>${dice.map(([key,d])=>`<label style="display:inline-block;margin:0.4rem"><input type="checkbox" name="prayerDie" value="${esc(key)}"> ${d.value}</label>`).join('')}<select name="prayerUse" style="width:100%">${options.map((o,i)=>`<option value="${i}">${esc(o.label)}</option>`).join('')}</select>`;
  const choice=await timedDialog(`Prayer Dice — ${bearer.name}`,content,[{action:'use',label:'Spend Dice',callback:(_event,button,dialog)=>({dice:[...dialog.element.querySelectorAll('[name="prayerDie"]:checked')].map(e=>e.value),option:Number(dialog.element.querySelector('[name="prayerUse"]').value)})},{action:'cancel',label:'Cancel',default:true,callback:()=>null}]);
  if(!choice?.dice?.length)return;const gm=game.users.activeGM;if(!gm)throw new Error('Prayer Dice need an active GM.');
  const request={itemUuid:item.uuid,messageUuid:message.uuid,...options[choice.option],dice:choice.dice};
  const result=gm.isSelf?await spendPrayer(request,{user:game.user}):await gm.query(QUERY,request,{timeout:20000});
  if(!result)ui.notifications.warn('Those Prayer Dice or that use are no longer available.');
}
export function registerPrayerDice(){
  registerPrayerHope();
  CONFIG.queries[QUERY]=spendPrayer;CONFIG.queries[REFRESH]=refreshPrayer;
  installPrayerRefresh(CONFIG.ui.daggerheartMenu?.DEFAULT_OPTIONS?.actions);installPrayerRefresh(ui.daggerheartMenu?.options?.actions);
  Hooks.on('renderDaggerheartMenu',app=>installPrayerRefresh(app.options.actions));
  installPrayerDamage(CONFIG.Actor.documentClass);
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message.isContentVisible)return;
    for(const [actorUuid,reduction]of Object.entries(message.system?.damage?.main?.options?.[ID]?.prayerReductions??{})){
      const actor=foundry.utils.fromUuidSync(actorUuid),note=html.ownerDocument.createElement('p');
      note.textContent=`Damage to ${actor?.name??'target'}: ${Math.max(0,message.system.damage.main.total-reduction)} (${reduction} reduced by Prayer Dice).`;
      html.querySelector('.message-content')?.append(note);
    }
    for(const text of message.flags?.[ID]?.prayerNotes??[]){const note=html.ownerDocument.createElement('p');note.textContent=text;html.querySelector('.message-content')?.append(note);}
    for(const bearer of actors()){
      const item=prayerItem(bearer);if(!item||!bearer.testUserPermission(game.user,'OWNER')||!prayerDice(item).length||!prayerOptions(message,bearer).length)continue;
      const button=html.ownerDocument.createElement('button');button.type='button';button.style.width='100%';button.style.display='block';button.textContent=`Prayer Dice — ${bearer.name}`;
      button.addEventListener('click',()=>{void choosePrayer(message,bearer).catch(error=>ui.notifications.error(error.message));});html.querySelector('.message-content')?.append(button);
    }
  });
}

const HOPE_QUERY=`${ID}.prayerHope`;
export async function givePrayerHope(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const item=await fromUuid(request.itemUuid),actor=item?.actor;
  if(!actor?.testUserPermission(user,'OWNER')||prayerItem(actor)?.uuid!==item.uuid)return false;
  const prior=locks.get('spend')??Promise.resolve();
  const operation=prior.catch(()=>{}).then(async()=>{
    const target=await fromUuid(request.targetUuid),dice=new Map(prayerDice(item));
    if(!target||!prayerRange(actor,target)||!Array.isArray(request.dice)||!request.dice.length||new Set(request.dice).size!==request.dice.length||!request.dice.every(key=>dice.has(key)))return false;
    if(!(Number(target.system.resources?.hope?.value)<Number(target.system.resources?.hope?.max)))return false;
    const action=item.system.actions.get?.(PRAYER_HOPE_ACTION)??item.system.actions[PRAYER_HOPE_ACTION];if(!action)return false;
    const total=request.dice.reduce((n,key)=>n+dice.get(key).value,0);
    const updated=await item.update(Object.fromEntries(request.dice.map(key=>[`system.resource.diceStates.${key}.used`,true])));
    if(!updated)throw new Error('Could not spend Prayer Dice.');
    await action.use({shiftKey:false,altKey:false,ctrlKey:false,metaKey:false},{targetUuid:target.uuid,dialog:{configure:false},[ID]:{prayerHope:{total}}});
    return true;
  });locks.set('spend',operation);try{return await operation;}finally{if(locks.get('spend')===operation)locks.delete('spend');}
}
async function choosePrayerHope(action,config){
  const targets=config.targets??[];
  if(targets.length>1)throw new Error('Target yourself or one ally for Give Hope.');
  const target=targets.length?await fromUuid(targets[0].actorId):action.actor;
  if(!prayerRange(action.actor,target))throw new Error('Give Hope requires yourself or an ally within Far range.');
  const dice=prayerDice(action.item);if(!dice.length)throw new Error('No unspent Prayer Dice are available.');
  const choice=await timedDialog(`Give Hope — ${action.actor.name}`,`<p>Give Hope to <strong>${esc(target.name)}</strong>. Choose Prayer Dice to spend.</p>${dice.map(([key,d])=>`<label style="display:inline-block;margin:0.4rem"><input type="checkbox" name="prayerDie" value="${esc(key)}"> ${d.value}</label>`).join('')}`,[
    {action:'use',label:'Give Hope',callback:(_event,_button,dialog)=>[...dialog.element.querySelectorAll('[name="prayerDie"]:checked')].map(e=>e.value)},
    {action:'cancel',label:'Cancel',default:true,callback:()=>false}
  ]);
  if(!Array.isArray(choice)||!choice.length)return;
  const gm=game.users.activeGM;if(!gm)throw new Error('Prayer Dice need an active GM.');
  const request={itemUuid:action.item.uuid,targetUuid:target.uuid,dice:choice};
  const result=gm.isSelf?await givePrayerHope(request,{user:game.user}):await gm.query(HOPE_QUERY,request,{timeout:20000});
  if(!result)ui.notifications.warn('Prayer Dice, target range, or available Hope has changed.');
}
export function registerPrayerHope(){
  CONFIG.queries[HOPE_QUERY]=givePrayerHope;
  const Damage=game.system.api.fields.ActionFields.DamageField,native=Damage.formatFormulas;
  Damage.formatFormulas=function(parts,config){
    const result=native.call(this,parts,config);
    if(this.id===PRAYER_HOPE_ACTION&&config[ID]?.prayerHope)for(const part of result)if(part.applyTo==='hope')part.formula=String(config[ID].prayerHope.total);
    return result;
  };
  Hooks.on('daggerheart.preUseAction',(action,config)=>{
    if(action.id!==PRAYER_HOPE_ACTION||prayerItem(action.actor)?.uuid!==action.item?.uuid)return;
    if(game.user.isActiveGM&&config[ID]?.prayerHope)return;
    void choosePrayerHope(action,config).catch(error=>ui.notifications.error(error.message));return false;
  });
}
