import { ID } from '../core.js';

export const AURA_ACTION = 'NBKcarcNqeWCqCHG';
export const AURA_KEY = 'aetheris-hallowed-aura';
export function hallowedAuraData(folder) {
  return {
    name: 'Hallowed Aura', type: 'feature', folder,
    img: 'icons/magic/holy/barrier-shield-winged-cross.webp',
    system: {
      description: '<p>Once per long rest when an ally within Close range rolls with Fear, you can change it into a roll with Hope instead.</p>',
      gmNotes: '<p>Daggerheart Premades prompts the owning player automatically before a qualifying roll resolves. The action counter displays remaining uses and refreshes on a long rest.</p>',
      actions: { [AURA_ACTION]: {
        _id: AURA_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Fear To Hope', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], cost: [], effects: [],
        uses: { value: 0, max: '1', recovery: 'longRest', consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }, actorResources: [], featureForm: 'passive', resource: null
    },
    effects: [],
    flags: { [ID]: { premade: {
      key: AURA_KEY, version: '1.1.0', category: 'ancestry-features', aliases: [],
      actionResourceTarget: AURA_ACTION,
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.k9hwCXpESBx326PC']
    } } }
  };
}

export async function ensureHallowedAura() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID, 'premade')?.key === AURA_KEY);
  if (existing && existing.getFlag(ID, 'premade')?.version !== '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Aetheris');
  if (!folder) throw new Error('The Aetheris compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    if (existing) {
      const data = hallowedAuraData(existing.folder?.id ?? folder.id);
      return await existing.update({ system: { ...existing.toObject().system, ...data.system },
        [`flags.${ID}.premade`]: data.flags[ID].premade }, { diff: false, recursive: false });
    }
    const item = await Item.create(hallowedAuraData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Hallowed Aura creation was cancelled.');
    return item;
  } finally {
    if (locked) await pack.configure({ locked: true });
  }
}
