import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';

export const BEASTFORM_COMPANION_KEY = 'beastform-companion';
const img = 'icons/magic/life/heart-glowing-red.webp';

export function beastformCompanionData(folder) {
  return {
    name: 'Companion', type: 'feature', img, folder,
    system: {
      description: '<p>When you Help an Ally, you can roll a <strong>d8</strong> as your advantage die.</p>',
      resource: null, actions: {}, attribution: { source: 'Daggerheart SRD', page: null, artist: '' },
      gmNotes: 'The normal Help an Ally utility automatically rolls a d8 instead of a d6 while this Medkitted Beastform feature is active.',
      granter: null, featureForm: 'passive', actorResources: []
    },
    effects: [],
    flags: { [ID]: { premade: {
      key: BEASTFORM_COMPANION_KEY, version: '1.0.0', category: 'beastform-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.beastforms.Item.jhWSC5bNZyYUAA5Q']
    } } }
  };
}

export async function ensureBeastformCompanion() {
  const pack = game.packs.get(`${ID}.beastform-features`);
  if (!pack) throw new Error('The Beastform Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID, 'premade')?.key === BEASTFORM_COMPANION_KEY);
  if (existing?.getFlag(ID, 'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Beastform Features');
  if (!folder) throw new Error('The Beastform Features compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const data = beastformCompanionData(folder.id);
    const item = existing
      ? await existing.update(data, { diff: false, recursive: false })
      : await Item.create(data, { pack: pack.collection });
    if (!item) throw new Error('Companion creation was cancelled.');
    return item;
  } finally {
    if (locked) await configurePremadePack(pack,{ locked: true });
  }
}
