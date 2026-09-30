import { ID } from '../core.js';
import { STURDY_KEY } from './sturdy-data.js';
export function sturdyActive(actor){
  const hp=actor?.system?.resources?.hitPoints;
  if(actor?.type!=='character'||Number(hp?.max)-Number(hp?.value)!==1)return false;
  return actor.items?.some(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===STURDY_KEY;
  })??false;
}
export function sturdyTargets(config){
  if(config.actionType==='reaction')return false;
  const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null);
  const item=actor?.items?.get?.(config.source?.item);
  const actions=[actor?.system?.attack,item?.system?.attack,...(item?.system?.actionsList??[])];
  const action=actions.find(action=>action&&(action.id??action._id)===config.source?.action);
  if(action?.type!=='attack')return false;
  const targets=Array.isArray(config.targets)?config.targets:[...(game.user.targets??[])];
  return targets.some(target=>{
    const token=target.document??target,sceneToken=target.id?canvas.tokens?.get(target.id):null;
    const defender=target.actor??token.actor??(sceneToken?.actor?.uuid===target.actorId?sceneToken.actor:null)??(target.actorId?foundry.utils.fromUuidSync(target.actorId):null);
    return sturdyActive(defender);
  });
}

const effectMarker='sturdyIndicator',pending=new Map();
export async function syncSturdyEffect(actor){
  if(!game.user.isActiveGM||actor?.type!=='character')return;
  const prior=pending.get(actor.uuid)??Promise.resolve();
  const operation=prior.catch(()=>{}).then(async()=>{
    const existing=actor.effects.filter(effect=>effect.flags?.[ID]?.[effectMarker]);
    if(!sturdyActive(actor)){
      if(existing.length)await actor.deleteEmbeddedDocuments('ActiveEffect',existing.map(effect=>effect.id));
      return;
    }
    if(existing.length){
      if(existing[0].disabled)await existing[0].update({disabled:false});
      if(existing.length>1)await actor.deleteEmbeddedDocuments('ActiveEffect',existing.slice(1).map(effect=>effect.id));
      return;
    }
    await actor.createEmbeddedDocuments('ActiveEffect',[{
      name:'Sturdy',img:'icons/magic/defensive/shield-barrier-glowing-triangle-purple-orange.webp',type:'base',
      description:'Attacks against you have disadvantage while you have 1 Hit Point remaining.',
      disabled:false,transfer:false,showIcon:CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
      system:{changes:[],duration:{type:'',description:''}},flags:{[ID]:{[effectMarker]:true}}
    }]);
  });
  pending.set(actor.uuid,operation);
  try{return await operation;}finally{if(pending.get(actor.uuid)===operation)pending.delete(actor.uuid);}
}
export function registerSturdyEffects(){
  const sync=actor=>{void syncSturdyEffect(actor).catch(error=>console.error(`${ID} | Sturdy indicator`,error));};
  const scan=()=>{
    const actors=new Map([...game.actors].map(actor=>[actor.uuid,actor]));
    for(const token of canvas.tokens?.placeables??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
    for(const actor of actors.values())sync(actor);
  };
  Hooks.on('updateActor',sync);
  for(const hook of ['createItem','updateItem','deleteItem'])Hooks.on(hook,item=>sync(item.actor));
  Hooks.on('createToken',token=>sync(token.actor));
  Hooks.on('updateToken',token=>sync(token.actor));
  Hooks.on('canvasReady',scan);
  Hooks.on('updateUser',scan);
  scan();
}
