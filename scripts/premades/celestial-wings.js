import { decisionBudget } from '../settings.js';
import { decisionCountdown, decisionNow, decisionTimeout, clearDecisionTimeout } from '../decision-clock.js';
import { eligibleStable, spendStable, STABLE_QUERY } from './stable.js';
import { ID } from '../core.js';
import { WINGS_KEY, WINGS_ACTION } from './celestial-wings-data.js';
import { LUNAR_PHASES_KEY, LUNAR_NEW } from './lunar-phases-data.js';
import { unyieldingItem, applyUnyielding } from './unyielding.js';
import { shieldArmorRequest, shieldArmorFor, configureShieldArmor } from './i-am-your-shield.js';

const QUERY = `${ID}.celestialWingsSpend`;
export const NEW_MOON_QUERY = `${ID}.lunarNewMoonSpend`;
const queues = new Map();
export function wingsAvailable(item) {
  const metadata = item.flags?.[ID];
  const actions = item.system?.actions;
  const action = actions?.get?.(WINGS_ACTION) ?? actions?.[WINGS_ACTION];
  return item.type === 'feature' && !item.flags?.[ID]?.disabled && !item.system?.inactive &&
    (metadata?.applied?.key ?? metadata?.premade?.key) === WINGS_KEY &&
    action?.uses?.recovery === 'scene' && Number(action.uses.value ?? 0) === 0;
}
export function eligibleWings(actor) {
  if (!actor?.statuses?.has('fly') || !(Number(actor.system.resources.hope.value) >= 1)) return null;
  return actor.items.find(wingsAvailable) ?? null;
}
export function eligibleNewMoon(actor) {
  if (!(Number(actor?.system?.resources?.hope?.value) >= 1)) return null;
  return actor.items.find(item => {
    const metadata = item.flags?.[ID];
    if (item.type !== 'feature' || metadata?.disabled || item.system?.inactive ||
      (metadata?.applied?.key ?? metadata?.premade?.key) !== LUNAR_PHASES_KEY) return false;
    const effects = item.effects;
    const effect = effects?.get?.(LUNAR_NEW) ?? [...(effects ?? [])].find(entry => entry.id === LUNAR_NEW || entry._id === LUNAR_NEW);
    return effect && !effect.disabled && !effect.isSuppressed;
  }) ?? null;
}
export function damageResult(dialog) {
  const { currentDamage, selectedStressMarks, stressReductions } = dialog.getDamageInfo();
  return {
    modifiedDamage: currentDamage,
    armorChanges: dialog.marks.armor.flatMap(source => {
      const amount = Object.values(source.marks).filter(mark => mark.selected).length;
      return amount ? [{ uuid: source.effect.uuid, amount }] : [];
    }),
    stressSpent: selectedStressMarks.filter(mark => mark.armorMarkId).length +
      stressReductions.reduce((sum, reduction) => sum + reduction.cost, 0)
  };
}
export function replaceArmorCost(result) {
  if (!result.armorChanges.some(change => change.amount > 0)) throw new Error('Select an Armor Slot to replace with Hope.');
  let replaced = false;
  return { ...result, armorChanges: result.armorChanges.map(change => {
    if (replaced || change.amount < 1) return { ...change };
    replaced = true;
    return { ...change, amount: change.amount - 1 };
  }).filter(change => change.amount > 0) };
}

export async function spendWings(request, { user }) {
  const previous = queues.get(request.actorUuid) ?? Promise.resolve();
  const spending = previous.catch(() => {}).then(async () => {
    const actor = await fromUuid(request.actorUuid);
    if (!user?.active || !actor?.testUserPermission(user, 'OWNER')) throw new Error('You do not own this actor.');
    if (!Number.isFinite(request.deadline) || request.deadline <= decisionNow()) throw new Error('This damage dialog has expired.');
    const item = actor.items.get(request.itemId);
    if (!actor.statuses.has('fly') || !wingsAvailable(item ?? {}) || !(Number(actor.system.resources.hope.value) >= 1))
      throw new Error('Celestial Wings requires Flying, 1 Hope, and an available scene use.');
    const hope = Number(actor.system.resources.hope.value);
    const path = `system.actions.${WINGS_ACTION}.uses.value`;
    const marked = await item.update({ [path]: 1 });
    if (!marked || wingsAvailable(item)) throw new Error('Could not spend the Celestial Wings use.');
    try {
      const updated = await actor.update({ 'system.resources.hope.value': hope - 1 });
      if (!updated || Number(actor.system.resources.hope.value) !== hope - 1) throw new Error('Could not spend Hope.');
    } catch (error) {
      await item.update({ [path]: 0 });
      throw error;
    }
    return true;
  });
  queues.set(request.actorUuid, spending);
  try { return await spending; }
  finally { if (queues.get(request.actorUuid) === spending) queues.delete(request.actorUuid); }
}
export async function spendNewMoon(request, { user }) {
  const previous = queues.get(request.actorUuid) ?? Promise.resolve();
  const spending = previous.catch(() => {}).then(async () => {
    const actor = await fromUuid(request.actorUuid);
    if (!user?.active || !actor?.testUserPermission(user, 'OWNER')) throw new Error('You do not own this actor.');
    if (!Number.isFinite(request.deadline) || request.deadline <= decisionNow()) throw new Error('This damage dialog has expired.');
    if (!eligibleNewMoon(actor) || Number(request.damage) !== 1) throw new Error('New Moon requires Minor damage, its active phase, and 1 Hope.');
    const hope = Number(actor.system.resources.hope.value);
    const updated = await actor.update({ 'system.resources.hope.value': hope - 1 });
    if (!updated || Number(actor.system.resources.hope.value) !== hope - 1) throw new Error('Could not spend Hope.');
    return true;
  });
  queues.set(request.actorUuid, spending);
  try { return await spending; }
  finally { if (queues.get(request.actorUuid) === spending) queues.delete(request.actorUuid); }
}

export function createWingsDialog(Base) {
  return class CelestialWingsDialog extends Base {
    static DEFAULT_OPTIONS = { actions: {
      takeDamage: function() { return this.confirmWings(); },
      dhpWings: function() { return this.toggleWings(); },
      dhpStable: function() { return this.toggleWings('stable'); },
      dhpNewMoon: function() { return this.toggleNewMoon(); }
    } };
    constructor(...args) {
      super(...args);
      this.newMoonBaseDamageInfo = this.getDamageInfo.bind(this);
      this.getDamageInfo = () => {
        const info = this.newMoonBaseDamageInfo();
        return this.newMoonSelected && info.currentDamage === 1 ? { ...info, currentDamage: 0 } : info;
      };
      // This module extends its armorSlot query deadline to allow a 60-second decision.
      this.wingsDeadline = decisionNow() + decisionBudget(60000);
      this.wingsTimer = decisionTimeout(() => { if (!this.wingsBusy) void this.close(); }, decisionBudget(60000));
    }
    async close(...args) {
      if (this.wingsBusy && !args[0]) return;
      clearDecisionTimeout(this.wingsTimer);
      clearInterval(this.wingsCountdown);
      return super.close(...args);
    }
    toggleWings(mode = 'wings') {
      if (this.wingsBusy) return;
      if (this.wingsSelected && (this.armorReplacementMode ?? 'wings') === mode) {
        this.wingsSelected = false;
        if (this.wingsAutoMark?.mark.selected) {
          Base.setMarks.call(this, null, this.wingsAutoMark.target);
        }
        this.wingsAutoMark = null;
        return this.render();
      }
      if (!(mode === 'stable' ? eligibleStable(this.actor) : eligibleWings(this.actor))) return;
      this.armorReplacementMode = mode;
      if (!damageResult(this).armorChanges.length) {
        const info = this.getDamageInfo();
        if (info.currentDamage <= 0 || (this.rulesOn && info.availableArmor <= 0)) return;
        for (const [index, source] of this.marks.armor.entries()) {
          const entry = Object.entries(source.marks).find(([, mark]) => !mark.spent && !mark.disabled && !mark.selected);
          if (!entry) continue;
          const [id, mark] = entry;
          const target = { dataset: { type: 'armor', path: `armor.${index}.marks.${id}`, id } };
          Base.setMarks.call(this, null, target);
          if (mark.selected) this.wingsAutoMark = { mark, target };
          break;
        }
      }
      this.wingsSelected = damageResult(this).armorChanges.length > 0;
      return this.render();
    }
    toggleNewMoon() {
      if (this.wingsBusy || !eligibleNewMoon(this.actor) || this.newMoonBaseDamageInfo().currentDamage !== 1) return;
      this.newMoonSelected = !this.newMoonSelected;
      return this.render();
    }
    async confirmWings() {
      if (this.wingsBusy) return;
      if (this.newMoonSelected) {
        if (!eligibleNewMoon(this.actor) || this.newMoonBaseDamageInfo().currentDamage !== 1) {
          this.newMoonSelected = false;
          ui.notifications.warn('New Moon requires Minor damage, its active phase, and 1 Hope.');
          return this.render();
        }
        this.wingsBusy = true;
        try {
          const result = { ...damageResult(this), modifiedDamage: 0 };
          const request = { actorUuid: this.actor.uuid, damage: 1, deadline: this.wingsDeadline };
          const gm = game.users.activeGM;
          const paid = gm && !gm.isSelf
            ? await gm.query(NEW_MOON_QUERY, request, { timeout: Math.max(1, this.wingsDeadline - decisionNow()) })
            : await spendNewMoon(request, { user: game.user });
          if (!paid) throw new Error('Could not spend Hope for New Moon.');
          this.resolve(result);
          await this.close(true);
        } catch (error) {
          ui.notifications.error(error.message);
        } finally {
          this.wingsBusy = false;
          if (decisionNow() >= this.wingsDeadline) await this.close();
        }
        return;
      }
      if (!this.wingsSelected) {
        if (!unyieldingItem(this.actor) || !damageResult(this).armorChanges.length) return Base.takeDamage.call(this);
        this.wingsBusy = true;
        try {
          this.resolve(await applyUnyielding(this.actor, damageResult(this)));
          await this.close(true);
        } catch (error) {
          console.error(`${ID} | Unyielding failed`, error);
          ui.notifications.error('Unyielding failed; the selected Armor Slots will be marked normally.');
          this.resolve(damageResult(this));
          await this.close(true);
        } finally { this.wingsBusy = false; }
        return;
      }
      const stable = this.armorReplacementMode === 'stable';
      const item = stable ? eligibleStable(this.actor) : eligibleWings(this.actor);
      if (!item) {
        this.wingsSelected = false;
        ui.notifications.warn(stable ? 'Stable requires its active stance and 1 Focus.' : 'Celestial Wings requires Flying, 1 Hope, and an available scene use.');
        return this.render();
      }
      this.wingsBusy = true;
      try {
        const result = replaceArmorCost(damageResult(this));
        const request = { actorUuid: this.actor.uuid, itemId: item.id, deadline: this.wingsDeadline };
        const gm = game.users.activeGM;
        const paid = gm && !gm.isSelf
          ? await gm.query(stable ? STABLE_QUERY : QUERY, request, { timeout: Math.max(1, this.wingsDeadline - decisionNow()) })
          : await (stable ? spendStable : spendWings)(request, { user: game.user });
        if (!paid) throw new Error('Could not spend the selected armor replacement cost.');
        this.resolve(result);
        await this.close(true);
      } catch (error) {
        ui.notifications.error(error.message);
      } finally {
        this.wingsBusy = false;
        if (decisionNow() >= this.wingsDeadline) await this.close();
      }
    }
  };
}

export function registerCelestialWings() {
  const Base = game.system.api.applications.dialogs.DamageReductionDialog;
  const WingsDialog = createWingsDialog(Base);
  const originalQuery = CONFIG.queries.armorSlot;
  const UserClass = CONFIG.User?.documentClass;
  if (UserClass && !UserClass.dhpArmorTimeout) {
    const nativeQuery = UserClass.prototype.query;
    UserClass.prototype.query = async function(name, data, options = {}) {
      if (name === 'armorSlot') {
        const shield = shieldArmorRequest(data.actorId);
        if (shield) data = { ...data, [ID]: { ...data[ID], iAmYourShield: shield } };
      }
      if (name === 'armorSlot') { const actor = await fromUuid(data.actorId); if (eligibleWings(actor) || eligibleStable(actor) || eligibleNewMoon(actor) || unyieldingItem(actor)) options = { ...options, timeout: decisionBudget(65000) }; }
      return nativeQuery.call(this, name, data, options);
    };
    UserClass.dhpArmorTimeout = true;
  }
  CONFIG.queries[QUERY] = spendWings;
  CONFIG.queries[STABLE_QUERY] = spendStable;
  CONFIG.queries[NEW_MOON_QUERY] = spendNewMoon;
  CONFIG.queries.armorSlot = async function(data, ...args) {
    const actor = await fromUuid(data.actorId);
    if (!actor?.isOwner) return originalQuery.call(this, data, ...args);
    const shield = await shieldArmorFor(data);
    if (!(shield || eligibleWings(actor) || eligibleStable(actor) || eligibleNewMoon(actor) || unyieldingItem(actor))) return originalQuery.call(this, data, ...args);
    return new Promise((resolve, reject) => {
      const dialog = new WingsDialog(resolve, reject, actor, data.damage, data.type);
      if (shield) configureShieldArmor(dialog, shield);
      dialog.render({ force: true });
    });
  };
  Hooks.on('daggerheart.preUseAction', action => {
    const flags = action.item?.flags?.[ID];
    if (action.id !== WINGS_ACTION || (flags?.applied?.key ?? flags?.premade?.key) !== WINGS_KEY) return;
    ui.notifications.info('Use Celestial Wings in the damage-reduction dialog while Flying.');
    return false;
  });
  Hooks.on('renderApplicationV2', (app, html) => {
    if (!(app instanceof WingsDialog)) return;
    clearInterval(app.wingsCountdown);
    const countdown = () => { if (app.window?.title) app.window.title.textContent = `${app.title} ${decisionCountdown(app.wingsDeadline)}`; };
    countdown();
    app.wingsCountdown = setInterval(countdown, 250);
    html.querySelectorAll('.dhp-wings-option').forEach(element => element.remove());
    if (app.iAmYourShield) {
      const note = html.ownerDocument.createElement('p');
      note.className = 'dhp-wings-option';
      note.textContent = 'I Am Your Shield: you may mark any available Armor Slots for this attack.';
      html.querySelector('.damage-reduction-container footer')?.before(note);
    }
    if (!damageResult(app).armorChanges.length) app.wingsSelected = false;
    if (!eligibleNewMoon(app.actor) || app.newMoonBaseDamageInfo().currentDamage !== 1) app.newMoonSelected = false;
    const selectedMode = app.armorReplacementMode ?? 'wings';
    if (!(selectedMode === 'stable' ? eligibleStable(app.actor) : eligibleWings(app.actor))) app.wingsSelected = false;
    for (const option of [
      { mode: 'wings', available: eligibleWings(app.actor), action: 'dhpWings', name: 'Celestial Wings', resource: 'Hope', icon: 'fa-sun' },
      { mode: 'stable', available: eligibleStable(app.actor), action: 'dhpStable', name: 'Stable', resource: 'Focus', icon: 'fa-bullseye' }
    ]) {
      if (!option.available) continue;
      const selected = app.wingsSelected && selectedMode === option.mode;
      const section = html.ownerDocument.createElement('div');
      section.className = 'section-container dhp-wings-option';
      section.innerHTML = `<h4 class="chip-container">
        <div class="chip-inner-container selectable active${selected ? ' selected' : ''}"
          data-action="${option.action}" role="button" tabindex="0" aria-pressed="${Boolean(selected)}">
          ${option.name}
          <div class="stress-reduction-cost">1 <i class="fa-solid ${option.icon}" aria-label="${option.resource}"></i></div>
        </div>
      </h4>`;
      const control = section.querySelector('[data-action]');
      control.title = `Spend 1 ${option.resource} instead of marking an Armor Slot`;
      control.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); }
      });
      html.querySelector('.damage-reduction-container footer')?.before(section);
    }
    if (eligibleNewMoon(app.actor) && app.newMoonBaseDamageInfo().currentDamage === 1) {
      const section = html.ownerDocument.createElement('div');
      section.className = 'section-container dhp-wings-option';
      section.innerHTML = `<h4 class="chip-container"><div class="chip-inner-container selectable active${app.newMoonSelected ? ' selected' : ''}" data-action="dhpNewMoon" role="button" tabindex="0" aria-pressed="${Boolean(app.newMoonSelected)}">New Moon<div class="stress-reduction-cost">1 <i class="fa-solid fa-moon" aria-label="Hope"></i></div></div></h4>`;
      const control = section.querySelector('[data-action]');
      control.title = 'Spend 1 Hope to negate Minor damage';
      control.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); } });
      html.querySelector('.damage-reduction-container footer')?.before(section);
    }
  });
}
