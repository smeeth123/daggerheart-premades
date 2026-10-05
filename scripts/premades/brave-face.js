import {isHopePaymentCancellation,hopeCapacity,spendHope} from './hope-payment.js';
import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import { ID } from '../core.js';
import { BRAVE_KEY,BRAVE_ACTION } from './brave-face-data.js';
import { timedDialog } from '../dialog.js';
import { ownerFor } from './aura-rules.js';
import { withHopeLock } from './hope-lock.js';
const QUERY=`${ID}.braveFace`,PROMPT=`${ID}.braveFacePrompt`,WRAPPED=Symbol.for(`${ID}.braveFace`),receipts=new Map();
export function braveItem(actor){
  if(actor?.type!=='character'||!(hopeCapacity(actor)>=1))return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID],action=item.system.actions?.get?.(BRAVE_ACTION)??item.system.actions?.[BRAVE_ACTION];
    return !flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===BRAVE_KEY&&action?.uses?.recovery==='session'&&Number(action.uses.value??0)===0;
  })??null;
}
export function incomingStress(args={}){
  const resource=(args.resources??args).stress;
  if(resource?.options?.itemId||resource?.options?.fullRestore)return 0;
  const value=typeof resource==='number'?resource:resource?.total;
  return Number.isInteger(value)&&value>0?value:0;
}
export function reduceStress(args,count){
  if(args.resources)return {...args,resources:{...args.resources,stress:count-1}};
  return {...args,stress:count-1};
}
export async function promptBrave(data,{user}){
  if(!user?.isGM)return false;
  const actor=await fromUuid(data.actorUuid);
  if(!actor?.testUserPermission(game.user,'OWNER')||!braveItem(actor))return false;
  return Boolean(await timedDialog(`Brave Face — ${actor.name}`,`<p>You would mark ${Number(data.count)} Stress.</p><p>Spend <strong>1 Hope</strong> instead of marking <strong>1 Stress</strong>? This uses Brave Face for the session.</p>`,[
    {action:'use',label:'Spend 1 Hope',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}
  ]));
}
export async function resolveBrave(request,{user},prompt=promptBrave){
  if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||!Number.isFinite(request.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||!Number.isInteger(request.count)||request.count<1)return false;
  const actor=await fromUuid(request.actorUuid);
  if(!actor?.testUserPermission(user,'OWNER')||!braveItem(actor))return false;
  for(const [key,value]of receipts)if(value.expires<decisionNow())receipts.delete(key);
  const key=`${user.id}:${request.id}`;if(receipts.has(key))return receipts.get(key).promise;
  const promise=(async()=>{
    const owner=ownerFor(actor,[...game.users],game.user);
    const accepted=owner.isSelf?await prompt(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
    if(!accepted||request.deadline<=decisionNow())return false;
    return withHopeLock(actor.uuid,async()=>{try{let hopePayment;
      const item=braveItem(actor);if(!item)return false;
      const path=`system.actions.${BRAVE_ACTION}.uses.value`;
      const spent=await item.update({[path]:1});
      const action=item.system.actions?.get?.(BRAVE_ACTION)??item.system.actions?.[BRAVE_ACTION];
      if(!spent||Number(action?.uses.value)!==1)throw new Error('Could not spend Brave Face session use.');
      const next=hopeCapacity(actor)-1;
      let updated;try{updated=(hopePayment=await spendHope(actor,1));}catch(error){await item.update({[path]:0});throw error;}
      if(!updated||!hopePayment){await item.update({[path]:0});throw new Error('Could not spend Brave Face Hope.');}
      return true;
    }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
  })();
  receipts.set(key,{promise,expires:decisionNow()+decisionBudget(300000)});return promise;
}
export function installBraveFace(ActorClass,offer){
  if(ActorClass[WRAPPED])return;
  const native=ActorClass.prototype.takeDamage,preUpdate=ActorClass.prototype._preUpdate;
  const damageUpdates=new WeakSet();
  ActorClass.prototype.takeDamage=async function(args={},...rest){
    const count=incomingStress(args);
    if(count&&braveItem(this)&&await offer(this,count))args=reduceStress(args,count);
    damageUpdates.add(this);
    try{return await native.call(this,args,...rest);}finally{damageUpdates.delete(this);}
  };
  ActorClass.prototype._preUpdate=async function(changed,options={},user){
    const path='system.resources.stress.value';
    const proposed=changed[path]??changed.system?.resources?.stress?.value;
    const stress=this.system?.resources?.stress;
    // Party documents share this Actor class but do not have character resources.
    if(proposed===undefined||!stress||this.type!=='character')return preUpdate.call(this,changed,options,user);
    const count=Number(proposed)-Number(stress.value);
    if(!damageUpdates.has(this)&&Number.isInteger(count)&&count>0&&braveItem(this)&&await offer(this,count)){
      if(Object.hasOwn(changed,path))changed[path]=Number(proposed)-1;
      else changed.system.resources.stress.value=Number(proposed)-1;
    }
    return preUpdate.call(this,changed,options,user);
  };
  Object.defineProperty(ActorClass,WRAPPED,{value:true});
}
export function registerBraveFace(){
  CONFIG.queries[QUERY]=resolveBrave;CONFIG.queries[PROMPT]=promptBrave;
  installBraveFace(CONFIG.Actor.documentClass,async(actor,count)=>{
    const gm=game.users.activeGM;if(!gm)throw new Error('Brave Face needs an active GM.');
    const request={id:foundry.utils.randomID(),actorUuid:actor.uuid,count,deadline:decisionNow()+decisionBudget(120000)};
    return gm.isSelf?resolveBrave(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});
  });
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(flags?.disabled||action.id!==BRAVE_ACTION||(flags?.applied?.key??flags?.premade?.key)!==BRAVE_KEY)return;
    ui.notifications.info('Brave Face is offered automatically when you mark Stress.');return false;
  });
}
