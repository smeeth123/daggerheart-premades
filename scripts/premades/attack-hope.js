import { crushingItem } from './crushing.js';
import { ID,featureActive } from '../core.js';
import { TUSKS_KEY } from './tusks-data.js';
import { VOLATILE_KEY } from './volatile-magic-data.js';
import { WHIRLWIND_KEY } from './whirlwind-data.js';
import { BLIGHTING_KEY } from './blighting-strike-data.js';
import { withHopeLock } from './hope-lock.js';
import { attackBeneficiary } from '../companion-context.js';
export function needsAttackHope(actor){return Boolean(crushingItem(actor))||actor?.items?.some(item=>{const f=item.flags?.[ID];return featureActive(item)&&!f?.disabled&&[TUSKS_KEY,VOLATILE_KEY,WHIRLWIND_KEY,BLIGHTING_KEY].includes(f?.applied?.key??f?.premade?.key);});}
export async function settleAttackHope(config){
 const actor=config.message?.system?.action?.actor??config.data?.parent;
 if(config.message?.system?.action?.type!=='attack'||!needsAttackHope(actor))return false;
 const updates=config.resourceUpdates,hope=updates?.get?.('hope');
 if(!hope||hope.itemId||hope.clear||!Number.isFinite(hope.value)||hope.value<=0)return false;
 const target=attackBeneficiary(actor);
 return withHopeLock(target.uuid,async()=>{
  if(updates.get('hope')!==hope)return false;
  const resource=target.system.resources?.hope;
  if(!resource||!Number.isFinite(Number(resource.value))||!Number.isFinite(Number(resource.max)))return false;
  const next=Math.min(Number(resource.max),Number(resource.value)+hope.value);
  const updated=await target.update({'system.resources.hope.value':next});
  if(!updated)throw new Error('Could not apply the completed attack’s Hope reward.');
  // The action later commits the remaining resources; never award this Hope twice.
  updates.delete('hope');return true;
 });
}
export function installAttackHope(Roll,settle=settleAttackHope){const native=Roll.buildPost;Roll.buildPost=async function(roll,config,...args){const result=await native.call(this,roll,config,...args);await settle(config);return result;};}
export function registerAttackHope(){installAttackHope(CONFIG.Dice.daggerheart.DualityRoll);}
