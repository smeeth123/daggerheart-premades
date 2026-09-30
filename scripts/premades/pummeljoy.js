import { isWeaponAttack } from './weapon-attack.js';
import { ID,featureActive } from '../core.js';
import { PUMMEL_KEY } from './pummeljoy-data.js';
export function pummelEligible(message){const d=message?.system,actor=d?.action?.actor;return Boolean(d?.action?.type==='attack'&&d.action.range==='melee'&&isWeaponAttack(d)&&d.roll?.isCritical&&actor?.items?.some(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===PUMMEL_KEY;}));}
export function installPummelRewards(Duality){const native=Duality.addDualityResourceUpdates,done=new WeakSet();Duality.addDualityResourceUpdates=async function(config){const result=await native.call(this,config);if(!done.has(config)&&pummelEligible(config.message)&&!config.skips?.resources){done.add(config);config.resourceUpdates.addResources([{key:'hope',value:1,enabled:true},{key:'stress',value:-1,enabled:true}]);await config.message.setFlag(ID,'pummeljoy',true);}return result;};}
export function applyPummelProficiency(config,message){if(config.hasHealing||!pummelEligible(message)||config[ID]?.pummelProficiency)return false;const prof=Number(config.data?.prof);if(!Number.isFinite(prof))return false;config.data={...config.data,prof:prof+1,system:{...config.data.system,proficiency:prof+1}};config[ID]={...config[ID],pummelProficiency:true};return true;}
export function registerPummeljoy(){
 installPummelRewards(CONFIG.Dice.daggerheart.DualityRoll);
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,native=Damage.buildConfigure;
 Damage.buildConfigure=async function(config,...args){const message=game.messages.get(config.source?.message);if(applyPummelProficiency(config,message)){
   const action=message.system.action,Field=game.system.api.fields.ActionFields.DamageField;
   if(action.damage?.main&&config.damageFormula){
    const context=new Proxy(action,{get(target,key){if(key==='getRollData')return (...a)=>({...target.getRollData(...a),prof:config.data.prof});return Reflect.get(target,key,target);}});
    const formulas=Field.formatFormulas.call(context,[action.damage.main],config);
    if(formulas[0])config.damageFormula={...config.damageFormula,formula:formulas[0].formula};
   }
  }return native.call(this,config,...args);};
 Hooks.on('renderChatMessageHTML',(message,html)=>{if(!message.flags?.[ID]?.pummeljoy)return;const root=html instanceof HTMLElement?html:html?.[0];if(!root||root.querySelector('.dh-pummeljoy'))return;const note=document.createElement('p');note.className='dh-pummeljoy';note.textContent='Pummeljoy: +1 additional Hope, clear 1 additional Stress, and +1 Proficiency for this attack.';(root.querySelector('.message-content')??root).append(note);});
}
