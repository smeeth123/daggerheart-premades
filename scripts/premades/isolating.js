import { ID,featureActive } from '../core.js';
import { ISOLATING_KEY,ISOLATING_EFFECT } from './isolating-data.js';
import { sourceToken } from './hallowed-aura.js';
import { honedAction } from './honed.js';
export function isolatingActive(actor){const item=actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===ISOLATING_KEY;});const origin=item?.effects?.get(ISOLATING_EFFECT)?.uuid;return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));}
export function isolatingAdvantage(config){
 const actor=config.data?.parent;
 if(config.actionType==='reaction'||!isolatingActive(actor)||honedAction(actor,config.source)?.type!=='attack'||!canvas.ready)return false;
 const origin=sourceToken(actor);if(!origin)return false;
 const targets=Array.isArray(config.targets)?config.targets:[...(game.user.targets??[])];
 if(!targets.length)return false;
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene.flags?.daggerheart?.rangeMeasurement;
 const limit=Number(rules.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local.veryClose:rules.veryClose);
 if(!Number.isFinite(limit))return false;
 // A shared roll gets the bonus only when every target qualifies.
 return targets.every(target=>{
  const token=canvas.tokens.get(target.id??target.document?.id);
  if(!token?.actor||token===origin||(target.actorId&&token.actor.uuid!==target.actorId))return false;
  return canvas.tokens.placeables.every(other=>{
   if(other===origin||other===token||other.actor?.statuses?.has('dead')||!['character','adversary'].includes(other.actor?.type))return true;
   const fromActor=origin.distanceTo(other),fromTarget=token.distanceTo(other);
   return Number.isFinite(fromActor)&&Number.isFinite(fromTarget)&&fromActor>limit&&fromTarget>limit;
  });
 });
}
