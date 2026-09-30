import { ID } from './core.js';
const WRAPPED=Symbol.for(`${ID}.hiddenAttacks`);
export function shadowCloakedEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&(
    effect.name?.trim().toLowerCase()==='shadow stepper: cloaked'||
    effect.origin?.endsWith('.ActiveEffect.RYri0b9z5kq74U5n')
  ));
}
export function vanishingCloakedEffects(actor){
  return [...(actor?.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&(
    effect.name?.trim().toLowerCase()==='vanishing act: cloaked'||
    effect.origin?.endsWith('.ActiveEffect.czrwqq44sEr0uJ8O')
  ));
}
export function cloakedEffects(actor){return [...new Set([...shadowCloakedEffects(actor),...vanishingCloakedEffects(actor)])];}
export function hiddenTargets(config){
  const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null);
  const item=actor?.items?.get?.(config.source?.item);
  const action=[actor?.system?.attack,item?.system?.attack,...(item?.system?.actionsList??[])].find(a=>a&&(a.id??a._id)===config.source?.action);
  if(action?.type!=='attack')return false;
  const targets=Array.isArray(config.targets)?config.targets:[...(game.user.targets??[])];
  return targets.some(target=>{
    const token=target.document??target;
    const defender=target.actor??token.actor??(target.actorId?foundry.utils.fromUuidSync(target.actorId):null);
    return Boolean(defender?.statuses?.has('hidden')||cloakedEffects(defender).length);
  });
}
export function installHiddenExpiry(Target){
  if(Target[WRAPPED])return;
  const native=Target.execute;
  Target.execute=async function(config){
    const result=await native.call(this,config);
    if(result!==false&&this.type==='attack'&&Number.isFinite(config.roll?.total)){
      if(this.actor?.statuses?.has('hidden'))await this.actor.toggleStatusEffect('hidden',{active:false});
      for(const effect of shadowCloakedEffects(this.actor))await effect.delete();
    }
    return result;
  };
  Object.defineProperty(Target,WRAPPED,{value:true});
}
export function registerHiddenAttacks(){installHiddenExpiry(game.system.api.fields.ActionFields.TargetField);}
