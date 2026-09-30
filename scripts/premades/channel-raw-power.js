import { decisionBudget } from '../settings.js';
import { ID } from '../core.js';
import { RAW_KEY,RAW_ACTION } from './channel-raw-power-data.js';
import { ownerFor } from './aura-rules.js';
import { withHopeLock } from './hope-lock.js';
import { timedDialog } from '../dialog.js';
const QUERY=`${ID}.rawPower`,PROMPT=`${ID}.rawPowerPrompt`,WRAPPED=Symbol.for(`${ID}.rawPower`);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rawItem(actor){return actor?.items?.find(item=>{const f=item.flags?.[ID];return !f?.disabled&&!item.system.inactive&&(f?.applied?.key??f?.premade?.key)===RAW_KEY;})??null;}
const actionFor=item=>item?.system.actions.get?.(RAW_ACTION)??item?.system.actions[RAW_ACTION];
export function rawCards(actor){return [...actor.items].filter(i=>i.type==='domainCard'&&!i.system.inVault&&Number(i.system.level)>0);}
export function rawAvailable(actor){const action=actionFor(rawItem(actor));return action&&Number(action.uses.value??0)<1&&rawCards(actor).length>0;}
export function rawPrimed(actor){return rawItem(actor)?actor.effects.find(e=>!e.disabled&&e.flags?.[ID]?.rawPower&&e.origin===rawItem(actor).uuid):null;}
export function rawSpell(config){
  if(config.hasHealing||!config.damageFormula)return null;
  const actor=config.data?.parent??foundry.utils.fromUuidSync(config.source?.actor),item=actor?.items.get?.(config.source?.item);
  return item?.type==='domainCard'&&['spell','grimoire'].includes(item.system.type)?actor:null;
}
export async function promptRaw(request,{user}){
  const actor=await fromUuid(request.actorUuid);if(!user?.isGM||!actor?.testUserPermission(game.user,'OWNER')||!rawAvailable(actor)||rawPrimed(actor))return false;
  return timedDialog(`Channel Raw Power — ${actor.name}`,`<p>Vault a loadout card and spend your long-rest use.</p><select name="rawCard" style="width:100%">${rawCards(actor).map(i=>`<option value="${esc(i.id)}">${esc(i.name)} — level ${Number(i.system.level)}</option>`).join('')}</select><select name="rawMode" style="width:100%;margin-top:0.5rem"><option value="spell">Enhance next damaging spell (2 × card level)</option><option value="hope">Gain Hope (card level)</option></select>`,[
    {action:'channel',label:'Channel',callback:(_e,_b,dialog)=>({cardId:dialog.element.querySelector('[name="rawCard"]').value,mode:dialog.element.querySelector('[name="rawMode"]').value})},
    {action:'decline',label:'Cancel',default:true,callback:()=>false}
  ]);
}
export async function commitRaw(actor,choice){
  return withHopeLock(actor.uuid,async()=>{
    if(!rawAvailable(actor)||rawPrimed(actor)||!['hope','spell'].includes(choice?.mode))return false;
    const card=rawCards(actor).find(i=>i.id===choice.cardId),item=rawItem(actor);if(!card)return false;
    const level=Number(card.system.level),path=`system.actions.${RAW_ACTION}.uses.value`;
    const vaulted=await card.update({'system.inVault':true});if(!vaulted)throw new Error('Could not vault the domain card.');
    try{
      const used=await item.update({[path]:1});if(!used)throw new Error('Could not spend Channel Raw Power.');
      if(choice.mode==='hope'){
        const hope=actor.system.resources.hope;
        const update=await actor.update({'system.resources.hope.value':Math.min(Number(hope.max),Number(hope.value)+level)});
        if(!update)throw new Error('Could not gain Hope.');
      }else{
        const effects=await actor.createEmbeddedDocuments('ActiveEffect',[{name:`Channel Raw Power (+${level*2})`,img:item.img,type:'base',transfer:false,disabled:false,origin:item.uuid,showIcon:CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
          description:`+${level*2} damage to your next damaging spell. ${card.name} vaulted.`,system:{changes:[],duration:{description:''}},flags:{[ID]:{rawPower:level*2}}}]);
        if(!effects?.length)throw new Error('Could not prime Channel Raw Power.');
      }
    }catch(error){await item.update({[path]:0});await card.update({'system.inVault':false});throw error;}
    return true;
  });
}
export async function resolveRaw(request,{user}){
  if(!game.user.isActiveGM||!user?.active)return false;
  const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!rawItem(actor))return false;
  if(request.consume){
    return withHopeLock(actor.uuid,async()=>{const effect=rawPrimed(actor);if(!effect||effect.id!==request.consume)return false;await effect.delete();return true;});
  }
  if(!rawAvailable(actor)||rawPrimed(actor))return false;
  const owner=ownerFor(actor,[...game.users],game.user);
  const choice=owner.isSelf?await promptRaw(request,{user:game.user}):await owner.query(PROMPT,request,{timeout:decisionBudget(65000)});
  return choice?commitRaw(actor,choice):false;
}
async function dispatch(request){const gm=game.users.activeGM;if(!gm)throw new Error('Channel Raw Power needs an active GM.');return gm.isSelf?resolveRaw(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(75000)});}
export function installRawPower(Damage,offer,consume){
  if(Damage[WRAPPED])return;
  const configure=Damage.buildConfigure,create=Damage.createRollInstance,bonus=Damage.prototype.applyBaseBonus,evaluate=Damage.buildEvaluate;
  Damage.buildConfigure=async function(config,...args){
    const choice=await offer(config);if(choice)config[ID]={...config[ID],rawPower:choice};
    return configure.call(this,config,...args);
  };
  Damage.createRollInstance=function(config){
    const roll=create.call(this,config),raw=config[ID]?.rawPower;
    if(raw){config.bonusEffects??={};config.bonusEffects[RAW_KEY]={name:`Channel Raw Power (+${raw.amount})`,description:'Vaulted card bonus.',selected:true,changes:[]};roll.options.bonusEffects=config.bonusEffects;}
    return roll;
  };
  Damage.prototype.applyBaseBonus=function(part){const result=bonus.call(this,part);if(!this.options.hasHealing&&this.options.bonusEffects?.[RAW_KEY]?.selected&&part.applyTo==='hitPoints')result.push({label:'Channel Raw Power',value:this.options[ID].rawPower.amount});return result;};
  Damage.buildEvaluate=async function(roll,config,...args){
    const raw=config[ID]?.rawPower;
    if(raw&&config.bonusEffects?.[RAW_KEY]?.selected&&!raw.consumed){if(!await consume(raw))throw new Error('Channel Raw Power is no longer primed.');raw.consumed=true;}
    return evaluate.call(this,roll,config,...args);
  };
  Object.defineProperty(Damage,WRAPPED,{value:true});
}
export function registerChannelRawPower(){
  CONFIG.queries[QUERY]=resolveRaw;CONFIG.queries[PROMPT]=promptRaw;
  installRawPower(CONFIG.Dice.daggerheart.DamageRoll,async config=>{
    const actor=rawSpell(config);if(!actor||!rawItem(actor))return null;
    if(!rawPrimed(actor)&&rawAvailable(actor))await dispatch({actorUuid:actor.uuid});
    const effect=rawPrimed(actor);return effect?{actorUuid:actor.uuid,effectId:effect.id,amount:Number(effect.flags[ID].rawPower)}:null;
  },raw=>dispatch({actorUuid:raw.actorUuid,consume:raw.effectId}));
  Hooks.on('daggerheart.preUseAction',action=>{
    if(action.id!==RAW_ACTION||rawItem(action.actor)?.uuid!==action.item?.uuid)return;
    void dispatch({actorUuid:action.actor.uuid}).then(ok=>{if(!ok&&rawPrimed(action.actor))ui.notifications.info('Channel Raw Power is already primed.');}).catch(error=>ui.notifications.error(error.message));return false;
  });
}
