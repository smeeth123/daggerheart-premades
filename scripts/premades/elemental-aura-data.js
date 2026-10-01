import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const ELEMENTAL_AURA_KEY='warden-elemental-aura',ELEMENTAL_AURA_ACTION='activateAura0001';
export function elementalAuraData(folder){const data={
  "name": "Elemental Aura",
  "type": "feature",
  "img": "icons/magic/control/debuff-energy-hold-green.webp",
  "system": {
    "description": "<p>Once per rest while Channeling, you can assume an aura matching your element. The aura affects targets within Close range until your Channeling ends.</p><ul><li><p><strong>Fire</strong>: When an adversary marks 1 or more Hit Points, they must also mark a Stress.</p></li><li><p><strong>Earth</strong>: Your allies gain a +1 bonus to Strength.</p></li><li><p><strong>Water</strong>: When an adversary deals damage to you, you can mark a Stress to move them anywhere within Very Close range of where they are.</p></li><li><p><strong>Air</strong>: When you or an ally takes damage from an attack beyond Melee range, reduce the damage by 1d8.</p></li></ul>",
    "resource": null,
    "actions": {
      "activateAura0001": {
        "_id": "activateAura0001",
        "type": "effect",
        "systemPath": "actions",
        "name": "Activate Aura",
        "actionType": "action",
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "shortRest",
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "self",
          "amount": null
        },
        "range": "self",
        "chatDisplay": true
      }
    },
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
};
data.folder=folder;data.flags={[ID]:{premade:{key:ELEMENTAL_AURA_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.2JH9NaOh69yN80Gw']}}};return data;}
export async function ensureElementalAura() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === ELEMENTAL_AURA_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warden of the Elements');
  if (!folder) throw new Error('The Warden of the Elements compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(elementalAuraData(folder.id)) : await Item.create(elementalAuraData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('ElementalAura creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
