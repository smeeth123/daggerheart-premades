import {ID,featureActive} from '../core.js';
import {sourceToken} from './hallowed-aura.js';
import {WEAPON_OMNIPRESENT_KEY} from './weapon-omnipresent-data.js';
export function omnipresentWeapon(item){return Boolean(item?.type==='weapon'&&item.system?.equipped&&featureActive(item)&&!item.flags?.[ID]?.disabled&&item.flags?.[ID]?.applied?.key===WEAPON_OMNIPRESENT_KEY&&item.system.weaponFeatures?.some(f=>f.value==='omnipresent'));}
export function omnipresentDisadvantage(config){
 if(config.hasHealing||!globalThis.canvas?.ready||!Array.isArray(config.targets)||!config.targets.length||typeof config.source?.action!=='string'||!config.source.action)return false;
 const source=config.source,actor=config.data?.parent??foundry.utils.fromUuidSync?.(source.actor);if(actor?.type!=='character'||actor.uuid!==source.actor)return false;const item=actor.items?.get?.(source.item);if(!omnipresentWeapon(item))return false;
 const action=item.system.attack?.id===source.action?item.system.attack:item.system.actions?.get?.(source.action)??item.system.actions?.[source.action];if(action?.type!=='attack')return false;
 const origin=sourceToken(actor);if(!origin)return false;let limits=canvas.scene?.rangeSettings;if(!limits){const world=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement,local=canvas.scene?.flags?.daggerheart?.rangeMeasurement;limits=world.enabled&&local?.setting===CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id?local:world;}
 const melee=Number(limits?.melee);if(!Number.isFinite(melee)||melee<0)return false;
 return config.targets.some(target=>{const token=canvas.tokens.get(target.id??target.document?.id),uuid=target.actorId??target.actor?.uuid??target.document?.actor?.uuid;if(!token||token.actor?.uuid!==uuid)return false;const distance=origin.distanceTo(token);return Number.isFinite(distance)&&distance>=0&&distance>melee;});
}
