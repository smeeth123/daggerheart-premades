import { FEATURE_KEY as BACKSTAB_KEY } from './backstab-data.js';
import { ID,featureActive } from '../core.js';
import { AMBUSH_KEY } from './ambush-data.js';
import { MARK_BONUS } from './marked-for-death-data.js';
export function ambushItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===AMBUSH_KEY;})??null;}
export function applyAmbush(roll,config){
 const actor=game.messages.get(config.source?.message)?.system?.action?.actor??config.data?.parent;
 const backstab=actor?.items?.some(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===BACKSTAB_KEY;});
 if((!backstab&&!ambushItem(actor))||config.hasHealing)return;
 const effect=roll.options.bonusEffects?.[MARK_BONUS];if(!effect)return;
 // Clone roll-local changes, leaving the source effect and its selection intact.
 effect.changes=effect.changes.map(change=>{
  if(!/^system\.bonuses\.damage\.(physical|magical)\.dice$/.test(change.key)||typeof change.value!=='string')return change;
  return {...(change.toObject?.()??change),value:change.value.replace(backstab?/d[46]\b/g:/d4\b/g,backstab?'d8':'d6')};
 });
}
export function registerAmbush(){
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,create=Damage.createRollInstance;
 Damage.createRollInstance=function(config){const roll=create.call(this,config);applyAmbush(roll,config);return roll;};
}
