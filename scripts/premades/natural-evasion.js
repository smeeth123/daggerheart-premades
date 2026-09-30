import {ID,featureActive} from '../core.js';
import {NATURAL_EVASION_KEY} from './natural-evasion-data.js';
export function naturalEvasionItem(actor){const stress=actor?.system?.resources?.stress;if(actor?.type!=='character'||!(Number(stress?.value)<Number(stress?.max)))return null;return actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===NATURAL_EVASION_KEY;})??null;}
export function naturalEvasionCouldMiss(actor,total,evasion,critical=false){return Boolean(!critical&&naturalEvasionItem(actor)&&Number.isFinite(Number(total))&&Number.isFinite(Number(evasion))&&Number(total)>=Number(evasion)&&Number(total)<Number(evasion)+6);}
