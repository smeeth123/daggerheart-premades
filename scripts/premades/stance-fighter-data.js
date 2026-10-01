import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const STANCE_KEY='martial-artist-stance-fighter',REFOCUS='refocusStance001';
export const FOCUS_DESCRIPTION='<h3>Focus</h3><p>Focus represents your character’s poise, clarity, and control. Once per rest during a moment of calm, you can clear your mind and refocus your martial instincts. Clear your Focus track, then roll a number of <strong>d6s</strong> equal to your <strong>Instinct</strong> and gain Focus equal to the highest result rolled. You can hold a maximum of 6 Focus.</p>';
export function stanceData(folder){const data={
  "type": "feature",
  "name": "Stance Fighter",
  "img": "icons/magic/holy/yin-yang-balance-symbol.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You can channel your inner resolve to shift into martial stances that grant you special benefits in combat.</p><p>Take the Martial Stances sheet and choose two martial stances from Tier 1. Each time you level up your character, choose an additional stance from your tier or lower.</p><hr><p><em>Currently the implementation for this is to simply grab the stances you want from the compendium <strong>Subclasses —&gt; Subclass Features —&gt; Martial Stances</strong></em></p>",
    "gmNotes": "",
    "resource": {
      "type": "simple",
      "value": 0,
      "max": "6",
      "progression": "decreasing",
      "recovery": null,
      "icon": "fa-solid fa-yin-yang"
    },
    "actions": {
      "refocusStance001": {
        "_id": "refocusStance001",
        "systemPath": "actions",
        "type": "effect",
        "actionType": "action",
        "name": "Refocus",
        "img": "icons/magic/holy/yin-yang-balance-symbol.webp",
        "description": "Once per rest during a moment of calm, clear Focus and roll Instinct d6s. Gain Focus equal to the highest die (maximum 6).",
        "chatDisplay": false,
        "cost": [],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "shortRest",
          "consumeOnSuccess": false
        },
        "target": {
          "type": "self",
          "amount": 1
        },
        "effects": [],
        "range": "self",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      }
    },
    "featureForm": "passive",
    "granter": null,
    "actorResources": [
      "focus"
    ]
  },
  "effects": []
};
data.system.description+=FOCUS_DESCRIPTION;
data.folder=folder;data.flags={[ID]:{premade:{key:STANCE_KEY,version:'1.1.0',descriptionAppend:FOCUS_DESCRIPTION,category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.EVEP9G6lNF8nR5f3']}}};return data;}
export async function ensureStanceFighter() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === STANCE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.1.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(stanceData(folder.id)) : await Item.create(stanceData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Stance Fighter creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
