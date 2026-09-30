import {ID,featureActive} from '../core.js';
import {HONED_EXPERTISE_KEY} from './honed-expertise-data.js';

const WRAPPED=Symbol.for(`${ID}.honedExpertise`);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function honedExpertiseItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===HONED_EXPERTISE_KEY;})??null:null;}
export function honedExperienceIds(config){if(!honedExpertiseItem(config?.data?.parent))return[];return(config.experiences??[]).filter(id=>config.costs?.some(cost=>cost.extKey===id&&cost.key==='hope'&&cost.enabled!==false));}
export function applyHonedResults(config,ids,values){const free=[];for(let index=0;index<ids.length;index++){if(Number(values[index])<5)continue;const cost=config.costs?.find(entry=>entry.extKey===ids[index]&&entry.key==='hope');if(cost){cost.enabled=false;free.push(ids[index]);}}return free;}
export async function rollHonedExperiences(config,rollDice=async count=>new Roll(`${count}d6`).evaluate()){
  const ids=honedExperienceIds(config);if(!ids.length||config[ID]?.honedExpertise)return[];
  const actor=config.data.parent,roll=await rollDice(ids.length),values=(roll.dice?.[0]?.results??[]).filter(result=>result.active!==false).map(result=>Number(result.result)),free=applyHonedResults(config,ids,values);
  config[ID]={...config[ID],honedExpertise:{ids,values,free}};
  const details=ids.map((id,index)=>{const name=actor.system.experiences?.[id]?.name??id,value=values[index]??0;return `${esc(name)}: <strong>${value}</strong>${value>=5?' — no Hope cost':''}`;}).join('<br>');
  const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flags:{[ID]:{unshakeableRoll:true}},flavor:`<strong>Honed Expertise</strong><p>${details}</p>`});
  if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  return free;
}
export function installHonedExpertise(D20Roll,resolve=rollHonedExperiences){if(!D20Roll||D20Roll[WRAPPED])return;const evaluate=D20Roll.buildEvaluate;D20Roll.buildEvaluate=async function(roll,config,...args){await resolve(config);return evaluate.call(this,roll,config,...args);};Object.defineProperty(D20Roll,WRAPPED,{value:true});}
export function registerHonedExpertise(){installHonedExpertise(CONFIG.Dice.daggerheart.D20Roll);}
