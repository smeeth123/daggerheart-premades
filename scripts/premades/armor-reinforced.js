import {ID,featureActive} from '../core.js';
import {ARMOR_REINFORCED_KEY} from './armor-reinforced-data.js';
const WRAPPED=Symbol.for(`${ID}.armorReinforced`),queues=new Map();
export function reinforcedArmor(actor){const item=actor?.system?.armor;return actor?.type==='character'&&item?.type==='armor'&&item.system.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===ARMOR_REINFORCED_KEY&&item.system.armorFeatures?.some(f=>f.value==='reinforced')?item:null;}
export function reinforcedFull(actor){const score=actor?.system?.armorScore;return Boolean(reinforcedArmor(actor)&&Number.isInteger(Number(score?.value))&&Number.isInteger(Number(score?.max))&&Number(score.max)>0&&Number(score.value)>=Number(score.max));}
export function reinforcedEffects(actor){return [...(actor?.effects??[])].filter(effect=>effect.flags?.[ID]?.armorReinforced);}
export function reinforcedEffect(armor){return {name:'Reinforced',img:'icons/magic/defensive/shield-barrier-glowing-triangle-green.webp',type:'base',origin:armor.uuid,transfer:false,disabled:false,showIcon:1,statuses:[],description:'<p>+2 to Major and Severe damage thresholds while all Armor Slots are marked. Ends when any slot is cleared.</p>',system:{changes:[{key:'system.damageThresholds.major',type:'add',value:'2',phase:'initial'},{key:'system.damageThresholds.severe',type:'add',value:'2',phase:'initial'}],duration:{type:'',description:'Until at least one Armor Slot is cleared.'},conditionals:[{type:'dataCompare',key:'system.armorScore.value',comparator:'greaterEquals',value:'@system.armorScore.max'},{type:'dataCompare',key:'system.armorScore.max',comparator:'greater',value:'0'}],rangeDependence:null,targetDispositions:[]},flags:{[ID]:{armorReinforced:{armorUuid:armor.uuid}}}};}
export async function syncReinforced(actor){
  if(!game.user.isActiveGM||actor?.type!=='character')return false;
  const previous=queues.get(actor.uuid)??Promise.resolve(),operation=previous.catch(()=>{}).then(async()=>{
    if(!game.user.isActiveGM)return false;
    const armor=reinforcedArmor(actor),effects=reinforcedEffects(actor),full=reinforcedFull(actor);
    const retained=full?effects.find(effect=>effect.flags[ID].armorReinforced.armorUuid===armor.uuid&&!effect.disabled&&!effect.isSuppressed):null;
    const stale=effects.filter(effect=>effect!==retained);
    if(stale.length)await actor.deleteEmbeddedDocuments('ActiveEffect',stale.map(effect=>effect.id));
    if(!reinforcedFull(actor))return false;
    if(retained)return true;
    const current=reinforcedArmor(actor);if(current?.uuid!==armor?.uuid)return false;
    const created=await actor.createEmbeddedDocuments('ActiveEffect',[reinforcedEffect(current)]);
    if(!created?.length)throw Error('Reinforced effect creation was cancelled.');
    return true;
  });queues.set(actor.uuid,operation);try{return await operation;}finally{if(queues.get(actor.uuid)===operation)queues.delete(actor.uuid);}
}
export function installReinforced(Actor,sync=syncReinforced){if(!Actor||Object.hasOwn(Actor,WRAPPED))return;const take=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(...args){
  if(game.user.isActiveGM&&(reinforcedArmor(this)||reinforcedEffects(this).length))await sync(this);
  const result=await take.apply(this,args);
  if(game.user.isActiveGM&&(reinforcedArmor(this)||reinforcedEffects(this).length))try{await sync(this);}catch(error){console.error(`${ID} | Reinforced after damage`,error);ui.notifications.error('Reinforced: damage completed, but the threshold effect could not be updated. Check the actor’s effects.');}
  return result;
};Object.defineProperty(Actor,WRAPPED,{value:true});}
export function registerArmorReinforced(){
  const changed=actor=>{if(actor?.type==='character'&&(reinforcedArmor(actor)||reinforcedEffects(actor).length))void syncReinforced(actor).catch(error=>{console.error(`${ID} | Reinforced effect`,error);ui.notifications.error('Reinforced could not update its threshold effect. Check the actor’s effects.');});};
  const all=()=>{const actors=new Map();for(const actor of game.actors??[])actors.set(actor.uuid,actor);for(const token of globalThis.canvas?.tokens?.placeables??[])if(token.actor)actors.set(token.actor.uuid,token.actor);for(const actor of actors.values())changed(actor);};
  for(const event of ['updateItem','createItem','deleteItem'])Hooks.on(event,item=>changed(item.actor));
  Hooks.on('updateActor',actor=>changed(actor));
  for(const event of ['createActiveEffect','updateActiveEffect','deleteActiveEffect'])Hooks.on(event,effect=>changed(effect.parent?.documentName==='Actor'?effect.parent:effect.parent?.actor));
  Hooks.on('canvasReady',all);all();installReinforced(CONFIG.Actor.documentClass);
}
