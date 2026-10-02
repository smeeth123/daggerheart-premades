import { normalizeEffectSource } from './effect-compat.js';
import { featureActive } from './core.js';
import { ID, CATEGORIES, FIELDS, clone, metadata, validatePremade, snapshot, equal, plan, rebase } from './core.js';

const busy = new Set();
export function assertWritable(item) {
  if (!game.user.isGM) throw new Error('Medkit is GM-only.');
  if (!item?.isOwner) throw new Error('You do not own this item.');
  if (item.pack && game.packs.get(item.pack)?.locked) throw new Error('Unlock the target compendium first.');
  if (item.pack?.startsWith(`${ID}.`)) throw new Error('Apply Medkit to a world or actor item, not the premade library.');
}
export async function library() {
  const entries = [], errors = [];
  for (const category of Object.keys(CATEGORIES)) {
    const pack = game.packs.get(`${ID}.${category}`);
    if (!pack) { errors.push(`Missing compendium: ${CATEGORIES[category]}`); continue; }
    try {
      for (const doc of await pack.getDocuments()) {
        const data = doc.toObject();
        try {
          validatePremade(data, category);
          entries.push({ uuid: doc.uuid, data });
        } catch (error) { errors.push(`${doc.name}: ${error.message}`); }
      }
    } catch (error) { errors.push(`${pack.title}: ${error.message}`); }
  }
  const counts = new Map();
  for (const e of entries) counts.set(metadata(e.data).key, (counts.get(metadata(e.data).key) ?? 0) + 1);
  const duplicates = [...counts].filter(([,count]) => count > 1).map(([key]) => key);
  for (const key of duplicates) errors.push(`Duplicate premade key “${key}”; these entries are excluded until corrected.`);
  return { entries: entries.filter(e => !duplicates.includes(metadata(e.data).key)), errors };
}
async function exclusive(item, fn) {
  if (busy.has(item.uuid)) throw new Error('This item already has a Medkit operation running.');
  busy.add(item.uuid);
  try { return await fn(); } finally { busy.delete(item.uuid); }
}
async function writeSnapshot(item, state) {
  // Embedded document APIs run Daggerheart's normal effect lifecycle hooks.
  const ids = item.effects.map(e => e.id);
  const desiredIds = state.effects.map(e => e._id);
  const removed = ids.filter(id => !desiredIds.includes(id));
  if (removed.length) await item.deleteEmbeddedDocuments('ActiveEffect', removed);
  const existing = state.effects.filter(e => ids.includes(e._id));
  if (existing.length) {
    const updated = await item.updateEmbeddedDocuments('ActiveEffect', clone(existing), { diff: false, recursive: false });
    if (updated.length !== existing.length) throw new Error('An effect update was cancelled.');
  }
  const added = state.effects.filter(e => !ids.includes(e._id));
  if (added.length) await item.createEmbeddedDocuments('ActiveEffect', clone(added), { keepId: true });
  if (!equal(item.effects.map(e => e.id).sort(), desiredIds.sort())) throw new Error('An effect operation was cancelled.');
  const system = clone(item.toObject().system);
  for (const key of FIELDS) {
    if (Object.hasOwn(state.system, key)) system[key] = clone(state.system[key]);
    else delete system[key];
  }
  if(Object.hasOwn(state.system,'description'))system.description=state.system.description;
  const triggerItems = [item];
  for (const token of item.actor?.getActiveTokens?.() ?? []) {
    const other = token.actor?.items.get(item.id);
    if (other && other.uuid !== item.uuid) triggerItems.push(other);
  }
  game.system?.registeredTriggers?.unregisterItemTriggers(triggerItems);
  try {
    const updated = await item.update({ system }, { diff: false, recursive: false });
    if (!updated) throw new Error('The item update was cancelled.');
  } finally {
    for (const target of triggerItems) game.system?.registeredTriggers?.registerItemTriggers(target);
  }
}
export function premadeRevision(data) {
  // Foundry may refresh document bookkeeping while resolving a compendium UUID.
  // Only compare the identity, matching metadata, and data Medkit actually applies.
  const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['_stats','folder','sort','ownership','origin'].includes(key)).map(([key,v])=>[key,clean(v)])):value;
  const state=snapshot(data),Effect=globalThis.CONFIG?.ActiveEffect?.documentClass;
  if(metadata(data)?.weaponItems)state.system.description=data.system?.description??'';
  // Embedded sources can be sparse on the parent Item and schema-expanded when
  // the UUID is resolved. Compare equivalent schema data, not missing defaults.
  state.effects=state.effects.map(normalizeEffectSource);
  return clean({name:data.name,type:data.type,premade:metadata(data),...state});
}
export async function apply(item, entry, expected) {
  if (!featureActive(item)) throw new Error('This feature is not active on the actor’s sheet.');
  assertWritable(item);
  return exclusive(item, async () => {
    const source = await fromUuid(entry.uuid);
    if (!source) throw new Error('The premade is no longer available. Reopen Medkit.');
    const freshRevision=premadeRevision(source.toObject()),selectedRevision=premadeRevision(entry.data);
    if (!equal(freshRevision,selectedRevision)) {
      const changed=Object.keys(freshRevision).filter(key=>!equal(freshRevision[key],selectedRevision[key]));
      console.warn(`${ID} | Premade selection changed`,{uuid:entry.uuid,changed,selected:selectedRevision,current:freshRevision});
      throw new Error(`The premade changed (${changed.join(', ')}). Reopen Medkit to refresh the selection.`);
    }
    const current = item.toObject();
    const currentSnapshot=snapshot(current);
    if(expected&&Object.hasOwn(expected.before.system,'description'))currentSnapshot.system.description=current.system?.description??'';
    if (expected && !equal(currentSnapshot, expected.before)) throw new Error('The target changed. Reopen Medkit to refresh the selection.');
    const prepared = plan(current, entry.data, entry.uuid, item.uuid);
    const previousApplied = clone(current.flags?.[ID]?.applied ?? null);
    const previousDisabledEffects = clone(item.getFlag(ID, 'disabledEffectIds') ?? []);
    // Remove legacy saved history when this item is next applied.
    if (item.getFlag(ID, 'backup')) await item.unsetFlag(ID, 'backup');
    try {
      if (!prepared.metadataOnly) await writeSnapshot(item, prepared.after);
      else if(prepared.descriptionChanged){
        if(!await item.update({'system.description':prepared.after.system.description}))throw new Error('The description update was cancelled.');
      }
      if (!prepared.metadataOnly && item.getFlag(ID, 'disabled')) {
        const active = prepared.after.effects.filter(effect => !effect.disabled).map(effect => effect._id);
        await item.setFlag(ID, 'disabledEffectIds', active);
        if (active.length) await item.updateEmbeddedDocuments('ActiveEffect', active.map(_id => ({ _id, disabled: true })));
      }
      const meta = metadata(entry.data);
      await item.setFlag(ID, 'applied', { key: meta.key, name: entry.data.name, version: meta.version, sourceUuid: entry.uuid, appliedAt: Date.now(),
        ...(prepared.weaponProfile?{weaponProfile:prepared.weaponProfile}:{}) });

    } catch (error) {
      try {
        if (!prepared.metadataOnly) await writeSnapshot(item, prepared.before);
        else if(prepared.descriptionChanged&&item.toObject().system?.description!==prepared.before.system.description){
          if(!await item.update({'system.description':prepared.before.system.description}))throw new Error('The description restoration was cancelled.');
        }
        if (!prepared.metadataOnly && item.getFlag(ID, 'disabled')) await item.setFlag(ID, 'disabledEffectIds', previousDisabledEffects);
        if (previousApplied) await item.setFlag(ID, 'applied', previousApplied);
        else await item.unsetFlag(ID, 'applied');
      } catch (rollbackError) {
        console.error(`${ID} | Rollback failed`, rollbackError);
        throw new Error(`${error.message} Automatic restoration also failed; this item may be partially updated.`);
      }
      throw new Error(`Apply failed and the original automation was restored: ${error.message}`);
    }
  });
}
export async function savePremade(item, { category, key, version, aliases }) {
  if (!game.user.isGM) throw new Error('Only the GM can author premades.');
  const data = item.toObject();
  data.flags = { [ID]: { premade: {
    key: key.trim(), version: version.trim(), category,
    aliases: aliases.split('\n').map(s => s.trim()).filter(Boolean),
    sourceUuids: [...new Set([data._stats?.compendiumSource, data.flags?.core?.sourceId, item.uuid].filter(Boolean))]
  } } };
  validatePremade(data, category);
  const { entries, errors } = await library();
  if (errors.length) throw new Error(`Fix library errors before saving: ${errors.join('; ')}`);
  if (entries.some(e => metadata(e.data).key === key.trim())) throw new Error('That key already exists. Edit the existing compendium entry and increment its version.');
  const pack = game.packs.get(`${ID}.${category}`);
  if (!pack) throw new Error('The destination compendium is missing. Restart Foundry after installation.');
  if (pack.locked) throw new Error('Unlock the destination compendium in the Compendium sidebar, then save again.');
  delete data._stats; delete data.folder; delete data.ownership;
  if (data.system.granter) data.system.granter = null;
  data._id = foundry.utils.randomID();
  const newUuid = `Compendium.${pack.collection}.Item.${data._id}`;
  data.system = rebase(data.system, item.uuid, newUuid);
  data.effects = rebase(data.effects, item.uuid, newUuid);
  const saved = await Item.create(data, { pack: pack.collection, keepId: true, keepEmbeddedIds: true });
  if (!saved) throw new Error('Premade creation was cancelled.');
  return saved;
}

export async function setPremadeEnabled(item, enabled) {
  assertWritable(item);
  if (!item.getFlag(ID, 'applied') && !item.getFlag(ID, 'premade')) throw new Error('This feature has no applied premade.');
  return exclusive(item, async () => {
    if (Boolean(item.getFlag(ID, 'disabled')) === !enabled) return;
    if (['weapon','armor'].includes(item.type)) {
      // Disabling optional weapon automation must not disable the weapon itself.
      if (enabled) await item.unsetFlag(ID, 'disabled');
      else await item.setFlag(ID, 'disabled', true);
      return;
    }
    if (!enabled) {
      const active = item.effects.filter(effect => !effect.disabled).map(effect => effect.id);
      await item.setFlag(ID, 'disabledEffectIds', active);
      await item.setFlag(ID, 'disabled', true);
      if (active.length) await item.updateEmbeddedDocuments('ActiveEffect', active.map(_id => ({ _id, disabled: true })));
      game.system?.registeredTriggers?.unregisterItemTriggers([item]);
    } else {
      const active = item.getFlag(ID, 'disabledEffectIds') ?? [];
      if (active.length) await item.updateEmbeddedDocuments('ActiveEffect', active.filter(id => item.effects.some(e => e.id === id)).map(_id => ({ _id, disabled: false })));
      await item.unsetFlag(ID, 'disabled');
      await item.unsetFlag(ID, 'disabledEffectIds');
      game.system?.registeredTriggers?.registerItemTriggers(item);
    }
  });
}
export function registerPremadeDisableHooks() {
  Hooks.on('daggerheart.preUseAction', action => {
    if (!['weapon','armor'].includes(action.item?.type) && action.item?.flags?.[ID]?.disabled) {
      ui.notifications.info('This premade is disabled. Enable it in Medkit to use its actions.');
      return false;
    }
  });
  const registry = game.system?.registeredTriggers;
  if (registry?.registerItemTriggers && !registry.dhpDisableGuard) {
    const original = registry.registerItemTriggers;
    registry.registerItemTriggers = function(item, ...args) {
      if (!['weapon','armor'].includes(item?.type) && item?.flags?.[ID]?.disabled) return;
      return original.call(this, item, ...args);
    };
    registry.dhpDisableGuard = true;
    for (const actor of game.actors ?? []) registry.unregisterItemTriggers(actor.items.filter(item => !['weapon','armor'].includes(item.type) && item.flags?.[ID]?.disabled));
  }
}
