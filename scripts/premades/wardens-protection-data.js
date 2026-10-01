import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import {ID} from '../core.js';
export const PROTECTION_KEY='warden-protection',PROTECTION_ACTION='ozYzhQfRt5sp19di';
export function wardensProtectionData(folder){const data={
  "name": "Warden's Protection",
  "type": "feature",
  "img": "icons/magic/nature/barrier-shield-wood-vines.webp",
  "system": {
    "description": "<p>Once per long rest, spend 2 Hope to clear 2 Hit Points on 1d4 allies within Close range.</p>",
    "resource": null,
    "actions": {
      "ozYzhQfRt5sp19di": {
        "type": "effect",
        "_id": "ozYzhQfRt5sp19di",
        "systemPath": "actions",
        "description": "<p>Once per long rest, spend 2 Hope to clear 2 Hit Points on [[/r 1d4]] allies within Close range.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 2,
            "scalable": false,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "longRest",
          "consumeOnSuccess": false
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [],
        "name": "Protect Allies",
        "img": "icons/commodities/currency/coin-embossed-ruby-gold.webp",
        "range": "close",
        "areas": [],
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": []
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
};data.folder=folder;data.flags={[ID]:{premade:{key:PROTECTION_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.2F1bUFY80oce97C9']}}};return data;}
export async function ensureWardensProtection() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === PROTECTION_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Warden of Renewal');
  if (!folder) throw new Error('The Warden of Renewal compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(wardensProtectionData(folder.id)) : await Item.create(wardensProtectionData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('WardensProtection creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
