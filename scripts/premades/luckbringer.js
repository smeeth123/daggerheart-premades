import { ID } from '../core.js';
import { LUCKBRINGER_KEY,LUCKBRINGER_ACTION } from './luckbringer-data.js';
import { withHopeLock } from './hope-lock.js';
const WRAPPED=Symbol.for(`${ID}.luckbringerRefresh`);
const actionFor=item=>item.system.actions?.get?.(LUCKBRINGER_ACTION)??item.system.actions?.[LUCKBRINGER_ACTION];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function luckbringerItem(actor){
  return actor.items?.find(item=>{
    const flags=item.flags?.[ID],action=actionFor(item);
    return !flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===LUCKBRINGER_KEY&&action?.uses?.recovery==='session'&&Number(action.uses.value??0)===0;
  })??null;
}
export async function applyLuckbringer(){
  if(!game.user.isGM)return;
  const party=game.actors.party;if(!party)return;
  const members=[...new Map(party.system.partyMembers.filter(actor=>actor?.uuid).map(actor=>[actor.uuid,actor])).values()];
  const sources=members.map(actor=>({actor,item:luckbringerItem(actor)})).filter(source=>source.item);
  if(!sources.length)return;
  const summaries=[];
  for(const {actor,item}of sources){
    // The native Session refresh has finished. Consume its refreshed action once.
    if(luckbringerItem(actor)?.uuid!==item.uuid)continue;
    const updated=await item.update({[`system.actions.${LUCKBRINGER_ACTION}.uses.value`]:1});
    if(!updated||Number(actionFor(item)?.uses.value)!==1)throw new Error('Could not spend Luckbringer use.');
    const gains=[];
    for(const member of members){
      await withHopeLock(member.uuid,async()=>{
        const hope=member.system.resources?.hope;
        if(!hope||!Number.isFinite(Number(hope.value))||!Number.isFinite(Number(hope.max))){gains.push(`${esc(member.name)}: no Hope resource`);return;}
        const before=Number(hope.value),after=Math.min(Number(hope.max),before+1);
        if(after>before){
          const result=await member.update({'system.resources.hope.value':after});
          if(!result||Number(member.system.resources.hope.value)!==after)throw new Error(`Could not grant Luckbringer Hope to ${member.name}.`);
        }
        gains.push(`${esc(member.name)}: ${after>before?'+1 Hope':'already at maximum Hope'}`);
      });
    }
    summaries.push(`<p><strong>${esc(actor.name)} — Luckbringer</strong></p><p>${gains.join('; ')}.</p>`);
  }
  if(summaries.length)await ChatMessage.create({user:game.user.id,speaker:{alias:'Luckbringer'},content:`<h3>Luckbringer — ${esc(party.name)}</h3>${summaries.join('')}`,whisper:[],blind:false});
}
export function installLuckbringerRefresh(actions,apply=applyLuckbringer){
  const native=actions?.refreshActors;if(typeof native!=='function'||native[WRAPPED])return;
  let pending=null;
  const wrapped=async function(...args){
    // Ignore repeated clicks while this same refresh is still running.
    if(pending)return pending;
    const session=game.user.isGM&&Boolean(this.refreshSelections?.session?.selected);
    const operation=(async()=>{const result=await native.apply(this,args);if(session)await apply();return result;})();
    pending=operation;try{return await operation;}finally{pending=null;}
  };
  Object.defineProperty(wrapped,WRAPPED,{value:true});actions.refreshActors=wrapped;
}
export function registerLuckbringer(){
  installLuckbringerRefresh(CONFIG.ui.daggerheartMenu?.DEFAULT_OPTIONS?.actions);
  installLuckbringerRefresh(ui.daggerheartMenu?.options?.actions);
  Hooks.on('renderDaggerheartMenu',app=>installLuckbringerRefresh(app.options.actions));
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(flags?.disabled||action.id!==LUCKBRINGER_ACTION||(flags?.applied?.key??flags?.premade?.key)!==LUCKBRINGER_KEY)return;
    ui.notifications.info('Luckbringer applies automatically to the active Party after a GM Session refresh.');return false;
  });
}
