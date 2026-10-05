import {withPremadeSetup} from './premade-setup-context.js';
import {ensureWeaponQuick} from './premades/weapon-quick-data.js';
import {ensureWeaponVersatile} from './premades/weapon-versatile-data.js';
import {ensureWeaponPiercing} from './premades/weapon-piercing-data.js';
import {ensureWeaponOtherworldly} from './premades/weapon-otherworldly-data.js';
import {ensureWeaponRicochet} from './premades/weapon-ricochet-data.js';
import {ensureWeaponReloading} from './premades/weapon-reloading-data.js';
import {ensureWeaponAimed} from './premades/weapon-aimed-data.js';
import {ensureWeaponFollowUp} from './premades/weapon-follow-up-data.js';
import {ensureWeaponDeadly} from './premades/weapon-deadly-data.js';
import {ensureWeaponNonlethal} from './premades/weapon-nonlethal-data.js';
import {ensureWeaponDeflecting} from './premades/weapon-deflecting-data.js';
import {ensureWeaponScary} from './premades/weapon-scary-data.js';
import {ensureWeaponEntangling} from './premades/weapon-entangling-data.js';
import {ensureWeaponEruptive} from './premades/weapon-eruptive-data.js';
import {ensureWeaponPersuasive} from './premades/weapon-persuasive-data.js';
import {ensureWeaponInvigorating} from './premades/weapon-invigorating-data.js';
import {ensureWeaponOmnipresent} from './premades/weapon-omnipresent-data.js';
import {ensureWeaponVolleyed} from './premades/weapon-volleyed-data.js';
import {ensureWeaponParry} from './premades/weapon-parry-data.js';
import {ensureArmorBulky} from './premades/armor-bulky-data.js';
import {ensureArmorResilient} from './premades/armor-resilient-data.js';
import {ensureArmorReinforced} from './premades/armor-reinforced-data.js';
import {ensureArmorShifting} from './premades/armor-shifting-data.js';
import {ensureArmorHopeful} from './premades/armor-hopeful-data.js';
import {ensureArmorMnemonic} from './premades/armor-mnemonic-data.js';
import {ensureArmorAbsorbing} from './premades/armor-absorbing-data.js';
import {ensureArmorQuickStriding} from './premades/armor-quick-striding-data.js';
import {ensureArmorSelfHealing} from './premades/armor-self-healing-data.js';
import {ensureArmorResplendent} from './premades/armor-resplendent-data.js';
import {ensureRuthlessPredator} from "./premades/ruthless-predator-data.js";
import {ensureElusivePredator} from "./premades/elusive-predator-data.js";
import {ensureApexPredator} from "./premades/apex-predator-data.js";
import {ensureContactsEverywhere} from "./premades/contacts-everywhere-data.js";
import {ensureReliableBackup} from "./premades/reliable-backup-data.js";
import {ensureAdrenaline} from "./premades/adrenaline-data.js";
import {ensureVanishingAct} from "./premades/vanishing-act-data.js";
import {ensureSpiritWeapon} from "./premades/spirit-weapon-data.js";
import {ensureDevout} from "./premades/devout-data.js";
import {ensureSacredResonance} from "./premades/sacred-resonance-data.js";
import {ensureWingsOfLight} from "./premades/wings-of-light-data.js";
import {ensureEtherealVisage} from "./premades/ethereal-visage-data.js";
import {ensurePowerOfTheGods} from "./premades/power-of-the-gods-data.js";
import {ensureRuneWard} from "./premades/rune-ward-data.js";
import {ensureNotGoodEnough} from "./premades/not-good-enough-data.js";
import {ensureWhirlwind} from "./premades/whirlwind-data.js";
import {ensureDeftManeuvers} from "./premades/deft-maneuvers-data.js";
import {ensureISeeItComing} from "./premades/i-see-it-coming-data.js";
import {ensureBookOfAva} from "./premades/book-of-ava-data.js";
import {ensureBookOfIlliat} from "./premades/book-of-illiat-data.js";
import {ensureBlightingStrike} from "./premades/blighting-strike-data.js";
import {ensureUmbralVeil} from "./premades/umbral-veil-data.js";
import {ensureRainOfBlades} from "./premades/rain-of-blades-data.js";
import {ensureUncannyDisguise} from "./premades/uncanny-disguise-data.js";
import {ensureNaturesTongue} from "./premades/natures-tongue-data.js";
import {ensureViciousEntangle} from "./premades/vicious-entangle-data.js";
import {ensureReassurance} from "./premades/reassurance-data.js";
import {ensureForcefulPush} from "./premades/forceful-push-data.js";
import {ensureIAmYourShield} from "./premades/i-am-your-shield-data.js";
import {ensureCinderGrasp} from "./premades/cinder-grasp-data.js";
import {ensureReckless} from "./premades/reckless-data.js";
import {ensureFerocity} from "./premades/ferocity-data.js";
import {ensureStrategicApproach} from "./premades/strategic-approach-data.js";
import {ensureBookOfSitil} from "./premades/book-of-sitil-data.js";
import {ensureHideousRetribution} from "./premades/hideous-retribution-data.js";
import {ensureSiphonEssence} from "./premades/siphon-essence-data.js";
import {ensureMidnightSpirit} from "./premades/midnight-spirit-data.js";
import {ensureConjureSwarm} from "./premades/conjure-swarm-data.js";
import {ensureNaturalFamiliar} from "./premades/natural-familiar-data.js";
import {ensureBodyBasher} from "./premades/body-basher-data.js";
import {ensureBoldPresence} from "./premades/bold-presence-data.js";
import {ensureEnchantedAid} from "./premades/enchanted-aid-data.js";
import {ensureArcaneCharge} from "./premades/arcane-charge-data.js";
import {ensureElementalist} from "./premades/elementalist-data.js";
import {ensureNaturalEvasion} from "./premades/natural-evasion-data.js";
import {ensureTranscendence} from "./premades/transcendence-data.js";
import {ensureManipulateMagic} from "./premades/manipulate-magic-data.js";
import {ensureCompanionAdvancements} from "./premades/companion-advancements-data.js";
import {ensureLoyalFriend} from "./premades/loyal-friend-data.js";
import {ensureBattleBonded} from "./premades/battle-bonded-data.js";
import {ensureLoyalProtector} from "./premades/loyal-protector-data.js";
import {ensurePartnerInArms} from "./premades/partner-in-arms-data.js";
import {ensureNemesis} from "./premades/nemesis-data.js";
import {ensureReprisal} from "./premades/reprisal-data.js";
import {ensureRevenge} from "./premades/revenge-data.js";
import {ensureDefender} from "./premades/defender-data.js";
import {ensureWardensProtection} from "./premades/wardens-protection-data.js";
import {ensureClarityNature} from "./premades/clarity-nature-data.js";
import {ensureElementalDominion} from "./premades/elemental-dominion-data.js";
import {ensureElementalAura} from "./premades/elemental-aura-data.js";
import {ensureElementalIncarnation} from "./premades/elemental-incarnation-data.js";
import {ensureFlowState} from "./premades/flow-state-data.js";
import {ensureKeenDefenses} from "./premades/keen-defenses-data.js";
import {ensureIsolating} from "./premades/isolating-data.js";
import {ensureHoned} from "./premades/honed-data.js";
import {ensureExacting} from "./premades/exacting-data.js";
import {ensureCrushing} from "./premades/crushing-data.js";
import {ensureVigilant} from "./premades/vigilant-data.js";
import {ensureStable} from "./premades/stable-data.js";
import {ensureScary} from "./premades/scary-data.js";
import {ensureGrappling} from "./premades/grappling-data.js";
import {ensureOtherwordly} from "./premades/otherwordly-data.js";
import {ensureDefensive} from "./premades/defensive-data.js";
import {ensureAggressive} from "./premades/aggressive-data.js";
import {ensureQuickStance} from "./premades/quick-stance-data.js";
import {ensureInvigorating} from "./premades/invigorating-data.js";
import {ensureFavored} from "./premades/favored-data.js";
import {ensureStanceFighter} from "./premades/stance-fighter-data.js";
import {ensureNotDone} from "./premades/not-done-yet-data.js";
import {ensurePummeljoy} from "./premades/pummeljoy-data.js";
import {ensureEyeForEye} from "./premades/eye-for-eye-data.js";
import {ensureOverwhelm} from "./premades/overwhelm-data.js";
import {ensureEloquent} from "./premades/eloquent-data.js";
import {ensureVirtuoso} from "./premades/virtuoso-data.js";
import {ensureMaestro} from "./premades/maestro-data.js";
import {ensureGiftedPerformer} from "./premades/gifted-performer-data.js";
import {ensureVenomancer} from "./premades/venomancer-data.js";
import {ensureTwinFang} from "./premades/twin-fang-data.js";
import {ensurePoisonCompendium} from "./premades/poison-compendium-data.js";
import {ensureToxic} from "./premades/toxic-concoctions-data.js";
import {ensureTrueStrike} from "./premades/true-strike-data.js";
import {ensureBackstab} from "./premades/backstab-data.js";
import {ensureScorpionsPoise} from "./premades/scorpions-poise-data.js";
import {ensureDeathStrike} from "./premades/death-strike-data.js";
import {ensureAmbush} from "./premades/ambush-data.js";
import {ensureFirstStrike} from "./premades/first-strike-data.js";
import {ensureNotThisTime} from "./premades/not-this-time-data.js";
import {ensureWitchsCharm} from "./premades/witchs-charm-data.js";
import {ensurePatronsPact} from "./premades/patrons-pact-data.js";
import {ensurePatronsMantle} from "./premades/patrons-mantle-data.js";
import {ensurePatronsFury} from "./premades/patrons-fury-data.js";
import {ensureDeadlyVengeance} from "./premades/deadly-vengeance-data.js";
import {ensureMenacingReach} from "./premades/menacing-reach-data.js";
import {ensureDiminishMyFoes} from "./premades/diminish-my-foes-data.js";
import {ensureFearsomeAttack} from "./premades/fearsome-attack-data.js";
import {ensureCourage} from "./premades/courage-data.js";
import {ensureRiseToTheChallenge} from "./premades/rise-to-the-challenge-data.js";
import {ensureSlayer} from "./premades/slayer-data.js";
import {ensureWeaponSpecialist} from "./premades/weapon-specialist-data.js";
import {ensureMartialPreparation} from "./premades/martial-preparation-data.js";
import {ensureHerbalRemedies} from "./premades/herbal-remedies-data.js";
import {ensureEnchantedTalisman} from "./premades/enchanted-talisman-data.js";
import {ensureWalkBetweenWorlds} from "./premades/walk-between-worlds-data.js";
import {ensureVexingMalison} from "./premades/vexing-malison-data.js";
import {ensureCircleOfPower} from "./premades/circle-of-power-data.js";
import {ensureNightsGlamour} from "./premades/nights-glamour-data.js";
import {ensureMoonbeam} from "./premades/moonbeam-data.js";
import {ensureIreOfPaleLight} from "./premades/ire-of-pale-light-data.js";
import {ensureLunarPhases} from "./premades/lunar-phases-data.js";
import {ensurePerfectRecall} from "./premades/perfect-recall-data.js";
import {ensureHonedExpertise} from "./premades/honed-expertise-data.js";
import {ensureFaceYourFear} from "./premades/face-your-fear-data.js";
import {ensureFueledByFear} from "./premades/fueled-by-fear-data.js";
import {ensureHaveNoFear} from "./premades/have-no-fear-data.js";
import {ensureConjureShield} from "./premades/conjure-shield-data.js";
import {ensureThriveInChaos} from "./premades/thrive-in-chaos-data.js";
import {ensureFragile} from "./premades/fragile-data.js";
import {ensureElusivePrey} from "./premades/elusive-prey-data.js";
import {ensureHobblingStrike} from "./premades/hobbling-strike-data.js";
import {ensurePackHunting} from "./premades/pack-hunting-data.js";
import {ensureVenomousBite} from "./premades/venomous-bite-data.js";
import {ensureBeastformCompanion} from "./premades/companion-data.js";
import {ensureCannonball} from "./premades/cannonball-data.js";
import {ensureTakedown} from "./premades/takedown-data.js";
import {ensureVenomousStrike} from "./premades/venomous-strike-data.js";
import {ensureRampage} from "./premades/rampage-data.js";
import {ensureViciousMaul} from "./premades/vicious-maul-data.js";
import {ensureSnappingStrike} from "./premades/snapping-strike-data.js";
import {ensureDevastatingStrikes} from "./premades/devastating-strikes-data.js";
import {ensureOceanMaster} from "./premades/ocean-master-data.js";
import {ensureUnyielding} from "./premades/unyielding-data.js";
import {ensureDeadlyRaptor} from "./premades/deadly-raptor-data.js";
import {ensureWeightOfDivinity} from "./premades/weight-of-divinity-data.js";
import {ensureChangeShape} from "./premades/change-shape-data.js";
import {ensureFeed} from "./premades/feed-data.js";
import {ensureWolfForm,ensureHowlingRampage} from "./premades/werewolf-data.js";
import {ensureAdept} from "./premades/adept-data.js";
import {ensureOtherworldlyIre} from "./premades/otherworldly-ire-data.js";
import {ensureDeathlessEmbrace} from "./premades/deathless-embrace-data.js";
import {ensureHarrowingInvocation} from "./premades/harrowing-invocation-data.js";
import {ensureDamageSink} from "./premades/damage-sink-data.js";
import {ensureDarkAegis} from "./premades/dark-aegis-data.js";
import {ensureDrainingBane} from "./premades/draining-bane-data.js";
import {ensureFavor} from "./premades/favor-data.js";
import {ensurePatronsBoon} from "./premades/patrons-boon-data.js";
import {ensureChannelRawPower} from "./premades/channel-raw-power-data.js";
import {ensureVolatileMagic} from "./premades/volatile-magic-data.js";
import {ensurePrayerDice} from "./premades/prayer-dice-data.js";
import {ensureSneakAttack} from "./premades/sneak-attack-data.js";
import {ensureRoguesDodge} from "./premades/rogues-dodge-data.js";
import {ensureRangersFocus} from "./premades/rangers-focus-data.js";
import {ensureComboStrike} from "./premades/combo-strike-data.js";
import {ensureIAmTheWeapon} from "./premades/i-am-the-weapon-data.js";
import {ensureMarkedForDeath} from "./premades/marked-for-death-data.js";
import {ensureKnowTheTide} from "./premades/know-the-tide-data.js";
import {ensureBraveFace} from "./premades/brave-face-data.js";
import {ensureHardy} from "./premades/hardy-data.js";
import {ensureUnbound} from "./premades/unbound-data.js";
import {ensureEyeOfTheStorm} from "./premades/eye-of-the-storm-data.js";
import {ensureTusks} from "./premades/tusks-data.js";
import {ensureSturdy} from "./premades/sturdy-data.js";
import {ensureFelineInstincts} from "./premades/feline-instincts-data.js";
import {ensureFearless} from "./premades/fearless-data.js";
import {ensureAdaptability} from "./premades/adaptability-data.js";
import {ensureInternalCompass} from "./premades/internal-compass-data.js";
import {ensureLuckbringer} from "./premades/luckbringer-data.js";
import {ensureDangerSense} from "./premades/danger-sense-data.js";
import {ensureNimbleFingers} from "./premades/nimble-fingers-data.js";
import {ensureRetract} from "./premades/retract-data.js";
import {ensureFolders,removeEmptyAncestryFolders,removeEmptyCommunityFolders,removeObsoleteWitchSubclassFolder,removeObsoleteWarriorSubclassFolder} from "./folders.js";
import {ensureHallowedAura} from "./premades/hallowed-aura-data.js";
import {ensureCelestialWings} from "./premades/celestial-wings-data.js";
import {ensureIncreasedFortitude} from "./premades/increased-fortitude-data.js";
import {removeStoneskinPremade} from "./premades/stoneskin-data.js";
import {ensureQuickReactions} from "./premades/quick-reactions-data.js";
import {ensureFaerieWings} from "./premades/faerie-wings-data.js";
import {ensureLuckbender} from "./premades/luckbender-data.js";
import {ensureKick} from "./premades/kick-data.js";
import {ensureUnshakeable} from "./premades/unshakeable-data.js";

export const PREMADE_SEEDS=[
  ensureHallowedAura,
  ensureCelestialWings,
  ensureIncreasedFortitude,
  ensureQuickReactions,
  ensureFaerieWings,
  ensureLuckbender,
  ensureKick,
  ensureUnshakeable,
  ensureRetract,
  ensureNimbleFingers,
  ensureDangerSense,
  ensureLuckbringer,
  ensureInternalCompass,
  ensureAdaptability,
  ensureFearless,
  ensureFelineInstincts,
  ensureSturdy,
  ensureTusks,
  ensureEyeOfTheStorm,
  ensureUnbound,
  ensureHardy,
  ensureKnowTheTide,
  ensureMarkedForDeath,
  ensureIAmTheWeapon,
  ensureComboStrike,
  ensureRangersFocus,
  ensureRoguesDodge,
  ensureSneakAttack,
  ensurePrayerDice,
  ensureVolatileMagic,
  ensureEnchantedAid,
  ensureArcaneCharge,
  ensureChannelRawPower,
  ensurePatronsBoon,
  ensureFavor,
  ensurePatronsPact,
  ensurePatronsMantle,
  ensurePatronsFury,
  ensureDeadlyVengeance,
  ensureMenacingReach,
  ensureDiminishMyFoes,
  ensureFearsomeAttack,
  ensureCourage,
  ensureRiseToTheChallenge,
  ensureSlayer,
  ensureWeaponSpecialist,
  ensureMartialPreparation,
  ensureHerbalRemedies,
  ensureEnchantedTalisman,
  ensureWalkBetweenWorlds,
  ensureVexingMalison,
  ensureCircleOfPower,
  ensureNightsGlamour,
  ensureMoonbeam,
  ensureIreOfPaleLight,
  ensureLunarPhases,
  ensureAdept,
  ensurePerfectRecall,
  ensureHonedExpertise,
  ensureFaceYourFear,
  ensureFueledByFear,
  ensureHaveNoFear,
  ensureConjureShield,
  ensureThriveInChaos,
  ensureFragile,
  ensureElusivePrey,
  ensureHobblingStrike,
  ensurePackHunting,
  ensureVenomousBite,
  ensureBeastformCompanion,
  ensureCannonball,
  ensureTakedown,
  ensureVenomousStrike,
  ensureRampage,
  ensureViciousMaul,
  ensureSnappingStrike,
  ensureDevastatingStrikes,
  ensureOceanMaster,
  ensureUnyielding,
  ensureDeadlyRaptor,
  ensureWeightOfDivinity,
  ensureChangeShape,
  ensureFeed,
  ensureWolfForm,
  ensureHowlingRampage,
  ensureOtherworldlyIre,
  ensureDeathlessEmbrace,
  ensureHarrowingInvocation,
  ensureDamageSink,
  ensureDarkAegis,
  ensureDrainingBane,
  ensureWitchsCharm,
  ensureNotThisTime,
  ensureFirstStrike,
  ensureAmbush,
  ensureDeathStrike,
  ensureScorpionsPoise,
  ensureTrueStrike,
  ensureBackstab,
  ensureToxic,
  ensurePoisonCompendium,
  ensureTwinFang,
  ensureVenomancer,
  ensureGiftedPerformer,
  ensureMaestro,
  ensureVirtuoso,
  ensureEloquent,
  ensureOverwhelm,
  ensureEyeForEye,
  ensurePummeljoy,
  ensureNotDone,
  ensureStanceFighter,
  ensureFavored,
  ensureInvigorating,
  ensureQuickStance,
  ensureAggressive,
  ensureDefensive,
  ensureOtherwordly,
  ensureGrappling,
  ensureScary,
  ensureStable,
  ensureVigilant,
  ensureCrushing,
  ensureExacting,
  ensureHoned,
  ensureIsolating,
  ensureKeenDefenses,
  ensureFlowState,
  ensureElementalIncarnation,
  ensureElementalist,
  ensureNaturalEvasion,
  ensureTranscendence,
  ensureManipulateMagic,
  ensureElementalAura,
  ensureElementalDominion,
  ensureClarityNature,
  ensureWardensProtection,
  ensureDefender,
  ensureRevenge,
  ensureReprisal,
  ensureNemesis,
  ensurePartnerInArms,
  ensureLoyalProtector,
  ensureBattleBonded,
  ensureLoyalFriend,
  ensureCompanionAdvancements,
  ensureRuthlessPredator,
  ensureElusivePredator,
  ensureApexPredator,
  ensureContactsEverywhere,
  ensureReliableBackup,
  ensureAdrenaline,
  ensureVanishingAct,
  ensureSpiritWeapon,
  ensureDevout,
  ensureSacredResonance,
  ensureWingsOfLight,
  ensureEtherealVisage,
  ensurePowerOfTheGods,
  ensureBraveFace,
  ensureRuneWard,
  ensureNotGoodEnough,
  ensureWhirlwind,
  ensureDeftManeuvers,
  ensureISeeItComing,
  ensureBookOfAva,
  ensureBookOfIlliat,
  ensureBlightingStrike,
  ensureUmbralVeil,
  ensureRainOfBlades,
  ensureUncannyDisguise,
  ensureNaturesTongue,
  ensureViciousEntangle,
  ensureReassurance,
  ensureForcefulPush,
  ensureIAmYourShield,
  ensureCinderGrasp,
  ensureReckless,
  ensureFerocity,
  ensureStrategicApproach,
  ensureBookOfSitil,
  ensureHideousRetribution,
  ensureSiphonEssence,
  ensureMidnightSpirit,
  ensureConjureSwarm,
  ensureNaturalFamiliar,
  ensureBodyBasher,
  ensureBoldPresence,
  ensureWeaponQuick,
  ensureWeaponVersatile,
  ensureWeaponPiercing,
  ensureWeaponOtherworldly,
  ensureWeaponRicochet,
  ensureWeaponReloading,
  ensureWeaponAimed,
  ensureWeaponFollowUp,
  ensureWeaponDeadly,
  ensureWeaponNonlethal,
  ensureWeaponDeflecting,
  ensureWeaponScary,
  ensureWeaponEntangling,
  ensureWeaponEruptive,
  ensureWeaponPersuasive,
  ensureWeaponInvigorating,
  ensureWeaponOmnipresent,
  ensureWeaponVolleyed,
  ensureWeaponParry,
  ensureArmorBulky,
  ensureArmorResilient,
  ensureArmorReinforced,
  ensureArmorShifting,
  ensureArmorHopeful,
  ensureArmorMnemonic,
  ensureArmorAbsorbing,
  ensureArmorQuickStriding,
  ensureArmorSelfHealing,
  ensureArmorResplendent,
];

export async function setupPremadeLibrary(){
  if(!game.user.isActiveGM)throw Error('Only the active GM can set up the premade library.');
  return withPremadeSetup(async()=>{
    const count=await ensureFolders();
    for(const seed of PREMADE_SEEDS)await seed();
    await removeStoneskinPremade();
    await removeEmptyAncestryFolders();
    await removeEmptyCommunityFolders();
    await removeObsoleteWitchSubclassFolder();
    await removeObsoleteWarriorSubclassFolder();
    return count;
  });
}
