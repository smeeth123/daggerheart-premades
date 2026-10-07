import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {hopeCapacity,spendHope,isHopePaymentCancellation} from './hope-payment.js';
import {decisionBudget} from '../settings.js';
import {TACTICIAN_KEY} from './tactician-data.js';
const PROMPT=`${ID}.tacticianExperience`,TAG=Symbol.for(`${ID}.tacticianTag`),ROLL=Symbol.for(`${ID}.tacticianRoll`),tagEvents=new WeakMap();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function tacticianItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return i.type==='domainCard'&&featureActive(i)&&!i.system.inVault&&!i.system.isDomainTouchedSuppressed&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===TACTICIAN_KEY;})??null:null;}
export function tacticianExperiences(actor){return Object.entries(actor?.system.experiences??{}).flatMap(([id,e])=>e.name&&Number.isFinite(Number(e.value))&&Number(e.value)>0?[{id,name:e.name,value:Number(e.value)}]:[]);}
export async function promptTacticianExperience(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER'))return null;return timedDialog(`Tactician — ${data.helperName}`,'<p>Spend <strong>1 Hope</strong> to add one of your helper’s Experiences alongside their advantage die? Choose only an Experience that applies to this action.</p>',[...data.experiences.map(e=>({action:e.id,label:`${e.name} (+${e.value})`,callback:()=>e.id})),{action:'decline',label:'Use Help Only',default:true,callback:()=>null}]);}
// Called by the authoritative Help claim while its recipient resource lock is held.
export async function addTacticianExperience(actor,rows,{user},ask=promptTacticianExperience){
 for(const row of rows){if(row.enchantedAid||!row.tactician||unavailableActor(actor)||hopeCapacity(actor)<1)continue;
  const helper=await fromUuid(row.helperUuid),card=tacticianItem(helper),experiences=tacticianExperiences(helper);if(!card||card.uuid!==row.tactician||!experiences.length)continue;
  const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,helperName:helper.name,experiences};
  const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)}),experience=tacticianExperiences(helper).find(e=>e.id===choice);
  if(!experience||!game.user.isActiveGM||!user.active||!owner.active||!actor.testUserPermission(user,'OWNER')||!actor.testUserPermission(owner,'OWNER')||tacticianItem(helper)?.uuid!==card.uuid||unavailableActor(actor)||hopeCapacity(actor)<1)continue;
  try{const receipt=await spendHope(actor,1,{label:'Tactician'});if(!receipt)throw Error('Tactician could not confirm Hope payment.');row.tacticianExperience={id:experience.id,name:experience.name,value:experience.value};}catch(error){if(!isHopePaymentCancellation(error))throw error;}
 }return rows;
}
export function installTacticianTagTeam(Dialog,Duality){
 if(!Object.hasOwn(Dialog,TAG)){for(const name of ['makeTraitRoll','makeAbilityRoll']){const native=Dialog.prototype[name];Dialog.prototype[name]=async function(event,member,...args){if(!event||typeof event!=='object')return native.call(this,event,member,...args);const prior=tagEvents.get(event);tagEvents.set(event,game.actors.find(a=>a.id===member)?.uuid);try{return await native.call(this,event,member,...args);}finally{if(prior)tagEvents.set(event,prior);else tagEvents.delete(event);}};}Object.defineProperty(Dialog,TAG,{value:true});}
 if(!Object.hasOwn(Duality,ROLL)){const native=Duality.createRollInstance;Duality.createRollInstance=function(config,...args){const roll=native.call(this,config,...args),actor=config.data?.parent;if(config.actionType==='action'&&config.event&&tagEvents.get(config.event)===actor?.uuid&&tacticianItem(actor)){roll.dHope='d20';config[ID]={...config[ID],tacticianTagTeam:true};roll.options[ID]={...roll.options[ID],tacticianTagTeam:true};}return roll;};Object.defineProperty(Duality,ROLL,{value:true});}
}
export function registerTactician(){CONFIG.queries[PROMPT]=promptTacticianExperience;installTacticianTagTeam(game.system.api.applications.dialogs.TagTeamDialog,CONFIG.Dice.daggerheart.DualityRoll);}
