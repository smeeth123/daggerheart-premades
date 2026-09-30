import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { FAVOR_KEY } from './favor-data.js';
import { adaptabilityOutcome } from './adaptability.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
const SYNC=`${ID}FavorSync`,TRIBUTE='showTributeToPatron';
export function favorItem(actor){return actor?.items?.find(i=>{const f=i.flags?.[ID];return !f?.disabled&&!i.system.inactive&&(f?.applied?.key??f?.premade?.key)===FAVOR_KEY;})??null;}
export async function syncFavor(actor){
  if(!game.user.isActiveGM)return;
  const item=favorItem(actor),value=Number(actor?.system.resources?.favor?.value);if(!item||!Number.isFinite(value)||Number(item.system.resource?.value)===value)return;
  await item.update({'system.resource.value':value},{[SYNC]:true});
}
export async function validateFavor(request,user){
  if(!user?.active||request.deadline<=decisionNow()||request.actionType!=='action'||!request.withHope||!Number.isFinite(request.total))return null;
  const actor=await fromUuid(request.sourceUuid),item=favorItem(actor),favor=actor?.system.resources?.favor;
  if(!item||item.uuid!==request.candidate?.itemUuid||!actor.testUserPermission(user,'OWNER')||!(Number(favor?.value)<Number(favor?.max??6)))return null;
  const outcome=adaptabilityOutcome(request.total,request.critical,request.difficulty,request.targets);
  return outcome==='failure'?null:{actor,item,outcome};
}
export async function resolveFavor(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))return false;
  const valid=await validateFavor(request,user);if(!valid||!authorize(request.resolutionToken,'favor',valid.item.uuid,user))return false;
  return {itemUuid:valid.item.uuid,bearerName:valid.actor.name};
}
export function installFavorResources(Duality){
  const native=Duality.addDualityResourceUpdates;
  Duality.addDualityResourceUpdates=async function(config){
    const choice=config[ID]?.favorChoice,withHope=config.roll?.result?.duality===1||config.roll?.isCritical;if(!choice||config.actionType!=='action'||!withHope)return native.call(this,config);
    const actor=await fromUuid(config.source.actor);if(favorItem(actor)?.uuid!==choice.itemUuid)return native.call(this,config);
    const original=config.resourceUpdates;
    const proxy=new Proxy(original,{get(target,key){
      if(key==='addResources')return updates=>target.addResources(updates.map(update=>update.key==='hope'&&update.value===1?{...update,key:'favor'}:update));
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
    config.resourceUpdates=proxy;try{return await native.call(this,config);}finally{config.resourceUpdates=original;}
  };
}
export function tributeEligible(actor){return Boolean(favorItem(actor)&&game.actors.party?.system.partyMembers?.some(a=>a.uuid===actor.uuid));}
export function installFavorDowntime(Downtime){
  const context=Downtime.prototype._prepareContext;
  Downtime.prototype._prepareContext=async function(...args){
    for(const category of ['shortRest','longRest']){
      const moves=this.moveData[category]?.moves;if(!moves)continue;
      if(tributeEligible(this.actor))moves[TRIBUTE]??={id:TRIBUTE,name:'Show Tribute to Patron',icon:'fa-solid fa-hands-praying',img:'icons/magic/symbols/runes-triangle-orange.webp',description:'Describe how you show tribute to your patron. Gain Favor equal to your Spellcast trait.',actions:[],effects:[],selected:0};
      else delete moves[TRIBUTE];
    }
    return context.apply(this,args);
  };
  const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime;
  const take=async function(...args){
    const count=tributeEligible(this.actor)?Object.values(this.moveData).reduce((n,c)=>n+Number(c.moves?.[TRIBUTE]?.selected??0),0):0;
    const result=await native.apply(this,args);
    if(count){
      const favor=this.actor.system.resources.favor,amount=Math.max(0,Number(this.actor.system.spellcastModifier??0))*count;
      const next=Math.min(Number(favor.max??6),Number(favor.value)+amount),gain=next-Number(favor.value);
      await this.actor.update({'system.resources.favor.value':next});
      await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content:`<p><strong>Show Tribute to Patron:</strong> gained ${gain} Favor.</p>`});
    }
    return result;
  };Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;
}
export function registerFavor(){
  CONFIG.queries[`${ID}.favor`]=resolveFavor;
  installFavorResources(CONFIG.Dice.daggerheart.DualityRoll);installFavorDowntime(game.system.api.applications.dialogs.Downtime);
  Hooks.on('updateActor',actor=>{void syncFavor(actor).catch(console.error);});
  Hooks.on('updateItem',(item,change,options)=>{
    if(options?.[SYNC]||!game.user.isActiveGM||favorItem(item.actor)?.uuid!==item.uuid)return;
    if(change.flags?.[ID]?.applied||change[`flags.${ID}.applied`]){void syncFavor(item.actor).catch(console.error);return;}
    const value=change['system.resource.value']??change.system?.resource?.value;
    if(value!==undefined){void item.actor.update({'system.resources.favor.value':Math.max(0,Math.min(6,Number(value)))}).catch(console.error);}
    else void syncFavor(item.actor).catch(console.error);
  });
  Hooks.on('createItem',item=>{if(item.actor)void syncFavor(item.actor).catch(console.error);});
  for(const actor of game.actors)void syncFavor(actor).catch(console.error);
}
