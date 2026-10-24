// 2.11 carries the originating action into target-side conditional defenses.
export function damageOptions(value){
 if(typeof value==='boolean')return {isDirect:value,actionUuid:null};
 return {isDirect:value?.isDirect===true,actionUuid:typeof value?.actionUuid==='string'?value.actionUuid:null};
}
export function damageCallOptions(value){
 const options=damageOptions(value);
 return nativeDamageOptions()?options:options.isDirect;
}
export function nativeDamageOptions(){const [major,minor]=String(globalThis.game?.system?.version??'').split('.').map(Number);return major>2||major===2&&minor>=11;}
export function installDamageOptions(Actor){
 const key=Symbol.for('daggerheart-premades.damageOptions');if(!Actor||Actor[key])return;
 const take=Actor.prototype.takeDamage;
 Actor.prototype.takeDamage=function(packet,options,...args){return take.call(this,packet,damageCallOptions(options),...args);};
 Object.defineProperty(Actor,key,{value:true});
}
