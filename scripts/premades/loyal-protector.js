import { decisionBudget } from '../settings.js';
import { decisionNow } from '../decision-clock.js';
import {ID,featureActive} from '../core.js';
import {LOYAL_KEY} from './loyal-protector-data.js';
import {sourceToken} from './hallowed-aura.js';
import {allied,closeDistance,ownerFor} from './aura-rules.js';
import {markReactiveStress} from './stress-payment.js';
import {timedDialog} from '../dialog.js';
const QUERY=`${ID}.loyalProtector`,PROMPT=`${ID}.loyalProtectorPrompt`,seen=new Map();
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function loyalItem(actor){const stress=actor?.system?.resources?.stress;if(!(Number(stress?.value)<Number(stress?.max))||actor.statuses?.has('dead'))return null;return actor.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===LOYAL_KEY;})??null;}
export function loyalVictim(actor){const hp=actor?.system?.resources?.hitPoints,remaining=Number(hp?.max)-Number(hp?.value);return remaining>0&&remaining<=2&&!actor.statuses?.has('dead');}
export function loyalCandidates(target){
 if(!loyalVictim(target))return [];const victim=sourceToken(target);if(!victim)return [];
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,limit=closeDistance(canvas.scene,rules,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id),result=new Map();
 for(const token of canvas.tokens.placeables){if(!loyalItem(token.actor)||!allied(token.document,victim.document))continue;const distance=token.distanceTo(victim);if(Number.isFinite(distance)&&distance<=limit)result.set(token.actor.uuid,token.actor);}return [...result.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid));
}
export function loyalPacket(args){
 const raw=args?.main??args?.damage??(typeof args?.total==='number'?args:null);
 const main=typeof raw==='number'?{total:raw,options:{}}:raw?.toJSON?.()??raw;
 if(!main||!(Number(main.total)>0)||main.options?.[ID]?.loyalRedirect)return null;
 return {main:structuredClone(main),resources:Object.fromEntries(Object.entries(args.resources??{}).map(([key,r])=>[key,structuredClone(r?.toJSON?.()??r)]))};
}
export function redirectedLoyalPacket(packet,target,protector){
 const data=structuredClone(packet),before=Number(target.system.rules?.attack?.damage?.hpDamageTakenMultiplier??1),after=Number(protector.system.rules?.attack?.damage?.hpDamageTakenMultiplier??1),base=Number(data.main.options?.[ID]?.loyalBaseDamage);
 // Native application has already multiplied for the original target. Preserve
 // any save multiplier while substituting the actual recipient's multiplier.
 if(before>0&&Number.isFinite(after)&&before!==after){
  const originalBase=Number.isFinite(base)?Math.ceil(base*before):null;
  data.main.total=originalBase>0?Math.ceil(base*after)*(data.main.total/originalBase):Math.ceil(data.main.total/before*after);
 }
 data.main.options={...data.main.options,[ID]:{...data.main.options?.[ID],loyalRedirect:true}};return data;
}
export async function promptLoyal(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!loyalItem(actor))return false;
 return Boolean(await timedDialog(`Loyal Protector — ${actor.name}`,`<p>${esc(data.targetName)} has ${data.remaining} unmarked HP and would take damage.</p><p>Mark <strong>1 Stress</strong> to take the damage instead? Your own defenses apply. Move your token to their side manually before confirming.</p>`,[{action:'use',label:'Mark Stress & Protect',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolveLoyal(request,{user},ask=promptLoyal){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string')return false;
 for(const [id,entry]of seen)if(entry.expires<decisionNow())seen.delete(id);
 const key=`${user.id}:${request.id}`;if(seen.has(key))return seen.get(key).promise;
 const promise=(async()=>{
  const target=await fromUuid(request.targetUuid),packet=loyalPacket(request.packet);if(!target||!packet||!loyalVictim(target))return false;
  const sourceUuid=packet.main.options?.[ID]?.elementalSource,source=sourceUuid?await fromUuid(sourceUuid):null;
  if(!user.isGM&&!target.testUserPermission(user,'OWNER')&&!source?.testUserPermission(user,'OWNER'))return false;
  if(!(target.calculateDamage(Number(packet.main.total),packet.main.options?.damageTypes??[])>0))return false;
  for(const bearer of loyalCandidates(target)){
   if(!loyalCandidates(target).some(a=>a.uuid===bearer.uuid))continue;
   const owner=ownerFor(bearer,[...game.users],game.user),hp=target.system.resources.hitPoints,data={actorUuid:bearer.uuid,targetName:target.name,remaining:Number(hp.max)-Number(hp.value)};
   const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
   if(!accepted||!await markReactiveStress(bearer.uuid,a=>loyalItem(a)&&loyalCandidates(target).some(b=>b.uuid===a.uuid)))continue;
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:bearer}),content:`<p><strong>Loyal Protector</strong>: ${esc(bearer.name)} marks 1 Stress and takes ${esc(target.name)}’s damage. Move ${esc(bearer.name)} to their side.</p>`});
   const updates=await bearer.takeDamage(redirectedLoyalPacket(packet,target,bearer),Boolean(request.isDirect));
   const hpMarked=updates?.filter(u=>u.key==='hitPoints'&&!u.clear&&!u.itemId).reduce((sum,u)=>sum+Number(u.value??0),0)??0;
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:bearer}),content:`<p><strong>Loyal Protector</strong>: ${esc(bearer.name)} marks ${hpMarked} HP after damage reduction; ${esc(target.name)} takes none of this damage.</p>`});
   return true;
  }return false;
 })();seen.set(key,{promise,expires:decisionNow()+decisionBudget(600000)});return promise;
}
export function installLoyalProtector(Actor,offer){const native=Actor.prototype.takeDamage;Actor.prototype.takeDamage=async function(args,...rest){
 const packet=loyalPacket(args);
 if(packet&&loyalCandidates(this).length&&this.calculateDamage(Number(packet.main.total),packet.main.options?.damageTypes??[])>0&&await offer({id:foundry.utils.randomID(),targetUuid:this.uuid,packet,isDirect:Boolean(rest[0])}))return [];
 return native.call(this,args,...rest);
};}
export function registerLoyalProtector(){
 CONFIG.queries[QUERY]=resolveLoyal;CONFIG.queries[PROMPT]=promptLoyal;
 installLoyalProtector(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Loyal Protector needs an active GM.');return gm.isSelf?resolveLoyal(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(300000)});});
 const Damage=CONFIG.Dice.daggerheart.DamageRoll,native=Damage.buildEvaluate;Damage.buildEvaluate=async function(roll,config,...args){const result=await native.call(this,roll,config,...args);if(!config.hasHealing&&config.damage?.main){config.damage.main.options[ID]={...config.damage.main.options[ID],loyalBaseDamage:Number(config.damage.main.total)};if(typeof config.damage.toObject==='function')config.damage=new config.damage.constructor({...config.damage.toObject(),main:config.damage.main.toJSON(),resources:Object.fromEntries(Object.entries(config.damage.resources??{}).map(([k,r])=>[k,r.toJSON()]))});}return result;};
}
