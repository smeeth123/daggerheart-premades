import { elementalAir } from './premades/elemental-incarnation.js';
import { isolatingAdvantage } from './premades/isolating.js';
import { defensiveTargets } from './premades/defensive.js';
import { corpseDisadvantage } from './premades/venomancer.js';
import { midnightDisadvantage } from './premades/poison-compendium.js';
import { hiddenTargets } from './hidden.js';
import { sturdyTargets } from './premades/sturdy.js';
import { ID } from './core.js';
import { RETRACT_KEY } from './premades/retract-data.js';
import { etherealAdvantage } from './premades/ethereal-visage.js';
import { vexingAdvantage } from './premades/vexing-malison.js';
import { beastformAttackAdvantage } from './beastform-advantage.js';
import { aimedDisadvantage } from './premades/weapon-aimed.js';
const WRAPPED=Symbol.for(`${ID}.vulnerableAdvantage`);
const sources=new WeakMap();
export function registerVulnerableSetting(){
  game.settings.register(ID,'vulnerableAdvantage',{
    name:'Advantage against Vulnerable targets',
    hint:'Automatically select advantage for Daggerheart action, attack, and Reaction rolls targeting a Vulnerable actor. Existing disadvantage cancels it. Damage rolls are unaffected.',
    scope:'world',config:true,type:Boolean,default:true
  });
}
export function retractDisadvantage(config){
  if(config.actionType!=='action')return false;
  const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null);
  const enabled=actor?.items?.some(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===RETRACT_KEY;
  });
  if(!enabled)return false;
  // Retract contributes this native reminder only while its effect is active.
  return actor?.system?.disadvantageSources?.some(source=>String(source).trim().toLowerCase()==='action rolls')??false;
}
export function cancelAdvantage(advantage,disadvantage){
  return advantage===disadvantage?0:advantage?1:-1;
}
export function finalizeRollSources(roll,config){
  const state=sources.get(config);sources.delete(config);
  if(!state||!roll?.constructFormula||roll._evaluated)return;
  const selected=Number(config.roll.advantage?.type??config.roll.advantage??0);
  // Unchanged selection is already the native combined result. A new selection
  // adds a manual source; it cannot silently discard an active opposite source.
  if(selected===state.initial)return;
  const mode=cancelAdvantage(state.advantage||selected===1,state.disadvantage||selected===-1);
  config.roll.advantage=mode;roll.options.roll.advantage=mode;
  roll.constructFormula(config);
}
export function vulnerableTargets(config){
  const targets=Array.isArray(config.targets)?config.targets:[...(game.user.targets??[])];
  return targets.some(target=>{
    const token=target.document??target;
    const sceneToken=target.id?canvas.tokens?.get(target.id):null;
    const actor=target.actor??token.actor??
      (sceneToken?.actor?.uuid===target.actorId?sceneToken.actor:null)??
      (target.actorId?foundry.utils.fromUuidSync(target.actorId):null);
    return actor?.statuses?.has('vulnerable');
  });
}
export function installVulnerableAdvantage(D20Roll){
  if(D20Roll[WRAPPED])return;
  const native=D20Roll.applyKeybindings,configure=D20Roll.buildConfigure;
  D20Roll.applyKeybindings=function(config){
    const priorAdvantage=config.advantage,priorDisadvantage=config.disadvantage;
    const advantage=beastformAttackAdvantage(config)||elementalAir(config)||isolatingAdvantage(config)||etherealAdvantage(config)||vexingAdvantage(config)||(game.settings.get(ID,'vulnerableAdvantage')&&vulnerableTargets(config));
    const disadvantage=aimedDisadvantage(config)||defensiveTargets(config).length>0||corpseDisadvantage(config)||midnightDisadvantage(config)||retractDisadvantage(config)||sturdyTargets(config)||hiddenTargets(config);
    if(advantage)config.advantage=true;
    if(disadvantage)config.disadvantage=true;
    try{
      const result=native.call(this,config);
      if(advantage||disadvantage)sources.set(config,{advantage,disadvantage,initial:config.roll.advantage});
      return result;
    }finally{
      if(priorAdvantage===undefined)delete config.advantage;else config.advantage=priorAdvantage;
      if(priorDisadvantage===undefined)delete config.disadvantage;else config.disadvantage=priorDisadvantage;
    }
  };
  D20Roll.buildConfigure=async function(config={},...args){
    try{
      const roll=await configure.call(this,config,...args);
      finalizeRollSources(roll,config);
      return roll;
    }finally{sources.delete(config);}
  };
  Object.defineProperty(D20Roll,WRAPPED,{value:true});
}
export function registerVulnerableAdvantage(){
  installVulnerableAdvantage(CONFIG.Dice.daggerheart.D20Roll);
}
