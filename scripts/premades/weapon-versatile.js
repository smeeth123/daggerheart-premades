import {ID,clone,equal,featureActive} from '../core.js';
import {weaponModeProfile} from '../weapon-modes.js';
import {WEAPON_VERSATILE_KEY} from './weapon-versatile-data.js';

const QUERY=`${ID}.weaponVersatile`,WRAPPED=Symbol.for(QUERY),busy=new Set(),clickModes=new WeakMap();
export function versatileWeapon(item){
  return Boolean(item?.type==='weapon'&&featureActive(item)&&!item.flags?.[ID]?.disabled&&
    item.flags?.[ID]?.applied?.key===WEAPON_VERSATILE_KEY&&weaponModeProfile(item));
}
export function modeStats(item){
  const attack=item.toObject().system.attack,main=attack?.damage?.main;
  if(!attack?.roll||!main?.value)throw Error('This weapon has no editable native attack.');
  return {trait:attack.roll.trait,range:attack.range,dice:main.value.dice,bonus:main.value.bonus,
    custom:clone(main.value.custom??{enabled:false,formula:''}),type:clone(main.type)};
}
export function modeRevision(item){return {stats:modeStats(item),state:clone(item.flags?.[ID]?.weaponMode??null),applied:clone(item.flags?.[ID]?.applied??null)};}
export function modeLabel(stats){
  const title=s=>s.charAt(0).toUpperCase()+s.slice(1);
  return `${title(stats.trait)} · ${stats.range==='veryClose'?'Very Close':stats.range==='veryFar'?'Very Far':title(stats.range)} · ${stats.dice}${Number(stats.bonus)?`+${stats.bonus}`:''}`;
}
export async function resolveWeaponMode(request,{user}={}){
  if(!game.user?.isActiveGM||!user?.active||!request?.itemUuid||busy.has(request.itemUuid))return false;
  busy.add(request.itemUuid);
  try{
    const item=await fromUuid(request.itemUuid);
    if(!versatileWeapon(item)||!item.testUserPermission(user,'OWNER')||!item.isOwner||
      item.pack?.startsWith(`${ID}.`)||(item.pack&&game.packs.get(item.pack)?.locked)||
      !equal(modeRevision(item),request.expected))return false;
    const profile=weaponModeProfile(item),current=modeStats(item),old=item.flags?.[ID]?.weaponMode;
    const state=old?clone(old):{current:'primary',primary:current,alternate:{...clone(current),trait:profile.trait,
      range:profile.range,dice:profile.dice,bonus:profile.bonus,custom:{enabled:false,formula:''},
      ...(profile.type?{type:[profile.type]}:{})}};
    if(!['primary','alternate'].includes(state.current))return false;
    // Keep deliberate edits made in either mode; unrelated weapon fields are never written.
    state[state.current]=current;state.current=state.current==='primary'?'alternate':'primary';
    const next=state[state.current],update={[`flags.${ID}.weaponMode`]:state};
    for(const [key,value] of Object.entries(next)){
      const path=key==='trait'?'roll.trait':key==='range'?'range':key==='type'?'damage.main.type':`damage.main.value.${key}`;
      update[`system.attack.${path}`]=clone(value);
    }
    if(!await item.update(update))throw Error('Weapon mode update was cancelled.');
    return true;
  }finally{busy.delete(request.itemUuid);}
}
export async function switchWeaponMode(item){
  const gm=game.users.activeGM;
  if(!gm)throw Error('An active GM is required to switch weapon modes.');
  const request={itemUuid:item.uuid,expected:modeRevision(item)};
  const changed=gm.isSelf?await resolveWeaponMode(request,{user:game.user}):await gm.query(QUERY,request);
  if(!changed)throw Error('The weapon changed or is no longer available. Open its right-click menu again and retry.');
  return changed;
}
function matchingSource(record,source){return record&&record.source.actor===source?.actor&&record.source.item===source?.item&&record.source.action===source?.action;}
export function captureWeaponMode(action,config){
  if(!versatileWeapon(action?.item)||action.type!=='attack'||action.id!==action.item.system.attack?.id)return;
  const main=action.damage?.main;
  if(!main)return;
  config[ID]??={};config[ID].weaponMode={source:clone(config.source),main:clone(main.toObject?.()??main)};
}
export function persistWeaponMode(message,data){
  const options=message.rolls?.[0]?.options??data.rolls?.[0]?.options;
  const record=options?.[ID]?.weaponMode;
  if(matchingSource(record,message.system?.source??data.system?.source))message.updateSource({[`flags.${ID}.weaponMode`]:clone(record)});
}
export function installWeaponModeDamage(DamageField,Message){
  if(!DamageField?.formatFormulas||!Message?.prototype?.onRollDamage||DamageField[WRAPPED])return;
  DamageField[WRAPPED]=true;
  const format=DamageField.formatFormulas;
  DamageField.formatFormulas=function(parts,config,...rest){
    const record=config?.[ID]?.weaponMode??(config?.event&&clickModes.get(config.event));
    if(matchingSource(record,config?.source)&&this.item?.id===record.source.item&&this.id===record.source.action){
      parts=parts.map(part=>part===this.damage.main?new part.constructor(clone(record.main),{parent:this}):part);
    }
    return format.call(this,parts,config,...rest);
  };
  const damage=Message.prototype.onRollDamage;
  Message.prototype.onRollDamage=async function(event,...args){
    const record=this.flags?.[ID]?.weaponMode;
    if(event&&matchingSource(record,this.system?.source))clickModes.set(event,record);
    try{return await damage.call(this,event,...args);}finally{if(event)clickModes.delete(event);}
  };
}
function contextWeapon(app,target){
  const row=(target?.[0]??target)?.closest?.('[data-item-uuid]');
  if(row?.dataset.type!=='weapon'||!row.dataset.itemUuid)return null;
  let item;
  try{item=foundry.utils.fromUuidSync(row.dataset.itemUuid);}catch{return null;}
  const actor=app.actor??app.document;
  if(!actor?.uuid||item?.actor?.uuid!==actor.uuid)return null;
  return item.isOwner&&versatileWeapon(item)?item:null;
}
export function addWeaponModeContextOptions(app,options){
  if(app.document?.type!=='character'||options.some(option=>option.classes==='dhp-weapon-mode-option'))return;
  for(const [current,next] of [['primary','Alternate'],['alternate','Primary']]){
    options.push({label:`Versatile: Switch to ${next} Mode`,icon:'fa-solid fa-repeat',classes:'dhp-weapon-mode-option',
      visible:target=>{
        const item=contextWeapon(app,target);
        return Boolean(item&&(item.flags?.[ID]?.weaponMode?.current??'primary')===current);
      },
      onClick:async (_event,target)=>{
        try{
          const item=contextWeapon(app,target);
          if(!item||(item.flags?.[ID]?.weaponMode?.current??'primary')!==current)
            throw Error('The weapon changed. Open its right-click menu again and retry.');
          await switchWeaponMode(item);
        }catch(error){ui.notifications.error(error.message);}
      }
    });
  }
}
export function registerWeaponVersatile(){
  CONFIG.queries[QUERY]=resolveWeaponMode;
  Hooks.on('getCharacterSheetContextOptions',addWeaponModeContextOptions);
  Hooks.on('daggerheart.preUseAction',captureWeaponMode);
  Hooks.on('preCreateChatMessage',persistWeaponMode);
  installWeaponModeDamage(game.system.api.fields.ActionFields.DamageField,CONFIG.ChatMessage.documentClass);
}
