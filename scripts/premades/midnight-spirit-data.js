import {ID} from '../core.js';
import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
export const MIDNIGHT_KEY='midnight-midnight-spirit',MIDNIGHT_SUMMON='BDKCP4FvntHkYqXp',MIDNIGHT_ATTACK='YVSMa2Igxp6DhNpG';
const nativeCard={
  "name": "Midnight Spirit",
  "img": "systems/daggerheart/assets/icons/domains/domain-card/midnight.png",
  "type": "domainCard",
  "system": {
    "description": "<p><strong>Spend a Hope</strong> to summon a humanoid-sized spirit that can move or carry things for you until your next rest.</p><p>You can also send it to attack an adversary. When you do, make a <strong>Spellcast Roll</strong> against a target within Very Far range. On a success, the spirit moves into Melee range with that target. Roll a number of <strong>d6s</strong> equal to your Spellcast trait and deal that much magic damage to the target. The spirit then dissipates. You can only have one spirit at a time.</p>",
    "domain": "midnight",
    "recallCost": 1,
    "level": 2,
    "type": "spell",
    "actions": {
      "BDKCP4FvntHkYqXp": {
        "type": "effect",
        "_id": "BDKCP4FvntHkYqXp",
        "systemPath": "actions",
        "description": "<p>Spend a <strong>Hope</strong> to summon a humanoid-sized spirit that can move or carry things for you until your next rest.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "itemId": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "effects": [],
        "target": {
          "type": "any",
          "amount": null
        },
        "name": "Summon Spirit",
        "img": "icons/creatures/magical/spirit-undead-ghost-blue.webp",
        "range": "",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      },
      "YVSMa2Igxp6DhNpG": {
        "type": "attack",
        "_id": "YVSMa2Igxp6DhNpG",
        "systemPath": "actions",
        "description": "<p>You can also send it to attack an adversary. When you do, make a <strong>Spellcast Roll</strong> against a target within Very Far range. On a success, the spirit moves into Melee range with that target. Roll a number of d6s equal to your Spellcast trait and deal that much magic damage to the target. The spirit then dissipates. You can only have one spirit at a time.</p>",
        "chatDisplay": true,
        "actionType": "action",
        "cost": [
          {
            "key": "hope",
            "value": 1,
            "scalable": false,
            "step": null,
            "itemId": null,
            "consumeOnSuccess": false
          }
        ],
        "uses": {
          "value": null,
          "max": "",
          "recovery": null,
          "consumeOnSuccess": false
        },
        "damage": {
          "main": {
            "resultBased": false,
            "value": {
              "custom": {
                "enabled": false,
                "formula": ""
              },
              "multiplier": "cast",
              "dice": "d6",
              "bonus": null,
              "flatMultiplier": 1
            },
            "applyTo": "hitPoints",
            "type": [
              "magical"
            ],
            "base": false,
            "valueAlt": null,
            "includeBase": false,
            "direct": false,
            "fullRestore": false,
            "itemId": null
          },
          "resources": {}
        },
        "target": {
          "type": "any",
          "amount": null
        },
        "effects": [],
        "roll": {
          "type": "spellcast",
          "trait": null,
          "difficulty": null,
          "bonus": null,
          "advState": "neutral",
          "diceRolling": {
            "multiplier": "prof",
            "flatMultiplier": 1,
            "dice": "d6",
            "compare": null,
            "treshold": null
          },
          "useDefault": false
        },
        "save": {
          "trait": null,
          "difficulty": null,
          "damageMod": "none"
        },
        "name": "Attack Adversary",
        "img": "icons/creatures/magical/spirit-undead-ghost-purple.webp",
        "range": "veryFar",
        "baseAction": false,
        "originItem": {
          "type": "itemCollection"
        },
        "triggers": [],
        "areas": []
      }
    },
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null,
      "artist": ""
    },
    "gmNotes": "",
    "resource": null,
    "inVault": false,
    "vaultActive": false,
    "loadoutIgnore": false,
    "domainTouched": null
  },
  "flags": {},
  "effects": []
};
export function midnightSpiritData(folder){
  const data=structuredClone(nativeCard);data.folder=folder;
  data.system.actions[MIDNIGHT_ATTACK].cost=[];
  data.system.gmNotes='The native Summon Spirit action costs 1 Hope and creates a friendly, player-controllable humanoid-sized spirit token beside the caster, backed by a temporary NPC with no copied caster stats. Attack Adversary costs no additional Hope; its native Spellcast roll, Very Far range and Spellcast-trait d6 magic damage remain unchanged. Move the token and handle carrying manually; use Attack Adversary on the caster card. The spirit and temporary NPC dissipate on the caster\'s completed rest, after a completed spirit attack (hit or miss), or when a replacement spirit is successfully summoned. A visible rest-duration marker tracks the summon. Canceled attacks/summons preserve existing spirits; pending attacks expire only the spirit captured before that roll, not a later replacement. No token or effect from another caster is removed.';
  data.flags={[ID]:{premade:{key:MIDNIGHT_KEY,version:'1.0.1',category:'domain-cards',aliases:[],sourceUuids:['Compendium.daggerheart.domains.Item.FXLsB3QbQvTtqX5B']}}};return data;
}
export async function ensureMidnightSpirit(){
  const pack=game.packs.get(`${ID}.domain-cards`);if(!pack)throw Error('The Domain Cards compendium is missing.');
  const existing=(await premadeDocuments(pack)).find(item=>item.getFlag(ID,'premade')?.key===MIDNIGHT_KEY);
  if(existing?.getFlag(ID,'premade')?.version==='1.0.1')return existing;
  const folder=pack.folders.find(entry=>!entry.folder&&entry.name==='Midnight');if(!folder)throw Error('The Midnight compendium folder is missing.');
  const locked=pack.locked;
  try{
    if(locked)await configurePremadePack(pack,{locked:false});
    const data=midnightSpiritData(folder.id),item=existing?await existing.update(data,{diff:false,recursive:false}):await Item.create(data,{pack:pack.collection});
    if(!item)throw Error('Midnight Spirit creation was cancelled.');return item;
  }finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
