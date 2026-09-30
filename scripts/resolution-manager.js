import { decisionBudget } from './settings.js';
import { decisionClock, decisionCountdown, setDecisionTimersPaused, installDecisionQueryTimeouts, decisionNow, decisionTimeout, clearDecisionTimeout } from './decision-clock.js';
import { ID } from './core.js';
import { ResolutionSession,canSeeRoll } from './resolution-state.js';
const Q=`${ID}.resolution`,VIEW=`${ID}.resolutionView`,NOTICE=`${ID}.pendingNotice`;
const sessions=new Map(),tickets=new Map(),notices=new Map();
const coordinatorEpoch=`${decisionNow()}-${Math.random()}`;
const providers=new Map();let Panel,panel,localView={sessions:[],notices:[]},registered=false,revision=0;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const registerResolutionProvider=(kind,validate)=>providers.set(kind,validate);
export async function resolutionRequest(data){
  const gm=game.users.activeGM;if(!gm)throw new Error('Roll resolution needs an active GM.');
  return gm.isSelf?handleResolution(data,{user:game.user}):gm.query(Q,data,{timeout:decisionBudget(75000)});
}
export function consumeResolutionTicket(token,kind,itemUuid,user){
  const ticket=tickets.get(token),session=sessions.get(ticket?.sessionId);
  if(session?.phase!=='Resolving'||session.selection!==ticket?.rowId)return false;
  if(!ticket||ticket.consumed||ticket.executor!==user.id||ticket.kind!==kind||ticket.itemUuid!==itemUuid||ticket.expires<decisionNow())return false;
  ticket.consumed=true;return true;
}
export async function resolutionTicketStatus(token,status){
  const ticket=tickets.get(token),session=sessions.get(ticket?.sessionId);
  if(session?.phase==='Resolving'){
    session.rows.get(session.selection).status=status;
    if(status==='Awaiting consent')session.deadline=decisionNow()+decisionBudget(60000);
    await broadcast();
  }
}
async function broadcast(){
  const currentRevision=++revision;
  const deliveries=[...game.users].filter(user=>user.active).map(async user=>{
    const visible=[];
    for(const s of sessions.values()){
      if(!s.audience.has(user.id)&&!user.isGM)continue;
      const disclosed=canSeeRoll(s.message,user);
      visible.push({id:s.id,round:s.round,phase:s.phase,deadline:s.deadline,
        title:disclosed?s.title:'Private roll',result:disclosed?s.result:'Roll details are private',
        rows:[...s.rows.values()].filter(row=>disclosed||user.isGM||row.ownerId===user.id).map(row=>({
          id:row.id,label:row.label,description:row.description,cost:row.cost,useLabel:row.useLabel,declineLabel:row.declineLabel,passLabel:row.passLabel,owner:game.users.get(row.ownerId)?.name??'GM',ownerId:row.ownerId,status:row.status
        }))});
    }
    const view={coordinator:`${game.user.id}:${coordinatorEpoch}`,revision:currentRevision,sessions:visible,notices:user.isGM?[...notices.values()]:[]};
    try{if(user.isSelf)receiveView(view);else await user.query(VIEW,view,{timeout:5000});}
    catch(error){console.warn(`${ID} | Pending panel delivery failed`,user.id,error);}
  });
  await Promise.allSettled(deliveries);
}
function settle(s,answer){clearDecisionTimeout(s.timer);const resolve=s.waiter;s.waiter=null;resolve?.(answer);}
export async function handleResolution(data,{user}){
  if(!game.user.isActiveGM||!user?.active)throw new Error('The active GM is unavailable.');
  if(typeof data.id!=='string'||data.id.length>64)throw new Error('Invalid resolution id.');
  let s=sessions.get(data.id);
  if(data.op==='round'){
    const actor=await fromUuid(data.actorUuid);
    if(!actor?.testUserPermission(user,'OWNER'))throw new Error('You do not own the rolling actor.');
    if(s&&(s.executor!==user.id||s.actorUuid!==data.actorUuid||s.waiter))throw new Error('Resolution is already pending.');
    if(!data.roll||![data.roll.total,data.roll.hope,data.roll.fear].every(Number.isFinite)||!Array.isArray(data.rows)||data.rows.length>100)throw new Error('Invalid resolution choices.');
    if(!s){s=new ResolutionSession(data.id,user.id,data.actorUuid);s.audience=new Set([user.id]);sessions.set(data.id,s);}
    if(s.phase==='Resolving'){
      const selected=s.rows.get(s.selection);
      s.finish(data.previous?.used?'Used':data.previous?.declined?'Declined':'No longer eligible');
      if(selected&&data.previous?.used){s.usedKinds??=new Set();s.usedKinds.add(selected.usageKey??selected.kind);}
    }
    const message=data.messageUuid?await fromUuid(data.messageUuid):null;
    if(message?.speaker?.actor&&message.speaker.actor!==actor.id)throw new Error('Roll card belongs to another actor.');
    s.message=message;s.title=`${actor.name} — ${data.roll.damage?'Damage resolution':data.roll.attack?'Attack resolution':'Roll resolution'}`;
    s.result=data.roll.damage?`${data.roll.total} damage`:data.roll.attack?`${data.roll.total} attack${data.roll.critical?' · Critical hit':''}`:`${data.roll.total} with ${data.roll.withFear?'Fear':'Hope'} — Hope: ${data.roll.hope}, Fear: ${data.roll.fear}`;
    const rows=[];
    for(const entry of data.rows){
      const validate=providers.get(entry.kind);if(!validate||s.usedKinds?.has(entry.usageKey??entry.kind))continue;
      const valid=await validate(entry.request,user);if(!valid)continue;
      const owner=valid.owner;
      rows.push({...entry,ownerId:owner.id,label:`${valid.name} — ${valid.bearerName}`,cost:valid.cost,description:valid.description??'',useLabel:valid.useLabel,declineLabel:valid.declineLabel,passLabel:valid.passLabel});
      s.audience.add(owner.id);
    }
    s.refresh(rows);
    if(!s.available){s.close();await broadcast();return null;}
    const answer=new Promise(resolve=>{s.waiter=resolve;});
    s.timer=decisionTimeout(()=>{s.close(true);settle(s,null);void broadcast();},decisionBudget(60000));
    await broadcast();return answer;
  }
  if(!s)return false;
  if(data.op==='choose'){
    if(!['use','decline'].includes(data.action))return false;
    const row=s.rows.get(data.rowId);
    // Recheck ownership, resources and range on click, not just panel creation.
    if(data.action==='use'){
      const valid=row&&await providers.get(row.kind)?.(row.request,game.users.get(s.executor));
      if(!valid){
        if(row&&s.phase==='Pending'&&row.status==='Available'){
          row.status='No longer eligible';if(!s.available){s.close();settle(s,null);}await broadcast();
        }
        return false;
      }
      if(valid.owner.id!==user.id){
        if(row&&s.phase==='Pending'){row.ownerId=valid.owner.id;s.audience.add(valid.owner.id);await broadcast();}
        return false;
      }
    }
    if(!s.choose(user.id,data.rowId,data.action,data.round))return false;
    if(data.action==='use'){
      const token=foundry.utils.randomID();
      tickets.set(token,{sessionId:s.id,rowId:row.id,executor:s.executor,kind:row.kind,itemUuid:row.request.candidate?.itemUuid??row.request.candidates?.[0]?.itemUuid,expires:decisionNow()+decisionBudget(140000)});
      settle(s,{...row,token});
    }else if(!s.available){s.close();settle(s,null);}
    await broadcast();return true;
  }
  if(data.op==='continue'){
    if(!user.isGM||!s.close())return false;
    settle(s,null);await broadcast();return true;
  }
  if(data.op==='close'){
    if(user.id!==s.executor)return false;
    if(s.phase==='Resolving')s.finish(data.used?'Used':'No longer eligible');
    s.close();settle(s,null);await broadcast();
    decisionTimeout(()=>{sessions.delete(s.id);for(const [token,ticket]of tickets)if(ticket.sessionId===s.id)tickets.delete(token);void broadcast();},15000);
    return true;
  }
  return false;
}
function receiveView(view){
  if(view.coordinator===localView.coordinator&&(view.revision??0)<(localView.revision??0))return true;
  localView=view;
  if(view.sessions.length||view.notices.length){
    openPendingDecisions();
  }else if(panel?.rendered)void panel.render();
  return true;
}
export function openPendingDecisions(){if(!Panel)return;panel??=new Panel();void panel.render({force:true});}
export function addPendingDecisionsControl(controls,open=openPendingDecisions){
  if(!controls||typeof controls!=='object')return controls;
  const tokens=controls.tokens;
  if(!tokens?.tools)return controls;
  tokens.tools.dhpPendingDecisions={name:'dhpPendingDecisions',order:100,title:'Open Pending Decisions',icon:'fa-solid fa-hourglass-half',button:true,onChange:()=>open()};
  return controls;
}
export function resolutionMarkup(view=localView,user=game.user){
  return `<div class="dhp-resolution-panel">
    <div class="dhp-timer-controls"><span>${decisionClock.paused?'All decision timers are paused.':'Decision timers are running.'}</span>${user.isGM?`<button type="button" data-timers-paused="${!decisionClock.paused}"><i class="fa-solid fa-${decisionClock.paused?'play':'pause'}"></i> ${decisionClock.paused?'Resume':'Pause'} all timers</button>`:''}</div>
    ${view.sessions.map(s=>`<section><h3>${esc(s.title)}</h3><p>${esc(s.result)}</p>
    <p>${esc(s.phase)} <span data-deadline="${(s.phase==='Pending'||s.rows.some(row=>row.status==='Awaiting consent'))?s.deadline:0}"></span></p>
    <table><thead><tr><th>Ability / character</th><th>Owner</th><th>Cost</th><th>Status</th><th></th></tr></thead><tbody>${s.rows.map(row=>`<tr><td><span class="dhp-resolution-ability" tabindex="0" data-tooltip="${esc(row.description||'No description available.')}" data-tooltip-direction="UP">${esc(row.label)}</span></td><td>${esc(row.owner)}</td><td>${esc(row.cost)}</td><td>${esc(row.status)}</td><td>${s.phase==='Pending'&&row.status==='Available'&&row.ownerId===user.id?`<button type="button" data-choice="use" data-session="${esc(s.id)}" data-row="${esc(row.id)}" data-round="${s.round}">${esc(row.useLabel??'Use')}</button><button type="button" data-choice="decline" data-session="${esc(s.id)}" data-row="${esc(row.id)}" data-round="${s.round}">${esc(row.declineLabel??'Decline')}</button>${row.passLabel?`<button type="button" data-choice="decline" data-session="${esc(s.id)}" data-row="${esc(row.id)}" data-round="${s.round}">${esc(row.passLabel)}</button>`:''}`:''}</td></tr>`).join('')}</tbody></table>
    ${user.isGM&&s.phase==='Pending'?`<button type="button" data-continue="${esc(s.id)}">Continue without a feature</button>`:''}</section>`).join('')}
    ${user.isGM&&view.notices.length?`<section><h3>Pending player decisions</h3>${view.notices.map(n=>`<p><strong>${esc(n.owner)}</strong>: ${esc(n.title)} <span data-deadline="${n.deadline}"></span></p>`).join('')}</section>`:''}
    ${!view.sessions.length&&!view.notices.length?'<p>No pending decisions.</p>':''}</div>`;
}
export async function notifyPending(title,deadline){
  if(!registered)return ()=>{};
  const id=foundry.utils.randomID(),gm=game.users.activeGM;if(!gm)return ()=>{};
  const send=data=>gm.isSelf?noticeRequest(data,{user:game.user}):gm.query(NOTICE,data,{timeout:5000});
  try{await send({id,title,deadline});}catch(error){console.warn(`${ID} | GM pending notification failed`,error);}
  return ()=>{void Promise.resolve(send({id,close:true})).catch(console.warn);};
}
async function noticeRequest(data,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof data.id!=='string')return false;
  const key=`${user.id}:${data.id}`;
  if(data.close)notices.delete(key);
  else{
    if(typeof data.title!=='string'||data.title.length>250||!Number.isFinite(data.deadline))return false;
    notices.set(key,{id:key,title:data.title,owner:user.name,deadline:Math.min(data.deadline,decisionNow()+decisionBudget(65000))});
  }
  await broadcast();return true;
}
export function installDamageReductionMetadata(UserClass){installDecisionQueryTimeouts(UserClass);}
export function installDamageReductionMonitoring(queries,notify=notifyPending){
  const native=queries.armorSlot;
  queries.armorSlot=async function(data,...args){
    const actor=await fromUuid(data.actorId),deadline=data.dhpPendingDeadline??decisionNow()+decisionBudget(60000);
    const done=await notify(`Damage Reduction — ${actor?.name??'Actor'}`,deadline);
    let app,timer,interval,hook;
    // Capture the native or Celestial Wings window belonging to this request.
    const Base=globalThis.game?.system?.api?.applications?.dialogs?.DamageReductionDialog;
    if(Base)hook=Hooks.on('renderApplicationV2',dialog=>{
      if(app||!(dialog instanceof Base)||dialog.actor?.uuid!==actor?.uuid||dialog.dhpDecisionDeadline!==undefined)return;
      app=dialog;app.dhpDecisionDeadline=deadline;
      const title=app.title;
      const tick=()=>{if(app.window?.title)app.window.title.textContent=`${title} ${decisionCountdown(app.wingsDeadline??deadline)}`;};
      tick();interval=setInterval(tick,250);
    });
    try{return await Promise.race([native.call(this,data,...args),new Promise(resolve=>{
      timer=decisionTimeout(()=>{resolve(undefined);if(app?.rendered)void app.close();},Math.max(0,deadline-decisionNow()));
    })]);}finally{
      clearDecisionTimeout(timer);clearInterval(interval);if(hook!==undefined)Hooks.off('renderApplicationV2',hook);done();
    }
  };
}
export function registerResolutionManager(){
  registered=true;
  installDamageReductionMetadata(CONFIG.User?.documentClass);
  CONFIG.queries[Q]=handleResolution;
  CONFIG.queries[VIEW]=(data,{user})=>{if(!user.isGM)throw new Error('Only a GM can publish resolution status.');return receiveView(data);};
  CONFIG.queries[NOTICE]=noticeRequest;
  const Base=foundry.applications.api.ApplicationV2;
  Panel=class extends Base{
    static DEFAULT_OPTIONS={id:'dhp-pending-decisions',window:{title:'Daggerheart — Pending decisions',icon:'fa-solid fa-hourglass-half'},position:{width:760,height:'auto'},classes:['daggerheart','dh-style','dh-premades']};
    async _renderHTML(){const element=document.createElement('div');element.innerHTML=resolutionMarkup();return element;}
    _replaceHTML(element,content){
      content.replaceChildren(element);
      element.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button)return;
        const data=button.dataset;button.disabled=true;
        if(data.timersPaused!==undefined){
          void setDecisionTimersPaused(data.timersPaused==='true').catch(error=>ui.notifications.error(error.message)).finally(()=>{button.disabled=false;});return;
        }
        const request=data.continue?{op:'continue',id:data.continue}:{op:'choose',id:data.session,rowId:data.row,round:Number(data.round),action:data.choice};
        void resolutionRequest(request).then(ok=>{if(!ok)ui.notifications.info('That choice is no longer available.');}).catch(error=>ui.notifications.error(error.message));
      });
      clearInterval(this.countdown);this.countdown=setInterval(()=>{
        const deadlines=[...element.querySelectorAll('[data-deadline]')].map(n=>Number(n.dataset.deadline)).filter(Boolean);
        if(this.window?.title)this.window.title.textContent=`Daggerheart — Pending decisions${deadlines.length?` ${decisionCountdown(Math.min(...deadlines))}`:decisionClock.paused?' (Paused)':''}`;
        for(const node of element.querySelectorAll('[data-deadline]'))node.textContent=Number(node.dataset.deadline)?decisionCountdown(Number(node.dataset.deadline)):'';
      },250);
    }
    async close(...args){clearInterval(this.countdown);return super.close(...args);}
  };
  const Dialog=foundry.applications.api.DialogV2,native=Dialog.wait;
  Dialog.wait=async function(config,...args){
    if(config.dhpPending===false)return native.call(this,config,...args);
    const title=String(config.window?.title??'');
    if(!config.dhpTimed&&!/^(Luckbender|Hallowed Aura|Wings|Quick Reactions|Increased Fortitude|Kick|Tusks|Brave Face|Marked for Death|Combo Strike|Volatile Magic|Channel Raw Power|Death Strike|Toxic Concoctions|Maestro|Overwhelm|Eye for an Eye|Not Done Yet|Favored|Quick Stance|Aggressive|Defensive|Otherwordly|Grappling|Crushing|Honed|Vigilant|Keen Defenses|Flow State|Elemental Aura|Elemental Dominion|Clarity of Nature|Warden[’']s Protection|Defender|Revenge|Partner-in-Arms|Loyal Protector)\b/.test(title))return native.call(this,config,...args);
    const done=await notifyPending(title.replace(/\s*\((?:Paused · )?\d+s\)$/,''),decisionNow()+decisionBudget(60000));
    try{return await native.call(this,config,...args);}finally{done();}
  };
  setInterval(()=>{
    if(!game.user.isActiveGM)return;
    let changed=false;for(const [id,n]of notices)if(n.deadline<decisionNow()){notices.delete(id);changed=true;}
    for(const s of sessions.values())if(s.phase==='Pending'&&s.waiter){
      for(const row of s.rows.values())if(!game.users.get(row.ownerId)?.active){row.ownerId=game.user.id;s.audience.add(game.user.id);changed=true;}
      if(!game.users.get(s.executor)?.active){s.close(true);settle(s,null);changed=true;}
    }
    if(changed)void broadcast();
  },1000);
  Hooks.on('dhpDecisionClockChanged',()=>{if(panel?.rendered||decisionClock.paused)openPendingDecisions();});
  game.modules.get(ID).api.openPendingDecisions=openPendingDecisions;
  game.modules.get(ID).api.setDecisionTimersPaused=setDecisionTimersPaused;
  if(decisionClock.paused)openPendingDecisions();
  Hooks.on('chatMessage',(_log,text)=>{if(text.trim()!=='/premades-pending')return;openPendingDecisions();return false;});
}
