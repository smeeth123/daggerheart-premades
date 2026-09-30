import { ID,featureActive } from '../core.js';
export function isRally(action){
 return action.id==='vI4Fph3y9ygsya9e'&&Boolean(action.item)&&featureActive(action.item)&&!action.item?.flags?.[ID]?.disabled&&action.effects?.some(e=>e._id==='FrSJH9vzDHkFGYQL');
}
export function rallyMembers(actor,party){
 if(!party)throw new Error('Select an active Party before using Rally.');
 return [...new Map([actor,...party.system.partyMembers].filter(a=>a?.type==='character').map(a=>[a.uuid,a])).values()];
}
export function installRallyTargets(Target){
 const prepare=Target.prototype.prepareConfig;
 Target.prototype.prepareConfig=function(config,...args){
  if(!isRally(this))return prepare.call(this,config,...args);
  config.hasTarget=true;
  config.targets=rallyMembers(this.actor,game.actors.party).map(actor=>{
   const token=canvas.tokens?.placeables?.find(t=>t.actor?.uuid===actor.uuid)??actor.token??actor.prototypeToken;
   return Target.formatTarget.call(this,token,config.roll);
  });
 };
}
export function registerRallyTargets(){installRallyTargets(game.system.api.fields.ActionFields.TargetField);}
