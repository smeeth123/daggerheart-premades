import { ID,featureActive } from '../core.js';
import { VIRTUOSO_KEY } from './virtuoso-data.js';
const SONGS=['xvs7ZKm93AlnZD3F','nvfJ8rOx8baI6POZ','QTTgKnhpNE2XHz4u'],pending=new Map();
export function virtuosoActive(actor){return actor.items.some(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===VIRTUOSO_KEY;});}
export function virtuosoUpdates(item,enabled){
 const changes={},previous=item.flags?.[ID]?.virtuosoUses??{},saved={...previous};
 for(const id of SONGS){
  const action=item.system.actions?.get?.(id)??item.system.actions?.[id];
  if(!action?.uses||action.uses.recovery!=='longRest')continue;
  if(enabled){
   if(!(id in saved))saved[id]=action.uses.max;
   if(String(action.uses.max)!=='2')changes[`system.actions.${id}.uses.max`]='2';
  }else if(id in saved){
   // Restore only the limit this automation installed; preserve later manual edits.
   if(String(action.uses.max)==='2')changes[`system.actions.${id}.uses.max`]=saved[id];
  }
 }
 if(enabled&&JSON.stringify(saved)!==JSON.stringify(previous))changes[`flags.${ID}.virtuosoUses`]=saved;
 if(!enabled&&Object.keys(previous).length)changes[`flags.${ID}.-=virtuosoUses`]=null;
 return changes;
}
export async function syncVirtuoso(actor){
 if(!game.user.isActiveGM||actor?.type!=='character')return;
 const operation=(pending.get(actor.uuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const enabled=virtuosoActive(actor);
  for(const item of actor.items){
   const changes=virtuosoUpdates(item,enabled&&featureActive(item)&&!item.flags?.[ID]?.disabled);
   if(Object.keys(changes).length)await item.update(changes);
  }
 });pending.set(actor.uuid,operation);try{await operation;}finally{if(pending.get(actor.uuid)===operation)pending.delete(actor.uuid);}
}
export function registerVirtuoso(){
 const sync=actor=>{void syncVirtuoso(actor).catch(error=>console.error(`${ID} | Virtuoso`,error));};
 const scan=()=>{const actors=new Map([...game.actors].map(a=>[a.uuid,a]));for(const t of canvas.tokens?.placeables??[])if(t.actor)actors.set(t.actor.uuid,t.actor);for(const actor of actors.values())sync(actor);};
 for(const hook of ['createItem','updateItem','deleteItem'])Hooks.on(hook,item=>sync(item.actor));
 Hooks.on('updateActor',sync);Hooks.on('updateToken',token=>sync(token.actor));Hooks.on('canvasReady',scan);Hooks.on('updateUser',scan);scan();
}
