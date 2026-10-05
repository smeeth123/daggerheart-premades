export const WEAPON_VOLLEYED_KEY='weapon-volleyed',VOLLEY_ACTION='dhpVolleyAttack1';
export function createVolleyAction(weapon){
 const attack=weapon.system?.attack;
 if(attack?.type!=='attack'||!attack._id||!attack.damage?.main)throw Error('Volleyed needs a native weapon attack with damage.');
 const existing=weapon.system.actions?.[VOLLEY_ACTION];
 if(existing&&weapon.flags?.['daggerheart-premades']?.applied?.key!==WEAPON_VOLLEYED_KEY)throw Error('The Volley action ID is already used by a custom action.');
 const action=JSON.parse(JSON.stringify(attack));
 Object.assign(action,{_id:VOLLEY_ACTION,name:'Volley (1 Hope)',baseAction:false,systemPath:'actions',chatDisplay:false,
  description:'Spend a Hope to target a group of creatures within range. Targets you succeed against take half damage.',
  target:{type:'any',amount:null},triggers:[]});
 action.cost=[...(action.cost??[]),{key:'hope',value:1,itemId:null,scalable:false,step:null,consumeOnSuccess:false}];
 return action;
}
