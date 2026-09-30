// These premades grant the same bonus to physical and magical damage.
// Daggerheart 2.10 represents that as one unrestricted damage change.
export function modernDamageEffects(data){
 if(!globalThis.CONFIG?.DH?.EFFECTS?.conditionalTypes)return data;
 for(const effect of data.effects??[]){
  const changes=effect.system?.changes;if(!changes)continue;
  const converted=[];
  for(const change of changes){const match=change.key?.match(/^system\.bonuses\.damage\.(physical|magical)\.(bonus|dice)$/);const next=match?{...change,key:`system.bonuses.damage.${match[2]}`}:change;if(!match||!converted.some(c=>c.key===next.key&&c.value===next.value&&c.type===next.type))converted.push(next);}
  effect.system.changes=converted;
  effect.system.conditionals??=[];
 }
 return data;
}
export function normalizeEffectSource(effect){
 const Effect=globalThis.CONFIG?.ActiveEffect?.documentClass;
 let source=structuredClone(effect);
 if(typeof Effect?.migrateData==='function')source=Effect.migrateData(source)??source;
 if(typeof Effect?.cleanData==='function')source=Effect.cleanData(source);
 if(typeof Effect?.fromSource==='function'){
  try{source=Effect.fromSource(source,{strict:false}).toObject();}catch(_error){/* Fall back to cleaned source outside a live document context. */}
 }
 return source;
}
