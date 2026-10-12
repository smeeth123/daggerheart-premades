import {ID,featureActive} from '../core.js';
import {withHopeLock} from './hope-lock.js';
import {DISCORD_KEY,DISCORD_ACTION} from './words-of-discord-data.js';
const QUERY=ID+'.rememberWordsDiscord',WRAP=Symbol.for(QUERY),captures=new WeakMap();
export function discordItem(item){const f=item?.flags?.[ID],s=item?.system;return Boolean(item?.type==='domainCard'&&featureActive(item)&&!f?.disabled&&(!s.inVault||s.vaultActive)&&!s.isDomainTouchedSuppressed&&(f?.applied?.key??f?.premade?.key)===DISCORD_KEY);}
export function discordMemories(actor){const entries=actor?.flags?.[ID]?.wordsDiscordCasters;return Array.isArray(entries)?entries.filter(x=>typeof x==='string'):[];}
export function discordEffects(actor){return [...(actor?.effects??[])].filter(e=>e.flags?.[ID]?.wordsDiscord===true&&!e.disabled&&!e.isSuppressed&&e.active!==false&&!e.duration?.expired&&typeof e.origin==='string'&&e.origin.includes('.Item.')).map(e=>({id:e.id,casterUuid:e.origin.slice(0,e.origin.lastIndexOf('.Item.'))}));}
const sourceActor=async c=>c.data?.parent??(c.source?.actor?await fromUuid(c.source.actor):null);
export async function discordPenalty(config,actor){
 if(config[ID]?.wordsDiscordPenalty){config.roll.baseModifiers=(config.roll.baseModifiers??[]).filter(row=>row.label!=='Words of Discord'||row.value!==-5);delete config[ID].wordsDiscordPenalty;}
 const item=actor?.items?.get?.(config.source?.item);
 if(config.actionType!=='action'||config.evaluate===false||config.source?.message||config.source?.action!==DISCORD_ACTION||config.roll?.type!=='spellcast'||!discordItem(item))return false;
 const targets=config.targets??[];
 if(targets.length!==1)return false;
 const target=await fromUuid(targets[0].actorId);
 if(!target||target.type!=='adversary'||!discordMemories(target).includes(actor.uuid))return false;
 // Native character getModifier ignores action.roll.bonus. A base modifier
 // preserves the system's formula, roll-dialog choices and special dice.
 config.roll.baseModifiers=[...(config.roll.baseModifiers??[]),{label:'Words of Discord',value:-5}];
 config[ID]??={};config[ID].wordsDiscordPenalty={actorUuid:actor.uuid,targetUuid:target.uuid,value:-5};
 return true;
}
export async function rememberWordsDiscord(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request?.messageUuid!=='string')return false;
 const actor=await fromUuid(request.actorUuid),message=await fromUuid(request.messageUuid),roll=message?.system?.roll,proof=roll?.options?.[ID]?.wordsDiscordMemory;
 const authorized=()=>Boolean(actor?.type==='adversary'&&(user.isGM||actor.testUserPermission(user,'OWNER')));
 if(!authorized()||message?.system?.source?.actor!==actor.uuid||message.system.action?.type!=='attack'||!roll?._evaluated||!Number.isFinite(roll.total)||!['action','reaction'].includes(roll.options?.actionType)||proof?.actorUuid!==actor.uuid||!Array.isArray(proof.effects)||!proof.effects.length||proof.effects.length>1000||!proof.effects.every(e=>typeof e.id==='string'&&typeof e.casterUuid==='string'))return false;
 return withHopeLock('words-discord:'+actor.uuid,async()=>{
  if(!game.user.isActiveGM||!user.active||!authorized())return false;
  const current=discordEffects(actor),casters=proof.effects.filter(p=>current.some(e=>e.id===p.id&&e.casterUuid===p.casterUuid)).map(e=>e.casterUuid),old=discordMemories(actor),next=[...new Set([...old,...casters])];
  if(next.length===old.length)return true;
  await actor.update({['flags.'+ID+'.wordsDiscordCasters']:next});
  if(casters.some(id=>!discordMemories(actor).includes(id)))throw Error('Words of Discord memory could not be saved.');return true;
 });
}
export function installDiscord(Roll,remember){
 if(Object.hasOwn(Roll,WRAP))return;const native=Roll.build;
 Roll.build=async function(config={},...args){
  if(captures.has(config))return native.call(this,config,...args);
  const actor=await sourceActor(config),originalType=config.roll?.type;
  const effects=actor?.type==='adversary'&&originalType==='attack'&&['action','reaction'].includes(config.actionType)&&config.evaluate!==false&&!config.source?.message?discordEffects(actor):[];
  captures.set(config,true);
  try{
   await discordPenalty(config,actor);
   if(effects.length){config[ID]??={};config[ID].wordsDiscordMemory={actorUuid:actor.uuid,effects};}
   const result=await native.call(this,config,...args);
   if(effects.length&&result?.evaluate!==false&&Number.isFinite(result?.roll?.total)&&result.message?.uuid){
    try{if(await remember({actorUuid:actor.uuid,messageUuid:result.message.uuid})===false)throw Error('Words of Discord memory was not confirmed.');}
    catch(error){console.error(ID+' | Words of Discord',error);ui.notifications.error('Words of Discord could not record recognition. The completed attack was preserved; apply its future -5 penalty manually.');}
   }return result;
  }finally{captures.delete(config);}
 };Object.defineProperty(Roll,WRAP,{value:true});
}
export function registerWordsDiscord(){
 CONFIG.queries[QUERY]=rememberWordsDiscord;
 const remember=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Words of Discord needs an active GM.');return gm.isSelf?rememberWordsDiscord(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});};
 for(const Roll of new Set([CONFIG.Dice.daggerheart.D20Roll,CONFIG.Dice.daggerheart.DualityRoll]))installDiscord(Roll,remember);
}
