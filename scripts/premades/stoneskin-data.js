import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';

// Retire the redundant built-in template; actor items and the system pack are untouched.
export async function removeStoneskinPremade() {
  const pack = game.packs.get(`${ID}.ancestry-features`);
  if (!pack) return;
  const entries = (await premadeDocuments(pack)).filter(item => item.getFlag(ID, 'premade')?.key === 'earthkin-stoneskin');
  if (!entries.length) return;
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    for (const item of entries) await item.delete();
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
