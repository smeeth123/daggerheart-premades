import { decisionBudget } from '../settings.js';
import {ID,featureActive} from '../core.js';
import {PARTNER_KEY} from './partner-in-arms-data.js';
import {sourceToken} from './hallowed-aura.js';
import {allied,ownerFor} from './aura-rules.js';
import {withHopeLock} from './hope-lock.js';
import {timedDialog} from '../dialog.js';
const QUERY=`${ID}.partnerInArms`,PROMPT=`${ID}.partnerInArmsPrompt`;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
export function partnerArmor(actor){
 const sources=[...(actor?.allApplicableEffects?.()??[])].filter(e=>!e.disabled&&!e.isSuppressed&&e.system?.armorData).map(e=>e.system.armorData);
 if(actor?.system?.armor?.system?.armor)sources.push(actor.system.armor.system.armor);
 return sources.reduce((s,a)=>({marked:s.marked+Number(a.current??0),available:s.available+Math.max(0,Number(a.max??0)-Number(a.current??0))}),{marked:0,available:0});
}
export function partnerItem(actor){if(partnerArmor(actor).available<1)return null;return actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===PARTNER_KEY;})??null;}
export function partnerCandidates(target){
 const victim=sourceToken(target);if(!victim)return [];
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
 const limit=Number(rules.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:rules.veryClose),result=new Map();
 for(const token of canvas.tokens.placeables){if(!partnerItem(token.actor)||!allied(token.document,victim.document)||token.actor.statuses?.has('dead'))continue;const distance=token.distanceTo(victim);if(Number.isFinite(distance)&&distance<=limit)result.set(token.actor.uuid,token.actor);}return [...result.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid));
}
export async function promptPartner(data,{user}){
 const actor=await fromUuid(data.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!partnerItem(actor))return false;
 const label=['No damage','Minor','Major','Severe','Massive'];
 return Boolean(await timedDialog(`Partner-in-Arms — ${actor.name}`,`<p>${esc(data.targetName)} would take <strong>${label[data.count]??`${data.count} HP`} damage</strong>.</p><p>Mark <strong>1 Armor Slot</strong> to reduce it to <strong>${label[data.count-1]??`${data.count-1} HP`}</strong>?</p>`,[{action:'use',label:'Mark Armor Slot',callback:()=>true},{action:'decline',label:'Decline',default:true,callback:()=>false}]));
}
export async function resolvePartner(request,{user},ask=promptPartner){
 if(!game.user.isActiveGM||!user?.active||!Number.isSafeInteger(request.count)||request.count<1)return request.count;
 const target=await fromUuid(request.targetUuid);if(!target)return request.count;
 let remaining=request.count;
 for(const bearer of partnerCandidates(target)){
  if(remaining<=0)break;if(!partnerCandidates(target).some(a=>a.uuid===bearer.uuid))continue;
  const owner=ownerFor(bearer,[...game.users],game.user),data={actorUuid:bearer.uuid,targetName:target.name,count:remaining};
  const accepted=owner.isSelf?await ask(data,{user:game.user}):await owner.query(PROMPT,data,{timeout:decisionBudget(65000)});
  if(!accepted)continue;
  const paid=await withHopeLock(bearer.uuid,async()=>{
   if(!partnerCandidates(target).some(a=>a.uuid===bearer.uuid))return false;
   const before=partnerArmor(bearer).marked;await bearer.system.updateArmorValue({value:1});
   if(partnerArmor(bearer).marked!==before+1)throw new Error('Could not mark Partner-in-Arms Armor Slot.');return true;
  });
  if(!paid)continue;remaining--;
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:bearer}),content:`<p><strong>Partner-in-Arms</strong>: ${esc(bearer.name)} marks 1 Armor Slot to reduce ${esc(target.name)}’s damage by one threshold (${remaining} HP to mark).</p>`});
 }return remaining;
}
export function installPartnerInArms(Actor,offer){
 const native=Actor.prototype.modifyResource;
 Actor.prototype.modifyResource=async function(resources){
  const hp=resources?.filter(r=>r.key==='hitPoints'&&!r.itemId&&!r.clear&&r.damageTypes!=null&&Number.isSafeInteger(r.value)&&r.value>0),count=hp?.reduce((sum,r)=>sum+r.value,0)??0;
  if(count>0&&partnerCandidates(this).length){let prevented=count-await offer({targetUuid:this.uuid,count});for(const entry of hp){const n=Math.min(entry.value,prevented);entry.value-=n;prevented-=n;}}
  return native.call(this,resources);
 };
}
export function registerPartnerInArms(){
 CONFIG.queries[QUERY]=resolvePartner;CONFIG.queries[PROMPT]=promptPartner;
 installPartnerInArms(CONFIG.Actor.documentClass,request=>{const gm=game.users.activeGM;if(!gm)throw new Error('Partner-in-Arms needs an active GM.');return gm.isSelf?resolvePartner(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(300000)});});
}
