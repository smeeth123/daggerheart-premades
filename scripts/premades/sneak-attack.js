import { ID } from '../core.js';
import { SNEAK_KEY,SNEAK_EFFECT } from './sneak-attack-data.js';
import { sourceToken } from './hallowed-aura.js';
import { meleeLimit } from './tusks.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
const WRAPPED=Symbol.for(`${ID}.sneakAttack`);
export function sneakItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===SNEAK_KEY;})??null;}
export function sneakConcealed(actor){
  if(actor?.statuses?.has('hidden')||actor?.statuses?.has('cloaked'))return true;
  return [...(actor?.effects??[])].some(effect=>!effect.disabled&&!effect.isSuppressed&&/^(hidden|cloaked)$|: cloaked$/i.test(effect.name?.trim()??''));
}
export function sneakAllyNear(actor,target){
  if(!canvas.ready)return false;
  const origin=sourceToken(actor),defender=canvas.tokens.get(target.id);
  if(!origin||!defender||defender.actor?.uuid!==target.actorId)return false;
  const disposition=origin.document.disposition,limit=meleeLimit(canvas.scene);
  return canvas.tokens.placeables.some(ally=>{
    if(!ally.actor||ally.actor.uuid===actor.uuid||ally.actor.uuid===defender.actor.uuid||ally.document.disposition!==disposition||disposition===0)return false;
    const distance=ally.distanceTo(defender);return Number.isFinite(distance)&&Number.isFinite(limit)&&distance<=limit;
  });
}
export function selectSneakBonus(roll,config){
  const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor??config.data?.parent;
  if(!sneakItem(actor)||config.hasHealing)return;
  const effect=roll.options.bonusEffects?.[SNEAK_EFFECT]??config.bonusEffects?.[SNEAK_EFFECT];
  if(effect)effect.selected=Boolean(message?.flags?.[ID]?.sneakAttack?.eligible);
}
export function installSneakTargets(Target){
  const native=Target.execute;
  Target.execute=async function(config){
    const result=await native.call(this,config);
    if(result===false||this.type!=='attack'||!sneakItem(this.actor)||!config.message)return result;
    const hits=(config.targets??[]).filter(t=>t.hitResult?.success);
    const concealed=Boolean(config[ID]?.sneakConcealed);
    const eligible=hits.length>0&&hits.every(target=>concealed||sneakAllyNear(this.actor,target));
    await config.message.update({[`flags.${ID}.sneakAttack`]:{eligible,concealed,targetIds:hits.map(t=>t.id)}});
    return result;
  };
}
export function registerSneakAttack(){
  const Target=game.system.api.fields.ActionFields.TargetField;if(Target[WRAPPED])return;
  Object.defineProperty(Target,WRAPPED,{value:true});installSneakTargets(Target);
  Hooks.on('daggerheart.preUseAction',(action,config)=>{
    if(action.type!=='attack'||!sneakItem(action.actor))return;
    config[ID]={...config[ID],sneakConcealed:sneakConcealed(action.actor)};
    prioritizeFaerieWings(action,true);
  });
  const Damage=CONFIG.Dice.daggerheart.DamageRoll,create=Damage.createRollInstance;
  Damage.createRollInstance=function(config){const roll=create.call(this,config);selectSneakBonus(roll,config);return roll;};
}
