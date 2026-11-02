import {ID,featureActive} from '../core.js';
import {preservedArmorDamage} from './armor-preservation.js';
import {ARMOR_RESILIENT_KEY} from './armor-resilient-data.js';
export function resilientArmor(actor){const item=actor?.system?.armor;return actor?.type==='character'&&item?.type==='armor'&&item.system.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===ARMOR_RESILIENT_KEY&&item.system.armorFeatures?.some(f=>f.value==='resilient')?item:null;}
export function resilientLastSlot(actor,result){const score=actor?.system?.armorScore,current=Number(score?.value),max=Number(score?.max),count=(result?.armorChanges??[]).reduce((sum,row)=>sum+Number(row.amount),0);return Boolean(resilientArmor(actor)&&Number.isInteger(current)&&Number.isInteger(max)&&max>0&&current>=0&&current<max&&Number.isInteger(count)&&count>0&&current+count===max);}
export async function applyResilient(actor,result,dialog,rollDice=async()=>new Roll('1d6').evaluate()){
  if(!resilientLastSlot(actor,result))return result;
  const armorUuid=resilientArmor(actor).uuid,score=actor.system.armorScore.value,roll=await rollDice();
  const dice=(roll?.dice??[]).flatMap(d=>d.results??[]).filter(r=>r.active!==false&&!r.discarded),value=Number(dice[0]?.result);
  if(dice.length!==1||!Number.isInteger(value)||value<1||value>6)throw Error('Resilient produced an invalid d6 result.');
  const success=value===6&&resilientArmor(actor)?.uuid===armorUuid&&actor.system.armorScore.value===score&&resilientLastSlot(actor,result);
  let adjusted=result;
  if(success){
    const changes=result.armorChanges.map(row=>({...row})),index=changes.findLastIndex(row=>row.amount>0),removed=changes[index];removed.amount--;
    const source=dialog?.marks?.armor?.find(row=>row.effect.uuid===removed.uuid),mark=source&&Object.entries(source.marks).filter(([,m])=>m.selected).at(-1);
    const linked=mark&&(dialog.getDamageInfo().selectedStressMarks??[]).some(m=>m.armorMarkId===mark[0]);
    // Ordinary Armor reduces one threshold, so exchanging its cost does not change the preview.
    // For enhanced Armor, replace only that slot's reduction with Resilient's exactly one threshold.
    const modifiedDamage=preservedArmorDamage(actor,dialog,1,result.modifiedDamage);
    adjusted={...result,modifiedDamage,armorChanges:changes.filter(row=>row.amount>0),stressSpent:Math.max(0,Number(result.stressSpent??0)-(linked?1:0))};
    if(result.resourceCosts)adjusted.resourceCosts=result.resourceCosts.map(row=>row.key==='stress'?{...row,value:Math.max(0,row.value-(linked?1:0))}:{...row}).filter(row=>row.value);
  }
  try { await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`Resilient — ${success?'last Armor Slot preserved; severity reduced by one threshold':'Armor marked normally'}`}); }
  catch(error) { console.warn(`${ID} | Resilient chat notification`,error); }
  return adjusted;
}
export function registerArmorResilient(){Hooks.on('daggerheart.preUseAction',action=>{if(resilientArmor(action.actor)===action.item&&action.item.system.armorFeatures.some(f=>f.value==='resilient'&&f.actionIds?.includes(action.id))){ui.notifications.info('Resilient rolls automatically when damage reduction would mark your last Armor Slot.');return false;}});}
