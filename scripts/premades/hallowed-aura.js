import { decisionBudget } from '../settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { consumeResolutionTicket } from '../resolution-manager.js';
import { ID } from '../core.js';
import { allied, auraAvailable, auraCounter, closeDistance, ownerFor, tokenState, unavailableActor } from './aura-rules.js';

const QUERY = `${ID}.hallowedAura`;
const PROMPT = `${ID}.hallowedAuraPrompt`;
const WRAPPED = Symbol.for(`${ID}.hallowedAuraWrapped`);
let offerQueue = Promise.resolve();
const requests = new Map();
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const settings = () => game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.variantRules).rangeMeasurement;
const limitFor = scene => closeDistance(scene, settings(), CONFIG.DH.GENERAL.sceneRangeMeasurementSetting.custom.id);
export const auraRangeState = scene => JSON.stringify([scene.grid.type, scene.grid.size, scene.grid.distance,
  scene.grid.diagonals, scene.flags?.daggerheart?.rangeMeasurement, settings()]);

export function sourceToken(actor) {
  if (!canvas.ready || !actor) return null;
  const matching = canvas.tokens.placeables.filter(token => token.actor?.uuid === actor.uuid);
  const controlled = matching.filter(token => token.controlled);
  return controlled.length === 1 ? controlled[0] : matching.length === 1 ? matching[0] : null;
}

export function collectCandidates(origin) {
  const limit = limitFor(canvas.scene);
  if (!Number.isFinite(limit) || limit < 0) return [];
  const found = new Map();
  for (const token of canvas.tokens.placeables) {
    if (!allied(origin.document, token.document) || unavailableActor(token.actor)) continue;
    const items = token.actor.items.filter(auraAvailable);
    if (!items.length) continue;
    const distance = origin.distanceTo(token);
    if (!Number.isFinite(distance) || distance > limit) continue;
    for (const item of items) {
      const candidate = { itemUuid: item.uuid, tokenUuid: token.document.uuid, distance,
        tokenState: tokenState(token.document) };
      if (!found.has(item.uuid) || found.get(item.uuid).distance > distance) found.set(item.uuid, candidate);
    }
  }
  return [...found.values()].sort((a, b) => a.itemUuid.localeCompare(b.itemUuid));
}

async function offerAura(roll, beforePrompt) {
  if(roll.options?.actionType!=='action')return null;
  const actor = roll.data?.parent ?? (roll.options.source?.actor ? await fromUuid(roll.options.source.actor) : null);
  const origin = sourceToken(actor);
  if (!origin) {
    if (actor && canvas.ready && canvas.tokens.placeables.some(t => t.actor?.items.some(auraAvailable))) {
      ui.notifications.warn('Hallowed Aura could not identify the rolling token. Select one token for this actor before rolling.');
    }
    return null;
  }
  const candidates = collectCandidates(origin);
  if (!candidates.length) return null;
  await beforePrompt?.();
  const gm = game.users.activeGM;
  if (!gm) throw new Error('Hallowed Aura needs an active GM to coordinate this roll.');
  const request = {
    id: foundry.utils.randomID(), deadline: decisionNow() + decisionBudget(120000),
    sourceUuid: origin.document.uuid, sourceState: tokenState(origin.document),
    rangeState: auraRangeState(canvas.scene), candidates, actionType:'action',
    hope: roll.dHope.total, fear: roll.dFear.total, total: roll.total
  };
  const response = gm.isSelf
    ? await queuedOffer(request, { user: game.user })
    : await gm.query(QUERY, request, { timeout: decisionBudget(125000) });
  return response?.accepted ? response : null;
}

// The GM serializes decisions and spends resources, so two simultaneous rolls cannot spend one use twice.
export function queuedOffer(request, { user }) {
  if (!game.user.isActiveGM) throw new Error('The active GM changed. Roll resolution was stopped.');
  if (typeof request?.id !== 'string' || request.id.length > 64 ||
      !Number.isFinite(request.deadline) || request.deadline > decisionNow() + decisionBudget(125000)) throw new Error('Invalid Hallowed Aura request.');
  for (const [key, record] of requests) if (record.expires < decisionNow()) requests.delete(key);
  const key = `${user.id}:${request.id}`;
  if (requests.has(key)) return requests.get(key).promise;
  const promise = offerQueue.catch(() => {}).then(() => resolveOffer(request, user));
  offerQueue = promise;
  requests.set(key, { promise, expires: request.deadline + decisionBudget(60000) });
  return promise;
}

export async function validatedCandidate(request, candidate, user) {
  if (!game.user.isActiveGM) throw new Error('The active GM changed during Hallowed Aura resolution.');
  if (!user.active || request.actionType!=='action' || request.deadline <= decisionNow()) return null;
  const source = await fromUuid(request.sourceUuid);
  const bearer = await fromUuid(candidate.tokenUuid);
  const item = await fromUuid(candidate.itemUuid);
  if (source?.documentName !== 'Token' || bearer?.documentName !== 'Token' || item?.documentName !== 'Item') return null;
  if (!source.actor?.testUserPermission(user, 'OWNER')) return null;
  if (source.parent?.id !== bearer.parent?.id || item.actor?.uuid !== bearer.actor?.uuid) return null;
  if (!allied(source, bearer) || unavailableActor(bearer.actor) || !auraAvailable(item)) return null;
  let distance;
  if (canvas.ready && canvas.scene.id === source.parent.id && source.object && bearer.object) {
    distance = source.object.distanceTo(bearer.object);
  } else {
    // Token.distanceTo uses canvas.grid. When the GM views another scene, retain the rolling
    // client's native measurement only while the authoritative token and range data are unchanged.
    if (request.sourceState !== tokenState(source) || candidate.tokenState !== tokenState(bearer) ||
        request.rangeState !== auraRangeState(source.parent)) return null;
    distance = candidate.distance;
  }
  const limit = limitFor(source.parent);
  if (!Number.isFinite(distance) || !Number.isFinite(limit) || distance > limit) return null;
  return { source, bearer, item, distance };
}

export async function resolveOffer(request, user) {
  if (request.actionType!=='action' || !Number.isFinite(request.hope) || !Number.isFinite(request.fear) || request.fear <= request.hope ||
      !Array.isArray(request.candidates) || request.candidates.length > 100) return { accepted: false };
  for (const candidate of request.candidates) {
    let valid = await validatedCandidate(request, candidate, user);
    if (!valid) continue;
    let recipient = ownerFor(valid.bearer.actor, [...game.users], game.user);
    const prompt = () => ({ itemUuid: candidate.itemUuid, sourceName: valid.source.name,
      bearerName: valid.bearer.name, hope: request.hope, fear: request.fear, total: request.total,
      deadline: Math.min(request.deadline - 2000, decisionNow() + decisionBudget(60000)) });
    let accepted;
    if(request.resolutionToken){
      accepted=consumeResolutionTicket(request.resolutionToken,'aura',candidate.itemUuid,user);
    }else try {
      accepted = recipient.isSelf ? await promptAura(prompt(), { user: game.user })
        : await recipient.query(PROMPT, prompt(), { timeout: Math.min(decisionBudget(65000), request.deadline - decisionNow()) });
    } catch (error) {
      if (recipient.active) throw error;
      // An owner who disconnected while the prompt was open is no longer present.
      recipient = ownerFor(valid.bearer.actor, [...game.users], game.user);
      accepted = recipient.isSelf ? await promptAura(prompt(), { user: game.user })
        : await recipient.query(PROMPT, prompt(), { timeout: Math.min(decisionBudget(65000), request.deadline - decisionNow()) });
    }
    if (!accepted) continue;
    valid = await validatedCandidate(request, candidate, user);
    if (!valid) continue;
    const updated = await valid.item.update({ [auraCounter(valid.item).path]: 1 });
    if (!updated || auraCounter(valid.item)?.value !== 1) throw new Error('Hallowed Aura could not spend its use.');
    return { accepted: true, itemUuid: valid.item.uuid, bearerName: valid.bearer.name,
      sourceName: valid.source.name, originalHope: request.hope, originalFear: request.fear };
  }
  return { accepted: false };
}

export async function promptAura(data, { user }) {
  if (!user.isGM) throw new Error('Only the GM may request a Hallowed Aura decision.');
  const item = await fromUuid(data.itemUuid);
  if (!item?.actor?.testUserPermission(game.user, 'OWNER') || !auraAvailable(item)) return false;
  const remaining = Math.min(decisionBudget(60000), data.deadline - decisionNow());
  if (remaining <= 0) return false;
  let dialog, timer, countdown;
  const expiresAt = decisionNow() + remaining;
  const title = () => `Hallowed Aura — ${data.bearerName} ${decisionCountdown(expiresAt)}`;
  const refreshCountdown = () => {
    if (dialog?.window?.title) dialog.window.title.textContent = title();
  };
  const decision = foundry.applications.api.DialogV2.wait({
    window: { title: title() }, position: { width: 470 },
    content: `<p><strong>${escape(data.sourceName)}</strong> rolled <strong>${escape(data.total)} with Fear</strong>
      (Hope ${escape(data.hope)}, Fear ${escape(data.fear)}).</p>
      <p>They are within Close range.</p>
      <p>Use <strong>${escape(data.bearerName)}’s Hallowed Aura</strong> to change this roll to Hope?
      This spends its one use until the next long rest.</p>`,
    buttons: [
      { action: 'use', label: 'Use Hallowed Aura', icon: 'fa-solid fa-sun', callback: () => true },
      { action: 'decline', label: 'Decline', default: true, callback: () => false }
    ], rejectClose: false,
    render: (_event, app) => {
      dialog = app;
      refreshCountdown();
      clearInterval(countdown);
      countdown = setInterval(refreshCountdown, 250);
    }
  });
  const expired = new Promise(resolve => { timer = decisionTimeout(() => resolve(false), remaining); });
  try { return Boolean(await Promise.race([decision, expired])); }
  finally { clearDecisionTimeout(timer); clearInterval(countdown); if (dialog?.rendered) await dialog.close(); }
}

export function installRollInterception(RollClass, offer = offerAura) {
  if (RollClass[WRAPPED]) return;
  const originalEvaluate = RollClass.prototype._evaluate;
  const originalBuildEvaluate = RollClass.buildEvaluate;
  const parentBuildPost = Object.getPrototypeOf(RollClass).buildPost;
  const building = new WeakSet();
  const skipped = new WeakSet();
  const decide = async (roll, beforePrompt) => {
    if (roll.options?.actionType!=='action' || roll.options?.[ID]?.resolutionComplete || skipped.has(roll) || roll.isCritical || !roll.withFear) return;
    const answer = await offer(roll, beforePrompt);
    if (answer?.accepted) {
      roll.options[ID] = { ...roll.options[ID], hallowedAura: answer };
      if (roll.dFear.options) delete roll.dFear.options.sfx;
    }
  };
  if (originalBuildEvaluate && parentBuildPost) {
    RollClass.buildEvaluate = async function(roll, ...args) {
      building.add(roll);
      try { return await originalBuildEvaluate.call(this, roll, ...args); }
      catch (error) { building.delete(roll); throw error; }
    };
    // Daggerheart 2.9.2 displays chat/3D dice in the parent method, then awards
    // duality resources and runs triggers. Keep that order with the decision between.
    RollClass.buildPost = async function(roll, config, message) {
      try {
        await parentBuildPost.call(this, roll, config, message);
        await decide(roll);
        if (converted(roll)) {
          config.roll.result = { ...config.roll.result, duality: 1, label: roll.totalLabel };
          if (config.message?.update) await config.message.update({
            rolls: [roll.toJSON()], 'system.roll.result': config.roll.result
          });
        }
        await RollClass.dualityUpdate(config);
        await RollClass.handleTriggers(roll, config);
      } catch (error) {
        ui.notifications.error(`Hallowed Aura check failed; roll resolution stopped: ${error.message}`);
        throw error;
      } finally { building.delete(roll); }
    };
  }
  const hope = Object.getOwnPropertyDescriptor(RollClass.prototype, 'withHope');
  const fear = Object.getOwnPropertyDescriptor(RollClass.prototype, 'withFear');
  if (!originalEvaluate || !hope?.get || !fear?.get) throw new Error('Unsupported Daggerheart DualityRoll API.');
  const converted = roll => Boolean(roll.options?.actionType==='action' && roll._evaluated && !roll.isCritical && (roll.options?.[ID]?.hallowedAura || roll.options?.[ID]?.fearless || roll.options?.[ID]?.unbound));
  Object.defineProperty(RollClass.prototype, 'withHope', { ...hope, get() { return converted(this) || hope.get.call(this); } });
  Object.defineProperty(RollClass.prototype, 'withFear', { ...fear, get() { return !converted(this) && fear.get.call(this); } });
  RollClass.prototype._evaluate = async function(options = {}) {
    // A reroll inherits Roll.options; each new evaluation must earn a new conversion.
    if (this.options?.[ID]?.hallowedAura || this.options?.[ID]?.fearless || this.options?.[ID]?.unbound) {
      this.options = { ...this.options, [ID]: { ...this.options[ID] } };
      delete this.options[ID].hallowedAura;
      delete this.options[ID].fearless;
      delete this.options[ID].unbound;
    }
    if(this.options?.[ID]?.resolutionComplete)delete this.options[ID].resolutionComplete;
    const result = await originalEvaluate.call(this, options);
    if (options.minimize || options.maximize) skipped.add(this);
    if (building.has(this) || skipped.has(this) || this.isCritical || !this.withFear) return result;
    try {
      // Direct evaluations (including native rerolls) have no buildPost stage.
      // Show their result before the decision while still holding resource updates.
      await decide(this, async () => {
      if (globalThis.ChatMessage?.create) {
        const preview = await ChatMessage.create({
          content: `<p><strong>${escape(this.data?.parent?.name ?? 'Roll')}</strong>: ${escape(this.total)} with Fear
            (Hope ${escape(this.dHope.total)}, Fear ${escape(this.dFear.total)}).</p>`,
          speaker: ChatMessage.getSpeaker({ actor: this.data?.parent }),
          flags: { [ID]: { auraPreview: true } }
        }, { messageMode: this.options.selectedMessageMode ?? game.settings.get('core', 'messageMode') });
        if (game.dice3d) await game.dice3d.showForRoll(this, game.user, true, preview.whisper, preview.blind);
        return preview;
      }
      });
    } catch (error) {
      ui.notifications.error(`Hallowed Aura check failed; roll resolution stopped before resources were awarded: ${error.message}`);
      throw error;
    }
    return result;
  };
  Object.defineProperty(RollClass, WRAPPED, { value: true });
}

export function registerHallowedAura(offer) {
  CONFIG.queries[QUERY] = queuedOffer;
  CONFIG.queries[PROMPT] = promptAura;
  installRollInterception(CONFIG.Dice.daggerheart.DualityRoll,offer);
  Hooks.on('renderChatMessageHTML', (message, html) => {
    const aura = message.rolls?.find(roll => roll.options?.[ID]?.hallowedAura)?.options[ID].hallowedAura;
    if (!aura || html.querySelector('.dhp-aura-note')) return;
    const note = html.ownerDocument.createElement('p');
    note.className = 'dhp-aura-note';
    note.textContent = `Hallowed Aura: ${aura.bearerName} changed this roll from Fear to Hope.`;
    html.querySelector('.message-content')?.append(note);
  });
}
