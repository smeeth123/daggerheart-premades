import { ID } from '../core.js';
import { STANCE_EFFECTS } from './stance-effects.js';
import { severeStormDamage } from './eye-of-the-storm.js';
const QUERY=`${ID}.dropStance`,WRAPPED=Symbol.for(`${ID}.stanceRefresh`);
export function stanceEffects(actor){return [...(actor?.effects??[])].filter(e=>STANCE_EFFECTS.has(e.origin?.split('.').at(-1))||e.flags?.[ID]?.martialStance===true);}
export async function dropStances(actor,keepId=null){const ids=stanceEffects(actor).filter(e=>e.id!==keepId).map(e=>e.id);if(ids.length)await actor.deleteEmbeddedDocuments('ActiveEffect',ids);}
function actors(){const all=new Map([...game.actors].map(a=>[a.uuid,a]));for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)all.set(token.actor.uuid,token.actor);return [...all.values()];}
export function installStanceRefresh(actions,clear){const native=actions?.refreshActors;if(typeof native!=='function'||native[WRAPPED])return;const wrapped=async function(...args){const scene=game.user.isGM&&this.refreshSelections?.scene?.selected;const result=await native.apply(this,args);if(scene)await clear();return result;};wrapped[WRAPPED]=true;actions.refreshActors=wrapped;}
export function registerStanceLifecycle(){
 CONFIG.queries[QUERY]=async(request,{user})=>{if(!game.user.isActiveGM||!user?.active)return false;const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;await dropStances(actor);return true;};
 const safely=promise=>{void promise.catch(e=>{console.error(`${ID} | Stance cleanup`,e);ui.notifications.error(`Stance cleanup: ${e.message}`);});};
 Hooks.on('createActiveEffect',effect=>{if(game.user.isActiveGM&&effect.parent?.documentName==='Actor'&&!effect.disabled&&stanceEffects(effect.parent).some(e=>e.id===effect.id))safely(dropStances(effect.parent,effect.id));});
 Hooks.on('updateActiveEffect',(effect,change)=>{if(game.user.isActiveGM&&change.disabled===false&&effect.parent?.documentName==='Actor'&&stanceEffects(effect.parent).some(e=>e.id===effect.id))safely(dropStances(effect.parent,effect.id));});
 Hooks.on('daggerheart.postTakeDamage',(actor,updates)=>{if(!severeStormDamage(updates)||!stanceEffects(actor).length)return;const gm=game.users.activeGM;if(gm)safely(gm.isSelf?dropStances(actor):gm.query(QUERY,{actorUuid:actor.uuid},{timeout:15000}));});
 Hooks.on('updateActor',(actor,change)=>{if(!game.user.isActiveGM)return;const value=change['system.resources.hitPoints.value']??change.system?.resources?.hitPoints?.value;if(value!==undefined&&Number(value)>=Number(actor.system.resources.hitPoints.max))safely(dropStances(actor));});
 const clear=async()=>{for(const actor of actors())await dropStances(actor);};
 const install=()=>{installStanceRefresh(CONFIG.ui.daggerheartMenu?.DEFAULT_OPTIONS?.actions,clear);installStanceRefresh(ui.daggerheartMenu?.options?.actions,clear);};install();Hooks.on('renderDaggerheartMenu',app=>installStanceRefresh(app.options.actions,clear));
}
