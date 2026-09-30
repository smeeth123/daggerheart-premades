import { decisionBudget } from './settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from './decision-clock.js';
export async function timedDialog(title, content, buttons, onRender, { pending = true } = {}) {
  const deadline = decisionNow() + decisionBudget(60000);
  let app, timer, interval;
  const heading = () => `${title} ${decisionCountdown(deadline)}`;
  const answer = foundry.applications.api.DialogV2.wait({
    dhpTimed: true, dhpPending: pending, window: { title: heading() }, position: { width: 760 }, classes: ['dh-premades'], content, buttons,
    rejectClose: false,
    render: (_event, dialog) => {
      app = dialog;
      onRender?.(dialog);
      clearInterval(interval);
      interval = setInterval(() => { if (app?.window?.title) app.window.title.textContent = heading(); }, 250);
    }
  });
  try { return await Promise.race([answer, new Promise(resolve => { timer = decisionTimeout(() => resolve(null), decisionBudget(60000)); })]); }
  finally { clearDecisionTimeout(timer); clearInterval(interval); if (app?.rendered) await app.close(); }
}

// Management dialogs have deadlines but do not pause a gameplay workflow.
export function managementDialog(title,content,buttons,onRender){
  return timedDialog(title,content,buttons,onRender,{pending:false});
}

// Persistent utility dialogs have no gameplay deadline and remain open until answered or closed.
export function untimedDialog(title,content,buttons,onRender){
  return foundry.applications.api.DialogV2.wait({
    dhpPending:false,window:{title},position:{width:760},classes:['dh-premades'],content,buttons,rejectClose:false,
    render:(_event,dialog)=>onRender?.(dialog)
  });
}
