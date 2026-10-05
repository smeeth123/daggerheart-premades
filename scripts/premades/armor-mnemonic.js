import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {withHopeLock} from './hope-lock.js';
import {addVaultRecallOptionProvider} from '../vault-recall.js';
import {ARMOR_MNEMONIC_KEY} from './armor-mnemonic-data.js';
const QUERY=`${ID}.mnemonicRecall`,reservations=new Map(),epochs=new WeakMap();
export function mnemonicAvailable(actor){
  const item=actor?.system?.armor;
  if(actor?.type!=='character'||item?.type!=='armor'||!item.system.equipped||!featureActive(item)||item.flags?.[ID]?.disabled||item.flags?.[ID]?.applied?.key!==ARMOR_MNEMONIC_KEY)return null;
  const property=item.system.armorFeatures?.find(f=>f.value==='mnemonic');
  for(const id of property?.actionIds??[]){const action=item.system.actions?.get?.(id)??item.system.actions?.[id],value=Number(action?.uses?.value??0),max=Number(action?.uses?.max);if(action?.uses?.recovery==='scene'&&Number.isSafeInteger(value)&&value>=0&&max===1&&value<max)return {item,action,id,value};}
  return null;
}
const canRecall=card=>card?.type==='domainCard'&&card.system?.inVault&&Number(card.system.recallCost)>0&&(card.actor?.system?.loadoutSlot?.available||card.system.loadoutIgnore);
export async function promptMnemonic(card,cost){return Boolean(await timedDialog(`Mnemonic — ${card.name}`,`<p>Use <strong>Mnemonic</strong> to recall this card for free instead of paying <strong>${cost} Stress</strong>?</p>`,[{action:'use',label:'Use Mnemonic',callback:()=>true},{action:'decline',label:'Do Not Use',default:true,callback:()=>false}]));}
export function mnemonicRefresh(item,changes){const ids=item.system?.armorFeatures?.filter(f=>f.value==='mnemonic').flatMap(f=>f.actionIds??[])??[];if(ids.some(id=>Number(changes?.[`system.actions.${id}.uses.value`]??changes?.system?.[`actions.${id}.uses.value`]??changes?.system?.actions?.[id]?.['uses.value']??changes?.system?.actions?.[id]?.uses?.value)===0))epochs.set(item,(epochs.get(item)??0)+1);}
export async function resolveMnemonic(request,{user}){
  if(!game.user.isActiveGM||!user?.active||!['reserve','commit','refund'].includes(request?.op))return false;
  const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;
  return withHopeLock(actor.uuid,async()=>{
    if(!user.active||!actor.testUserPermission(user,'OWNER'))return false;
    if(request.op==='reserve'){
      const valid=mnemonicAvailable(actor),card=await fromUuid(request.cardUuid);if(!valid||valid.item.uuid!==request.itemUuid||card?.actor?.uuid!==actor.uuid||!card.testUserPermission(user,'OWNER')||!canRecall(card))return false;
      const epoch=epochs.get(valid.item)??0,path=`system.actions.${valid.id}.uses.value`,updated=await valid.item.update({[path]:valid.value+1});
      const current=valid.item.system.actions?.get?.(valid.id)??valid.item.system.actions?.[valid.id];if(!updated||Number(current?.uses?.value)!==valid.value+1)throw Error('Could not confirm Mnemonic use. Check the armor before retrying.');
      const token=foundry.utils.randomID();reservations.set(token,{actorUuid:actor.uuid,item:valid.item,path,id:valid.id,value:valid.value,epoch,userId:user.id,expires:decisionNow()+decisionBudget(600000)});for(const [key,r]of reservations)if(r.expires<decisionNow())reservations.delete(key);return token;
    }
    const record=reservations.get(request.token);if(!record||record.actorUuid!==actor.uuid||record.userId!==user.id)return false;
    reservations.delete(request.token);if(request.op==='commit')return true;
    if((epochs.get(record.item)??0)!==record.epoch)return true;
    const action=record.item.system.actions?.get?.(record.id)??record.item.system.actions?.[record.id];if(!action||Number(action.uses?.value)!==record.value+1)return true;
    const updated=await record.item.update({[record.path]:record.value});if(!updated||Number((record.item.system.actions?.get?.(record.id)??record.item.system.actions?.[record.id])?.uses?.value)!==record.value)throw Error('Could not restore Mnemonic use. Check the armor.');return true;
  });
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw Error('Mnemonic needs an active GM.');return gm.isSelf?resolveMnemonic(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});}
export async function mnemonicOption(card,_event,cost,decide=promptMnemonic,send=dispatch){const valid=mnemonicAvailable(card.actor);if(!valid||cost<1||!canRecall(card)||!await decide(card,cost))return {cost};const token=await send({op:'reserve',actorUuid:card.actor.uuid,itemUuid:valid.item.uuid,cardUuid:card.uuid});if(!token)throw Error('Mnemonic is no longer available.');let settled=false;return {cost:0,async settle(success){if(settled)return;settled=true;if(!await send({op:success?'commit':'refund',actorUuid:card.actor.uuid,token}))throw Error('Mnemonic use needs manual review.');}};}
export function registerArmorMnemonic(){CONFIG.queries[QUERY]=resolveMnemonic;addVaultRecallOptionProvider(ARMOR_MNEMONIC_KEY,mnemonicOption);Hooks.on('updateItem',mnemonicRefresh);Hooks.on('daggerheart.preUseAction',action=>{const item=action.item,property=item?.system?.armorFeatures?.find(f=>f.value==='mnemonic');if(item?.flags?.[ID]?.applied?.key===ARMOR_MNEMONIC_KEY&&!item.flags[ID].disabled&&property?.actionIds?.includes(action.id)){ui.notifications.info('Mnemonic is offered automatically when you recall a Domain Card from your vault.');return false;}});}
