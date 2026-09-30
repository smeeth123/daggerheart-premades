import {ID} from '../core.js';
export const BATTLE_KEY='beastbound-battle-bonded';
export function battleBondedData(folder){const data={
  "name": "Battle-Bonded",
  "type": "feature",
  "img": "icons/creatures/mammals/humanoid-wolf-dog-blue.webp",
  "system": {
    "description": "<p>When an adversary attacks you while they're within your companion's Melee range, you gain a +2 bonus to your Evasion against the attack.</p>",
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
};data.folder=folder;data.flags={[ID]:{premade:{key:BATTLE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.hWsKyed1vfILg0I8']}}};return data;}
export async function ensureBattleBonded() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await pack.getDocuments()).find(item => item.getFlag(ID,'premade')?.key === BATTLE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Beastbound');
  if (!folder) throw new Error('The Beastbound compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await pack.configure({ locked: false });
    const item = existing ? await existing.update(battleBondedData(folder.id)) : await Item.create(battleBondedData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Battle-Bonded creation was cancelled.');
    return item;
  } finally { if (locked) await pack.configure({ locked: true }); }
}
