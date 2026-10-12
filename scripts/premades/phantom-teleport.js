// Native v14 displacement, not a walking path or deprecated teleport update.
const present=token=>token?.documentName==='Token'&&token.parent?.tokens?.get?.(token.id)===token;
const linked=(token,actor)=>present(token)&&token.actorLink===true&&token.actor?.uuid===actor.uuid;
export function phantomDestination(point,scene,token){
 if(scene?.documentName!=='Scene'||scene.uuid!==point?.sceneUuid)return null;
 const size=Number(scene.grid?.size),width=Number(token?.width),height=Number(token?.height);
 const levels=[...scene.levels??[]],level=point.level??(levels.length===1?levels[0].id:null);
 if(!level||!scene.levels?.get?.(level)||![point.centerX,point.centerY,point.elevation,size,width,height].every(Number.isFinite)||size<=0||width<=0||height<=0)return null;
 // Native Token x/y are integer fields; avoid a paid validation failure when
 // a changed footprint yields fractional pixels.
 return {x:Math.round(point.centerX-width*size/2),y:Math.round(point.centerY-height*size/2),elevation:point.elevation,level};
}
export async function preparePhantomTeleport(actor,point,tokenUuid){
 const token=await fromUuid(tokenUuid),scene=await fromUuid(point?.sceneUuid);
 if(!present(token)||token.actor?.uuid!==actor.uuid)return null;
 const crossScene=token.parent!==scene;
 // Moving a synthetic actor to another scene changes its identity and can lose
 // paid actor state. Do not clone/delete that actor or charge for an unsafe move.
 if(crossScene&&!linked(token,actor))return null;
 let destinationToken=token;
 if(crossScene){destinationToken=await fromUuid(point.tokenUuid);if(destinationToken&&(!linked(destinationToken,actor)||destinationToken.parent!==scene))return null;}
 const destination=phantomDestination(point,scene,destinationToken??token);if(!destination)return null;
 return {actor,point,token,scene,crossScene,destinationToken,destination};
}
const landed=(token,p)=>token.x===p.x&&token.y===p.y&&token.elevation===p.elevation&&token._source?.level===p.level;
export async function teleportPhantom(plan){
 const {actor,point,token,scene,crossScene}=plan;
 const fresh=await preparePhantomTeleport(actor,point,token.uuid);
 if(!fresh||fresh.token!==token||fresh.scene!==scene||fresh.destinationToken!==plan.destinationToken)throw Error('The caster token or destination changed before teleportation.');
 let destinationToken=fresh.destinationToken;const destination=fresh.destination;
 if(!destinationToken){
  const data=token.toObject();delete data._id;delete data._stats;
  // Scene-local movement and region membership must not follow the token.
  delete data.movement;delete data.regions;
  Object.assign(data,destination);
  [destinationToken]=await scene.createEmbeddedDocuments('Token',[data]);
  if(!linked(destinationToken,actor)||!landed(destinationToken,destination))throw Error('Destination token creation was not confirmed; the original token was preserved.');
 }else{
  const completed=await destinationToken.move({...destination,action:'displace',snapped:false},{autoRotate:false,showRuler:false,constrainOptions:{ignoreWalls:true,ignoreCost:true},animate:false});
  if(completed!==true||!present(destinationToken)||!landed(destinationToken,destination))throw Error('Teleportation did not reach the saved return point.');
 }
 if(crossScene){
  if(!linked(token,actor)||!linked(destinationToken,actor))throw Error('Token identity changed during teleportation; check both scenes.');
  await token.parent.deleteEmbeddedDocuments('Token',[token.id],{replacements:{[token.id]:destinationToken.uuid}});
  if(token.parent.tokens.has(token.id))throw Error('The destination is ready, but original token removal was not confirmed; check both scenes.');
 }
 return {sceneUuid:scene.uuid,tokenId:destinationToken.id,level:destination.level};
}
