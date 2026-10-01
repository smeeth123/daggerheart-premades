import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const PARTNER_KEY='vengeance-partner-in-arms';
export function partnerInArmsData(folder){const data={
  "name": "Partner-in-Arms",
  "type": "feature",
  "img": "icons/skills/social/diplomacy-handshake-yellow.webp",
  "system": {
    "description": "<p>When an ally within Very Close range takes damage, you can mark an Armor Slot to reduce the severity by one threshold.</p>",
    "resource": null,
    "actions": {},
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "",
    "granter": null,
    "featureForm": "passive"
  },
  "effects": []
};data.folder=folder;data.flags={[ID]:{premade:{key:PARTNER_KEY,version:'1.0.0',category:'subclass-features',aliases:['Partner in Arms'],sourceUuids:['Compendium.daggerheart.subclasses.Item.G54qY96XK62hgoK9']}}};return data;}
export async function ensurePartnerInArms() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === PARTNER_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Vengeance');
  if (!folder) throw new Error('The Vengeance compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(partnerInArmsData(folder.id)) : await Item.create(partnerInArmsData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('PartnerInArms creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
