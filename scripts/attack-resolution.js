import {recordEvasionBonus,saveEvasionBonuses} from './evasion-indicators.js';
import { decisionBudget } from './settings.js';
import { decisionNow } from './decision-clock.js';
import { collectTimeChoices,payTime } from './premades/not-this-time.js';
import { ID } from './core.js';
import { ownerFor,allied,tokenState } from './premades/aura-rules.js';
import { markReactiveStress } from './premades/stress-payment.js';
import { faerieWingsItem,wingsWouldMiss,AVOIDED } from './premades/faerie-wings.js';
import { DANGER_KEY,DANGER_ACTION } from './premades/danger-sense-data.js';
import { registerResolutionProvider,resolutionRequest,consumeResolutionTicket } from './resolution-manager.js';
import { animateLuckbenderReroll } from './premades/luckbender.js';
import {naturalEvasionItem,naturalEvasionCouldMiss} from './premades/natural-evasion.js';
import {NATURAL_EVASION_ACTION,NATURAL_EVASION_KEY} from './premades/natural-evasion-data.js';
import {elusivePreyItem,elusivePreyCouldMiss} from './premades/elusive-prey.js';
import {ELUSIVE_PREY_ACTION,ELUSIVE_PREY_KEY} from './premades/elusive-prey-data.js';
import {collectUmbralVeilChoices,resolveUmbralVeil} from './premades/umbral-veil.js';
const QUERY=`${ID}.attackDefense`,WRAPPED=Symbol.for(`${ID}.attackResolution`),payments=new Map();
const rules=()=>game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
const rangeState=scene=>JSON.stringify([scene.grid,scene.flags?.daggerheart?.rangeMeasurement,rules()]);
export function veryCloseLimit(scene){
  const settings=rules(),local=scene.flags?.daggerheart?.rangeMeasurement;
  return Number(settings.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:settings.veryClose);
}
export function dangerItem(actor){
  const stress=actor?.system?.resources?.stress;
  if(actor?.type!=='character'||!(Number(stress?.value)<Number(stress?.max)))return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID],action=item.system.actions?.get?.(DANGER_ACTION)??item.system.actions?.[DANGER_ACTION];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===DANGER_KEY&&action?.uses?.recovery==='shortRest'&&Number(action.uses.value??0)===0;
  })??null;
}
export function collectDefenseChoices(attacker,config,used=new Set()){
  const rows=new Map(collectUmbralVeilChoices(attacker,config,used).map(row=>[row.usageKey,row]));
  if(attacker?.type!=='adversary')return [...rows.values()];
  for(const target of config.targets??[]){
    if(!target.hitResult?.success)continue;
    const token=canvas.tokens?.get(target.id),actor=token?.actor;if(actor?.type!=='character')continue;
    const base={attackerUuid:attacker.uuid,actorUuid:actor.uuid,targetId:target.id,messageUuid:config.message?.uuid,total:config.roll.total,critical:Boolean(config.roll.isCritical),evasion:Number(target.evasion),difficulty:target.difficulty};
    const wings=faerieWingsItem(actor);
    if(wings&&!used.has(wings.uuid)&&(!target.difficulty||Number(target.difficulty)===Number(target.evasion))&&wingsWouldMiss(actor,base.total,base.critical,base.evasion,true)){
      rows.set(wings.uuid,{id:`wings:${wings.uuid}`,usageKey:wings.uuid,kind:'defense-wings',request:{...base,kind:'defense-wings',candidate:{itemUuid:wings.uuid}}});
    }
    const natural=naturalEvasionItem(actor);
    if(naturalEvasionCouldMiss(actor,base.total,base.evasion,base.critical)&&natural&&!used.has(natural.uuid)&&(!target.difficulty||Number(target.difficulty)===Number(target.evasion)))rows.set(natural.uuid,{id:`natural-evasion:${natural.uuid}`,usageKey:natural.uuid,kind:'natural-evasion',request:{...base,kind:'natural-evasion',candidate:{itemUuid:natural.uuid}}});
    const elusive=elusivePreyItem(actor);
    if(elusivePreyCouldMiss(actor,base.total,base.evasion,base.critical)&&elusive&&!used.has(elusive.uuid)&&(!target.difficulty||Number(target.difficulty)===Number(target.evasion)))rows.set(elusive.uuid,{id:`elusive-prey:${elusive.uuid}`,usageKey:elusive.uuid,kind:'elusive-prey',request:{...base,kind:'elusive-prey',candidate:{itemUuid:elusive.uuid}}});
    for(const bearer of canvas.tokens.placeables){
      const item=dangerItem(bearer.actor);if(!item||used.has(item.uuid))continue;
      if(bearer.actor.uuid!==actor.uuid&&!allied(bearer.document,token.document))continue;
      const distance=bearer.distanceTo(token),limit=veryCloseLimit(canvas.scene);
      if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)continue;
      const request={...base,kind:'danger',candidate:{itemUuid:item.uuid},bearerTokenUuid:bearer.document.uuid,targetTokenUuid:token.document.uuid,
        bearerState:tokenState(bearer.document),targetState:tokenState(token.document),rangeState:rangeState(canvas.scene),distance};
      // One option per bearer, even when the shared attack hits several allies.
      rows.set(item.uuid,{id:`danger:${item.uuid}`,usageKey:item.uuid,kind:'danger',request});
    }
  }
  if(config.targets?.some(target=>target.hitResult?.success))for(const row of collectTimeChoices(attacker,config.message,config.roll.total,'time-attack',used))rows.set(row.usageKey,row);
  return [...rows.values()];
}
export async function validateDefense(request,user){
  if(!user?.active||request.deadline<=decisionNow())return null;
  const attacker=await fromUuid(request.attackerUuid),item=await fromUuid(request.candidate?.itemUuid),actor=await fromUuid(request.actorUuid);
  if(attacker?.type!=='adversary'||!attacker.testUserPermission(user,'OWNER')||actor?.type!=='character')return null;
  const message=await fromUuid(request.messageUuid),roll=message?.system?.roll;
  const target=message?.system?.targets?.find(t=>t.id===request.targetId&&t.actorId===actor.uuid);
  if(message?.system?.action?.actor?.uuid!==attacker.uuid||!roll||!target||roll.total!==request.total||Boolean(roll.isCritical)!==request.critical)return null;
  const threshold=target.difficulty||target.evasion;
  if(threshold==null||(!roll.isCritical&&roll.total<threshold))return null;
  if(request.kind==='defense-wings'){
    if(item?.actor?.uuid!==actor.uuid||faerieWingsItem(actor)?.uuid!==item.uuid||!wingsWouldMiss(actor,roll.total,roll.isCritical,Number(target.evasion),true))return null;
    if(target.difficulty&&Number(target.difficulty)!==Number(target.evasion))return null;
    return {item,actor,bearer:actor};
  }
  if(request.kind==='natural-evasion'){
    if(item?.actor?.uuid!==actor.uuid||naturalEvasionItem(actor)?.uuid!==item.uuid||!naturalEvasionCouldMiss(actor,roll.total,Number(target.evasion),roll.isCritical))return null;
    if(target.difficulty&&Number(target.difficulty)!==Number(target.evasion))return null;
    return {item,actor,bearer:actor};
  }
  if(request.kind==='elusive-prey'){
    if(item?.actor?.uuid!==actor.uuid||elusivePreyItem(actor)?.uuid!==item.uuid||!elusivePreyCouldMiss(actor,roll.total,Number(target.evasion),roll.isCritical))return null;
    if(target.difficulty&&Number(target.difficulty)!==Number(target.evasion))return null;
    return {item,actor,bearer:actor};
  }
  if(request.kind!=='danger'||dangerItem(item?.actor)?.uuid!==item.uuid)return null;
  const bearer=await fromUuid(request.bearerTokenUuid),defender=await fromUuid(request.targetTokenUuid);
  if(bearer?.actor?.uuid!==item.actor.uuid||defender?.actor?.uuid!==actor.uuid||defender.id!==target.id||bearer.parent?.id!==defender.parent?.id)return null;
  if(item.actor.uuid!==actor.uuid&&!allied(bearer,defender))return null;
  let distance;
  if(canvas.ready&&canvas.scene.id===bearer.parent.id&&bearer.object&&defender.object)distance=bearer.object.distanceTo(defender.object);
  else{
    if(tokenState(bearer)!==request.bearerState||tokenState(defender)!==request.targetState||rangeState(bearer.parent)!==request.rangeState)return null;
    distance=request.distance;
  }
  const limit=veryCloseLimit(bearer.parent);
  if(!Number.isFinite(distance)||!Number.isFinite(limit)||distance>limit)return null;
  return {item,actor,bearer:item.actor};
}
export async function resolveDefense(request,{user},authorize=consumeResolutionTicket){
  if(!game.user.isActiveGM||!Number.isFinite(request.deadline)||request.deadline>decisionNow()+decisionBudget(125000))throw new Error('Invalid defense request.');
  const key=request.candidate?.itemUuid;
  const operation=(payments.get(key)??Promise.resolve()).catch(()=>{}).then(async()=>{
    let valid=await validateDefense(request,user);if(!valid)return false;
    if(!authorize(request.resolutionToken,request.kind,valid.item.uuid,user))return false;
    if(request.kind==='danger'){
      const path=`system.actions.${DANGER_ACTION}.uses.value`;
      const updated=await valid.item.update({[path]:1});
      const action=valid.item.system.actions?.get?.(DANGER_ACTION)??valid.item.system.actions?.[DANGER_ACTION];
      if(!updated||Number(action?.uses?.value)!==1)throw new Error('Could not spend Danger Sense use.');
      try{
        const paid=await markReactiveStress(valid.bearer.uuid,actor=>{
          const flags=valid.item.flags?.[ID];return actor.uuid===valid.bearer.uuid&&!flags?.disabled&&!valid.item.system.inactive;
        });
        if(!paid){await valid.item.update({[path]:0});return false;}
      }catch(error){await valid.item.update({[path]:0});throw error;}
    }else if(request.kind==='natural-evasion'){
      if(!await markReactiveStress(valid.actor.uuid,actor=>naturalEvasionCouldMiss(actor,request.total,request.evasion,request.critical)))return false;
      const roll=await new Roll('1d6').evaluate();
      if(!Number.isInteger(roll.total)||roll.total<1||roll.total>6)throw new Error('Invalid Natural Evasion result.');
      await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:valid.actor}),flavor:`Natural Evasion — +${roll.total} Evasion against the incoming attack`});
      return {bearerName:valid.bearer.name,itemUuid:valid.item.uuid,bonus:roll.total};
    }else if(request.kind==='elusive-prey'){
      if(!await markReactiveStress(valid.actor.uuid,actor=>elusivePreyCouldMiss(actor,request.total,request.evasion,request.critical)))return false;
      const roll=await new Roll('1d4').evaluate();
      if(!Number.isInteger(roll.total)||roll.total<1||roll.total>4)throw new Error('Invalid Elusive Prey result.');
      await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:valid.actor}),flavor:`Elusive Prey — +${roll.total} Evasion against the incoming attack`});
      return {bearerName:valid.bearer.name,itemUuid:valid.item.uuid,bonus:roll.total};
    }else if(!await markReactiveStress(valid.actor.uuid,actor=>wingsWouldMiss(actor,request.total,request.critical,request.evasion,true)))return false;
    return {bearerName:valid.bearer.name,itemUuid:valid.item.uuid};
  });
  payments.set(key,operation);try{return await operation;}finally{if(payments.get(key)===operation)payments.delete(key);}
}
export function updateAttackTargets(config,roll){
  config.roll={...config.roll,total:roll.total,formula:roll.formula,isCritical:Boolean(roll.isCritical),
    dice:roll.dice?.map(die=>({dice:die.denomination,total:die.total,formula:die.formula,results:die.results}))??config.roll.dice};
  if(roll.baseTerms){
    config.roll.extra=roll.dice.filter(die=>!roll.baseTerms.includes(die)).map(die=>({dice:die.denomination,value:die.total,results:die.results}));
    config.roll.modifierTotal=roll.modifierTotal;
    if(config.roll.advantage&&typeof config.roll.advantage==='object')config.roll.advantage={...config.roll.advantage,dice:roll.dAdvantage?.denomination,value:roll.dAdvantage?.total};
  }
  for(const target of config.targets??[]){
    const threshold=target.difficulty||target.evasion;
    target.hit=Boolean(threshold!=null&&(roll.isCritical||roll.total>=threshold));target.hitResult={...target.hitResult,success:target.hit};
  }
  config.roll.success=config.targets.some(t=>t.hit);config.successConsumed=config.roll.success;
}
export async function executeDefenseChoice(choice,attacker,config){
  const gm=game.users.activeGM;if(!gm)throw new Error('Attack resolution needs the active GM.');
  const request={...choice.request,deadline:decisionNow()+decisionBudget(120000),resolutionToken:choice.token};
  const paid=choice.kind==='time-attack'?await payTime(choice):choice.kind==='umbral-veil'?
    (gm.isSelf?await resolveUmbralVeil(request,{user:game.user}):await gm.query(`${ID}.umbralVeil`,request,{timeout:decisionBudget(125000)})):
    (gm.isSelf?await resolveDefense(request,{user:game.user}):await gm.query(QUERY,request,{timeout:decisionBudget(125000)}));
  if(!paid)return false;
  const message=config.message;
  if(choice.kind==='umbral-veil'){
    config.targets=paid.targets;
    updateAttackTargets(config,message.system.roll);
  }else if(choice.kind==='danger'||choice.kind==='time-attack'){
    const original=message.system.roll;
    const rerolled=await original.reroll();
    updateAttackTargets(config,rerolled);
    await animateLuckbenderReroll(rerolled,{source:{message:message.id}},message);
    await message.update({rolls:[rerolled.toJSON()],'system.targets':config.targets,[`flags.${ID}.${choice.kind==='danger'?'dangerSense':'notThisTimeAttack'}`]:paid.bearerName});
  }else{
    const rolledEvasion=['natural-evasion','elusive-prey'].includes(choice.kind);
    const bonus=rolledEvasion?Number(paid.bonus):2,feature=choice.kind==='natural-evasion'?'Natural Evasion':choice.kind==='elusive-prey'?'Elusive Prey':'Wings';
    for(const target of config.targets.filter(t=>t.actorId===request.actorUuid)){
      recordEvasionBonus(config,target,feature,bonus,paid.bearerName);
      target.evasion=Number(target.evasion)+bonus;
      if(target.difficulty)target.difficulty=Number(target.difficulty)+bonus;
    }
    updateAttackTargets(config,message.system.roll);
    await message.update({'system.targets':config.targets,[`flags.${ID}.${choice.kind==='natural-evasion'?'naturalEvasion':choice.kind==='elusive-prey'?'elusivePrey':'defensiveWings'}`]:paid.bearerName});
  }
  await saveEvasionBonuses(config);
  config[AVOIDED]=true;return true;
}
export async function resolveManagedAttack(attacker,config,dependencies={}){
  const collect=dependencies.collect??collectDefenseChoices,execute=dependencies.execute??executeDefenseChoice,request=dependencies.request??resolutionRequest;
  if(!config.message?.uuid)return;
  const used=new Set();let rows=collect(attacker,config,used);if(!rows.length)return;
  if(rows.some(row=>row.kind==='umbral-veil')&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(config.message.id);
  const id=foundry.utils.randomID();let previous=null,lastUsed=false;
  await config.message.update({[`flags.${ID}.defensePending`]:true});
  try{
    for(let round=0;round<100;round++){
      const choice=await request({op:'round',id,actorUuid:attacker.uuid,messageUuid:config.message.uuid,
        roll:{attack:true,total:config.roll.total,critical:Boolean(config.roll.isCritical),hope:0,fear:0},rows,previous});
      if(!choice)break;
      lastUsed=await execute(choice,attacker,config);if(lastUsed)used.add(choice.usageKey);
      previous={used:lastUsed,declined:!lastUsed};rows=collect(attacker,config,used);
    }
  }finally{
    await request({op:'close',id,used:lastUsed});
    await config.message.update({[`flags.${ID}.-=defensePending`]:null});
  }
}
export function installAttackResolution(TargetField,resolve=resolveManagedAttack){
  if(TargetField[WRAPPED])return;
  const native=TargetField.execute;
  TargetField.execute=async function(config){
    const result=await native.call(this,config);
    if(this.type==='attack'&&config.hasRoll&&(this.actor?.type==='adversary'||collectUmbralVeilChoices(this.actor,config).length))await resolve(this.actor,config);
    return result;
  };
  Object.defineProperty(TargetField,WRAPPED,{value:true});
}
export function registerAttackResolution(){
  CONFIG.queries[QUERY]=resolveDefense;
  for(const kind of ['danger','defense-wings','natural-evasion','elusive-prey'])registerResolutionProvider(kind,async(request,user)=>{
    const valid=await validateDefense({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.bearer,[...game.users],game.user),name:kind==='danger'?'Danger Sense':kind==='natural-evasion'?'Natural Evasion':kind==='elusive-prey'?'Elusive Prey':'Wings',bearerName:valid.bearer.name,
      cost:kind==='danger'?'1 Stress · 1/rest':'1 Stress',description:valid.item.system.description??''};
  });
  installAttackResolution(game.system.api.fields.ActionFields.TargetField);
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];if(action.id!==DANGER_ACTION||(flags?.applied?.key??flags?.premade?.key)!==DANGER_KEY)return;
    ui.notifications.info('Danger Sense is offered in attack resolution when an adversary hits you or a nearby ally.');return false;
  });
  Hooks.on('daggerheart.preUseAction',action=>{const flags=action.item?.flags?.[ID];if(action.id!==NATURAL_EVASION_ACTION||(flags?.applied?.key??flags?.premade?.key)!==NATURAL_EVASION_KEY)return;ui.notifications.info('Natural Evasion is offered automatically after an adversary attack hits you.');return false;});
  Hooks.on('daggerheart.preUseAction',action=>{const flags=action.item?.flags?.[ID];if(action.id!==ELUSIVE_PREY_ACTION||(flags?.applied?.key??flags?.premade?.key)!==ELUSIVE_PREY_KEY)return;ui.notifications.info('Elusive Prey is offered automatically after an adversary attack hits you.');return false;});
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(message.flags?.[ID]?.defensePending)for(const control of html.querySelectorAll('button,[data-action]')){control.disabled=true;control.style.pointerEvents='none';}
    if(!message.isContentVisible)return;
    const flags=message.flags?.[ID];
    for(const [key,label]of [['notThisTimeAttack','Not This Time forced an attack reroll'],['dangerSense','Danger Sense forced an attack reroll'],['defensiveWings','Wings increased Evasion against this attack'],['vigilant','Vigilant increased Evasion against this attack'],['keenDefenses','Keen Defenses increased Evasion against this attack']]){
      const feature={defensiveWings:'Wings',vigilant:'Vigilant',keenDefenses:'Keen Defenses'}[key];
      if(feature&&flags?.evasionBonuses?.some(r=>r.feature===feature))continue;
      if(!flags?.[key]||html.querySelector(`.dhp-${key}`))continue;
      const note=html.ownerDocument.createElement('p');note.className=`dhp-${key}`;note.textContent=`${flags[key]}: ${label}.`;html.querySelector('.message-content')?.append(note);
    }
  });
}
