# Daggerheart Premade Reference

How all 235 premades work by compendium

Daggerheart Premades 0.4.0   |   Daggerheart 2.10.8 / 2.10.9   |   October 7 2026

This reference explains how each premade works at the table: what you activate, what triggers automatically, which choices and costs appear, and what remains manual. It covers every entry in the nine module compendiums. Upgrades have their own entries even when they only enhance another feature.

Apply the matching premade with GM Medkit, or use a directly imported module premade. Plain system features do not automatically receive these feature-specific scripts. Subclass features must also be unlocked and active; Domain Cards must be available under the normal loadout rules. The card’s rules still govern narrative requirements and uses not changed by the automation.

Weapon and Armor Features are an exception: apply Medkit to the actual equipment, not to a separate feature dragged onto the character. These applications preserve the equipment’s native statistics, actions, effects, and resources. Supported missing weapon rules are appended to its description without replacing existing text.

## Compendium contents

- [Class Features   16 premades](#class-features)

- [Subclass Features   102 premades](#subclass-features)

- [Domain Cards   44 premades](#domain-cards)

- [Ancestry Features   19 premades](#ancestry-features)

- [Community Features   4 premades](#community-features)

- [Beastform Features   16 premades](#beastform-features)

- [Transformation Features   5 premades](#transformation-features)

- [Weapon Features   19 premades](#weapon-features)

- [Armor Features   10 premades](#armor-features)

Entries follow the compendium folders, then alphabetical feature names. Transformation Features also groups the entries by transformation. Weapon and Armor Features are listed alphabetically at their compendium roots. Use the linked contents above or GitHub’s document outline for quick access.

## Reading the automation

Optional prompts normally go to the online owner, with active GM fallback. Most gameplay decisions have a configurable countdown, defaulting to 60 seconds; the GM can pause all timers. Decline or cancel is normally free before commitment, but a cost already paid to prepare a later roll is not automatically refunded when that later roll is abandoned.

An active GM coordinates resource and effect changes. Range uses Daggerheart’s configured distances and token measurement, not fixed feet. Many proximity features need identifiable tokens on the relevant scene. Keep that scene displayed for the GM when using scene-based automation. The entries identify material targeting restrictions.

Critical successes count as rolls with Hope. Friendly rerolls intended to improve an action or reaction remain available on ordinary successes when the written trigger allows, but not on an already-critical result. Failure-only abilities remain failure-only. Defensive forced rerolls such as Danger Sense and Not This Time can still target enemy critical hits. Native d20 reactions have no Hope or Fear outcome.

Successful-attack benefits use the final resolved outcome, including a miss changed into a hit by another feature. Supported rerolls show the native reroll indicator on the chat-card dice. Hopeful armor can replace supported Hope payments with Armor Slots; it does not add Armor to the displayed Hope total or substitute for Hope spent to recover Armor.

## Class Features

16 premades

### Assassin

#### Marked for Death

After a successful weapon attack with exactly one hit adversary, the prompt offers marking 1 Stress to apply your mark before damage. A new mark replaces your previous one, not another Assassin’s. Damage against your marked target preselects the tier d4 bonus in Effects. Temporary-condition removal and any narrative benefits remain under normal table control.

### Brawler

#### Combo Strike

After successful Melee weapon damage against exactly one hit target, the prompt offers marking 1 Stress to roll your native Combo Die sequence. The complete sequence, including the terminating lower result, is added to the same damage before application. It uses your current Combo Die size; Flow State can offer Focus instead of Stress.

#### I Am the Weapon

Keeps the native Brawler’s Strike setup. Its +1 Evasion applies only when no weapon is equipped; equipping either a primary or secondary weapon suppresses that Evasion bonus automatically. An unequipped weapon in inventory does not suppress it. While no other weapon is equipped, Brawler’s Strike counts as your primary weapon for Forceful Push, Menacing Reach, and applicable weapon-attack features. Normal unarmed and Beastform attacks do not qualify. Each feature’s own range requirements still apply, and equipping a secondary weapon does not allow Brawler’s Strike to trigger Follow-Up.

### Ranger

#### Ranger's Focus

Use Prime Focus before a single-target attack to spend 1 Hope and create a visible primed effect. The next completed attack with a known target defense consumes priming; a hit places your Focus and replaces your previous one. Your sourced damage that makes the Focus mark HP also marks 1 Stress. A failed attack against your Focus offers ending it to reroll the Duality Dice. Direction finding remains narrative; linked companion attacks support these benefits.

### Rogue

#### Rogue's Dodge

Activate the native 3 Hope action for its normal Evasion bonus. The applied effect automatically expires when a finalized attack hits you, after defensive rerolls and Evasion choices, even if damage is not subsequently applied. Misses preserve it. Completing a short or long rest also removes it.

#### Sneak Attack

Successful attacks preselect the native tier-scaled damage bonus when you began the attack Hidden or Cloaked, a qualifying ally is within Melee of the target, or your Veil of Night separates you from that target. Concealment is captured before attack-based removal. On a shared damage roll, every hit target must qualify for automatic selection, though they may qualify by different routes. The Effects choice remains editable; no extra payment prompt is added.

### Seraph

#### Prayer Dice

Session refresh opens the native Prayer Dice roller for the owner to roll and save a new pool. Prayer Dice buttons on eligible rolled chat cards spend chosen saved dice to increase a roll or damage, or reduce incoming damage for a selected recipient. Other allies must be within Far. Use Give Hope from the sheet to spend saved dice through native Hope healing. Choose damage reduction before applying damage; spent dice do not undo earlier consequences.

### Sorcerer

#### Arcane Charge

Actual HP or Stress taken from magic damage grants a visible Charge; the sheet action can instead spend 2 Hope to create it. Charge ends on the next long rest. After a successful magic-damage attack, choose to consume Charge for +10 damage, shown in Effects, or +3 to an associated reaction Difficulty. Declining retains Charge.

#### Channel Raw Power

Once per long rest, Channel lets you select a loadout Domain Card to vault, then gain Hope equal to its level or prime twice its level as bonus damage. Eligible damaging spell or grimoire rolls can also offer channeling before damage configuration. The selected damage bonus appears in Effects and consumes priming when evaluation begins. Canceling damage or deselecting it preserves priming; magic weapons and ability cards do not qualify as spells.

#### Enchanted Aid

Use Enchanted Aid before another active Party member makes a Spellcast Roll. Spend 1 Hope and prepare a d8 advantage result on that ally; the highest eligible help or advantage die contributes, rather than adding all of them. Non-Spellcast actions leave this aid pending. After the helped roll displays, the Sorcerer may use the once-per-long-rest swap to exchange Hope and Fear results before consequences.

#### Volatile Magic

After magic attack damage dice display, an optional picker lets you spend 3 Hope to reroll any selected damage dice. Dice discarded by Powerful or Massive remain selectable, and the keep-highest result recalculates afterward. Unselected dice and flat modifiers stay intact. Combo Dice are excluded. One offer occurs per damage evaluation, before later damage-doubling choices.

### Warlock

#### Favor

Synchronizes the feature counter with native Favor, capped at 6. A successful action roll with Hope offers gaining Favor instead of the normal 1 Hope, including critical successes while preserving critical Stress clearance. Show Tribute to Patron is a short- or long-rest downtime move for eligible active Party Warlocks and grants Favor equal to Spellcast, capped at 6. Describe the tribute at the table.

#### Patron's Boon

After a failed roll, Roll Resolution offers spending 3 Hope to reroll with advantage, preserving modifiers and normal advantage cancellation. The replacement result is used before consequences. Unknown outcomes allow declaring failure, success, or declining independently. It is a failure-only benefit; an ordinary known success does not qualify.

#### Patron's Pact

Action-roll dialogs offer an optional Patron’s Pact selector. Choose it when the action relates to your patron’s sphere: spend 1 Favor for a d6 bonus, upgraded to d8 at level 5. Payment happens when evaluation starts, so closing configuration spends nothing. Reactions do not qualify. Whether the action relates to the patron remains a table decision.

### Witch

#### Witch's Charm

A failed action roll offers the rolling Witch or an eligible allied Witch within Far the option to spend 3 Hope. Acceptance makes the roll a noncritical success with Fear without changing the displayed dice or total, and updates successful targets so damage can proceed. Reactions and known successes do not qualify. Unknown results support failure declaration and a separate decline.

### Wizard

#### Not This Time

When an adversary within Far hits with an attack, offer spending 3 Hope to force a complete attack reroll before damage. Enemy critical hits remain eligible. A separate offer after adversary damage dice display rerolls the full damage formula before application. Each Wizard is offered once at each stage. Native hit outcomes and saved damage update; fixed damage without dice is excluded.

## Subclass Features

102 premades

### Beastbound

These features use the native Ranger and companion link. The companion remains its own attack source. Positive incoming companion damage normally marks one Stress; full Stress makes it unavailable. The first completed long rest returns it with one Stress cleared. Owner downtime that actually clears their Stress can share that recovery with the companion. Movement and hiding remain manual.

#### Armored

When the linked companion would mark Stress from damage, offer the Ranger’s owner marking one available Armor Slot instead. Native Armor sources, including effect-provided slots, are used. Declining leaves the Stress unchanged. Manual Stress edits and feature costs do not trigger this protection; no extra use counter is added.

#### Battle-Bonded

Incoming adversary attacks use +2 attack-specific Evasion for the Ranger when the linked, available companion is within Melee of the attacker. The card records the bonus without changing permanent sheet Evasion. No prompt or payment is added. An exhausted, defeated, dead, or unavailable companion cannot supply it.

#### Bonded

When the Ranger marks their last HP, automatically roll one d6 per unmarked companion Stress slot and mark all those slots. Any 6 clears the Ranger’s last HP. The roll is posted before resource updates. The companion becomes unavailable on full Stress. A companion that is already unavailable or has no free Stress cannot help; movement remains manual.

#### Creature Comfort

During a quiet moment, use Comfort Companion once per rest to choose Gain 1 Hope or Both Clear 1 Stress. Unusable choices are omitted, and canceling does not spend the use. The linked companion must be available. Whether the scene provides the required calm remains a table decision.

#### Loyal Friend

Once per long rest, attack damage that would mark the Ranger’s last HP or the companion’s last Stress offers redirecting it to the other member when the available pair is within Close. Acceptance spends Rush and applies the original packet through the protector’s own defenses. Already-spent Armor remains spent. Move the protector manually. Nonattack damage and tracker edits do not trigger it.

### Call Of The Brave

#### Courage

After final rerolls and outcome conversions, a failed action roll with Fear automatically grants 1 Hope alongside the ordinary Fear consequence and posts a chat notice. At maximum Hope the notice still identifies the trigger without exceeding the cap. Unknown outcomes ask whether the action failed. Reactions and critical successes do not qualify.

#### Rise to the Challenge

While you have 2 or fewer unmarked HP, action rolls automatically use a d20 Hope Die. There is no checkbox or resource cost. The chat card identifies the feature. Reaction rolls remain unchanged.

### Call Of The Slayer

#### Martial Preparation

The owner always sees Martial Preparation as a downtime move. Once that Warrior commits it, other active Party members may take it during the same rest. A Call of the Slayer Warrior adds a die to their normal Proficiency-capped pool; others receive a temporary d6 Slayer Die. Temporary dice join the pre-attack or damage prompt and expire on Session refresh without granting Hope. Allies must take the move before finishing downtime.

#### Slayer

Final action rolls with Hope, including critical successes, offer the normal Hope gain or one d6 Slayer Die if the Proficiency-capped pool has space. Before attack and damage rolls, choose how many dice to include; they are spent when evaluation begins, not when configuration opens. A die earned by an attack can be used on its later damage, not retroactively on the completed attack. Session refresh converts remaining stored dice to capped Hope.

#### Weapon Specialist

Before damage from a successful attack, offer spending 1 Hope to add one die matching the equipped secondary weapon’s damage die. It appears as a selected Effects bonus. If included Slayer Dice show 1s, a once-per-long-rest option rerolls those 1s. The action-roll reroll is not offered on an already-critical friendly result; damage rerolls remain eligible.

### Divine Wielder

#### Devout

Whenever you reroll Prayer Dice, manually or during session setup, roll one additional d4 and automatically discard exactly one lowest result before saving. The saved pool retains its normal size. While Devout is active, Sparing Touch gains one additional use per long rest without resetting uses already spent.

#### Sacred Resonance

With Spirit Weapon also active, damage from an equipped Melee or Very Close weapon automatically adds a second copy of each matching active damage-die result. Two 5s add 10 bonus damage; three 5s add 15. Discarded dice do not count. Original faces stay visible and the added total is noted on the damage card. There is no extra cost or prompt.

#### Spirit Weapon

For the additional-adversary option, equip a Melee or Very Close weapon and select exactly two different adversaries within Close before attacking. After confirming the roll dialog, the prompt offers marking 1 Stress to keep both targets on the same native attack. Declining cancels that two-target attack. Weapon, targets, range, and payment are rechecked; choose targets yourself rather than using a separate sheet action.

### Elemental Origin

#### Elementalist

Keep the native manual Bonus to Roll and Bonus to Damage actions, each costing 1 Hope. The +2 roll effect expires after the next completed action roll, not a reaction or canceled roll. The +3 damage effect waits for the next completed non-healing damage roll, including manually initiated damage, rather than disappearing at the attack result.

#### Natural Evasion

After a noncritical adversary attack hits, Roll Resolution offers marking 1 Stress and rolling a d6 to add to Evasion against that attack. Hit status recalculates before damage. No prompt appears if even a 6 could not turn the hit into a miss, or if the attack uses a different custom Difficulty. The bonus is not permanent Evasion.

#### Transcendence

Use Transform once per long rest and choose exactly two benefits: Severe Threshold +4, one trait +1, Proficiency +1, or Evasion +2. Choosing the trait benefit also requires selecting the trait. There is no HP or other resource cost. Two visible effects are created and both expire at the next short or long rest. Canceling spends no use.

### Executioners Guild

#### Ambush

Passively upgrades your native Marked for Death damage bonus from tier d4s to tier d6s. The existing Effects selection and automatic marked-target selection are preserved. No new action, cost, or tracker is added; the upgrade applies only while this subclass feature is available and enabled.

#### Backstab

Passively upgrades Marked for Death to tier d8s, taking precedence over Ambush without adding both bonuses. It does not require Ambush to be separately Medkitted. Native target marking, bonus selection, and critical damage remain in control.

#### Death Strike

After your attributed damage makes a target mark 3 or more HP after reductions, offer marking 1 Stress to make that target mark 1 additional HP. A full target HP track does not prompt. The extra HP is recorded with the applied damage and announced in chat. Manual tracker edits without a damage source cannot trigger it.

#### First Strike

The first successful targeted attack automatically spends its scene use and marks that attack card for double damage. Misses leave the use available. Damage doubles after damage reroll choices, including critical damage and other bonuses, before application. Native Scene refresh restores the use; no decision prompt is added.

#### Scorpion's Poise

Attacks against you from a creature bearing your own active Marked for Death use +2 attack-specific Evasion. Another Assassin’s mark does not qualify. The adjusted defense follows hit detection and rerolls and appears in the attack card’s notes. Permanent Evasion and unrelated explicit Difficulties stay unchanged.

#### True Strike

After a failed attack, Roll Resolution offers spending 1 Hope and the once-per-long-rest use to make it succeed. Dice, total, and Hope or Fear remain unchanged; normal hit and damage processing resumes. Unknown outcomes allow failure declaration or decline. A later reroll replaces this success conversion.

### Hedge

#### Circle of Power

Use Mark Circle to place Spellcast-trait tokens and automatically create a true circular Very Close region fixed at your current position. You and allies inside receive +2 thresholds, attack rolls, and Evasion. Each affected character action roll spends a token; finalized evades spend one per affected ally. At zero tokens, or when the Witch leaves the original area, the region and bonuses end.

#### Enchanted Talisman

Once per rest, Prepare Talisman lets you choose an active Party holder and a bounded amount of Hope to spend. That amount becomes tokens, with a visible effect on the holder. When damage would mark HP after earlier reductions, the holder may spend one token to prevent 1 HP. The last token removes the effect; the source Witch’s rest clears any remaining tokens and effect.

#### Herbal Remedies

Consumable healing applied to the Witch or an active Party ally in the same scene automatically clears 1 additional marked HP or Stress for each qualifying recovery type. The bonus follows saved healing cards and manual Apply Healing. It does not affect spells, downtime, tracker edits, or off-scene recipients. No bonus is added when there is nothing left to clear.

#### Vexing Malison

Attack rolls automatically gain advantage if at least one target has an active native Hex effect. Existing disadvantage cancels normally. The blanket manual advantage reminder is removed so it cannot be selected against un-Hexed targets. Nonattack and reaction rolls do not receive this benefit.

#### Walk Between Worlds

Make the native Spellcast Roll against 13 during a moment of calm. On success, spend the once-per-rest use, mark 1 Stress, and gain tokens equal to Spellcast. Click Answer Question whenever a spirit answers to remove one token. The last token or Scene refresh ends the visit. Spirit answers and returning to the original position remain manual.

### Juggernaut

#### Eye for an Eye

Once per rest, after adversary damage makes you mark HP, an attacker within Melee can trigger a prompt to mark 1 Stress and make that adversary mark the same finalized HP amount. Armor and other reductions happen first. Fully prevented or source-less damage does not qualify. Range must be measurable from unambiguous tokens; the retaliation is direct HP marking.

#### Not Done Yet

Each finalized Severe damage application offers Gain 1 Hope, Clear 1 Stress, or decline. Benefits that cannot be used are omitted. There is no additional payment or limited-use tracker. Pre-reduction severity and ordinary manual HP edits do not trigger it.

#### Overwhelm

After a successful targeted attack, each hit target can offer spending 1 Hope to make it mark 1 Stress or throw it up to Close. Stress is applied automatically; throwing only posts a reminder and requires manual movement. Earned attack Hope is available. Unknown target defenses do not generate an automatic offer.

#### Pummeljoy

Critical Melee weapon attacks automatically grant one extra Hope, clear one extra Stress, and add +1 Proficiency to that attack’s damage. Native critical calculation and automatic or deferred damage are preserved. Persistent sheet Proficiency does not change. Brawler’s Strike qualifies when recognized through I Am the Weapon.

### Martial Artist

Enter stances through their sheet actions and pay the native Focus cost, or the offered Stress alternative with Flow State. Normally only one stance is active. Ongoing stance effects end when replaced, after finalized Severe damage, when your last HP is marked, or on Scene refresh. Some bonuses already saved to an attack card remain attached to that attack’s damage.

#### Aggressive

Enter the stance with its native cost. Its effect applies −1 Evasion. Successful targeted attacks add one damage die and discard the single lowest active result across the damage pool. A single die size is automatic; mixed pools ask which size to add. The extra and discarded results remain part of the damage roll.

#### Crushing

While the stance is active, dealing finalized Severe damage offers spending 1 Hope to make the target mark 1 additional HP. The prompt follows reductions and excludes full HP tracks. Earned attack Hope can pay for it. The additional HP is included in the damage receipt and chat notice.

#### Defensive

While the stance is active, attackers within Melee receive disadvantage. Before opening their roll dialog, the stance owner can mark 1 Stress to waive this source for that attack. Other disadvantage sources still apply. Declining keeps the disadvantage. An accepted Stress payment is committed even if the attacker subsequently cancels configuration.

#### Exacting

While the stance is active, active damage dice showing 1 automatically become their die maximum before damage is posted or applied. Mixed dice sizes, manual dice entry, and multiplied damage are supported. Healing and resource rolls are unaffected. No additional prompt or cost is added.

#### Favored

When entering this stance, choose a trait with its current value displayed. The stance adds that trait value to damage while retaining the native Focus entry cost. Canceling the chooser keeps the previous stance and spends no Focus. The chosen effect follows normal stance expiration.

#### Flow State

Stance entry offers paying with Focus or Stress rather than permanently rewriting action costs. Only affordable choices appear, and canceling leaves the stance unchanged. Combo Strike also offers 1 Focus instead of 1 Stress. Favored still asks for its trait. This feature changes payment options, not stance benefits or their normal expiration.

#### Grappling

While active, a successful attack against a target within Melee offers Restrain or Throw up to Close, paying 1 Focus or marking 1 Stress. Restrained is applied as a temporary effect; remove it when the table determines it ends. Throwing and token movement remain manual. The stance follows normal expiration.

#### Honed

After confirming an attack dialog but before rolling, offer spending 1 Focus for +1 Proficiency on that attack’s damage. A miss still spends accepted Focus; canceling configuration before the prompt spends nothing. The bonus follows the attack card into automatic or deferred damage without changing global Proficiency.

#### Invigorating

While active, each successful targeted attack automatically rolls one d4, once even if several targets are hit. A 4 grants 1 Focus, capped at 6 and synchronized with the Focus tracker. The roll and gain are announced in chat. There is no additional choice, cost, or use counter.

#### Isolating

Attacks gain advantage when no third living character or adversary is within Very Close of either you or the target. The attacker and target are excluded from that proximity check. All targets of a shared roll must qualify. Normal advantage cancellation applies; there is no extra payment prompt.

#### Keen Defenses

Before an incoming attack rolls, offer spending 1 Focus for an attack-specific Evasion bonus equal to tier. No stance needs to be active. It can stack with Vigilant, survives later attack rerolls, and does not change permanent Evasion. The decision is made before the attack result is known.

#### Otherwordly

After a successful targeted attack while the stance is active, choose Physical or Magic for its damage. The choice follows the native damage dialog, card, bonuses, and resistance handling. There is no extra cost; canceling or allowing the prompt to expire keeps the original damage type.

#### Quick

After confirming a targeted attack’s roll dialog while this stance is active, choose one additional visible creature within that attack’s range. Pay 1 Focus or mark 1 Stress to include it in the same attack and damage workflow. No offer appears without an initial target, a valid extra target, or an affordable payment.

#### Scary

While the stance is active, each successfully hit actor automatically marks 1 Stress, once for that attack, with a chat notice. Missed targets do not receive it. There is no additional payment or decision beyond native stance entry.

#### Stable

While the stance is active and Focus is available, the native damage-reduction dialog offers spending 1 Focus instead of marking one selected Armor Slot. The selected severity reduction is retained. Payment occurs only on confirmation. Stable and Celestial Wings are alternative payments for the same slot, not two reductions.

#### Stance Fighter

The 0–6 Focus tracker mirrors the native actor resource. Use Refocus during a moment of calm, once per rest, to clear Focus, roll Instinct d6s, keep the highest, and gain that amount. No positive Instinct means no roll or use spent. Rest refreshes the action use but does not clear stored Focus.

#### Vigilant

While active, before an incoming attack rolls, offer marking 1 Stress and rolling a d6 for attack-specific Evasion. The choice does not depend on hit or critical status because the result is not yet known. The bonus persists through rerolls but ends with that attack, leaving permanent Evasion unchanged.

### Moon

#### Ire of Pale Light

A Hexed adversary on the Moon Witch’s scene automatically marks 1 Stress when a finalized attack misses at least one target. It works with manually entered d20 results and waits for defensive resolution. Critical attacks, reactions, and attacks hitting every target do not trigger it. Native Very Far is the range category beyond Far; the implementation uses finite same-scene distance.

#### Lunar Phases

Session refresh prompts rolling a d6 and enables one phase: New on 1, Waxing on 2–3, Full on 4, or Waning on 5–6. Waxing grants +2 damage, Full +3 thresholds, and Waning +1 Evasion. New adds a native damage-reduction choice to spend 1 Hope to negate Minor damage, with a severity preview. Once per rest, Advance Phase spends 1 Hope to advance one result, wrapping 6 to 1.

#### Moonbeam

Use Conjure Moonbeam once per session to automatically place a circular Close region and linked pale-blue ambient light at your token. You and allies inside gain +1 to Spellcast Rolls through the region effect. Scene refresh removes the region, light, and remaining effects together. Seeing through illusions remains a table decision.

#### Night's Glamour

Keeps the native Spellcast Roll against 13 and Glamoured effect. An adversary within Close that commits an attack against the Glamoured Witch automatically marks 1 Stress. After the Witch actually marks HP or deals damage, prompt marking 1 Stress to maintain Glamour. Declining or being unable to pay removes it. One outgoing damage event prompts once, even with several targets.

### Nightwalker

#### Adrenaline

While you are Vulnerable, damage rolls automatically select the native bonus equal to your current level. It is deselected when Vulnerable ends or on healing rolls. There is no activation or prompt. Disabling the premade or making the feature unavailable stops automatic selection.

#### Vanishing Act

Use the native Mark Stress action to become Vanishing Act Cloaked and automatically clear Restrained. Incoming attacks have disadvantage and the effect qualifies for Sneak Attack. Making an attack does not remove this particular Cloaked effect. It expires after a final resolved action roll with Fear or your next short or long rest; a Fear-to-Hope conversion preserves it. Reaction rolls do not expire it.

### Pact of the Endless

Patron Dice use d6 through level 4 and d8 from level 5. Favor payments use the character’s current native resource, not a separate subclass pool.

#### Damage Sink

Before thresholds, resistance, and Armor reduction, positive incoming damage offers spending 1 Favor and the once-per-rest use to halve the raw amount, rounded up. Physical, magical, mixed, and untyped packets can qualify. Declining changes nothing. The source damage card stays unchanged because reduction belongs to this recipient.

#### Dark Aegis

After reduction determines incoming HP marks, offer spending 1 Favor and the once-per-long-rest use to prevent all those HP. Other resource damage is unchanged. This runs before smaller HP-prevention choices and can also handle manual damage marking; healing and feature HP costs are excluded. Declining leaves other protection options available.

#### Deathless Embrace

Use Spend Favor once per rest and choose an affordable amount. Roll that many Patron Dice and clear 1 marked HP for each result of 4 or higher. Patron Dice are d6 through level 4 and d8 from level 5. The public roll reports the payment, qualifying results, and actual healing, capped by marked HP.

#### Draining Bane

Before an adversary attacks you or an ally within Very Close, offer spending 1 Favor. At evaluation, clear 1 of your Stress, mark 1 Stress on the adversary when possible, and apply Drained. Its d20 attack pool becomes d12s, preserving advantage or disadvantage. Drained remains through successes and expires after the adversary’s next finalized failed roll; unknown outcomes do not expire it.

#### Harrowing Invocation

Before an adversary attacks you or an ally within Very Close, offer spending 1 Favor to impose disadvantage. Payment commits only when the attack evaluates; canceling the roll spends nothing. Normal advantage cancellation applies. If the finalized attack fails against every target, the adversary marks 1 Stress and the card records it.

#### Patron's Mantle

Manually spend 1 Favor through the native action to apply the mantle. It preserves the native tier bonus to damage thresholds and contextual intimidation advantage. The effect automatically expires after you take finalized Severe damage or the scene ends. Whether an action is intimidation remains a table decision.

### Pact of the Wrathful

Patron Dice use d6 through level 4 and d8 from level 5. The subclass uses the existing Favor pool. Bounded choices prevent spending more Favor than remains.

#### Deadly Vengeance

After attack damage actually makes you mark HP, offer spending 1 Favor to roll one Patron Die per finalized HP marked. Each result of 4 or higher makes the recorded attacker mark 1 HP, up to its remaining capacity. Armor, redirection, and prevention resolve first. Damage without an identifiable attacker and plain tracker edits do not trigger it.

#### Diminish My Foes

After final rerolls, a successful action roll with Hope, including a critical, offers selecting a successful target and a bounded amount of available Favor. Spend that Favor to make the target mark equal Stress. Excess Stress uses native overflow handling. The prompt cannot spend more than the current balance; the sheet action is only a reminder.

#### Fearsome Attack

After damage dice and earlier reroll decisions, choose damage dice and spend 1 Favor to reroll them. Discarded Powerful or Massive dice are eligible, and keep-highest recalculates; eligible Combo Dice are also supported if present. The picker repeats while Favor remains until you keep the damage. Manipulate Magic follows this loop. Favor is spent only for an actual selection.

#### Menacing Reach

Spend 1 Favor to bind the effect to your currently equipped primary weapon and increase its displayed range by one step, up to Very Far. Brawler’s Strike also qualifies while no other weapon is equipped. The next finalized successful attack with that weapon removes the effect and restores its range. Misses and other weapons preserve it. Targeting and range adjudication remain player-managed; unrelated later weapon-range edits are preserved.

#### Otherworldly Ire

Once per rest after positive damage resolves, select an affordable Favor amount and roll that many Patron Dice. The highest result is the maximum number of nearby creatures you may choose in one checkbox window. Choose any number up to that maximum within Close; each marks 1 HP. Canceling target selection before application refunds Favor and the rest use.

#### Patron's Fury

Spend 1 Favor to activate Fury. Non-healing damage automatically includes Patron Dice equal to tier, selected in Effects: d6 through level 4 or d8 from level 5. The effect ends after your applied damage actually causes Severe HP damage or on Scene refresh. A high raw damage total reduced below Severe does not end it.

### Poisoners Guild

Apply Toxic Concoctions to use its shared token pool and picker. Poison Compendium, Twin Fang, and Venomancer extend that workflow when unlocked and enabled; they do not create independent poison counters.

#### Poison Compendium

Expands Toxic Concoctions with Midnight Vine and Gorgon Root, each costing one existing token. Midnight Vine imposes attack disadvantage; deleting its applied effect through the GM marks 1 Stress before removal and fails if payment is unavailable. Gorgon Root applies temporary Restrained. Other temporary poison endings remain table-managed.

#### Toxic Concoctions

Use Gain Tokens to mark 1 Stress, roll d4+1, and add poison tokens; long rest clears unused tokens. After a successful weapon attack with exactly one hit target, spend a token for Ghost Petal’s Vulnerable, Grave Spore’s 1 Stress, or Leech Weed’s selected +1d6 damage. Decline is free. Later Poisoners Guild features expand this same picker.

#### Twin Fang

When the successful single hit target has an active Marked for Death and at least two poison tokens are available, Toxic Concoctions offers a second, different poison in the same picker. Each poison costs one token. Duplicate, stale, or unaffordable selections are rejected without granting a free second poison.

#### Venomancer

Adds three one-token options to Toxic Concoctions: Blight Seed reduces Major and Severe thresholds by 3 without stacking, Fear Leaf adds the attack’s resolved Fear Die result to damage, and Corpse Thorn gives reaction disadvantage. Blight Seed and Corpse Thorn have scene-duration effects. Fear Leaf is a selected damage bonus and can coexist with Leech Weed.

### Primal Origin

#### Manipulate Magic

For a spell or magic-damage weapon attack, use Extend Range or Additional Target manually from the sheet before acting; each marks 1 Stress and creates a one-action marker that suppresses the other options. Without a marker, +2 to the action result is offered after dice display unless every target already succeeded. Declining preserves the later option to mark 1 Stress and double one active damage die, after rerolls. Only one modification applies; range and extra-target adjudication remain manual.

### School Of Knowledge

#### Adept

For each selected Experience, the roll dialog’s Cost section offers normal 1 Hope payment or marking 1 Stress to double that Experience’s modifier. Payment commits when the roll begins, not when the dialog opens. Canceling spends nothing. Stress uses the shared marking workflow, so eligible prevention features can participate.

#### Honed Expertise

After confirming an action-roll dialog, roll one d6 for each selected Experience still costing Hope. Each 5 or 6 waives only that Experience’s Hope cost before the action dice evaluate. Experiences paid with Stress through Adept are excluded. Results are shown together in chat and dice animation; no extra resource or decision is needed.

#### Perfect Recall

When moving a Domain Card out of the vault with a positive Recall Cost outside a rest, offer the once-per-rest use to reduce that cost by 1. The reduced amount enters the normal Recall payment. Canceling payment refunds the reserved feature use. Post-rest Choose Loadout remains free and does not need this discount.

### School Of War

Face Your Fear is the base damage feature. Fueled by Fear and Have No Fear upgrade its single selected bonus rather than adding multiple independent bonuses.

#### Conjure Shield

The native conditional effect adds current Proficiency to Evasion while you have at least 2 Hope and stops applying below 2. Its icon always remains visible as a reminder. No extra activation, resource payment, or decision prompt is added by the premade.

#### Face Your Fear

A successful noncritical attack action roll with Fear automatically selects +1d10 damage in the Effects section. At least one successful target is enough on a multi-target attack. Critical successes count as Hope and do not qualify. Reaction attacks do not qualify, including with Fueled by Fear or Have No Fear. The bonus works with automatic and deferred damage; there is no separate activation cost.

#### Fueled by Fear

Passively upgrades the active Face Your Fear damage bonus to 2d10. It uses the same successful Fear-attack trigger and Effects entry without adding a second bonus or prompt. Face Your Fear must remain active.

#### Have No Fear

Passively upgrades the active Face Your Fear bonus to 3d10, superseding Fueled by Fear. It uses the same successful Fear-attack trigger and does not stack all three bonuses. Face Your Fear must remain active.

#### Thrive in Chaos

After normal damage and reduction finish for a successful attack target, offer marking 1 Stress to make that target mark 1 additional HP. The target must still be alive, conscious, and able to mark another HP. There is one offer per attack. Targets killed by the ordinary damage do not prompt.

### Syndicate

#### Contacts Everywhere

Use Call Contact once per session. Choose a narrative gold, tool, or object benefit; +3 to either Hope or Fear on the next action roll; or a sniper’s selectable +2d8 on the next damage roll. Mechanical choices create visible pending effects. The die choice changes total and outcome before resolution; reactions do not consume it. Sniper consumes only when its damage bonus is selected. Reliable Backup adds another choice.

#### Reliable Backup

Upgrades Contacts Everywhere to three uses per session without resetting spent uses. When you would mark HP, offer spending one Contacts use to prevent 1 HP before later consequences. Its Presence benefit is chosen inside Contacts Everywhere: prime a d20 Hope Die for the next Presence action roll. Other traits and reactions leave that marker unconsumed.

### Troubadour

#### Gifted Performer

Relaxing Song and Heartbreaking Song automatically target you and qualifying allies within Close. Epic Song retains native targeting. Native healing, Hope, effects, and the separate once-per-long-rest uses for all three songs are preserved. Select the intended performer token when several copies exist; range uses the scene’s configured distances.

#### Maestro

When your native Rally effect grants a die to another character, that recipient may gain 1 Hope, clear 1 Stress, or decline. Unusable choices are omitted. Each awarded die offers its benefit once, with a chat note. Self-awarded Rally Dice do not trigger it. Rally includes the active Party; no extra resource is added.

#### Virtuoso

While available and enabled, Gifted Performer songs have two uses each per long rest. Already-spent uses are preserved instead of resetting the songs. Disabling, removing, or losing access to Virtuoso restores the previous limits. It works with native Gifted Performer or its premade.

### Vengeance

#### Act of Reprisal

When an ally within Melee marks HP from an identified adversary’s damage, a visible effect records that adversary. Your next successful attack against it consumes the record and saves +1 Proficiency for that attack’s damage; misses preserve it. Different adversaries are tracked separately. Mixed marked and unmarked targets need separate damage to avoid sharing the bonus improperly.

#### Loyal Protector

When an ally within Close has only 1–2 unmarked HP and is about to take damage, offer marking 1 Stress to intercept it. Move beside the ally manually before confirming. The packet redirects before the ally’s defenses, and you use your own resistance, thresholds, and Armor. Recursive protection is blocked. Plain HP edits and Stress-only costs do not qualify.

#### Nemesis

Target one adversary and use Prioritize Adversary to spend 2 Hope and record it until your next short or long rest. A new choice replaces the old one. Attacks against that adversary offer a free Hope and Fear results swap before consequences, once per resolution. Either direction is allowed; tied dice and reactions are excluded.

#### Partner-in-Arms

When an ally within Very Close takes damage, offer marking one of your available Armor Slots to reduce their severity by one threshold. This occurs after their Armor dialog and before later HP prevention. Minor can become None. You cannot protect yourself. Multiple eligible bearers may each help while damage remains; manual HP edits are excluded.

#### Revenge

After defensive resolution, a successful adversary attack from within Melee offers marking 2 Stress to make the attacker mark 1 HP directly. You need not take HP damage from the hit. This is HP marking, not a damage roll, so Armor and resistance do not reduce it. There is no additional use counter.

### Warden of Renewal

#### Clarity of Nature

Use Distribute Stress Relief once per long rest and allocate up to Instinct total among yourself and active Party members, capped by each recipient’s marked Stress. Confirming applies the recovery and posts a summary; an empty allocation or cancel spends nothing. Select only participants in the required few minutes of calm within the Close space; that narrative qualification is not measured on the canvas.

#### Defender

While you are in native Beastform, an ally within Close who would mark at least 2 HP can trigger a prompt to mark 1 Stress and prevent 1 HP. Armor and earlier HP prevention resolve first. You cannot protect yourself. Multiple Wardens can help in sequence while at least 2 HP remain. Damage and manual HP marking are supported.

#### Warden's Protection

Use Protect Allies once per long rest, spending 2 Hope and rolling d4 to set the maximum number of injured friendly allies within Close. Choose up to that many; each clears up to 2 HP. The caster is excluded. Choose Later preserves the roll and payment for reopening the picker. Range rechecks on application, so keep the relevant tokens on the GM’s scene.

### Warden of the Elements

#### Elemental Aura

Activate Aura once per rest while channeling Elemental Incarnation; it ends with that specific channel. Fire adds Stress when Close adversaries mark HP. Earth gives other Close allies +1 Strength and updates on movement. Water offers marking 1 Stress after a Close adversary damages you, with movement manual. Air automatically rolls d8 to reduce attack damage to you or Close allies when the attacker is beyond Melee. No Active Auras dependency is needed.

#### Elemental Dominion

Passively follows the current Incarnation. Fire adds +1 Proficiency to damaging attacks and spells. Earth rolls one d6 per incoming HP and prevents one for each 6 before severity consequences. Water offers marking 1 Stress after being hit to make the attacker temporarily Vulnerable. Air maintains +1 Evasion; apply Flying manually. Ending Channeling ends these benefits.

#### Elemental Incarnation

Each self-targeted Channel action marks 1 Stress and replaces the previous element. Earth retains native Proficiency-scaled threshold bonuses. Air grants Agility advantage. Fire retaliates with d10 magic damage when a Melee adversary damages you. Water marks 1 Stress on other nearby adversaries when you damage a Melee adversary. Channeling ends after finalized Severe damage or the next rest; Fire still retaliates on the hit that ends it.

### Wayfinder

#### Apex Predator

Before an attack against your current Focus, optionally commit 1 Hope. Payment occurs only when evaluation starts. If the final attack succeeds against that recorded Focus after rerolls and defenses, remove 1 GM Fear. No offer appears with no Hope or no Fear. Reactions and another Ranger’s Focus do not qualify; the card records settlement.

#### Elusive Predator

When your current Focus attacks you, use +2 attack-specific Evasion automatically. The bonus follows target hit detection and rerolls and is displayed on the card without changing sheet Evasion. Another Ranger’s Focus, reactions, and unrelated explicit Difficulties do not qualify. There is no prompt or additional cost.

#### Ruthless Predator

Before damage configuration, offer marking 1 Stress for +1 Proficiency on that damage roll. It is roll-local, supports automatic and deferred damage, and is committed before the damage dialog. Independently, your sourced damage that makes an adversary mark at least 3 HP also marks 1 Stress on it. Linked companion damage can inherit the feature.

### Winged Sentinel

The relevant flight benefits read the actor’s Flying condition. Apply it when the character flies; merely having a flying description or moving a token does not activate that status.

#### Ethereal Visage

With Flying applied manually, Presence rolls gain advantage through normal cancellation. Separately, a successful Presence action roll with Hope offers removing 1 GM Fear instead of gaining the normal Hope. That substitution does not require Flying and is still offered at maximum Hope. Critical successes qualify while retaining their Stress clearance.

#### Power of the Gods

Passively upgrades Wings of Light from d8 to d12. While both features are active and you are Flying, the same successful-attack prompt spends 1 Hope and selects +1d12 damage. No separate action, payment, or bonus is added. Disabling the upgrade returns Wings of Light to d8.

#### Wings of Light

Apply Flying when taking flight. A successful attack while Flying offers spending 1 Hope for a selected +1d8 damage bonus, including automatic damage. One or more hit targets can qualify on a shared attack. Carrying another willing creature, its contextual Stress cost, and movement remain manual. Power of the Gods upgrades the same bonus.

### Wordsmith

#### Eloquent

Target one ally and use Grant Extra Downtime Move, spending the once-per-session use to apply a visible effect. It grants one extra short-rest activity during a short rest or one extra long-rest activity during a long rest, and clears after completing that rest. Apply it before opening downtime. Other Eloquent benefits remain manual and share the same use.

## Domain Cards

44 premades

The current Domain Cards premades cover selected level 1, 2, and 3 cards. Native spell, grimoire, and ability mechanics are preserved unless an entry describes a specific change. Other cards in the system’s domain browser are not part of this premade catalog.

### Arcana

#### Cinder Grasp

The native cast, 1d20+3 magic damage, and temporary On Fire effect remain. After a burning creature completes an action, it automatically takes 2d6 magic damage if the captured effect is still active. Direct action trait and Spellcast rolls also qualify; reactions, canceled rolls, and separate damage rolls do not. Removing or disabling On Fire stops the damage. Use On Fire: Damage only as a manual fallback for narrative actions outside Foundry, not again after an automated trigger.

#### Counterspell

The GM marks individual adversary actions as Counterable magical effect in action settings → Base, or the NPC’s main attack in NPC settings → Attack. Before a marked action begins—including before its attack roll—eligible characters can Interrupt or Pass through Pending Decisions. Interrupt uses a native Spellcast reaction roll against the caster’s Difficulty. A success, including a critical, vaults Counterspell without a Stress cost and stops the entire original action; failure or passing lets it proceed. Other eligible holders may try after a failure. Manual activation defaults to the Difficulty of one targeted adversary, or asks the GM when unknown; narrative interruption remains GM adjudication. Reactions grant no Hope/Fear outcome benefits.

#### Flight

A successful native Cast sets tokens to current Agility, minimum 1, and applies Flying automatically. Each completed action roll spends one token after its full workflow, keeping Flying through the final action; zero removes this card’s Flying effect. Reactions, separate damage rolls, no-roll actions, and canceled rolls do not spend tokens. Spend Token remains available for manual bookkeeping. Successful recasts replace the flight and pool; a failed recast consumes an existing token, while cancellation preserves it. Movement and descent remain manual.

#### Rune Ward

Use Infuse Ward on one active Party character, or with no target to ward yourself. The holder receives a visible charged effect. Before native damage reduction, the holder may spend 1 Hope and roll d8 to subtract from incoming damage. An 8 still reduces this damage, then replaces Charged with Drained. The source character’s next completed short or long rest recharges the current holder’s ward for free.

### Blade

#### Not Good Enough

After damage dice display, a free optional picker offers every damage die showing 1 or 2, including dice discarded by Powerful or Massive. Choose any subset; all begin selected. Keep or drop modifiers recalculate after replacement, and replacement 1s or 2s are kept. This occurs before Volatile Magic, Fearsome Attack, and Manipulate Magic.

#### Reckless

Activate Mark a Stress manually to pay 1 Stress and apply the visible Reckless effect to yourself. It automatically gives advantage on your next completed attack roll, then expires whether the attack hits or misses. Canceling preserves it. Normal advantage cancellation applies; unrelated trait, reaction, and damage rolls do not consume it.

#### Scramble

Before any damage reduction, incoming damage from a creature within Melee offers Avoid or Decline. Accepting consumes the native once-per-rest use and prevents the whole damage packet before resistance, Armor, or other reductions. Move out of Melee manually. Declining leaves normal damage handling unchanged. Canceled damage, unknown sources, and creatures outside Melee do not trigger it; ordinary rests refresh the use.

#### Versatile Fighter

While this card is in the Loadout, bringing it into the Loadout or equipping a new weapon opens an untimed choice of attack trait for the relevant equipped weapons. Choose any trait or keep the native trait; vaulting the card, disabling it, or unequipping the weapon restores native behavior without rewriting its base statistics. Before attack damage rolls, optionally mark 1 Stress to set one selected damage die to its maximum. Bonus dice and Powerful/Massive dice are included; only one die is maximized, and native keep/drop rules still apply. Cancellation pays nothing.

#### Whirlwind

After a successful attack against a target within Very Close, spend 1 Hope to add other eligible visible, living adversaries within Very Close to the same attack card. Added targets are checked against the final attack result. Original hits take full damage; added hits take half the final damage, rounded up before reductions. No second attack or manually placed template is needed.

### Bone

#### Deft Maneuvers

Activate manually once per rest, retaining the native 1 Stress cost. The action targets only yourself and creates the +1 attack-roll effect. It expires after your next completed attack, hit or miss, but not after other rolls or canceled attacks. Movement and whether the attack meets the card’s Melee condition remain manual.

#### Ferocity

After your sourced damage actually makes an adversary mark HP, offer spending 2 Hope for a visible Evasion bonus equal to the HP actually marked, accounting for reductions and the target’s remaining HP. It expires after the next completed attack against you, hit or miss, after defensive decisions resolve. Canceled attacks preserve it. Unattributed HP tracker edits cannot identify the source and do not trigger the benefit.

#### I See It Coming

Before an incoming attack rolls, after its roll dialog is confirmed, offer marking 1 Stress and rolling d4 for attack-specific Evasion. The attacker must actually be beyond Melee; a ranged weapon used inside Melee does not qualify. It can stack with other defenses and survives rerolls. Because the choice is before the result, it is not filtered by whether +4 would avert that future hit.

#### Strategic Approach

A long rest replaces the card’s tokens with your current Knowledge, minimum 1. Under this game’s interpretation, a configured attack against an adversary within Close offers spending one token before rolling for advantage, +1d8 damage, or clearing 1 Stress on an eligible friendly ally within Melee of that adversary. The advantage applies to this attack; the damage bonus stays attached to its card for automatic or later Roll Damage. Declining spends nothing. The automation checks current range, not movement history or whether this is the first approach.

#### Tactician

When an ally claims your prepared ordinary Help an Ally, you may spend 1 Hope and select one of your Experiences to add its modifier separately from the Help advantage die. Whether the Experience applies is adjudicated normally; declining leaves ordinary Help unchanged. When you use the native Tag Team Roll dialog, your own eligible action roll uses a d20 Hope Die. This does not change ordinary rolls, reactions, damage, or your teammate’s Hope Die.

### Codex

#### Book of Ava

Keeps all four native grimoire actions. Tava’s Armor retains Hope payment, targeting, +1 Armor Score, and next-rest expiration. A completed recast removes that card’s previous armor across recipients while preserving the new application and other casters’ armor. Native manual effect application also replaces older copies. Canceling a cast preserves existing armor; the other spells use their native workflows.

#### Book of Illiat

Keeps all three native grimoire actions. Slumber expires only when applied damage actually makes the recipient mark HP, or damage Stress for a companion. Fully prevented, canceled, or redirected damage leaves sleep intact. Telepathy and other effects are untouched. The GM’s Fear-spend option to end Slumber remains native or manual.

#### Book of Korvax

Rune Circle spends the native 1 Stress and automatically places a fixed, circular Melee-sized Region centered on the caster. Adversaries initially inside take 2d12+4 magic damage; entering later triggers a fresh roll with normal defenses. Moving within the circle does not repeat damage, but exiting and re-entering does. The Region persists through rests, scene refresh, and later casts; the GM deletes it to end the circle. Multiple circles can coexist. Levitation and Recant remain native, and knockback remains manual.

#### Book of Norai

A successful Fireball — Cast automatically starts the native Explosion against all living creatures within Very Close of the original target, including allies and the caster. The explosion requires no second attack roll or placed template. Native multitarget reaction handling controls Reaction Difficulty 13 and half damage on a successful reaction; Proficiency d20+5 magic damage and reductions remain native. The separate Explosion sheet action is a reminder. Mystic Tether is unchanged.

#### Book of Sitil

Parallela keeps its native cast and 2 Hope cost. After your next completed attack’s final roll decisions and dice display, choose one extra creature within that attack’s range that the final result would hit. It joins the same native attack, damage, and effects without another attack roll. The held spell expires after that attack even if you decline or no extra target qualifies; canceling the attack preserves it. Recasting replaces the caster’s previous held spell. Other grimoire spells remain native.

### Dread

#### Blighting Strike

Use the single native Spellcast attack: Proficiency d6+1 damage with Hope, including criticals, or d10+1 with Fear. Hits receive a visible Blighted marker. Their next successful attack consumes it and deals half damage, rounded up before recipient reductions, for automatic or deferred damage. Misses preserve Blighted. Failed casts prompt spending 1 Hope or marking 1 Stress; unknown or unpaid consequences require resolving the choice.

#### Hideous Retribution

After a friendly ally within Close actually takes sourced damage from a visible creature, offer a native reaction roll using your Spellcast trait against that source. The attacker has no additional Close-range restriction. A success marks 1 Stress before dealing Proficiency d6 magic damage; failure, cancellation, and decline cost nothing. Native roll configuration, rerolls, and damage remain available. The retained Reaction Roll action handles narrative or otherwise unattributed damage manually.

#### Shared Trauma

Target two creatures within Melee and use Transfer Suffering. One dialog chooses the donor, recipient, and a bounded number of HP; other creatures’ owners consent when needed. The donor marks HP before the recipient clears the same number, consuming the native limited use. This is a fixed HP cost, not a typed damage roll: Armor, resistance, and damage-prevention features cannot reduce it. Supported nonpreventing damage-taken reactions still fire. If healing fails after the cost is paid, the module asks for manual completion rather than undoing or repeating the transfer.

#### Siphon Essence

Use the native Spellcast Roll attack and its once-per-long-rest successful use. A success with Fear automatically adds +1 Proficiency to that attack’s damage; criticals count as Hope. After applying the attack’s damage and reductions, automatically clear HP on the caster equal to the HP the successful target actually marked, capped by both tracks. Later chat-card Apply Damage is supported. Manual HP edits and redirected damage suffered by someone other than the successful target do not heal the caster.

#### Terrify

The native attack, Stress damage, and flee option remain. The temporary Vulnerable effect applies only when the attack succeeds with Fear; a Hope success or critical does not apply it. Final converted hits are recognized. Moving a fleeing target remains manual.

#### Umbral Veil

Use Mark Stress once per rest to add tokens equal to current GM Fear without another healing roll. After an incoming attack rolls, Roll Resolution offers a bounded token count; each spent token reduces its result against you by 1 before damage. Other targets and permanent Evasion are unchanged. Known misses and critical hits do not prompt. Scene refresh clears unspent tokens.

### Grace

#### Invisibility

A successful native cast makes yourself, or one selected ally within Melee, invisible using Foundry’s native Invisible status. Tokens equal the caster’s current Spellcast trait. Attacks against the holder gain disadvantage. Each completed action—including a no-roll action—or direct action roll spends one token after resolution; reactions, separate damage rolls, and cancellations do not. Zero tokens removes this spell’s effect. Recasting replaces its pool and effect, and token bookkeeping continues if the source card is later vaulted.

### Midnight

#### Chokehold

Use the native Pull into Chokehold action and its Stress cost to apply temporary Vulnerable. Any creature attacking that held target automatically gains 2d6 damage while the marked hold is active; ordinary Vulnerable alone does not qualify. On mixed-target damage, only held recipients receive the bonus. Native criticals, rerolls, and deferred damage remain available. Getting behind an appropriately sized creature and ending the hold remain manual.

#### Midnight Spirit

Summon Spirit spends 1 Hope and creates a friendly, controllable humanoid-sized spirit token beside the caster. Use Attack Adversary on the caster’s card: it retains the native Spellcast attack, Very Far range, and Spellcast-trait d6 magic damage, without another Hope cost. The spirit and its temporary NPC disappear after that completed attack, hit or miss, the caster’s next completed rest, or a successful replacement summon. Canceled attacks and summons preserve it. Movement and carrying remain manual.

#### Rain of Blades

Keeps the native cast, Hope cost, area, targeting, and Proficiency d8+2 damage. If any damage target is Vulnerable, a selected extra d8 rolls with the damage and can participate in damage rerolls. Only Vulnerable recipients receive that bonus; others take base damage. Automatic, manual, and redirected application preserve those recipient-specific totals.

#### Uncanny Disguise

Use Don Facade with its native Stress payment to set tokens equal to current Spellcast and create one visible Disguised effect with native contextual Presence advantage. Each completed action or direct action trait or Spellcast roll spends one token after resolution. Reactions, separate damage rolls, and canceled actions do not. Spend Token handles narrative actions. Zero tokens removes the effect; recasting replaces the disguise and pool.

#### Veil of Night

After a successful cast, choose two endpoints within Far to place a thin Region representing the veil. It does not block actual vision, lighting, or movement. The caster gains attack advantage against targets across it, and adversaries across it gain attack disadvantage against that caster. Its directional concealment also qualifies the caster’s Sneak Attack against the appropriate targets. Token movement and Region edits update eligibility. The veil survives rests and scene refresh; the GM can delete it, or the caster’s next completed spell ends it, even on failure. Canceled spells and weapon attacks preserve it.

### Sage

#### Conjure Swarm

Armored Beetles retains its self-targeted Stress cost and native physical and magic severity reduction. After completed incoming damage, including Minor reduced to None, offer spending 1 Hope to keep the captured beetles; otherwise they expire. Canceled, immune, redirected, resource-only, or zero incoming damage preserves them. Recasting replaces older beetles without stacking. The native reduction preview stays accurate. Fire Flies is unchanged, and no summon token or region is added.

#### Corrosive Projectile

The native single-target Cast and damage remain. After a successful hit against an adversary, optionally choose an affordable even Stress cost—2, 4, 6, and so on—to Corrode that exact target. Each 2 Stress adds one permanent stack reducing Difficulty by 1. Reapplications accumulate correctly, including separate casters. There is no extra target picker, separate damage roll, or invented expiration; declining leaves the native attack unchanged.

#### Natural Familiar

Summon Familiar costs 1 Hope; Summon Flying Familiar costs 2 Hope total. Both create a friendly, controllable small token backed by a temporary NPC. The familiar disappears on the caster’s next completed rest, a successful recast, or a completed attack targeting it, hit or miss. Damage against an adversary within Melee of the familiar gains one extra d6; only qualifying recipients get it on a mixed-target attack. Movement, simple tasks, and viewing through its eyes remain manual or native.

#### Nature's Tongue

Native actions, Hope cost, targeting, and contextual +2 Spellcast effect stay unchanged. A placed bonus expires after its recipient’s next completed native roll, including action, reaction, damage, or healing. Canceling or leaving a roll unevaluated preserves it. A bonus activated during an already-pending roll is not consumed by that older roll.

#### Vicious Entangle

Keeps both native actions, damage, and temporary Restrained templates. After a successful Cast, spend 1 Hope and choose one other living, visible, unrestrained adversary within Very Close of a successful original target. Only Restrained is applied to that extra adversary: it receives no damage and is not added to the damage targets. Range is measured from the original target, not the caster.

### Splendor

#### Reassurance

After another active Party character’s action roll, offer a reroll through Roll Resolution. The ally must consent. Acceptance spends the once-per-rest use and rerolls all action dice, preserving flat modifiers. There is no extra Hope, Stress, or range requirement. Ordinary successes remain eligible; an already-critical friendly result does not. Reactions do not qualify. The sheet button is a timing reminder.

#### Second Wind

After a successful attack against an adversary, optionally use the once-per-rest benefit to clear 3 Stress or 1 HP. On a Hope success, including a critical, the same dialog can also give one other friendly creature within Close its own choice of those recoveries. Self and ally benefits are independent, so an unwounded caster can still help an eligible ally. Recovery is capped by marked resources; declining or choosing no recovery consumes nothing. Ordinary rests refresh the native use.

#### Voice of Reason

The native situational advantage remains available for de-escalation and leadership. While the card is eligible and all Stress slots are marked, Emboldened automatically grants +1 Proficiency and shows a token icon. Clearing Stress suppresses the bonus and icon; filling the track reactivates them. No manual effect toggle or additional cost is needed.

### Valor

#### Body Basher

The native Strength damage bonus applies automatically only to successful weapon attacks whose weapon range is Melee. A ranged weapon used nearby does not qualify, nor do Very Close weapons, ordinary unarmed attacks, or Beastform attacks. Brawler’s I Am the Weapon counts as a weapon. No new cost, prompt, or distance check is added.

#### Bold Presence

After confirming a Presence-roll dialog, optionally spend 1 Hope to add current Strength to that roll before evaluation. When you would gain a supported new condition, a second contextual prompt lets you avoid one condition using the native once-per-rest counter. Describe how your presence helps manually; the automation tracks the use and prevents the chosen condition. Declining leaves the incoming condition unchanged. Sheet buttons are reminders, not additional payments.

#### Critical Inspiration

Once per rest, after an actual critical attack, optionally let every other eligible friendly creature within Very Close clear 1 Stress or gain 1 Hope. Each owner receives one grouped choice window for their eligible creatures and may decline individually. The caster does not receive an extra benefit; normal critical Hope remains unchanged. No eligible recovery, or everyone declining, consumes nothing. Ordinary or converted-only successes, nonattack criticals, and reactions do not qualify. Both short and long rests refresh the native use.

#### Forceful Push

Use the card’s Forceful Push action to delegate to your equipped primary weapon’s real attack against one Melee target, including Brawler’s Strike while no other weapon is equipped. The attack keeps its normal traits and damage dice, with automatic damage or the usual Roll Damage button. A successful Hope result, including a critical, selects +1d6 in damage Effects. After a successful attack, you may spend 1 Hope to make the surviving original target temporarily Vulnerable. Moving that target to Close remains manual. No redundant Spend Hope sheet action is needed.

#### I Am Your Shield

Before an ally within Very Close takes attack damage, offer marking 1 Stress to take it instead. You apply your own thresholds, resistance, and defenses. For this attack only, your native reduction dialog can use any available Armor Slots without an additional Stress cost for exceeding the usual limit. Move manually. Recursion is blocked, and plain tracker edits or nonattack damage do not qualify.

## Ancestry Features

19 premades

### Aetheris

#### Celestial Wings

Apply Flying manually. Once per scene, the native damage-reduction dialog offers spending 1 Hope instead of marking one selected Armor Slot while retaining that slot’s reduction. You need a valid available Armor selection; it does not create Armor from nothing. Confirmation spends Hope and the scene use, while canceling spends neither. Scene refresh restores the use.

#### Hallowed Aura

Once per long rest, an eligible ally within Close who makes an action roll with Fear can have it changed to Hope through shared Roll Resolution. Dice, total, and success or failure stay unchanged; only Hope or Fear consequences change. It does not target the bearer. The native action use is spent on acceptance, and nearby friendly tokens identify range. Reaction rolls do not qualify or consume the use.

### Dwarf

#### Increased Fortitude

Positive physical incoming damage offers spending 3 Hope to halve its raw amount, rounded up, before resistance, thresholds, and Armor reduction. There is no scene or rest limit. Magical, mixed, and untyped packets are excluded because they do not expose a separate physical amount. Declining spends nothing; plain HP edits do not trigger it.

### Elf

#### Quick Reactions

After confirming a reaction-roll dialog but before evaluation, offer marking 1 Stress for advantage when the roll does not already have it. Existing disadvantage cancels normally. There is no scene or rest limit. Declining or canceling the choice spends nothing; ordinary action and damage rolls are unaffected.

### Faerie

#### Luckbender

Once per session after your action roll, or a willing friendly ally’s within Close, spend 3 Hope to reroll only the Hope and Fear dice before consequences. Other dice and modifiers retain their results. Allies receive a separate consent choice. Reactions and already-critical friendly results are excluded, but ordinary successful actions remain eligible.

#### Wings

Apply Flying manually. After a noncritical adversary attack hits you, offer marking 1 Stress for +2 attack-specific Evasion only when it could turn that hit into a miss. The hit and card update before damage; other targets are unaffected. Permanent Evasion does not change. Already-missed, unavoidable, and critical attacks do not prompt.

### Faun

#### Kick

After a successful attack with exactly one hit target within Melee, offer marking 1 Stress for selected +2d6 damage in Effects. It works with native critical and automatic damage. Move yourself or the target manually to resolve the knockback. An accepted cost stays spent even if you later cancel damage or deselect the bonus.

### Firbolg

#### Unshakeable

Each incoming Stress point automatically rolls its own d6; every 6 prevents one point before Stress overflow. This includes supported costs and direct tracker increases as well as damage. No decision prompt is needed, and a prevented reactive cost still allows the associated benefit. Disable the premade when editing starting Stress for tests without wanting prevention rolls.

### Galapa

#### Retract

Use the native Stress-cost action and enable the Retract effect while in your shell; disable it when you emerge. It preserves physical resistance and automatically imposes disadvantage on action rolls, with normal advantage cancellation. Reactions and damage rolls are unaffected. Inability to move and physical positioning remain manual.

### Gnome

#### Nimble Fingers

Finesse rolls with a Hope Die offer spending 2 Hope to reroll only that die before consequences. Fear, other dice, and modifiers remain unchanged. Available once per managed roll without a rest counter, including ordinary successes but not criticals. Standard d20 reactions have no Hope Die to reroll.

### Goblin

#### Danger Sense

Once per rest when an adversary attack hits you or an ally within Very Close, offer marking 1 Stress to force an attack reroll. Enemy critical hits remain eligible because their replacement can miss. A shared multi-target attack recalculates all targets. This resolves before damage; declining spends no Stress or use.

### Halfling

#### Internal Compass

When your Hope Die shows 1, Roll Resolution offers a free reroll of that die, once per roll. Fear, other dice, and modifiers stay intact. It can become eligible after another reroll produces a 1, but an already-critical friendly result does not offer improvement. Rolls without a Hope Die cannot use it.

#### Luckbringer

After the GM performs Session refresh, automatically grant 1 capped Hope to every active Party member with a Hope resource, including the bearer. No token presence or owner connection is required. Each eligible Halfling grants separately. Use Session refresh once at the start of play; another refresh produces another grant.

### Human

#### Adaptability

A failed roll using at least one of your own selected Experiences offers marking 1 Stress to reroll all dice while keeping configured modifiers and the Experience bonus. Original Experience costs are not charged twice. Unknown outcomes allow failure declaration, success, or independent decline. A known success, critical, or another creature’s Experience does not qualify.

### Infernis

#### Fearless

An action roll with Fear offers marking 2 Stress to change it to Hope before consequences. Dice, total, and success or failure remain unchanged. There is one use per managed roll and no rest counter. Already-Hope results and criticals do not offer it. Reaction rolls have no Hope or Fear outcome and never offer or pay for this conversion.

### Katari

#### Feline Instincts

Agility rolls with a Hope Die offer spending 2 Hope to reroll only that die before consequences, preserving Fear, other dice, and modifiers. It can be used on ordinary successes, once per managed roll, but not on an already-critical friendly result. Native d20 reactions have no Hope Die to reroll.

### Orc

#### Sturdy

With exactly 1 unmarked HP, attacks targeting you automatically receive disadvantage. It stops when you heal above that point or mark the last HP. Normal advantage cancellation applies, with no prompt or resource cost. Since multi-target attacks share one roll, any qualifying Sturdy target can affect that shared attack.

#### Tusks

After a successful attack with exactly one hit target within Melee, offer spending 1 Hope for selected +1d6 damage in Effects. Native critical and automatic damage are supported. The accepted bonus remains on the attack card without charging again when damage is reopened; later cancellation does not refund the committed Hope.

### Skykin

#### Eye of the Storm

Use the native action, spending 2 Hope to grant yourself or a Melee ally +1 Evasion. The applied copies expire when the source Skykin takes finalized Severe damage or successfully uses the feature again. A canceled recast preserves them. Damage to a recipient does not end another Skykin’s grant; other casters’ effects remain separate.

## Community Features

4 premades

### Freeborne

#### Unbound

Once per session, Roll Resolution offers changing your action roll with Fear to Hope with no Hope or Stress cost. Dice, total, and success or failure remain unchanged before native consequences. Acceptance spends the session use. Already-Hope results and criticals do not qualify. Reaction rolls have no Hope or Fear outcome and never offer or consume this use.

### Frostborne

#### Hardy

Completing Take Downtime with selected activities during a short or long rest automatically clears 1 marked HP, once for that rest window, with a chat notice only when healing occurs. Opening, rerendering, or canceling downtime does not heal. The standalone action is a reminder rather than a second way to collect the benefit.

### Seaborne

#### Know the Tide

Native Fear results add tokens up to your level. Action-roll dialogs let you choose how many to spend, adding +1 per token. Tokens are consumed when evaluation proceeds; canceling configuration spends nothing. Reactions do not spend them, and rerolls retain the paid bonus. Session refresh clears unspent tokens.

### Warborne

#### Brave Face

Once per session when supported Stress marking occurs, offer spending 1 Hope instead of marking 1 Stress, before overflow. Multiple incoming points are reduced by exactly one. Current implementation also detects positive tracker updates, including manual marks and costs; disabling the premade avoids prompts during setup edits. Remaining Stress can then be tested by Unshakeable.

## Beastform Features

16 premades

Apply these to the matching features of an active native Beastform. The module preserves generated Beastform attack references so their normal chat-card Roll Damage controls remain usable. Forms listing Attack advantage also receive it automatically through normal advantage and disadvantage cancellation.

#### Cannonball

Use Prepare Cannonball, mark 1 Stress on the Beastform character, and select an active Party thrower. That ally receives a temporary one-use Agility or Strength attack against a Close target, dealing Proficiency d12+2 physical damage. After primary damage resolves, the Beastform character may spend 1 Hope to deal half its effective damage to one additional adversary within Very Close of the first. Move manually; temporary attacks clear after use or Scene refresh.

#### Companion

While this Beastform feature is active, your normal Help an Ally utility rolls d8 instead of d6. The usual 1 Hope cost, active Party eligibility, visible prepared aid, and highest-advantage calculation remain unchanged. Help must be used before the ally starts an action roll; it does not apply to reactions.

#### Deadly Raptor

After the qualifying straight-line move from at least Close into Melee, select that creature and use Prime Dive. The next completed attack consumes the marker; a hit against the selected target offers rerolling damage dice below that attack’s Proficiency. Flight, movement, and qualification of the dive remain manual. A canceled attack preserves priming.

#### Devastating Strikes

After normal damage reduction and application cause finalized Severe damage to a target still within Melee, offer marking 1 Stress to make it mark 1 additional HP. Targets already dead, defeated, unconscious, or with no HP capacity do not prompt. Range, survival, and payment recheck on acceptance; the sheet action is a reminder.

#### Elusive Prey

After a noncritical adversary attack hits, offer marking 1 Stress and rolling d4 for attack-specific Evasion. Hit status recalculates before damage. No offer appears when even a 4 cannot change the hit to a miss. Permanent Evasion stays unchanged; the defense lives only on that attack.

#### Fragile

After damage reduction and HP prevention, marking at least 2 HP from one damage application automatically ends native Beastform. Minor damage, costs, and unreduced raw damage do not trigger the end. There is no decision or additional payment; the system’s normal transformation cleanup handles removal.

#### Hobbling Strike

Each successful attack target within Melee can offer marking 1 Stress to apply temporary Vulnerable. Hit, range, feature state, and payment are checked again when accepted. There is no additional use limit. Remove the temporary condition when the table determines it ends; the prompt does not move tokens.

#### Ocean Master

After a successful attack, one picker lets you select a living hit target within Melee and make it temporarily Restrained at no cost. Range and availability recheck on selection. Underwater breathing and natural movement are narrative benefits; the premade does not move tokens or adjudicate water conditions.

#### Pack Hunting

Tracks the previous completed action by an active Party character or linked companion. A successful single-target attack against a creature targeted by that preceding ally action automatically selects +1d8 damage. Adversary and unrelated NPC actions do not break the sequence; another Party action, including your own intervening action, does. There is no payment prompt.

#### Rampage

After damage and other reroll decisions, each qualifying damage die showing 1 can add one d10, offered together in a single prompt. Separately, the native Mark Stress action primes +1 Proficiency for your next attack. On a miss the effect ends immediately; on a hit it remains through deferred damage and ends when damage posts. Canceling the attack preserves it.

#### Snapping Strike

After a successful attack, one target picker lets you spend 1 Hope to make a hit target within Melee temporarily Restrained and Vulnerable. Hope and targets are checked before application. The sheet action directs you to this contextual prompt; temporary-condition endings remain table-managed.

#### Takedown

Use the native Mark Stress action to activate +2 Proficiency for the attack, then move into Melee and attack manually. Successful targets of that powered attack automatically mark 1 Stress. The Proficiency effect expires after the completed attack, hit or miss; canceling preserves it. Takedown does not add Restrained or perform token movement.

#### Unyielding

When you confirm Armor Slots in the native damage-reduction dialog, automatically roll one d6 per slot. Each 5 or 6 preserves one slot while keeping its selected severity reduction; failures mark Armor normally. Manual Armor edits and source-less non-damage updates do not trigger it. No separate activation or decision is required.

#### Venomous Bite

Successful attack targets within Melee automatically become temporarily Poisoned without stacking. Whenever a poisoned creature completes an action, roll and apply d10 direct physical damage through the native damage workflow, bypassing Armor reduction. The poison does not add repeated duplicate effects. Its temporary ending remains a table decision.

#### Venomous Strike

Keeps the native multi-target Finesse attack within Very Close. Successful targets become temporarily Poisoned without stacking, using the same poison engine as Venomous Bite. Each completed action by a poisoned creature causes d10 direct physical damage. Target selection and temporary-condition removal use normal player and GM control.

#### Vicious Maul

After a successful attack, select one hit target and spend 1 Hope. The target becomes temporarily Vulnerable and you receive a visible +1 Proficiency effect for that attack’s damage. The boost remains through native deferred Roll Damage and is removed after damage posts. It does not replace the normal damage workflow or add a separate damage formula.

## Transformation Features

5 premades

### Demigod

#### Weight of Divinity

After final rerolls and outcome changes, a failed action or reaction roll requires marking 1 Stress or giving the GM 1 Fear. The owner chooses the consequence. Unknown Difficulty also permits declaring success. If Stress cannot be paid, the consequence falls back to Fear. It checks failure, not whether the roll was with Hope or Fear.

### Shapeshifter

#### Change Shape

Change Shape appears as a downtime move during either rest. Before committing it, choose an official ancestry in an untimed picker. Native ancestry-linked features are granted and only the prior ancestry and its granted features are removed. With Only Skin Deep, choose exactly one ancestry feature in that same window; you may choose the other feature from your current ancestry. Canceling does not consume downtime.

### Vampire

#### Feed

After finalized Fangs damage makes a bleeding creature mark HP, confirm that it can bleed and mark 1 Stress to gain that many Feed tokens, capped at 6. Before an action roll, optionally spend one token for a d20 Fear Die. With zero tokens, action and reaction rolls receive disadvantage. Each completed long rest removes one token, including rests using Elf’s extra activity.

### Werewolf

#### Howling Rampage

When you mark your last Stress while in Wolf Form, automatically roll tier d20s and apply their total as physical damage through native reduction to every other creature within Very Close. Allies can be hit; the Werewolf is excluded. Wolf Form then ends. This is automatic rather than a separate activation.

#### Wolf Form

When you mark HP, offer marking 1 Stress to enter a visible Wolf Form with +1d10 to attack and damage rolls. Final action rolls with Hope, including critical successes, automatically mark Stress while the form is active. Reaction rolls do not mark Stress for this trigger or start Howling Rampage through it. The form lasts until the next rest or Howling Rampage; filling the last Stress triggers that rampage. Activation is contextual, not a separate unprompted transformation.

## Weapon Features

19 premades

Medkit the supported weapon and equip it for attack automation. Native-property entries also support custom weapons carrying that native property; Versatile, Piercing, and Otherworldly instead match their specifically supported weapons. These are equipment integrations, not replacements for similarly named class or subclass abilities. Only one weapon-property premade can currently be applied to a weapon.

#### Aimed

Supports the Arcane Rifle series and weapons with native Aimed. Before attack configuration, check whether any target is within Very Close of you or within Melee of a friendly ally. If so, offer marking 1 Stress to ignore Aimed’s disadvantage for this attack. Declining or having no available Stress retains the penalty. Other disadvantage sources remain, and advantage cancels disadvantage normally. A paid preparation cost remains spent if the later attack dialog is canceled.

#### Deadly

After weapon damage still deals Severe or Massive damage following reduction, the native damage receipt adds 1 HP before HP prevention. No second damage roll, activation, or attacker cost is required. Damage reduced below Severe does not qualify. The property stays attached to saved damage and redirected packets; unrelated HP costs and manual tracker edits do not trigger it.

#### Deflecting

Before an incoming attack rolls, offer marking 1 available Armor Slot for an attack-specific Evasion bonus equal to your full Armor Score, not your remaining slots. It survives attack rerolls and stacks with other applicable defensive bonuses without changing permanent Evasion. Duplicate targeted tokens for one wearer pay once. There is no persistent effect, Stress cost, or separate weapon activation.

#### Entangling

Medkit and equip the secondary Entangling weapon. After a successful attack with your equipped primary weapon, each eligible surviving hit actor within Very Close can offer spending 1 Hope to become temporarily Vulnerable. Already-Vulnerable targets do not prompt. Final rerolls and converted hits count. Remove the temporary condition when its rules say it ends; movement remains manual.

#### Eruptive

Applying finalized attack damage to an original successful target within Melee automatically makes other eligible living adversaries within Very Close of the attacker roll native reactions against 14. Failed reactions take half the final rolled weapon damage, rounded up, through their normal defenses. The radius is attacker-centered, not target-centered. Original targets, allies, and the attacker are excluded; the original target dying does not cancel the burst. No Hope, Stress, or extra attack is required, and the same saved attack does not burst twice.

#### Follow-Up

Medkit the secondary Hatchet, including its Improved, Advanced, and Legendary versions, or another secondary weapon with native Follow-Up. After a successful primary-weapon attack against a target within Melee, the damage workflow offers marking 1 Stress for +1 Proficiency on that attack’s damage. It works with automatic damage and the chat card’s Roll Damage. No lasting actor effect is created. Canceling and reopening the same damage dialog retains the paid bonus without charging again; later attacks receive no bonus.

#### Invigorating

After a final successful attack, automatically roll one d4 if the wielder currently has marked Stress. A 4 clears 1 Stress through native healing; other results do nothing. Multiple hit targets do not produce extra rolls, and no roll occurs at zero Stress. There is no activation or resource cost. This weapon property is separate from Beastform Invigorating.

#### Nonlethal

Final main-attack HP damage becomes an equal amount of Stress after Armor and damage reduction, before the native resource update. Stress prevention and normal overflow still apply. Separately supplied HP resource damage is unchanged. No prompt, cost, effect, or replacement attack is created. Saved damage and redirection retain the property.

#### Omnipresent

Under this game’s interpretation, attacks beyond Melee automatically gain disadvantage; Melee attacks do not. Actual token distance and configured scene ranges determine this, and any qualifying target imposes disadvantage on a shared multi-target roll. Advantage cancels normally. The weapon’s stored Melee range remains unchanged; selecting legal extended-range targets remains manual. Use native manual controls when distance cannot be measured.

#### Otherworldly

Supports Shadowblade and its Improved, Advanced, and Legendary versions, plus Ghostblade. After a successful attack and its dice display, choose Physical or Magic before damage configuration. The choice changes only that attack’s main damage, not the weapon’s stored statistics or resource damage. There is no cost; closing the choice retains native damage. Medkit adds the missing rule to the description. This is separate from Martial Artist Otherworldly and Otherworldly Ire.

#### Parry

When rolled attack damage is applied to an original targeted wearer, automatically roll this weapon’s damage dice using its current Proficiency and dice modifiers, without flat damage bonuses. Matching active attacker results are discarded for this recipient only, and native critical damage is recalculated before defenses. Other targets retain the original shared damage. No cost or optional prompt is required. Unattributed numeric damage without dice remains manual.

#### Persuasive

After confirming a Presence-roll dialog and before evaluation, offer marking 1 Stress for a roll-local +2. Presence reactions can qualify too. Declining or canceling configuration spends nothing; the bonus stays with that roll through rerolls, without a persistent actor effect or repeated payment. Other traits and already-posted chat rerolls do not offer it.

#### Piercing

Supports Twisted Dagger and its Improved, Advanced, and Legendary versions, Platinum Estoc, and Crystal Spear. Their damage automatically treats each recipient’s Major threshold as 2 lower for that damage application. The Severe threshold, damage total, stored actor statistics, and normal Armor and reduction choices remain unchanged. Native chat-card damage application and redirected damage retain the property. No activation or cost is needed; Medkit also adds the missing rule to the weapon description.

#### Quick

After confirming the native attack configuration but before rolling, optionally choose one additional living creature within the weapon’s range and mark 1 Stress. The extra target joins the same attack and damage roll; each target resolves against its own defense normally. Declining spends nothing. While enabled, the weapon’s separate native Quick activation is a reminder rather than a second payment. This does not automate the Martial Artist Quick stance.

#### Reloading

After a completed attack, automatically make the native d6 reload check and record it on the attack card. A result of 1 makes the weapon unloaded. If the native workflow already made that check, it is not repeated. Attempting another attack while unloaded offers marking 1 Stress to reload and continue that attack, or canceling without firing. With no available Stress, firing remains blocked. The native loaded resource, check display, and manual reload controls remain available.

#### Ricochet

Supports the Enchanted Chakram series and weapons with native Ricochet. After confirming attack configuration but before rolling, optionally mark 1 Stress and select one additional creature within Very Close of the first original target. Range is measured from that target, not from you; the extra creature need not be within your weapon’s range. Both targets use the same attack and damage roll. Declining spends nothing, and the separate native property activation becomes a reminder while enabled.

#### Scary

After a successful weapon attack resolves, every successfully hit actor automatically marks 1 Stress once for that attack. Final rerolls and miss-to-hit conversions count; multiple tokens of one actor do not duplicate the mark. Normal Stress prevention and capped tracks apply. There is no attacker cost or activation, and this is separate from Beastform Scary.

#### Versatile

After Medkit, right-click the weapon on the character sheet and choose Switch to Alternate Mode or Switch to Primary Mode. Switching is free and changes the weapon’s actual trait, range, and damage statistics. Original statistics and deliberate edits in either mode are retained. Attacks already posted to chat keep the damage statistics of the mode used for that attack, even if you switch before clicking Roll Damage. Disabling the premade hides the toggle without resetting the current mode.

Supports all four Scepter, Whipsword, and Casting Dagger tiers, plus Casting Sword, Spiked Bow, Hand Sling, Gunblade, and War Dart: 17 weapons. Medkit appends the weapon-specific alternate statistics to its description.

#### Volleyed

Medkit adds a second native weapon attack, Volley (1 Hope), while preserving the original Attack and other weapon data. Use Volley to attack the selected group, paying 1 Hope on hit or miss. Successful targets take half final main damage, rounded up before defenses and redirection; resource damage is unchanged. No additional multi-target prompt appears. Re-Medkit after changing weapon statistics to refresh the copied Volley action. Disabling the premade blocks Volley but leaves normal Attack usable.

## Armor Features

10 premades

Medkit the armor itself and equip it. Native armor statistics, actions, effects, and resources are preserved. Only one armor-property premade can currently be applied to an armor item. Where a property now triggers contextually, its old standalone activation becomes a timing reminder rather than a second way to pay or collect the benefit.

#### Absorbing

Once per scene after completed positive magic damage, offer clearing 1 marked Armor Slot. A slot marked against that same damage can be cleared even if Armor prevented all HP loss. Physical, resource-only, immune, zero, or canceled damage does not offer it. Declining preserves the native scene use; accepting clears exactly one slot at no Hope or Stress cost. Native Scene refresh restores the use.

#### Bulky

Supports Banded Armor and its Improved, Advanced, and Legendary versions, or other armor with native Bulky. The system’s existing −1 Evasion remains unchanged. Damage that still makes you mark at least 3 HP after reduction and prevention automatically causes 1 Stress; this is mandatory, not an optional prompt. Severe damage reduced to Major does not trigger, while Massive reduced to Severe does. Normal Stress prevention and full-Stress overflow still apply. Manual HP tracker edits and unrelated HP costs do not trigger it.

#### Hopeful

Supported native ability costs and premade Hope payments offer marking Armor Slots instead of spending Hope, including when you have zero Hope. Each available slot replaces 1 Hope; larger costs can mix the two resources. Displayed Hope stays the actual Hope total, not Hope plus Armor. Cancellation spends neither. Continuous Hope requirements, manual tracker edits, and the separate native Tag Team utility are unchanged. Hope costs that recover Armor, including Frontline Tank, require real Hope and cannot use Armor substitution.

#### Mnemonic

Once per scene, recalling a positive-cost Domain Card from the vault outside a rest offers a free recall using the armor’s native scene counter. Accepting leaves Perfect Recall available; declining continues to its usual discount or native payment. Failed or canceled recalls restore the unused benefit. Full loadouts and invalid cards do not qualify. Native Scene refresh restores the use.

#### Quick-Striding

While equipped and enabled, grants native Restrained immunity and prevents new or updated condition effects from applying Restrained. Other statuses and effect data remain intact. Unequipping or disabling removes only this armor’s immunity. Existing Restrained effects are not automatically deleted. Movement up to Far remains manual.

#### Reinforced

A visible +2 Major and Severe threshold effect is automatically maintained while all current Armor Slots are marked. Clearing any slot, unequipping the armor, or disabling its premade removes the managed bonus. Manual marks, damage, and rests use the same state. The hit marking the final slot uses its original thresholds; the bonus protects against subsequent damage.

#### Resilient

Confirming native damage reduction that would mark your last available Armor Slot automatically rolls a d6. On a 6, that final slot is not marked and still supplies one threshold of reduction. On 1–5, it marks normally. Opening or canceling the dialog, marking earlier slots, and having no available slots do not roll. The ordinary reduction preview remains native. A slot already saved by another defense is not rolled again by Unyielding.

#### Resplendent

Once per scene after a confirmed Hope payment, offer clearing 1 marked Armor Slot. Spending Hope on a roll that also earns Hope still qualifies, even when the displayed total does not decrease. Declining preserves the use; gains, manual tracker edits, and refunded payments invalidated before the offer do not trigger it. Acceptance clears one slot without another resource cost. The native Scene refresh restores the use.

#### Self-Healing

Completing Take Downtime for a short or long rest automatically clears 1 marked Armor Slot, once for that rest rather than once per activity. Partial or canceled downtime and zero marked slots do not heal. Recovery starts when the rest completes and does not wait for the later Choose Loadout decision. There is no cost or optional prompt; a chat notice records the recovery.

#### Shifting

Before an incoming attack rolls, optionally mark 1 Armor Slot to give that shared attack disadvantage. No Stress cost or persistent effect is created. Existing advantage cancels normally; an attack already at disadvantage does not prompt. Once one defender imposes disadvantage, other defenders do not pay for it again on the same shared roll.

## Shared controls and related automation

### Reopening pending decisions

The hourglass button in token controls opens Pending Decisions at any time. You can also enter `/premades-pending` in chat. Reopening reveals a still-pending roll or attack choice after accidentally closing its window; it does not recreate an expired or completed workflow. The GM can pause or resume all module timers there.

### Help an Ally

The utility is added to character sheets without Medkit. Before another active Party member starts an action roll, spend 1 Hope and roll d6 to prepare help. Only the highest eligible helper or own advantage die contributes. Canceling roll configuration leaves help pending; evaluation consumes it. Enchanted Aid and Beastform Companion modify this established help workflow. Tactician can add a chosen helper Experience for an additional Hope payment; its modifier is separate from advantage.

### Rest loadouts and vault recall

After a completed short or long rest, Choose Loadout appears only if the character has Domain Cards in the vault. Select up to five cards; each shows its level and offers its description on hover. The current loadout is preselected. Apply Loadout saves the selection and moves all other cards to the vault; closing the window leaves the current loadout unchanged. Explicitly applying an empty selection moves all cards to the vault. The picker has no timer and costs no Recall payment. Rest benefits such as Self-Healing do not wait for this picker. Outside a rest, trying to move a card out of the vault prompts its native Recall Cost. Mnemonic can offer free recall; otherwise Perfect Recall can discount that payment.

### Level-up domain cards

Saving a character’s level-up adds untimed card-management steps automatically; no Medkit is required. Newly acquired domain cards enter the Loadout when there is space, using the world’s loadout limit and the character’s extra slots. If it is full, each new card offers the choice to move one previously acquired active card to the Vault, making room for that new card. Skip keeps the new card in the Vault. Cards gained in this level-up cannot be chosen to make room for another new card.

As the final step, optionally exchange one previously acquired domain card. Choose the outgoing card, then use the native compendium browser to read descriptions and click Exchange on a different eligible card. Replacements must belong to the character’s domains, be the outgoing card’s level or lower, and not duplicate an already owned card. Cards newly acquired in this level-up cannot be exchanged. The replacement stays in the outgoing card’s current Loadout or Vault location, and its rules and effects replace the old card’s while keeping Foundry’s advancement history linked.

Declining or closing an exchange makes no exchange. All of these level-up loadout changes and the exchange are free: no Stress or Recall Cost is paid. An active GM is required for the added choices. Ordinary vault recall outside this level-up workflow still uses the usual payment prompt. Optional Auto-Medkit can handle the replacement just like another newly acquired card.

### Conditions and advantage

With the default world setting enabled, qualifying targeted rolls automatically gain advantage against Vulnerable targets. Hidden and recognized Cloaked effects impose incoming attack disadvantage. Hidden and Shadow Stepper Cloaked end after a completed attack; Vanishing Act has its own Fear and rest expiration instead. Opposing advantage and disadvantage sources cancel normally rather than stacking extra dice.

### Party and scene setup

Active Party membership controls Help an Ally, Rally, loadout-related party benefits, and several recipient pickers. Native Rally includes the performer and active Party members, even without scene tokens. Nearby benefits instead use the feature’s token disposition and range rules. Select an unambiguous acting token when an actor has several instances.

### Temporary effects and damage application

Temporary conditions with no fixed duration, such as many Vulnerable, Restrained, or Poisoned applications, remain for the table to remove when their rules say they end. A high damage roll is not the same as finalized Severe damage: protection and reduction can change HP marked. For features that trigger on applied damage, use the native Apply Damage workflow so the source and final receipt are available; an arbitrary tracker edit cannot identify the attacker.

### Medkit safety

Medkit applies actions and effects to matching existing items; it does not grant missing class or subclass features. It replaces the selected item’s automation, so inspect custom actions before applying. Disabling a premade stops its scripted behavior without deleting the underlying feature. A newer module version does not necessarily require reapplying every feature; individual premade versions identify changes to their applied actions or effects.

Weapon and armor applications preserve native equipment actions and effects rather than replacing them. Disabling their premades stops the added automation without disabling the equipment itself. Supported missing weapon descriptions are added only when needed, without duplicating existing rule text.
