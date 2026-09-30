import { ID,featureActive } from '../core.js';
import { GIFTED_KEY } from './gifted-performer-data.js';
import { closeSongTargets } from './song-targets.js';
export function groupSong(action){
 const item=action.item,f=item?.flags?.[ID];
 return Boolean(item&&featureActive(item)&&!f?.disabled&&(f?.applied?.key??f?.premade?.key)===GIFTED_KEY&&['xvs7ZKm93AlnZD3F','QTTgKnhpNE2XHz4u'].includes(action.id));
}
export function installSongTargets(Target){
 const prepare=Target.prototype.prepareConfig;
 Target.prototype.prepareConfig=function(config,...args){
  if(!groupSong(this))return prepare.call(this,config,...args);
  const tokens=closeSongTargets(this.actor);
  if(!tokens)throw new Error('Place the performer on the active scene and select their token to determine Close-range allies.');
  config.hasTarget=true;
  config.targets=tokens.map(token=>Target.formatTarget.call(this,token,config.roll));
 };
}
export function registerGiftedPerformer(){installSongTargets(game.system.api.fields.ActionFields.TargetField);}
