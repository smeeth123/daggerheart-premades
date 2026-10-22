// Native actions cache bound field callbacks. Refresh only the selected entry,
// including workflows which were cached before module ready.
export function refreshActionField(Action,key,Field,eligible){
 if(!Action)return;
 const mark=Symbol(key),descriptor=Object.getOwnPropertyDescriptor(Action.prototype,'workflow');
 if(!descriptor?.get)throw Error('Native action workflow getter is unavailable.');
 Object.defineProperty(Action.prototype,'workflow',{...descriptor,get(){
  const workflow=descriptor.get.call(this),entry=workflow.get(key);
  if(entry&&eligible(this)&&!entry[mark])workflow.set(key,{...entry,[mark]:true,execute:(...args)=>Field.execute.call(this,...args)});
  return workflow;
 }});
}
