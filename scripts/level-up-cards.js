import {ID} from './core.js';
import {untimedDialog} from './dialog.js';
import {domainCards,cardDescription} from './rest-loadout.js';

const QUERY=`${ID}.levelUpCards`,WRAPPED=Symbol.for(`${ID}.levelUpCards`);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentLevel=actor=>Number(actor?.system?.levelData?.level?.current);
const targetLevel=actor=>Number(actor?.system?.levelData?.level?.changed);
const cardById=(actor,id)=>domainCards(actor).find(card=>card.id===id);
const clone=value=>foundry.utils.deepClone(value);
const revision=card=>JSON.stringify({...card.toObject(),_stats:undefined});
export function loadoutLimit(actor){
  return Math.max(0,Number(game.system.settings.homebrew.maxLoadout??5)+Number(actor.system.bonuses?.maxLoadout??0));
}
export function hasLoadoutSpace(actor,card){
  return Boolean(card.system.loadoutIgnore)||domainCards(actor).filter(item=>!item.system.inVault).length<loadoutLimit(actor);
}
function details(card){return{id:card.id,name:card.name,img:card.img,level:Number(card.system.level),inVault:Boolean(card.system.inVault),description:cardDescription(card)};}
function acquiredIds(actor,start,end){
  const uuids=new Set();
  for(const [key,level] of Object.entries(actor.system.levelData.levelups??{})){
    if(Number(key)<=start||Number(key)>end)continue;
    for(const card of Object.values(level.achievements?.domainCards??{}))if(card.itemUuid)uuids.add(card.itemUuid);
    for(const card of Object.values(level.selections??{}))if(card.type==='domainCard'&&card.itemUuid)uuids.add(card.itemUuid);
  }
  return domainCards(actor).filter(card=>uuids.has(card.uuid)).map(card=>card.id);
}
export function eligibleReplacement(actor,outgoing,candidate){
  if(candidate?.type!=='domainCard'||!candidate.pack||candidate.pack.startsWith(`${ID}.`))return false;
  const level=Number(candidate.system.level);
  if(!Number.isInteger(level)||level<1||level>Number(outgoing.system.level)||!actor.system.domains.includes(candidate.system.domain))return false;
  const source=candidate.uuid;
  return !domainCards(actor).some(card=>card.name===candidate.name||card._stats?.compendiumSource===source||card.flags?.core?.sourceId===source);
}

// Use native refresh batch construction for embedded effects, but replace the
// card's complete rules and automation flags. Retaining its ID keeps native
// advancement/delevel references valid and never briefly exceeds the loadout.
export async function replacementBatch(card,source){
  const batch=await card.refreshFromCompendium({save:false,latest:source});
  const data=source.toObject(),operation=batch[0];
  operation.recursive=false;operation.diff=false;
  operation.updates=[{_id:card.id,name:data.name,img:data.img,
    system:{...clone(data.system),inVault:Boolean(card.system.inVault)},flags:clone(data.flags??{}),
    _stats:{...clone(card._stats??{}),compendiumSource:source.uuid}}];
  for(const effectOperation of batch){
    if(effectOperation.documentName==='ActiveEffect'&&effectOperation.action==='update'){
      // Refresh normally preserves disabled state. An exchange is a different
      // card, so even coincident effect IDs must use the new card's defaults.
      effectOperation.updates=effectOperation.updates.map(update=>clone(data.effects.find(effect=>effect._id===update._id)));
    }
  }
  return batch;
}
function sourceFromSnapshot(data,uuid){return{type:'domainCard',uuid,toObject:()=>clone(data),effects:new Map((data.effects??[]).map(effect=>[effect._id,effect]))};}

// Sessions are GM-issued and tied to one owner and one actual native level
// advancement. Inventory management never grants free recall outside this flow.
export function createLevelUpCardHandler(){
  const sessions=new Map(),locks=new Map();
  async function locked(key,fn){const previous=locks.get(key)??Promise.resolve();const job=previous.catch(()=>{}).then(fn);locks.set(key,job);try{return await job;}finally{if(locks.get(key)===job)locks.delete(key);}}
  return async function handle(request,{user}){
    if(!game.user.isActiveGM||!user?.active||!request?.actorUuid)return false;
    const actor=await fromUuid(request.actorUuid);
    if(actor?.type!=='character'||actor.pack||!actor.testUserPermission(user,'OWNER'))return false;
    return locked(actor.uuid,async()=>{
      if(!user.active||!actor.testUserPermission(user,'OWNER'))return false;
      if(request.action==='begin'){
        const start=currentLevel(actor),end=targetLevel(actor);
        // A disconnected finalizer must not block a later, different level-up.
        for(const [token,old] of sessions)if(old.actorUuid===actor.uuid&&old.end!==end)sessions.delete(token);
        if(!Number.isInteger(start)||!Number.isInteger(end)||end<=start||sessions.size>=64||[...sessions.values()].some(s=>s.actorUuid===actor.uuid))return false;
        const token=foundry.utils.randomID();
        sessions.set(token,{actorUuid:actor.uuid,userId:user.id,start,end,oldIds:new Set(domainCards(actor).map(card=>card.id)),processed:new Set(),ready:false,exchanged:false});
        return{token};
      }
      const session=sessions.get(request.token);
      if(!session||session.userId!==user.id||session.actorUuid!==actor.uuid)return false;
      if(request.action==='close'){sessions.delete(request.token);return true;}
      if(currentLevel(actor)!==session.end||targetLevel(actor)!==session.end)return false;
      if(request.action==='complete'){
        if(session.ready)return false;
        session.newIds=acquiredIds(actor,session.start,session.end).filter(id=>!session.oldIds.has(id));
        session.ready=true;
        return{oldCards:domainCards(actor).filter(card=>session.oldIds.has(card.id)).map(details),newCards:session.newIds.map(id=>details(cardById(actor,id)))};
      }
      if(!session.ready)return false;
      if(request.action==='place'){
        if(!session.newIds.includes(request.cardId)||session.processed.has(request.cardId))return false;
        const card=cardById(actor,request.cardId);if(!card||!card.system.inVault)return false;
        let old;
        if(!hasLoadoutSpace(actor,card)){
          old=cardById(actor,request.vaultId);
          if(!old||!session.oldIds.has(old.id)||old.system.inVault)return false;
        }else if(request.vaultId)return false;
        session.processed.add(card.id);
        const updates=[...(old?[{_id:old.id,'system.inVault':true}]:[]),{_id:card.id,'system.inVault':false}];
        try{
          await actor.updateEmbeddedDocuments('Item',updates);
          if(cardById(actor,card.id)?.system.inVault!==false||old&&cardById(actor,old.id)?.system.inVault!==true)throw Error('The loadout change was not saved.');
        }catch(error){throw Error(`Level up is saved, but the loadout change needs manual review: ${error.message}`);}
        return true;
      }
      if(request.action==='exchange'){
        if(session.exchanged||!session.oldIds.has(request.cardId))return false;
        const card=cardById(actor,request.cardId),source=await fromUuid(request.sourceUuid);
        if(!card||!eligibleReplacement(actor,card,source))return false;
        const pack=game.packs.get(source.pack);
        if(!pack||pack.testUserPermission&&!pack.testUserPermission(user,'OBSERVER'))return false;
        const settings=game.settings.get(CONFIG.DH.id,CONFIG.DH.SETTINGS.gameSettings.CompendiumBrowserSettings);
        if(settings.isEntryExcluded(source)||revision(card)!==request.revision)return false;
        const original=card.toObject(),originalUuid=card._stats?.compendiumSource??card.uuid;
        const batch=await replacementBatch(card,source);
        // No await between the final ownership/state check and reservation.
        if(!user.active||!actor.testUserPermission(user,'OWNER')||currentLevel(actor)!==session.end||targetLevel(actor)!==session.end||cardById(actor,card.id)!==card||revision(card)!==request.revision||!eligibleReplacement(actor,card,source)||settings.isEntryExcluded(source)||pack.testUserPermission&&!pack.testUserPermission(user,'OBSERVER'))return false;
        session.exchanged=true;
        const registry=game.system.registeredTriggers;
        registry?.unregisterItemTriggers([card]);
        try{
          await foundry.documents.modifyBatch(batch);
          const updated=cardById(actor,card.id);
          const expectedEffects=source.toObject().effects.map(effect=>effect._id).sort(),actualEffects=[...(updated?.effects??[])].map(effect=>effect.id).sort();
          if(updated?.name!==source.name||Boolean(updated.system.inVault)!==Boolean(original.system.inVault)||updated._stats?.compendiumSource!==source.uuid||JSON.stringify(actualEffects)!==JSON.stringify(expectedEffects))throw Error('The replacement card was not saved.');
        }catch(error){
          // Restore through native documents, never raw source/world writes.
          try{const updated=cardById(actor,card.id);if(!updated)throw Error('Original card is missing.');
            const rollback=await replacementBatch(updated,sourceFromSnapshot(original,originalUuid));
            rollback[0].updates[0]={_id:card.id,name:original.name,img:original.img,system:clone(original.system),flags:clone(original.flags??{}),_stats:clone(original._stats??{})};
            await foundry.documents.modifyBatch(rollback);
          }catch(restore){throw Error(`Exchange failed and needs manual card review: ${error.message}; ${restore.message}`);}
          throw Error(`The exchange was not saved; your original card was restored: ${error.message}`);
        }finally{const current=cardById(actor,card.id);if(current)registry?.registerItemTriggers(current);}
        // A replacement is acquired without a createItem hook. Preserve the
        // existing optional Auto-Medkit behavior without changing its defaults.
        Hooks.callAll(`${ID}.exchangedDomainCard`,cardById(actor,card.id));
        return true;
      }
      return false;
    });
  };
}
const handler=createLevelUpCardHandler();
async function dispatch(actor,action,fields={}){
  const gm=game.users.activeGM;if(!gm)throw Error('Level-up card choices need an active GM.');
  const request={actorUuid:actor.uuid,action,...fields};
  return gm.isSelf?handler(request,{user:game.user}):gm.query(QUERY,request,{timeout:65000});
}
function cardRow(card,field){return`<label class="dhp-loadout-card" data-tooltip="${esc(card.description??cardDescription(card))}" data-tooltip-direction="UP"><input type="radio" name="${field}" value="${esc(card.id)}"><img src="${esc(card.img)}" alt=""><span>${esc(card.name)} — Level ${card.level??card.system.level} (${card.inVault??card.system?.inVault?'Vault':'Loadout'})</span></label>`;}
async function pickCard(title,content,cards,field,label){
  const result=await untimedDialog(title,`${content}<div class="dhp-loadout-list">${cards.map(card=>cardRow(card,field)).join('')}</div>`,[
    {action:'choose',label,callback:(_event,_button,dialog)=>dialog.element.querySelector(`[name="${field}"]:checked`)?.value??false},
    {action:'cancel',label:'Skip',default:true,callback:()=>false}
  ]);return typeof result==='string'&&cards.some(card=>card.id===result)?result:false;
}

export async function pickReplacement(actor,outgoing,Browser=game.system.api.applications.ui.ItemBrowser){
  // A separate native browser keeps ordinary sheet/creation browsing untouched.
  return new Promise((resolve,reject)=>{
    let finished=false;
    class ExchangeBrowser extends Browser{
      async _onRender(context,options){await super._onRender(context,options);const root=this.element.querySelector('.compendium-results');
        if(root&&!root.querySelector('.dhp-exchange-hint')){const hint=document.createElement('p');hint.className='dhp-exchange-hint';hint.textContent=`Choose a replacement for ${outgoing.name} (level ${outgoing.system.level} or lower). Expand a card to read its description, then click Exchange.`;root.prepend(hint);}}
      decorate(){
        for(const row of this.element.querySelectorAll('.item-container')){
          const card=this.items.find(item=>item.uuid===row.dataset.itemUuid),eligible=eligibleReplacement(actor,outgoing,card);
          if(!eligible){row.hidden=true;continue;}
          if(row.querySelector('.dhp-exchange-select'))continue;
          const button=document.createElement('button');button.type='button';button.className='dhp-exchange-select';button.textContent='Exchange';
          button.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();if(finished||!eligibleReplacement(actor,outgoing,card))return;
            finished=true;resolve(card.uuid);await this.close();});
          row.querySelector('.item-header')?.append(button);
        }
      }
      async _onInputFilterBrowser(...args){await super._onInputFilterBrowser(...args);this.decorate();}
      _onSearchFilterBrowser(...args){const result=super._onSearchFilterBrowser(...args);this.decorate();return result;}
      async close(...args){try{return await super.close(...args);}finally{if(!finished){finished=true;resolve(false);}}}
    }
    const browser=new ExchangeBrowser({id:`dhp-exchange-${foundry.utils.randomID()}`,window:{title:'Exchange Domain Card'}});
    browser.presets={folder:'domains',render:{noFolder:true},filter:{'level.max':{key:'level.max',value:Number(outgoing.system.level)},'system.domain':{key:'system.domain',value:[...actor.system.domains]}}};
    Promise.resolve(Browser.selectFolder.call(browser)).catch(async error=>{finished=true;reject(error);await browser.close();});
  });
}

export async function finishLevelUpCards(actor,session,send=dispatch,{choose=pickCard,browse=pickReplacement}={}){
  const state=await send(actor,'complete',{token:session.token});if(!state)throw Error('The completed level-up could not be verified.');
  for(const added of state.newCards){
    const card=cardById(actor,added.id);if(!card?.system.inVault)continue;
    let vaultId;
    if(!hasLoadoutSpace(actor,card)){
      const choices=domainCards(actor).filter(item=>state.oldCards.some(old=>old.id===item.id)&&!item.system.inVault);
      if(!choices.length)continue;
      vaultId=await choose(`Make Room — ${card.name}`,`<p>Your loadout is full. Move one previously acquired card to your vault to activate <strong>${esc(card.name)}</strong>, or skip to keep the new card in your vault. No Stress is spent.</p>`,choices,'dhpVaultCard','Move to Vault');
      if(!vaultId)continue;
    }
    if(!await send(actor,'place',{token:session.token,cardId:card.id,...(vaultId?{vaultId}:{})}))throw Error('The selected loadout change could not be saved.');
  }
  const older=domainCards(actor).filter(card=>state.oldCards.some(old=>old.id===card.id));if(!older.length)return;
  const yes=await untimedDialog(`Exchange Domain Card — ${actor.name}`,'<p>Would you like to exchange one previously acquired domain card for a different card of the same level or lower? The replacement stays in the same Loadout or Vault location. No Stress is spent.</p>',[
    {action:'yes',label:'Yes — Exchange a Card',callback:()=>true},
    {action:'no',label:'Keep My Cards',default:true,callback:()=>false}
  ]);if(yes!==true)return;
  const id=await choose('Choose Card to Exchange','<p>Choose one previously acquired card. Cards gained during this level-up cannot be exchanged.</p>',older,'dhpExchangeCard','Choose Replacement');
  const outgoing=cardById(actor,id);if(!outgoing)return;
  const expected=revision(outgoing),sourceUuid=await browse(actor,outgoing);if(!sourceUuid)return;
  if(!await send(actor,'exchange',{token:session.token,cardId:id,sourceUuid,revision:expected}))throw Error('The exchange was not saved. The selection may have changed; no card was exchanged.');
}

export function installLevelUpCards(Actor,{send=dispatch,finish=finishLevelUpCards}={}){
  if(Actor[WRAPPED])return;
  const native=Actor.prototype.levelUp,pending=new WeakSet();
  Actor.prototype.levelUp=async function(...args){
    if(this.type!=='character'||targetLevel(this)<=currentLevel(this))return native.apply(this,args);
    if(pending.has(this))return;
    pending.add(this);let session,result;
    try{
      try{session=await send(this,'begin');}catch(error){ui.notifications.warn(error.message);}
      if(session===false){ui.notifications.warn('Level-up card choices are already in progress or this level-up is no longer available.');return;}
      result=await native.apply(this,args);
      if(session&&currentLevel(this)===targetLevel(this)){
        try{await finish(this,session,send);}catch(error){console.error(`${ID} | Level-up cards`,error);ui.notifications.error(`Level up is saved. ${error.message}`);}
      }
      return result;
    }finally{
      if(session)try{await send(this,'close',{token:session.token});}catch(error){console.error(`${ID} | Level-up card session cleanup`,error);}
      pending.delete(this);
    }
  };
  Object.defineProperty(Actor,WRAPPED,{value:true});
}
export function registerLevelUpCards(){CONFIG.queries[QUERY]=handler;installLevelUpCards(CONFIG.Actor.documentClass);}
