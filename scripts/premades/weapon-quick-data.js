import {ID} from '../core.js';
import {premadeDocuments, configurePremadePack} from '../premade-setup-context.js';
export const WEAPON_QUICK_KEY = 'weapon-quick';
export function weaponQuickData() {
  return {
    name: 'Quick', type: 'feature', img: 'icons/skills/movement/arrow-upward-yellow.webp',
    system: {
      description: '<p>When you make an attack, you can mark a Stress to target another creature within range.</p>',
      gmNotes: 'Apply with Medkit to a weapon that has the native Quick property. This template enables a pre-roll target picker without changing the weapon’s stats, actions or effects. Do not add it as a separate character feature.',
      actions: {}, resource: null, granter: null, featureForm: 'passive'
    }, effects: [],
    flags: {[ID]: {premade: {key: WEAPON_QUICK_KEY, version: '1.0.0', category: 'weapon-features', weaponFeature: 'quick', aliases: [], sourceUuids: []}}}
  };
}
export async function ensureWeaponQuick() {
  const pack = game.packs.get(`${ID}.weapon-features`);
  if (!pack) throw new Error('The Weapon Features compendium is missing. Restart Foundry after installation.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID, 'premade')?.key === WEAPON_QUICK_KEY);
  if (existing?.getFlag(ID, 'premade')?.version === '1.0.0') return existing;
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack, {locked: false});
    const item = existing ? await existing.update(weaponQuickData()) : await Item.create(weaponQuickData(), {pack: pack.collection});
    if (!item) throw new Error('Quick weapon feature creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack, {locked: true}); }
}
