import { decisionBudget } from '../settings.js';
import { braveItem } from './brave-face.js';
import { ID } from '../core.js';
import { UNSHAKEABLE_KEY, UNSHAKEABLE_ACTION } from './unshakeable-data.js';
const WRAPPED=Symbol.for(`${ID}.unshakeableWrapped`);
const HANDLED=`${ID}.unshakeableHandled`,QUERY=`${ID}.unshakeableResources`;
const queues=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function unshakeableItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{
    const flags=item.flags?.[ID];
    return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===UNSHAKEABLE_KEY;
  })??null;
}
export async function rollUnshakeable(actor,count){
  if(!Number.isSafeInteger(count)||count<=0)throw new Error('Invalid incoming Stress amount.');
  const roll=await new foundry.dice.Roll(`${count}d6`).evaluate();
  const prevented=roll.dice.flatMap(die=>die.results).filter(result=>result.active!==false&&result.result===6).length;
  const remaining=count-prevented;
  const message=await roll.toMessage({flags:{[ID]:{unshakeableRoll:true}},speaker:getDocumentClass('ChatMessage').getSpeaker({actor}),
    flavor:`<strong>Unshakeable — ${esc(actor.name)}</strong><p>${prevented} prevented; mark ${remaining} Stress.</p>`
  },{messageMode:game.settings.get('core','messageMode')});
  if(message&&game.dice3d)await game.dice3d.waitFor3DAnimationByMessageID(message.id);
  return remaining;
}
// Used by reactive feature payments so a successfully prevented cost still
// counts as paid for resolving the feature.
export async function markUnshakeableStress(actor,count=1){
  const remaining=await rollUnshakeable(actor,count);
  const next=Math.min(Number(actor.system.resources.stress.max),Number(actor.system.resources.stress.value)+remaining);
  if(next===Number(actor.system.resources.stress.value))return true;
  const braveBefore=braveItem(actor);
  const updated=await actor.update({'system.resources.stress.value':next},{[HANDLED]:true});
  const action=braveBefore?.system.actions?.get?.('sguCcIhnp8FjwVZd')??braveBefore?.system.actions?.sguCcIhnp8FjwVZd;
  const substituted=Boolean(braveBefore&&Number(action?.uses.value)===1);
  if(!updated||Number(actor.system.resources.stress.value)!==next-(substituted?1:0))throw new Error('Could not apply Unshakeable Stress.');
  return true;
}
export function installUnshakeable(ActorClass,roll=rollUnshakeable){
  if(ActorClass[WRAPPED])return;
  const preUpdate=ActorClass.prototype._preUpdate,modify=ActorClass.prototype.modifyResource;
  ActorClass.prototype._preUpdate=async function(changed,options={},user){
    if(!options[HANDLED]&&unshakeableItem(this)){
      const flat='system.resources.stress.value';
      const proposed=changed[flat]??foundry.utils.getProperty(changed,flat);
      const current=Number(this.system.resources.stress.value),delta=Number(proposed)-current;
      if(Number.isSafeInteger(delta)&&delta>0){
        const remaining=await roll(this,delta),next=current+remaining;
        if(Object.hasOwn(changed,flat))changed[flat]=next;
        else foundry.utils.setProperty(changed,flat,next);
      }
    }
    // Run before native data-model callbacks (including full-Stress Vulnerable).
    return preUpdate.call(this,changed,options,user);
  };
  ActorClass.prototype.modifyResource=async function(resources){
    const stress=resources?.filter(r=>r.key==='stress'&&!r.itemId);
    if(!unshakeableItem(this)||!stress?.some(r=>!r.clear&&Number(r.value)>0))return modify.call(this,resources);
    // Resource damage is normally handed to a GM by Daggerheart. Keep both
    // the prevention roll and subsequent writes together on that GM.
    if(!game.user.isGM){
      const gm=game.users.activeGM;if(!gm)throw new Error('Unshakeable needs an active GM.');
      const serial=resources.map(r=>({...r,target:r.target?.uuid??null}));
      await gm.query(QUERY,{actorUuid:this.uuid,resources:serial},{timeout:decisionBudget(180000)});
      return this;
    }
    const previous=queues.get(this.uuid)??Promise.resolve();
    const pending=previous.catch(()=>{}).then(async()=>{
      if(!unshakeableItem(this))return modify.call(this,resources);
      let net=0;
      for(const r of stress){
        if(r.clear){net=-Number(this.system.resources.stress.value);continue;}
        const amount=Number(r.value);
        net+=amount>0?await roll(this,amount):amount;
      }
      const adjusted={key:'stress',value:net};
      const rest=resources.filter(r=>r.key!=='stress'||r.itemId).map(r=>({...r}));
      // Let native overflow conversion see only Stress that survived prevention.
      const combined=[adjusted,...rest];
      if(net>0)this.convertStressDamageToHP(combined);
      const next=Math.max(0,Math.min(Number(this.system.resources.stress.max),Number(this.system.resources.stress.value)+net));
      if(next!==Number(this.system.resources.stress.value)){
        const updated=await this.update({'system.resources.stress.value':next},{[HANDLED]:true});
        if(!updated)throw new Error('Could not apply Unshakeable Stress.');
      }
      await modify.call(this,combined.filter(r=>r!==adjusted));
      return this;
    });
    queues.set(this.uuid,pending);
    try{return await pending;}finally{if(queues.get(this.uuid)===pending)queues.delete(this.uuid);}
  };
  Object.defineProperty(ActorClass,WRAPPED,{value:true});
}
export function renderUnshakeableDice(message,html){
  if(!message.isContentVisible)return;
  const marked=message.flags?.[ID]?.unshakeableRoll;
  const legacy=String(message.flavor??'').startsWith('<strong>Unshakeable — ');
  if(!marked&&!legacy)return;
  if(!/^\d+d6$/.test(message.rolls?.[0]?.formula??''))return;
  // Preserve Foundry's entire renderer. Daggerheart's global .dice icon styles
  // also match Foundry's tooltip pool container; scoped CSS resets only that.
  html.classList.add('dhp-unshakeable-roll');
}
export function registerUnshakeable(){
  Hooks.on('renderChatMessageHTML',renderUnshakeableDice);
  CONFIG.queries[QUERY]=async(data,{user})=>{
    if(!game.user.isActiveGM||!user?.active||!Array.isArray(data.resources))throw new Error('Invalid Unshakeable resource request.');
    const actor=await fromUuid(data.actorUuid);
    if(!actor)throw new Error('Unshakeable actor is missing.');
    // Match the system's GM resource relay, accepting only concrete resource
    // deltas rather than arbitrary document update paths.
    const resources=[];
    for(const r of data.resources){
      if(typeof r.key!=='string'||!Number.isFinite(r.value))throw new Error('Invalid resource delta.');
      resources.push({...r,target:r.target?await fromUuid(r.target):null});
    }
    await actor.modifyResource(resources);return true;
  };
  installUnshakeable(CONFIG.Actor.documentClass);
  Hooks.on('daggerheart.preUseAction',action=>{
    const flags=action.item?.flags?.[ID];
    if(action.id!==UNSHAKEABLE_ACTION||(flags?.applied?.key??flags?.premade?.key)!==UNSHAKEABLE_KEY)return;
    ui.notifications.info('Unshakeable rolls automatically for each incoming point of Stress.');return false;
  });
}
