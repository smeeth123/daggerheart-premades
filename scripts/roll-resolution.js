import { decisionBudget } from './settings.js';
import { decisionNow } from './decision-clock.js';
import {criticalRerollResult,isActionRerollChoice} from './roll-rerolls.js';
import {nemesisItem,nemesisAttack,validateNemesis,resolveNemesis,swapNemesisDice} from './premades/nemesis.js';
import { trueItem,trueAttack,validateTrue,resolveTrue } from './premades/true-strike.js';
import { charmCandidates,validateCharm,resolveCharm,charmed } from './premades/witchs-charm.js';
import { favorItem,validateFavor,resolveFavor } from './premades/favor.js';
import { etherealItem,etherealFear,validateEthereal,resolveEthereal } from './premades/ethereal-visage.js';
import { boonItem,validateBoon,resolveBoon,rerollBoon } from './premades/patrons-boon.js';
import { focusItem,focusAttack,focusEffects,validateFocusReroll,resolveFocusReroll } from './premades/rangers-focus.js';
import { unboundItem,validateUnbound,resolveUnbound } from './premades/unbound.js';
import { felineItem,validateFeline,resolveFeline } from './premades/feline-instincts.js';
import { fearlessItem,validateFearless,resolveFearless } from './premades/fearless.js';
import { adaptabilityItem,usedExperiences,adaptabilityOutcome,validateAdaptability,resolveAdaptability,rerollAdaptability } from './premades/adaptability.js';
import { compassItem,validateCompass,resolveCompass } from './premades/internal-compass.js';
import { nimbleItem,validateNimble,resolveNimble,rerollHopeDie } from './premades/nimble-fingers.js';
import { enchantedAidItem,swapAvailable,spellcastRoll,validateEnchantedSwap,resolveEnchantedSwap,swapEnchantedDice } from './premades/enchanted-aid.js';
import { ID } from './core.js';
import { ownerFor,tokenState } from './premades/aura-rules.js';
import { sourceToken,collectCandidates,auraRangeState,validatedCandidate,queuedOffer } from './premades/hallowed-aura.js';
import { luckbenderCandidates,validateLuckbender,resolveLuckbender,rerollDualityDice,animateLuckbenderReroll } from './premades/luckbender.js';
import { consumeResolutionTicket,resolutionRequest,registerResolutionProvider } from './resolution-manager.js';
import { diminishItem,diminishTargets,validateDiminish,resolveDiminish } from './premades/diminish-my-foes.js';
import {convertedAttackSuccess} from './attack-outcome.js';
import {courageItem,courageOutcome,validateCourage,resolveCourage} from './premades/courage.js';
import {reassuranceCandidates,validateReassurance,resolveReassurance,rerollReassurance} from './premades/reassurance.js';
export function registerRollProviders(){
 registerResolutionProvider('reassurance',async(request,user)=>{const valid=await validateReassurance({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:ownerFor(valid.bearer,[...game.users],game.user),name:'Reassurance',bearerName:valid.bearer.name,cost:'1/rest · ally consent',description:valid.item.system.description??'',useLabel:'Offer reroll'}:null;});
 registerResolutionProvider('courage',async(request,user)=>{const valid=await validateCourage({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:ownerFor(valid.actor,[...game.users],game.user),name:'Courage',bearerName:valid.actor.name,cost:'Gain 1 Hope',description:valid.item.system.description??'',useLabel:'Failed — gain Hope',declineLabel:'Succeeded'}:null;});
 registerResolutionProvider('diminish',async(request,user)=>{const valid=await validateDiminish({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:valid.owner,name:'Diminish My Foes',bearerName:valid.actor.name,cost:`Choose Favor · ${valid.target.name}`,description:valid.item.system.description??'',useLabel:'Choose Favor'}:null;});
 registerResolutionProvider('nemesis',async(request,user)=>{const valid=await validateNemesis({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:ownerFor(valid.actor,[...game.users],game.user),name:'Nemesis',bearerName:valid.actor.name,cost:'Swap Hope and Fear',description:valid.item.system.description??'',useLabel:'Swap Dice'}:null;});
 registerResolutionProvider('enchanted-aid',async(request,user)=>{const valid=await validateEnchantedSwap({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:ownerFor(valid.helper,[...game.users],game.user),name:'Enchanted Aid',bearerName:valid.helper.name,cost:'1/long rest',description:valid.item.system.description??'',useLabel:'Swap Dice'}:null;});
 registerResolutionProvider('true-strike',async(request,user)=>{const valid=await validateTrue({...request,deadline:decisionNow()+decisionBudget(120000)},user);return valid?{owner:ownerFor(valid.actor,[...game.users],game.user),name:'True Strike',bearerName:valid.actor.name,cost:'1 Hope · 1/long rest',description:valid.item.system.description??'',useLabel:valid.outcome==='unknown'?'Failed — use True Strike':'Use',declineLabel:valid.outcome==='unknown'?'Succeeded':'Decline',passLabel:valid.outcome==='unknown'?'Decline':undefined}:null;});
  registerResolutionProvider('charm',async(request,user)=>{
    const valid=await validateCharm({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:"Witch’s Charm",bearerName:valid.actor.name,cost:'3 Hope',description:valid.item.system.description??'',useLabel:valid.outcome==='unknown'?'Failed — use Charm':'Use',declineLabel:valid.outcome==='unknown'?'Succeeded':'Decline',passLabel:valid.outcome==='unknown'?'Decline':undefined};
  });
  registerResolutionProvider('favor',async(request,user)=>{
    const valid=await validateFavor({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Favor',bearerName:valid.actor.name,cost:'Gain Favor instead of Hope',description:valid.item.system.description??'',useLabel:valid.outcome==='unknown'?'Succeeded — gain Favor':'Gain Favor',declineLabel:valid.outcome==='unknown'?'Failed':'Keep Hope',passLabel:valid.outcome==='unknown'?'Decline':undefined};
  });
  registerResolutionProvider('ethereal',async(request,user)=>{
    const valid=await validateEthereal({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Ethereal Visage',bearerName:valid.actor.name,cost:'Remove 1 Fear instead of gaining Hope',description:valid.item.system.description??'',useLabel:valid.outcome==='unknown'?'Succeeded — remove Fear':'Remove Fear',declineLabel:valid.outcome==='unknown'?'Failed':'Keep Hope',passLabel:valid.outcome==='unknown'?'Decline':undefined};
  });
  registerResolutionProvider('boon',async(request,user)=>{
    const valid=await validateBoon({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:"Patron's Boon",bearerName:valid.actor.name,cost:'3 Hope',description:valid.item.system.description??'',useLabel:valid.outcome==='unknown'?'Failed — reroll':'Use',declineLabel:valid.outcome==='unknown'?'Succeeded':'Decline',passLabel:valid.outcome==='unknown'?'Decline':undefined};
  });
  registerResolutionProvider('focus',async(request,user)=>{
    const valid=await validateFocusReroll({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:"Ranger's Focus",bearerName:valid.actor.name,cost:'End Focus',description:valid.item.system.description??''};
  });
  registerResolutionProvider('unbound',async(request,user)=>{
    const valid=await validateUnbound({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Unbound',bearerName:valid.actor.name,cost:'1/session',description:valid.item.system.description??''};
  });
  registerResolutionProvider('fearless',async(request,user)=>{
    const valid=await validateFearless({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Fearless',bearerName:valid.actor.name,cost:'2 Stress',description:valid.item.system.description??''};
  });
  registerResolutionProvider('adapt',async(request,user)=>{
    const valid=await validateAdaptability({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Adaptability',bearerName:valid.actor.name,cost:valid.outcome==='unknown'?'1 Stress · declare outcome':'1 Stress',description:valid.item.system.description??'',useLabel:valid.outcome==='unknown'?'Failed — reroll':'Use',declineLabel:valid.outcome==='unknown'?'Succeeded':'Decline',passLabel:valid.outcome==='unknown'?'Decline':undefined};
  });
  registerResolutionProvider('compass',async(request,user)=>{
    const valid=await validateCompass({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Internal Compass',bearerName:valid.actor.name,cost:'No cost',description:valid.item.system.description??''};
  });
  registerResolutionProvider('feline',async(request,user)=>{
    const valid=await validateFeline({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Feline Instincts',bearerName:valid.actor.name,cost:'2 Hope',description:valid.item.system.description??''};
  });
  registerResolutionProvider('nimble',async(request,user)=>{
    const valid=await validateNimble({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.actor,[...game.users],game.user),name:'Nimble Fingers',bearerName:valid.actor.name,cost:'2 Hope',description:valid.item.system.description??''};
  });
  registerResolutionProvider('luck',async(request,user)=>{
    if(request.actionType!=='action')return null;
    const valid=await validateLuckbender({...request,deadline:decisionNow()+decisionBudget(120000)},user);if(!valid)return null;
    return {owner:ownerFor(valid.bearer,[...game.users],game.user),name:'Luckbender',bearerName:valid.bearer.name,cost:'3 Hope · 1/session',description:valid.item.system.description??''};
  });
  registerResolutionProvider('aura',async(request,user)=>{
    if(request.fear<=request.hope||request.critical)return null;
    const valid=await validatedCandidate({...request,deadline:decisionNow()+decisionBudget(120000)},request.candidates[0],user);if(!valid)return null;
    return {owner:ownerFor(valid.bearer.actor,[...game.users],game.user),name:'Hallowed Aura',bearerName:valid.bearer.name,cost:'1/long rest',description:valid.item.system.description??''};
  });
}
export function collectRollChoices(roll,actor,{auraOnly=false,used=new Set(),config={}}={}){
  const rows=[],values={hope:roll.dHope.total,fear:roll.dFear.total,total:roll.total,critical:Boolean(roll.isCritical)};
  if(!auraOnly&&roll.options.actionType==='action')for(const candidate of reassuranceCandidates(actor)){
    const usageKey=`reassurance:${candidate.itemUuid}`;
    if(!used.has(usageKey))rows.push({id:usageKey,usageKey,kind:'reassurance',request:{sourceUuid:actor.uuid,candidate,actionType:'action',...values}});
  }
  if(!auraOnly&&!used.has('enchanted-aid')&&values.hope!==values.fear&&spellcastRoll(actor,roll.options.actionType,roll.options.roll?.trait))for(const help of roll.options?.[ID]?.helpAlly?.rows??[]){const item=help.enchantedAid&&foundry.utils.fromUuidSync?.(help.enchantedAid.itemUuid);if(item&&enchantedAidItem(item.actor)?.uuid===item.uuid&&swapAvailable(item))rows.push({id:`enchanted-aid:${item.uuid}`,kind:'enchanted-aid',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},claimId:roll.options[ID].helpAlly.claimId,actionType:'action',trait:roll.options.roll.trait,...values}});}
  if(!auraOnly&&!charmed(roll)&&!used.has('nemesis')&&values.hope!==values.fear){const source=config.source??roll.options.source,targets=config.targets??roll.options.targets??[],actionType=config.actionType??roll.options.actionType,item=nemesisItem(actor);if(item&&nemesisAttack(actor,source,targets,actionType))rows.push({id:`nemesis:${item.uuid}`,kind:'nemesis',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},source,targets:targets.map(t=>({actorId:t.actorId})),actionType,...values}});}
  if(!auraOnly&&!charmed(roll)&&!used.has('true-strike')){
   const item=trueItem(actor),source=config.source??roll.options.source,difficulty=config.roll?.difficulty??roll.options.roll?.difficulty,targets=(config.targets??roll.options.targets??[]).map(t=>({difficulty:t.difficulty,evasion:t.evasion}));
   if(item&&trueAttack(actor,source)&&adaptabilityOutcome(roll.total,roll.isCritical,difficulty,targets)!=='success')rows.push({id:`true-strike:${item.uuid}`,kind:'true-strike',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},source,difficulty,targets,critical:Boolean(roll.isCritical),...values}});
  }
  if(!auraOnly&&!used.has('charm')&&!charmed(roll)&&roll.options.actionType==='action'){
    const difficulty=config.roll?.difficulty??roll.options.roll?.difficulty;
    const targets=(config.targets??roll.options.targets??[]).map(t=>({difficulty:t.difficulty,evasion:t.evasion}));
    if(adaptabilityOutcome(roll.total,roll.isCritical,difficulty,targets)!=='success')for(const candidate of charmCandidates(actor))rows.push({id:`charm:${candidate.itemUuid}`,kind:'charm',request:{sourceUuid:actor.uuid,candidate,actionType:'action',difficulty,targets,critical:Boolean(roll.isCritical),...values}});
  }
  if(!charmed(roll)&&!auraOnly&&!used.has('focus')&&!roll.isCritical&&roll.options.actionType!=='reaction'){
    const item=focusItem(actor),source=config.source??roll.options.source;
    const targets=config.targets??roll.options.targets??[];
    if(item&&targets.length===1&&focusAttack(actor,source)){
      const target=targets[0],threshold=target.difficulty||target.evasion;
      const defender=target.actorId?foundry.utils.fromUuidSync(target.actorId):null;
      if(defender&&threshold!=null&&roll.total<threshold&&focusEffects(actor,defender).length)
        rows.push({id:`focus:${item.uuid}`,kind:'focus',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},source,targets:targets.map(t=>({actorId:t.actorId,difficulty:t.difficulty,evasion:t.evasion})),critical:false,actionType:roll.options.actionType,...values}});
    }
  }
  if(!auraOnly&&roll.options.actionType==='action'&&!used.has('luck')){
    for(const candidate of luckbenderCandidates(actor))rows.push({id:`luck:${candidate.itemUuid}`,kind:'luck',request:{sourceUuid:actor.uuid,candidate,actionType:'action',...values}});
  }
  if(!auraOnly&&!used.has('feline')&&roll.options.roll?.trait==='agility'){
    const item=felineItem(actor);
    if(item)rows.push({id:`feline:${item.uuid}`,kind:'feline',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},trait:'agility',...values}});
  }
  if(!auraOnly&&!used.has('nimble')&&roll.options.roll?.trait==='finesse'){
    const item=nimbleItem(actor);
    if(item)rows.push({id:`nimble:${item.uuid}`,kind:'nimble',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},trait:'finesse',...values}});
  }
  if(!auraOnly&&!used.has('compass')&&roll.dHope.total===1){
    const item=compassItem(actor);
    if(item)rows.push({id:`compass:${item.uuid}`,kind:'compass',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},...values}});
  }
  if(!auraOnly&&!used.has('courage')&&roll.options.actionType==='action'&&!roll.isCritical&&roll.withFear){
    const item=courageItem(actor),difficulty=config.roll?.difficulty??roll.options.roll?.difficulty,targets=(config.targets??roll.options.targets??[]).map(target=>({difficulty:target.difficulty,evasion:target.evasion}));
    if(item&&courageOutcome({total:roll.total,critical:false,difficulty,targets})==='unknown')rows.push({id:`courage:${item.uuid}`,kind:'courage',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},actionType:'action',withFear:true,critical:false,difficulty,targets,total:roll.total,hope:roll.dHope.total,fear:roll.dFear.total}});
  }
  if(!auraOnly&&!used.has('favor')&&roll.options.actionType==='action'&&(roll.withHope||roll.isCritical)){
    const item=favorItem(actor),difficulty=config.roll?.difficulty??roll.options.roll?.difficulty;
    const targets=(config.targets??roll.options.targets??[]).map(t=>({difficulty:t.difficulty,evasion:t.evasion}));
    if(item&&Number(actor.system.resources?.favor?.value)<Number(actor.system.resources?.favor?.max??6)&&adaptabilityOutcome(roll.total,roll.isCritical,difficulty,targets)!=='failure')rows.push({id:`favor:${item.uuid}`,kind:'favor',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},actionType:'action',withHope:true,difficulty,targets,critical:Boolean(roll.isCritical),...values}});
  }
  if(!auraOnly&&!used.has('ethereal')&&roll.options.actionType==='action'&&roll.options.roll?.trait==='presence'&&(roll.withHope||roll.isCritical)){
    const item=etherealItem(actor),difficulty=config.roll?.difficulty??roll.options.roll?.difficulty;
    const targets=(config.targets??roll.options.targets??[]).map(t=>({difficulty:t.difficulty,evasion:t.evasion}));
    if(item&&etherealFear()>0&&adaptabilityOutcome(roll.total,roll.isCritical,difficulty,targets)!=='failure')rows.push({id:`ethereal:${item.uuid}`,kind:'ethereal',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},actionType:'action',trait:'presence',withHope:true,difficulty,targets,critical:Boolean(roll.isCritical),...values}});
  }
  if(!charmed(roll)&&!auraOnly&&!used.has('boon')){
    const item=boonItem(actor),difficulty=config.roll?.difficulty??roll.options.roll?.difficulty;
    const targets=(config.targets??roll.options.targets??[]).map(t=>({difficulty:t.difficulty,evasion:t.evasion}));
    if(item&&adaptabilityOutcome(roll.total,roll.isCritical,difficulty,targets)!=='success')rows.push({id:`boon:${item.uuid}`,kind:'boon',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},difficulty,targets,critical:Boolean(roll.isCritical),...values}});
  }
  if(!charmed(roll)&&!auraOnly&&!used.has('adapt')){
    const item=adaptabilityItem(actor),experiences=usedExperiences(roll,actor);
    const difficulty=config.roll?.difficulty??roll.options.roll?.difficulty;
    const targets=(config.targets??roll.options.targets??[]).map(target=>({difficulty:target.difficulty,evasion:target.evasion}));
    if(item&&experiences.length&&adaptabilityOutcome(roll.total,roll.isCritical,difficulty,targets)!=='success'){
      rows.push({id:`adapt:${item.uuid}`,kind:'adapt',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},experiences,difficulty,targets,critical:Boolean(roll.isCritical),...values}});
    }
  }
  if(!auraOnly&&!used.has('unbound')&&!roll.isCritical&&roll.withFear){
    const item=unboundItem(actor);
    if(item)rows.push({id:`unbound:${item.uuid}`,kind:'unbound',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},critical:false,withFear:true,...values}});
  }
  if(!auraOnly&&!used.has('fearless')&&!roll.isCritical&&roll.withFear){
    const item=fearlessItem(actor);
    if(item)rows.push({id:`fearless:${item.uuid}`,kind:'fearless',request:{sourceUuid:actor.uuid,candidate:{itemUuid:item.uuid},critical:false,withFear:true,...values}});
  }
  const origin=sourceToken(actor);
  if(!used.has('aura')&&origin&&!roll.isCritical&&roll.withFear){
    for(const candidate of collectCandidates(origin))rows.push({id:`aura:${candidate.itemUuid}`,kind:'aura',request:{
      sourceUuid:origin.document.uuid,sourceState:tokenState(origin.document),rangeState:auraRangeState(canvas.scene),candidates:[candidate],critical:false,...values
    }});
  }
  return rows.filter(row=>!isActionRerollChoice(row.kind)||!criticalRerollResult(values));
}
export function collectDiminishChoices(roll,actor,config={}){const item=diminishItem(actor),values={hope:roll.dHope.total,fear:roll.dFear.total,total:roll.total};return item?diminishTargets(actor,roll,config).map(target=>({id:`diminish:${item.uuid}:${target.targetUuid}`,kind:'diminish',request:{sourceUuid:actor.uuid,targetUuid:target.targetUuid,candidate:{itemUuid:item.uuid},actionType:'action',withHope:true,critical:Boolean(roll.isCritical),convertedSuccess:convertedAttackSuccess(roll),...target,...values}})):[];}
export async function executeRollChoice(choice,roll,config,preview){
  if(isActionRerollChoice(choice.kind)&&criticalRerollResult({critical:roll.isCritical,hope:roll.dHope?.total,fear:roll.dFear?.total}))return false;
  const gm=game.users.activeGM;if(!gm)throw new Error('The GM disconnected during roll resolution.');
  const request={...choice.request,id:foundry.utils.randomID(),deadline:decisionNow()+decisionBudget(120000),resolutionToken:choice.token};
  if(choice.kind!=='favor'&&config[ID]?.favorChoice)delete config[ID].favorChoice;
  if(choice.kind!=='ethereal'&&config[ID]?.etherealChoice)delete config[ID].etherealChoice;
  if(choice.kind==='courage'){
   const decision=gm.isSelf?await resolveCourage(request,{user:game.user}):await gm.query(`${ID}.courage`,request,{timeout:decisionBudget(125000)});if(!decision)return false;config[ID]={...config[ID],courageChoice:decision};roll.options[ID]={...roll.options[ID],courage:decision};
  }else if(choice.kind==='diminish'){
   const decision=gm.isSelf?await resolveDiminish(request,{user:game.user}):await gm.query(`${ID}.diminishMyFoes`,request,{timeout:decisionBudget(125000)});if(!decision)return false;roll.options[ID]={...roll.options[ID],diminishMyFoes:decision};
  }else if(choice.kind==='nemesis'){
   const decision=gm.isSelf?await resolveNemesis(request,{user:game.user}):await gm.query(`${ID}.nemesisSwap`,request,{timeout:decisionBudget(125000)});if(!decision)return false;swapNemesisDice(roll);roll.options[ID]={...roll.options[ID],nemesis:decision};
  }else if(choice.kind==='enchanted-aid'){
   const decision=gm.isSelf?await resolveEnchantedSwap(request,{user:game.user}):await gm.query(`${ID}.enchantedAidSwap`,request,{timeout:decisionBudget(125000)});if(!decision)return false;swapEnchantedDice(roll);roll.options[ID]={...roll.options[ID],enchantedAid:decision};
  }else if(choice.kind==='true-strike'){
   const decision=gm.isSelf?await resolveTrue(request,{user:game.user}):await gm.query(`${ID}.trueStrike`,request,{timeout:decisionBudget(125000)});if(!decision)return false;
   roll.options[ID]={...roll.options[ID],trueStrike:decision};config[ID]={...config[ID],trueStrike:decision};
  }else if(choice.kind==='charm'){
    const decision=gm.isSelf?await resolveCharm(request,{user:game.user}):await gm.query(`${ID}.witchsCharm`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    roll.options[ID]={...roll.options[ID],witchsCharm:decision};
    delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;
    config[ID]={...config[ID],witchsCharm:decision};
  }else if(choice.kind==='favor'){
    const decision=gm.isSelf?await resolveFavor(request,{user:game.user}):await gm.query(`${ID}.favor`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    config[ID]={...config[ID],favorChoice:decision};
    if(config[ID].etherealChoice)delete config[ID].etherealChoice;
  }else if(choice.kind==='ethereal'){
    const decision=gm.isSelf?await resolveEthereal(request,{user:game.user},consumeResolutionTicket):await gm.query(`${ID}.etherealVisage`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    config[ID]={...config[ID],etherealChoice:decision};roll.options[ID]={...roll.options[ID],etherealVisage:decision};
    if(config[ID].favorChoice)delete config[ID].favorChoice;
  }else if(choice.kind==='boon'){
    const decision=gm.isSelf?await resolveBoon(request,{user:game.user}):await gm.query(`${ID}.patronsBoon`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const replacement=await rerollBoon(roll,config);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],patronsBoon:decision};
    await animateLuckbenderReroll(replacement,config,preview);
  }else if(choice.kind==='focus'){
    const decision=gm.isSelf?await resolveFocusReroll(request,{user:game.user}):await gm.query(`${ID}.focusReroll`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const pair=await rerollDualityDice(roll);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],rangersFocus:decision};
    await animateLuckbenderReroll(pair,config,preview);
  }else if(choice.kind==='reassurance'){
    const decision=gm.isSelf?await resolveReassurance(request,{user:game.user}):await gm.query(`${ID}.reassurance`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const original={hope:roll.dHope.total,fear:roll.dFear.total,total:roll.total};
    const replacement=await rerollReassurance(roll);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],reassurance:[...(roll.options[ID]?.reassurance??[]),{...decision,original}]};
    await animateLuckbenderReroll(replacement,config,preview);
  }else if(choice.kind==='luck'){
    const decision=gm.isSelf?await resolveLuckbender(request,{user:game.user}):await gm.query(`${ID}.luckbenderOffer`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const original={hope:roll.dHope.total,fear:roll.dFear.total,total:roll.total};
    const pair=await rerollDualityDice(roll);
    // A new pair replaces any previous outcome conversion. The spent use remains
    // spent; the manager rechecks other features against these new dice.
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],luckbender:{...decision,original}};
    await animateLuckbenderReroll(pair,config,preview);
  }else if(choice.kind==='adapt'){
    if(adaptabilityOutcome(roll.total,roll.isCritical,request.difficulty,request.targets)==='success')return false;
    const decision=gm.isSelf?await resolveAdaptability(request,{user:game.user}):await gm.query(`${ID}.adaptability`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const replacement=await rerollAdaptability(roll);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],adaptability:decision};
    await animateLuckbenderReroll(replacement,config,preview);
  }else if(choice.kind==='compass'){
    if(roll.dHope.total!==1)return false;
    const decision=gm.isSelf?await resolveCompass(request,{user:game.user}):await gm.query(`${ID}.internalCompass`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const pair=await rerollHopeDie(roll);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],internalCompass:{...decision,originalHope:1}};
    await animateLuckbenderReroll(pair,config,preview);
  }else if(choice.kind==='feline'){
    const decision=gm.isSelf?await resolveFeline(request,{user:game.user}):await gm.query(`${ID}.felineInstincts`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const originalHope=roll.dHope.total;
    const pair=await rerollHopeDie(roll);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],felineInstincts:{...decision,originalHope}};
    await animateLuckbenderReroll(pair,config,preview);
  }else if(choice.kind==='nimble'){
    const decision=gm.isSelf?await resolveNimble(request,{user:game.user}):await gm.query(`${ID}.nimbleFingers`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    const originalHope=roll.dHope.total;
    const pair=await rerollHopeDie(roll);
    if(roll.options[ID]){delete roll.options[ID].hallowedAura;delete roll.options[ID].fearless;delete roll.options[ID].unbound;delete roll.options[ID].witchsCharm;delete roll.options[ID].trueStrike;if(config[ID]){delete config[ID].witchsCharm;delete config[ID].trueStrike;}}
    roll.options[ID]={...roll.options[ID],nimbleFingers:{...decision,originalHope}};
    await animateLuckbenderReroll(pair,config,preview);
  }else if(choice.kind==='unbound'){
    if(roll.isCritical||!roll.withFear)return false;
    const decision=gm.isSelf?await resolveUnbound(request,{user:game.user}):await gm.query(`${ID}.unbound`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    roll.options[ID]={...roll.options[ID],unbound:decision};
    if(roll.dFear.options)delete roll.dFear.options.sfx;
  }else if(choice.kind==='fearless'){
    if(roll.isCritical||!roll.withFear)return false;
    const decision=gm.isSelf?await resolveFearless(request,{user:game.user}):await gm.query(`${ID}.fearless`,request,{timeout:decisionBudget(125000)});
    if(!decision)return false;
    roll.options[ID]={...roll.options[ID],fearless:decision};
    if(roll.dFear.options)delete roll.dFear.options.sfx;
  }else if(choice.kind==='aura'){
    const decision=gm.isSelf?await queuedOffer(request,{user:game.user}):await gm.query(`${ID}.hallowedAura`,request,{timeout:decisionBudget(125000)});
    if(!decision?.accepted)return false;
    roll.options[ID]={...roll.options[ID],hallowedAura:decision};
    if(roll.dFear.options)delete roll.dFear.options.sfx;
  }
  if(preview?.update){
    if(preview.flags?.[ID]?.auraPreview)await preview.update({content:'<p>Hallowed Aura changed this roll to Hope.</p>'});
    else await preview.update({rolls:[roll.toJSON()]});
  }
  return true;
}
export async function resolveManagedRoll(roll,showResult,config={},options={},dependencies={}){
  const collect=dependencies.collect??collectRollChoices,collectFinal=dependencies.collectFinal??collectDiminishChoices,execute=dependencies.execute??executeRollChoice,request=dependencies.request??resolutionRequest;
  const actor=roll.data?.parent??(roll.options.source?.actor?await fromUuid(roll.options.source.actor):null);
  if(!actor)return null;
  const used=new Set();let rows=collect(roll,actor,{...options,used,config});
  if(!rows.length&&!collectFinal(roll,actor,config).length){roll.options[ID]={...roll.options[ID],resolutionComplete:true};return null;}
  let preview=rows.length?await showResult?.():null;
  const id=foundry.utils.randomID();let previous=null,open=false,lastUsed=false;
  try{
    // A single roll cannot keep all workflows blocked indefinitely. Each round
    // has a 60-second choice window; each built-in may resolve at most once.
    for(let round=0;round<10;round++){
      open=true;
      const choice=await request({op:'round',id,actorUuid:actor.uuid,messageUuid:preview?.uuid,
        roll:{total:roll.total,hope:roll.dHope.total,fear:roll.dFear.total,withFear:roll.withFear},rows,previous});
      if(!choice)break;
      lastUsed=await execute(choice,roll,config,preview);
      if(lastUsed){used.add(choice.usageKey??choice.kind);if(choice.kind!=='favor'&&!config[ID]?.favorChoice)used.delete('favor');if(choice.kind!=='ethereal'&&!config[ID]?.etherealChoice)used.delete('ethereal');}
      previous={used:lastUsed,declined:!lastUsed};
      rows=collect(roll,actor,{...options,used,config});
    }
    const finalRows=collectFinal(roll,actor,config);
    if(finalRows.length){preview??=await showResult?.();const finalId=foundry.utils.randomID();let finalOpen=false,finalUsed=false;try{finalOpen=true;const choice=await request({op:'round',id:finalId,actorUuid:actor.uuid,messageUuid:preview?.uuid,roll:{total:roll.total,hope:roll.dHope.total,fear:roll.dFear.total,withFear:roll.withFear},rows:finalRows,previous:null});if(choice)finalUsed=await execute(choice,roll,config,preview);}finally{if(finalOpen)await request({op:'close',id:finalId,used:finalUsed});}}
    roll.options[ID]={...roll.options[ID],resolutionComplete:true};
  }finally{
    if(open)await request({op:'close',id,used:lastUsed});
  }
  return null;
}
export async function resolveManagedAura(roll,beforePrompt){
  await resolveManagedRoll(roll,beforePrompt,roll.options,{auraOnly:true});
  return roll.options[ID]?.hallowedAura??null;
}
