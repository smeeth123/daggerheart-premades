# Daggerheart Premades

Daggerheart Premades is an automation and quality-of-life module for Foundry's Daggerheart system. It reduces repetitive bookkeeping, brings feature choices into the relevant gameplay workflows, and helps players and GMs resolve abilities without replacing the table's narrative decisions.

<img width="2560" height="1440" alt="Screenshot 2026-09-30 at 6 58 52 PM (3)" src="https://github.com/user-attachments/assets/861ea724-8d95-4df0-a230-5342c3de6fe6" />

Install with the [module manifest](https://github.com/smeeth123/daggerheart-premades/releases/latest/download/module.json).

## Key features

- **Growing premade library.** Configured actions, effects, and automation across class, subclass, ancestry, community, Beastform, Transformation, Domain Card, and supported weapon and armor features.
- **GM Medkit tools.** Apply premades to existing character features, supported weapons or armor, identify available updates, and enable or disable individual premades without rebuilding characters.
- **Shared Roll Resolution.** Eligible rerolls, dice adjustments, and optional abilities appear together before consequences are finalized. The window can be reopened if closed accidentally.
- **Combat and damage resolution.** Supported bonuses, defensive reactions, resource spending, conditions, and multi-target effects integrate with native attack and damage workflows. Supported damage defenses appear in the system’s damage-reduction dialog, with their own resource costs and effect tracking.
- **Effect and resource management.** Track feature tokens and limited uses, and expire supported effects after the appropriate roll, attack, damage event, rest, or refresh.
- **Domain Cards, level up, and downtime.** Manage your loadout after resting, pay Recall Costs when retrieving cards from the vault, exchange a previously acquired card during level up, and place new cards in your loadout or vault. Card pickers show levels and descriptions; supported features add their own downtime activities.
- **Party and companion support.** Assistance, nearby ally benefits, companion interactions, and protective abilities use relevant ownership, targeting, and range checks.
- **Player-facing decisions.** Prompts go to the owning player with GM fallback. Supported rolls integrate with Dice So Nice when installed, and the GM can pause shared decision timers.

The guiding approach is to automate the mechanics while leaving the fiction at the table. Optional abilities remain choices, effects stay visible, and contextual movement or narrative judgment remains manual where appropriate. Coverage is expanding; not every feature or rule interaction is automated.

## Getting started

1. Enable **Daggerheart Premades** in a Daggerheart world under **Manage Modules**. The active GM initializes the premade compendiums when the world loads.
2. As GM, open a character sheet and choose **Medkit** from the sheet header or its controls menu.
3. Select the available premades you want to apply. Medkit can also be used on an individual feature, Domain Card, weapon, or armor item.
4. Use the character's normal actions and rolls. Relevant automation and decisions appear as their conditions are met.

Medkit shows which premades are available, current, or outdated. Applying a feature or Domain Card premade replaces that item's actions and item effects, including custom ones; review your customizations before applying. Compatible resource and action-use counters are preserved. Weapon and armor premades instead enable automation for supported properties without replacing the item's native actions or effects. Versatile weapon modes and Otherworldly damage-type choices use the native system controls where available. Apply these premades to the weapon or armor itself, not a separate character feature.

Most feature-specific automation requires an applied premade. Some quality-of-life tools, such as post-rest loadout selection and vault Recall payment, work globally. You can optionally enable **Automatically Medkit added features** in the module settings; it is off by default and only applies unique matches, leaving existing applications and individually disabled premades alone.

## Requirements and settings

- **Foundry VTT v14** with the **Daggerheart v2** system. The current release is verified against **Daggerheart 2.12.6** and **Foundry 14.368**. The module accepts Daggerheart 2.x; this does not mean every system version has been tested.
- **Dice So Nice is optional**, for supported 3D dice presentation.
- Keep an **active GM connected** for coordinated decisions and resource updates. Some range-based features require the GM to display the relevant scene.
- Decision countdowns default to **60 seconds** and can be configured from **5 to 600 seconds** in the module settings. The GM can pause and resume shared timers.

After installing runtime updates, reload all connected clients. If Medkit marks a premade as outdated, reapply it to update its configured actions and effects.

For details on individual abilities, see the [Premade Reference](https://github.com/smeeth123/daggerheart-premades/blob/main/Daggerheart-Premades-Reference.md).

All content is from the Daggerheart SRD. Created by **Smeeth**.
