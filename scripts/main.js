import {setupPremadeLibrary} from './premade-library.js';
import {ensureFolders} from './folders.js';
import {registerRuthlessPredator} from './premades/ruthless-predator.js';
import {registerElusivePredator} from './premades/elusive-predator.js';
import {registerApexPredator} from './premades/apex-predator.js';
import {registerContactsEverywhere} from './premades/contacts-everywhere.js';
import {registerReliableBackup} from './premades/reliable-backup.js';
import {registerAdrenaline} from './premades/adrenaline.js';
import {registerVanishingAct} from './premades/vanishing-act.js';
import {registerSpiritWeapon} from './premades/spirit-weapon.js';
import {registerDevout} from './premades/devout.js';
import {registerSacredResonance} from './premades/sacred-resonance.js';
import {registerWingsOfLight} from './premades/wings-of-light.js';
import {registerEtherealVisage} from './premades/ethereal-visage.js';
import {registerRuneWard} from './premades/rune-ward.js';
import {registerNotGoodEnough} from './premades/not-good-enough.js';
import {registerWhirlwind} from './premades/whirlwind.js';
import {registerDeftManeuvers} from './premades/deft-maneuvers.js';
import {registerISeeItComing} from './premades/i-see-it-coming.js';
import {registerBookOfAva} from './premades/book-of-ava.js';
import {registerBookOfIlliat} from './premades/book-of-illiat.js';
import {registerBlightingStrike} from './premades/blighting-strike.js';
import {registerUmbralVeil} from './premades/umbral-veil.js';
import {registerRainOfBlades} from './premades/rain-of-blades.js';
import {registerUncannyDisguise} from './premades/uncanny-disguise.js';
import {registerNaturesTongue} from './premades/natures-tongue.js';
import {registerViciousEntangle} from './premades/vicious-entangle.js';
import {registerReassurance} from './premades/reassurance.js';
import {registerForcefulPush} from './premades/forceful-push.js';
import {registerIAmYourShield} from './premades/i-am-your-shield.js';
import {registerEnchantedAid} from './premades/enchanted-aid.js';
import {registerArcaneCharge} from './premades/arcane-charge.js';
import {registerElementalist} from './premades/elementalist.js';
import {registerTranscendence} from './premades/transcendence.js';
import {registerManipulateMagic} from './premades/manipulate-magic.js';
import {registerCompanionAdvancements} from './premades/companion-advancements.js';
import {registerLoyalFriend} from './premades/loyal-friend.js';
import {registerEvasionIndicators} from './evasion-indicators.js';
import {registerBattleBonded} from './premades/battle-bonded.js';
import { registerCompanions } from './companions.js';
import { registerHelpAlly } from './help-ally.js';
import { registerModuleSettings, initializeModuleSettings } from './settings.js';
import { registerAutoMedkit } from './auto-medkit.js';
import { registerDecisionClockSetting, initializeDecisionClock } from './decision-clock.js';
import { registerLoyalProtector } from './premades/loyal-protector.js';
import { registerPartnerInArms } from './premades/partner-in-arms.js';
import { registerNemesis } from './premades/nemesis.js';
import { registerReprisal } from './premades/reprisal.js';
import { registerRevenge } from './premades/revenge.js';
import { registerDefender } from './premades/defender.js';
import { registerWardensProtection } from './premades/wardens-protection.js';
import { registerClarityNature } from './premades/clarity-nature.js';
import { registerElementalDominion } from './premades/elemental-dominion.js';
import { registerElementalAura } from './premades/elemental-aura.js';
import { registerElementalIncarnation } from './premades/elemental-incarnation.js';
import { registerFlowState } from './premades/flow-state.js';
import { registerKeenDefenses } from './premades/keen-defenses.js';
import { registerVigilant } from './premades/vigilant.js';
import { registerHoned } from './premades/honed.js';
import { registerExacting } from './premades/exacting.js';
import { registerCrushing } from './premades/crushing.js';
import { registerScary } from './premades/scary.js';
import { registerGrappling } from './premades/grappling.js';
import { registerOtherwordly } from './premades/otherwordly.js';
import { registerDefensive } from './premades/defensive.js';
import { registerAggressive } from './premades/aggressive.js';
import { registerQuickStance } from './premades/quick-stance.js';
import { registerInvigorating } from './premades/invigorating.js';
import { registerFavored } from './premades/favored.js';
import { registerStanceLifecycle } from './premades/stance-lifecycle.js';
import { registerStanceFighter } from './premades/stance-fighter.js';
import { registerNotDone } from './premades/not-done-yet.js';
import { registerPummeljoy } from './premades/pummeljoy.js';
import { registerAttackHope } from './premades/attack-hope.js';
import { registerEyeForEye } from './premades/eye-for-eye.js';
import { registerOverwhelm } from './premades/overwhelm.js';
import { registerEloquent } from './premades/eloquent.js';
import { registerVirtuoso } from './premades/virtuoso.js';
import { registerRallyTargets } from './premades/rally-targets.js';
import { registerMaestro } from './premades/maestro.js';
import { registerGiftedPerformer } from './premades/gifted-performer.js';
import { registerVenomancer } from './premades/venomancer.js';
import { registerPoisonCompendium } from './premades/poison-compendium.js';
import { registerToxic } from './premades/toxic-concoctions.js';
import { registerTrueStrike } from './premades/true-strike.js';
import { featureActive } from './core.js';
import { registerScorpionsPoise } from './premades/scorpions-poise.js';
import { registerDeathStrike } from './premades/death-strike.js';
import { registerAmbush } from './premades/ambush.js';
import { registerFirstStrike } from './premades/first-strike.js';
import { registerNotThisTime } from './premades/not-this-time.js';
import { registerWitchsCharm } from './premades/witchs-charm.js';
import { registerPatronsPact } from './premades/patrons-pact.js';
import { registerPatronsMantle } from './premades/patrons-mantle.js';
import { registerPatronsFury } from './premades/patrons-fury.js';
import { registerDeadlyVengeance } from './premades/deadly-vengeance.js';
import { registerMenacingReach, registerMenacingWeaponRestore } from './premades/menacing-reach.js';
import { registerDiminishMyFoes } from './premades/diminish-my-foes.js';
import { registerFearsomeAttack } from './premades/fearsome-attack.js';
import {registerCourage} from './premades/courage.js';
import {registerRiseToTheChallenge} from './premades/rise-to-the-challenge.js';
import {registerSlayer} from './premades/slayer.js';
import {registerWeaponSpecialist} from './premades/weapon-specialist.js';
import {registerMartialPreparation} from './premades/martial-preparation.js';
import {registerHerbalRemedies} from './premades/herbal-remedies.js';
import {registerEnchantedTalisman} from './premades/enchanted-talisman.js';
import {registerWalkBetweenWorlds} from './premades/walk-between-worlds.js';
import {registerCircleOfPower} from './premades/circle-of-power.js';
import {registerNightsGlamour} from './premades/nights-glamour.js';
import {registerMoonbeam} from './premades/moonbeam.js';
import {registerIreOfPaleLight} from './premades/ire-of-pale-light.js';
import {registerLunarPhases} from './premades/lunar-phases.js';
import {registerAdept} from './premades/adept.js';
import {registerPerfectRecall} from './premades/perfect-recall.js';
import {registerHonedExpertise} from './premades/honed-expertise.js';
import {registerFaceYourFear} from './premades/face-your-fear.js';
import {registerThriveInChaos} from './premades/thrive-in-chaos.js';
import {registerFragile} from './premades/fragile.js';
import {registerHobblingStrike} from './premades/hobbling-strike.js';
import {registerPackHunting} from './premades/pack-hunting.js';
import {registerVenomousBite} from './premades/venomous-bite.js';
import {registerCannonball} from './premades/cannonball.js';
import {registerTakedown} from './premades/takedown.js';
import {registerRampage} from './premades/rampage.js';
import {registerRollResolverCompat} from './roll-resolver-compat.js';
import {registerViciousMaul} from './premades/vicious-maul.js';
import {registerSnappingStrike} from './premades/snapping-strike.js';
import {registerDevastatingStrikes} from './premades/devastating-strikes.js';
import {registerBeastformRollDamage} from './beastform-roll-damage.js';
import {registerOceanMaster} from './premades/ocean-master.js';
import {registerUnyielding} from './premades/unyielding.js';
import {registerDeadlyRaptor} from './premades/deadly-raptor.js';
import {registerWeightOfDivinity} from './premades/weight-of-divinity.js';
import {registerChangeShape} from './premades/change-shape.js';
import {registerFeed} from './premades/feed.js';
import {registerWerewolf} from './premades/werewolf.js';
import {registerRestLoadout} from './rest-loadout.js';
import {registerEfficientRest} from './efficient-rest.js';
import {registerVaultRecall} from './vault-recall.js';
import { registerOtherworldlyIre } from './premades/otherworldly-ire.js';
import { registerDeathlessEmbrace } from './premades/deathless-embrace.js';
import { registerHarrowingInvocation } from './premades/harrowing-invocation.js';
import { registerDamageSink } from './premades/damage-sink.js';
import { registerDarkAegis } from './premades/dark-aegis.js';
import { registerDrainingBane } from './premades/draining-bane.js';
import { registerFavor } from './premades/favor.js';
import { registerPatronsBoon } from './premades/patrons-boon.js';
import { registerChannelRawPower } from './premades/channel-raw-power.js';
import { registerVolatileMagic } from './premades/volatile-magic.js';
import { registerPrayerDice } from './premades/prayer-dice.js';
import { registerSneakAttack } from './premades/sneak-attack.js';
import { registerHiddenAttacks } from './hidden.js';
import { registerRoguesDodge } from './premades/rogues-dodge.js';
import { registerRangersFocus } from './premades/rangers-focus.js';
import { registerComboStrike } from './premades/combo-strike.js';
import { registerIAmTheWeapon } from './premades/i-am-the-weapon.js';
import { registerMarkedForDeath } from './premades/marked-for-death.js';
import { registerKnowTheTide } from './premades/know-the-tide.js';
import { registerBraveFace } from './premades/brave-face.js';
import { registerHardy } from './premades/hardy.js';
import { registerUnbound } from './premades/unbound.js';
import { registerEyeOfTheStorm } from './premades/eye-of-the-storm.js';
import { registerTusks } from './premades/tusks.js';
import { registerSturdyEffects } from './premades/sturdy.js';
import { registerFelineInstincts } from './premades/feline-instincts.js';
import { registerFearless } from './premades/fearless.js';
import { registerAdaptability } from './premades/adaptability.js';
import { registerInternalCompass } from './premades/internal-compass.js';
import { registerLuckbringer } from './premades/luckbringer.js';
import { registerAttackResolution } from './attack-resolution.js';
import { registerNimbleFingers } from './premades/nimble-fingers.js';
import { registerResolutionManager, installDamageReductionMonitoring, addPendingDecisionsControl } from './resolution-manager.js';
import { registerRollProviders, resolveManagedRoll, resolveManagedAura } from './roll-resolution.js';
import { registerVulnerableSetting, registerVulnerableAdvantage } from './vulnerable.js';
import { ID, CATEGORIES, supported, metadata, categoryFor, matches, itemStatus } from './core.js';
import { library, apply, savePremade, setPremadeEnabled, registerPremadeDisableHooks } from './service.js';
import { medkitControl, registerStatusHooks } from './status.js';
import { registerCelestialWings } from './premades/celestial-wings.js';
import { registerIncreasedFortitude } from './premades/increased-fortitude.js';
import { registerQuickReactions } from './premades/quick-reactions.js';
import { registerFaerieWings } from './premades/faerie-wings.js';
import { registerLuckbender } from './premades/luckbender.js';
import { registerKick } from './premades/kick.js';
import { registerUnshakeable } from './premades/unshakeable.js';
import { registerHallowedAura } from './premades/hallowed-aura.js';
import { registerWeaponQuick } from './premades/weapon-quick.js';
import { registerWeaponVersatile } from './premades/weapon-versatile.js';
import { registerWeaponPiercing } from './premades/weapon-piercing.js';
import { registerWeaponOtherworldly } from './premades/weapon-otherworldly.js';
import { registerWeaponRicochet } from './premades/weapon-ricochet.js';
import { registerWeaponReloading } from './premades/weapon-reloading.js';
import { registerWeaponAimed } from './premades/weapon-aimed.js';
import { registerWeaponFollowUp } from './premades/weapon-follow-up.js';
import { registerArmorBulky } from './premades/armor-bulky.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guarded = fn => async (...args) => {
  try { return await fn(...args); }
  catch (error) { console.error(`${ID} |`, error); ui.notifications.error(error.message); }
};
import { managementDialog as dialog } from './dialog.js';
export async function openMedkit(document) {
  if (!game.user.isGM) throw new Error('Medkit is GM-only.');
  const items = document.documentName === 'Actor' ? document.items.filter(item=>supported(item)&&featureActive(item)) : supported(document)&&featureActive(document) ? [document] : [];
  const { entries, errors } = await library();
  const priority = { outdated: 0, available: 1, current: 2, disabled: 2, none: 3 };
  const rows = items.map(item => {
    const data = item.toObject();
    const status = itemStatus(item, entries);
    const installed = data.flags?.[ID]?.applied ?? data.flags?.[ID]?.premade;
    return { item, candidates: matches(item, entries), priority: status === 'none' && installed ? 2 : priority[status] };
  }).sort((a, b) => a.priority - b.priority || a.item.name.localeCompare(b.item.name, game.i18n.lang, { sensitivity: 'base', numeric: true }));
  const warnings = errors.length ? `<p class="dhp-warning">${errors.map(esc).join('<br>')}</p>` : '';
  const content = `${warnings}<p>Select matching premades and click Apply. Only selected items are updated.</p>
    ${!entries.length ? '<p><strong>No premades yet.</strong> Unlock a module compendium, open a configured feature or domain card, and choose “Save as Premade” from its header menu.</p>' : ''}
    ${!items.length ? '<p>This actor has no supported features, domain cards, weapons or armor.</p>' : ''}
    <div class="dhp-list">${rows.map(({item,candidates}, index) => {
      const installed = item.getFlag(ID, 'applied') ?? item.getFlag(ID, 'premade');
      const disabled = Boolean(item.getFlag(ID, 'disabled'));
      const currentName = installed?.name ?? candidates.find(e => metadata(e.data).key === installed?.key)?.data.name ?? item.name;
      return `<div class="dhp-row"><label for="dhp-${index}"><strong>${esc(item.name)}</strong><small>${installed ? `${esc(currentName)} v${esc(installed.version)} — ${disabled ? 'disabled' : 'applied'}` : 'No premade applied'}</small></label>
      <select id="dhp-${index}" name="item-${index}" ${candidates.length ? '' : 'disabled'}><option value="">${installed ? `Keep ${esc(currentName)} v${esc(installed.version)} (already applied)` : candidates.length ? 'Do not apply a premade' : 'No matching premade'}</option>
      ${candidates.map(e => `<option value="${esc(e.uuid)}" ${candidates.length === 1 && (installed?.key !== metadata(e.data).key || installed?.version !== metadata(e.data).version) ? 'selected' : ''}>${esc(e.data.name)} · ${esc(CATEGORIES[metadata(e.data).category])} · v${esc(metadata(e.data).version)}</option>`).join('')}</select>
      ${installed || candidates.length ? `<label class="dhp-enabled"><input type="checkbox" name="enabled-${index}" ${disabled ? '' : 'checked'}> Enabled</label>` : ''}
      ${candidates.length > 1 ? '<small>Multiple matches: choose explicitly.</small>' : ''}</div>`;
    }).join('')}</div>`;
  const selected = await dialog(`Medkit — ${document.name}`, content, [
    { action: 'apply', label: 'Apply', icon: 'fa-solid fa-kit-medical', callback: (_event, button) => rows.flatMap((row,index) => {
      const uuid = button.form.elements[`item-${index}`]?.value;
      const enabled = button.form.elements[`enabled-${index}`]?.checked ?? !row.item.getFlag(ID, 'disabled');
      const toggle = (row.item.getFlag(ID, 'applied') || row.item.getFlag(ID, 'premade')) && Boolean(row.item.getFlag(ID, 'disabled')) !== !enabled;
      return uuid || toggle ? [{ item: row.item, entry: entries.find(e => e.uuid === uuid), enabled }] : [];
    }) },
    { action: 'cancel', label: 'Cancel', callback: () => null }
  ]);
  if (!selected?.length) return;
  const summary = [];
  for (const { item, entry, enabled } of selected) {
    const previous = item.getFlag(ID, 'applied') ?? item.getFlag(ID, 'premade');
    const wasDisabled = Boolean(item.getFlag(ID, 'disabled'));
    try {
      if (entry) {
        await apply(item, entry);
        summary.push(`${item.name}: ${previous ? previous.version === metadata(entry.data).version ? 'Reapplied' : 'Updated' : 'Added'} ${entry.data.name} ${previous && previous.version !== metadata(entry.data).version ? `v${previous.version} → ` : ''}v${metadata(entry.data).version}.`);
      }
      if (entry || wasDisabled !== !enabled) {
        await setPremadeEnabled(item, enabled);
        if (wasDisabled !== !enabled) summary.push(`${item.name}: ${enabled ? 'Enabled' : 'Disabled'}.`);
      }
    } catch (error) { summary.push(`${item.name}: Failed — ${error.message}`); }
  }
  await ChatMessage.create({
    content: `<h3>Medkit — ${esc(document.name)}</h3><ul>${summary.map(line => `<li>${esc(line)}</li>`).join('')}</ul>`,
    whisper: [game.user.id], speaker: { alias: 'Daggerheart Premades' }
  });
  ui.notifications.info('Medkit finished. See your private chat summary.');
}
async function author(item) {
  if (item.pack?.startsWith(`${ID}.`)) {
    const meta = item.getFlag(ID, 'premade');
    if (!meta) throw new Error('This entry has no premade metadata. Author it from a world item using Save as Premade.');
    const version = await dialog('Premade version', `<p>Stable key: <strong>${esc(meta.key)}</strong>. Increment the version after editing this premade’s actions or effects.</p><input name="version" value="${esc(meta.version)}" aria-label="Version">`, [
      { action:'save', label:'Save version', callback: (_event,button) => button.form.elements.version.value.trim() },
      { action:'cancel', label:'Cancel', callback: () => null }
    ]);
    if (!version) return;
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Use an x.y.z version.');
    if (game.packs.get(item.pack).locked) throw new Error('Unlock this compendium first.');
    await item.setFlag(ID, 'premade', { ...meta, version });
    return;
  }
  const category = categoryFor(item);
  const options = Object.entries(CATEGORIES).filter(([k]) => !['weapon-features','armor-features'].includes(k) && (item.type === 'domainCard') === (k === 'domain-cards'));
  const result = await dialog('Save as Premade', `<p>Save this configured item into the premade library. Unlock the destination compendium first.</p>
    <label>Category<select name="category">${options.map(([k,v]) => `<option value="${k}" ${k===category?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
    <label>Stable key<input name="key" value="${esc(item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}" required></label>
    <label>Version<input name="version" value="1.0.0" required></label>
    <label>Alternate names (one per line)<textarea name="aliases"></textarea></label>`, [
      { action:'save', label:'Save premade', callback: (_event,button) => Object.fromEntries(new FormData(button.form)) },
      { action:'cancel', label:'Cancel', callback: () => null }
    ]);
  if (!result) return;
  const saved = await savePremade(item, result);
  ui.notifications.info(`Saved ${saved.name} to ${CATEGORIES[result.category]}.`);
}
Hooks.once('init', () => {
  registerModuleSettings();
  registerVulnerableSetting();
  registerDecisionClockSetting();
  Hooks.on('getSceneControlButtons', controls => addPendingDecisionsControl(controls));
  game.modules.get(ID).api = { openMedkit: guarded(openMedkit), library, apply, savePremade, setPremadeEnabled, ensureFolders };
  registerStatusHooks(guarded(openMedkit));
});
Hooks.on('getHeaderControlsApplicationV2', (app, controls) => {
  if (game.system.id !== 'daggerheart' || !game.user.isGM) return;
  const doc = app.document;
  if (!doc?.isOwner) return;
  const isItem = doc.documentName === 'Item' && supported(doc);
  if (!isItem && doc.documentName !== 'Actor') return;
  if (!doc.pack?.startsWith(`${ID}.`)) controls.push(medkitControl(doc, guarded(() => openMedkit(doc))));
  if (isItem && !['weapon','armor'].includes(doc.type)) {
    controls.push({ action:'dhp-author', icon:'fa-solid fa-book-medical', label:doc.pack?.startsWith(`${ID}.`) ? 'Premade Version' : 'Save as Premade', onClick:guarded(() => author(doc)) });
  }
});
Hooks.once('ready', async () => {
  if (game.system.id !== 'daggerheart') return;
  registerRollResolverCompat();
  registerWeaponQuick();
  registerWeaponVersatile();
  registerWeaponPiercing();
  registerWeaponOtherworldly();
  registerWeaponRicochet();
  registerWeaponReloading();
  registerWeaponAimed();
  registerWeaponFollowUp();
  initializeModuleSettings();
  initializeDecisionClock();
  registerAutoMedkit();
  registerPremadeDisableHooks();
  registerContactsEverywhere();
  registerElementalist();
  registerTranscendence();
  registerResolutionManager();
  registerRollProviders();
  registerVulnerableAdvantage();
  registerSturdyEffects();
  registerHelpAlly();
  registerEnchantedAid();
  registerHallowedAura(resolveManagedAura);
  registerWitchsCharm();
  registerLuckbender(resolveManagedRoll);
  registerNimbleFingers();
  registerInternalCompass();
  registerAdaptability();
  registerFearless();
  registerUnbound();
  registerHardy();
  registerKnowTheTide();
  registerBraveFace();
  registerFelineInstincts();
  registerCelestialWings();
  installDamageReductionMonitoring(CONFIG.queries);
  registerIncreasedFortitude();
  registerQuickReactions();
  registerFaerieWings(true);
  registerAttackResolution();
  registerLuckbringer();
  registerKick();
  registerTusks();
  registerComboStrike();
  registerMarkedForDeath();
  registerRangersFocus();
  registerRoguesDodge();
  registerHiddenAttacks();
  registerSneakAttack();
  registerPrayerDice();
  registerSlayer();
  registerWeaponSpecialist();
  registerMartialPreparation();
  registerNotGoodEnough();
  registerVolatileMagic();
  registerFearsomeAttack();
  registerCourage();
  registerRiseToTheChallenge();
  registerManipulateMagic();
  registerArcaneCharge();
  registerChannelRawPower();
  registerPatronsBoon();
  registerFavor();
  registerPatronsPact();
  registerPatronsMantle();
  registerPatronsFury();
  registerDeadlyVengeance();
  registerMenacingReach();
  registerMenacingWeaponRestore();
  registerDiminishMyFoes();
  registerOtherworldlyIre();
  registerDeathlessEmbrace();
  registerHarrowingInvocation();
  registerDrainingBane();
  registerDamageSink();
  registerNotThisTime();
  registerFirstStrike();
  registerAmbush();
  registerDeathStrike();
  registerScorpionsPoise();
  registerTrueStrike();
  registerToxic();
  registerPoisonCompendium();
  registerVenomancer();
  registerGiftedPerformer();
  registerMaestro();
  registerVirtuoso();
  registerEloquent();
  registerOverwhelm();
  registerNotDone();
  registerEyeForEye();
  registerRallyTargets();
  registerIAmTheWeapon();
  registerEyeOfTheStorm();
  registerUnshakeable();
  registerAttackHope();
  registerPummeljoy();
  registerStanceFighter();
  registerStanceLifecycle();
  registerFavored();
  registerInvigorating();
  registerQuickStance();
  registerAggressive();
  registerDefensive();
  registerOtherwordly();
  registerGrappling();
  registerScary();
  registerCrushing();
  registerExacting();
  registerHoned();
  registerVigilant();
  registerKeenDefenses();
  registerFlowState();
  registerElementalIncarnation();
  registerElementalAura();
  registerElementalDominion();
  registerClarityNature();
  registerWardensProtection();
  registerEnchantedTalisman();
  registerWalkBetweenWorlds();
  registerCircleOfPower();
  registerNightsGlamour();
  registerMoonbeam();
  registerIreOfPaleLight();
  registerLunarPhases();
  registerAdept();
  registerPerfectRecall();
  registerHonedExpertise();
  registerFaceYourFear();
  registerDefender();
  registerReliableBackup();
  registerDarkAegis();
  registerAdrenaline();
  registerVanishingAct();
  registerSpiritWeapon();
  registerDevout();
  registerSacredResonance();
  registerWingsOfLight();
  registerEtherealVisage();
  registerRevenge();
  registerReprisal();
  registerNemesis();
  registerPartnerInArms();
  registerLoyalProtector();
  registerCompanions();
  registerHerbalRemedies();
  registerLoyalFriend();
  registerCompanionAdvancements();
  registerRuthlessPredator();
  registerElusivePredator();
  registerApexPredator();
  registerBattleBonded();
  registerEvasionIndicators();
  registerRestLoadout();
  registerEfficientRest();
  registerVaultRecall();
  registerFragile();
  registerHobblingStrike();
  registerPackHunting();
  registerVenomousBite();
  registerCannonball();
  registerTakedown();
  registerRampage();
  registerViciousMaul();
  registerSnappingStrike();
  registerDevastatingStrikes();
  registerOceanMaster();
  registerUnyielding();
  registerDeadlyRaptor();
  registerWeightOfDivinity();
  registerChangeShape();
  registerFeed();
  registerWerewolf();
  registerThriveInChaos();
  registerBeastformRollDamage();
  registerRuneWard();
  // Outer to recipient defenses, inner to Whirlwind/Rain's per-target packet adjustments.
  registerIAmYourShield();
  registerWhirlwind();
  registerDeftManeuvers();
  registerISeeItComing();
  registerBookOfAva();
  registerBookOfIlliat();
  registerBlightingStrike();
  registerUmbralVeil();
  registerRainOfBlades();
  registerUncannyDisguise();
  registerNaturesTongue();
  registerViciousEntangle();
  registerReassurance();
  registerForcefulPush();
  // Observe final HP receipts after every recipient defense/prevention wrapper.
  registerArmorBulky();
  if (game.user.isActiveGM) {
    try {
      const count = await setupPremadeLibrary();
      if (count) ui.notifications.info(`Daggerheart Premades: created ${count} compendium folders.`);
    } catch (error) {
      console.error(`${ID} | Folder setup failed`, error);
      ui.notifications.error(`Premade folder setup: ${error.message}`);
    }
  }
  console.info('Daggerheart Premades | Framework ready. Use actor and item header menus to open Medkit.');
});
