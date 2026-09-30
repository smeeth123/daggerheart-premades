import { honedAction } from './premades/honed.js';

export function attackAdvantageEffect(actor) {
  if (actor?.type !== 'character') return null;
  return [...(actor.effects ?? [])].find(effect => !effect.disabled && !effect.isSuppressed && effect.type === 'beastform'
    && Object.values(effect.system?.advantageOn ?? {}).some(entry => String(entry?.value ?? '').trim().toLowerCase() === 'attack')) ?? null;
}

export function beastformAttackAdvantage(config) {
  if (config.actionType === 'reaction') return false;
  const actor = config.data?.parent ?? (config.source?.actor ? foundry.utils.fromUuidSync(config.source.actor) : null);
  if (!attackAdvantageEffect(actor)) return false;
  const action = honedAction(actor, config.source);
  return Boolean(action?.type === 'attack' && action === actor.system?.attack);
}
