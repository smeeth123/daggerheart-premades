import {ID,featureActive} from '../core.js';
import {RAIN_OF_BLADES_KEY,RAIN_OF_BLADES_ACTION} from './rain-of-blades-data.js';
export const RAIN_FLAVOR='Rain of Blades';
const DAMAGE_WRAP=Symbol.for(`${ID}.rainOfBladesDamage`),APPLY_WRAP=Symbol.for(`${ID}.rainOfBladesApply`);
export function rainOfBladesAction(action){
  const item=action?.item,flags=item?.flags?.[ID],system=item?.system;
  return Boolean(action?.id===RAIN_OF_BLADES_ACTION&&action.type==='attack'&&item?.type==='domainCard'&&featureActive(item)&&!flags?.disabled&&
    (!system?.inVault||system.vaultActive)&&!system?.isDomainTouchedSuppressed&&(flags?.applied?.key??flags?.premade?.key)===RAIN_OF_BLADES_KEY);
}
function context(config){
  const message=config.message??game.messages.get(config.source?.message),actor=config.data?.parent??foundry.utils.fromUuidSync?.(config.source?.actor);
  const item=actor?.items?.get?.(config.source?.item),actions=item?.system?.actions;
  const action=message?.system?.action??actions?.get?.(config.source?.action)??actions?.[config.source?.action];
  return {message,action};
}
export function prepareRainOfBlades(config){
  const {message,action}=context(config);
  if(config.hasHealing||!config.damageFormula||!rainOfBladesAction(action))return false;
  const targets=(message?.system?.targeting?.usingSelect?message.system._getCurrentTargets?.():null)??config.targets??message?.system?.targets??[],seen=new Set(),vulnerable=[];
  for(const target of targets){
    const actor=foundry.utils.fromUuidSync?.(target.actorId);
    if(!actor?.statuses?.has('vulnerable')||seen.has(actor.uuid))continue;
    seen.add(actor.uuid);vulnerable.push({actorId:actor.uuid,name:target.name??actor.name});
  }
  if(!vulnerable.length)return false;
  const extra=`1d8[${RAIN_FLAVOR}]`;
  if(!config.damageFormula.extraFormula?.includes(extra))config.damageFormula.extraFormula=[config.damageFormula.extraFormula,extra].filter(Boolean).join(' + ');
  config[ID]={...config[ID],rainOfBlades:{targets:vulnerable}};
  return true;
}
export function rainOfBladesBonus(main,{flavor=RAIN_FLAVOR,formulaKey='rainOfBladesFormula'}={}){
  const dice=(main?.dice??[]).filter(die=>die.options?.flavor===flavor);if(!dice.length)return 0;
  const metadata=main.options?.[ID]?.[formulaKey];
  const maximum=dice.reduce((sum,die)=>sum+Number(die.faces)*die.results.filter(result=>result.active!==false&&!result.discarded).length,0);
  // Native configured critical damage is inside the formula's multiplier. The
  // DamageRoll critical getter adds its maximum outside it; generic Roll does not.
  let bonus=(dice.reduce((sum,die)=>sum+Number(die.total),0)+(metadata?.criticalFlat?maximum:0))*(metadata?.multiplier??1);
  if(main.isCritical)bonus+=maximum;
  const doubled=main.options?.[ID]?.manipulateMagic;
  if(doubled?.mode==='damage'&&dice.includes(main.dice[Number(doubled.die?.id?.split(':')[0])]))bonus+=Number(doubled.die.value)||0;
  return Number.isFinite(bonus)&&bonus>=0?bonus:0;
}
function serializeDamage(config){
  const damage=config.damage;
  if(typeof damage.toObject==='function')config.damage=new damage.constructor({...damage.toObject(),main:damage.main.toJSON(),
    resources:Object.fromEntries(Object.entries(damage.resources??{}).map(([key,value])=>[key,value.toJSON()]))});
}
export function tagRainOfBlades(config,nativeScaling=false){
  const main=config.damage?.main,record=config[ID]?.rainOfBlades??main?.options?.[ID]?.rainOfBlades;
  if(config.hasHealing||!main||!record)return false;
  main.options??={};
  main.options[ID]={...main.options[ID],rainOfBlades:{targets:record.targets,bonus:rainOfBladesBonus(main),referenceTotal:main.total,nativeScaling}};
  serializeDamage(config);return true;
}
export function rainOfBladesPacket(packet,actor,{recordKey='rainOfBlades',appliedKey='rainOfBladesApplied',...bonusOptions}={}){
  const main=packet?.main??(Number.isFinite(packet?.total)?packet:null),meta=main?.options?.[ID];
  let record=meta?.[recordKey];
  if(!Number.isFinite(main?.total)||!record||meta[appliedKey])return packet;
  // The source-less chat fallback passes a prepared Roll directly, without the
  // native field's scaling step. Recalculate after any later chat-card reroll.
  if(typeof main.toJSON==='function')record={...record,bonus:rainOfBladesBonus(main,bonusOptions),referenceTotal:main.total,nativeScaling:false};
  let subtract=0;
  if(!record.targets.some(target=>target.actorId===actor.uuid)){
    subtract=record.bonus;
    if(record.nativeScaling){
      const configured=Number(actor.system?.rules?.attack?.damage?.hpDamageTakenMultiplier??1),multiplier=Number.isFinite(configured)?configured:1;
      subtract=Math.ceil(record.referenceTotal*multiplier)-Math.ceil(Math.max(0,record.referenceTotal-record.bonus)*multiplier);
    }
  }
  const updated={...meta,[recordKey]:record,[appliedKey]:true};
  // Sequential conditional bonuses must round the remaining shared damage, not
  // independently round each deduction against the original total.
  if(subtract&&record.nativeScaling)for(const [key,value]of Object.entries(meta)){
    if(key!==recordKey&&value?.nativeScaling&&Array.isArray(value.targets)&&Number.isFinite(value.referenceTotal)&&Number.isFinite(value.bonus))
      updated[key]={...value,referenceTotal:Math.max(0,value.referenceTotal-record.bonus)};
  }
  const adjusted={...main,total:Math.max(0,main.total-subtract),options:{...main.options,[ID]:updated}};
  return main===packet?{...adjusted,resources:packet.resources}:{...packet,main:adjusted,resources:packet.resources};
}
export function installRainOfBlades(Damage,DamageField,Actor){
  if(!Damage[DAMAGE_WRAP]){
    const create=Damage.createRollInstance,construct=Damage.prototype.constructFormula,evaluate=Damage.buildEvaluate;
    Damage.createRollInstance=function(config){prepareRainOfBlades(config);return create.call(this,config);};
    Damage.prototype.constructFormula=function(part,config,isDamage,...args){
      const result=construct.call(this,part,config,isDamage,...args);
      if(isDamage&&result?.roll&&config[ID]?.rainOfBlades){
        const roll=result.roll;roll.options??={};
        roll.options[ID]={...roll.options[ID],rainOfBladesFormula:{criticalFlat:Boolean(config.isCritical&&config.dialog?.configure!==false),
          multiplier:this.getTotalBonus('system.rules.attack.damage.hpDamageMultiplier')||1}};
      }
      return result;
    };
    // Run after existing damage reroll/Manipulate Magic choices, then serialize the final bonus.
    Damage.buildEvaluate=async function(roll,config,...args){const result=await evaluate.call(this,roll,config,...args);tagRainOfBlades(config);return result;};
    Object.defineProperty(Damage,DAMAGE_WRAP,{value:true});
  }
  if(!DamageField[APPLY_WRAP]){
    const native=DamageField.applyDamage;
    DamageField.applyDamage=async function(config,...args){tagRainOfBlades(config,true);return native.call(this,config,...args);};
    Object.defineProperty(DamageField,APPLY_WRAP,{value:true});
  }
  if(!Actor[APPLY_WRAP]){
    const native=Actor.prototype.takeDamage;
    Actor.prototype.takeDamage=async function(packet,...args){return native.call(this,rainOfBladesPacket(packet,this),...args);};
    Object.defineProperty(Actor,APPLY_WRAP,{value:true});
  }
}
export function rainOfBladesLines(message){
  if(!message.isContentVisible)return [];
  const main=message.system?.damage?.main,record=main?.options?.[ID]?.rainOfBlades;
  const bonus=typeof main?.toJSON==='function'?rainOfBladesBonus(main):record?.bonus;
  return record&&bonus?[`Rain of Blades: Vulnerable targets hit take an extra 1d8 (${bonus}); other targets take ${Math.max(0,main.total-bonus)} damage before defenses.`]:[];
}
export function registerRainOfBlades(){
  installRainOfBlades(CONFIG.Dice.daggerheart.DamageRoll,game.system.api.fields.ActionFields.DamageField,CONFIG.Actor.documentClass);
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const lines=rainOfBladesLines(message);if(!lines.length||html.querySelector('.dhp-rain-of-blades'))return;
    const note=html.ownerDocument.createElement('p');note.className='dhp-rain-of-blades';note.textContent=lines[0];html.querySelector('.message-content')?.append(note);
  });
}
