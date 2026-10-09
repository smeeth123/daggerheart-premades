// Improving your own critical success cannot improve its outcome. Defensive
// rerolls of enemy crits remain useful and do not use this eligibility guard.
// Check native flags (including guaranteed crits) and serialized Duality dice.
export function criticalRerollResult({critical,isCritical,hope,fear}={}){
  return Boolean(critical||isCritical||Number.isFinite(hope)&&Number.isFinite(fear)&&hope===fear);
}
const rerollKinds=new Set(['luck','reassurance','support','feline','nimble','compass','adapt','boon','focus']);
export function isActionRerollChoice(kind){return rerollKinds.has(kind);}
