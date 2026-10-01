import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FLOW_KEY='martial-artist-flow-state';
export function flowData(folder){const data={
  "type": "feature",
  "name": "Flow State",
  "img": "icons/magic/life/cross-beam-green.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>You can <strong>mark a Stress</strong> instead of spending a Focus to shift into a different stance. Additionally, you can <strong>spend a Focus</strong> instead of marking a Stress to start a combo strike.</p>",
    "gmNotes": "",
    "resource": null,
    "actions": {},
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FLOW_KEY,version:'1.0.0',category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.iuqAzugTIf7Ipcmb']}}};return data;}
export async function ensureFlowState() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Subclass Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FLOW_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.0.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Martial Artist');
  if (!folder) throw new Error('The Martial Artist compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(flowData(folder.id)) : await Item.create(flowData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('FlowState creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
