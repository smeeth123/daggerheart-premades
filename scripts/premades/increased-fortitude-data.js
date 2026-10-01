import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FORTITUDE_KEY = 'dwarf-increased-fortitude';
export const FORTITUDE_ACTION = 'pFPbjyexOPx5gog6';
export function increasedFortitudeData(folder) {
  return {
    name: 'Increased Fortitude', type: 'feature', folder,
    img: 'icons/magic/control/buff-strength-muscle-damage-red.webp',
    system: {
      description: '<p><strong>Spend 3 Hope</strong> to halve incoming physical damage.</p>',
      gmNotes: '<p>When physical damage is applied, prompts the owner before damage thresholds and Armor reduction. Halves incoming damage, rounded up, for 3 Hope. No per-scene or rest limit.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [FORTITUDE_ACTION]: {
        _id: FORTITUDE_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Spend Hope', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [{ itemId: null, key: 'hope', value: 3, scalable: false, step: null, consumeOnSuccess: false }],
        uses: { value: 0, max: '', recovery: null, consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: FORTITUDE_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.0RN0baBxh95GT1cm']
    } } }
  };
}
export async function ensureIncreasedFortitude() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FORTITUDE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Dwarf');
  if (!folder) throw new Error('The Dwarf compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(increasedFortitudeData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Increased Fortitude creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
