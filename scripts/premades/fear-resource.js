import {ID} from '../core.js';
import {withHopeLock} from './hope-lock.js';
export const gmFear=()=>Number(ui.resources?.currentFear??game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.Resources.Fear));
export const withFearLock=task=>withHopeLock(ID+'.gmFear',task);
