// Shared Trauma marks a fixed HP cost, not a raw damage roll. Publish only
// committed consequences; never feed this cost back into damage prevention.
import {ID} from '../core.js';
import {decisionNow} from '../decision-clock.js';
import {decisionBudget} from '../settings.js';
import {slumberEffects,expireSlumber} from './book-of-illiat.js';
import {fragileItem,fragileMajor} from './fragile.js';
import {elementalEffects} from './elemental-incarnation.js';
import {severeStormDamage} from './eye-of-the-storm.js';
import {ireAvailable,ireCandidates,resolveOtherworldlyIre} from './otherworldly-ire.js';
import {notDoneItem,resolveNotDone} from './not-done-yet.js';
import {beetlesEffects,finishBeetles} from './conjure-swarm.js';
import {bulkyArmor,bulkySevereDamage} from './armor-bulky.js';
import {reactToCommittedDamage} from './hideous-retribution.js';
import {reactFerocityHP} from './ferocity.js';
async function settledStress(actor){const prior=Object.getOwnPropertyDescriptor(actor,'update'),update=actor.update,pending=[];const capture=function(...args){const promise=update.apply(this,args);pending.push(Promise.resolve(promise));return promise;};actor.update=capture;try{await actor.takeDamage({resources:{stress:1}},true);let index=0;while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}}finally{if(actor.update===capture){if(prior)Object.defineProperty(actor,'update',prior);else delete actor.update;}}}
export async function traumaFollowups(actor,source,count){
 const updates=[{key:'hitPoints',value:count,clear:false,itemId:null,damageTypes:[]}],context={user:game.user};
 const tasks=[
  async()=>Hooks.callAll(`${CONFIG.DH.id}.postTakeDamage`,actor,structuredClone(updates)),
  async()=>{const ids=slumberEffects(actor).map(e=>e.id);if(ids.length)await expireSlumber({actorUuid:actor.uuid,effectIds:ids,updates},context);},
  async()=>{if(fragileMajor(updates)&&fragileItem(actor))await game.system.api.fields.ActionFields.BeastformField.handleActiveTransformations.call({actor});},
  async()=>{if(severeStormDamage(updates)){const ids=elementalEffects(actor).map(e=>e.id);if(ids.length)await actor.deleteEmbeddedDocuments('ActiveEffect',ids);}},
  async()=>{if(ireAvailable(actor)&&ireCandidates(actor).length)await resolveOtherworldlyIre({actorUuid:actor.uuid,id:foundry.utils.randomID(),deadline:decisionNow()+decisionBudget(120000)},context);},
  async()=>{if(count>=3&&notDoneItem(actor))await resolveNotDone({actorUuid:actor.uuid,severity:count,id:foundry.utils.randomID(),deadline:decisionNow()+decisionBudget(120000)},context);},
  async()=>{const ids=beetlesEffects(actor).map(e=>e.id);if(ids.length)await finishBeetles(actor,ids);},
  async()=>{if(bulkySevereDamage(updates)&&bulkyArmor(actor))await settledStress(actor);},
  async()=>reactToCommittedDamage(actor,source),
  async()=>reactFerocityHP(source,actor,count)
 ];
 for(const task of tasks)try{await task();}catch(error){console.error(`${ID} | Shared Trauma follow-up`,error);ui.notifications.error(`Shared Trauma HP transfer was completed, but a follow-up failed: ${error.message}. Do not repeat the transfer.`);}
}
