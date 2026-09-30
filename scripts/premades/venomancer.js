import { ID,featureActive } from '../core.js';
import { FEATURE_KEY as VENOM } from './venomancer-data.js';
import { FEATURE_KEY as TWIN } from './twin-fang-data.js';
import { MARK_EFFECT } from './marked-for-death-data.js';
const enabled=(actor,key)=>actor?.items?.find(i=>featureActive(i)&&!i.flags?.[ID]?.disabled&&(i.flags?.[ID]?.applied?.key??i.flags?.[ID]?.premade?.key)===key);
export const venomItem=actor=>enabled(actor,VENOM);
export function twinEligible(actor,target){return Boolean(enabled(actor,TWIN)&&[...(target?.effects??[])].some(e=>!e.disabled&&!e.isSuppressed&&e.origin?.endsWith(`.ActiveEffect.${MARK_EFFECT}`)));}
export function corpseDisadvantage(config){const actor=config.data?.parent??(config.source?.actor?foundry.utils.fromUuidSync(config.source.actor):null);return config.actionType==='reaction'&&[...(actor?.effects??[])].some(e=>!e.disabled&&!e.isSuppressed&&e.flags?.[ID]?.venomPoison==='corpse');}
export async function applyVenom(actor,target,poison){
 const id={blight:'BAHnbGqeiUj2Eep3',corpse:'QDYqKyEjiJiTEv6C'}[poison];if(!id)return;
 if(poison==='blight'&&[...target.effects].some(e=>!e.disabled&&!e.isSuppressed&&(e.flags?.[ID]?.venomPoison==='blight'||e.origin?.endsWith('.ActiveEffect.BAHnbGqeiUj2Eep3'))))return;
 await game.system.api.fields.ActionFields.EffectsField.applyEffect(venomItem(actor).effects.get(id),target);
}
export function registerVenomancer(){Hooks.on('daggerheart.preUseAction',action=>{if(venomItem(action.actor)?.uuid===action.item?.uuid&&['uTNhXJiy5YAG0FdS','8CcarGtcoIg3Dmah'].includes(action.id)){ui.notifications.info('Choose this poison through Toxic Concoctions after a successful weapon attack.');return false;}});}
