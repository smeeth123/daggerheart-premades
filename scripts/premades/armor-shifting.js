import {ID,featureActive} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {timedDialog} from '../dialog.js';
import {ownerFor,unavailableActor} from './aura-rules.js';
import {honedAction} from './honed.js';
import {withHopeLock} from './hope-lock.js';
import {configuredDisadvantage,grantConfiguredDisadvantage} from '../vulnerable.js';
import {ARMOR_SHIFTING_KEY} from './armor-shifting-data.js';
const QUERY=`${ID}.armorShifting`,PROMPT=`${QUERY}Prompt`,WRAPPED=Symbol.for(QUERY),receipts=new Map();
export function shiftingArmor(actor){const item=actor?.system?.armor,score=actor?.system?.armorScore;return actor?.type==='character'&&!unavailableActor(actor)&&Number.isSafeInteger(Number(score?.max))&&Number(score.max)>0&&Number(score.value)>=0&&Number(score.value)<Number(score.max)&&item?.type==='armor'&&item.system.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===ARMOR_SHIFTING_KEY&&item.system.armorFeatures?.some(f=>f.value==='shifting')?item:null;}
export async function validateShifting(request,user){
  if(!user?.active||!Number.isFinite(request?.deadline)||request.deadline<=decisionNow()||request.deadline>decisionNow()+decisionBudget(125000)||!Array.isArray(request.targets)||!request.targets.length||request.targets.length>100||new Set(request.targets.map(t=>t.uuid)).size!==request.targets.length)return null;
  const attacker=await fromUuid(request.source?.actor),actor=await fromUuid(request.actorUuid),armor=shiftingArmor(actor);
  if(!armor||!attacker?.testUserPermission(user,'OWNER')||honedAction(attacker,request.source)?.type!=='attack')return null;
  const targets=await Promise.all(request.targets.map(t=>fromUuid(t.uuid)));
  if(targets.some((t,i)=>t?.documentName!=='Token'||t.id!==request.targets[i].id||t.actor?.uuid!==actor.uuid))return null;
  return {actor,armor,targets};
}
export async function promptShifting(data,{user}){const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!shiftingArmor(actor))return false;return timedDialog(`Shifting — ${actor.name}`,'<p>Before this incoming attack rolls, mark <strong>1 Armor Slot</strong> to give it <strong>disadvantage</strong>?</p>',[{action:'use',label:'Mark Armor Slot',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]);}
export async function resolveShifting(request,{user},ask=promptShifting){
  if(!game.user.isActiveGM||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id))return false;
  const key=`${user?.id}:${request.id}`;if(receipts.has(key))return false;
  let valid=await validateShifting(request,user);if(!valid||receipts.has(key))return false;
  receipts.set(key,true);if(receipts.size>1000)receipts.delete(receipts.keys().next().value);
  const owner=ownerFor(valid.actor,[...game.users],game.user),armorUuid=valid.armor.uuid;
  const accepted=owner.isSelf?await ask({actorUuid:valid.actor.uuid},{user:game.user}):await owner.query(PROMPT,{actorUuid:valid.actor.uuid},{timeout:decisionBudget(65000)});
  if(accepted!==true||!owner.active)return false;
  return withHopeLock(valid.actor.uuid,async()=>{
    valid=await validateShifting(request,user);if(!valid||valid.armor.uuid!==armorUuid||!game.user.isActiveGM||!owner.active||!valid.actor.testUserPermission(owner,'OWNER'))return false;
    const before=Number(valid.actor.system.armorScore.value);
    await valid.actor.system.updateArmorValue({value:1});
    if(Number(valid.actor.system.armorScore.value)!==before+1)throw Error('Shifting could not mark an Armor Slot. Check Armor before retrying.');
    return true;
  });
}
export function installShifting(Roll,offer){if(!Roll||Object.hasOwn(Roll,WRAPPED))return;const configure=Roll.buildConfigure;
  Roll.buildConfigure=async function(config={},...args){const roll=await configure.call(this,config,...args),attacker=config.data?.parent;
    if(!roll?.options||typeof roll.constructFormula!=='function'||roll._evaluated||config.evaluate===false||config.source?.message||!globalThis.canvas?.ready||honedAction(attacker,config.source)?.type!=='attack'||config[ID]?.shiftingOffered||configuredDisadvantage(config))return roll;
    config[ID]={...config[ID],shiftingOffered:true};const handled=new Set();
    for(const target of config.targets??[]){
      if(handled.has(target.actorId))continue;handled.add(target.actorId);
      const actor=await fromUuid(target.actorId);if(!shiftingArmor(actor))continue;
      const targets=config.targets.filter(t=>t.actorId===actor.uuid).map(t=>canvas.tokens.get(t.id)?.document).filter(t=>t?.actor?.uuid===actor.uuid).map(t=>({id:t.id,uuid:t.uuid}));if(!targets.length)continue;
      try{if(await offer({id:foundry.utils.randomID(),source:{...config.source},actorUuid:actor.uuid,targets,deadline:decisionNow()+decisionBudget(120000)})===true){grantConfiguredDisadvantage(roll,config);config[ID].shiftingActor=actor.uuid;roll.options[ID]={...roll.options[ID],shiftingActor:actor.uuid};break;}}
      catch(error){console.error(`${ID} | Shifting`,error);ui.notifications.error('Shifting could not complete. Check Armor; the native attack continues.');}
    }
    return roll;
  };Object.defineProperty(Roll,WRAPPED,{value:true});
}
export function registerArmorShifting(){CONFIG.queries[QUERY]=resolveShifting;CONFIG.queries[PROMPT]=promptShifting;const offer=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Shifting needs an active GM.');return gm.isSelf?resolveShifting(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});};for(const Roll of [CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll])installShifting(Roll,offer);Hooks.on('daggerheart.preUseAction',action=>{if(shiftingArmor(action.actor)===action.item&&action.item.system.armorFeatures.some(f=>f.value==='shifting'&&f.actionIds?.includes(action.id))){ui.notifications.info('Shifting is offered before an incoming attack rolls. It marks Armor, not Stress.');return false;}});}
