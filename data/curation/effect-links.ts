/**
 * Effects whose wording changed between 3.29 and 3.30 but describe the same thing.
 * Without these, the diff would show them as one "removed" + one "added" effect.
 *
 * `fixed: 100` turns a guaranteed "+1 X" notable into 100% so it can be summed with
 * percent-chance nodes. With unit 'surpass', totals display as counts (100% = +1).
 *
 * The build fails if a template here no longer exists in the tree data.
 */
import type { EffectLink } from '../../src/lib/diff.ts';

export const EFFECT_LINKS: EffectLink[] = [
  // --- Secondary content: "chance for an additional X" became Surpassing Chance (every 100% = +1) ---
  {
    label: 'Extra Imprisoned Monsters (Essence)',
    unit: 'surpass',
    comparable: true,
    old: ['Your Maps have #% chance to contain an additional Imprisoned Monster', { template: 'Your Maps contain an additional Imprisoned Monster', fixed: 100 }],
    new: ['Your Maps have #% Surpassing Chance to contain an Imprisoned Monster'],
    note: 'Converted to Surpassing Chance. Each 100% = one guaranteed Imprisoned Monster.',
  },
  {
    label: 'Extra Rogue Exiles',
    unit: 'surpass',
    comparable: true,
    old: ['Your Maps have a #% chance to contain an additional Rogue Exile', { template: 'Your Maps are inhabited by an additional Rogue Exile', fixed: 100 }],
    new: ['Your Maps have #% Surpassing Chance to contain a Rogue Exile'],
    note: 'Converted to Surpassing Chance. Each 100% = one guaranteed Rogue Exile.',
  },
  {
    label: 'Extra Shrines',
    unit: 'surpass',
    comparable: true,
    old: ['Your Maps have a #% chance to contain an additional Shrine', { template: 'Your Maps contain an additional Shrine', fixed: 100 }],
    new: ['Your Maps have #% Surpassing Chance to contain a Shrine'],
    note: 'Converted to Surpassing Chance. Each 100% = one guaranteed Shrine.',
  },
  {
    label: 'Extra Tormented Spirits',
    unit: 'surpass',
    comparable: true,
    old: ['Your Maps have a #% chance to be haunted by an additional Tormented Spirit', { template: 'Your Maps are haunted by an additional Tormented Spirit', fixed: 100 }],
    new: ['Your Maps have #% Surpassing Chance to be haunted by a Tormented Spirit'],
    note: 'Converted to Surpassing Chance. Each 100% = one guaranteed Tormented Spirit.',
  },
  {
    label: 'Extra Strongboxes',
    unit: 'surpass',
    comparable: true,
    old: [{ template: 'Your Maps contain an additional Strongbox', fixed: 100 }],
    new: ['Your Maps have #% Surpassing Chance to contain a Strongbox'],
    note: 'Converted to Surpassing Chance. Each 100% = one guaranteed Strongbox.',
  },
  {
    label: 'Extra Abyss Pits',
    unit: 'surpass',
    comparable: true,
    old: ['Abysses in your Maps have a #% chance to contain an additional Pit'],
    new: ['Abysses in your Maps have #% Surpassing Chance to contain an additional Pit'],
  },
  {
    label: 'Sacred Grove → Sacred Flora chance',
    unit: 'surpass',
    comparable: false,
    old: ['Your Maps have #% chance to contain The Sacred Grove'],
    new: ['Your Maps have #% Surpassing Chance to contain Sacred Flora'],
    note: 'Harvest was reworked: the Sacred Grove sub-area is gone, and Sacred Flora now spawns inside the map. Not directly comparable.',
  },
  // --- Same effect, new wording ---
  {
    label: 'Abyss guard Rare Monsters',
    comparable: false,
    old: ['An additional Rare Monster is spawned from Abysses'],
    new: ['An Abyss Pit will have an additional Rare Monster guarding it'],
  },
  {
    label: 'Beyond chance',
    comparable: false,
    old: ['#% chance for your Maps to attract Beyond Demons'],
    new: ['Your Maps have #% increased chance to contain a Demonic Evocator'],
    note: 'Beyond is now a tertiary mechanic (Demonic Evocator). 3.29 gave a flat chance; 3.30 gives an increase to an unknown base chance.',
  },
  {
    label: 'Delirium mirror chance',
    comparable: false,
    old: ['Your Maps have #% chance to contain a Mirror of Delirium'],
    new: ['Your Maps have #% increased chance to contain a Mirror of Delirium'],
    note: 'Flat "+% chance" became "% increased chance" (relative to an unknown base). Delirium is now a tertiary mechanic.',
  },
  {
    label: 'Blight tower cost',
    comparable: true,
    old: ['#% reduced Cost of Building and Upgrading Towers'],
    new: ['#% reduced Cost of Building and Upgrading Towers in your Maps'],
  },
  {
    label: 'Expedition artifact quantity',
    comparable: true,
    old: ['#% increased quantity of Artifacts dropped by Monsters'],
    new: ['#% increased quantity of Artifacts dropped by Monsters in your Maps'],
  },
  {
    label: 'Timeless Splinter duplication',
    comparable: false,
    old: ['Timeless Splinters dropped by Legion Monsters or contained in Legion Chests in your Maps have #% chance to be Duplicated'],
    new: ['Timeless Splinters contained in Legion Chests in your Maps have #% chance to be Duplicated', 'Timeless Splinters dropped by Legion Monsters in your Maps have #% chance to be Duplicated'],
    note: 'Split into separate chest and monster nodes. Each source now gets its own nodes.',
  },
  {
    label: 'Lifeforce quantity (Harvest → Sacred Fauna)',
    comparable: true,
    old: ['Harvest Monsters in your Maps drop #% increased Quantity of Lifeforce'],
    new: ['Sacred Fauna in your Maps drop #% increased Quantity of Lifeforce'],
  },
  {
    label: 'Lifeforce duplication (Harvest → Sacred Fauna)',
    comparable: true,
    old: ['Lifeforce dropped by Harvest Monsters in your Maps has #% chance to be Duplicated'],
    new: ['Lifeforce dropped by Sacred Fauna in your Maps has #% chance to be Duplicated'],
  },
  {
    label: 'Tier 3 Harvest (plants → monsters)',
    comparable: true,
    old: ['Harvest Crops in your Maps have #% increased chance to contain Tier # Plants'],
    new: ['Sacred Fauna in your Maps have #% increased chance to be a Tier # Monster'],
  },
  {
    label: 'Harvest monster duplication',
    comparable: true,
    old: ['Plants Harvested in your Maps have #% chance to spawn duplicated Monsters'],
    new: ['Sacred Fauna in your Maps have #% chance to be duplicated'],
  },
  {
    label: 'Abyss pits twice as likely to have rewards',
    comparable: true,
    old: ['Abyss Pits in Area are twice as likely to have Rewards'],
    new: ['Abyss Pits in your Maps are twice as likely to have Rewards'],
    note: '3.29 text said "in Area" (typo); same effect.',
  },
  // --- Scarab drop nodes became Thread drop nodes ---
  {
    label: 'Scarab → Thread drop quantity',
    comparable: true,
    old: ['#% increased Scarabs found in your Maps'],
    new: ['#% increased Threads found in your Maps'],
    note: 'Same nodes, now for Threads. Threads are a different item with different value, so equal numbers do not mean equal profit.',
  },
  {
    label: 'Rare monster Scarab/Thread drops per modifier',
    comparable: true,
    old: ['Rare Monsters in your Maps have #% increased chance to drop Scarabs per Monster Modifier affecting them'],
    new: ['Rare Monsters in your Maps have #% increased chance to drop Threads per Monster Modifier affecting them'],
  },
  {
    label: 'Unique monster Scarab/Thread drops',
    comparable: true,
    old: ['Unique Monsters in your Maps have #% increased chance to drop Scarabs'],
    new: ['Unique Monsters in your Maps have #% increased chance to drop Threads'],
  },
  {
    label: 'Final boss extra Scarab/Thread',
    comparable: true,
    old: ['Final Map Boss in each Map has #% chance to drop an additional Scarab'],
    new: ['Final Map Boss in each Map has #% chance to drop an additional Thread'],
  },
  {
    label: 'Map modifier effect per Fragment/Thread',
    comparable: false,
    old: ['#% increased effect of Explicit Modifiers on your Maps per Fragment used with Map'],
    new: ['#% increased effect of Explicit Modifiers on your Maps per different Thread used with Map'],
    note: 'Was per Fragment (scarabs counted); now per *different* Thread type (at most 3 types).',
  },
];
