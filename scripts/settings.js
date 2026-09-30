const ID='daggerheart-premades';
export const DEFAULT_COUNTDOWN=60;
let configuredCountdown;
function readCountdownSeconds(){
  let value;
  try{value=globalThis.game?.settings?.get(ID,'countdownSeconds');}catch{/* Before settings registration. */}
  return Number.isFinite(value)&&value>=5&&value<=600?Math.round(value):DEFAULT_COUNTDOWN;
}
export function initializeModuleSettings(){configuredCountdown=readCountdownSeconds();}
export const countdownSeconds=()=>configuredCountdown??readCountdownSeconds();
export const decisionDuration=()=>countdownSeconds()*1000;
// Preserve transport grace periods and the number of decisions a workflow can
// wait for. For example, 65s becomes one configured countdown plus 5s of grace.
export const decisionBudget=base=>base+Math.floor(base/60000)*(decisionDuration()-60000);
export function autoMedkitEnabled(){
  try{return globalThis.game?.settings?.get(ID,'autoMedkit')===true;}catch{return false;}
}
export function registerModuleSettings(){
  game.settings.register(ID,'countdownSeconds',{
    name:'Decision countdown duration (seconds)',
    hint:'Time allowed for feature decisions, roll resolution, Prayer Dice, and Damage Reduction. Default: 60 seconds. Reload clients after changing this setting; GM pause/resume remains available.',
    scope:'world',config:true,type:Number,default:DEFAULT_COUNTDOWN,range:{min:5,max:600,step:5},requiresReload:true
  });
  game.settings.register(ID,'autoMedkit',{
    name:'Automatically Medkit added features',
    hint:'The active GM automatically applies a unique matching premade when a feature or domain card is added to an actor, or an inactive subclass feature becomes available. Already-applied or individually disabled premades are left alone. Multiple matches require manual Medkit. Default: off.',
    scope:'world',config:true,type:Boolean,default:false
  });
}
