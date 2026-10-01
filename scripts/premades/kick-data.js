import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const KICK_KEY = 'faun-kick';
export const KICK_ACTION = 'bXbQ57CB1Hfj5XrS';
export function kickData(folder) {
  return {
    name: 'Kick', type: 'feature', folder,
    img: 'icons/skills/melee/shield-damaged-broken-gold.webp',
    system: {
      description: '<p>When you succeed on an attack against a target within Melee range, you can <strong>mark a Stress</strong> to kick yourself off them, dealing an extra <strong>2d6</strong> damage and knocking back either yourself or the target to Very Close range.</p>',
      gmNotes: '<p>Prompts before damage for a successful single-target attack within native Melee range. Adds Kick (+2d6) to the damage dialog Effects. Movement is manual.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [KICK_ACTION]: {
        _id: KICK_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Mark Stress', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [{ itemId: null, key: 'stress', value: 1, scalable: false, step: null, consumeOnSuccess: false }],
        uses: { value: 0, max: '', recovery: null, consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: KICK_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.gpW19TfJk0WWFh1S']
    } } }
  };
}
export async function ensureKick() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === KICK_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Faun');
  if (!folder) throw new Error('The Faun compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(kickData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Kick creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
