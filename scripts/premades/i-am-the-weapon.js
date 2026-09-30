import { ID } from '../core.js';
import { WEAPON_KEY,WEAPON_EFFECT } from './i-am-the-weapon-data.js';
const pending=new Map();
export async function syncWeaponEvasion(actor){
  if(!game.user.isActiveGM||actor?.type!=='character')return;
  const operation=(pending.get(actor.uuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
    const equipped=actor.items.some(item=>item.type==='weapon'&&item.system.equipped);
    for(const item of actor.items){
      const flags=item.flags?.[ID];
      if(flags?.disabled||item.system.inactive||(flags?.applied?.key??flags?.premade?.key)!==WEAPON_KEY)continue;
      const effect=item.effects.get(WEAPON_EFFECT);if(!effect)continue;
      const value=equipped?0:1,changes=effect.system.changes;
      if(!changes.some(change=>change.key==='system.evasion'&&change.type==='add'&&Number(change.value)!==value))continue;
      const updated=changes.map(change=>{
        const data=change.toObject?.()??{...change};
        return data.key==='system.evasion'&&data.type==='add'?{...data,value}:data;
      });
      await effect.update({'system.changes':updated});
    }
  });
  pending.set(actor.uuid,operation);try{await operation;}finally{if(pending.get(actor.uuid)===operation)pending.delete(actor.uuid);}
}
export function registerIAmTheWeapon(){
  const sync=actor=>{void syncWeaponEvasion(actor).catch(error=>console.error(`${ID} | I Am the Weapon`,error));};
  const scan=()=>{
    const actors=new Map([...game.actors].map(actor=>[actor.uuid,actor]));
    for(const token of canvas.tokens?.placeables??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
    for(const actor of actors.values())sync(actor);
  };
  for(const hook of ['createItem','updateItem','deleteItem'])Hooks.on(hook,item=>sync(item.actor));
  for(const hook of ['createActiveEffect','updateActiveEffect'])Hooks.on(hook,effect=>sync(effect.parent?.actor));
  Hooks.on('updateActor',sync);Hooks.on('updateToken',token=>sync(token.actor));Hooks.on('canvasReady',scan);Hooks.on('updateUser',scan);
  scan();
}
