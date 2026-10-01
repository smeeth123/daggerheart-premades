import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const MAESTRO_KEY='troubadour-maestro';
export function maestroData(folder){const data={
  "type": "feature",
  "name": "Maestro",
  "img": "icons/weapons/wands/wand-star-white.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Your rallying songs steel the courage of those who listen. When you give a <strong>Rally Die</strong> to an ally, they can <strong>gain a Hope</strong> or <strong>clear a Stress</strong>.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:MAESTRO_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.ZFkCz8XV1EtMoJ1w']}}};return data;}
export async function ensureMaestro() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === MAESTRO_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Troubadour');
  if (!folder) throw new Error('The Troubadour compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(maestroData(folder.id)) : await Item.create(maestroData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Maestro creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
