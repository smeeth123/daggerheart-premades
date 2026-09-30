import { ID } from '../core.js';
export const QUICK_KEY = 'elf-quick-reactions';
export const QUICK_ACTION = '6Av1Y8JXWDkteLhc';
export function quickReactionsData(folder) {
  return {
    name: 'Quick Reactions', type: 'feature', folder,
    img: 'icons/skills/movement/feet-winged-boots-brown.webp',
    system: {
      description: '<p><strong>Mark a Stress</strong> to gain advantage on a reaction roll.</p>',
      gmNotes: '<p>Prompts before a Reaction roll without advantage when an unmarked Stress slot is available. Acceptance marks 1 Stress and grants advantage for that roll; existing disadvantage is cancelled.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [QUICK_ACTION]: {
        _id: QUICK_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Mark Stress', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [{ itemId: null, key: 'stress', value: 1, scalable: false, step: null, consumeOnSuccess: false }],
        uses: { value: 0, max: '', recovery: null, consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: QUICK_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.0NSPSuB8KSEYTJIP']
    } } }
  };
}
export async function ensureQuickReactions() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === QUICK_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Elf');
  if (!folder) throw new Error('The Elf compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(quickReactionsData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Quick Reactions creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
