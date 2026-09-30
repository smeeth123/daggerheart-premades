import {ID} from './core.js';
export function recordEvasionBonus(config,target,feature,bonus,name=target.name){
 const records=config[ID]?.evasionBonuses??[];
 const entry={targetId:target.id??target.actorId,actorUuid:target.actorId,name:name??'Target',feature,bonus:Number(bonus)};
 if(records.some(r=>r.targetId===entry.targetId&&r.feature===feature))return;
 config[ID]={...config[ID],evasionBonuses:[...records,entry]};
}
export async function saveEvasionBonuses(config){
 const entries=config[ID]?.evasionBonuses;if(!entries?.length||!config.message?.update)return;
 const existing=config.message.flags?.[ID]?.evasionBonuses??[],merged=new Map();
 for(const row of [...existing,...entries])merged.set(`${row.targetId}:${row.feature}`,row);
 await config.message.update({[`flags.${ID}.evasionBonuses`]:[...merged.values()]});
}
export function evasionIndicatorLines(message){
 if(!message.isContentVisible)return [];
 return (message.flags?.[ID]?.evasionBonuses??[]).map(row=>{
  const target=message.system?.targets?.find(t=>(t.id??t.actorId)===row.targetId);
  const total=target?.evasion;
  return `${row.name}: ${row.feature} +${row.bonus} Evasion${Number.isFinite(total)?` (Evasion ${total} against this attack)`:''}.`;
 });
}
export function registerEvasionIndicators(){
 for(const Roll of [CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]){
  const post=Roll.buildPost;Roll.buildPost=async function(roll,config,...args){const result=await post.call(this,roll,config,...args);await saveEvasionBonuses(config);return result;};
 }
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  const lines=evasionIndicatorLines(message);if(!lines.length||html.querySelector('.dhp-evasion-bonuses'))return;
  const box=html.ownerDocument.createElement('div');box.className='dhp-evasion-bonuses';
  for(const line of lines){const p=html.ownerDocument.createElement('p');p.textContent=line;box.append(p);}
  html.querySelector('.message-content')?.append(box);
 });
}
