import {premadeDocuments,configurePremadePack} from './premade-setup-context.js';
import { ID, normalize } from './core.js';
import { FOLDER_CATALOG } from './folder-catalog.js';

const PREMADE_ANCESTRIES = new Set(['Aetheris','Dwarf','Elf','Faerie','Faun','Firbolg','Galapa','Gnome','Goblin','Halfling','Human','Infernis','Katari','Orc','Skykin']);

const PREMADE_COMMUNITIES = new Set(['Freeborne','Frostborne','Seaborne','Warborne']);

export function missingFolders(names, existing) {
  const present = new Set(existing.filter(folder => !folder.folder).map(folder => normalize(folder.name)));
  return names.filter(name => !present.has(normalize(name))).map(name => ({
    name, type: 'Item', folder: null, sorting: 'a',
    flags: { [ID]: { catalogFolder: true } }
  }));
}

export async function ensureFolders() {
  if (!game.user.isGM) throw new Error('Only the GM can set up premade folders.');
  let created = 0;
  const errors = [];
  for (const [category, names] of Object.entries(FOLDER_CATALOG)) {
    const pack = game.packs.get(`${ID}.${category}`);
    if (!pack) { errors.push(`Missing compendium: ${category}`); continue; }
    const wanted = category === 'ancestry-features' ? names.filter(name => PREMADE_ANCESTRIES.has(name)) : category === 'community-features' ? names.filter(name => PREMADE_COMMUNITIES.has(name)) : names;
    const missing = missingFolders(wanted, Array.from(pack.folders.values()));
    if (!missing.length) continue;
    const locked = pack.locked;
    try {
      if (locked) await configurePremadePack(pack,{ locked: false });
      const folders = await foundry.documents.Folder.implementation.createDocuments(missing, { pack: pack.collection });
      created += folders.length;
      if (folders.length !== missing.length) errors.push(`${pack.title}: some folder creations were cancelled.`);
    } catch (error) {
      errors.push(`${pack.title ?? category}: ${error.message}`);
    } finally {
      if (locked) {
        try { await configurePremadePack(pack,{ locked: true }); }
        catch (error) { errors.push(`${pack.title ?? category}: could not restore compendium lock: ${error.message}`); }
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return created;
}

export async function removeEmptyAncestryFolders() { return removeEmptyCatalogFolders('ancestry-features'); }
export async function removeEmptyCommunityFolders() { return removeEmptyCatalogFolders('community-features'); }
export async function removeObsoleteWitchSubclassFolder() {
  if (!game.user.isActiveGM) return;
  const pack=game.packs.get(`${ID}.subclass-features`);
  if(!pack)return;
  const documents=await premadeDocuments(pack),folders=[...pack.folders.values()],folderId=value=>typeof value==='string'?value:value?.id;
  const obsolete=folders.find(folder=>!folder.folder&&normalize(folder.name)==='witch'&&folder.flags?.[ID]?.catalogFolder===true&&
    !documents.some(item=>folderId(item.folder)===folder.id)&&!folders.some(child=>folderId(child.folder)===folder.id));
  if(!obsolete)return;
  const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});await foundry.documents.Folder.implementation.deleteDocuments([obsolete.id],{pack:pack.collection,deleteContents:false,deleteSubfolders:false});}
  finally{if(locked)await configurePremadePack(pack,{locked:true});}
}
export async function removeObsoleteWarriorSubclassFolder() {
  if (!game.user.isActiveGM) return;
  const pack=game.packs.get(`${ID}.subclass-features`);if(!pack)return;
  const documents=await premadeDocuments(pack),folders=[...pack.folders.values()],folderId=value=>typeof value==='string'?value:value?.id;
  const obsolete=folders.find(folder=>!folder.folder&&normalize(folder.name)==='warrior'&&folder.flags?.[ID]?.catalogFolder===true&&
    !documents.some(item=>folderId(item.folder)===folder.id)&&!folders.some(child=>folderId(child.folder)===folder.id));
  if(!obsolete)return;const locked=pack.locked;
  try{if(locked)await configurePremadePack(pack,{locked:false});await foundry.documents.Folder.implementation.deleteDocuments([obsolete.id],{pack:pack.collection,deleteContents:false,deleteSubfolders:false});}
  finally{if(locked)await configurePremadePack(pack,{locked:true});}
}

async function removeEmptyCatalogFolders(category) {
  if (!game.user.isActiveGM) return;
  const pack = game.packs.get(`${ID}.${category}`);
  if (!pack) return;
  const documents = await premadeDocuments(pack);
  const folders = [...pack.folders.values()];
  const folderId = value => typeof value === 'string' ? value : value?.id;
  const catalog = new Set(FOLDER_CATALOG[category].map(normalize));
  const empty = folders.filter(folder => !folder.folder && catalog.has(normalize(folder.name)) &&
    !documents.some(item => folderId(item.folder) === folder.id) &&
    !folders.some(child => folderId(child.folder) === folder.id));
  if (!empty.length) return;
  const locked = pack.locked;
  try {
    if (locked) await configurePremadePack(pack,{locked:false});
    await foundry.documents.Folder.implementation.deleteDocuments(empty.map(folder=>folder.id), {
      pack:pack.collection, deleteContents:false, deleteSubfolders:false
    });
  } finally { if (locked) await configurePremadePack(pack,{locked:true}); }
}
