import { ID, supported, itemStatus, actorStatus, MEDKIT_STATES } from './core.js';
import { library } from './service.js';

let entries = [], pending, revision = 0, refreshTimer;
const sheets = new Set();

function eligible(app) {
  const doc = app.document;
  return game.system.id === 'daggerheart' && game.user.isGM && doc?.isOwner &&
    !doc.pack?.startsWith(`${ID}.`) &&
    (doc.documentName === 'Actor' || (doc.documentName === 'Item' && supported(doc)));
}
function stateFor(doc) {
  return doc.documentName === 'Actor'
    ? actorStatus([...doc.items], entries)
    : itemStatus(doc, entries);
}
export function medkitControl(doc, onClick) {
  const state = stateFor(doc);
  return {
    action: 'dhp-medkit', icon: `fa-solid fa-kit-medical dhp-status-${state}`,
    label: `Medkit — ${MEDKIT_STATES[state].label}`, onClick
  };
}
async function catalog() {
  if (!pending) {
    const requested = revision;
    pending = library().then(result => {
      if (requested === revision) entries = result.entries;
      return result;
    }).catch(error => { if (requested === revision) pending = undefined; throw error; });
  }
  return pending;
}
function paint(app, state, suffix = '') {
  const button = app.element?.querySelector('.window-header .dhp-medkit-button');
  if (!button) return;
  const label = `Medkit — ${MEDKIT_STATES[state].label}${suffix}`;
  button.dataset.medkitStatus = state;
  button.dataset.tooltip = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.querySelector('i').className = `fa-solid fa-kit-medical dhp-status-${state}`;
}
async function refresh(app) {
  if (!eligible(app)) {
    app.element?.querySelector('.dhp-medkit-button')?.remove();
    sheets.delete(app);
    return;
  }
  const requested = revision;
  try {
    const result = await catalog();
    if (!sheets.has(app)) return;
    if (requested !== revision) return refresh(app);
    paint(app, stateFor(app.document), result.errors.length ? ' (library has errors; open Medkit for details)' : '');
  } catch (error) {
    console.error(`${ID} | Could not refresh Medkit status`, error);
    paint(app, 'none', ' (library could not be loaded)');
  }
}
function scheduleRefresh(invalidate = false) {
  if (invalidate) { revision++; pending = undefined; entries = []; }
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    for (const app of sheets) void refresh(app);
  }, 50);
}
export function registerStatusHooks(openMedkit) {
  Hooks.on('renderApplicationV2', app => {
    if (!eligible(app)) return;
    const header = app.element?.querySelector('.window-header');
    if (!header) return;
    sheets.add(app);
    let button = header.querySelector('.dhp-medkit-button');
    if (!button) {
      button = header.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'header-control dhp-medkit-button';
      button.innerHTML = '<i class="fa-solid fa-kit-medical" aria-hidden="true"></i>';
      // The direct button owns its click, preventing the sheet's delegated actions from running.
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        void openMedkit(app.document);
      });
      const anchor = header.querySelector('[data-action="toggleControls"], [data-action="close"]');
      header.insertBefore(button, anchor);
    }
    paint(app, stateFor(app.document));
    void refresh(app);
  });
  Hooks.on('closeApplicationV2', app => sheets.delete(app));
  Hooks.on('updateCompendium', pack => {
    if (pack.collection?.startsWith(`${ID}.`)) scheduleRefresh(true);
  });
  for (const hook of ['createItem', 'updateItem', 'deleteItem']) {
    Hooks.on(hook, item => scheduleRefresh(Boolean(item.pack?.startsWith(`${ID}.`))));
  }
  for (const hook of ['updateActor', 'updateToken', 'updateUser']) Hooks.on(hook, () => scheduleRefresh());
}
