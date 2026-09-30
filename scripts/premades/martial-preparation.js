import {ID,featureActive} from '../core.js';
import {MARTIAL_PREPARATION_KEY} from './martial-preparation-data.js';
import {slayerItem,slayerAvailable,slayerCapacity,createTemporarySlayerDice} from './slayer.js';
const QUERY=`${ID}.martialPreparation`,MOVE='martialPreparation';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const effects=actor=>[...(actor?.effects??[])];
export function martialPreparationItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===MARTIAL_PREPARATION_KEY;})??null:null;}
export function martialAccessEffects(actor){return effects(actor).filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.flags?.[ID]?.martialPreparationAccess);}
export function martialPreparationEligible(actor){return Boolean(martialPreparationItem(actor)||martialAccessEffects(actor).length);}
export function martialParty(actor){const members=game.actors.party?.system.partyMembers??[];return [...new Map(members.filter(member=>member?.type==='character').map(member=>[member.uuid,member])).values()];}
function accessData(item,source){return{name:'Martial Preparation Available',img:item.img,type:'base',transfer:false,disabled:false,origin:item.uuid,showIcon:CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,description:`<p>${esc(source.name)} prepared the party. You can choose Martial Preparation during this rest to gain a temporary d6 Slayer Die.</p>`,system:{changes:[],duration:{type:'',description:'Until you finish this rest or choose Martial Preparation.'}},flags:{[ID]:{martialPreparationAccess:{sourceUuid:source.uuid}}}};}
export async function resolveMartialPreparation(request,{user}){
 if(!game.user.isActiveGM||!user?.active||!Number.isSafeInteger(request.count)||request.count<0||request.count>10)return false;
 const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;
 const feature=martialPreparationItem(actor),access=martialAccessEffects(actor);
 if(request.op==='cleanup'){if(access.length)await actor.deleteEmbeddedDocuments('ActiveEffect',access.map(effect=>effect.id));return true;}
 if(request.op!=='take'||request.count<1||(!feature&&!access.length))return false;
 let gained=0,normal=false;
 if(feature){
  const party=martialParty(actor);if(!party.some(member=>member.uuid===actor.uuid))throw Error('Martial Preparation requires an active Party.');
  const item=slayerItem(actor),before=slayerAvailable(item),createdDice=[],createdAccess=[];
  try{
   if(item){normal=true;const next=Math.min(slayerCapacity(item),before+request.count);if(next>before){if(!await item.update({'system.resource.value':next}))throw Error('Could not add the Martial Preparation Slayer Die.');gained=next-before;}}
   else{createdDice.push(...await createTemporarySlayerDice(actor,request.count,feature));gained=request.count;}
   for(const ally of party.filter(member=>member.uuid!==actor.uuid)){
    if(martialAccessEffects(ally).length)continue;
    const created=await ally.createEmbeddedDocuments('ActiveEffect',[accessData(feature,actor)]);if(!created.length)throw Error(`Could not grant Martial Preparation to ${ally.name}.`);
    createdAccess.push({actor:ally,ids:created.map(effect=>effect.id)});
   }
  }catch(error){
   for(const entry of createdAccess.reverse())await entry.actor.deleteEmbeddedDocuments('ActiveEffect',entry.ids);
   if(createdDice.length)await actor.deleteEmbeddedDocuments('ActiveEffect',createdDice.map(effect=>effect.id));
   if(item&&slayerAvailable(item)!==before)await item.update({'system.resource.value':before});
   throw error;
  }
 }else{
  const created=await createTemporarySlayerDice(actor,request.count,access[0]);
  try{const ids=access.map(effect=>effect.id);await actor.deleteEmbeddedDocuments('ActiveEffect',ids);if(ids.some(id=>martialAccessEffects(actor).some(effect=>effect.id===id)))throw Error('Could not consume Martial Preparation access.');}
  catch(error){await actor.deleteEmbeddedDocuments('ActiveEffect',created.map(effect=>effect.id));throw error;}
  gained=request.count;
 }
 try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Martial Preparation:</strong> ${esc(actor.name)} gained ${gained} ${normal?'stored ': 'temporary '}Slayer ${gained===1?'Die':'Dice'}${normal&&gained<request.count?' (their pool is full)':''}.</p>`});}catch(error){console.error(error);}
 return{gained,normal};
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw Error('Martial Preparation needs an active GM.');return gm.isSelf?resolveMartialPreparation(request,{user:game.user}):gm.query(QUERY,request,{timeout:20000});}
export function installMartialPreparationDowntime(Downtime,send=dispatch){const context=Downtime.prototype._prepareContext;Downtime.prototype._prepareContext=async function(...args){for(const category of ['shortRest','longRest']){const moves=this.moveData[category]?.moves;if(!moves)continue;if(martialPreparationEligible(this.actor))moves[MOVE]??={id:MOVE,name:'Martial Preparation',icon:'fa-solid fa-dumbbell',img:'icons/skills/melee/sword-winged-holy-orange.webp',description:'Describe how you instruct and train with your party. Gain a d6 Slayer Die.',actions:[],effects:[],selected:0};else delete moves[MOVE];}return context.apply(this,args);};const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime;const take=async function(...args){const count=martialPreparationEligible(this.actor)?Object.values(this.moveData??{}).reduce((total,category)=>total+Number(category.moves?.[MOVE]?.selected??0),0):0,result=await native.apply(this,args),complete=Object.values(this.nrChoices).every(category=>category.taken>=category.max);if(count){const granted=await send({op:'take',actorUuid:this.actor.uuid,count});if(!granted)throw Error('Martial Preparation could not be applied.');}else if(complete&&martialAccessEffects(this.actor).length)await send({op:'cleanup',actorUuid:this.actor.uuid,count:0});return result;};Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;}
export function registerMartialPreparation(){CONFIG.queries[QUERY]=resolveMartialPreparation;installMartialPreparationDowntime(game.system.api.applications.dialogs.Downtime);}
