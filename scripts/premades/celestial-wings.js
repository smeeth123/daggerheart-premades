import {nativeDefenseDialog,initializeDefenseRows,useDefenseRow,toggleDefenseRow,renderDefenseRows,registerDamageDefense} from '../damage-defenses.js';
import {isHopePaymentCancellation,hopeCapacity,spendHope,refundHope,chooseHopePayment} from './hope-payment.js';
import {configureDamageContext} from '../damage-context.js';
import { decisionBudget } from '../settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { eligibleStable, spendStable, STABLE_QUERY } from './stable.js';
import { ID } from '../core.js';
import { WINGS_KEY, WINGS_ACTION } from './celestial-wings-data.js';
import { LUNAR_PHASES_KEY, LUNAR_NEW } from './lunar-phases-data.js';
import { unyieldingItem, applyUnyielding } from './unyielding.js';
import { resilientArmor, resilientLastSlot, applyResilient } from './armor-resilient.js';
import { shieldArmorRequest, shieldArmorFor, configureShieldArmor } from './i-am-your-shield.js';
import {withHopeLock} from './hope-lock.js';
import {syncFocus} from './stance-fighter.js';

const QUERY = `${ID}.celestialWingsSpend`;
export const NEW_MOON_QUERY = `${ID}.lunarNewMoonSpend`;
export const COMBINED_ARMOR_QUERY=`${ID}.combinedArmorSpend`;
const queues = new Map();
const newMoonPayments=new Map();
const combinedArmorPayments=new Map();
export let ExtendedDamageDialog;
export function wingsAvailable(item) {
  const metadata = item.flags?.[ID];
  const actions = item.system?.actions;
  const action = actions?.get?.(WINGS_ACTION) ?? actions?.[WINGS_ACTION];
  return item.type === 'feature' && !item.flags?.[ID]?.disabled && !item.system?.inactive &&
    (metadata?.applied?.key ?? metadata?.premade?.key) === WINGS_KEY &&
    action?.uses?.recovery === 'scene' && Number(action.uses.value ?? 0) === 0;
}
export function eligibleWings(actor) {
  if (!actor?.statuses?.has('fly') || !(hopeCapacity(actor) >= 1)) return null;
  return actor.items.find(wingsAvailable) ?? null;
}
export function eligibleNewMoon(actor) {
  if (!(hopeCapacity(actor) >= 1)) return null;
  return actor.items.find(item => {
    const metadata = item.flags?.[ID];
    if (item.type !== 'feature' || metadata?.disabled || item.system?.inactive ||
      (metadata?.applied?.key ?? metadata?.premade?.key) !== LUNAR_PHASES_KEY) return false;
    const effects = item.effects;
    const effect = effects?.get?.(LUNAR_NEW) ?? [...(effects ?? [])].find(entry => entry.id === LUNAR_NEW || entry._id === LUNAR_NEW);
    return effect && !effect.disabled && !effect.isSuppressed;
  }) ?? null;
}
export function damageResult(dialog) {
  const { currentDamage, selectedStressMarks, stressReductions } = dialog.getDamageInfo();
  const stressSpent=selectedStressMarks.filter(mark => mark.armorMarkId).length +
    stressReductions.reduce((sum, reduction) => sum + reduction.cost, 0);
  const result={
    modifiedDamage: currentDamage,
    armorChanges: dialog.marks.armor.flatMap(source => {
      const amount = Object.values(source.marks).filter(mark => mark.selected).length;
      return amount ? [{ uuid: source.effect.uuid, amount }] : [];
    }),
    stressSpent
  };
  if(Array.isArray(dialog.reductions)){
    const costs=new Map(stressSpent?[['stress',stressSpent]]:[]);
    for(const reduction of dialog.reductions.filter(row=>row.enabled))for(const [key,cost]of Object.entries(reduction.costs??{}))
      costs.set(key,(costs.get(key)??0)+Number(cost.value));
    result.resourceCosts=[...costs].map(([key,value])=>({key,value}));
  }
  return result;
}
export function replaceArmorCost(result) {
  if (!result.armorChanges.some(change => change.amount > 0)) throw new Error('Select an Armor Slot to replace with Hope.');
  let replaced = false;
  return { ...result, armorChanges: result.armorChanges.map(change => {
    if (replaced || change.amount < 1) return { ...change };
    replaced = true;
    return { ...change, amount: change.amount - 1 };
  }).filter(change => change.amount > 0) };
}

export async function spendWings(request, { user }) {
  const previous = queues.get(request.actorUuid) ?? Promise.resolve();
  const spending = previous.catch(() => {}).then(async () => {try{let hopePayment;
    const actor = await fromUuid(request.actorUuid);
    if (!user?.active || !actor?.testUserPermission(user, 'OWNER')) throw new Error('You do not own this actor.');
    if (!Number.isFinite(request.deadline) || request.deadline <= decisionNow()) throw new Error('This damage dialog has expired.');
    const item = actor.items.get(request.itemId);
    if (!actor.statuses.has('fly') || !wingsAvailable(item ?? {}) || !(hopeCapacity(actor) >= 1))
      throw new Error('Celestial Wings requires Flying, 1 Hope, and an available scene use.');
    const hope = hopeCapacity(actor);
    const path = `system.actions.${WINGS_ACTION}.uses.value`;
    const marked = await item.update({ [path]: 1 });
    if (!marked || wingsAvailable(item)) throw new Error('Could not spend the Celestial Wings use.');
    try {
      const updated = (hopePayment=await spendHope(actor,1,{locked:false}));
      if (!updated || !hopePayment) throw new Error('Could not spend Hope.');
    } catch (error) {
      await item.update({ [path]: 0 });
      throw error;
    }
    return true;
  }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
  queues.set(request.actorUuid, spending);
  try { return await spending; }
  finally { if (queues.get(request.actorUuid) === spending) queues.delete(request.actorUuid); }
}
export async function spendCombinedArmor(request,{user}){
  if(!/^[A-Za-z0-9]{16}$/.test(request?.id??'')||!Number.isSafeInteger(request.slots)||request.slots<2||
    typeof request.wingsId!=='string'||!request.wingsId||typeof request.stableId!=='string'||!request.stableId)return false;
  const actor=await fromUuid(request.actorUuid);
  if(!user?.active||!actor?.testUserPermission(user,'OWNER'))return false;
  const key=`${user.id}:${request.actorUuid}:${request.id}`,signature=JSON.stringify(request),old=combinedArmorPayments.get(key);
  if(old)return old.signature===signature?old.promise:false;
  const previous=queues.get(actor.uuid)??Promise.resolve();
  const spending=previous.catch(()=>{}).then(async()=>{
    const fail=error=>({paid:false,rolledBack:true,error});
    const reserveHope=request.reserveHope??0,reserveFocus=request.reserveFocus??0;
    const valid=()=>user.active&&actor.testUserPermission(user,'OWNER')&&Number.isFinite(request.deadline)&&request.deadline>decisionNow()&&
      eligibleWings(actor)?.id===request.wingsId&&eligibleStable(actor)?.id===request.stableId&&
      Number.isSafeInteger(reserveHope)&&reserveHope>=0&&Number.isSafeInteger(reserveFocus)&&reserveFocus>=0&&
      hopeCapacity(actor)>=1+reserveHope&&Number(actor.system.resources.focus.value)>=1+reserveFocus;
    if(!valid())return fail('Celestial Wings and Stable require two selected slots, Flying, their active features, 1 Hope, and 1 Focus.');
    // Hopeful's owner choice must happen before acquiring the resource lock.
    const choice=await chooseHopePayment(actor,1,'Celestial Wings');if(choice===null)return fail('Celestial Wings payment was canceled.');
    const result=await withHopeLock(actor.uuid,async()=>{
      if(!valid())return fail('The selected Armor replacements or their resources changed.');
      const wings=eligibleWings(actor),path=`system.actions.${WINGS_ACTION}.uses.value`;
      const action=wings.system.actions?.get?.(WINGS_ACTION)??wings.system.actions[WINGS_ACTION],oldUse=action.uses.value;
      const focus=Number(actor.system.resources.focus.value),hopeBefore=Number(actor.system.resources.hope.value),armorBefore=Number(actor.system.armorScore.value);
      let hopePayment,useAttempted=false,focusAttempted=false,hopeAttempted=false;
      try{
        useAttempted=true;const marked=await wings.update({[path]:1});
        if(!marked||wingsAvailable(wings))throw Error('Could not spend the Celestial Wings use.');
        hopeAttempted=true;hopePayment=await spendHope(actor,1,{locked:true,choice,label:'Celestial Wings'});
        if(!hopePayment?.paid)throw Error('Could not spend Hope for Celestial Wings.');
        focusAttempted=true;const updated=await actor.update({'system.resources.focus.value':focus-1});
        if(!updated||Number(actor.system.resources.focus.value)!==focus-1)throw Error('Could not spend Stable Focus.');
        return {paid:true,hopePayment,focus:1};
      }catch(error){
        const failures=[];
        if(hopeAttempted&&!hopePayment&&(Number(actor.system.resources.hope.value)!==hopeBefore||Number(actor.system.armorScore.value)!==armorBefore))failures.push(Error('Hope or Armor payment was not confirmed'));
        try{if(focusAttempted){const current=Number(actor.system.resources.focus.value);if(current===focus-1){const restored=await actor.update({'system.resources.focus.value':focus});if(!restored||Number(actor.system.resources.focus.value)!==focus)throw Error('Focus refund failed');}else if(current!==focus)throw Error('Focus changed during payment');}}catch(e){failures.push(e);}
        try{if(hopePayment?.paid)await refundHope(actor,hopePayment);}catch(e){failures.push(e);}
        try{if(useAttempted){const restored=await wings.update({[path]:oldUse});if(!restored||!wingsAvailable(wings))throw Error('Celestial Wings use refund failed');}}catch(e){failures.push(e);}
        if(failures.length)throw Error('Armor replacement payment needs manual review: '+failures.map(e=>e.message).join('; '));
        return fail(error.message);
      }
    });
    if(result.paid)try{await syncFocus(actor);}catch(error){console.warn(`${ID} | Stable Focus display sync`,error);}
    return result;
  });
  combinedArmorPayments.set(key,{signature,promise:spending});if(combinedArmorPayments.size>2000)combinedArmorPayments.delete(combinedArmorPayments.keys().next().value);
  queues.set(actor.uuid,spending);
  try{return await spending;}finally{if(queues.get(actor.uuid)===spending)queues.delete(actor.uuid);}
}

export async function spendNewMoon(request, { user }) {
  const key=request.id?`${user?.id}:${request.actorUuid}:${request.id}`:null,signature=JSON.stringify(request);
  if(key){
    if(!/^[A-Za-z0-9]{16}$/.test(request.id))throw Error('Invalid New Moon payment ticket.');
    const old=newMoonPayments.get(key);
    if(old){
      const actor=await fromUuid(request.actorUuid);
      if(!user?.active||!actor?.testUserPermission(user,'OWNER')||old.signature!==signature)return false;
      const receipt=await old.promise;return receipt?.paid===false?false:receipt;
    }
  }
  const previous = queues.get(request.actorUuid) ?? Promise.resolve();
  const spending = previous.catch(() => {}).then(async () => {try{let hopePayment;
    const actor = await fromUuid(request.actorUuid);
    if (!user?.active || !actor?.testUserPermission(user, 'OWNER')) throw new Error('You do not own this actor.');
    if (!Number.isFinite(request.deadline) || request.deadline <= decisionNow()) throw new Error('This damage dialog has expired.');
    if (!eligibleNewMoon(actor) || Number(request.damage) !== 1) throw new Error('New Moon requires Minor damage, its active phase, and 1 Hope.');
    const hope = hopeCapacity(actor);
    const updated = (hopePayment=await spendHope(actor,1,{locked:false}));
    if (!updated || !hopePayment) throw new Error('Could not spend Hope.');
    return request.returnReceipt ? hopePayment : true;
  }catch(error){if(isHopePaymentCancellation(error))return false;throw error;}});
  if(key){newMoonPayments.set(key,{signature,promise:spending});if(newMoonPayments.size>2000)newMoonPayments.delete(newMoonPayments.keys().next().value);}
  queues.set(request.actorUuid, spending);
  try { return await spending; }
  finally { if (queues.get(request.actorUuid) === spending) queues.delete(request.actorUuid); }
}

async function resolveArmorPreservation(actor,result,dialog){
  const count=value=>(value.armorChanges??[]).reduce((sum,row)=>sum+Number(row.amount??0),0);
  let remaining=result;
  try{remaining=await applyResilient(actor,remaining,dialog);}
  catch(error){console.error(`${ID} | Resilient failed`,error);ui.notifications.error('Resilient failed; remaining Armor Slots will be marked normally.');}
  const preservedSlots=count(result)-count(remaining);
  try{remaining=await applyUnyielding(actor,remaining,undefined,{dialog,preservedSlots});}
  catch(error){console.error(`${ID} | Unyielding failed`,error);ui.notifications.error('Unyielding failed; remaining Armor Slots will be marked normally.');}
  return remaining;
}

export function createWingsDialog(Base) {
  return class CelestialWingsDialog extends Base {
    static DEFAULT_OPTIONS = { actions: {
      takeDamage: function() { return this.confirmWings(); },
      rollReductionDice: function(event,target){return this.constructor.onRollReductionDice.call(this,event,target);},
      toggleReduction: function(event,target){return this.constructor.onToggleReduction.call(this,event,target);},
      dhpWings: function() { return this.toggleWings(); },
      dhpStable: function() { return this.toggleWings('stable'); },
      dhpNewMoon: function() { return this.toggleNewMoon(); },
      setMarks: function(event,target){if(!this.armorChoicesLocked())return Base.setMarks.call(this,event,target);},
      toggleRules: function(event,target){if(!this.armorChoicesLocked())return Base.toggleRules.call(this,event,target);},
      useStressReduction: function(event,target){if(!this.armorChoicesLocked())return Base.useStressReduction.call(this,event,target);}
    } };
    constructor(...args) {
      if(Base.length>=6&&args.length===5)args.splice(3,0,null);
      super(...args);
      this.dhpDamageContext=args[6];
      configureDamageContext(this,this.dhpDamageContext);
      if(this.dhpDamageContext?.wardOnly)this.reductions=[];
      initializeDefenseRows(this);
      if(nativeDefenseDialog()&&eligibleNewMoon(this.actor))this.reductions.push({label:'New Moon — Negate Minor damage (1 Hope)',value:'0',enabled:false,isDeterministic:true,costs:{},newMoon:true});
      const baseDamageInfo=this.getDamageInfo.bind(this);
      this.newMoonBaseDamageInfo=(...args)=>{
        const info=baseDamageInfo(...args);
        return this.newMoonArmorResult?{...info,currentDamage:this.newMoonArmorResult.modifiedDamage}:info;
      };
      this.getDamageInfo = () => {
        const info = this.newMoonBaseDamageInfo();
        return this.newMoonSelected && info.currentDamage === 1 ? { ...info, currentDamage: 0 } : info;
      };
      // This module extends its armorSlot query deadline to allow a 60-second decision.
      this.wingsDeadline = decisionNow() + decisionBudget(60000);
      this.wingsTimer = decisionTimeout(() => { if (!this.wingsBusy) void this.close(); }, decisionBudget(60000));
    }
    static async onRollReductionDice(event,target){
      if(this.armorChoicesLocked())return;
      if(await useDefenseRow(this,event,target))return;
      return Base.onRollReductionDice.call(this,event,target);
    }
    static onToggleReduction(event,target){
      const row=this.reductions?.[target.closest('[data-reduction-index]')?.dataset.reductionIndex];
      if(row?.newMoon){event.stopPropagation();return this.toggleNewMoon();}
      if(this.armorChoicesLocked())return;
      if(toggleDefenseRow(this,event,target))return;
      return Base.onToggleReduction.call(this,event,target);
    }
    async close(...args) {
      if (this.wingsBusy && !args[0]) return;
      clearDecisionTimeout(this.wingsTimer);
      clearInterval(this.wingsCountdown);
      return super.close(...args);
    }
    armorChoicesLocked(){return Boolean(this.newMoonArmorResult||this.combinedArmorRequest);}
    replacementModes(){
      if(this.combinedArmorRequest)return ['wings','stable'];
      return this.armorReplacementModes??(this.wingsSelected?[this.armorReplacementMode??'wings']:[]);
    }
    setReplacementModes(modes){
      this.armorReplacementModes=[...new Set(modes)];this.wingsSelected=this.armorReplacementModes.length>0;
      this.armorReplacementMode=this.armorReplacementModes.at(-1)??'wings';
    }
    toggleWings(mode = 'wings') {
      if(this.wingsBusy||this.newMoonArmorResult||this.combinedArmorRequest||!['wings','stable'].includes(mode))return;
      const modes=this.replacementModes(),count=()=>damageResult(this).armorChanges.reduce((sum,row)=>sum+row.amount,0);
      if(modes.includes(mode)){
        const remaining=modes.filter(value=>value!==mode),auto=this.armorAutoMarks?.[mode];
        this.setReplacementModes(remaining);
        if(auto?.mark.selected&&count()-1>=remaining.length)Base.setMarks.call(this,null,auto.target);
        if(this.armorAutoMarks)delete this.armorAutoMarks[mode];
        return this.render();
      }
      if(!(mode==='stable'?eligibleStable(this.actor):eligibleWings(this.actor)))return;
      let wanted=[...modes,mode];
      if(count()<wanted.length){
        const info=this.newMoonBaseDamageInfo();
        if(info.currentDamage>0&&(!this.rulesOn||info.availableArmor>0)){
          for(const [index,source]of this.marks.armor.entries()){
            const entry=Object.entries(source.marks).find(([,mark])=>!mark.spent&&!mark.disabled&&!mark.selected);if(!entry)continue;
            const [id,mark]=entry,target={dataset:{type:'armor',path:`armor.${index}.marks.${id}`,id}},moon=this.newMoonSelected;
            this.newMoonSelected=false;
            try{Base.setMarks.call(this,null,target);}finally{this.newMoonSelected=moon;}
            if(mark.selected){this.armorAutoMarks??={};this.armorAutoMarks[mode]={mark,target};}
            break;
          }
        }
        if(count()<wanted.length){
          if(!count())return;
          // A single-slot reduction still offers alternative payment methods.
          const auto=modes.map(value=>this.armorAutoMarks?.[value]).find(Boolean);
          this.armorAutoMarks={...(auto?{[mode]:auto}:{})};wanted=[mode];
        }
      }
      this.setReplacementModes(wanted);
      if(this.newMoonSelected&&this.newMoonBaseDamageInfo().currentDamage!==1){this.newMoonSelected=false;for(const row of this.reductions??[])if(row.newMoon)row.enabled=false;}
      return this.render();
    }
    async prepareCombinedArmor(result){
      if(this.combinedArmorResult)return this.combinedArmorResult;
      if(!this.combinedArmorRequest){
        const slots=result.armorChanges.reduce((sum,row)=>sum+row.amount,0);
        if(slots<2)throw Error('Select two Armor Slots to use both Celestial Wings and Stable.');
        const wings=eligibleWings(this.actor),stable=eligibleStable(this.actor);
        if(!wings||!stable)throw Error('Both selected Armor replacements must still be available.');
        const cost=key=>result.resourceCosts?.filter(row=>row.key===key).reduce((sum,row)=>sum+Number(row.value),0)??0;
        this.combinedArmorPlan=result;
        this.combinedArmorRequest={id:foundry.utils.randomID(),actorUuid:this.actor.uuid,wingsId:wings.id,stableId:stable.id,slots,
          reserveHope:cost('hope')+(this.newMoonSelected?1:0),reserveFocus:cost('focus'),deadline:this.wingsDeadline};
      }
      const gm=game.users.activeGM,request=this.combinedArmorRequest;
      const paid=gm&&!gm.isSelf?await gm.query(COMBINED_ARMOR_QUERY,request,{timeout:Math.max(1,this.wingsDeadline-decisionNow())}):await spendCombinedArmor(request,{user:game.user});
      if(!paid?.paid){if(paid===false||paid?.rolledBack){this.combinedArmorRequest=null;this.combinedArmorPlan=null;}throw Error(paid?.error??'Could not confirm the Armor replacement payments.');}
      this.combinedArmorResult=replaceArmorCost(replaceArmorCost(this.combinedArmorPlan));
      return this.combinedArmorResult;
    }
    toggleNewMoon() {
      if (this.wingsBusy || !this.newMoonSelected&&(!eligibleNewMoon(this.actor)||this.newMoonBaseDamageInfo().currentDamage!==1)) return;
      this.newMoonSelected = !this.newMoonSelected;
      for(const row of this.reductions??[])if(row.newMoon)row.enabled=this.newMoonSelected;
      return this.render();
    }
    async confirmNewMoon(){
      if(this.wingsBusy)return;
      if(this.newMoonSelected&&!this.newMoonArmorResult&&!this.combinedArmorRequest&&(!eligibleNewMoon(this.actor)||this.newMoonBaseDamageInfo().currentDamage!==1)){
        this.newMoonSelected=false;ui.notifications.warn('New Moon requires Minor damage, its active phase, and 1 Hope.');return this.render();
      }
      this.wingsBusy=true;
      try{
        if(!this.newMoonArmorResult){
          // Start with actual HP, rather than the conditional New Moon preview.
          let result={...damageResult(this),modifiedDamage:this.newMoonBaseDamageInfo().currentDamage};
          const modes=this.replacementModes();
          if(modes.length===2||this.combinedArmorRequest)result=await this.prepareCombinedArmor(result);
          else if(modes.length===1){
            const stable=modes[0]==='stable',item=stable?eligibleStable(this.actor):eligibleWings(this.actor);
            if(!item)throw Error('The selected Armor replacement is no longer available.');
            if(!stable&&hopeCapacity(this.actor)<2)throw Error('Celestial Wings and New Moon together require two Hope payments.');
            result=replaceArmorCost(result);
            const request={actorUuid:this.actor.uuid,itemId:item.id,deadline:this.wingsDeadline},gm=game.users.activeGM;
            const paid=gm&&!gm.isSelf?await gm.query(stable?STABLE_QUERY:QUERY,request,{timeout:Math.max(1,this.wingsDeadline-decisionNow())}):
              await(stable?spendStable:spendWings)(request,{user:game.user});
            if(!paid)throw Error('Could not spend the selected Armor replacement cost.');
          }
          const provisionalDamage=result.modifiedDamage;
          result=await resolveArmorPreservation(this.actor,result,this);
          // These choices are now committed. A payment retry must not repeat
          // free preservation rolls or an already-paid Wings/Stable cost.
          this.newMoonArmorResult=result;
          if(await this.offerNewMoonAfterPreservation(result,provisionalDamage))return;
        }
        let result=this.newMoonArmorResult;
        if(this.newMoonSelected&&result.modifiedDamage===1){
          if(!this.newMoonRequest&&!eligibleNewMoon(this.actor))throw Error('New Moon is no longer available. Decline it to confirm the remaining damage.');
          this.newMoonRequest??={id:foundry.utils.randomID(),actorUuid:this.actor.uuid,damage:1,deadline:this.wingsDeadline,returnReceipt:nativeDefenseDialog()};
          const gm=game.users.activeGM,request=this.newMoonRequest;
          const paid=gm&&!gm.isSelf?await gm.query(NEW_MOON_QUERY,request,{timeout:Math.max(1,this.wingsDeadline-decisionNow())}):await spendNewMoon(request,{user:game.user});
          if(!paid){this.newMoonRequest=null;throw Error('Could not spend Hope for New Moon.');}
          if(paid.armor&&this.marks.armor.some(source=>{
            if(!result.armorChanges.some(change=>change.uuid===source.effect.uuid&&change.amount>0))return false;
            const armor=source.effect.type==='armor'?source.effect.system.armor:source.effect.system.armorData;
            return Object.values(source.marks).some((mark,index)=>mark.selected&&index<Number(armor?.current??0));
          })){
            await refundHope(this.actor,paid);this.newMoonRequest=null;this.newMoonSelected=false;
            throw Error('Hopeful would spend an Armor Slot already selected for damage reduction. Choose a different Hope payment or decline New Moon.');
          }
          result={...result,modifiedDamage:0};
        }else if(this.newMoonSelected){
          this.newMoonSelected=false;ui.notifications.info('Final damage is not Minor; New Moon was not spent.');
        }
        this.resolve(result);await this.close(true);
      }catch(error){ui.notifications.error(error.message);await this.render();}
      finally{this.wingsBusy=false;if(decisionNow()>=this.wingsDeadline)await this.close();}
    }
    async confirmWings() {
      if (this.wingsBusy) return;
      if(this.reductions?.some(row=>row.enabled&&!row.isDeterministic&&!row.roll)){
        ui.notifications.warn('Roll the selected damage reductions before confirming damage.');
        return;
      }
      if(this.newMoonSelected||this.newMoonArmorResult||this.replacementModes().length===2||this.combinedArmorRequest)return this.confirmNewMoon();
      if (!this.wingsSelected) {
        if ((!unyieldingItem(this.actor) && !resilientLastSlot(this.actor, damageResult(this))) || !damageResult(this).armorChanges.length) return Base.takeDamage.call(this);
        this.wingsBusy = true;
        try {
          const before=damageResult(this),result=await resolveArmorPreservation(this.actor,before,this);
          await this.finishArmorPreservation(result,before.modifiedDamage);
        } catch (error) {
          console.error(`${ID} | Armor preservation failed`, error);
          ui.notifications.error('Armor preservation failed; the selected Armor Slots will be marked normally.');
          this.resolve(damageResult(this));
          await this.close(true);
        } finally { this.wingsBusy = false; }
        return;
      }
      const stable = this.armorReplacementMode === 'stable';
      const item = stable ? eligibleStable(this.actor) : eligibleWings(this.actor);
      if (!item) {
        this.wingsSelected = false;
        ui.notifications.warn(stable ? 'Stable requires its active stance and 1 Focus.' : 'Celestial Wings requires Flying, 1 Hope, and an available scene use.');
        return this.render();
      }
      this.wingsBusy = true;
      try {
        const result = replaceArmorCost(damageResult(this));
        const request = { actorUuid: this.actor.uuid, itemId: item.id, deadline: this.wingsDeadline };
        const gm = game.users.activeGM;
        const paid = gm && !gm.isSelf
          ? await gm.query(stable ? STABLE_QUERY : QUERY, request, { timeout: Math.max(1, this.wingsDeadline - decisionNow()) })
          : await (stable ? spendStable : spendWings)(request, { user: game.user });
        if (!paid) throw new Error('Could not spend the selected armor replacement cost.');
        const finalResult=await resolveArmorPreservation(this.actor,result,this);
        await this.finishArmorPreservation(finalResult,result.modifiedDamage);
      } catch (error) {
        ui.notifications.error(error.message);
      } finally {
        this.wingsBusy = false;
        if (decisionNow() >= this.wingsDeadline) await this.close();
      }
    }
    async finishArmorPreservation(result,provisionalDamage){
      if(await this.offerNewMoonAfterPreservation(result,provisionalDamage))return;
      this.resolve(result);await this.close(true);
    }
    async offerNewMoonAfterPreservation(result,provisionalDamage){
      // Only pause for a real, newly available player decision. A correction
      // alone is not another confirmation step.
      if(result.modifiedDamage===1&&provisionalDamage!==1&&!this.newMoonSelected&&eligibleNewMoon(this.actor)){
        this.newMoonArmorResult=result;
        await this.render();return true;
      }
      return false;
    }
  };
}

export function registerCelestialWings() {
  if(nativeDefenseDialog())registerDamageDefense('newMoon',{offers:record=>eligibleNewMoon(record.actor)?[{id:'newMoon',label:'New Moon',uiOnly:true}]:[],use:async()=>false});
  const Base = game.system.api.applications.dialogs.DamageReductionDialog;
  const WingsDialog = createWingsDialog(Base);
  ExtendedDamageDialog=WingsDialog;
  const originalQuery = CONFIG.queries.armorSlot;
  const UserClass = CONFIG.User?.documentClass;
  if (UserClass && !UserClass.dhpArmorTimeout) {
    const nativeQuery = UserClass.prototype.query;
    UserClass.prototype.query = async function(name, data, options = {}) {
      if (name === 'armorSlot') {
        const shield = shieldArmorRequest(data.actorId);
        if (shield) data = { ...data, [ID]: { ...data[ID], iAmYourShield: shield } };
      }
      if (name === 'armorSlot') { const actor = await fromUuid(data.actorId); if(data[ID]?.damageContext?.defenses)options={...options,timeout:decisionBudget(185000)};
        else if (eligibleWings(actor) || eligibleStable(actor) || eligibleNewMoon(actor) || unyieldingItem(actor) || resilientArmor(actor) || [...(actor?.effects??[])].some(effect=>!effect.disabled&&effect.flags?.[ID]?.runeWard?.state==='charged')) options = { ...options, timeout: decisionBudget(65000) }; }
      return nativeQuery.call(this, name, data, options);
    };
    UserClass.dhpArmorTimeout = true;
  }
  CONFIG.queries[QUERY] = spendWings;
  CONFIG.queries[STABLE_QUERY] = spendStable;
  CONFIG.queries[NEW_MOON_QUERY] = spendNewMoon;
  CONFIG.queries[COMBINED_ARMOR_QUERY]=spendCombinedArmor;
  CONFIG.queries.armorSlot = async function(data, ...args) {
    const actor = await fromUuid(data.actorId);
    if (!actor?.isOwner) return originalQuery.call(this, data, ...args);
    const shield = await shieldArmorFor(data);
    if (!(data[ID]?.damageContext || shield || eligibleWings(actor) || eligibleStable(actor) || eligibleNewMoon(actor) || unyieldingItem(actor) || resilientArmor(actor))) return originalQuery.call(this, data, ...args);
    const action=data.actionUuid?await fromUuid(data.actionUuid):null;
    const modern=typeof actor.getActionClone==='function';
    return new Promise((resolve, reject) => {
      const dialog = modern?new WingsDialog(resolve,reject,actor,action,data.damage,data.type,data[ID]?.damageContext):new WingsDialog(resolve,reject,actor,data.damage,data.type);
      if (shield) configureShieldArmor(dialog, shield);
      dialog.render({ force: true });
    });
  };
  Hooks.on('daggerheart.preUseAction', action => {
    const flags = action.item?.flags?.[ID];
    if (action.id !== WINGS_ACTION || (flags?.applied?.key ?? flags?.premade?.key) !== WINGS_KEY) return;
    ui.notifications.info('Use Celestial Wings in the damage-reduction dialog while Flying.');
    return false;
  });
  Hooks.on('renderApplicationV2', (app, html) => {
    if (!(app instanceof WingsDialog)) return;
    clearInterval(app.wingsCountdown);
    const countdown = () => { if (app.window?.title) app.window.title.textContent = `${app.title} ${decisionCountdown(app.wingsDeadline)}`; };
    countdown();
    app.wingsCountdown = setInterval(countdown, 250);
    void renderDefenseRows(app,html);
    for(const row of app.reductions??[])if(row.newMoon){
      row.enabled=Boolean(app.newMoonSelected&&(eligibleNewMoon(app.actor)||app.newMoonRequest)&&app.newMoonBaseDamageInfo().currentDamage===1);
      const index=app.reductions.indexOf(row),element=html.querySelector(`[data-reduction-index="${index}"]`);
      element?.classList.toggle('inactive',!row.enabled);
      const value=element?.querySelector('.reduction-roll-section');if(value)value.textContent='Minor → None';
    }
    html.querySelectorAll('.dhp-wings-option').forEach(element => element.remove());
    const bypassArmor=Boolean(app.dhpDamageContext?.wardOnly);
    if(bypassArmor&&!app.armorChoicesLocked())app.setReplacementModes([]);
    if (app.iAmYourShield) {
      const note = html.ownerDocument.createElement('p');
      note.className = 'dhp-wings-option';
      note.textContent = 'I Am Your Shield: you may mark any available Armor Slots for this attack.';
      html.querySelector('.damage-reduction-container footer')?.before(note);
    }
    if (!damageResult(app).armorChanges.length&&!app.armorChoicesLocked()) app.setReplacementModes([]);
    if ((!eligibleNewMoon(app.actor)&&!app.newMoonRequest) || app.newMoonBaseDamageInfo().currentDamage !== 1) app.newMoonSelected = false;
    const selectedModes=app.replacementModes();
    for (const option of [
      { mode: 'wings', available: eligibleWings(app.actor), action: 'dhpWings', name: 'Celestial Wings', resource: 'Hope', icon: 'fa-sun' },
      { mode: 'stable', available: eligibleStable(app.actor), action: 'dhpStable', name: 'Stable', resource: 'Focus', icon: 'fa-bullseye' }
    ]) {
      const selected=selectedModes.includes(option.mode);
      if ((!option.available&&!selected)||bypassArmor) continue;
      const section = html.ownerDocument.createElement('div');
      section.className = 'section-container dhp-wings-option';
      section.innerHTML = `<h4 class="chip-container">
        <div class="chip-inner-container selectable${option.available?' active':''}${selected ? ' selected' : ''}"
          data-action="${option.action}" role="button" tabindex="0" aria-pressed="${Boolean(selected)}">
          ${option.name}
          <div class="stress-reduction-cost">1 <i class="fa-solid ${option.icon}" aria-label="${option.resource}"></i></div>
        </div>
      </h4>`;
      const control = section.querySelector('[data-action]');
      control.title = `Spend 1 ${option.resource} instead of marking an Armor Slot`;
      control.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); }
      });
      html.querySelector('.damage-reduction-container footer')?.before(section);
    }
    if (!nativeDefenseDialog() && (eligibleNewMoon(app.actor)||app.newMoonRequest) && app.newMoonBaseDamageInfo().currentDamage === 1) {
      const section = html.ownerDocument.createElement('div');
      section.className = 'section-container dhp-wings-option';
      section.innerHTML = `<h4 class="chip-container"><div class="chip-inner-container selectable active${app.newMoonSelected ? ' selected' : ''}" data-action="dhpNewMoon" role="button" tabindex="0" aria-pressed="${Boolean(app.newMoonSelected)}">New Moon<div class="stress-reduction-cost">1 <i class="fa-solid fa-moon" aria-label="Hope"></i></div></div></h4>`;
      const control = section.querySelector('[data-action]');
      control.title = 'Spend 1 Hope to negate Minor damage';
      control.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); } });
      html.querySelector('.damage-reduction-container footer')?.before(section);
    }
    if(app.armorChoicesLocked()){
      for(const [index,row]of app.reductions.entries())if(!row.newMoon){
        const element=html.querySelector(`[data-reduction-index="${index}"]`);
        if(element){element.style.pointerEvents='none';for(const control of element.querySelectorAll('input, select, button'))control.disabled=true;}
      }
      for(const control of html.querySelectorAll('[data-action="setMarks"], [data-action="toggleRules"], [data-action="useStressReduction"], [data-action="dhpWings"], [data-action="dhpStable"]')){
        control.style.pointerEvents='none';control.setAttribute('aria-disabled','true');
      }
      const note=html.ownerDocument.createElement('p');note.className='dhp-wings-option';
      note.textContent=app.newMoonArmorResult&&eligibleNewMoon(app.actor)&&app.newMoonBaseDamageInfo().currentDamage===1
        ?'Minor damage remains. Use New Moon for 1 Hope, or confirm to take 1 HP.'
        :'Your previous selections are saved. Confirm damage to continue.';
      html.querySelector('.damage-reduction-container footer')?.before(note);
    }
  });
}
