import {ID,featureActive} from '../core.js';
import {sourceToken} from './hallowed-aura.js';
import {isHexed} from './vexing-malison.js';
import {withHopeLock} from './hope-lock.js';
import {IRE_OF_PALE_LIGHT_KEY} from './ire-of-pale-light-data.js';

const QUERY=`${ID}.ireOfPaleLight`;
const WRAPPED=Symbol.for(`${ID}.ireOfPaleLightTarget`);
const pending=new Set();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function ireOfPaleLightItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===IRE_OF_PALE_LIGHT_KEY;})??null;
}

export function ireBearers(attacker){
  if(attacker?.type!=='adversary'||!isHexed(attacker))return[];
  const origin=sourceToken(attacker);
  if(!origin)return[];
  const bearers=new Map();
  for(const token of canvas.tokens?.placeables??[]){
    const actor=token.actor,item=ireOfPaleLightItem(actor),distance=item?origin.distanceTo(token):NaN;
    if(item&&Number.isFinite(distance))bearers.set(actor.uuid,actor);
  }
  return[...bearers.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

export function failedAttack(action,config){
  if(action?.type!=='attack'||action.actor?.type!=='adversary'||config?.actionType==='reaction'||!config?.hasRoll||config.roll?.isCritical)return false;
  return(config.targets??[]).some(target=>target.hitResult?.success===false||target.hit===false);
}

export async function applyIreOfPaleLight(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||typeof request.attackerUuid!=='string'||pending.has(request.id))return false;
  const attacker=await fromUuid(request.attackerUuid);
  if(attacker?.type!=='adversary'||!attacker.testUserPermission(user,'OWNER'))return false;
  const bearers=ireBearers(attacker);
  if(!bearers.length)return false;
  pending.add(request.id);
  try{
    const marked=await withHopeLock(attacker.uuid,async()=>{
      const stress=attacker.system.resources?.stress,before=Number(stress?.value),max=Number(stress?.max);
      if(!stress||!Number.isFinite(before)||!Number.isFinite(max)||before>=max)return false;
      const updated=await attacker.update({'system.resources.stress.value':before+1});
      if(!updated||Number(attacker.system.resources.stress.value)!==before+1)throw Error('Could not mark the Hexed attacker’s Stress.');
      return true;
    });
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:attacker}),content:`<p><strong>Ire of Pale Light:</strong> ${esc(attacker.name)} ${marked?'marks 1 Stress':'is already at maximum Stress'} after failing an attack within Very Far of ${bearers.map(actor=>esc(actor.name)).join(', ')}.</p>`});
    return{marked,bearerUuids:bearers.map(actor=>actor.uuid)};
  }finally{pending.delete(request.id);}
}

export function installIreOfPaleLight(TargetField,apply){
  if(TargetField[WRAPPED])return;
  const native=TargetField.execute;
  TargetField.execute=async function(config,...args){
    const result=await native.call(this,config,...args);
    if(result!==false&&failedAttack(this,config)&&ireBearers(this.actor).length)await apply({id:foundry.utils.randomID(),attackerUuid:this.actor.uuid});
    return result;
  };
  Object.defineProperty(TargetField,WRAPPED,{value:true});
}

export function registerIreOfPaleLight(){
  CONFIG.queries[QUERY]=applyIreOfPaleLight;
  const dispatch=request=>{const gm=game.users.activeGM;if(!gm)throw Error('Ire of Pale Light needs an active GM.');return gm.isSelf?applyIreOfPaleLight(request,{user:game.user}):gm.query(QUERY,request,{timeout:15000});};
  installIreOfPaleLight(game.system.api.fields.ActionFields.TargetField,dispatch);
}
