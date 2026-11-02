import {ID} from '../core.js';
import {decisionBudget} from '../settings.js';
import {decisionNow} from '../decision-clock.js';
import {hopeCapacity} from './hope-payment.js';
import {ExtendedDamageDialog} from './celestial-wings.js';
import {registerWardDamageFallback} from '../damage-context.js';
import {damageProtectionExempt} from './damage-protection.js';
import {shieldArmorFor,configureShieldArmor} from './i-am-your-shield.js';

export const nativeRuneWard=()=>{
 const [major,minor]=String(globalThis.game?.system?.version??'').split('.').map(Number);
 return major>2||major===2&&minor>=12;
};
export const wardReductionLabel=itemUuid=>`${ID}:runeWard:${itemUuid}`;
export function wardReductionChange(itemUuid){return {type:'damageReduction',phase:'initial',priority:0,
 value:{label:wardReductionLabel(itemUuid),value:'1d8',costs:[{type:'hope',value:1}]}};}

export function reconcileWardArmor(dialog){
 const cleared=new Set();
 for(const source of dialog.marks.armor){
  const armor=source.effect.type==='armor'?source.effect.system.armor:source.effect.system.armorData;
  Object.entries(source.marks).forEach(([id,mark],index)=>{
   if(index<Number(armor?.current??0)){if(mark.selected)cleared.add(id);mark.selected=false;mark.spent=true;mark.disabled=true;}
  });
 }
 for(const mark of Object.values(dialog.marks.stress))if(cleared.has(mark.armorMarkId))mark.armorMarkId=null;
}

export function createRuneWardDialog(Base,candidates,dispatch){
 return class RuneWardDialog extends Base{
  static DEFAULT_OPTIONS={actions:{
   rollReductionDice:function(event,target){return this.rollWard(event,target);},
   toggleReduction:function(event,target){return this.toggleWard(event,target);}
  }};
  constructor(...args){
   super(...args);
   // Match each native row to a validated source, never to its display name.
   this.reductions=this.reductions.filter(row=>!String(row.label).startsWith(`${ID}:runeWard:`));
   for(const {effect,item}of candidates)this.reductions.push({label:'Rune Ward',value:'1d8',enabled:false,isDeterministic:false,
    costs:{hope:{label:'Hope',value:1}},ward:{effectId:effect.id,itemUuid:item.uuid,id:foundry.utils.randomID()}});
  }
  reductionAt(target){const element=target.closest('[data-reduction-index]');return element?this.reductions[Number(element.dataset.reductionIndex)]:null;}
  toggleWard(event,target){
   const row=this.reductionAt(target);
   if(!row?.ward)return Base.onToggleReduction.call(this,event,target);
   if(row.ward.busy||row.roll)return;
   if(!row.enabled&&hopeCapacity(this.actor)<1){ui.notifications.warn('Rune Ward requires 1 Hope.');return;}
   row.enabled=!row.enabled;return this.render();
  }
  async rollWard(event,target){
   const row=this.reductionAt(target);
   if(!row?.ward)return Base.onRollReductionDice.call(this,event,target);
   event.stopPropagation();
   if(this.wingsBusy||row.ward.busy||!row.roll&&hopeCapacity(this.actor)<1)return;
   row.ward.busy=true;this.wingsBusy=true;
   try{
    const reroll=Boolean(row.roll),revision=(row.ward.revision??0)+(reroll?1:0);
    const result=await dispatch({op:reroll?'nativeReroll':'nativeRoll',id:row.ward.id,holderUuid:this.actor.uuid,effectId:row.ward.effectId,
     ...(reroll?{revision}:{}),total:this.damage,deadline:decisionNow()+decisionBudget(120000)});
    if(!result)return;
    row.roll=typeof result.roll==='string'?Roll.fromJSON(result.roll):Roll.fromData(result.roll);row.enabled=true;row.costs={};
    row.ward.revision=revision;
    reconcileWardArmor(this);
    row.label=`Rune Ward — 1 Hope spent${result.drained?' (drained)':''}`;
   }catch(error){ui.notifications.error(error.message);}
   finally{row.ward.busy=false;this.wingsBusy=false;await this.render();}
  }
  async confirmWings(){if(this.reductions.some(row=>row.ward?.busy))return;return super.confirmWings();}
  async close(...args){
   if(this.reductions.some(row=>row.ward?.busy))return;
   for(const row of this.reductions.filter(row=>row.ward&&row.roll)){
    try{await dispatch({op:'nativeClose',id:row.ward.id,holderUuid:this.actor.uuid,total:this.damage,deadline:decisionNow()+decisionBudget(120000)});}
    catch(error){console.warn(`${ID} | Rune Ward session cleanup`,error);}
   }
   return super.close(...args);
  }
 };
}

export function registerNativeRuneWard(candidatesFor,dispatch,available){
 registerWardDamageFallback(actor=>!damageProtectionExempt(actor)&&hopeCapacity(actor)>=1&&available(actor));
 const previous=CONFIG.queries.armorSlot;
 CONFIG.queries.armorSlot=async function(data,...args){
  const actor=await fromUuid(data.actorId);
  if(!actor?.isOwner)return previous.call(this,data,...args);
  const candidates=await candidatesFor(actor);
  if(!candidates.length)return previous.call(this,data,...args);
  const action=data.actionUuid?await fromUuid(data.actionUuid):null,shield=await shieldArmorFor(data);
  const Dialog=createRuneWardDialog(ExtendedDamageDialog,candidates,dispatch);
  return new Promise((resolve,reject)=>{
   const dialog=new Dialog(resolve,reject,actor,action,data.damage,data.type,data[ID]?.damageContext);
   if(shield)configureShieldArmor(dialog,shield);
   dialog.render({force:true});
  });
 };
}
