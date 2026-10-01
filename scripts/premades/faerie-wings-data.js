import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FAERIE_KEY = 'faerie-wings';
export const FAERIE_ACTION = 'dpKxkDSjXsP8kHMI';
export function faerieWingsData(folder) {
  return {
    name: 'Wings', type: 'feature', folder,
    img: 'icons/creatures/abilities/wing-batlike-white-blue.webp',
    system: {
      description: '<p>You can fly. While flying, you can <strong>mark a Stress</strong> after an adversary makes an attack against you to gain a +2 bonus to your Evasion against that attack.</p>',
      gmNotes: '<p>While Flying, prompts after an adversary attack when marking 1 Stress for +2 Evasion would change a hit to a miss. The bonus applies only to that attack.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [FAERIE_ACTION]: {
        _id: FAERIE_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Mark Stress', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [{ itemId: null, key: 'stress', value: 1, scalable: false, step: null, consumeOnSuccess: false }],
        uses: { value: 0, max: '', recovery: null, consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: FAERIE_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.WquAjoOcso8lwySW']
    } } }
  };
}
export async function ensureFaerieWings() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FAERIE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Faerie');
  if (!folder) throw new Error('The Faerie compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(faerieWingsData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Wings creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
