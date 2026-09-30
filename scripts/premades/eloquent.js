import { ID,featureActive } from '../core.js';
import { ELOQUENT_KEY,ELOQUENT_ACTION } from './eloquent-data.js';
export function eloquentAction(action){const item=action.item,f=item?.flags?.[ID];return Boolean(item&&featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===ELOQUENT_KEY&&action.id===ELOQUENT_ACTION);}
export function installEloquentTargets(Target){const native=Target.prototype.prepareConfig;
 Target.prototype.prepareConfig=function(config,...args){const result=native.call(this,config,...args);if(eloquentAction(this)&&(config.targets?.length!==1||config.targets[0].actorId===this.actor.uuid))throw new Error('Eloquent requires exactly one targeted ally other than yourself.');return result;};
}
export function installEloquentRest(Downtime){
 const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime,started=new WeakMap();
 const take=async function(...args){
  const selected=Object.values(this.moveData??{}).some(c=>Object.values(c.moves??{}).some(m=>m.selected>0));
  if(selected&&!started.has(this))started.set(this,[...this.actor.effects].filter(e=>!e.disabled&&!e.isSuppressed&&e.flags?.[ID]?.eloquentRest).map(e=>e.id));
  const result=await native.apply(this,args);
  if(selected&&Object.values(this.nrChoices).every(c=>c.taken>=c.max)){
   const ids=(started.get(this)??[]).filter(id=>this.actor.effects.get(id)?.flags?.[ID]?.eloquentRest);
   if(ids.length)await this.actor.deleteEmbeddedDocuments('ActiveEffect',ids);
  }return result;
 };Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;
}
export function registerEloquent(){installEloquentTargets(game.system.api.fields.ActionFields.TargetField);installEloquentRest(game.system.api.applications.dialogs.Downtime);}
