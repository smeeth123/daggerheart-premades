import {ID,featureActive} from '../core.js';
import {POWER_GODS_KEY} from './power-of-the-gods-data.js';
export function powerOfTheGodsItem(actor){return actor?.type==='character'&&actor.statuses?.has('fly')?actor.items?.find(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===POWER_GODS_KEY;})??null:null;}
