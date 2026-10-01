import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';

export const WINGS_KEY = 'aetheris-celestial-wings';
export const WINGS_ACTION = 'UWBrm5byhRrJpu4x';
export function celestialWingsData(folder) {
  return {
    name: 'Celestial Wings', type: 'feature', folder,
    img: 'icons/creatures/abilities/wings-birdlike-blue.webp',
    system: {
      description: '<p>You have wings that allow you to fly. Once per scene while flying, you can <strong>spend a Hope</strong> instead of marking an Armor Slot.</p>',
      gmNotes: '<p>While Flying, select an Armor Slot in the damage-reduction dialog and choose Spend 1 Hope. The selected slot is not marked. Refresh Scene features to recover the use.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [WINGS_ACTION]: {
        _id: WINGS_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Spend Hope', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [{ itemId: null, key: 'hope', value: 1, scalable: false, step: null, consumeOnSuccess: false }],
        uses: { value: 0, max: '1', recovery: 'scene', consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: WINGS_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.qNoIvEtDIA8JkOiq']
    } } }
  };
}
export async function ensureCelestialWings() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID, 'premade')?.key === WINGS_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Aetheris');
  if (!folder) throw new Error('The Aetheris compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = await Item.create(celestialWingsData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Celestial Wings creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
