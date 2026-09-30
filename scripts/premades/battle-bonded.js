import {recordEvasionBonus} from '../evasion-indicators.js';
import {ID,featureActive} from '../core.js';
import {BATTLE_KEY} from './battle-bonded-data.js';
import {linkedCompanion} from '../companion-context.js';
import {unavailable} from '../companions.js';
import {sourceToken} from './hallowed-aura.js';
import {meleeLimit} from './tusks.js';
import {honedAction} from './honed.js';
const WRAPPED=Symbol.for(`${ID}.battleBonded`);
export function battleBondedItem(actor){return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===BATTLE_KEY;})??null:null;}
export function battleBondedEligible(actor,attacker){
 if(!canvas.ready||!battleBondedItem(actor)||attacker?.type!=='adversary')return false;
 const companion=linkedCompanion(actor),track=companion?.system?.resources?.stress;
 if(!companion||unavailable(companion)||companion.statuses?.has('dead')||companion.statuses?.has('defeated')||(track&&Number(track.value)>=Number(track.max)))return false;
 const pet=sourceToken(companion),enemy=sourceToken(attacker),limit=meleeLimit(canvas.scene);
 if(!pet||!enemy||!Number.isFinite(limit))return false;
 const distance=pet.distanceTo(enemy);return Number.isFinite(distance)&&distance<=limit;
}
export async function applyBattleBonded(config,eligible=battleBondedEligible){
 const attacker=config.data?.parent;
 if(attacker?.type!=='adversary'||config.actionType==='reaction'||honedAction(attacker,config.source)?.type!=='attack')return;
 for(const target of config.targets??[]){
  if(target[ID]?.battleBonded||target.evasion==null||!Number.isFinite(Number(target.evasion))||(target.difficulty&&Number(target.difficulty)!==Number(target.evasion)))continue;
  const actor=await fromUuid(target.actorId);if(!eligible(actor,attacker))continue;
  target.evasion=Number(target.evasion)+2;if(target.difficulty)target.difficulty=Number(target.difficulty)+2;
  target[ID]={...target[ID],battleBonded:true};
  recordEvasionBonus(config,target,'Battle-Bonded',2,actor.name??target.name);
 }
}
export function installBattleBonded(RollClass,apply=applyBattleBonded){
 if(RollClass[WRAPPED])return;Object.defineProperty(RollClass,WRAPPED,{value:true});
 const configure=RollClass.buildConfigure;
 RollClass.buildConfigure=async function(config,...args){await apply(config);return configure.call(this,config,...args);};
}
export function registerBattleBonded(){installBattleBonded(CONFIG.Dice.daggerheart.D20Roll);}
