import {ID} from './core.js';
export const HELP_ACTION='helpAnAlly000001';
export function helpAllyData(){
 const img='icons/skills/social/diplomacy-handshake.webp';
 const description='<p>You can <strong>spend a Hope</strong> to Help an Ally who is making an action roll you could feasibly support. Describe how you are helping and roll a <strong>d6 advantage die</strong>.</p><p>Any number of PCs can help, each spending a Hope. If the ally also has advantage from another source, they roll their own advantage die. Add only the highest of all these advantage dice to the action roll.</p><p>Use this feature before the ally opens their roll dialog. Target another member of the active Party or choose one when using the action. Help automatically applies to their upcoming action and cannot be saved for later. Reaction and damage rolls do not use it.</p>';
 return {name:'Help an Ally',type:'feature',img,flags:{[ID]:{utility:'help-an-ally',utilityVersion:'1.0.1'}},effects:[],system:{description,granter:null,featureForm:'passive',resource:null,actions:{[HELP_ACTION]:{
  _id:HELP_ACTION,systemPath:'actions',type:'effect',actionType:'action',name:'Help an Ally',img,description:'Spend 1 Hope and roll a d6 for a party member’s upcoming action roll.',chatDisplay:false,
  cost:[{scalable:false,key:'hope',value:1,step:null,itemId:null,consumeOnSuccess:false}],uses:{value:null,max:'',recovery:null,consumeOnSuccess:false},target:{type:'friendly',amount:1},range:'',effects:[],areas:[],triggers:[],baseAction:false,originItem:{type:'itemCollection'}
 }}}};
}
export const helpFeature=actor=>actor?.items?.find(item=>item.flags?.[ID]?.utility==='help-an-ally'&&!item.system?.inactive&&!item.flags?.[ID]?.disabled);
