import {ID,featureActive} from './core.js';
import {HELP_ACTION,helpAllyData,helpFeature} from './help-ally-data.js';
import {timedDialog} from './dialog.js';
import {decisionBudget} from './settings.js';
import {decisionNow} from './decision-clock.js';
import {withHopeLock} from './premades/hope-lock.js';
import {BEASTFORM_COMPANION_KEY} from './premades/companion-data.js';
const OFFER=`${ID}.helpAlly`,CLAIM=`${ID}.claimHelpAlly`,requests=new Map(),claims=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function readyHelp(actor){
 return [...(actor?.effects??[])].filter(e=>!e.disabled&&!e.isSuppressed&&Number.isInteger(e.flags?.[ID]?.helpAlly?.value)&&e.flags[ID].helpAlly.value>=1&&e.flags[ID].helpAlly.value<=8)
  .map(e=>({id:e.id,...e.flags[ID].helpAlly}));
}
function characters(){
 const actors=new Map([...game.actors].filter(a=>a.type==='character'&&!a.pack).map(a=>[a.uuid,a]));
 for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor?.type==='character')actors.set(token.actor.uuid,token.actor);
 return [...actors.values()];
}
const characterIdentity=actor=>actor?.token?.baseActor?.uuid??actor?.uuid;
export function companionHelpDie(actor){const item=actor?.type==='character'&&actor.items?.find?.(item=>{const flags=item.flags?.[ID];return featureActive(item)&&!flags?.disabled&&(flags?.applied?.key??flags?.premade?.key)===BEASTFORM_COMPANION_KEY;});return item?8:6;}
export function helpRecipients(helper){
 return [...new Map((game.actors?.party?.system?.partyMembers??[]).filter(a=>a?.type==='character'&&characterIdentity(a)!==characterIdentity(helper)).map(a=>[characterIdentity(a),a])).values()];
}
export function validHelpRecipient(helper,ally){return ally?.type==='character'&&helpRecipients(helper).some(member=>characterIdentity(member)===characterIdentity(ally));}
export async function ensureHelpFeature(actor){
 if(!game.user.isActiveGM||actor?.type!=='character'||actor.pack)return;
 return withHopeLock(actor.uuid,async()=>{
  const existing=[...actor.items].find(item=>item.flags?.[ID]?.utility==='help-an-ally'),data=helpAllyData();
  if(!existing)await actor.createEmbeddedDocuments('Item',[data]);
  else if(existing.flags[ID].utilityVersion!==data.flags[ID].utilityVersion)await existing.update({
   'system.description':data.system.description,[`system.actions.${HELP_ACTION}.description`]:data.system.actions[HELP_ACTION].description,[`flags.${ID}.utilityVersion`]:data.flags[ID].utilityVersion
  });
 });
}
const lockActors=(ids,fn)=>ids.length?withHopeLock(ids[0],()=>lockActors(ids.slice(1),fn)):fn();
function trimReceipts(map){for(const [key,r]of map)if(r.expires<decisionNow())map.delete(key);}
export async function resolveHelp(request,{user},rollDie=async faces=>new Roll(`1d${faces}`).evaluate()){
 if(!game.user.isActiveGM||!user?.active)throw Error('Help an Ally needs an active GM.');
 if(typeof request.id!=='string'||request.id.length>64)throw Error('Invalid Help an Ally request.');
 const helper=await fromUuid(request.helperUuid),ally=await fromUuid(request.allyUuid);
 if(helper?.type!=='character'||ally?.type!=='character'||helper.uuid===ally.uuid||!helper.testUserPermission(user,'OWNER')||!helpFeature(helper))throw Error('Choose another character to help using a character you own.');
 if(!validHelpRecipient(helper,ally))throw Error('Choose an ally from the active Party.');
 trimReceipts(requests);const key=`${user.id}:${request.id}`;if(requests.has(key))return requests.get(key).promise;
 const promise=lockActors([helper.uuid,ally.uuid].sort(),async()=>{
  if(!helpFeature(helper)||!helper.testUserPermission(user,'OWNER')||!user.active||!validHelpRecipient(helper,ally))throw Error('Help an Ally is no longer available.');
  if(readyHelp(ally).some(h=>h.helperUuid===helper.uuid))throw Error('This character already has your help ready.');
  const hope=Number(helper.system.resources.hope.value);if(hope<1)throw Error('You need 1 Hope to Help an Ally.');
  const paid=await helper.update({'system.resources.hope.value':hope-1});
  if(!paid||Number(helper.system.resources.hope.value)!==hope-1)throw Error('Could not spend Hope.');
  const faces=companionHelpDie(helper);let roll,created;
  try{
   roll=await rollDie(faces);if(!Number.isInteger(roll.total)||roll.total<1||roll.total>faces)throw Error(`Invalid Help an Ally d${faces} result.`);
   created=await ally.createEmbeddedDocuments('ActiveEffect',[{
    name:`Help an Ally — ${helper.name} (${roll.total})`,img:helpAllyData().img,origin:helpFeature(helper).uuid,disabled:false,
    description:`${esc(helper.name)} helps with the upcoming action roll (d${faces}: ${roll.total}).`,
    flags:{[ID]:{helpAlly:{helperUuid:helper.uuid,helperName:helper.name,value:roll.total}}},
    system:{changes:[],duration:{type:''}}
   }]);
   if(created?.length!==1)throw Error('Could not prepare the help on the ally.');
  }catch(error){await helper.update({'system.resources.hope.value':hope});throw error;}
  try{await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:helper}),flags:{[ID]:{unshakeableRoll:true}},flavor:`<strong>Help an Ally — ${esc(helper.name)} → ${esc(ally.name)}</strong><p>Spent 1 Hope. A <strong>${roll.total}</strong> on the d${faces} helps ${esc(ally.name)}’s upcoming action roll.</p>`});}
  catch(error){console.error(`${ID} | Help die chat card`,error);ui.notifications.warn('Help is ready, but its chat card could not be created.');}
  return {value:roll.total,effectId:created[0].id};
 });requests.set(key,{promise,expires:decisionNow()+decisionBudget(600000)});return promise;
}
export async function claimHelp(request,{user}){
 if(!game.user.isActiveGM||!user?.active||typeof request.id!=='string'||request.id.length>64)throw Error('Invalid Help an Ally roll request.');
 const actor=await fromUuid(request.actorUuid);
 if(actor?.type!=='character'||!actor.testUserPermission(user,'OWNER'))throw Error('You do not own the acting character.');
 trimReceipts(claims);const key=`${user.id}:${request.id}`;
 return withHopeLock(actor.uuid,async()=>{
  const existing=claims.get(key);
  if(existing&&existing.actorUuid!==actor.uuid)throw Error('Help belongs to another character.');
  if(request.release)throw Error('Help cannot be saved for another action.');
  if(existing)return existing.rows;
  if(!Array.isArray(request.ids)||request.ids.length>100||request.ids.some(id=>typeof id!=='string'))throw Error('Invalid prepared help.');
  const rows=readyHelp(actor).filter(row=>request.ids.includes(row.id));
  const sources=rows.map(row=>actor.effects.get(row.id).toObject());
  if(rows.length){
   try{
    await actor.deleteEmbeddedDocuments('ActiveEffect',rows.map(row=>row.id));
    if(rows.some(row=>actor.effects.get(row.id)))throw Error('Could not consume prepared help.');
   }catch(error){
    const missing=sources.filter(source=>!actor.effects.get(source._id));
    if(missing.length)await actor.createEmbeddedDocuments('ActiveEffect',missing,{keepId:true});
    throw error;
   }
  }
  claims.set(key,{actorUuid:actor.uuid,rows,sources,expires:decisionNow()+decisionBudget(600000)});return rows;
 });
}
export function claimedHelp(user,id,actorUuid){const receipt=claims.get(`${user?.id}:${id}`);return receipt?.actorUuid===actorUuid?receipt.rows:[];}
async function dispatch(name,data){const gm=game.users.activeGM;if(!gm)throw Error('Help an Ally needs an active GM.');return gm.isSelf?CONFIG.queries[name](data,{user:game.user}):gm.query(name,data,{timeout:decisionBudget(125000)});}
export async function promptHelp(helper){
 if(!helper?.isOwner||!helpFeature(helper))return;
 if(Number(helper.system.resources.hope.value)<1)throw Error('You need 1 Hope to Help an Ally.');
 const faces=companionHelpDie(helper),allies=helpRecipients(helper).sort((a,b)=>a.name.localeCompare(b.name));
 if(!allies.length)throw Error('There are no other characters in the active Party to help.');
 const targeted=[...(game.user.targets??[])].map(t=>t.actor).filter(Boolean);
 let allyUuid;
 if(targeted.length===1){
  if(!validHelpRecipient(helper,targeted[0]))throw Error('Target another member of the active Party.');
  allyUuid=targeted[0].uuid;
 }else{
  allyUuid=await timedDialog(`Help an Ally — ${helper.name}`,`<p>Spend <strong>1 Hope</strong> and roll a d${faces} for a party member’s upcoming action.</p><label>Ally<select name="ally">${allies.map(a=>`<option value="${esc(a.uuid)}">${esc(a.name)}</option>`).join('')}</select></label>`,[
   {action:'help',label:`Spend 1 Hope & Roll d${faces}`,callback:(_event,button)=>button.form.elements.ally.value},
   {action:'cancel',label:'Cancel',callback:()=>null}
  ]);
 }
 if(allyUuid)await dispatch(OFFER,{allyUuid,helperUuid:helper.uuid,id:foundry.utils.randomID()});
}
export function snapshotHelp(config){
 if(config[ID]?.helpAlly)return;
 const actor=config.data?.parent;if(actor?.type!=='character')return;
 const spellcast=config.actionType==='action'&&config.roll?.trait&&config.roll.trait===actor.system?.spellcastModifierTrait?.key;
 config[ID]={...config[ID],helpAlly:{rows:readyHelp(actor).filter(row=>!row.enchantedAid||spellcast)}};
}
export function selectedHelp(options){return options.actionType==='action'?options[ID]?.helpAlly?.rows??[]:[];}
export function addHelpTerms(roll){
 const rows=selectedHelp(roll.options);if(!rows.length)return;
 const value=Math.max(...rows.map(row=>row.value)),terms=foundry.dice.terms;
 // Keep native AdvantageDie at the top level: the system's chat renderer and
 // die reroll controls rely on that layout. Only add the missing bonus.
 roll.terms.push(new terms.OperatorTerm({operator:'+'}),new terms.NumericTerm({
  number:value,options:{flavor:'Help an Ally',[ID]:{helpBonus:true}}
 }));
 roll.resetFormula();
}
export function updateHelpAdjustment(roll){
 const bonus=roll.terms.find(term=>term.options?.[ID]?.helpBonus);if(!bonus)return;
 const highest=Math.max(0,...selectedHelp(roll.options).map(row=>row.value));
 const own=roll.hasAdvantage?Number(roll.dAdvantage?.total):0;
 bonus.number=Number.isFinite(own)?Math.max(0,highest-own):highest;
 roll.resetFormula();
}
export function installHelpRoll(Duality,claim=data=>dispatch(CLAIM,data)){
 const construct=Duality.prototype.constructFormula,total=Duality.prototype._evaluateTotal,evaluate=Duality.buildEvaluate,initialEvaluate=Duality.prototype._evaluate,initialSync=Duality.prototype._evaluateSync;
 Duality.prototype.constructFormula=function(...args){construct.apply(this,args);addHelpTerms(this);return this._formula;};
 // Foundry v14 evaluates the initial roll through its AST, without calling
 // _evaluateTotal. Reconcile here, before outer reroll-manager interceptors see
 // the result; retain _evaluateTotal below for subsequent die rerolls.
 Duality.prototype._evaluate=async function(...args){
  const result=await initialEvaluate.apply(this,args);
  if(selectedHelp(this.options).length)this._total=this._evaluateTotal();
  return result;
 };
 if(initialSync)Duality.prototype._evaluateSync=function(...args){
  const result=initialSync.apply(this,args);
  if(selectedHelp(this.options).length)this._total=this._evaluateTotal();
  return result;
 };
 Duality.prototype._evaluateTotal=function(...args){updateHelpAdjustment(this);return total.apply(this,args);};
 Duality.buildEvaluate=async function(roll,config,...args){
  const rows=selectedHelp(config);
  if(!rows.length)return evaluate.call(this,roll,config,...args);
  const request={id:foundry.utils.randomID(),actorUuid:config.data.parent.uuid,ids:rows.map(row=>row.id)};
  const accepted=await claim(request);
  config[ID].helpAlly={...config[ID].helpAlly,rows:accepted,claimId:request.id};roll.options[ID]={...roll.options[ID],helpAlly:config[ID].helpAlly};
  roll.constructFormula(config);return evaluate.call(this,roll,config,...args);
 };
}
export function helpFormulaPreview(roll){
 const rows=selectedHelp(roll.options),die=roll.hasAdvantage&&roll.dAdvantage;
 if(!rows.length||!die)return null;
 const bonusIndex=roll.terms.findIndex(term=>term.options?.[ID]?.helpBonus);
 const highest=Math.max(...rows.map(row=>row.value));
 return roll.terms.filter((_term,index)=>index!==bonusIndex&&index!==bonusIndex-1)
  .map(term=>term===die?`highest(${die.formula}, ${highest} Help)`:term.formula).join(' ');
}
export function renderHelpChoice(app,html){
 html.querySelector('.dhp-help-ally')?.remove();const choice=app.config?.[ID]?.helpAlly;
 if(!choice?.rows?.length||app.config.actionType!=='action')return;
 const preview=app.roll&&helpFormulaPreview(app.roll),formula=html.querySelector('.roll-dialog-container > .formula-label');
 if(preview&&formula){
  const label=formula.querySelector('b');
  formula.replaceChildren(...(label?[label]:[]),html.ownerDocument.createTextNode(` ${preview}`));
 }
 const field=html.ownerDocument.createElement('div');field.className='dhp-help-ally';
 field.innerHTML=`<strong>Help an Ally</strong><p>${choice.rows.map(row=>`${esc(row.helperName)}: <strong>${row.value}</strong>`).join(' · ')}</p><small>Automatically applied to this action. Use the highest helper die or your own advantage die.</small>`;
 (html.querySelector('.roll-dialog-container > .formula-label')??html.querySelector('.roll-dialog-container > .roll-dialog-controls'))?.before(field);
}
export function registerHelpAlly(){
 CONFIG.queries[OFFER]=resolveHelp;CONFIG.queries[CLAIM]=claimHelp;
 installHelpRoll(CONFIG.Dice.daggerheart.DualityRoll);
 Hooks.on('daggerheart.preRollDuality',snapshotHelp);
 Hooks.on('renderD20RollDialog',renderHelpChoice);
 Hooks.on('daggerheart.preUseAction',action=>{
  if(action.id!==HELP_ACTION||action.item?.flags?.[ID]?.utility!=='help-an-ally')return;
  void promptHelp(action.actor).catch(error=>ui.notifications.error(error.message));return false;
 });
 const ensure=actor=>{void ensureHelpFeature(actor).catch(error=>{console.error(`${ID} | Help an Ally feature`,error);ui.notifications.error(`Help an Ally: ${error.message}`);});};
 Hooks.on('createActor',ensure);Hooks.on('createToken',token=>ensure(token.actor));for(const actor of characters())ensure(actor);
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!message.isContentVisible)return;
  const roll=message.system?.roll,rows=roll&&selectedHelp(roll.options??{});if(!rows?.length)return;
  const value=Math.max(...rows.map(row=>row.value),Number(roll.dAdvantage?.total)||0);
  const note=html.ownerDocument.createElement('p');note.className='dhp-help-result';note.textContent=`Help an Ally — ${rows.map(row=>`${row.helperName}: ${row.value}`).join('; ')}. Advantage bonus: ${value}.`;
  html.querySelector('.dhp-help-result')?.remove();(html.querySelector('.roll-container')??html.querySelector('.message-content')??html).append(note);
 });
}
