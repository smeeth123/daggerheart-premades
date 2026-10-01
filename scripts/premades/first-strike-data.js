import {premadeDocuments,configurePremadePack} from '../premade-setup-context.js';
import { ID } from '../core.js';
export const FIRST_KEY='executioners-first-strike',FIRST_ACTION='lX5FtnuXaKOdRlLF';
export function firstData(folder){const data={
  "type": "feature",
  "name": "First Strike",
  "img": "icons/weapons/daggers/dagger-crooked-ice-blue.webp",
  "system": {
    "attribution": {
      "source": "Daggerheart SRD",
      "page": null
    },
    "description": "<p>The first time in a scene you succeed on an attack, you deal double damage.</p>",
    "gmNotes": "",
    resource: null,
    actions: { [FIRST_ACTION]: {
      _id: FIRST_ACTION, type: 'effect', systemPath: 'actions', baseAction: false,
      name: 'First Strike', description: '', chatDisplay: true,
      originItem: { type: 'itemCollection' }, actionType: 'action',
      triggers: [], areas: [], effects: [], cost: [],
      uses: { value: 0, max: '1', recovery: 'scene', consumeOnSuccess: false },
      target: { type: 'self', amount: 1 }, range: ''
    } },
    "featureForm": "passive",
    "granter": null
  },
  "effects": []
};
data.folder=folder;data.flags={[ID]:{premade:{key:FIRST_KEY,version:'1.1.0',actionResourceTarget:FIRST_ACTION,category:'subclass-features',aliases:[],sourceUuids:['Compendium.daggerheart.subclasses.Item.CapfuUdLhzqer78i']}}};return data;}
export async function ensureFirstStrike() {
  const pack = game.packs.get(`${ID}.subclass-features`);
  if (!pack) throw new Error('The Class Features compendium is missing.');
  const existing = (await premadeDocuments(pack)).find(item => item.getFlag(ID,'premade')?.key === FIRST_KEY);
  if (existing?.getFlag(ID,'premade')?.version === '1.1.0') return existing;
  const folder = pack.folders.find(f => !f.folder && f.name === 'Executioners Guild');
  if (!folder) throw new Error('The Executioners Guild compendium folder is missing.');
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{ locked: false });
    const item = existing ? await existing.update(firstData(folder.id)) : await Item.create(firstData(folder.id), { pack: pack.collection });
    if (!item) throw new Error('First Strike creation was cancelled.');
    return item;
  } finally { if (locked) await configurePremadePack(pack,{ locked: true }); }
}
