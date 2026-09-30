import {ID,featureActive} from '../core.js';
import {COMFORT_KEY,ARMORED_KEY,BONDED_KEY,COMFORT_ACTION} from './companion-advancements-data.js';
import {linkedCompanion,companionPartner} from '../companion-context.js';
import {unavailable,setCompanionDamagePrevention} from '../companions.js';
import {withHopeLock} from './hope-lock.js';
import {ownerFor} from './aura-rules.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
const COMFORT=`${ID}.creatureComfort`,ASK=`${ID}.companionAdvancementPrompt`,BONDED=`${ID}.bondedTransition`;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function advancementItem(actor,key){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===key;})??null:null;}
export function availableCompanion(actor){const pet=linkedCompanion(actor);return pet&&!unavailable(pet)&&!pet.statuses?.has('dead')&&!pet.statuses?.has('defeated')?pet:null;}
const value=(actor,key)=>Number(actor.system.resources?.[key]?.value??0);
const comfortAvailable=actor=>{const i=advancementItem(actor,COMFORT_KEY),a=i?.system.actions?.get?.(COMFORT_ACTION)??i?.system.actions?.[COMFORT_ACTION];return i&&a?.uses?.recovery==='shortRest'&&Number(a.uses.value??0)<1?i:null;};
export function canArmor(actor){return Boolean(advancementItem(actor,ARMORED_KEY)&&availableCompanion(actor)&&Number(actor.system.armorScore?.value)<Number(actor.system.armorScore?.max));}
export async function promptAdvancement(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER'))return false;
 if(data.kind==='armor'){
  if(!canArmor(actor))return false;
  return Boolean(await timedDialog(`Armored — ${actor.name}`,`<p>${esc(linkedCompanion(actor).name)} would mark 1 Stress from damage.</p><p>Mark one of your <strong>Armor Slots</strong> instead?</p>`,[{action:'use',label:'Mark Armor Slot',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
 }
 const pet=availableCompanion(actor);if(!comfortAvailable(actor)||!pet)return false;
 const buttons=[];
 if(value(actor,'hope')<Number(actor.system.resources.hope.max))buttons.push({action:'hope',label:'Gain 1 Hope',callback:()=>'hope'});
 if(value(actor,'stress')>0||value(pet,'stress')>0)buttons.push({action:'stress',label:'Both Clear 1 Stress',callback:()=>'stress'});
 if(!buttons.length)return false;
 buttons.push({action:'cancel',label:'Cancel',default:true,callback:()=>false});
 return timedDialog(`Creature Comfort — ${actor.name}`,'<p>Take a quiet moment with your companion. Choose a benefit. Once per rest.</p>',buttons);
}
async function askOwner(actor,kind,ask=promptAdvancement){const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,kind};return owner.isSelf?ask(data,{user:game.user}):owner.query(ASK,data,{timeout:decisionBudget(65000)});}
export async function resolveComfort(request,{user},ask=promptAdvancement){
 if(!game.user.isActiveGM||!user?.active)return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!comfortAvailable(actor)||!availableCompanion(actor))return false;
 const choice=await askOwner(actor,'comfort',ask);if(!['hope','stress'].includes(choice))return false;
 return withHopeLock(actor.uuid,async()=>{
  const item=comfortAvailable(actor),pet=availableCompanion(actor);if(!item||!pet)return false;
  return withHopeLock(pet.uuid,async()=>{
   const hope=value(actor,'hope'),stress=value(actor,'stress'),petStress=value(pet,'stress');
   if(choice==='hope'&&hope>=Number(actor.system.resources.hope.max)||choice==='stress'&&stress===0&&petStress===0)return false;
   if(!await item.update({[`system.actions.${COMFORT_ACTION}.uses.value`]:1}))throw new Error('Could not spend Creature Comfort.');
   try{
    if(choice==='hope'){if(!await actor.update({'system.resources.hope.value':hope+1}))throw new Error('Could not gain Hope.');}
    else{
     if(!await actor.update({'system.resources.stress.value':Math.max(0,stress-1)}))throw new Error('Could not clear Stress.');
     if(!await pet.update({'system.resources.stress.value':Math.max(0,petStress-1)})){await actor.update({'system.resources.stress.value':stress});throw new Error('Could not clear companion Stress.');}
    }
   }catch(error){await item.update({[`system.actions.${COMFORT_ACTION}.uses.value`]:0});throw error;}
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Creature Comfort</strong>: ${esc(actor.name)} ${choice==='hope'?'gains 1 Hope':`and ${esc(pet.name)} each clear 1 Stress, if marked`}.</p>`});return true;
  });
 });
}
export async function offerArmored(pet,ask=promptAdvancement){
 const actor=companionPartner(pet);if(value(pet,'stress')>=Number(pet.system.resources.stress.max)||!canArmor(actor)||linkedCompanion(actor)?.uuid!==pet.uuid)return false;
 if(!await askOwner(actor,'armor',ask))return false;
 return withHopeLock(actor.uuid,async()=>{
  if(!canArmor(actor)||unavailable(pet))return false;
  const before=Number(actor.system.armorScore.value);
  await actor.system.updateArmorValue({value:1});
  if(Number(actor.system.armorScore.value)!==before+1)throw new Error('Armored could not mark an Armor Slot.');
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Armored</strong>: ${esc(actor.name)} marks 1 Armor Slot; ${esc(pet.name)} marks no Stress from this damage.</p>`});return true;
 });
}
export function markBondedTransition(actor,changes,options){
 const hp=actor.system?.resources?.hitPoints,next=changes['system.resources.hitPoints.value']??changes.system?.resources?.hitPoints?.value;
 if(advancementItem(actor,BONDED_KEY)&&next!=null&&Number(hp?.value)<Number(hp?.max)&&Number(next)>=Number(hp?.max))options[BONDED]=true;
}
const bondedPending=new Set();
export async function applyBonded(actor,rollDice=count=>new foundry.dice.Roll(`${count}d6`).evaluate()){
 if(!game.user.isActiveGM||bondedPending.has(actor.uuid)||!advancementItem(actor,BONDED_KEY))return false;
 const pet=availableCompanion(actor),hp=actor.system.resources.hitPoints;
 if(!pet||Number(hp.value)<Number(hp.max))return false;
 bondedPending.add(actor.uuid);
 try{return await withHopeLock(pet.uuid,async()=>{
  const count=Number(pet.system.resources.stress.max)-value(pet,'stress');if(!Number.isSafeInteger(count)||count<=0)return false;
  const roll=await rollDice(count),success=roll.dice.some(d=>d.results.some(r=>r.active!==false&&r.result===6));
  // Publish the dice before document recovery: a failed update must not hide
  // the roll, and native defeated-condition cleanup can run asynchronously.
  const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flags:{[ID]:{unshakeableRoll:true}},flavor:`<strong>Bonded — ${esc(actor.name)}</strong><p>Mark ${count} Stress on ${esc(pet.name)}. ${success?'A 6 was rolled: clear your last HP and return to the scene.':'No 6: your last HP remains marked.'} Move the companion to your side manually.</p>`},{messageMode:game.settings.get('core','messageMode')});
  if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  if(!await pet.update({'system.resources.stress.value':Number(pet.system.resources.stress.max)}))throw new Error('Bonded could not mark companion Stress.');
  if(success&&value(actor,'hitPoints')>=Number(actor.system.resources.hitPoints.max)){
   if(!await actor.update({'system.resources.hitPoints.value':Number(actor.system.resources.hitPoints.max)-1}))throw new Error('Bonded could not clear the last HP.');
   // Native HP recovery already removes these statuses when automation is on.
   // A second deletion can race it and abort this workflow.
   if(!game.system?.settings?.automation?.defeated?.enabled)await actor.toggleDefeated?.(false);
  }
  return success;
 });}finally{bondedPending.delete(actor.uuid);}
}
export function registerCompanionAdvancements(){
 CONFIG.queries[COMFORT]=resolveComfort;CONFIG.queries[ASK]=promptAdvancement;
 setCompanionDamagePrevention(offerArmored);
 Hooks.on('daggerheart.preUseAction',action=>{
  if(action.id!==COMFORT_ACTION||advancementItem(action.actor,COMFORT_KEY)?.uuid!==action.item?.uuid)return;
  const gm=game.users.activeGM;if(!gm){ui.notifications.error('Creature Comfort needs an active GM.');return false;}
  const request={actorUuid:action.actor.uuid};
  void (gm.isSelf?resolveComfort(request,{user:game.user}):gm.query(COMFORT,request,{timeout:decisionBudget(125000)})).then(result=>{if(!result)ui.notifications.info('Creature Comfort was not used. Check its remaining use, companion availability, and marked resources.');}).catch(e=>ui.notifications.error(e.message));return false;
 });
 Hooks.on('preUpdateActor',markBondedTransition);
 Hooks.on('updateActor',(actor,_changes,options)=>{if(game.user.isActiveGM&&options[BONDED])void applyBonded(actor).catch(e=>ui.notifications.error(e.message));});
}
