import {ID} from './core.js';
import {untimedDialog} from './dialog.js';
import {decisionBudget} from './settings.js';

const QUERY=`${ID}.chooseLoadout`,MAX_LOADOUT=5,WRAPPED=Symbol.for(`${ID}.restLoadout`);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function domainCards(actor){
  return [...(actor?.items??[])].filter(item=>item.type==='domainCard').sort((a,b)=>Number(a.sort??0)-Number(b.sort??0)||String(a.name).localeCompare(String(b.name)));
}
export function cardDescription(card){
  const html=String(card?.system?.description??'');
  const element=globalThis.document?.createElement?.('div');
  if(element){element.innerHTML=html;return String(element.textContent??'').replace(/\s+/g,' ').trim();}
  return html.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();
}
export function selectedLoadout(actor){return domainCards(actor).filter(card=>!card.system?.inVault).slice(0,MAX_LOADOUT).map(card=>card.id);}
export function restComplete(app){return Boolean(app?.nrChoices&&Object.values(app.nrChoices).every(category=>Number(category.taken)>=Number(category.max)));}
export function restWillComplete(app){
  if(!app?.nrChoices||!app?.moveData)return false;
  return Object.entries(app.nrChoices).every(([key,category])=>{
    const selected=Object.values(app.moveData[key]?.moves??{}).reduce((total,move)=>total+Math.max(0,Number(move.selected)||0),0);
    return Number(category.taken)+selected>=Number(category.max);
  });
}
export function validateLoadout(actor,ids){
  if(actor?.type!=='character'||!Array.isArray(ids))return null;
  const unique=[...new Set(ids)];if(unique.length!==ids.length||unique.length>MAX_LOADOUT)return null;
  const cards=domainCards(actor),owned=new Set(cards.map(card=>card.id));if(unique.some(id=>typeof id!=='string'||!owned.has(id)))return null;
  return{cards,selected:new Set(unique)};
}
export async function applyLoadout(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid),valid=validateLoadout(actor,request.cardIds);
  if(!valid||!actor.testUserPermission(user,'OWNER'))return false;
  const updates=valid.cards.filter(card=>Boolean(card.system?.inVault)===valid.selected.has(card.id)).map(card=>({_id:card.id,'system.inVault':!valid.selected.has(card.id)}));
  if(updates.length)await actor.updateEmbeddedDocuments('Item',updates);
  return true;
}
async function dispatch(actor,cardIds){
  const gm=game.users.activeGM;if(!gm)throw Error('Choose Loadout needs an active GM.');
  const request={actorUuid:actor.uuid,cardIds};
  return gm.isSelf?applyLoadout(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});
}
export async function promptChooseLoadout(actor,send=dispatch){
  const cards=domainCards(actor);if(!cards.length)return false;
  const selected=new Set(selectedLoadout(actor));
  const content=`<p>Choose up to <strong>${MAX_LOADOUT} Domain Cards</strong> for your active loadout. Every other Domain Card will remain in your vault.</p><p class="dhp-loadout-count" aria-live="polite"></p><div class="dhp-loadout-list">${cards.map(card=>`<label class="dhp-loadout-card" data-tooltip="${esc(cardDescription(card)||'No description available.')}" data-tooltip-direction="UP"><input type="checkbox" name="dhpLoadout" value="${esc(card.id)}"${selected.has(card.id)?' checked':''}><img src="${esc(card.img)}" alt=""><span>${esc(card.name)}</span></label>`).join('')}</div>`;
  const choice=await untimedDialog(`Choose Loadout — ${actor.name}`,content,[
    {action:'apply',label:'Apply Loadout',callback:(_event,_button,dialog)=>[...dialog.element.querySelectorAll('[name="dhpLoadout"]:checked')].map(input=>input.value)},
    {action:'cancel',label:'Keep Current Loadout',default:true,callback:()=>null}
  ],dialog=>{
    const inputs=[...dialog.element.querySelectorAll('[name="dhpLoadout"]')],counter=dialog.element.querySelector('.dhp-loadout-count');
    const update=()=>{const count=inputs.filter(input=>input.checked).length;if(counter)counter.textContent=`${count} of ${MAX_LOADOUT} selected`;for(const input of inputs)input.disabled=!input.checked&&count>=MAX_LOADOUT;};
    for(const input of inputs)input.addEventListener('change',update);update();
  });
  if(!choice)return false;
  if(!await send(actor,choice))throw Error('The selected loadout could not be saved.');
  return true;
}
export function installRestLoadout(Downtime,prompt=promptChooseLoadout){
  if(Downtime[WRAPPED])return;
  const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime;
  const take=async function(...args){
    const completing=restWillComplete(this),result=await native.apply(this,args);
    if(completing){await new Promise(resolve=>setTimeout(resolve,0));await prompt(this.actor);}
    return result;
  };
  Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;
  Object.defineProperty(Downtime,WRAPPED,{value:true});
}
export function registerRestLoadout(){CONFIG.queries[QUERY]=applyLoadout;installRestLoadout(game.system.api.applications.dialogs.Downtime);}
