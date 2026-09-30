import { ID } from '../core.js';
import { HARDY_KEY,HARDY_ACTION } from './hardy-data.js';
const WRAPPED=Symbol.for(`${ID}.hardyRest`),payments=new Map();
export function hardyItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===HARDY_KEY;})??null;
}
export async function clearHardyHP(actor){
  if(!actor?.testUserPermission(game.user,'OWNER'))return;
  const operation=(payments.get(actor.uuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
    if(!hardyItem(actor))return;
    const value=Number(actor.system.resources?.hitPoints?.value);
    if(!Number.isFinite(value)||value<=0)return;
    const next=Math.max(0,value-1),updated=await actor.update({'system.resources.hitPoints.value':next});
    if(!updated||Number(actor.system.resources.hitPoints.value)!==next)throw new Error('Hardy could not clear a Hit Point.');
    const name=String(actor.name??'Character').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    await ChatMessage.create({user:game.user.id,speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>Hardy — ${name}</strong>: cleared 1 Hit Point.</p>`,whisper:[],blind:false});
  });
  payments.set(actor.uuid,operation);try{return await operation;}finally{if(payments.get(actor.uuid)===operation)payments.delete(actor.uuid);}
}
export function installHardy(Downtime,clear=clearHardyHP){
  if(Downtime[WRAPPED])return;
  const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime,started=new WeakMap();
  const take=async function(...args){
    const selected=Object.values(this.moveData??{}).some(category=>Object.values(category.moves??{}).some(move=>move.selected>0));
    if(selected){
      if(!started.has(this))started.set(this,Promise.resolve().then(()=>clear(this.actor)));
      await started.get(this);
    }
    return native.apply(this,args);
  };
  Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;
  Downtime.takeDowntime=take;
  Object.defineProperty(Downtime,WRAPPED,{value:true});
}
export function registerHardy(){
  installHardy(game.system.api.applications.dialogs.Downtime);
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(flags?.disabled||action.id!==HARDY_ACTION||(flags?.applied?.key??flags?.premade?.key)!==HARDY_KEY)return;
    ui.notifications.info('Hardy clears a Hit Point automatically when you begin a Short or Long Rest.');return false;
  });
}
