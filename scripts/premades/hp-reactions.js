import {ID} from '../core.js';
export const HP_REACTIONS_HANDLED=`${ID}.hpReactionsHandled`;
let reaction=async(_actor,count)=>count;
export function setHPReaction(handler){reaction=handler;}
export async function reduceReactiveHP(actor,count){return count>=2?reaction(actor,count):count;}
