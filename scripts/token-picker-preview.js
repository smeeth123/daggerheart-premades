// Canvas-only decoration: never changes targeting, control, or document state.
const rings = new Map();
function visibleTokens() {
  return globalThis.canvas?.tokens?.placeables?.filter(t => !t.destroyed && t.visible &&
    (!t.document?.hidden || globalThis.game?.user?.isGM)) ?? [];
}
export function pickerTokens(choice) {
  const explicit = choice?.dataset?.dhpToken;
  const refs = explicit !== undefined ? explicit.split(/\s+/) : [String(choice?.value ?? '').split('|')[0]];
  return visibleTokens().filter(t => refs.some(ref => ref &&
    (ref === t.document?.uuid || ref === t.id || ref === t.actor?.uuid)));
}
function paint(token, owners) {
  let entry = rings.get(token);
  if (!owners.size || token.destroyed) {
    if (entry) { if (!entry.graphic.destroyed) entry.graphic.destroy(); rings.delete(token); }
    return;
  }
  if (!entry || entry.graphic.destroyed) {
    entry = { graphic: new globalThis.PIXI.Graphics(), owners };
    entry.graphic.eventMode = 'none';
    entry.graphic.interactive = false;
    token.addChild(entry.graphic);
    rings.set(token, entry);
  }
  const graphic = entry.graphic;
  const shape = () => token.shape ? graphic.drawShape(token.shape) : graphic.drawRoundedRect(0, 0, token.w, token.h, 8);
  graphic.clear().lineStyle(7, 0x000000, 0.85); shape();
  graphic.lineStyle(3, [...owners.values()].includes('preview') ? 0x55ddff : 0xffd166, 1); shape();
}
export function bindTokenPickerPreview(dialog) {
  const root = dialog?.element;
  if (!root?.querySelectorAll || !root?.addEventListener || !globalThis.PIXI?.Graphics || !globalThis.canvas?.tokens) return () => {};
  const owner = Symbol('picker'), scene = globalThis.canvas.scene;
  let active = true, hovered = null, focused = null;
  const owned = new Set(), listeners = [], hooks = [];
  const controls = () => [...root.querySelectorAll('select,input[type="radio"],input[type="checkbox"]')];
  const choices = control => control?.tagName === 'SELECT' && control.dataset?.dhpToken === undefined ? [...(control.selectedOptions ?? [])] : [control];
  const controlAt = node => node?.closest?.('select,input[type="radio"],input[type="checkbox"]') ??
    node?.closest?.('label')?.querySelector?.('select,input[type="radio"],input[type="checkbox"]') ??
    node?.closest?.('.form-group')?.querySelector?.('select,input[type="radio"],input[type="checkbox"]');
  const updateState = () => {
    if (!active) return;
    if (globalThis.canvas.scene !== scene) { cleanup(); return; }
    const next = new Map();
    for (const control of controls()) if (!control.disabled && (control.tagName === 'SELECT' || control.checked))
      for (const choice of choices(control)) for (const token of pickerTokens(choice)) next.set(token, 'selected');
    for (const control of [focused, hovered]) if (control && !control.disabled)
      for (const choice of choices(control)) for (const token of pickerTokens(choice)) next.set(token, 'preview');
    for (const token of new Set([...owned, ...next.keys()])) {
      const owners = rings.get(token)?.owners ?? new Map();
      if (next.has(token)) { owners.set(owner, next.get(token)); owned.add(token); }
      else { owners.delete(owner); owned.delete(token); }
      paint(token, owners);
    }
  };
  const listen = (name, callback) => { root.addEventListener(name, callback); listeners.push([name, callback]); };
  const cleanup = () => {
    if (!active) return;
    active = false;
    for (const [name, callback] of listeners) root.removeEventListener(name, callback);
    for (const [name, id] of hooks) globalThis.Hooks?.off?.(name, id);
    dialog.removeEventListener?.('close', cleanup);
    for (const token of owned) { const owners = rings.get(token)?.owners; if (owners) { owners.delete(owner); paint(token, owners); } }
    owned.clear();
  };
  // Decoration must never prevent the underlying gameplay decision.
  const update = () => {
    try { updateState(); }
    catch (error) { cleanup(); console.warn('daggerheart-premades | Token picker preview unavailable', error); }
  };
  listen('change', update); listen('input', update);
  listen('mouseover', event => { hovered = controlAt(event.target); update(); });
  listen('mouseout', event => { hovered = root.contains?.(event.relatedTarget) ? controlAt(event.relatedTarget) : null; update(); });
  listen('focusin', event => { focused = controlAt(event.target); update(); });
  listen('focusout', event => { focused = root.contains?.(event.relatedTarget) ? controlAt(event.relatedTarget) : null; update(); });
  dialog.addEventListener?.('close', cleanup);
  if (globalThis.Hooks?.on) {
    hooks.push(['canvasTearDown', globalThis.Hooks.on('canvasTearDown', cleanup)]);
    hooks.push(['refreshToken', globalThis.Hooks.on('refreshToken', update)]);
    hooks.push(['deleteToken', globalThis.Hooks.on('deleteToken', update)]);
  }
  update();
  return cleanup;
}
