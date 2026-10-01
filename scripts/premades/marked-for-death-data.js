import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { modernDamageEffects } from '../effect-compat.js';
import { ID } from '../core.js';
export const MARK_KEY='assassin-marked-for-death';
export const MARK_ACTION='oMIvhtdhs9xi7juE';
export const MARK_EFFECT='JLvo5LKRfs0mMHAj',MARK_BONUS='DUy0e3sEGIzSdBWA';
export function markData(folder){
const data={
  "name": "Marked for Death",
  "type": "feature",
  "img": "icons/magic/death/skull-trio-badge-purple.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>On a successful weapon attack, you can <strong>mark a Stress</strong> to make the target <em>Marked for Death</em>. When you deal damage to a target you've <em>Marked for Death</em>, add a number of <strong>d4s</strong> equal to your tier to the damage roll.</p><p>You can have only one adversary <em>Marked for Death</em> at a time. This condition lasts until you take a rest, the current adversary <em>Marked for Death</em> is defeated, or the GM spends a number of Fear equal to your tier to clear it.</p>",
    "gmNotes": "Prompts after a successful weapon attack to mark the target for 1 Stress before damage. Native bonus effect is preselected against your own marked target, including automatic damage. Replaces the prior mark.",
    "resource": null,
    "actions": {
      "oMIvhtdhs9xi7juE": {
        "type": "effect",
        "_id": "oMIvhtdhs9xi7juE",
        "systemPath": "actions",
        "baseAction": false,
        "description": "<p>On a successful weapon attack, you can <strong>mark a Stress</strong> to make the target <em>Marked for Death</em>. When you deal damage to a target you've <em>Marked for Death</em>, add a number of <strong>d4s</strong> equal to your tier to the damage roll.</p>",
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
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [
          {
            "_id": "JLvo5LKRfs0mMHAj",
            "onSave": false
          }
        ],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Mark Stress",
        "range": ""
      }
    },
    "featureForm": "passive",
    "granter": null
  },
  "effects": [
    {
      "name": "Marked For Death",
      "disabled": false,
      "img": "icons/magic/death/skull-trio-badge-purple.webp",
      "description": "<p>When you deal damage to a target you've <em>Marked for Death</em>, add a number of <strong>d4s</strong> equal to your tier to the damage roll.</p><p>You can have only one adversary <em>Marked for Death</em> at a time. This condition lasts until you take a rest, the current adversary <em>Marked for Death</em> is defeated, or the GM spends a number of Fear equal to your tier to clear it.</p>",
      "transfer": false,
      "statuses": [],
      "system": {
        "changes": [],
        "duration": {
          "description": "",
          "type": "shortRest"
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "JLvo5LKRfs0mMHAj",
      "type": "base",
      "start": {
        "time": 0,
        "combat": null,
        "combatant": null,
        "initiative": null,
        "round": null,
        "turn": null
      },
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "tint": "#ffffff",
      "showIcon": 1,
      "folder": null,
      "sort": 0,
      "flags": {}
    },
    {
      "name": "Marked For Death",
      "type": "base",
      "system": {
        "changes": [
          {
            "key": "system.bonuses.damage.physical.dice",
            "type": "add",
            "value": "(@system.tier)d4",
            "priority": null,
            "phase": "initial"
          },
          {
            "key": "system.bonuses.damage.magical.dice",
            "type": "add",
            "value": "(@system.tier)d4",
            "priority": null,
            "phase": "initial"
          }
        ],
        "duration": {
          "description": "",
          "type": ""
        },
        "rangeDependence": null,
        "stacking": null,
        "targetDispositions": []
      },
      "_id": "DUy0e3sEGIzSdBWA",
      "img": "icons/magic/death/skull-trio-badge-purple.webp",
      "disabled": true,
      "start": {
        "time": 0,
        "combat": null,
        "combatant": null,
        "initiative": null,
        "round": null,
        "turn": null
      },
      "duration": {
        "value": null,
        "units": "seconds",
        "expiry": null,
        "expired": false
      },
      "description": "<p>When you deal damage to a target you've <em>Marked for Death</em>, add a number of <strong>d4s</strong> equal to your tier to the damage roll.</p>",
      "tint": "#ffffff",
      "transfer": true,
      "statuses": [],
      "showIcon": 1,
      "folder": null,
      "sort": 0,
      "flags": {}
    }
  ]
};
modernDamageEffects(data);data.folder=folder;data.flags={[ID]:{premade:{key:MARK_KEY,version:'1.1.0',category:'class-features',aliases:[],sourceUuids:['Compendium.daggerheart.classes.Item.XxS0Li1P6SqIho7T']}}};return data;
}
export async function ensureMarkedForDeath() {
  const pack = game.packs.get(`${ID}.class-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === MARK_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.1.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Assassin');
  if (!folder) throw new Error('The Assassin compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(markData(folder.id)) : await Item.create(markData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('Marked for Death creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
