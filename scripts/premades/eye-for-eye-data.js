import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const EYE_KEY='juggernaut-eye-for-eye',EYE_ACTION='ka7wdfcKZgPaK80a';
export function eyeData(folder){const data={
  "type": "feature",
  "name": "Eye for an Eye",
  "img": "icons/skills/melee/shield-block-bash-yellow.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>Once per rest when an adversary within Melee range forces you to mark any number of Hit Points, you can <strong>mark a Stress</strong> to force them to mark the same number of Hit Points.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {
      "ka7wdfcKZgPaK80a": {
        "type": "effect",
        "_id": "ka7wdfcKZgPaK80a",
        "systemPath": "actions",
        "baseAction": false,
        "description": "",
        "chatDisplay": true,
        "originItem": {
          "type": "itemCollection"
        },
        "actionType": "action",
        "triggers": [],
        "areas": [],
        "cost": [
          {
            "scalable": false,
            "key": "stress",
            "value": 1,
            "itemId": null,
            "step": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": 0,
          "max": "1",
          "recovery": "shortRest",
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": 1
        },
        "name": "Mark Stress",
        "range": "melee"
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:EYE_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.mHuqYsV0a2MYnLej']}}};return data;}
export async function ensureEyeForEye() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === EYE_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Juggernaut');
  if (!folder) throw new Error('The Juggernaut compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(eyeData(folder.id)) : await Item.create(eyeData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Eye for an Eye creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
