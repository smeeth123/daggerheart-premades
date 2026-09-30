import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { MAESTRO_KEY } from './maestro-data.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
import { withHopeLock } from './hope-lock.js';
const PROMPT=`${ID}.maestroPrompt`,seen=new Set();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function maestroItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===MAESTRO_KEY;})??null;}
export function maestroChoices(actor){const r=actor?.system?.resources;return [Number(r?.hope?.value)<Number(r?.hope?.max)?'hope':null,Number(r?.stress?.value)>0?'stress':null].filter(Boolean);}
export function rallyGift(effect){return effect?.parent?.documentName==='Actor'&&effect.parent.type==='character'&&!effect.disabled&&Boolean(effect.origin)&&effect.system?.changes?.some(c=>c.key==='system.bonuses.rally');}
export async function promptMaestro(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER'))return null;
 const choices=maestroChoices(actor);if(!choices.length)return null;
 return timedDialog(`Maestro — ${actor.name}`,`<p>${esc(data.sourceName)} gave you a Rally Die. Choose an additional benefit.</p>`,[...choices.map(choice=>({action:choice,label:choice==='hope'?'Gain 1 Hope':'Clear 1 Stress',callback:()=>choice})),{action:'decline',label:'Decline',default:true,callback:()=>null}]);
}
export async function offerMaestro(effect,ask=promptMaestro){
 if(!game.user.isActiveGM||!rallyGift(effect)||seen.has(effect.uuid)||effect.flags?.[ID]?.maestroHandled)return false;
 const sourceEffect=await fromUuid(effect.origin),source=sourceEffect?.parent?.actor;
 const actor=effect.parent;if(!source||source.uuid===actor.uuid||!maestroItem(source))return false;
 if(seen.has(effect.uuid))return false;
 seen.add(effect.uuid);
 // Persist before prompting: each awarded die offers this benefit only once.
 await effect.update({[`flags.${ID}.maestroHandled`]:true});
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid,sourceName:source.name};
 const choice=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 if(!['hope','stress'].includes(choice))return false;
 return withHopeLock(actor.uuid,async()=>{
  if(!actor.effects.get(effect.id)||!maestroItem(source)||!maestroChoices(actor).includes(choice))return false;
  const value=Number(actor.system.resources[choice].value)+(choice==='hope'?1:-1);
  await actor.update({[`system.resources.${choice}.value`]:value});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Maestro</strong>: ${esc(actor.name)} ${choice==='hope'?'gains 1 Hope':'clears 1 Stress'}.</p>`});return true;
 });
}
export function registerMaestro(){
 CONFIG.queries[PROMPT]=promptMaestro;
 Hooks.on('createActiveEffect',effect=>{void offerMaestro(effect).catch(error=>{console.error(`${ID} | Maestro`,error);ui.notifications.error(`Maestro: ${error.message}`);});});
}
