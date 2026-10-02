import {ID} from './core.js';

// Converted successes intentionally retain their original dice total.
export const convertedAttackSuccess=roll=>Boolean(roll?.isCritical||roll?.options?.[ID]?.trueStrike||roll?.options?.[ID]?.witchsCharm);
export function attackTargetOutcome(roll,target){
  if(!Number.isFinite(roll?.total))return 'unknown';
  if(convertedAttackSuccess(roll))return 'success';
  const value=target?.difficulty||target?.evasion,threshold=Number(value);
  // Zero is the native empty defense, not a known difficulty of zero.
  if(!(Number.isFinite(threshold)&&threshold>0)){
    if(target?.hit===true)return 'success';
    // Explicit target results without a defense can represent a declared hit.
    // A literal zero remains unknown because native chat can derive a spurious hit there.
    if(target?.difficulty==null&&target?.evasion==null&&typeof target?.hitResult?.success==='boolean')return target.hitResult.success?'success':'failure';
    return 'unknown';
  }
  if(typeof target?.hitResult?.success==='boolean')return target.hitResult.success?'success':'failure';
  if(typeof target?.hit==='boolean')return target.hit?'success':'failure';
  return roll.total>=threshold?'success':'failure';
}
export function resolvedAttackTargets(message){
  const data=message?.system;
  // The GM's Selected tab is a damage-recipient override, not an attack reroll.
  return data?.targeting?.usingSelect?data.targets??[]:data?._getCurrentTargets?.()??data?.targets??[];
}
export function attackHitTargets(message){
  return resolvedAttackTargets(message).filter(target=>attackTargetOutcome(message?.system?.roll,target)==='success');
}
export function resolvedAttackOutcome(message){
  const data=message?.system,roll=data?.roll;
  if(data?.action?.type!=='attack'||!Number.isFinite(roll?.total))return 'unknown';
  if(convertedAttackSuccess(roll))return 'success';
  const targets=resolvedAttackTargets(message),outcomes=targets.map(target=>attackTargetOutcome(roll,target));
  if(outcomes.includes('success'))return 'success';
  if(outcomes.length)return outcomes.every(result=>result==='failure')?'failure':'unknown';
  const difficulty=Number(roll.difficulty);
  return Number.isFinite(difficulty)&&difficulty>0?(roll.total>=difficulty?'success':'failure'):'unknown';
}
