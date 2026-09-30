import { ID } from '../core.js';

export const FRAGILE_KEY = 'beastform-fragile';
const img = 'icons/magic/life/heart-pink.webp';

export function fragileData(folder) {
  return {
    name: 'Fragile', type: 'feature', img, folder,
    system: {
      description: '<p>When you take Major or greater damage, you drop out of Beastform.</p>',
      resource: null, actions: {}, attribution: { source: 'Daggerheart SRD', page: null, artist: '' },
      gmNotes: 'After damage reduction and prevention resolve, marking 2 or more HP from one damage application automatically uses Daggerheart’s native transformation cleanup to end Beastform.',
      granter: null, featureForm: 'passive', actorResources: []
    },
    effects: [],
    flags: { [ID]: { premade: {
      key: FRAGILE_KEY, version: '1.0.0', category: 'beastform-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.beastforms.Item.QFg1hNCEoKVDd9Zo']
    } } }
  };
}

export async function ensureFragile() {
  const pack = game.packs.get(`${ID}.beastform-features`);
  if (!pack) throw new Error('The Beastform Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID, 'premade')?.key === FRAGILE_KEY);
  if (existing?.getFlag(ID, 'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Beastform Features');
  if (!folder) throw new Error('The Beastform Features compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const data = fragileData(folder.id);
    const item = existing
      ? await existing.update(data, { diff: false, recursive: false })
      : await Item.create(data, { pack: pack.collection });
    if (!item) throw new Error('Fragile creation was cancelled.');
    return item;
  } finally {
    if (locked) await pack.configure({ locked: true });
  }
}
