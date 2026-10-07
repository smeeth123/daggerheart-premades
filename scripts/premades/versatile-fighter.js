import {ID,featureActive} from '../core.js';
import {timedDialog,untimedDialog} from '../dialog.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {markReactiveStress} from './stress-payment.js';
import {VF_KEY,VF_ACTION} from './versatile-fighter-data.js';
const QUERY=`${ID}.versatileFighter`,TRAITS=`${QUERY}Traits`,DICE=`${QUERY}Dice`,PAY=`${QUERY}Pay`;
const PREP=Symbol.for(`${QUERY}Prepare`),DAMAGE=Symbol.for(`${QUERY}Damage`),prepared=new WeakMap(),activeCards=new WeakMap(),queues=new Map(),decisions=new Map();
export const VF_TRAITS=['agility','strength','finesse','instinct','presence','knowledge'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function versatileFighterItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const f=item.flags?.[ID],s=item.system;return item.type==='domainCard'&&featureActive(item)&&!f?.disabled&&!s.inVault&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===VF_KEY;})??null:null;}
export function versatileFighterWeapons(actor){return [...(actor?.items??[])].filter(w=>w.type==='weapon'&&w.system.equipped&&w.system.attack?.roll&&featureActive(w));}
export function applyVersatileFighterTraits(actor){
 const card=versatileFighterItem(actor),entries=[];
 for(const weapon of versatileFighterWeapons(actor)){const choice=weapon.flags?.[ID]?.versatileFighter;
  if(choice?.cardUuid!==card?.uuid||!VF_TRAITS.includes(choice?.trait))continue;
  const roll=weapon.system.attack.roll;entries.push({roll,base:roll.trait,trait:choice.trait});roll.trait=choice.trait;
 }prepared.set(actor,entries);
}
export function installVersatileFighterTraits(Actor){if(Object.hasOwn(Actor,PREP))return;const native=Actor.prototype.prepareData;
 Actor.prototype.prepareData=function(...args){for(const entry of prepared.get(this)??[])if(entry.roll.trait===entry.trait)entry.roll.trait=entry.base;prepared.delete(this);const result=native.apply(this,args);applyVersatileFighterTraits(this);return result;};Object.defineProperty(Actor,PREP,{value:true});
}
export async function promptVersatileTraits(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||versatileFighterItem(actor)?.uuid!==data.cardUuid)return null;
 return untimedDialog(`Versatile Fighter — ${actor.name}`,'<p>Choose the trait for each equipped weapon. These choices apply only while Versatile Fighter is in your loadout.</p>'+data.weapons.map(w=>
  `<div class="form-group"><label>${esc(w.name)}</label><select name="vfTrait" data-uuid="${esc(w.uuid)}"><option value="native"${w.trait==='native'?' selected':''}>Keep weapon’s normal trait</option>${VF_TRAITS.map(t=>`<option value="${t}"${w.trait===t?' selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}</select></div>`).join(''),
  [{action:'apply',label:'Apply Traits',default:true,callback:(_e,_b,d)=>[...d.element.querySelectorAll('[name="vfTrait"]')].map(input=>({uuid:input.dataset.uuid,trait:input.value}))},{action:'cancel',label:'Cancel',callback:()=>null}]);
}
export async function chooseVersatileTraits(actor,weaponUuids=null,ask=promptVersatileTraits){
 if(!game.user.isActiveGM)return false;const card=versatileFighterItem(actor);if(!card)return false;
 const weapons=versatileFighterWeapons(actor).filter(w=>!weaponUuids||weaponUuids.includes(w.uuid));if(!weapons.length)return false;
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,cardUuid:card.uuid,weapons:weapons.map(w=>({uuid:w.uuid,name:w.name,trait:w.flags?.[ID]?.versatileFighter?.cardUuid===card.uuid?w.flags[ID].versatileFighter.trait:'native'}))};
 const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(TRAITS,data);
 if(!Array.isArray(choice)||choice.length!==weapons.length||new Set(choice.map(c=>c.uuid)).size!==choice.length||choice.some(c=>!weapons.some(w=>w.uuid===c.uuid)||!['native',...VF_TRAITS].includes(c.trait)))return false;
 return withHopeLock(`${QUERY}:traits:${actor.uuid}`,async()=>{
  if(!game.user.isActiveGM||!owner.active||!actor.testUserPermission(owner,'OWNER')||versatileFighterItem(actor)?.uuid!==card.uuid||choice.some(c=>!versatileFighterWeapons(actor).some(w=>w.uuid===c.uuid)))return false;
  const updates=choice.map(c=>({_id:weapons.find(w=>w.uuid===c.uuid).id,[`flags.${ID}.versatileFighter`]:{cardUuid:card.uuid,trait:c.trait}}));
  const result=await actor.updateEmbeddedDocuments('Item',updates);if(result?.length!==updates.length||choice.some(c=>weapons.find(w=>w.uuid===c.uuid).flags?.[ID]?.versatileFighter?.trait!==c.trait))throw Error('Versatile Fighter could not confirm the weapon choices. Check the weapons.');return true;
 });
}
function enqueue(actor,uuids=null){const previous=queues.get(actor.uuid)??Promise.resolve();const work=previous.catch(()=>{}).then(()=>chooseVersatileTraits(actor,uuids));queues.set(actor.uuid,work);work.catch(error=>{console.error(`${ID} | Versatile Fighter traits`,error);ui.notifications.error(error.message);}).finally(()=>{if(queues.get(actor.uuid)===work)queues.delete(actor.uuid);});return work;}
export function versatileFighterItemChanged(item,changes={},created=false){
 const actor=item.actor;if(!game.user.isActiveGM||actor?.type!=='character')return;
 if(item.type==='domainCard'){const prior=activeCards.get(item)??false,current=versatileFighterItem(actor)?.uuid===item.uuid;activeCards.set(item,current);if(current&&!prior)return enqueue(actor);}
 else if(item.type==='weapon'&&versatileFighterItem(actor)&&item.system.equipped&&(created||changes['system.equipped']===true||changes.system?.equipped===true))return enqueue(actor,[item.uuid]);
}
export function versatileDamageDice(roll){return (roll?.dice??[]).flatMap((die,index)=>!die._evaluated&&Number.isSafeInteger(die.number)&&die.number>0&&Number.isSafeInteger(die.faces)&&die.faces>=2&&!(die.results?.length)?[{index,faces:die.faces,number:die.number}]:[]);}
const canPay=actor=>!unavailableActor(actor)&&Number(actor?.system.resources?.stress?.value)<Number(actor?.system.resources?.stress?.max);
export async function promptVersatileDie(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!versatileFighterItem(actor)||!canPay(actor))return null;
 return timedDialog(`Versatile Fighter — ${actor.name}`,'<p>Mark <strong>1 Stress</strong> to use the maximum result of <strong>one damage die</strong> instead of rolling it?</p>',
  [...data.dice.map(d=>({action:`die${d.index}`,label:`Maximize one d${d.faces}${d.number>1?` (${d.number} dice in pool)`:''}`,callback:()=>d.index})),{action:'decline',label:'Roll Normally',default:true,callback:()=>null}]);
}
export async function resolveVersatileDie(request,{user},ask=promptVersatileDie){
 if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||!Array.isArray(request.dice)||!request.dice.length||request.dice.length>100||request.dice.some(d=>!Number.isSafeInteger(d.index)||d.index<0||!Number.isSafeInteger(d.faces)||d.faces<2||!Number.isSafeInteger(d.number)||d.number<1))return null;
 const key=`${user.id}:${request.id}`;if(decisions.has(key))return null;decisions.set(key,{pending:true});if(decisions.size>512)decisions.delete(decisions.keys().next().value);
 const actor=await fromUuid(request.actorUuid),card=versatileFighterItem(actor);if(!card||card.uuid!==request.cardUuid||!actor.testUserPermission(user,'OWNER')||!canPay(actor))return null;
 const owner=ownerFor(actor,[...game.users],game.user),choice=owner.isSelf?await ask(request,{user:game.user}):await owner.query(DICE,request,{timeout:decisionBudget(125000)}),die=request.dice.find(d=>d.index===choice);
 if(!die||!game.user.isActiveGM||!user.active||!owner.active||!actor.testUserPermission(owner,'OWNER')||request.deadline<=decisionNow()||versatileFighterItem(actor)?.uuid!==card.uuid||!canPay(actor))return null;
 const token=foundry.utils.randomID(),entry={actorUuid:actor.uuid,cardUuid:card.uuid,userId:user.id,ownerId:owner.id,die,expires:decisionNow()+decisionBudget(600000)};decisions.set(token,entry);return {token,...die};
}
export async function payVersatileDie(request,{user}){
 const entry=decisions.get(request?.token);if(!game.user.isActiveGM||!user?.active||!entry?.actorUuid||entry.userId!==user.id||entry.expires<=decisionNow())return false;
 if(entry.payment)return entry.payment;
 entry.payment=(async()=>{const actor=await fromUuid(entry.actorUuid),owner=game.users.find(u=>u.id===entry.ownerId);
  if(!game.user.isActiveGM||!user.active||!owner?.active||!actor?.testUserPermission(user,'OWNER')||!actor.testUserPermission(owner,'OWNER')||versatileFighterItem(actor)?.uuid!==entry.cardUuid)return false;
  return markReactiveStress(actor.uuid,a=>game.user.isActiveGM&&user.active&&owner.active&&a.testUserPermission(user,'OWNER')&&a.testUserPermission(owner,'OWNER')&&versatileFighterItem(a)?.uuid===entry.cardUuid);
 })();return entry.payment;
}
function damageActor(config){return config.data?.parent??game.messages?.get(config.source?.message)?.system?.action?.actor??(typeof config.source?.actor==='string'?foundry.utils.fromUuidSync(config.source.actor):null);}
const pendingMaxima=new WeakSet();
export function seedVersatileDie(roll,choice){
 const die=roll?.dice?.[choice?.index];if(!die||die.faces!==choice.faces||die.number!==choice.number||die._evaluated||die.results.length||pendingMaxima.has(die))return false;
 const descriptor=Object.getOwnPropertyDescriptor(die,'_evaluateAsync'),evaluate=die._evaluateAsync;
 const restore=()=>{if(descriptor)Object.defineProperty(die,'_evaluateAsync',descriptor);else delete die._evaluateAsync;pendingMaxima.delete(die);};
 pendingMaxima.add(die);
 die._evaluateAsync=async function(...args){
  // The native interactive resolver appends a full pool before this method runs.
  // Substitute one fulfilled result, or seed one digital result only now, so
  // keep/drop sees exactly the native number of dice, never an extra maximum.
  try{if(this.results.length){Object.assign(this.results[0],{result:this.faces,versatileFighter:true});}
   else this.results.push({result:this.faces,active:true,versatileFighter:true});
   return await evaluate.apply(this,args);
  }finally{restore();}
 };
 roll.options[ID]={...roll.options[ID],versatileFighter:{index:choice.index,faces:choice.faces}};return restore;
}
export function installVersatileFighterDamage(Damage,choose,pay){
 if(Object.hasOwn(Damage,DAMAGE))return;const native=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(outer,config,...args){
  const actor=damageActor(config),card=versatileFighterItem(actor);
  if(!card||!canPay(actor)||config.hasHealing||config.evaluate===false||!config.damageFormula||config[ID]?.versatileFighterOffered)return native.call(this,outer,config,...args);
  let restoreConstruct=null;
  if(config.dialog?.configure===false){outer.constructFormulas(config);const descriptor=Object.getOwnPropertyDescriptor(outer,'constructFormulas'),construct=outer.constructFormulas;let skipped=false;
   outer.constructFormulas=function(...a){if(!skipped){skipped=true;return;}return construct.apply(this,a);};restoreConstruct=()=>{if(descriptor)Object.defineProperty(outer,'constructFormulas',descriptor);else delete outer.constructFormulas;};}
  try{
   const main=config.damageFormula.roll,dice=versatileDamageDice(main);if(!dice.length)return await native.call(this,outer,config,...args);
   config[ID]={...config[ID],versatileFighterOffered:true};const choice=await choose({id:foundry.utils.randomID(),actorUuid:actor.uuid,cardUuid:card.uuid,dice,deadline:decisionNow()+decisionBudget(120000)});
   if(!choice)return await native.call(this,outer,config,...args);
   const restoreDie=versatileFighterItem(actor)?.uuid===card.uuid&&seedVersatileDie(main,choice);
   if(!restoreDie)throw Error('Versatile Fighter damage changed before evaluation. Cancel and roll again.');
   const descriptor=Object.getOwnPropertyDescriptor(main,'evaluate'),evaluate=main.evaluate;
   main.evaluate=async function(...a){const result=await evaluate.apply(this,a);if(!await pay({token:choice.token}))throw Error('Versatile Fighter could not confirm Stress payment. Damage resolution stopped; check Stress and damage manually.');return result;};
   try{return await native.call(this,outer,config,...args);}finally{restoreDie();if(descriptor)Object.defineProperty(main,'evaluate',descriptor);else delete main.evaluate;}
  }finally{restoreConstruct?.();}
 };Object.defineProperty(Damage,DAMAGE,{value:true});
}
export function registerVersatileFighter(){
 CONFIG.queries[TRAITS]=promptVersatileTraits;CONFIG.queries[DICE]=promptVersatileDie;CONFIG.queries[QUERY]=resolveVersatileDie;CONFIG.queries[PAY]=payVersatileDie;
 const dispatch=(name,r)=>{const gm=game.users.activeGM;if(!gm)throw Error('Versatile Fighter requires an active GM.');return gm.isSelf?CONFIG.queries[name](r,{user:game.user}):gm.query(name,r,{timeout:decisionBudget(125000)});};
 installVersatileFighterTraits(CONFIG.Actor.documentClass);installVersatileFighterDamage(CONFIG.Dice.daggerheart.DamageRoll,r=>dispatch(QUERY,r),r=>dispatch(PAY,r));
 for(const actor of game.actors??[]){for(const item of actor.items??[])if(item.type==='domainCard')activeCards.set(item,versatileFighterItem(actor)?.uuid===item.uuid);if(versatileFighterItem(actor))actor.prepareData();}
 Hooks.on('createItem',i=>versatileFighterItemChanged(i,{},true));Hooks.on('updateItem',(i,c)=>versatileFighterItemChanged(i,c));
 Hooks.on('daggerheart.preUseAction',a=>{if(a.id===VF_ACTION&&versatileFighterItem(a.actor)?.uuid===a.item?.uuid){ui.notifications.info('Versatile Fighter offers its Stress cost automatically before damage rolls.');return false;}});
}
