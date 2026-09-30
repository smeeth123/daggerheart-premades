export const ID = 'daggerheart-premades';
export const CATEGORIES = {
  'class-features': 'Class Features',
  'subclass-features': 'Subclass Features',
  'domain-cards': 'Domain Cards',
  'ancestry-features': 'Ancestry Features',
  'community-features': 'Community Features',
  'beastform-features': 'Beastform Features',
  'transformation-features': 'Transformation Features'
};
// Deliberately limited to automation. Advancement, vault and granting links stay on the target.
export const FIELDS = ['actions', 'resource', 'actorResources', 'featureForm'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const metadata = item => item.flags?.[ID]?.premade;
export const supported = item => ['feature', 'domainCard'].includes(item.type);
export function featureActive(item) {
  if (item.system?.inactive) return false;
  if (item.actor && item.system?.granter?.type === 'subclass' && typeof item.actor.system?.isItemAvailable === 'function')
    return Boolean(item.actor.system.isItemAvailable(item));
  return true;
}
export function categoryFor(item) {
  if (item.type === 'domainCard') return 'domain-cards';
  const category = `${item.system?.granter?.type}-features`;
  return CATEGORIES[category] ? category : null;
}
export function validatePremade(item, category) {
  const meta = metadata(item);
  if (!supported(item)) throw new Error('Premades must be features or domain cards.');
  if (!CATEGORIES[category] || meta?.category !== category) throw new Error('Premade category does not match its compendium.');
  if ((item.type === 'domainCard') !== (category === 'domain-cards')) throw new Error('Document type does not match its category.');
  if (!meta.key || !/^\d+\.\d+\.\d+$/.test(meta.version ?? '')) throw new Error('A premade needs a stable key and an x.y.z version.');
  validateReferences(item);
  return meta;
}
export function validateReferences(item) {
  const actions = item.system?.actions ?? {};
  if (Array.isArray(actions)) throw new Error('Daggerheart actions must be keyed by ID.');
  const effects = new Set((item.effects ?? []).map(e => e._id));
  for (const [id, action] of Object.entries(actions)) {
    if (id !== action._id) throw new Error(`Action ID mismatch: ${id}`);
    for (const ref of action.effects ?? []) if (!effects.has(ref._id)) throw new Error(`Missing effect ${ref._id} in ${action.name ?? id}.`);
    for (const ref of action.grouped?.groupedActions ?? []) if (!actions[ref]) throw new Error(`Missing grouped action ${ref}.`);
  }
}
export function matches(target, entries) {
  if (!featureActive(target)) return [];
  const compatible = entries.filter(e => e.data.type === target.type);
  const applied = target.flags?.[ID]?.applied;
  if (applied?.key) {
    const byKey = compatible.filter(e => metadata(e.data)?.key === applied.key);
    if (byKey.length) return byKey;
  }
  const uuids = [target._stats?.compendiumSource, target.flags?.core?.sourceId].filter(Boolean);
  const bySource = compatible.filter(e => metadata(e.data).sourceUuids?.some(u => uuids.includes(u)));
  if (bySource.length) return bySource;
  // A removed/replaced premade can be recovered through its original source UUID,
  // but never silently replaced just because another item has the same name.
  if (applied?.key) return [];
  const category = categoryFor(target);
  return compatible.filter(e => {
    const meta = metadata(e.data);
    return (!category || meta.category === category) && [e.data.name, ...(meta.aliases ?? [])].some(n => normalize(n) === normalize(target.name));
  });
}
export const MEDKIT_STATES = {
  disabled: { label: 'Premade disabled', color: 'grey' },
  none: { label: 'No premades available', color: 'grey' },
  available: { label: 'Premade available', color: 'orange' },
  current: { label: 'Premade up to date', color: 'green' },
  outdated: { label: 'Premade out of date', color: 'red' }
};
export function itemStatus(target, entries) {
  if (!featureActive(target)) return 'none';
  if (target.flags?.[ID]?.disabled) return 'disabled';
  const candidates = matches(target, entries);
  if (!candidates.length) return 'none';
  const installed = target.flags?.[ID]?.applied ?? metadata(target);
  if (!installed?.key) return 'available';
  const matched = candidates.find(e => metadata(e.data).key === installed.key);
  if (!matched) return 'available';
  if (!/^\d+\.\d+\.\d+$/.test(installed.version ?? '')) return 'outdated';
  const local = installed.version.split('.').map(Number);
  const source = metadata(matched.data).version.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (local[i] < source[i]) return 'outdated';
    if (local[i] > source[i]) return 'current';
  }
  return 'current';
}
export function actorStatus(items, entries) {
  const states = items.filter(supported).map(item => itemStatus(item, entries));
  return ['outdated', 'available', 'current', 'disabled'].find(state => states.includes(state)) ?? 'none';
}
export function snapshot(item) {
  const system = {};
  for (const key of FIELDS) if (Object.hasOwn(item.system ?? {}, key)) system[key] = clone(item.system[key]);
  return { system, effects: clone(item.effects ?? []) };
}
export function rebase(value, sourceUuid, targetUuid) {
  if (typeof value === 'string' && sourceUuid) return value === sourceUuid ? targetUuid : value.startsWith(`${sourceUuid}.`) ? targetUuid + value.slice(sourceUuid.length) : value;
  if (Array.isArray(value)) return value.map(v => rebase(v, sourceUuid, targetUuid));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,rebase(v,sourceUuid,targetUuid)]));
  return value;
}
export function plan(target, source, sourceUuid, targetUuid) {
  if (target.type !== source.type || !supported(target)) throw new Error('Premade and target types must match.');
  validatePremade(source, metadata(source)?.category);
  const before = snapshot(target);
  const after = rebase(snapshot(source), sourceUuid, targetUuid);
  const priorUse = before.system.actions?.[metadata(source)?.resourceSourceAction]?.uses?.value;
  if (!before.system.resource && after.system.resource && priorUse !== undefined &&
      Number.isFinite(Number(priorUse)) && Number(priorUse) >= 0) {
    after.system.resource.value = Number(priorUse);
  }
  // Current counters belong to the actor, not the compendium template.
  if (before.system.resource && after.system.resource && before.system.resource.type === after.system.resource.type) {
    after.system.resource.value = before.system.resource.value;
    if (before.system.resource.diceStates) after.system.resource.diceStates = clone(before.system.resource.diceStates);
  }
  for (const [id, action] of Object.entries(after.system.actions ?? {})) {
    const old = before.system.actions?.[id];
    if (old?.uses && action.uses && Object.hasOwn(old.uses, 'value')) action.uses.value = old.uses.value;
  }
  const actionResourceTarget = metadata(source)?.actionResourceTarget;
  if (actionResourceTarget && before.system.resource?.type === 'simple' &&
      before.system.resource.progression === 'increasing' &&
      before.system.resource.recovery === after.system.actions?.[actionResourceTarget]?.uses?.recovery &&
      Number.isFinite(Number(before.system.resource.value))) {
    after.system.actions[actionResourceTarget].uses.value = Number(before.system.resource.value);
  }
  const descriptionAppend=metadata(source)?.descriptionAppend;
  if(typeof descriptionAppend==='string'&&descriptionAppend){
    before.system.description=target.system?.description??'';
    after.system.description=before.system.description.includes(descriptionAppend)?before.system.description:before.system.description+descriptionAppend;
  }
  return { before, after, changed: !equal(before, after) };
}
