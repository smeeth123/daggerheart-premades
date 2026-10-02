import {ID,featureActive} from '../core.js';
import {weaponModeProfile} from '../weapon-modes.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {ownerFor} from './aura-rules.js';
import {blightingOutcome} from './blighting-strike.js';
import {OTHERWORLDLY_WEAPONS,WEAPON_OTHERWORLDLY_KEY} from './weapon-otherworldly-data.js';

const PROMPT=`${ID}.weaponOtherworldlyPrompt`,WRAPPED=Symbol.for(PROMPT);
export function otherworldlyWeapon(item){
  return Boolean(item?.type==='weapon'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===WEAPON_OTHERWORLDLY_KEY&&weaponModeProfile(item,OTHERWORLDLY_WEAPONS));
}
export function otherworldlyContext(config){
  if(config.hasHealing||!config.damageFormula||!config.source?.message)return null;
  const message=game.messages.get(config.source.message),source=message?.system?.source;
  if(!source||['actor','item','action'].some(key=>source[key]!==config.source[key])||blightingOutcome(message)!=='success')return null;
  const action=message.system.action,actor=action?.actor,item=actor?.items?.get(source.item);
  if(!otherworldlyWeapon(item)||action.type!=='attack'||action.item?.uuid!==item.uuid||action.id!==source.action||actor.uuid!==source.actor)return null;
  return {actor,item,message};
}
export async function promptWeaponOtherworldly(request,{user}={}){
  const message=game.messages.get(request?.messageId),context=message&&otherworldlyContext({source:{...message.system.source,message:request.messageId},damageFormula:{}});
  if(!user?.active||!context||context.item.uuid!==request.weaponUuid||
    !context.actor.testUserPermission(user,'OWNER')||!context.actor.testUserPermission(game.user,'OWNER'))return null;
  return timedDialog(`Otherworldly — ${context.item.name}`,'<p>This attack succeeded. Choose its damage type.</p>',[
    {action:'physical',label:'Physical Damage',default:true,callback:()=> 'physical'},
    {action:'magical',label:'Magic Damage',callback:()=> 'magical'}]);
}
export async function chooseOtherworldlyDamage(config,ask=promptWeaponOtherworldly){
  let context=otherworldlyContext(config);
  if(!context||!context.actor.testUserPermission(game.user,'OWNER'))return null;
  if(game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(context.message.id);
  context=otherworldlyContext(config);if(!context)return null;
  const owner=ownerFor(context.actor,[...game.users],game.user),request={messageId:context.message.id,weaponUuid:context.item.uuid};
  const type=owner.isSelf?await ask(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
  const current=otherworldlyContext(config);
  return ['physical','magical'].includes(type)&&current?.item.uuid===request.weaponUuid&&
    game.user.active&&owner.active&&current.actor.testUserPermission(game.user,'OWNER')&&current.actor.testUserPermission(owner,'OWNER')?type:null;
}
export function installOtherworldlyDamage(Damage,choose=chooseOtherworldlyDamage){
  if(!Damage||Damage[WRAPPED])return;
  const configure=Damage.buildConfigure;
  Damage.buildConfigure=async function(config,...args){
    if(otherworldlyContext(config)){
      const type=await choose(config);
      if(['physical','magical'].includes(type)&&otherworldlyContext(config))
        config.damageFormula={...config.damageFormula,damageTypes:new Set([type])};
    }
    return configure.call(this,config,...args);
  };
  Object.defineProperty(Damage,WRAPPED,{value:true});
}
export function registerWeaponOtherworldly(){
  CONFIG.queries[PROMPT]=promptWeaponOtherworldly;
  installOtherworldlyDamage(CONFIG.Dice.daggerheart.DamageRoll);
}
