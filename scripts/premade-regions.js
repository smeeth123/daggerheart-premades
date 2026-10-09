import {ID} from './core.js';
const keys=['circleOfPower','moonbeam','runeCircle','veilOfNight','wallOfFlame'];
export function isPremadeRegion(region){const flags=region?.flags?.[ID];return keys.some(key=>flags?.[key]&&typeof flags[key]==='object'&&typeof flags[key].itemUuid==='string'&&flags[key].itemUuid.length>0);}
// Existing scene documents are changed only through native APIs on the active
// GM. Do not touch unrelated Regions, lights, shapes or linked feature state.
export async function unlockPremadeRegions(scenes=game.scenes??[]){if(!game.user.isActiveGM)return 0;let count=0;const failures=[];
 for(const scene of scenes){if(!game.user.isActiveGM)break;const updates=[...scene.regions??[]].filter(r=>r.locked===true&&isPremadeRegion(r)).map(r=>({_id:r.id,locked:false}));if(!updates.length)continue;
  try{await scene.updateEmbeddedDocuments('Region',updates);if(updates.some(u=>scene.regions.get(u._id)?.locked!==false))throw Error('Region unlocking was not confirmed.');count+=updates.length;}catch(error){failures.push(error);}
 }if(failures.length)throw new AggregateError(failures,'Some premade spell Regions could not be unlocked.');return count;}
