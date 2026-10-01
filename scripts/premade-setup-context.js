import {ID} from './core.js';

let activeSetup;
const ownPack=pack=>pack?.collection?.startsWith(`${ID}.`);

// Cache only during our setup transaction. Native collection contents include
// documents created/updated/deleted by earlier seeds, unlike a frozen snapshot.
export async function premadeDocuments(pack){
  const setup=activeSetup;
  if(!setup||!ownPack(pack))return pack.getDocuments();
  if(!setup.documents.has(pack))setup.documents.set(pack,Promise.resolve().then(()=>pack.getDocuments()));
  const documents=await setup.documents.get(pack);
  return Array.isArray(pack.contents)?pack.contents:documents;
}

// Keep the original lock until this transaction ends, rather than rewriting
// Foundry's world-wide compendium settings for every individual feature.
export async function configurePremadePack(pack,configuration){
  const setup=activeSetup;
  if(!setup||!ownPack(pack)||Object.keys(configuration).length!==1||typeof configuration.locked!=='boolean')
    return pack.configure(configuration);
  if(configuration.locked){
    if(!setup.locks.has(pack))return pack.configure(configuration);
    return;
  }
  if(setup.locks.has(pack)||!pack.locked)return;
  setup.locks.set(pack,pack.locked);
  return pack.configure(configuration);
}

export async function withPremadeSetup(task){
  if(activeSetup)return activeSetup.completion;
  const setup={documents:new Map(),locks:new Map()};
  activeSetup=setup;
  setup.completion=Promise.resolve().then(async()=>{
    let result,failure;
    const restorationErrors=[];
    try{result=await task();}catch(error){failure=error;}
    finally{
      for(const [pack,locked]of setup.locks){
        try{if(pack.locked!==locked)await pack.configure({locked});}
        catch(error){restorationErrors.push(new Error(`Could not restore ${pack.title??pack.collection} compendium lock: ${error.message}`));}
      }
      activeSetup=undefined;
    }
    if(restorationErrors.length)throw new AggregateError([...(failure?[failure]:[]),...restorationErrors],
      [...(failure?[failure.message]:[]),...restorationErrors.map(error=>error.message)].join('\n'));
    if(failure)throw failure;
    return result;
  });
  return setup.completion;
}
