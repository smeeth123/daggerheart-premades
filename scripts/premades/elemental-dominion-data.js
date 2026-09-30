import { ID } from '../core.js';
export const DOMINION_KEY='warden-elemental-dominion';
export function elementalDominionData(folder){const data={
  "name": "Elemental Dominion",
  "type": "feature",
  "img": "icons/magic/nature/meteorite-purple.webp",
  "system": {
    "description": "<p>You further embody your element. While Channeling, you gain the following benefit:</p><ul><li><p><strong>Fire</strong>: You gain a +1 bonus to your Proficiency for attacks and spells that deal damage.</p></li><li><p><strong>Earth</strong>: When you would mark Hit Points, roll a d6 per Hit Point marked. For each result of 6, reduce the number of Hit Points you mark by 1.</p></li><li><p><strong>Water</strong>: When an attack against you succeeds, you can mark a Stress to make the attacker temporarily Vulnerable.</p></li><li><p><strong>Air</strong>: You gain a +1 bonus to your Evasion and can fly</p></li></ul>",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:DOMINION_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.EFUJHrkTuyv8uA9l']}}};return data;}
export async function ensureElementalDominion() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === DOMINION_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warden of the Elements');
  if (!folder) throw new Error('The Warden of the Elements compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(elementalDominionData(folder.id)) : await Item.create(elementalDominionData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('ElementalDominion creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
