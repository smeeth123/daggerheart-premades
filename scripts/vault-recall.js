import {ID} from './core.js';

const WRAPPED=Symbol.for(`${ID}.vaultRecall`),paying=new WeakSet();
let optionProvider=null;
const extraProviders=new Map();
const vaultValue=change=>change?.['system.inVault']??change?.system?.inVault;
const safeEvent=event=>event??{shiftKey:false,altKey:false,ctrlKey:false,metaKey:false};

export function isVaultRecall(item,change){return Boolean(item?.type==='domainCard'&&item.system?.inVault&&vaultValue(change)===false);}
export function setVaultRecallOptionProvider(provider){optionProvider=provider;}
export function addVaultRecallOptionProvider(key,provider){extraProviders.set(key,provider);return()=>extraProviders.delete(key);}
export async function payRecallCost(item,event,cost=Number(item.system.recallCost)){
  if(cost<=0)return Boolean(await item.system.toggleVault(false));
  const cls=game.system.api.models.actions.actionsTypes.effect;
  const action=new cls({...cls.getSourceConfig(item.system),type:'effect',name:'Recall from Vault',chatDisplay:false,cost:[{key:'stress',value:cost}]},{parent:item.system});
  const config=await action.use(safeEvent(event));
  return config?Boolean(await item.system.toggleVault(false)):false;
}
export async function recallFromVault(item,event,pay=payRecallCost){
  const actor=item?.actor,cost=Math.max(0,Number(item?.system?.recallCost)||0);
  if(!actor||!item.isOwner)return false;
  if(!actor.system?.loadoutSlot?.available&&!item.system.loadoutIgnore){ui.notifications.warn('DAGGERHEART.UI.Notifications.loadoutMaxReached',{localize:true});return false;}
  if(cost===0)return true;
  paying.add(item);
  let option;
  try{
    for(const provider of [...extraProviders.values(),optionProvider].filter(Boolean)){
      const choice=await provider(item,safeEvent(event),cost);
      if(choice?.settle||Number(choice?.cost??cost)<cost){option=choice;break;}
    }
    const result=Boolean(await pay(item,safeEvent(event),Math.max(0,Number(option?.cost??cost))));
    await option?.settle?.(result);
    return result;
  }catch(error){await option?.settle?.(false);throw error;}
  finally{paying.delete(item);}
}
export function installVaultRecall(Item,DomainCard,pay=payRecallCost){
  if(Item[WRAPPED])return;
  const nativeUpdate=Item.prototype.update;
  Item.prototype.update=async function(change,options,...args){
    if(!isVaultRecall(this,change)||paying.has(this))return nativeUpdate.call(this,change,options,...args);
    const recalled=await recallFromVault(this,options?.[ID]?.event,pay);
    if(Number(this.system.recallCost)>0)return recalled?this:undefined;
    return recalled?nativeUpdate.call(this,change,options,...args):undefined;
  };
  // Both native context-menu choices now enter through the universal Item update guard.
  const nativeToggle=DomainCard.prototype.toggleVault;
  DomainCard.prototype.toggleVault=function(event,toVault,_isRecall){return nativeToggle.call(this,event,toVault,false);};
  Object.defineProperty(Item,WRAPPED,{value:true});
}
export function registerVaultRecall(){installVaultRecall(CONFIG.Item.documentClass,game.system.api.models.items.DHDomainCard);}
