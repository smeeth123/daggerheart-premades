export function selectableDamageDice(roll,{excludeCombo=false}={}){
 return(roll?.dice??[]).flatMap((die,d)=>{
  if(excludeCombo&&die.modifiers?.some(modifier=>['c','cc'].includes(modifier))||typeof die.rerollResult!=='function')return[];
  return die.results?.flatMap((result,r)=>result.dhpDamageRerollReplaced||result.active===false&&!result.discarded?[]:[{id:`${d}:${r}`,faces:Number(die.faces),value:Number(result.result),discarded:Boolean(result.discarded)}])??[];
 });
}
export async function rerollDamageDice(roll,selected,options={}){
 const eligible=new Set(selectableDamageDice(roll,options).map(die=>die.id));
 if(!selected.length||!selected.every(id=>eligible.has(id)))throw Error('Selected damage dice are no longer available.');
 const fresh=[],touched=new Set(),ordered=selected.map(id=>id.split(':').map(Number)).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
 for(const[d,r]of ordered){const die=roll.dice[d],prior=die.results[r];prior.dhpDamageRerollReplaced=true;const result=await die.rerollResult(r);result.hidden=false;fresh.push(result);touched.add(die);}
 for(const die of touched){
  const selection=die.modifiers?.filter(modifier=>/^(?:k|kh|kl|d|dh|dl)\d*$/i.test(modifier))??[];
  if(!selection.length)continue;
  for(const result of die.results)if(!result.dhpDamageRerollReplaced){result.active=true;delete result.discarded;}
  for(const modifier of selection){if(/^k/i.test(modifier))die.keep(modifier);else die.drop(modifier);}
 }
 roll._total=roll._evaluateTotal();roll.resetFormula();return fresh;
}
