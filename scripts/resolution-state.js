import { decisionBudget } from './settings.js';
import { decisionNow } from './decision-clock.js';
// State and permissions for one GM-coordinated roll. No Foundry dependencies.
export class ResolutionSession {
  constructor(id,executor,actorUuid){
    Object.assign(this,{id,executor,actorUuid,rows:new Map(),round:0,phase:'Pending',deadline:0,selection:null});
  }
  refresh(rows,now=decisionNow()){
    if(this.phase==='Resolving')throw new Error('A choice is still resolving.');
    this.round++;this.phase='Pending';this.selection=null;this.deadline=now+decisionBudget(60000);
    const present=new Set(rows.map(row=>row.id));
    for(const row of this.rows.values())if(!present.has(row.id)&&!['Used','Declined','Expired'].includes(row.status))row.status='No longer eligible';
    for(const row of rows){
      const prior=this.rows.get(row.id);
      this.rows.set(row.id,{...row,status:['Used','Declined','Expired'].includes(prior?.status)?prior.status:'Available'});
    }
  }
  choose(userId,rowId,action,round,now=decisionNow()){
    if(this.phase!=='Pending'||round!==this.round||now>=this.deadline)return false;
    const row=this.rows.get(rowId);
    if(!row||row.status!=='Available'||row.ownerId!==userId)return false;
    row.status=action==='decline'?'Declined':'Resolving';
    if(action!=='decline'){this.phase='Resolving';this.selection=rowId;}
    return true;
  }
  finish(status){
    const row=this.rows.get(this.selection);if(row)row.status=status;
    this.phase='Pending';this.selection=null;
  }
  close(expired=false){
    if(this.phase==='Resolving')return false;
    for(const row of this.rows.values())if(row.status==='Available')row.status=expired?'Expired':'Declined';
    this.phase='Complete';return true;
  }
  get available(){return [...this.rows.values()].some(row=>row.status==='Available');}
}
export function canSeeRoll(message,user){
  if(user.isGM)return true;
  if(!message)return false;
  if(message.blind)return false;
  return !message.whisper?.length||message.whisper.includes(user.id)||(message.author?.id??message.user?.id??message.user)===user.id;
}
