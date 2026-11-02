import {ID} from './core.js';

const INSTALLED=Symbol.for(`${ID}.moveContextCompat`);
function fullRollData(data={}){
 const result={...data};
 // Native roll data uses a shallow Proxy whose overrides are readable but do
 // not appear in ownKeys. Spreading alone loses @prof, @cast and action scale.
 for(const key of ['system','prof','cast','fear','result','scale','roll','experiences','traits','rules','action','primaryWeapon','secondaryWeapon'])
  if(data[key]!==undefined)result[key]=data[key];
 return result;
}

// 2.12 renamed this hook. Select the real hook rather than aliasing inherited
// methods: Duality's native implementation calls its superclass implementation.
export function rollBonusMethod(RollClass){
  return typeof RollClass?.prototype?.getRollBonuses==='function'?'getRollBonuses':'applyBaseBonus';
}

export function mapActionConfig(value,apply){
  return value?.then?value.then(config=>{if(config)apply(config);return config;}):
    (value?(apply(value),value):value);
}

function retainOptions(config,input={}){
  // These are workflow instructions, not document data. MoveContext's native
  // constructor intentionally accepts a limited set of properties.
  for(const key of [ID,'dialog','skips','source'])if(input[key])config[key]={...config[key],...input[key]};
  for(const key of Reflect.ownKeys(input))if(typeof key==='symbol')config[key]=input[key];
  return config;
}

export function installWorkflowCompat(Context,Base){
  if(!Context||!Base||Object.hasOwn(Context,INSTALLED))return;
  const initialize=Context.prototype.initialize,getData=Context.prototype.getRollData;
  const effects=Context.prototype.getActionRelevantEffects,build=Context.build;
  const prepare=Base.prototype.prepareBaseConfig;
  Context.prototype.initialize=async function(...args){
    if(this.roll)this.roll={...(this.roll.toObject?.()??this.roll)};
    const full=fullRollData(getData.call(this));
    this.data={...full,...this.data};
    // Documents must never become enumerable roll data (or JSON acquires cycles).
    const parent=this.actor??full.parent;
    if(parent)Object.defineProperty(this.data,'parent',{value:parent,configurable:true,enumerable:false});
    return initialize.apply(this,args);
  };
  Context.prototype.getRollData=function(){
    const data={...fullRollData(getData.call(this)),...this.data};
    if(this.actor)Object.defineProperty(data,'parent',{value:this.actor,configurable:true,enumerable:false});
    return data;
  };
  // Keep our existing effect filters in the native context's execution path.
  if(typeof Base.getActionRelevantEffects!=='function'){
    Base.getActionRelevantEffects=function(data,actor){return effects.call({data,actor});};
    Context.prototype.getActionRelevantEffects=function(){return Base.getActionRelevantEffects(this.data,this.actor);};
  }
  Base.prototype.prepareBaseConfig=function(event,input,...args){
    return retainOptions(prepare.call(this,event,input,...args),input);
  };
  Context.build=async function(input={},...args){
    // Saved-chat getContext supplies a fallback roll object even for actions
    // explicitly stored as roll-less. Native's constructor prioritizes that
    // object over hasRoll:false, turning a component-only action into a miss.
    if(input.hasRoll===false&&!(input instanceof Context))input={...input,roll:null,evaluated:null};
    const config=await build.call(this,input,...args);
    if(config!==input)retainOptions(config,input);
    return config;
  };
  Object.defineProperty(Context,INSTALLED,{value:true});
}

export function registerWorkflowCompat(){
  const actions=game.system.api.data.actions;
  installWorkflowCompat(actions.MoveContext,actions.actionsTypes.base);
  installPlainRollCompat(CONFIG.Dice.daggerheart.DHRoll,actions.MoveContext);
  installChatContextCompat(game.system.api.data.chatMessages?.config?.dualityRoll,actions.MoveContext);
  if(actions.MoveContext){
   installNoRollTargetCompat(game.system.api.fields?.ActionFields?.TargetField,game.system.api.fields?.ActionFields?.DamageField);
   installRestCompat(game.system.api.applications.dialogs.Downtime);
   installResourceDamageDialogCompat(CONFIG.Dice.daggerheart.DamageRoll,game.system.api.applications.dialogs.DamageDialog);
  }
}

export function createResourceDamageDialog(Base){
 return class ResourceDamageDialog extends Base{
  constructor(roll,config={},options={}){
   // Native's constructor also dereferences a main formula when Otherworldly
   // is active. Resource changes have no damage type to choose.
   super(roll,{...config,actor:undefined},options);
   this.config=config;this.canChooseDamageType=false;
  }
  async _prepareContext(options){
   // Retain the native Application context and resource template. Only bypass
   // DamageDialog's main-damage assumptions; never invent a zero-damage roll.
   const context=await Object.getPrototypeOf(Base.prototype)._prepareContext.call(this,options);
   const {resourceFormulas}=this.roll.constructFormulas(this.config);
   return {...context,config:CONFIG.DH,title:this.config.title??this.title,damageFormula:null,resourceFormulas,
    hasHealing:this.config.hasHealing,directDamage:this.config.directDamage,selectedMessageMode:this.config.selectedMessageMode,
    isCritical:this.config.isCritical,rollModes:Object.entries(CONFIG.ChatMessage.modes).map(([action,{label,icon}])=>({action,label,icon})),
    modifiers:this.config.modifiers,hasSelectedEffects:Boolean(Object.keys(this.selectedEffects??{}).length),selectedEffects:this.selectedEffects??{},
    damageOptions:this.config.damageOptions,rangeOptions:CONFIG.DH.GENERAL.groupAttackRange,selectedDamageTypes:new Set(),canChooseDamageType:false};
  }
 };
}
export function installResourceDamageDialogCompat(Damage,Base){
 const key=Symbol.for(`${ID}.resourceDamageDialog`);
 if(!Damage||!Base||Object.hasOwn(Damage,key))return;
 const configure=Damage.buildConfigure,Dialog=createResourceDamageDialog(Base);
 Damage.buildConfigure=function(config,...args){
  if(!config.damageFormula&&config.resourceFormulas?.length&&!config.dialog?.class&&this.DefaultDialog===Base)
   config.dialog={...config.dialog,class:Dialog};
  return configure.call(this,config,...args);
 };
 Object.defineProperty(Damage,key,{value:true});
}

export function installRestCompat(Downtime){
 if(!Downtime||'shortrest'in Downtime.prototype)return;
 Object.defineProperty(Downtime.prototype,'shortrest',{get(){return this.shortRest;},set(value){this.shortRest=value;},configurable:true});
}

export function installNoRollTargetCompat(Target,Damage){
 const key=Symbol.for(`${ID}.noRollTargets`);
 if(Target&&!Object.hasOwn(Target,key)){
  const execute=Target.execute;
  Target.execute=async function(config,...args){
   if(config.hasRoll!==false)return execute.call(this,config,...args);
   // A roll-less recipient is neither a successful nor a failed attack.
   for(const target of config.targets??[])target.hitResult=null;
  };
  Object.defineProperty(Target,key,{value:true});
 }
 if(Damage&&!Object.hasOwn(Damage,key)){
  const apply=Damage.applyDamage;
  Damage.applyDamage=function(config,targets=null,...args){
   // Native 2.12 dropped the !hasRoll recipient bypass here. Restore only
   // explicit no-roll applications, preserving saves and explicit overrides.
   if(targets==null&&config.hasRoll===false)targets=config.targets;
   return apply.call(this,config,targets,...args);
  };
  Object.defineProperty(Damage,key,{value:true});
 }
}

export function installChatContextCompat(Chat,Context){
 if(!Context||!Chat||Object.hasOwn(Chat,INSTALLED))return;
 // Native 2.12 getContext reads these aliases on its TypeDataModel. Preserve
 // the stored targets/source instead of constructing an empty follow-up move.
 if(!('system'in Chat.prototype))Object.defineProperty(Chat.prototype,'system',{get(){return this.toObject();},configurable:true});
 if(!('actor'in Chat.prototype))Object.defineProperty(Chat.prototype,'actor',{get(){return this.actionActor;},configurable:true});
 const get=Chat.prototype.getContext;
 Chat.prototype.getContext=async function(...args){const config=await get.apply(this,args);snapshotRollResult(this.roll,config);return config;};
 Object.defineProperty(Chat,INSTALLED,{value:true});
}

export function installPlainRollCompat(Roll,Context){
 if(!Context||!Roll||Object.hasOwn(Roll,INSTALLED))return;
 const configure=Roll.buildConfigure,prepared=new WeakSet();
 const evaluate=Roll.buildEvaluate,post=Roll.buildPost;
 Roll.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);snapshotRollResult(roll,config);return result;};
 Roll.buildPost=async function(roll,config,...args){snapshotRollResult(roll,config);return post.call(this,roll,config,...args);};
 const bonus=Roll.prototype.bonusEffectBuilder;
 if(bonus)Roll.prototype.bonusEffectBuilder=function(...args){
  if(this.options.action)return bonus.apply(this,args);
  const keys=this.getActionChangeKeys(),data={...this.data,action:{actionType:this.options.actionType,roll:this.options.roll}};
  return Object.fromEntries((this.options.effects??[]).filter(effect=>effect instanceof ActiveEffect&&
   effect.system?.testConditionals?.(data,{phase:'roll'})&&effect.system.changes?.some(row=>keys.some(key=>row.key?.includes(key))))
   .map(effect=>[effect.id,{id:effect.id,name:effect.name,description:effect.description,changes:effect.system.changes,origEffect:effect,selected:!effect.disabled}]));
 };
 Roll.buildConfigure=function(config={},...args){
  config.dialog??={};config.skips??={};config.source??={};
  if(config.hasRoll===false)config.roll=null;
  else if(config.roll!==null)config.roll??={};
  config.actor??=config.data?.parent??(config.source.actor?foundry.utils.fromUuidSync(config.source.actor):null);
  config.item??=config.actor?.items?.get?.(config.source.item);
  const actionId=config.source.action;
  if(typeof actionId==='string'&&actionId)config.action??=config.item?.system?.attack?.id===actionId?config.item.system.attack:
   config.actor?.system?.attack?.id===actionId?config.actor.system.attack:
   config.item?.system?.actions?.get?.(actionId);
  if(!config.data)config.data=fullRollData(config.action?.getRollData()??config.actor?.getRollData());
  if(config.actor&&!config.data.parent)Object.defineProperty(config.data,'parent',{value:config.actor,configurable:true,enumerable:false});
  if(!config.getRollData)Object.defineProperty(config,'getRollData',{value:function(){return this.data;},configurable:true});
  if(!config.resourceUpdates)config.resourceUpdates=new Context({actor:config.actor,hasRoll:false}).resourceUpdates;
  if(!(config instanceof Context)&&!prepared.has(config)){
   Context.prototype.applyKeybindings.call(config);prepared.add(config);
  }
  return configure.call(this,config,...args);
 };
 Object.defineProperty(Roll,INSTALLED,{value:true});
}

export function snapshotRollResult(roll,config){
 // Native DamageRoll marks its empty controller evaluated after evaluating
 // config.damage's separate rolls. Its critical total getter cannot evaluate
 // empty terms, and the controller must not replace the attack's result.
 if(config.hasRoll===false||!roll?._evaluated||roll.terms?.length===0)return;
 const total=roll.total;if(!Number.isFinite(total))return;
 const dice=roll.dice??[];
 Object.defineProperty(config,'evaluated',{value:roll,writable:true,configurable:true,enumerable:false});
 config.roll={...config.roll,type:config.actionType??config.roll?.type,total,formula:roll.formula,isCritical:Boolean(roll.isCritical),
  dice:dice.map(die=>({dice:die.denomination,total:die.total,formula:die.formula,results:die.results}))};
 if(roll.dHope&&roll.dFear){
  config.roll.hope={dice:roll.dHope.denomination,value:roll.dHope.total};
  config.roll.fear={dice:roll.dFear.denomination,value:roll.dFear.total};
  config.roll.withHope=Boolean(roll.withHope);config.roll.withFear=Boolean(roll.withFear);
  config.roll.result={duality:roll.withHope?1:roll.withFear?-1:0,total:roll.dHope.total+roll.dFear.total,label:roll.totalLabel};
 }
}
