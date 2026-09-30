import { ID } from '../core.js';
import { PACT_KEY,PACT_ACTION } from './patrons-pact-data.js';
const WRAPPED=Symbol.for(`${ID}.pactRoll`),queues=new Map();
export function pactItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===PACT_KEY;})??null;
}
export const patronFaces=actor=>Number(actor?.system.levelData?.level?.current??1)>=5?8:6;
export function pactBonus(config){
  const choice=config?.[ID]?.pact;
  return config?.actionType==='action'&&choice?.count===1&&[6,8].includes(choice.faces)?`1d${choice.faces}`:null;
}
export async function spendPact(roll,config){
  const count=pactBonus(config),choice=config[ID]?.pact;
  if(!count||choice.paid)return;
  const operation=(queues.get(choice.itemUuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
    if(choice.paid)return;
    const item=await fromUuid(choice.itemUuid),actor=item?.actor;
    if(!actor?.testUserPermission(game.user,'OWNER')||pactItem(actor)?.uuid!==item.uuid)throw new Error('Patron’s Pact is no longer available.');
    const value=Number(actor.system.resources?.favor?.value);
    if(!Number.isInteger(value)||value<1)throw new Error('Not enough Favor. Reopen the roll dialog.');
    if(choice.faces!==patronFaces(actor))throw new Error('Patron Die size changed. Reopen the roll dialog.');
    const updated=await actor.update({'system.resources.favor.value':value-1});
    if(!updated||Number(actor.system.resources.favor.value)!==value-1)throw new Error('Could not spend Favor.');
    choice.paid=true;roll.options[ID]={...roll.options[ID],pact:choice};
  });
  queues.set(choice.itemUuid,operation);try{await operation;}finally{if(queues.get(choice.itemUuid)===operation)queues.delete(choice.itemUuid);}
}
export function installPactRoll(D20Roll,pay=spendPact){
  if(D20Roll[WRAPPED])return;
  const bonus=D20Roll.prototype.applyBaseBonus,evaluate=D20Roll.buildEvaluate;
  D20Roll.prototype.applyBaseBonus=function(...args){
    const modifiers=bonus.apply(this,args),count=pactBonus(this.options);
    if(count)modifiers.push({label:'Patron’s Pact',value:count});return modifiers;
  };
  D20Roll.buildEvaluate=async function(roll,config,...args){
    await pay(roll,config);return evaluate.call(this,roll,config,...args);
  };
  Object.defineProperty(D20Roll,WRAPPED,{value:true});
}
export function renderPactSelector(app,html){
  html.querySelector('.dhp-pact-selector')?.remove();
  if(!app.roll||!app.config?.roll)return;
  if(app.config.actionType!=='action'){
    if(app.config[ID]?.pact){delete app.config[ID].pact;if(app.roll.options[ID])delete app.roll.options[ID].pact;}
    return;
  }
  const item=pactItem(app.actor),available=Math.max(0,Math.floor(Number(app.actor?.system.resources?.favor?.value)||0));
  if(!item||!available)return;
  const field=html.ownerDocument.createElement('div');field.className='dhp-pact-selector';
  const label=html.ownerDocument.createElement('label');
  const title=html.ownerDocument.createElement('span');title.className='dhp-pact-title';title.textContent='Patron’s Pact';
  const balance=html.ownerDocument.createElement('small');balance.textContent=`1 Favor · d${patronFaces(app.actor)} · patron’s sphere of influence`;
  const text=html.ownerDocument.createElement('span');text.className='dhp-pact-text';text.append(title,balance);label.append(text);
  const select=html.ownerDocument.createElement('select');
  for(let i=0;i<=1;i++){const option=html.ownerDocument.createElement('option');option.value=String(i);option.textContent=i?`Use (+1d${patronFaces(app.actor)})`:'Don’t spend';select.append(option);}
  select.setAttribute('aria-label','Use Patron’s Pact on this roll');
  select.value=app.config[ID]?.pact?.count===1?'1':'0';label.append(select);field.append(label);
  select.addEventListener('change',event=>{
    event.stopPropagation();
    const choice={itemUuid:item.uuid,count:Number(select.value),faces:patronFaces(app.actor),paid:false};
    app.config[ID]={...app.config[ID],pact:choice};app.roll.options[ID]={...app.roll.options[ID],pact:choice};
    app.roll.constructFormula(app.config);void app.render();
  });
  // Nested .formula-label spans also label Situational Bonus and Rally Dice.
  // Only anchor to the final formula/control row outside the modifiers grid.
  const controls=html.querySelector('.roll-dialog-container > .formula-label')??html.querySelector('.roll-dialog-container > .roll-dialog-controls');
  if(controls)controls.before(field);
}
export function registerPatronsPact(){
  installPactRoll(CONFIG.Dice.daggerheart.D20Roll);
  Hooks.on('renderD20RollDialog',renderPactSelector);
  Hooks.on('daggerheart.preUseAction',action=>{if(action.id===PACT_ACTION&&pactItem(action.actor)?.uuid===action.item?.uuid){ui.notifications.info('Select Patron’s Pact in the action roll dialog to spend Favor and add your Patron Die.');return false;}});
}
