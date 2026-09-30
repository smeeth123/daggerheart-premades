import { sourceToken } from './hallowed-aura.js';
import { allied,closeDistance } from './aura-rules.js';
export function closeSongTargets(actor,includeSelf=true){
 const origin=sourceToken(actor);if(!origin)return null;
 const rules=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
 const limit=closeDistance(canvas.scene,rules,CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id),found=new Map();
 if(includeSelf)found.set(actor.uuid,origin);
 for(const token of canvas.tokens.placeables){
  if(!token.actor||token.actor.uuid===actor.uuid||!allied(origin.document,token.document))continue;
  const distance=origin.distanceTo(token);if(Number.isFinite(distance)&&Number.isFinite(limit)&&distance<=limit&&!found.has(token.actor.uuid))found.set(token.actor.uuid,token);
 }
 return [...found.values()];
}
