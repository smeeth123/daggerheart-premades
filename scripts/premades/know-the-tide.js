import { ID } from '../core.js';
import { TIDE_KEY } from './know-the-tide-data.js';
const WRAPPED=Symbol.for(`${ID}.tideRoll`),queues=new Map();
export function tideItem(actor){
  if(actor?.type!=='character')return null;
  return actor.items.find(item=>{const flags=item.flags?.[ID];return item.type==='feature'&&!flags?.disabled&&!item.system.inactive&&(flags?.applied?.key??flags?.premade?.key)===TIDE_KEY;})??null;
}
export function tideBonus(config){
  const choice=config?.[ID]?.tide;
  return config?.actionType==='action'&&Number.isInteger(choice?.count)&&choice.count>0?choice.count:0;
}
export async function spendTide(roll,config){
  const count=tideBonus(config),choice=config[ID]?.tide;
  if(!count||choice.paid)return;
  const operation=(queues.get(choice.itemUuid)??Promise.resolve()).catch(()=>{}).then(async()=>{
    if(choice.paid)return;
    const item=await fromUuid(choice.itemUuid),actor=item?.actor;
    if(!actor?.testUserPermission(game.user,'OWNER')||tideItem(actor)?.uuid!==item.uuid)throw new Error('Know the Tide is no longer available.');
    const value=Number(item.system.resource.value);
    if(!Number.isInteger(value)||value<count)throw new Error('Not enough Know the Tide tokens. Reopen the roll dialog.');
    const updated=await item.update({'system.resource.value':value-count});
    if(!updated||Number(item.system.resource.value)!==value-count)throw new Error('Could not spend Know the Tide tokens.');
    choice.paid=true;roll.options[ID]={...roll.options[ID],tide:choice};
  });
  queues.set(choice.itemUuid,operation);try{await operation;}finally{if(queues.get(choice.itemUuid)===operation)queues.delete(choice.itemUuid);}
}
export function installTideRoll(D20Roll,pay=spendTide){
  if(D20Roll[WRAPPED])return;
  const bonus=D20Roll.prototype.applyBaseBonus,evaluate=D20Roll.buildEvaluate;
  D20Roll.prototype.applyBaseBonus=function(...args){
    const modifiers=bonus.apply(this,args),count=tideBonus(this.options);
    if(count)modifiers.push({label:'Know the Tide',value:count});return modifiers;
  };
  D20Roll.buildEvaluate=async function(roll,config,...args){
    await pay(roll,config);return evaluate.call(this,roll,config,...args);
  };
  Object.defineProperty(D20Roll,WRAPPED,{value:true});
}
export function renderTideSelector(app,html){
  html.querySelector('.dhp-tide-selector')?.remove();
  if(!app.roll||!app.config?.roll)return;
  if(app.config.actionType!=='action'){
    if(app.config[ID]?.tide){delete app.config[ID].tide;if(app.roll.options[ID])delete app.roll.options[ID].tide;}
    return;
  }
  const item=tideItem(app.actor),available=Math.max(0,Math.floor(Number(item?.system.resource?.value)||0));
  if(!item||!available)return;
  const field=html.ownerDocument.createElement('div');field.className='dhp-tide-selector';
  const label=html.ownerDocument.createElement('label');
  const title=html.ownerDocument.createElement('span');title.className='dhp-tide-title';title.textContent='Know the Tide';
  const balance=html.ownerDocument.createElement('small');balance.textContent=`${available} token${available===1?'':'s'} available`;
  const text=html.ownerDocument.createElement('span');text.className='dhp-tide-text';text.append(title,balance);label.append(text);
  const select=html.ownerDocument.createElement('select');
  for(let i=0;i<=available;i++){const option=html.ownerDocument.createElement('option');option.value=String(i);option.textContent=i?`Spend ${i} (+${i})`:'Don’t spend';select.append(option);}
  select.setAttribute('aria-label','Know the Tide tokens to spend');
  select.value=String(Math.min(available,tideBonus(app.config)));label.append(select);field.append(label);
  select.addEventListener('change',event=>{
    event.stopPropagation();
    const choice={itemUuid:item.uuid,count:Number(select.value),paid:false};
    app.config[ID]={...app.config[ID],tide:choice};app.roll.options[ID]={...app.roll.options[ID],tide:choice};
    app.roll.constructFormula(app.config);void app.render();
  });
  // Nested .formula-label spans also label Situational Bonus and Rally Dice.
  // Only anchor to the final formula/control row outside the modifiers grid.
  const controls=html.querySelector('.roll-dialog-container > .formula-label')??html.querySelector('.roll-dialog-container > .roll-dialog-controls');
  if(controls)controls.before(field);
}
export function registerKnowTheTide(){
  installTideRoll(CONFIG.Dice.daggerheart.D20Roll);
  Hooks.on('renderD20RollDialog',renderTideSelector);
}
