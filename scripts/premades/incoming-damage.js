// Keep packet provenance and resource-only damage when replacing its numerical
// main damage. In particular, do not turn a packet into a second damage roll.
export function incomingDamagePacket(args = {}) {
  if (!args || typeof args !== 'object') return null;
  const key = 'total' in args ? 'root' : args.main != null ? 'main' : args.damage != null ? 'damage' : null;
  const raw = key === 'root' ? args : args[key];
  const total = typeof raw === 'number' ? raw : raw?.total;
  const types = Array.from(raw?.options?.damageTypes ?? raw?.damageTypes ?? []);
  return key && Number.isFinite(total) && total > 0 ? {key, raw, total, types, halved: Math.ceil(total / 2)} : null;
}

export function halveDamagePacket(args, damage) {
  // Roll totals can be inherited getters; spreading the Roll alone loses them.
  const raw = typeof damage.raw === 'number' ? {} : damage.raw;
  const reduced = {...raw, total: damage.halved,
    options: {...raw?.options, damageTypes: [...damage.types]}};
  return damage.key === 'root' ? {...args, ...reduced} : {...args, [damage.key]: reduced};
}
