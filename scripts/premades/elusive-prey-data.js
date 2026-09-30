import { ID } from '../core.js';

export const ELUSIVE_PREY_KEY = 'beastform-elusive-prey';
export const ELUSIVE_PREY_ACTION = '9lvrqQKTEB3NRwvM';
const img = 'icons/skills/movement/arrows-up-trio-red.webp';

export function elusivePreyData(folder) {
  const data = {
    name: 'Elusive Prey', type: 'feature', img, folder,
    system: {
      description: '<p>When an attack roll against you would succeed, you can <strong>mark a Stress</strong> and roll a <strong>d4</strong>. Add the result to your Evasion against this attack.</p>',
      resource: null,
      actions: { [ELUSIVE_PREY_ACTION]: {
        type: 'attack', _id: ELUSIVE_PREY_ACTION, systemPath: 'actions', description: '', chatDisplay: false,
        actionType: 'action', cost: [{ scalable: false, key: 'stress', value: 1, step: null, itemId: null, consumeOnSuccess: false }],
        uses: { value: null, max: '', recovery: null, consumeOnSuccess: false }, damage: { main: null, resources: {} },
        target: { type: '', amount: null }, effects: [],
        roll: { type: 'diceSet', trait: null, difficulty: null, bonus: null, advState: 'neutral', diceRolling: { multiplier: 'flat', flatMultiplier: 1, dice: 'd4', compare: null, treshold: null }, useDefault: false },
        save: { trait: null, difficulty: 10, damageMod: 'none' }, name: 'Mark Stress', img, range: '', baseAction: false,
        originItem: { type: 'itemCollection' }, triggers: [], areas: []
      } },
      attribution: { source: 'Daggerheart SRD', page: null, artist: '' },
      gmNotes: 'After a noncritical adversary attack hits, the defender may mark 1 Stress and roll 1d4 to add to Evasion against that attack. The shared attack-resolution workflow recalculates the hit before damage.',
      granter: null, featureForm: 'passive', actorResources: []
    }, effects: [],
    flags: { [ID]: { premade: {
      key: ELUSIVE_PREY_KEY, version: '1.0.0', category: 'beastform-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.beastforms.Item.a7Qvmm14nx9BCysA']
    } } }
  };
  return data;
}

export async function ensureElusivePrey() {
  const pack = game.packs.get(`${ID}.beastform-features`);
  if (!pack) throw new Error('The Beastform Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID, 'premade')?.key === ELUSIVE_PREY_KEY);
  if (existing?.getFlag(ID, 'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Beastform Features');
  if (!folder) throw new Error('The Beastform Features compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const data = elusivePreyData(folder.id);
    const item = existing ? await existing.update(data, { diff: false, recursive: false }) : await Item.create(data, { pack: pack.collection });
    if (!item) throw new Error('Elusive Prey creation was cancelled.');
    return item;
  } finally {
    if (locked) await pack.configure({ locked: true });
  }
}
