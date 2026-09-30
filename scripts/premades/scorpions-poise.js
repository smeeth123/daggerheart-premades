import {recordEvasionBonus} from '../evasion-indicators.js';
import { ID,featureActive } from '../core.js';
import { POISE_KEY } from './scorpions-poise-data.js';
import { MARK_EFFECT } from './marked-for-death-data.js';
export function poiseItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&!item.system?.inactive&&(f?.applied?.key??f?.premade?.key)===POISE_KEY;})??null;}
export function poiseApplies(defender,attacker){
 if(!poiseItem(defender))return false;
 const origins=new Set([...defender.items].flatMap(item=>[...(item.effects??[])].filter(e=>e.id===MARK_EFFECT).map(e=>e.uuid)));
 return [...(attacker?.effects??[])].some(e=>!e.disabled&&!e.isSuppressed&&origins.has(e.origin));
}
export function applyPoise(action,config){
 if(action.type!=='attack')return;
 for(const target of config.targets??[]){
  const defender=foundry.utils.fromUuidSync(target.actorId);
  if(!poiseApplies(defender,action.actor)||!Number.isFinite(Number(target.evasion))||target.evasion==null)continue;
  // Preserve an explicitly different Difficulty; this feature modifies Evasion.
  if(target.difficulty&&Number(target.difficulty)!==Number(target.evasion))continue;
  recordEvasionBonus(config,target,"Scorpion’s Poise",2,defender.name??target.name);
  target.evasion=Number(target.evasion)+2;
  if(target.difficulty)target.difficulty=Number(target.difficulty)+2;
 }
}
export function registerScorpionsPoise(){
 const Target=game.system.api.fields.ActionFields.TargetField,prepare=Target.prototype.prepareConfig;
 Target.prototype.prepareConfig=function(config,...args){const result=prepare.call(this,config,...args);if(result!==false)applyPoise(this,config);return result;};
}
