import {ID,featureActive} from './core.js';

const SOURCE='Compendium.daggerheart.ancestries.Item.2xlqKOkDxWHbuj4t';
const WRAPPED=Symbol.for(`${ID}.efficientRest`),states=new WeakMap();

export function efficientItem(actor){
  return actor?.type==='character'?actor.items?.find(item=>{
    if(item.type!=='feature'||!featureActive(item))return false;
    const source=item._stats?.compendiumSource;
    if(source===SOURCE)return true;
    if(item.name!=='Efficient')return false;
    const changes=[...(item.effects??[])].flatMap(effect=>effect.system?.changes??[]);
    return changes.some(change=>change.key==='system.bonuses.rest.shortRest.longMoves'&&Number(change.value)>0)&&changes.some(change=>change.key==='system.bonuses.rest.shortRest.shortMoves'&&Number(change.value)<0);
  })??null:null;
}
export function normalizeEfficientRest(app){
  if(!app?.shortrest||!efficientItem(app.actor)||!app.nrChoices)return null;
  let state=states.get(app);if(state)return state;
  const shortMax=Math.max(0,Number(app.nrChoices.shortRest?.max)||0),longMax=Math.max(0,Number(app.nrChoices.longRest?.max)||0);
  state={total:shortMax+longMax,longMax};states.set(app,state);
  app.nrChoices.shortRest.max=state.total;
  app.nrChoices.longRest.max=state.longMax;
  return state;
}
export function efficientCounts(app){
  const count=(key,field)=>Object.values(app.moveData?.[key]?.moves??{}).reduce((sum,move)=>sum+Math.max(0,Number(move[field])||0),0);
  return{taken:Number(app.nrChoices.shortRest.taken)+Number(app.nrChoices.longRest.taken),selected:count('shortRest','selected')+count('longRest','selected'),shortSelected:count('shortRest','selected'),longSelected:count('longRest','selected')};
}
export function installEfficientRest(Downtime){
  if(Downtime[WRAPPED])return;
  const nativeContext=Downtime.prototype._prepareContext;
  Downtime.prototype._prepareContext=async function(...args){normalizeEfficientRest(this);return nativeContext.apply(this,args);};
  const nativeSelect=Downtime.DEFAULT_OPTIONS.actions.selectMove;
  const select=function(event,target){const state=normalizeEfficientRest(this);if(state){const counts=efficientCounts(this);if(counts.taken+counts.selected>=state.total){ui.notifications.error('Efficient allows the normal total number of rest moves, with up to one Long Rest move substituted.');return;}}return nativeSelect.call(this,event,target);};
  Downtime.DEFAULT_OPTIONS.actions.selectMove=select;Downtime.selectMove=select;
  const nativeTake=Downtime.DEFAULT_OPTIONS.actions.takeDowntime;
  const take=async function(...args){
    const state=normalizeEfficientRest(this);
    if(state){const counts=efficientCounts(this);if(counts.selected&&counts.taken+counts.selected>=state.total){this.nrChoices.shortRest.max=Number(this.nrChoices.shortRest.taken)+counts.shortSelected;this.nrChoices.longRest.max=Number(this.nrChoices.longRest.taken)+counts.longSelected;}}
    return nativeTake.apply(this,args);
  };
  Downtime.DEFAULT_OPTIONS.actions.takeDowntime=take;Downtime.takeDowntime=take;
  Object.defineProperty(Downtime,WRAPPED,{value:true});
}
export function registerEfficientRest(){installEfficientRest(game.system.api.applications.dialogs.Downtime);}
