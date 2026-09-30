const pending=new Map();
export async function withHopeLock(actorUuid,callback){
  const operation=(pending.get(actorUuid)??Promise.resolve()).catch(()=>{}).then(callback);
  pending.set(actorUuid,operation);
  try{return await operation;}finally{if(pending.get(actorUuid)===operation)pending.delete(actorUuid);}
}
