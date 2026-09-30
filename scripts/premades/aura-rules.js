import { ID } from '../core.js';
import { AURA_KEY, AURA_ACTION } from './hallowed-aura-data.js';

export function auraCounter(item) {
  const actions = item.system?.actions;
  const action = actions?.get?.(AURA_ACTION) ?? actions?.[AURA_ACTION];
  if (action?.uses?.recovery === 'longRest') return {
    value: Number(action.uses.value), path: `system.actions.${AURA_ACTION}.uses.value`
  };
  const resource = item.system?.resource;
  if (resource?.recovery === 'longRest' && resource.progression === 'increasing')
    return { value: Number(resource.value), path: 'system.resource.value' };
  return null;
}
export function auraAvailable(item) {
  const flags = item.flags?.[ID];
  const key = flags?.applied?.key ?? flags?.premade?.key;
  const counter = auraCounter(item);
  return item.type === 'feature' && !item.flags?.[ID]?.disabled && key === AURA_KEY && !item.system.inactive &&
    counter && Number.isFinite(counter.value) && counter.value >= 0 && counter.value < 1;
}
export function allied(source, bearer) {
  return source.actor && bearer.actor && source.actor.uuid !== bearer.actor.uuid &&
    source.disposition === 1 && bearer.disposition === 1;
}
export function ownerFor(actor, users, gm) {
  return users.filter(user => user.active && !user.isGM && actor.testUserPermission(user, 'OWNER'))
    .sort((a, b) => Number(b.character?.id === actor.id) - Number(a.character?.id === actor.id) || a.id.localeCompare(b.id))[0] ?? gm;
}
export function closeDistance(scene, settings, customId) {
  const sceneRanges = scene.flags?.daggerheart?.rangeMeasurement;
  return Number(settings.enabled && sceneRanges?.setting === customId ? sceneRanges.close : settings.close);
}
export function tokenState(token) {
  return JSON.stringify([token.uuid, token.actor?.uuid, token.x, token.y, token.width, token.height,
    token.elevation, token.rotation, token.shape, token.disposition]);
}
export function unavailableActor(actor) {
  return !actor || ['dead', 'defeated', 'unconscious'].some(status => actor.statuses?.has(status));
}
