// Native chat cards read result.rerolled (and DualityDie.isRerolled). Mark only
// replacement dice: changing active/discarded or retaining old results here
// would change totals, keep/drop selection and the dice shown by Dice So Nice.
export function markRerolledDice(dice){
  for(const die of dice??[])for(const result of die.results??[])result.rerolled=true;
}

const rerolled=die=>Boolean(die?.results?.some(result=>result.rerolled));
export function actionRerollIndicators(roll){
  if(!roll)return [];
  if(roll.fateDie)return [rerolled(roll.fateDie==='Hope'?roll.dHope:roll.dFear)];
  if(roll.dHope){
    const states=[rerolled(roll.dHope),rerolled(roll.dFear)];
    const advantage=roll.dAdvantage??roll.dDisadvantage;
    if(advantage)states.push(rerolled(advantage));
    if(roll.rally?.dice)states.push(rerolled(roll.dRally));
    states.push(...(roll.extraDice??[]).map(rerolled));
    return states;
  }
  return (roll.dice??[]).flatMap(die=>(die.results??[]).map(result=>Boolean(result.rerolled)));
}

export function renderRerollIndicators(message,html){
  if(!message.isContentVisible)return;
  // The native template already marks Hope/Fear and damage results, but omits
  // the same icon on d20, Advantage/Disadvantage, Fate and extra action dice.
  // Match only its action-roll section, leaving damage and hidden cards alone.
  const states=actionRerollIndicators(message.system?.roll);
  if(!states.some(Boolean))return;
  const dice=[...html.querySelectorAll('.roll-part.roll-section .roll-dice .dice')];
  if(dice.length!==states.length)return; // Do not guess if another module changed the layout.
  for(let index=0;index<dice.length;index++){
    const element=dice[index];
    if(!states[index]||element.querySelector('.dice-rerolled'))continue;
    const icon=element.ownerDocument.createElement('i');
    icon.className='fa-solid fa-dice dice-rerolled';
    icon.dataset.tooltip=game.i18n.localize('DAGGERHEART.GENERAL.rerolled');
    element.prepend(icon);
  }
}

export function registerRerollIndicators(){
  Hooks.on('renderChatMessageHTML',renderRerollIndicators);
}
