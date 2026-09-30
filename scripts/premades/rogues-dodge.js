import { ID } from '../core.js';
import { DODGE_KEY,DODGE_EFFECT } from './rogues-dodge-data.js';
const QUERY=`${ID}.expireDodge`,WRAPPED=Symbol.for(`${ID}.roguesDodge`);
export function dodgeEffects(actor){
  const origins=new Set((actor?.items??[]).filter(item=>{
    const flags=item.flags?.[ID];return !flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===DODGE_KEY;
  }).map(item=>item.effects.get(DODGE_EFFECT)?.uuid).filter(Boolean));
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&origins.has(effect.origin));
}
export async function expireDodge(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid);if(!actor)return false;
  if(request.messageUuid){
    const message=await fromUuid(request.messageUuid),data=message?.system;
    if(data?.action?.type!=='attack'||!data.action.actor?.testUserPermission(user,'OWNER')||!Number.isFinite(data.roll?.total))return false;
    if(!data.targets?.some(t=>t.actorId===actor.uuid&&(t.difficulty||t.evasion)!=null&&(data.roll.isCritical||data.roll.total>=(t.difficulty||t.evasion))))return false;
  }else if(!actor.testUserPermission(user,'OWNER'))return false;
  const allowed=new Set(request.effectIds??[]);
  for(const effect of dodgeEffects(actor))if(allowed.has(effect.id))await effect.delete();
  return true;
}
async function dispatch(request){
  const gm=game.users.activeGM;if(!gm)throw new Error('Rogue’s Dodge expiry needs an active GM.');
  return gm.isSelf?expireDodge(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
}
export function installDodgeTargets(Target,expire=dispatch){
  const native=Target.execute;
  Target.execute=async function(config){
    const before=new Map();
    if(this.type==='attack')for(const target of config.targets??[]){
      const actor=await fromUuid(target.actorId);before.set(target.actorId,dodgeEffects(actor).map(e=>e.id));
    }
    const result=await native.call(this,config);
    if(this.type==='attack'&&config.message)for(const target of config.targets??[]){
      const effectIds=before.get(target.actorId);
      if(target.hitResult?.success&&effectIds?.length)await expire({actorUuid:target.actorId,effectIds,messageUuid:config.message.uuid});
    }
    return result;
  };
}
export function installDodgeRest(Downtime,expire=dispatch){
  const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime;
  const take=async function(...args){
    const selected=Object.values(this.moveData??{}).some(category=>Object.values(category.moves??{}).some(move=>move.selected>0));
    const effectIds=dodgeEffects(this.actor).map(e=>e.id);
    if(selected&&effectIds.length)await expire({actorUuid:this.actor.uuid,effectIds});
    return native.apply(this,args);
  };
  Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;
}
export function registerRoguesDodge(){
  const Target=game.system.api.fields.ActionFields.TargetField;if(Target[WRAPPED])return;
  Object.defineProperty(Target,WRAPPED,{value:true});CONFIG.queries[QUERY]=expireDodge;
  installDodgeTargets(Target);installDodgeRest(game.system.api.applications.dialogs.Downtime);
}
