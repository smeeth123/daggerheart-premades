import { ID,featureActive } from '../core.js';
import { FIRST_KEY,FIRST_ACTION } from './first-strike-data.js';
import { prioritizeFaerieWings } from './faerie-wings.js';
const queues=new Map();
export function firstItem(actor){return actor?.type==='character'?actor.items.find(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===FIRST_KEY;})??null:null;}
export const firstUses=item=>(item.system.actions?.get?.(FIRST_ACTION)??item.system.actions?.[FIRST_ACTION])?.uses;
export async function claimFirst(actor,config){
 if(!config.message||!config.targets?.some(t=>t.hitResult?.success))return;
 const pending=(queues.get(actor.uuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const item=firstItem(actor);if(!item||Number(firstUses(item)?.value??item.system.resource?.value??0)!==0||config.message.flags?.[ID]?.firstStrike)return;
  const uses=firstUses(item);
  await item.update({[uses?`system.actions.${FIRST_ACTION}.uses.value`:'system.resource.value']:1});
  if(Number(uses?firstUses(item).value:item.system.resource.value)!==1)throw new Error('Could not spend First Strike scene use.');
  await config.message.update({[`flags.${ID}.firstStrike`]:{itemUuid:item.uuid}});
 });queues.set(actor.uuid,pending);try{await pending;}finally{if(queues.get(actor.uuid)===pending)queues.delete(actor.uuid);}
}
export function doubleFirstDamage(roll){
 if(roll.options?.[ID]?.firstStrike||!Number.isFinite(roll.total))return;
 const amount=roll.total;
 roll.terms.push(new foundry.dice.terms.OperatorTerm({operator:'+'}),new foundry.dice.terms.NumericTerm({number:amount}));
 roll._total=roll._evaluateTotal();roll.resetFormula();
 roll.options[ID]={...roll.options[ID],firstStrike:{bonus:amount}};
}
export function registerFirstStrike(){
 Hooks.on('daggerheart.preUseAction',action=>{if(action.id===FIRST_ACTION&&firstItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('First Strike is applied automatically on your first successful attack in the scene.');return false;}});
 const Target=game.system.api.fields.ActionFields.TargetField,native=Target.execute;
 Target.execute=async function(config,...args){const result=await native.call(this,config,...args);if(result!==false&&this.type==='attack'&&firstItem(this.actor))await claimFirst(this.actor,config);return result;};
 Hooks.on('daggerheart.preUseAction',action=>{if(action.type==='attack'&&firstItem(action.actor))prioritizeFaerieWings(action,true);});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,evaluate=Damage.buildEvaluate;
 Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);
  const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor;
  if(!config.hasHealing&&config.damage?.main&&message?.flags?.[ID]?.firstStrike?.itemUuid===firstItem(actor)?.uuid&&firstItem(actor)){
   doubleFirstDamage(config.damage.main);
   if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});
  }return result;
 };
 Hooks.on('renderChatMessageHTML',(message,html)=>{if(!message.isContentVisible||!message.flags?.[ID]?.firstStrike||html.querySelector('.dhp-first-strike'))return;const note=html.ownerDocument.createElement('p');note.className='dhp-first-strike';note.textContent='First Strike: double damage.';html.querySelector('.message-content')?.append(note);});
}
