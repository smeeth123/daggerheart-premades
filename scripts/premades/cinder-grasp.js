import {ID,featureActive} from '../core.js';
import {companionPartner} from '../companion-context.js';
import {decisionBudget} from '../settings.js';
import {withHopeLock} from './hope-lock.js';
import {CINDER_GRASP_KEY,CINDER_GRASP_EFFECT} from './cinder-grasp-data.js';

const QUERY=`${ID}.cinderGrasp`,ACTION_WRAP=Symbol.for(`${QUERY}Action`),ROLL_WRAP=Symbol.for(`${QUERY}Roll`);
const receipts=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const alive=actor=>{
  if(!['character','adversary','companion'].includes(actor?.type)||actor.statuses?.has('dead')||actor.statuses?.has('defeated')||actor.flags?.[ID]?.companionUnavailable)return false;
  const hp=actor.system?.resources?.hitPoints;
  return !(Number(hp?.max)>0&&Number(hp.value)>=Number(hp.max));
};
export function cinderGraspEffects(actor){
  if(!alive(actor))return [];
  return [...(actor.effects??[])].filter(effect=>!effect.disabled&&!effect.isSuppressed&&effect.active!==false&&!effect.duration?.expired&&
    (effect.statuses?.has?.('burning')||effect.statuses?.includes?.('burning'))&&
    (effect.flags?.[ID]?.cinderGrasp===true||effect.origin?.endsWith(`.ActiveEffect.${CINDER_GRASP_EFFECT}`)));
}
export async function validCinderGraspEffect(effect){
  if(effect.flags?.[ID]?.cinderGrasp===true)return true;
  const template=effect.origin?await fromUuid(effect.origin):null,item=template?.parent,flags=item?.flags?.[ID];
  return Boolean(item?.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (flags?.applied?.key??flags?.premade?.key)===CINDER_GRASP_KEY);
}
function remember(key){receipts.add(key);if(receipts.size>512)receipts.delete(receipts.values().next().value);}

// Native modifyResource uses async forEach writers. Scope promise capture to
// this recipient/packet so the next burning action cannot race its HP update.
async function applyDamage(actor,packet){
  const prior=Object.getOwnPropertyDescriptor(actor,'update'),update=actor.update,pending=[];
  if(typeof update!=='function')return actor.takeDamage(packet,false);
  const capture=function(...args){const result=update.apply(this,args);pending.push(Promise.resolve(result));return result;};
  Object.defineProperty(actor,'update',{value:capture,writable:true,configurable:true});
  try{
    const result=await actor.takeDamage(packet,false);
    let index=0;
    while(index<pending.length){const end=pending.length;await Promise.all(pending.slice(index,end));index=end;}
    return result;
  }finally{
    if(actor.update===capture){if(prior)Object.defineProperty(actor,'update',prior);else delete actor.update;}
  }
}
export async function resolveCinderGrasp(request,{user},rollDice=async()=>new foundry.dice.Roll('2d6',{}, {damageTypes:['magical']}).evaluate()){
  if(!game.user.isActiveGM||!user?.active||typeof request?.operationId!=='string'||!request.operationId.length||request.operationId.length>256||
    !Array.isArray(request.effectIds)||!request.effectIds.length||request.effectIds.length>1000||!request.effectIds.every(id=>typeof id==='string'))return false;
  const actor=await fromUuid(request.actorUuid);
  const authorized=()=>actor&&(user.isGM||actor.testUserPermission(user,'OWNER')||companionPartner(actor)?.testUserPermission(user,'OWNER'));
  if(!authorized()||!alive(actor))return false;
  const receipt=`${actor.uuid}:${request.operationId}`;
  return withHopeLock(`cinderGrasp:${actor.uuid}`,async()=>{
    if(!game.user.isActiveGM||!user.active||!authorized()||receipts.has(receipt)||!alive(actor))return false;
    const ids=new Set(request.effectIds),valid=[];
    for(const effect of cinderGraspEffects(actor))if(ids.has(effect.id)&&await validCinderGraspEffect(effect))valid.push(effect.id);
    const current=()=>cinderGraspEffects(actor).some(effect=>valid.includes(effect.id));
    if(!valid.length||!current()||!user.active||!authorized())return false;
    // Claim before the roll: an uncertain write must not silently reroll/reapply.
    remember(receipt);
    const roll=await rollDice();
    if(!Number.isInteger(roll.total)||roll.total<2||roll.total>12)throw Error('Invalid Cinder Grasp damage roll.');
    if(!current())return false;
    const message=await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flags:{[ID]:{unshakeableRoll:true,cinderGraspDamage:true}},
      flavor:`<strong>Cinder Grasp — ${esc(actor.name)}</strong><p>On Fire: 2d6 magic damage after acting.</p>`
    },{messageMode:game.settings.get('core','messageMode')});
    if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
    if(!current()||!user.active||!authorized())return false;
    const multiplier=Number(actor.system?.rules?.attack?.damage?.hpDamageTakenMultiplier??1);
    if(!Number.isFinite(multiplier)||multiplier<0)throw Error('Invalid Cinder Grasp damage multiplier.');
    const main=roll.toJSON();
    main.total=Math.ceil(roll.total*multiplier);
    main.options={...main.options,damageTypes:['magical'],[ID]:{...main.options?.[ID],cinderGraspDamage:true}};
    const updates=await applyDamage(actor,{main,resources:{}});
    return {total:main.total,updates};
  });
}
async function dispatch(request){
  const gm=game.users.activeGM;if(!gm)throw Error('Cinder Grasp needs an active GM.');
  return gm.isSelf?resolveCinderGrasp(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(180000)});
}
function request(actor,ids,result){
  return {actorUuid:actor.uuid,effectIds:ids,operationId:result.message?.uuid??foundry.utils.randomID()};
}
async function finish(actor,ids,result,send){
  if(!cinderGraspEffects(actor).some(effect=>ids.includes(effect.id)))return;
  try{await send(request(actor,ids,result));}
  catch(error){
    console.error(`${ID} | Cinder Grasp action damage`,error);
    ui.notifications.error(`Cinder Grasp damage could not be completed: ${error.message}. Check the affected creature's damage before applying it manually.`);
  }
}
export function installCinderGrasp(Action,Actor,send=dispatch){
  if(!Object.hasOwn(Action,ACTION_WRAP)){
    const native=Action.prototype.use;
    Action.prototype.use=async function(...args){
      const ids=this.actionType==='action'&&!['damage','grouped'].includes(this.type)?cinderGraspEffects(this.actor).map(effect=>effect.id):[];
      const options=args[1]??{};
      const forward=ids.length?[args[0],{...options,[ID]:{...options[ID],cinderGraspAction:true}},...args.slice(2)]:args;
      const result=await native.apply(this,forward);
      if(ids.length&&result?.actionType==='action'&&(!result.hasRoll||result.evaluate!==false&&Number.isFinite(result.roll?.total)))
        await finish(this.actor,ids,result,send);
      return result;
    };
    Object.defineProperty(Action,ACTION_WRAP,{value:true});
  }
  if(!Object.hasOwn(Actor,ROLL_WRAP)){
    const native=Actor.prototype.diceRoll;
    Actor.prototype.diceRoll=async function(config,...args){
      const ids=!config[ID]?.cinderGraspAction&&config.actionType==='action'&&!config.source?.message&&config.evaluate!==false&&
        ['trait','spellcast','attack'].includes(config.roll?.type)?cinderGraspEffects(this).map(effect=>effect.id):[];
      const result=await native.call(this,config,...args);
      if(ids.length&&result?.actionType==='action'&&result.evaluate!==false&&Number.isFinite(result.roll?.total))
        await finish(this,ids,result,send);
      return result;
    };
    Object.defineProperty(Actor,ROLL_WRAP,{value:true});
  }
}
export function registerCinderGrasp(){
  CONFIG.queries[QUERY]=resolveCinderGrasp;
  installCinderGrasp(game.system.api.data.actions.actionsTypes.base,CONFIG.Actor.documentClass);
}
