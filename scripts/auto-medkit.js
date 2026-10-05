import {ID,supported,featureActive,matches,metadata} from './core.js';
import {library,apply} from './service.js';
import {autoMedkitEnabled} from './settings.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function autoMedkitEligible(item){
  const actor=item?.actor,flags=item?.flags?.[ID];
  return Boolean(actor&&actor.documentName==='Actor'&&!actor.pack&&!item.pack&&item.isOwner&&supported(item)&&featureActive(item)&&!flags?.disabled&&!flags?.applied&&!flags?.premade);
}
export async function autoMedkitItems(items,{catalog=library,applyPremade=apply,enabled=autoMedkitEnabled,authority=()=>game.user.isActiveGM}={}){
  if(!authority()||!enabled())return [];
  const candidates=[...new Map(items.filter(autoMedkitEligible).map(item=>[item.uuid,item])).values()];
  if(!candidates.length)return [];
  const {entries}=await catalog(),summary=[];
  for(const item of candidates){
    // Recheck after loading the library; an item may have been removed, disabled,
    // or manually Medkitted while the asynchronous compendium read was running.
    if(!authority()||!enabled())break;
    if(!autoMedkitEligible(item)||item.actor.items.get(item.id)!==item)continue;
    const matching=matches(item,entries);
    if(matching.length>1){summary.push(`${item.name}: Multiple matching premades; choose one in Medkit.`);continue;}
    if(matching.length!==1)continue;
    try{
      await applyPremade(item,matching[0]);
      summary.push(`${item.name}: Added ${matching[0].data.name} v${metadata(matching[0].data).version}.`);
    }catch(error){summary.push(`${item.name}: Failed — ${error.message}`);}
  }
  return summary;
}
export function registerAutoMedkit(){
  const pending=new Map(),running=new Map(),applying=new Set();
  const allowed=actor=>game.user.isActiveGM&&autoMedkitEnabled()&&actor?.documentName==='Actor'&&!actor.pack&&actor.isOwner;
  const flush=async key=>{
    const batch=pending.get(key);if(!batch)return;pending.delete(key);
    const previous=running.get(key)??Promise.resolve();
    const job=previous.catch(()=>{}).then(async()=>{
      if(!allowed(batch.actor))return;
      const items=batch.all?[...batch.actor.items]:[...batch.ids].map(id=>batch.actor.items.get(id)).filter(Boolean);
      const summary=await autoMedkitItems(items,{applyPremade:async(item,entry)=>{
        applying.add(item.uuid);try{return await apply(item,entry);}finally{applying.delete(item.uuid);}
      }});
      if(summary.length)await ChatMessage.create({
        content:`<h3>Auto-Medkit — ${esc(batch.actor.name)}</h3><ul>${summary.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>`,
        whisper:[game.user.id],speaker:{alias:'Daggerheart Premades'}
      });
    });running.set(key,job);
    try{await job;}catch(error){console.error(`${ID} | Auto-Medkit`,error);ui.notifications.error(`Auto-Medkit: ${error.message}`);}
    finally{if(running.get(key)===job)running.delete(key);}
  };
  const queue=(actor,item=null)=>{
    if(!allowed(actor)||applying.has(item?.uuid))return;
    const batch=pending.get(actor.uuid)??{actor,ids:new Set(),all:false};
    if(item)batch.ids.add(item.id);else batch.all=true;
    clearTimeout(batch.timer);
    // Class/subclass drops create linked documents in multiple operations.
    batch.timer=setTimeout(()=>{void flush(actor.uuid);},150);pending.set(actor.uuid,batch);
  };
  Hooks.on('createItem',item=>{
    if(supported(item))queue(item.actor,item);
    else if(['class','subclass'].includes(item.type))queue(item.actor);
  });
  Hooks.on('createActor',actor=>queue(actor));
  Hooks.on(`${ID}.exchangedDomainCard`,item=>queue(item.actor,item));
  Hooks.on('updateItem',(item,change)=>{
    if(applying.has(item.uuid))return;
    if(['class','subclass'].includes(item.type))queue(item.actor);
    else if(supported(item)&&(['system.inactive','system.granter'].some(key=>Object.hasOwn(change,key))||change.system&&['inactive','granter'].some(key=>Object.hasOwn(change.system,key))))queue(item.actor,item);
  });
  Hooks.on('updateActor',(actor,change)=>{
    const keys=Object.keys(change.system??{});
    if(['class','multiclass','level'].some(key=>keys.includes(key)||Object.keys(change).some(path=>path===`system.${key}`||path.startsWith(`system.${key}.`))))queue(actor);
  });
}
