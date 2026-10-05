import {ID,featureActive} from '../core.js';
import {restComplete} from '../rest-loadout.js';
import {decisionBudget} from '../settings.js';
import {withHopeLock} from './hope-lock.js';
import {ARMOR_SELF_HEALING_KEY} from './armor-self-healing-data.js';
const QUERY=`${ID}.armorSelfHealing`,WRAPPED=Symbol.for(QUERY),receipts=new Map(),rests=new WeakMap();
export function selfHealingArmor(actor){const item=actor?.system?.armor;return actor?.type==='character'&&item?.type==='armor'&&item.system.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===ARMOR_SELF_HEALING_KEY&&item.system.armorFeatures?.some(f=>f.value==='selfHealing')?item:null;}
export async function resolveSelfHealing(request,{user}){
  if(!game.user.isActiveGM||!user?.active||typeof request?.id!=='string'||!/^[a-zA-Z0-9]{16}$/.test(request.id)||typeof request.actorUuid!=='string'||typeof request.armorUuid!=='string')return false;
  const key=`${user.id}:${request.id}`,signature=JSON.stringify(request),prior=receipts.get(key);if(prior)return prior.signature===signature?prior.promise:false;
  const promise=(async()=>{const actor=await fromUuid(request.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||selfHealingArmor(actor)?.uuid!==request.armorUuid)return false;
    return withHopeLock(actor.uuid,async()=>{if(!game.user.isActiveGM||!user.active||!actor.testUserPermission(user,'OWNER')||selfHealingArmor(actor)?.uuid!==request.armorUuid)return false;const before=Number(actor.system.armorScore?.value);if(!(before>0))return false;
      // Native recovery awaits its ordered embedded Armor source writes.
      await actor.system.updateArmorValue({value:-1});if(before-Number(actor.system.armorScore.value)!==1)throw Error('Self-Healing Armor recovery could not be confirmed. Check Armor before continuing.');
      try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:'<p><strong>Self-Healing:</strong> cleared 1 Armor Slot after resting.</p>'});}catch(error){console.warn(`${ID} | Self-Healing notification`,error);}return true;
    });
  })();receipts.set(key,{signature,promise});if(receipts.size>512)receipts.delete(receipts.keys().next().value);return promise;
}
export function installSelfHealingRest(Downtime,send){if(!Downtime||Object.hasOwn(Downtime,WRAPPED))return;const native=Downtime.DEFAULT_OPTIONS.actions.takeDowntime;
  const contexts=new WeakMap(),taken=app=>Object.values(app.nrChoices??{}).reduce((sum,category)=>sum+Number(category.taken??0),0);
  const finish=async app=>{const context=contexts.get(app);if(!context?.armor||!context.selected||taken(app)<=context.before||!restComplete(app))return;const previous=rests.get(app);if(previous)return previous;
    const record={id:foundry.utils.randomID(),actorUuid:app.actor.uuid,armorUuid:context.armor.uuid};const operation=Promise.resolve().then(()=>send(record)).catch(error=>{console.error(`${ID} | Self-Healing after rest`,error);ui.notifications.error('Self-Healing could not complete. The rest was preserved; check Armor before continuing.');});rests.set(app,operation);return operation;
  };
  const close=Downtime.prototype.close;
  if(typeof close==='function')Downtime.prototype.close=async function(...args){
    // Native calls close when the submitted rest commits, before Choose Loadout.
    // Its optional dialog must neither delay nor cancel this independent benefit.
    await finish(this);return close.apply(this,args);
  };
  const take=async function(...args){contexts.set(this,{armor:selfHealingArmor(this.actor),selected:Object.values(this.moveData??{}).some(category=>Object.values(category.moves??{}).some(move=>Number(move.selected)>0)),before:taken(this)});
    try{return await native.apply(this,args);}finally{await finish(this);}
  };Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;Object.defineProperty(Downtime,WRAPPED,{value:true});
}
export function registerArmorSelfHealing(){CONFIG.queries[QUERY]=resolveSelfHealing;installSelfHealingRest(game.system.api.applications.dialogs.Downtime,request=>{const gm=game.users.activeGM;if(!gm)throw Error('Self-Healing needs an active GM.');return gm.isSelf?resolveSelfHealing(request,{user:game.user}):gm.query(QUERY,request,{timeout:decisionBudget(65000)});});Hooks.on('daggerheart.preUseAction',action=>{const item=selfHealingArmor(action.actor);if(item?.uuid===action.item?.uuid&&item.system.armorFeatures.find(f=>f.value==='selfHealing').actionIds?.includes(action.id)){ui.notifications.info('Self-Healing clears an Armor Slot automatically when you finish taking a rest.');return false;}});}
