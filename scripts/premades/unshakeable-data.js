import { ID } from '../core.js';
export const UNSHAKEABLE_KEY = 'firbolg-unshakeable';
export const UNSHAKEABLE_ACTION = 'x8xbjyCrJ0okOpIU';
export function unshakeableData(folder) {
  return {
    name: 'Unshakeable', type: 'feature', folder,
    img: 'icons/magic/control/buff-flight-wings-runes-blue-white.webp',
    system: {
      description: '<p>When you would mark a Stress, roll a <strong>d6</strong>. On a result of 6, don’t mark it.</p>',
      gmNotes: '<p>Automatically rolls one d6 for each incoming Stress point. Each 6 prevents one point before native Stress overflow. Includes Stress costs and direct Stress tracker increases.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [UNSHAKEABLE_ACTION]: {
        _id: UNSHAKEABLE_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Unshakeable', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [],
        uses: { value: 0, max: '', recovery: null, consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: UNSHAKEABLE_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.G5pE8FW94V1W9jJx']
    } } }
  };
}
export async function ensureUnshakeable() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === UNSHAKEABLE_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Firbolg');
  if (!folder) throw new Error('The Firbolg compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(unshakeableData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Unshakeable creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
