import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FEATURE_KEY='executioners-backstab';
export function featureData(folder){const data={
  "type": "feature",
  "name": "Backstab",
  "img": "icons/magic/death/weapon-scythe-rune-green.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Your \"Marked for Death\" feature uses <strong>d8s</strong> instead of d6s.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FEATURE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.1x1EBrNOPdlWhIAZ']}}};return data;}
export async function ensureBackstab() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FEATURE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Executioners Guild');
  if (!folder) throw new Error('The Executioners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(featureData(folder.id)) : await Item.create(featureData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Backstab creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
