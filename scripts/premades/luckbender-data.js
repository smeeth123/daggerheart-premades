import { ID } from '../core.js';
export const LUCK_KEY = 'faerie-luckbender';
export const LUCK_ACTION = 'l1wUmqMzG8YF9sqb';
export function luckbenderData(folder) {
  return {
    name: 'Luckbender', type: 'feature', folder,
    img: 'icons/magic/control/buff-luck-fortune-green-gold.webp',
    system: {
      description: '<p>Once per session, after you or a willing ally within Close range makes an action roll, you can <strong>spend 3 Hope</strong> to reroll the Duality Dice.</p>',
      gmNotes: '<p>Offers a reroll of only the Hope and Fear dice before action-roll consequences. Requires 3 Hope and an unused session use; allies must consent and be within Close range. Reaction rolls are excluded.</p>',
      resource: null, actorResources: [], featureForm: 'passive',
      actions: { [LUCK_ACTION]: {
        _id: LUCK_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
        name: 'Spend Hope', description: '', chatDisplay: true,
        originItem: { type: 'itemCollection' }, actionType: 'reaction',
        triggers: [], areas: [], effects: [],
        cost: [{ itemId: null, key: 'hope', value: 3, scalable: false, step: null, consumeOnSuccess: false }],
        uses: { value: 0, max: '1', recovery: 'session', consumeOnSuccess: false },
        target: { type: 'any', amount: null }, range: ''
      } }
    }, effects: [],
    flags: { [ID]: { premade: {
      key: LUCK_KEY, version: '1.0.0', category: 'ancestry-features', aliases: [],
      sourceUuids: ['Compendium.daggerheart.ancestries.Item.U6iFjZgLYawlOlQZ']
    } } }
  };
}
export async function ensureLuckbender() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) throw new Error('The Ancestry Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === LUCK_KEY);
  if (existing) return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Faerie');
  if (!folder) throw new Error('The Faerie compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = await Item.create(luckbenderData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Luckbender creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
