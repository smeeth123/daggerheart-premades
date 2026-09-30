import {ID,featureActive} from '../core.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {withHopeLock} from './hope-lock.js';
import {PERFECT_RECALL_KEY,PERFECT_RECALL_ACTION} from './perfect-recall-data.js';
import {setVaultRecallOptionProvider} from '../vault-recall.js';

const QUERY=`${ID}.perfectRecall`,reservations=new Map();
export function perfectRecallItem(actor){return actor?.type==='character'?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===PERFECT_RECALL_KEY;})??null:null;}
export function perfectRecallAvailable(actor){const item=perfectRecallItem(actor),action=item?.system?.actions?.get?.(PERFECT_RECALL_ACTION)??item?.system?.actions?.[PERFECT_RECALL_ACTION];return item&&action&&Number(action.uses?.value??0)<Number(action.uses?.max??1)?{item,action}:null;}
export async function promptPerfectRecall(card,cost){return Boolean(await timedDialog(`Perfect Recall — ${card.name}`,`<p>Use <strong>Perfect Recall</strong> to reduce this card’s Recall Cost from <strong>${cost} Stress</strong> to <strong>${Math.max(0,cost-1)} Stress</strong>?</p>`,[{action:'use',label:'Use Perfect Recall',callback:()=>true},{action:'decline',label:`Pay ${cost} Stress`,default:true,callback:()=>false}]));}
export async function resolvePerfectRecall(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER'))return false;
  if(request.op==='reserve')return withHopeLock(actor.uuid,async()=>{const valid=perfectRecallAvailable(actor);if(!valid||valid.item.uuid!==request.itemUuid)return false;const token=foundry.utils.randomID();await valid.item.update({[`system.actions.${PERFECT_RECALL_ACTION}.uses.value`]:Number(valid.action.uses?.value??0)+1});reservations.set(token,{actorUuid:actor.uuid,itemUuid:valid.item.uuid,userId:user.id});return token;});
  const reservation=reservations.get(request.token);if(!reservation||reservation.actorUuid!==actor.uuid||reservation.userId!==user.id)return false;
  reservations.delete(request.token);
  if(request.op==='commit')return true;
  if(request.op!=='refund')return false;
  return withHopeLock(actor.uuid,async()=>{const item=perfectRecallItem(actor);if(item?.uuid!==reservation.itemUuid)return false;const action=item.system.actions.get?.(PERFECT_RECALL_ACTION)??item.system.actions[PERFECT_RECALL_ACTION],value=Number(action?.uses?.value??0);if(value>0)await item.update({[`system.actions.${PERFECT_RECALL_ACTION}.uses.value`]:value-1});return true;});
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw Error('Perfect Recall needs an active GM.');return gm.isSelf?resolvePerfectRecall(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});}
export async function perfectRecallOption(card,_event,cost,decide=promptPerfectRecall,send=dispatch){const valid=perfectRecallAvailable(card.actor);if(!valid||cost<1||!await decide(card,cost))return{cost};const token=await send({op:'reserve',actorUuid:card.actor.uuid,itemUuid:valid.item.uuid});if(!token)throw Error('Perfect Recall is no longer available.');let settled=false;return{cost:Math.max(0,cost-1),async settle(success){if(settled)return;settled=true;await send({op:success?'commit':'refund',actorUuid:card.actor.uuid,token});}};}
export function registerPerfectRecall(){CONFIG.queries[QUERY]=resolvePerfectRecall;setVaultRecallOptionProvider(perfectRecallOption);Hooks.on('daggerheart.preUseAction',action=>{if(action.id===PERFECT_RECALL_ACTION&&perfectRecallItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Perfect Recall is offered automatically when you recall a Domain Card from your vault.');return false;}});}
