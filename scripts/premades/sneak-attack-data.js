import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { modernDamageEffects } from '../effect-compat.js';
import { ID } from '../core.js';
export const SNEAK_KEY='rogue-sneak-attack',SNEAK_EFFECT='380jFzw756qSy5ae';
export function sneakData(folder){const data={
  "name": "Sneak Attack",
  "type": "feature",
  "img": "icons/skills/melee/strike-dagger-skull-white.webp",
  "system": {
    "description": "<p>When you succeed on an attack while Cloaked or while an ally is within Melee range of your target, add a number of d6s equal to your tier to your damage roll.</p><ul><li><p>Level 1 -&gt; Tier 1</p></li><li><p>Levels 2–4 -&gt; Tier 2</p></li><li><p>Levels 5–7 -&gt; Tier 3</p></li><li><p>Levels 8–10 -&gt; Tier 4</p></li></ul>",
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
  "effects": [
    {
      "name": "Sneak Attack",
      "img": "icons/skills/melee/strike-dagger-skull-white.webp",
      "transfer": true,
      "_id": "380jFzw756qSy5ae",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.bonuses.damage.physical.dice",
            "type": "add",
            "value": "@tierd6",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.bonuses.damage.magical.dice",
            "type": "add",
            "value": "@tierd6",
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "disabled": true,
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>When you succeed on an attack while Cloaked or while an ally is within Melee range of your target, add a number of d6s equal to your tier to your damage roll.</p><ul><li><p>Level 1 -&gt; Tier 1</p></li><li><p>Levels 2–4 -&gt; Tier 2</p></li><li><p>Levels 5–7 -&gt; Tier 3</p></li><li><p>Levels 8–10 -&gt; Tier 4</p></li></ul>",
      "tint": "#ffffff",
      "statuses": [],
      "sort": 0,
      "flags": {},
      "_stats": {
        "compendiumSource": null,
        "coreVersion": "14.364",
        "systemId": "daggerheart",
        "systemVersion": "2.9.2"
      },
      "start": null,
      "showIcon": 1,
      "folder": null
    }
  ]
};
modernDamageEffects(data);data.folder=folder;data.flags={[ID]:{premade:{key:SNEAK_KEY,version:'1.1.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.5QqpEwmwkPfZHpMW']}}};return data;}
export async function ensureSneakAttack() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === SNEAK_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.1.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Rogue');
  if (!folder) throw new Error('The Rogue compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(sneakData(folder.id)) : await Item.create(sneakData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Sneak Attack creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
