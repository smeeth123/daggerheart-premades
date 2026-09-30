import { decisionDuration } from './settings.js';
// Only decision/workflow time uses this clock. Wall time, animations and Foundry's
// other timers continue normally while the GM discusses a pending decision.
export class DecisionClock {
  constructor({wallNow=()=>Date.now(),schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id)}={}) {
    Object.assign(this,{wallNow,schedule,cancel,state:{offset:0,pausedAt:null},timers:new Set()});
  }
  now(){return (this.state.pausedAt??this.wallNow())-this.state.offset;}
  get paused(){return this.state.pausedAt!==null;}
  update(state){
    if(!state||!Number.isFinite(state.offset)||state.offset<0||!(state.pausedAt===null||Number.isFinite(state.pausedAt)))return false;
    this.state={offset:state.offset,pausedAt:state.pausedAt};
    for(const timer of this.timers)this.arm(timer);
    return true;
  }
  transition(paused){
    if(paused===this.paused)return {...this.state};
    const wall=this.wallNow();
    return paused?{offset:this.state.offset,pausedAt:wall}:{offset:this.state.offset+Math.max(0,wall-this.state.pausedAt),pausedAt:null};
  }
  setTimeout(fn,ms,...args){
    const timer={deadline:this.now()+Math.max(0,Number(ms)||0),fn:()=>fn(...args),handle:null};
    this.timers.add(timer);this.arm(timer);return timer;
  }
  arm(timer){
    if(timer.handle!==null)this.cancel(timer.handle);
    timer.handle=null;
    if(this.paused)return;
    timer.handle=this.schedule(()=>{
      if(!this.timers.has(timer))return;
      if(this.paused||this.now()<timer.deadline){this.arm(timer);return;}
      this.timers.delete(timer);timer.fn();
    },Math.max(0,timer.deadline-this.now()));
  }
  clearTimeout(timer){if(!this.timers.delete(timer))return;if(timer.handle!==null)this.cancel(timer.handle);}
}
export const decisionClock=new DecisionClock();
export const decisionNow=()=>decisionClock.now();
export const decisionTimeout=(fn,ms,...args)=>decisionClock.setTimeout(fn,ms,...args);
export const clearDecisionTimeout=timer=>decisionClock.clearTimeout(timer);
export const decisionCountdown=deadline=>`(${decisionClock.paused?'Paused · ':''}${Math.max(0,Math.ceil((deadline-decisionNow())/1000))}s)`;

const ID='daggerheart-premades',SETTING='decisionClock',CONTROL=`${ID}.decisionTimers`;
let queue=Promise.resolve();
export function registerDecisionClockSetting(){
  game.settings.register(ID,SETTING,{scope:'world',config:false,type:Object,default:{offset:0,pausedAt:null},onChange:state=>{
    decisionClock.update(state);Hooks.callAll('dhpDecisionClockChanged');
  }});
}
export function initializeDecisionClock(){
  decisionClock.update(game.settings.get(ID,SETTING));
  CONFIG.queries[CONTROL]=async(data,{user})=>{
    if(!game.user.isActiveGM||!user?.active||!user.isGM||typeof data?.paused!=='boolean')throw new Error('Only a GM can pause or resume decision timers.');
    const job=queue.catch(()=>{}).then(async()=>{
      const state=decisionClock.transition(data.paused);
      await game.settings.set(ID,SETTING,state);
      decisionClock.update(state);
      return true;
    });queue=job;return job;
  };
}
export async function setDecisionTimersPaused(paused){
  if(!game.user.isGM)throw new Error('Only a GM can pause or resume decision timers.');
  const gm=game.users.activeGM;if(!gm)throw new Error('An active GM is required.');
  const data={paused};return gm.isSelf?CONFIG.queries[CONTROL](data,{user:game.user}):gm.query(CONTROL,data,{timeout:5000});
}
export function pausableQuery(name){
  return name==='armorSlot'||(name.startsWith(`${ID}.`)&&!['resolutionView','pendingNotice','decisionTimers'].includes(name.slice(ID.length+1)));
}
// Foundry's server timeout uses wall time and cannot be extended once sent.
// Keep its transport open; enforce the original budget with our decision clock.
export async function queryWithDecisionTimeout(send,timeout,clock=decisionClock){
  if(!Number.isFinite(timeout))return send();
  let timer;
  try{return await Promise.race([send(),new Promise((_,reject)=>{
    timer=clock.setTimeout(()=>reject(new Error('The decision request timed out.')),Math.max(0,timeout));
  })]);}finally{clock.clearTimeout(timer);}
}
export function installDecisionQueryTimeouts(UserClass){
  if(!UserClass)return;
  const native=UserClass.prototype.query;
  UserClass.prototype.query=function(name,data,options={}){
    if(!pausableQuery(name))return native.call(this,name,data,options);
    if(name==='armorSlot'){options={...options,timeout:decisionDuration()};data={...data,dhpPendingDeadline:decisionNow()+options.timeout};}
    return queryWithDecisionTimeout(()=>native.call(this,name,data,{...options,timeout:undefined}),name==='armorSlot'&&Number.isFinite(options.timeout)?options.timeout+1000:options.timeout);
  };
}
