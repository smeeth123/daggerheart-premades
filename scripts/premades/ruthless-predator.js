import {ID,featureActive} from '../core.js';
import {RUTHLESS_KEY} from './ruthless-predator-data.js';
import {attackBeneficiary} from '../companion-context.js';
import {honedAction} from './honed.js';
import {ownerFor} from './aura-rules.js';
import {timedDialog} from '../dialog.js';
import {decisionBudget} from '../settings.js';
import {markReactiveStress} from './stress-payment.js';
const QUERY=`${ID}.ruthlessPredator`,PROMPT=`${ID}.ruthlessPredatorPrompt`;
export function ruthlessItem(actor){actor=attackBeneficiary(actor);return actor?.type==='character'?actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===RUTHLESS_KEY;})??null:null;}
const canPay=actor=>Boolean(ruthlessItem(actor)&&Number(actor.system.resources?.stress?.value)<Number(actor.system.resources?.stress?.max));
export async function promptRuthless(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!canPay(actor))return false;
 return Boolean(await timedDialog(`Ruthless Predator — ${actor.name}`,'<p>Mark <strong>1 Stress</strong> for <strong>+1 Proficiency</strong> on this damage roll?</p>',[{action:'use',label:'Mark Stress',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveRuthless(request,{user},ask=promptRuthless){
 if(!game.user.isActiveGM||!user?.active)return false;
 const source=await fromUuid(request.sourceUuid),actor=attackBeneficiary(source);if(!ruthlessItem(actor))return false;
 if(request.op==='severe'){
  const target=await fromUuid(request.targetUuid);
  if(target?.type!=='adversary'||!target.system.resources?.stress||!(user.isGM||actor.testUserPermission(user,'OWNER')||target.testUserPermission(user,'OWNER')))return false;
  await target.modifyResource([{key:'stress',value:1}]);return true;
 }
 if(request.op!=='boost'||!actor.testUserPermission(user,'OWNER')||!canPay(actor))return false;
 const owner=ownerFor(actor,[...game.users],game.user),data={actorUuid:actor.uuid};
 const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
 return Boolean(accepted&&await markReactiveStress(actor.uuid,a=>canPay(a)));
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw new Error('Ruthless Predator needs an active GM.');return gm.isSelf?resolveRuthless(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(125000)});}
export function boostRuthlessProficiency(config,action){
 const prof=Number(config.data.prof)+1;
 config.data={...config.data,parent:config.data.parent,prof,system:{...config.data.system,proficiency:prof}};
 if(action?.damage?.main){
  const context=new Proxy(action,{get(target,key){if(key==='getRollData')return (...a)=>({...target.getRollData(...a),prof,system:{...target.getRollData(...a).system,proficiency:prof}});return Reflect.get(target,key,target);}});
  const formulas=game.system.api.fields.ActionFields.DamageField.formatFormulas.call(context,[action.damage.main],config);
  if(formulas[0])config.damageFormula={...config.damageFormula,formula:formulas[0].formula};
 }
 config[ID]={...config[ID],ruthlessBoost:true};
}
export function installRuthlessDamage(Damage,offer=dispatch){
 const configure=Damage.buildConfigure,evaluate=Damage.buildEvaluate;
 Damage.buildConfigure=async function(config,...args){
  const source=config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null),actor=attackBeneficiary(source);
  if(!config.hasHealing&&config.damageFormula&&ruthlessItem(actor)&&!config[ID]?.ruthlessBoost&&Number.isFinite(Number(config.data.prof))&&canPay(actor)&&await offer({op:'boost',sourceUuid:source.uuid}))
   boostRuthlessProficiency(config,honedAction(source,config.source));
  // Native configuration constructs the dice and critical bonus exactly once.
  return configure.call(this,config,...args);
 };
 Damage.buildEvaluate=async function(roll,config,...args){
  const source=config.data?.parent??(config.source?.actor?await fromUuid(config.source.actor):null),actor=attackBeneficiary(source),eligible=!config.hasHealing&&config.damageFormula&&ruthlessItem(actor);
  const result=await evaluate.call(this,roll,config,...args);
  if(eligible&&config.damage?.main){
   config.damage.main.options[ID]={...config.damage.main.options[ID],ruthlessSource:actor.uuid,ruthlessBoost:Boolean(config[ID]?.ruthlessBoost)};
   if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([key,r])=>[key,r.toJSON()]))});
  }return result;
 };
}
export function installRuthlessTaken(Actor,send=dispatch){
 const damage=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=async function(args,...rest){
  const sourceUuid=args?.main?.options?.[ID]?.ruthlessSource;
  const result=await damage.call(this,args,...rest);
  const marked=result?.filter(u=>u.key==='hitPoints'&&!u.clear&&!u.itemId).reduce((sum,u)=>sum+Math.max(0,Number(u.value)||0),0)??0;
  if(sourceUuid&&this.type==='adversary'&&marked>=3)await send({op:'severe',sourceUuid,targetUuid:this.uuid});
  return result;
 };
}
export function registerRuthlessPredator(){
 CONFIG.queries[QUERY]=resolveRuthless;CONFIG.queries[PROMPT]=promptRuthless;
 installRuthlessDamage(CONFIG.Dice.daggerheart.DamageRoll);installRuthlessTaken(CONFIG.Actor.documentClass);
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!message.isContentVisible||!message.system?.damage?.main?.options?.[ID]?.ruthlessBoost||html.querySelector('.dhp-ruthless'))return;
  const p=html.ownerDocument.createElement('p');p.className='dhp-ruthless';p.textContent='Ruthless Predator: +1 Proficiency on this damage roll.';html.querySelector('.message-content')?.append(p);
 });
}
