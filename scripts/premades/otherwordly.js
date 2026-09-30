import { decisionBudget } from '../settings.js';
import { ID,featureActive } from '../core.js';
import { OTHERWORDLY_KEY,OTHERWORDLY_EFFECT } from './otherwordly-data.js';
import { overwhelmHits } from './overwhelm.js';
import { ownerFor } from './aura-rules.js';
import { timedDialog } from '../dialog.js';
const PROMPT=`${ID}.otherwordlyType`;
export function otherwordlyActive(actor){const item=actor?.items?.find(i=>{const f=i.flags?.[ID];return featureActive(i)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===OTHERWORDLY_KEY;});const origin=item?.effects.get(OTHERWORDLY_EFFECT)?.uuid;return Boolean(origin&&actor.effects.some(e=>e.origin===origin&&!e.disabled&&!e.isSuppressed));}
export async function promptOtherwordly(data,{user}){const actor=await fromUuid(data.actorUuid);if(!actor?.testUserPermission(user,'OWNER')||!actor.testUserPermission(game.user,'OWNER')||!otherwordlyActive(actor))return null;return timedDialog(`Otherwordly — ${actor.name}`,'<p>Choose this attack’s damage type.</p>',[{action:'physical',label:'Physical',callback:()=> 'physical'},{action:'magical',label:'Magic',callback:()=> 'magical'}]);}
export function setOtherwordlyType(config,type){if(!['physical','magical'].includes(type)||!config.damageFormula||config.hasHealing)return false;config.damageFormula={...config.damageFormula,damageTypes:new Set([type])};return true;}
export function installOtherwordly(Damage,choose){const native=Damage.buildConfigure;Damage.buildConfigure=async function(config,...args){const message=game.messages.get(config.source?.message),actor=message?.system?.action?.actor;if(!config.hasHealing&&config.damageFormula&&otherwordlyActive(actor)&&overwhelmHits(message).length){const choice=await choose(actor);if(otherwordlyActive(actor))setOtherwordlyType(config,choice);}return native.call(this,config,...args);};}
export function registerOtherwordly(){CONFIG.queries[PROMPT]=promptOtherwordly;installOtherwordly(CONFIG.Dice.daggerheart.DamageRoll,actor=>{const owner=ownerFor(actor,[...game.users],game.users.activeGM??game.user),data={actorUuid:actor.uuid};return owner.isSelf?promptOtherwordly(data,{user:game.user}):owner.query(PROMPT,data,{timeout:decisionBudget(65000)});});}
