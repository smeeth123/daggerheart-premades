import { ID } from './core.js';
import { companionPartner, linkedCompanion } from './companion-context.js';
import { withHopeLock } from './premades/hope-lock.js';
const QUERY=`${ID}.companion`, WRAPPED=Symbol.for(`${ID}.companions`);
const FLAG='companionUnavailable', REMOVED='companionUnavailableRemoved', HEAL='companionDowntime';
const downtimeEvents=new WeakMap();
let damagePrevention=async()=>false;
export function setCompanionDamagePrevention(handler){damagePrevention=handler;}
export const unavailable=actor=>Boolean(actor?.flags?.[ID]?.[FLAG]);
const stress=actor=>Number(actor?.system?.resources?.stress?.value??0);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function note(actor,text){return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>${escape(actor.name)}</strong>: ${text}</p>`,whisper:[],blind:false});}
export function exhaustionUpdate(actor,changes){
  if(!companionPartner(actor)||unavailable(actor))return;
  const value=changes['system.resources.stress.value']??changes.system?.resources?.stress?.value;
  const max=Number(actor.system.resources.stress.max);
  if(value!=null&&max>0&&Number(value)>=max&&Number(value)>stress(actor)){changes[`flags.${ID}.${FLAG}`]=true;changes[`flags.${ID}.${REMOVED}`]=false;}
}
export async function manuallyRestoreCompanion(actor,{removed=false}={}){
  if(!game.user.isActiveGM||!companionPartner(actor)||!unavailable(actor))return false;
  return withHopeLock(actor.uuid,async()=>{
    if(!unavailable(actor))return false;
    if(!removed&&!actor.flags?.[ID]?.[REMOVED])return false;
    if(actor.effects.some(e=>e.flags?.[ID]?.[FLAG]))return false;
    const max=Number(actor.system.resources.stress.max);
    if(!(max>0&&stress(actor)<max)){
      if(removed)await actor.update({[`flags.${ID}.${REMOVED}`]:true});
      return false;
    }
    if(!await actor.update({[`flags.${ID}.${FLAG}`]:false,[`flags.${ID}.${REMOVED}`]:false}))throw new Error('Could not restore companion availability.');
    await actor.toggleDefeated?.(false);
    return true;
  });
}
export async function syncCompanionIndicator(actor){
  if(!companionPartner(actor))return;
  const effects=[...actor.effects].filter(e=>e.flags?.[ID]?.[FLAG]);
  if(unavailable(actor)&&!effects.length){
    await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Companion — Unavailable',img:'icons/svg/pawprint.svg',type:'base',transfer:false,disabled:false,
      showIcon:CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,description:'Out of the scene until the start of your partner’s next long rest. To restore availability manually, clear at least one Stress and delete this effect.',
      system:{changes:[],duration:{description:''}},flags:{[ID]:{[FLAG]:true}}}]);
    await note(actor,'marked their last Stress and is unavailable until their partner’s next long rest.');
  }else if(!unavailable(actor)&&effects.length)await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));
}
export async function resolveCompanion(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid);
  if(request.op==='damage'){
    const partner=companionPartner(actor);
    if(!partner||!(user.isGM||actor.testUserPermission(user,'OWNER')||partner.testUserPermission(user,'OWNER')))return false;
    if(unavailable(actor)||stress(actor)>=Number(actor.system.resources.stress.max))return [];
    if(await damagePrevention(actor))return [];
    return withHopeLock(actor.uuid,async()=>{
      if(unavailable(actor))return [];
      const before=stress(actor),max=Number(actor.system.resources.stress.max),next=Math.min(max,before+1);
      if(!(next>before))return [];
      if(!await actor.update({'system.resources.stress.value':next}))throw new Error('Could not mark companion Stress.');
      return [{key:'stress',value:next-before}];
    });
  }
  if(actor?.type!=='character'||!actor.testUserPermission(user,'OWNER'))return false;
  const companion=linkedCompanion(actor);if(!companion)return false;
  if(request.op==='return')return withHopeLock(companion.uuid,async()=>{
    if(!unavailable(companion))return false;
    if(!await companion.update({[`flags.${ID}.${FLAG}`]:false,'system.resources.stress.value':Math.max(0,stress(companion)-1)}))throw new Error('Could not restore companion.');
    await companion.toggleDefeated?.(false);
    await note(companion,'returns at the start of the long rest and clears 1 Stress.');return true;
  });
  if(request.op!=='recover'||!Number.isFinite(request.amount)||request.amount<0)return false;
  // Both writes are awaited; native modifyResource returns before its actor write completes.
  return withHopeLock(actor.uuid,()=>withHopeLock(companion.uuid,async()=>{
    const before=stress(actor),cleared=request.full?before:Math.min(before,request.amount);
    if(!cleared)return [];
    if(!await actor.update({'system.resources.stress.value':before-cleared}))throw new Error('Could not clear Stress.');
    const shared=Math.min(stress(companion),cleared);
    if(shared){
      try{
        if(!await companion.update({'system.resources.stress.value':stress(companion)-shared}))throw new Error('Could not clear companion Stress.');
      }catch(error){await actor.update({'system.resources.stress.value':before});throw error;}
      await note(companion,`clears ${shared} Stress alongside ${escape(actor.name)}’s downtime recovery.`);
    }
    return [{key:'stress',value:-cleared}];
  }));
}
async function dispatch(request){
  const gm=game.users.activeGM;if(!gm)throw new Error('Companion automation needs an active GM.');
  return gm.isSelf?resolveCompanion(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});
}
export function installCompanionRest(Downtime,send=dispatch){
  const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime,started=new WeakMap();
  const take=async function(...args){
    const selected=Object.values(this.moveData??{}).some(c=>Object.values(c.moves??{}).some(m=>m.selected>0));
    if(this.shortrest===false&&selected&&linkedCompanion(this.actor)){
      if(!started.has(this))started.set(this,send({op:'return',actorUuid:this.actor.uuid}));
      try{await started.get(this);}catch(error){started.delete(this);throw error;}
    }
    return native.apply(this,args);
  };
  Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;
}
export function installCompanionHealing(Actor,send=dispatch){
  const native=Actor.prototype.takeHealing;
  Actor.prototype.takeHealing=async function(args){
    const resource=args?.resources?.stress;
    if(resource?.options?.[ID]?.[HEAL]!==this.uuid||!linkedCompanion(this))return native.call(this,args);
    const amount=Number(resource.total);if(!Number.isFinite(amount)||amount<0)return native.call(this,args);
    const parsed={main:null,resourceUpdates:[{key:'stress',value:amount,clear:!!resource.options.fullRestore,itemId:null,target:null}]};
    if(Hooks.call('daggerheart.preTakeHealing',this,parsed)===false)return null;
    const change=parsed.resourceUpdates.find(u=>u.key==='stress');
    const updates=change?await send({op:'recover',actorUuid:this.uuid,amount:Math.max(0,Number(change.value)),full:!!change.clear}):[];
    if(updates===false)throw new Error('Could not apply companion downtime recovery.');
    const others={...args.resources};delete others.stress;
    const extra=Object.keys(others).length?await native.call(this,{resources:others}):[];
    Hooks.call('daggerheart.postTakeHealing',this,updates);
    return [...(updates??[]),...(extra??[])];
  };
}
export function markCompanionRecovery(config,actor){
  if(!config.hasHealing||config[ID]?.downtimeOwner!==actor?.uuid||config.source?.originItem?.type!==CONFIG.DH.ITEM.originItemType.restMove||!linkedCompanion(actor))return;
  const r=config.damage?.resources?.stress;if(!r)return;
  r.options[ID]={...r.options[ID],[HEAL]:actor.uuid};
  // ChatDamageData serializes its source, not mutations to prepared Roll options.
  // Rebuild so manual application from the saved card retains downtime provenance.
  if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({
    ...config.damage.toObject(),main:config.damage.main?.toJSON()??null,
    resources:Object.fromEntries(Object.entries(config.damage.resources).map(([key,roll])=>[key,roll.toJSON()]))
  });
}
export function conditionalSafeRollData(data){
  if(!data?.action?.damage||data.action.damage.main!=null)return data;
  return {...data,action:{...data.action,damage:null}};
}
export function installCompanionBenefits(Base){
  const native=Base.getActionRelevantEffects;
  Base.getActionRelevantEffects=async function(data,actor){
    const effects=await native.call(this,conditionalSafeRollData(data),actor),partner=companionPartner(actor);
    if(!partner||!data?.action?.damage||data.action.roll?.type!=='attack')return effects;
    const inherited=await native.call(this,{...partner.getRollData(),action:data.action},partner);
    // Effects retain their real owner/origin and native selection/conditional rules.
    const all=new Map(effects.map(e=>[e.uuid,e]));for(const e of inherited)all.set(e.uuid,e);
    return [...all.values()];
  };
}
// Daggerheart's shared Apply Damage workflow reads this character/adversary
// rule even for companions, whose native schema omits it. Keep it derived only.
export function prepareCompanionDamageRules(model){
  model.rules??={};model.rules.attack??={};model.rules.attack.damage??={};
  model.rules.attack.damage.hpDamageTakenMultiplier??=1;
}
export function installCompanionDamageRules(Model,actors=[]){
  const native=Model.prototype.prepareDerivedData;
  Model.prototype.prepareDerivedData=function(...args){
    const result=native.apply(this,args);prepareCompanionDamageRules(this);return result;
  };
  for(const actor of actors)if(actor.type==='companion')prepareCompanionDamageRules(actor.system);
}
export function registerCompanions(){
  const Actor=CONFIG.Actor.documentClass;if(Actor[WRAPPED])return;
  Object.defineProperty(Actor,WRAPPED,{value:true});CONFIG.queries[QUERY]=resolveCompanion;
  const actors=new Map([...game.actors].map(a=>[a.uuid,a]));
  for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
  installCompanionDamageRules(CONFIG.Actor.dataModels.companion,actors.values());
  installCompanionBenefits(game.system.api.data.actions.actionsTypes.base);
  const Effect=game.system.api.documents.DhActiveEffect,changeValue=Effect.getChangeValue;
  Effect.getChangeValue=function(model,change,effect){
    const source=model?.parent?.documentName==='Actor'?model.parent:model?.documentName==='Actor'?model:null;
    const partner=companionPartner(source),owner=effect?.actor??effect?.parent?.actor??effect?.parent;
    return changeValue.call(this,partner&&owner?.uuid===partner.uuid?partner:model,change,effect);
  };
  installCompanionRest(game.system.api.applications.dialogs.Downtime);
  installCompanionHealing(Actor);
  const native=Actor.prototype.takeDamage;
  Actor.prototype.takeDamage=async function(args,...rest){
    if(!companionPartner(this))return native.call(this,args,...rest);
    const raw=args?.main??args?.damage??args;
    const value=typeof raw==='number'?raw:Number(raw?.total??0);
    const resources=Object.entries(args?.resources??{}).map(([key,r])=>({key,value:typeof r==='number'?r:Number(r?.total??0)}));
    if(!(value>0||resources.some(r=>r.value>0)))return [];
    const parsed={main:value>0?{key:'damage',value,damageTypes:[...(raw?.options?.damageTypes??[])]}:null,resourceUpdates:resources};
    if(Hooks.call('daggerheart.preTakeDamage',this,parsed)===false)return null;
    if(!(parsed.main?.value>0||parsed.resourceUpdates.some(r=>r.value>0)))return [];
    const result=await dispatch({op:'damage',actorUuid:this.uuid});
    if(result===false)throw new Error('Could not mark companion Stress.');return result;
  };
  Hooks.on('preUpdateActor',exhaustionUpdate);
  Hooks.on('deleteActiveEffect',effect=>{
    if(effect.flags?.[ID]?.[FLAG]&&game.user.isActiveGM)
      void manuallyRestoreCompanion(effect.parent,{removed:true}).catch(error=>ui.notifications.error(error.message));
  });
  Hooks.on('updateActor',(actor,changes)=>{
    if(game.user.isActiveGM&&actor.flags?.[ID]?.[REMOVED]&&(changes.system?.resources?.stress||changes['system.resources.stress.value']!==undefined))
      void manuallyRestoreCompanion(actor).catch(error=>ui.notifications.error(error.message));
    if(game.user.isActiveGM&&(changes.flags?.[ID]?.[FLAG]!==undefined||changes[`flags.${ID}.${FLAG}`]!==undefined))
      void syncCompanionIndicator(actor).catch(error=>ui.notifications.error(error.message));
  });
  const ChatLog=ui.chat?.constructor;
  if(ChatLog?.prototype.actionUseButton){
    const use=ChatLog.prototype.actionUseButton;
    ChatLog.prototype.actionUseButton=function(event,message){
      downtimeEvents.set(event,message.system.actor);
      return use.call(this,event,message);
    };
  }
  Hooks.on('daggerheart.preUseAction',(action,config)=>{
    if(config?.event&&downtimeEvents.get(config.event)===action.actor?.uuid)
      config[ID]={...config[ID],downtimeOwner:action.actor.uuid};
    if(companionPartner(action.actor)&&unavailable(action.actor)){ui.notifications.warn('This companion is unavailable until their partner’s next long rest.');return false;}
  });
  Hooks.on('daggerheart.preRollDuality',config=>{
    const actor=config.data?.parent,companion=companionPartner(actor)?actor:config.roll?.companionRoll?linkedCompanion(actor):null;
    if(companion&&unavailable(companion)){ui.notifications.warn('This companion is unavailable until their partner’s next long rest.');return false;}
  });
  if(game.user.isActiveGM){
    const actors=new Map([...game.actors].map(a=>[a.uuid,a]));
    for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);
    for(const actor of actors.values())if(companionPartner(actor)){
      const max=Number(actor.system.resources.stress.max);
      if(!unavailable(actor)&&max>0&&stress(actor)>=max)void actor.update({[`flags.${ID}.${FLAG}`]:true}).catch(error=>ui.notifications.error(error.message));
      else if(unavailable(actor)&&actor.flags?.[ID]?.[REMOVED])void manuallyRestoreCompanion(actor)
        .catch(error=>ui.notifications.error(error.message));
      else if(unavailable(actor))void syncCompanionIndicator(actor).catch(error=>ui.notifications.error(error.message));
    }
  }
  const Damage=CONFIG.Dice.daggerheart.DamageRoll,evaluate=Damage.buildEvaluate;
  Damage.buildEvaluate=async function(roll,config,...args){
    const result=await evaluate.call(this,roll,config,...args);
    const actor=config.source?.actor?await fromUuid(config.source.actor):null;
    markCompanionRecovery(config,actor);
    return result;
  };
}
