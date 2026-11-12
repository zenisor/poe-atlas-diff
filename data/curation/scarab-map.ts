/**
 * What happened to every scarab that existed in 3.29.
 *
 * For each scarab effect you declare:
 *   - scarab: power of ONE scarab (the build multiplies by the scarab's map limit from the wiki)
 *   - tree329 / tree330: which atlas lines give the same effect. `text` is a case-insensitive
 *     substring of the stat *template* (numbers are '#'). Totals are computed from the tree data.
 *   - fate: only when the outcome can't be computed from numbers (thread / chance / reworked / partial)
 *
 * Unit 'count' + a "Surpassing Chance" line => the line's % is divided by 100 automatically
 * (every 100% Surpassing Chance = +1 guaranteed instance).
 *
 * Every scarab removed in 3.30 must have an entry; the build fails on a missing id or on a
 * match that hits no node.
 */
import type { OutsideNote, ScarabSpec } from '../../src/lib/types.ts';

const removed = (label: string, note?: string): ScarabSpec => ({
  effects: [{ label, scarab: 1, unit: 'binary', stacks: false, fate: 'removed', ...(note ? { note } : {}) }],
});

/** The scarab's effect is now an Allflame Ember (3.30 currency that enchants a Map). */
const ember = (label: string, item: string, note: string): ScarabSpec => ({
  effects: [{ label, scarab: 1, unit: 'content', stacks: false, fate: 'ember', item, note }],
});

const thread = (label: string, threadName: string, note?: string): ScarabSpec => ({
  effects: [
    {
      label,
      scarab: 1,
      unit: 'content',
      fate: 'thread',
      note: `Primary league content now comes from ${threadName} (up to 8 Threads per map, max 3 types). It no longer appears in Maps on its own; Shaped Regions give their Maps free Threads of their type. ${note ?? ''}`.trim(),
    },
  ],
});

/** Effect is on the tree as a flat "yes/no" (or a % chance of it). 100 = always. */
const binary = (label: string, tree330: ScarabSpec['effects'][0]['tree330'], note?: string): ScarabSpec => ({
  effects: [{ label, scarab: 100, unit: '%', stacks: false, cap: 100, tree330, ...(note ? { note } : {}) }],
});

export const SCARAB_MAP: Record<string, ScarabSpec> = {
  // ───────────────────────── Abyss ─────────────────────────
  ScarabAbyssNew1: thread('Additional Abyss', 'Abyss Threads', 'The 3.29 "+% chance to contain an Abyss" nodes were removed too.'),
  ScarabAbyssNew4: binary('Non-final pits create an Abyssal Crystal', [{ text: 'Non-final Abyss Pits in your Maps create an Abyssal Crystal on closing', fixed: 100 }], 'Reactive Swarm notable now has exactly this effect.'),
  ScarabAbyssNew3: {
    effects: [
      {
        label: 'Guaranteed Abyssal Depths',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree329: [{ text: 'increased chance to lead to an Abyssal Depths' }],
        tree330: [{ text: 'increased chance to lead to an Abyssal Depths' }],
        note: 'The scarab guaranteed a Depths. The tree only increases the (unknown) base chance.',
      },
    ],
  },
  ScarabAbyssNew2: {
    effects: [{ label: 'Chasm monsters per fed Soul', scarab: 100, unit: '%', tree330: [{ text: 'Abyss Chasms in your Maps spawn #% increased Monsters per fed Soul' }] }],
  },
  ScarabAbyssNew5: removed('Abyssal Consort from a pit', 'No Abyssal Consort effect on the 3.30 tree.'),

  // ───────────────────────── Strongboxes (Ambush) ─────────────────────────
  ScarabStrongboxNew1: {
    effects: [
      {
        label: 'Additional Strongboxes',
        scarab: 4,
        unit: 'count',
        tree329: [{ text: 'Your Maps contain an additional Strongbox', fixed: 1 }],
        tree330: [{ text: 'Surpassing Chance to contain a Strongbox' }],
      },
    ],
  },
  ScarabStrongboxNew4: {
    effects: [
      {
        // The wiki: this scarab "functions identically to Monstrous Treasure" (packs replaced by strongboxes).
        label: 'Monstrous Treasure map (packs become Strongboxes)',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% chance per Strongbox (T16)',
        tree330: [{ text: 'to be replaced with the Empyrean Apparatus' }],
        note: 'The scarab worked like Monstrous Treasure: the map\'s monster packs are replaced with Strongboxes. In 3.30, Explorer\'s Reliquary gives Strongboxes in Tier 16 Maps a 10% chance to be the Empyrean Apparatus, which drops a Tier 16 Map enchanted with Monstrous Treasure (plus a Unique Map). You get the effect by chance, on a later map.',
      },
    ],
  },
  ScarabStrongboxNew5: binary('Strongboxes more likely to be rarer varieties', [{ text: 'Strongboxes in your Maps are more likely to be rarer varieties', fixed: 100 }], 'Fortune Seeker notable.'),
  ScarabStrongboxNew2: {
    effects: [
      {
        label: 'Strongbox re-open chance',
        scarab: 15,
        unit: '%',
        cap: 100,
        tree329: [{ text: 'Strongboxes opened in your Maps have #% chance to be openable again' }],
        tree330: [{ text: 'Strongboxes opened in your Maps have #% chance to be openable again' }],
      },
    ],
  },
  ScarabStrongboxNew3: {
    effects: [{ label: 'Strongbox modifier effect', scarab: 75, unit: '%', tree330: [{ text: 'Explicit Modifiers on Strongboxes in your Maps have #% increased effect' }] }],
  },

  // ───────────────────────── Rogue Exiles (Anarchy) ─────────────────────────
  ScarabAnarchy1: {
    effects: [
      {
        label: 'Additional Rogue Exiles',
        scarab: 5,
        unit: 'count',
        tree329: [
          { text: 'chance to contain an additional Rogue Exile', scale: 0.01 },
          { text: 'Your Maps are inhabited by an additional Rogue Exile', fixed: 1 },
          { text: 'chance to contain # additional Rogue Exiles', scale: 0.2 },
        ],
        tree330: [{ text: 'Surpassing Chance to contain a Rogue Exile' }, { text: 'chance to contain # additional Rogue Exiles', scale: 0.2 }],
        note: 'Ruckus (8% chance for 20 exiles) counts as its expected value, 1.6.',
      },
    ],
  },
  ScarabAnarchy2: removed('Rogue Giants', 'No Rogue Giant effect on the 3.30 tree.'),
  ScarabAnarchy3: {
    effects: [
      {
        label: 'Rogue Exiles appear in pairs',
        scarab: 50,
        unit: '%',
        cap: 100,
        tree329: [{ text: 'chance for Wild Rogue Exiles in your Maps to appear in Pairs' }],
        tree330: [{ text: 'chance for Wild Rogue Exiles in your Maps to appear in Pairs' }],
      },
    ],
  },
  ScarabAnarchy4: {
    effects: [
      {
        label: 'Additional Exceptional Rogue Exile',
        scarab: 1,
        unit: 'count',
        tree330: [{ text: 'to be Exceptional', scale: 0.01 }],
        note: 'Arch Enemy: 10% chance for one exile to be Exceptional, T16 maps only.',
      },
    ],
  },

  // ───────────────────────── Bestiary ─────────────────────────
  ScarabBeastsNew1: thread('Einhar / beasts in map', 'Bestiary Threads'),
  ScarabBeastsNew3: binary('Copy captured beasts', [{ text: 'chance to create a copy of Beasts Captured' }], 'Bonded for Life.'),
  ScarabBeastsNew2: {
    effects: [
      {
        label: 'Additional Red Beasts',
        scarab: 5,
        unit: 'count',
        tree329: [{ text: 'chance to contain an additional Red Beast', scale: 0.01 }],
        tree330: [{ text: 'chance to contain an additional Red Beast', scale: 0.01 }, { text: 'contain an additional Red Beast from', fixed: 1 }],
      },
    ],
  },

  // ───────────────────────── Betrayal ─────────────────────────
  ScarabBetrayal1: thread('Jun / Syndicate in map', 'Betrayal Threads'),
  ScarabBetrayal3: {
    effects: [
      {
        label: 'Syndicate reinforcement chance',
        scarab: 50,
        unit: '% increased',
        tree329: [{ text: 'chance to be accompanied by reinforcements' }],
        tree330: [{ text: 'chance to be accompanied by reinforcements' }],
      },
    ],
  },
  ScarabBetrayal4: {
    effects: [
      {
        label: "Interrogation doesn't lose rank",
        scarab: 50,
        unit: '%',
        cap: 100,
        tree330: [{ text: 'chance to not lose Rank upon completing Interrogation' }],
      },
    ],
  },
  ScarabBetrayal2: removed('More Allflame Ember packs', 'Closest is Secrets Unveiled (4% chance for Veiled Items to drop as Allflames), which is a different mechanic.'),

  // ───────────────────────── Beyond ─────────────────────────
  ScarabBeyond1: {
    effects: [
      {
        label: 'Beyond enabled',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree330: [{ text: 'increased chance to contain a Demonic Evocator' }],
        note: 'Beyond is now a tertiary mechanic (Demonic Evocator). The tree only raises its chance to appear.',
      },
    ],
  },
  ScarabBeyond3: removed('Merging radius + steal rare modifiers', 'Beyond merging-radius nodes were removed with the rework.'),
  ScarabBeyond4: removed('Multi-faction bosses, tainted currency, unique boss chance'),
  ScarabBeyond5: removed('Rares/uniques open 8–12 Beyond portals'),

  // ───────────────────────── Blight ─────────────────────────
  ScarabBlightNew1: thread('Blight encounter', 'Blight Threads'),
  ScarabBlightNew4: {
    effects: [
      {
        label: 'Additional unique Blight bosses',
        scarab: 3,
        unit: 'count',
        stacks: false,
        tree330: [{ text: 'contain up to # additional Blight Bosses' }],
        note: 'Virulent Plague: up to 2 additional bosses.',
      },
      { label: 'Blighted maps become Blight-Ravaged', scarab: 1, unit: 'binary', stacks: false, fate: 'removed', weight: 0.5 },
    ],
  },
  ScarabBlightNew5: binary('Empowering towers scale difficulty & reward', [{ text: 'Each Empowering Tower in your Maps grants', fixed: 100 }], 'Immunosuppression notable.'),
  ScarabBlightNew3: removed('Blighted Chest that grows with kills', 'No Blighted Chest effect in 3.30. Blight Threads add other modifiers, e.g. Mycotic lanes.'),

  // ───────────────────────── Breach ─────────────────────────
  ScarabBreachNew3: {
    effects: [
      {
        label: 'Additional Unstable Breaches',
        scarab: 2,
        unit: 'count',
        tree329: [
          { text: 'chance to contain an additional Unstable Breach', scale: 0.01 },
          { text: 'chance to contain two additional Unstable Breaches', scale: 0.02 },
        ],
        tree330: [
          { text: 'chance to contain an additional Unstable Breach', scale: 0.01 },
          { text: 'chance to contain two additional Unstable Breaches', scale: 0.02 },
          { text: 'chance to contain three additional Unstable Breaches', scale: 0.03 },
          { text: 'chance to contain ten additional Unstable Breaches', scale: 0.1 },
        ],
        note: 'Breach Threads can also roll "additional Unstable Breaches", and Divide and Conquer can make every Breach Unstable.',
      },
    ],
  },
  ScarabBreachNew6: binary('Resonant cascade', [{ text: 'faster for each Unstable Breach already opened', fixed: 100 }], 'Multiple Fronts notable.'),
  ScarabBreachNew1: thread('Breach Hive', 'Breach Threads', 'Divide and Conquer (Hives) makes every Breach a Hive.'),
  ScarabBreachNew5: binary('Ailith enrages the Hive', [{ text: 'instead enrage the Hive', fixed: 100 }], "Ailith's Provocation notable."),
  ScarabBreachNew4: {
    effects: [
      {
        label: 'Hive leads to a Fortress',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree329: [{ text: 'increased chance to lead to Fortresses' }],
        tree330: [{ text: 'increased chance to lead to Fortresses' }],
      },
      { label: 'Unstable Breaches contain a Boss', scarab: 1, unit: 'binary', stacks: false, fate: 'removed' },
    ],
  },

  // ───────────────────────── Cartography ─────────────────────────
  ScarabMapsNew4: removed('Maps drop corrupted with 8 modifiers'),
  ScarabMapsNew1: {
    effects: [{ label: 'More maps per map modifier', scarab: 10, unit: '% per mod', tree330: [{ text: 'increased Maps found in your Maps for each Explicit Modifier' }] }],
  },
  ScarabMapsNew2: {
    effects: [{ label: 'Additional random map modifiers', scarab: 2, unit: 'count', tree330: [{ text: 'Your Maps have an additional random Modifier', fixed: 1 }] }],
  },
  ScarabMapsNew5: ember(
    '8–12 difficult packs that drop 300% more maps',
    'Allflame Ember of the Multitude',
    'The new Allflame Ember of the Multitude enchants a Map with this effect: Monster Packs are replaced by Difficult and Rewarding Monsters that drop 300% increased Maps. It swaps existing packs instead of adding 8–12. Invasive Adversaries on the tree is a separate, smaller effect.',
  ),

  // ───────────────────────── Delirium ─────────────────────────
  ScarabDelirium1: {
    effects: [
      {
        label: 'Mirror of Delirium',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree330: [{ text: 'increased chance to contain a Mirror of Delirium' }],
        note: 'Delirium is now a tertiary mechanic. The tree only raises the chance for a mirror.',
      },
    ],
  },
  ScarabDelirium5: removed('Maps drop with Delirium layers', 'The 3.29 "Delirious map" nodes (Pathological) were removed too.'),
  ScarabDelirium2: removed('Reward meters fill 100% faster'),
  ScarabDelirium4: removed('All unique Delirium bosses (+1 reward each)'),
  ScarabDelirium3: {
    effects: [
      {
        label: 'Additional Delirium reward types',
        scarab: 2,
        unit: 'count',
        tree329: [
          { text: 'chance to generate an additional Reward type', scale: 0.01 },
          { text: 'chance to generate three additional Reward types', scale: 0.03 },
        ],
        tree330: [],
        note: 'The 3.29 reward-type nodes were removed as well.',
      },
    ],
  },

  // ───────────────────────── Divination ─────────────────────────
  ScarabDivinationCardsNew3: {
    effects: [
      {
        label: 'Boss duplicates stolen cards',
        scarab: 100,
        unit: '%',
        stacks: false,
        cap: 100,
        tree330: [{ text: 'Divination Cards dropped by Final Map Boss have #% chance to be duplicated' }],
        note: 'Fate Bespoken: the boss still steals cards but only duplicates them 30% of the time.',
      },
    ],
  },
  ScarabDivinationCardsNew2: {
    effects: [{ label: 'Divination-touched magic packs', scarab: 8, unit: 'count (packs)', tree330: [{ text: 'additional Packs of Divination-Touched Magic Monsters' }], note: 'Scarab: 6–10 packs (avg 8). Haruspicy: 4 packs.' }],
  },
  ScarabDivinationCardsNew1: ember(
    "Doedre's Devoted packs (Stacked Decks)",
    'Allflame Ember of the Cloister',
    "The new Allflame Ember of the Cloister enchants a Map with this effect: Monster Packs are replaced by Doedre's Devoted, which have 1% additional chance to drop a Stacked Deck. It swaps existing packs instead of adding 8–12.",
  ),

  // ───────────────────────── Shrines (Domination) ─────────────────────────
  ScarabDomination1: {
    effects: [
      {
        label: 'Additional Shrines',
        scarab: 3,
        unit: 'count',
        tree329: [
          { text: 'chance to contain an additional Shrine', scale: 0.01 },
          { text: 'Your Maps contain an additional Shrine', fixed: 1 },
        ],
        tree330: [{ text: 'Surpassing Chance to contain a Shrine' }],
      },
    ],
  },
  ScarabDomination2: {
    effects: [{ label: 'Additional Apparition Shrines', scarab: 2, unit: 'count', stacks: false, tree330: [{ text: 'contain an additional Apparition Shrine', fixed: 1 }] }],
  },
  ScarabDomination3: {
    effects: [
      {
        label: 'Additional Evolving Shrine',
        scarab: 1,
        unit: 'count',
        tree330: [{ text: 'to be replaced by an Evolving Shrine', scale: 0.01 }],
        note: 'Beckoning Horror: 10% chance, T16 maps only, and it replaces a Shrine instead of adding one.',
      },
    ],
  },
  ScarabDomination4: removed('Shrines guarded by Atlas bosses'),

  // ───────────────────────── Essence ─────────────────────────
  ScarabEssence1: {
    effects: [
      {
        label: 'Additional Imprisoned Monsters',
        scarab: 3,
        unit: 'count',
        tree329: [
          { text: 'chance to contain an additional Imprisoned Monster', scale: 0.01 },
          { text: 'Your Maps contain an additional Imprisoned Monster', fixed: 1 },
        ],
        tree330: [{ text: 'Surpassing Chance to contain an Imprisoned Monster' }],
        note: 'Patch notes: Essences now also have a base chance to spawn in maps (not counted).',
      },
    ],
  },
  ScarabEssence5: removed('Essence modifiers spread between imprisoned monsters'),
  ScarabEssence2: {
    effects: [
      {
        label: 'Essences a tier higher',
        scarab: 100,
        unit: '%',
        stacks: false,
        cap: 100,
        tree330: [{ text: 'Essences found in your Maps have #% chance to be a tier higher' }],
        note: 'Amplified Energies (at least one top-tier essence) also helps.',
      },
    ],
  },
  ScarabEssence4: {
    effects: [
      {
        label: 'Rare natural inhabitants imprisoned by essences',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'partial',
        treeUnit: '% chance (Wild Rogue Exiles only)',
        tree330: [{ text: 'Wild Rogue Exiles in your Maps have #% chance to be imprisoned in Essences' }],
        note: 'Supernatural Genesis is a narrow version: only Wild Rogue Exiles, and only a 25% chance (the scarab imprisoned every rare inhabitant).',
      },
    ],
  },
  ScarabEssence3: removed('Essence corruption only upgrades/transforms'),

  // ───────────────────────── Expedition ─────────────────────────
  ScarabExpedition1: thread('Expedition encounter', 'Expedition Threads'),
  ScarabExpedition5: {
    effects: [
      {
        label: 'Extra Remnant modifiers',
        scarab: 4,
        unit: 'count (mods)',
        stacks: false,
        tree329: [{ text: 'Remnants in your Maps have #% chance to have an additional Suffix Modifier', scale: 0.01 }],
        tree330: [
          { text: 'Remnants in your Maps have an additional Suffix Modifier', fixed: 1 },
          { text: 'Remnants in your Maps have an additional Prefix Modifier', fixed: 1 },
          { text: 'Remnants in your Maps have #% chance to have an additional Suffix Modifier', scale: 0.01 },
        ],
        note: 'Scarab: +2 prefixes and +2 suffixes.',
      },
    ],
  },
  ScarabExpedition4: binary('Logbooks always 4 implicits + remnant scaling', [{ text: 'Logbooks found in your Maps always have # Implicit Modifiers', fixed: 100 }], 'Nothing Ventured, Nothing Gained notable.'),
  ScarabExpedition2: {
    effects: [
      {
        label: 'More Runic Monster markers',
        scarab: 100,
        unit: '%',
        tree329: [{ text: 'increased number of Runic Monster Markers' }],
        tree330: [{ text: 'increased number of Runic Monster Markers' }],
      },
    ],
  },
  ScarabExpedition3: {
    effects: [
      {
        label: 'More explosives',
        scarab: 50,
        unit: '%',
        tree329: [{ text: 'increased number of Explosives in your Maps' }],
        tree330: [{ text: 'increased number of Explosives in your Maps' }],
      },
      {
        label: 'Explosive radius',
        scarab: 80,
        unit: '%',
        tree329: [{ text: 'increased Explosive Radius in your Maps', exclude: ['Extreme Archaeology'] }],
        tree330: [{ text: 'increased Explosive Radius in your Maps', exclude: ['Extreme Archaeology'] }],
        note: 'Ignores the Extreme Archaeology keystone (one explosive only).',
      },
    ],
  },

  // ───────────────────────── Harvest ─────────────────────────
  ScarabHarvest1: {
    effects: [
      {
        label: 'Harvest content',
        scarab: 1,
        unit: 'count',
        stacks: false,
        fate: 'reworked',
        tree329: [{ text: 'chance to contain The Sacred Grove', scale: 0.01 }],
        tree330: [{ text: 'Surpassing Chance to contain Sacred Flora' }],
        note: 'Harvest was reworked: the Sacred Grove sub-area is gone and Sacred Flora spawns in the map. The tree has a lot of Surpassing Chance for it, but it is a different encounter.',
      },
    ],
  },
  ScarabHarvest3: removed('Extra Tier 4 seeds in the Grove', 'Harvest was reworked (no more Sacred Grove seeds).'),
  ScarabHarvest2: {
    effects: [
      {
        label: 'Lifeforce duplicated',
        scarab: 100,
        unit: '%',
        stacks: false,
        cap: 100,
        tree329: [{ text: 'Lifeforce dropped by Harvest Monsters in your Maps has #% chance to be Duplicated' }],
        tree330: [{ text: 'Lifeforce dropped by Sacred Fauna in your Maps has #% chance to be Duplicated' }],
      },
    ],
  },

  // ───────────────────────── Horned ─────────────────────────
  ScarabUber4: removed('Maven invitation bosses in T16'),
  ScarabUber1: {
    effects: [
      {
        label: 'More Magic Monsters',
        scarab: 150,
        unit: '%',
        tree329: [{ text: 'increased number of Magic Monsters in your Maps' }],
        tree330: [{ text: 'increased number of Magic Monsters in your Maps' }],
      },
      { label: 'Magic monsters get an extra modifier', scarab: 1, unit: 'binary', stacks: false, fate: 'removed', weight: 0.5 },
    ],
    note: 'Also related: Group Solidarity upgrades 4 Monster Packs to Magic (a pack count, so not added to the % above).',
  },
  ScarabUber6: removed('Rarity per kill (up to 400%)'),
  ScarabUber2: {
    effects: [{ label: 'Extra Rare monster modifiers', scarab: 2, unit: 'count', tree330: [{ text: 'Rare Monsters in your Maps have an additional Modifier', fixed: 1 }] }],
  },
  ScarabUber7: removed('Packs replaced by Atlas bosses'),
  ScarabUber3: {
    effects: [
      {
        label: 'Map device items not consumed',
        scarab: 100,
        unit: '%',
        stacks: false,
        cap: 100,
        tree330: [{ text: 'Map Device has #% chance not to consume Threads' }],
        note: 'Subtle Manipulations: 20% chance to not consume Threads.',
      },
    ],
  },
  ScarabUber5: removed('Rare/unique drops transformed by reward modifiers'),

  // ───────────────────────── Incursion ─────────────────────────
  ScarabIncursion1: thread('Alva / Incursions in map', 'Incursion Threads'),
  ScarabIncursion3: {
    effects: [
      {
        label: 'Incursion monsters at least Magic',
        scarab: 35,
        unit: '%',
        cap: 100,
        tree329: [{ text: 'chance for all Monsters to be at least Magic' }],
        tree330: [{ text: 'chance for all Monsters to be at least Magic' }],
      },
      {
        label: 'Incursion pack size',
        scarab: 15,
        unit: '%',
        tree329: [{ text: 'Incursions in your Maps have #% increased Pack Size' }],
        tree330: [{ text: 'Incursions in your Maps have #% increased Pack Size' }],
      },
    ],
  },
  ScarabIncursion2: {
    effects: [
      {
        label: 'Extra Incursion packs',
        scarab: 14,
        unit: 'count (packs)',
        tree330: [{ text: 'Your Maps contain an additional pack of Incursion Monsters', fixed: 1 }],
        note: 'Scarab: 12–16 packs (avg 14). Soldiers of Yore also spawns invader packs when you leave an Incursion (not counted).',
      },
    ],
  },
  ScarabIncursion4: removed('Itemised Temple from the final Architect'),

  // ───────────────────────── Influence ─────────────────────────
  ScarabInfluenceNew3: {
    effects: [
      {
        label: 'Influenced pack size',
        scarab: 40,
        unit: '%',
        tree329: [{ text: 'Monster Packs Influenced by The Searing Exarch in your Maps have #% increased Pack Size' }],
        tree330: [{ text: 'Monster Packs Influenced by The Searing Exarch in your Maps have #% increased Pack Size' }],
        note: 'Uses the best single influence (Searing Exarch; Eater of Worlds is identical). Those nodes are unchanged from 3.29.',
      },
    ],
  },
  ScarabInfluenceNew4: removed('Guardian/Conqueror/Synthesis boss with the map boss'),
  ScarabInfluenceNew2: removed('Elder influence'),
  ScarabInfluenceNew1: removed('Shaper influence'),

  // ───────────────────────── Settlers (Kalguuran) ─────────────────────────
  ScarabSettlers1: {
    effects: [
      {
        label: 'Additional Ore Deposits',
        scarab: 2,
        unit: 'count',
        tree330: [{ text: 'chance to contain multiple Ore Deposits', scale: 0.01 }],
        note: 'Tree: "+% chance to contain Ore Deposits" (~144%) makes one deposit near-certain. Extra deposits only come from the "multiple Ore Deposits" chance, counted here as +1 each. The 3.29 Yield Upon Yield was a relative increase and is not counted.',
      },
    ],
  },
  ScarabSettlers4: removed('Ore deposits scale difficulty & ore per completed deposit'),
  ScarabSettlers2: binary('Ore guards at least Magic', [{ text: 'chance for Monsters guarding Ore Deposits in your Maps to be at least Magic' }], 'Mineral Influence: 50% chance.'),
  ScarabSettlers3: binary('Smelted Bars instead of Marking Ore', [{ text: 'chance to grant Smelted Bars instead of Marking Ore' }], 'Metamorphic Refinement: 20% chance.'),

  // ───────────────────────── Legion ─────────────────────────
  ScarabLegionNew1: thread('Additional Legion encounter', 'Legion Threads'),
  ScarabLegionNew5: removed('Monsters can be broken out of stasis multiple times'),
  ScarabLegionNew2: {
    effects: [
      {
        label: 'Additional Sergeants',
        scarab: 5,
        unit: 'count',
        tree329: [{ text: 'Legion Encounters in your Maps contain # additional Sergeants' }],
        tree330: [{ text: 'Legion Encounters in your Maps contain # additional Sergeants' }],
      },
    ],
  },
  ScarabLegionNew3: {
    effects: [{ label: 'Chests spread rewards to monsters', scarab: 20, unit: '%', cap: 100, tree330: [{ text: 'chance to spread their Rewards to Legion Monsters' }] }],
  },

  // ───────────────────────── Ritual ─────────────────────────
  ScarabRitual3: {
    effects: [{ label: 'More Ritual favours', scarab: 100, unit: '%', tree330: [{ text: 'offer #% increased Favours' }], note: 'Blood Pact: 30%.' }],
  },
  ScarabRitual4: {
    effects: [{ label: 'Extra rare itemised corpse', scarab: 1, unit: 'count', tree330: [{ text: 'contain an additional Rare Itemised Corpse Monster', fixed: 1 }] }],
  },
  ScarabRitual1: {
    effects: [
      {
        label: 'Extra rerolls',
        scarab: 2,
        unit: 'count',
        tree329: [{ text: 'allow rerolling Favours # additional times' }],
        tree330: [{ text: 'allow rerolling Favours # additional times' }],
      },
      { label: 'Free rerolls', scarab: 2, unit: 'count', tree330: [{ text: 'has no Cost # additional time' }] },
    ],
  },
  ScarabRitual2: removed('Wildwood wisp at each altar (+100% tribute)', 'A Light in the Dark (wisp-empowered revived monsters) is a different effect.'),

  // ───────────────────────── Misc ─────────────────────────
  ScarabMisc2: {
    effects: [{ label: 'Packs with mirrored rares', scarab: 4, unit: 'count (packs)', tree330: [{ text: 'additional Packs with Mirrored Rare Monsters' }], note: 'Imperfect Reflections: 3 packs.' }],
  },
  ScarabMisc3: ember(
    'Pantheon-touched rares',
    'Allflame Ember of the Divine',
    'The new Allflame Ember of the Divine enchants a Map so 5 Monster Packs are replaced by packs led by a Pantheon-Touched Rare Monster. The scarab made up to 3 Rares in the Map Pantheon-Touched instead.',
  ),
  ScarabMisc4: removed('Hunted Traitors'),
  ScarabMisc1: {
    effects: [
      {
        label: 'Magic pack size',
        scarab: 40,
        unit: '%',
        tree330: [{ text: 'increased Magic Pack Size in your Maps' }],
        note: 'Deep Bloodlines: 25%. Group Solidarity (4 packs upgraded to Magic) also adds magic monsters, but is not a pack-size bonus.',
      },
    ],
  },
  ScarabMisc11: removed('Resplendent Tempest'),
  ScarabMisc5: {
    effects: [{ label: 'Portals not consumed', scarab: 50, unit: '%', cap: 100, tree330: [{ text: 'Portals to your Maps have #% chance to not be consumed' }] }],
  },
  ScarabMisc8: {
    effects: [
      {
        label: 'Wisp-empowered monsters',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree330: [{ text: 'increased chance to contain the Viridian Wildwood' }],
        note: 'Viridian Wildwood is now a tertiary mechanic. The tree only raises its chance to appear.',
      },
    ],
  },
  ScarabMisc10: {
    effects: [{ label: 'Suffix modifier effect', scarab: 100, unit: '%', tree330: [{ text: 'increased effect of Suffix Modifiers on your Maps' }], note: 'Malignant Modifiers (suffix choice): 25%, with no prefix downside.' }],
  },
  ScarabMisc9: {
    effects: [{ label: 'Prefix modifier effect', scarab: 100, unit: '%', tree330: [{ text: 'increased effect of Prefix Modifiers on your Maps' }], note: 'Malignant Modifiers (prefix choice): 25%, with no suffix downside.' }],
  },

  // ───────────────────────── Delve ─────────────────────────
  ScarabSulphiteNew1: removed('Niko in map', 'Delve Atlas clusters were removed in 3.30.'),
  ScarabSulphiteNew3: removed('Sulphite fumes (+item quantity)', 'Delve Atlas clusters were removed in 3.30.'),

  // ───────────────────────── Unique monsters (Titanic) ─────────────────────────
  ScarabUniquesNew1: {
    effects: [
      {
        label: 'Unique rarity per 1% pack size',
        scarab: 1,
        unit: '% per 1% pack size',
        tree330: [{ text: 'Rarity of Items from Unique Monsters in your Maps per #% Map Pack Size' }],
        note: 'Gross Abnormalities keeps the rarity (and toughness/damage) scaling.',
      },
      { label: 'Unique quantity per 1% pack size', scarab: 1, unit: 'binary', stacks: false, fate: 'removed' },
    ],
  },
  ScarabUniquesNew3: {
    effects: [
      {
        label: 'Extra unique monster modifiers',
        scarab: 4,
        unit: 'count',
        tree330: [{ text: 'Unique Monsters in your Maps have # additional Monster Modifiers' }, { text: 'Unique Monsters in your Maps have an additional Monster Modifier', fixed: 1 }],
      },
    ],
  },
  ScarabUniquesNew2: {
    effects: [
      {
        label: 'Additional reward on unique monsters',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'partial',
        treeUnit: 'see nodes',
        tree330: [{ text: 'increased Gold dropped by Unique Monsters', nodes: ['Gilded Armour'] }],
        note: 'Gilded Armour is this scarab in disguise: it keeps the same 30% increased Toughness for Unique Monsters, but the extra reward (up to 3 with 3 scarabs) became only 100% increased Gold.',
      },
    ],
  },

  // ───────────────────────── Torment ─────────────────────────
  ScarabTormentNew1: {
    effects: [
      {
        label: 'Additional Tormented Spirits',
        scarab: 4,
        unit: 'count',
        tree329: [
          { text: 'chance to be haunted by an additional Tormented Spirit', scale: 0.01 },
          { text: 'Your Maps are haunted by an additional Tormented Spirit', fixed: 1 },
        ],
        tree330: [{ text: 'Surpassing Chance to be haunted by a Tormented Spirit' }],
      },
      {
        label: 'Spirits set free & dig up a monster',
        scarab: 10,
        unit: '%',
        cap: 100,
        weight: 0.5,
        tree330: [{ text: 'chance to be set free when Possessed Monsters are slain' }],
        note: 'Disturb the Dead now digs up a Rare Monster (scarab: a Possessed Monster).',
      },
    ],
  },
  ScarabTormentNew2: {
    effects: [
      {
        label: 'Unusual spirit variants',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'partial',
        treeUnit: '% increased chance',
        tree330: [{ text: 'increased chance for your Maps to contain certain Tormented Spirits' }],
        note: 'Fated Meeting raises one chosen rare spirit. Exodus of Souls and Unrelenting Torment help, but nothing replaces every spirit.',
      },
    ],
  },
  ScarabTormentNew4: removed('Rares possessed by up to 3 spirits', 'Seance ("up to 5 Rare Monsters are Possessed") was already on the 3.29 tree and is unchanged.'),

  // ───────────────────────── Mercenaries (Trarthan) ─────────────────────────
  ScarabMercenaries1: {
    effects: [
      {
        label: 'Map has a Mercenary',
        scarab: 100,
        unit: '%',
        stacks: false,
        cap: 100,
        tree329: [{ text: 'chance to be inhabited by a Mercenary' }],
        tree330: [{ text: 'chance to be inhabited by a Mercenary' }],
        note: 'Both trees can reach ≥100% Mercenary chance on their own.',
      },
    ],
  },
  ScarabMercenaries2: {
    effects: [
      {
        label: 'Mercenary is Infamous',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree329: [{ text: 'chance for Mercenaries found in your Maps to be Infamous' }],
        tree330: [{ text: 'chance for Mercenaries found in your Maps to be Infamous' }],
      },
      { label: 'Two Wild Mercenaries escort', scarab: 100, unit: '%', stacks: false, cap: 100, tree330: [{ text: 'accompanied by two Wild Mercenaries', fixed: 100 }], note: 'Stacked Odds notable.' },
    ],
  },
  ScarabMercenaries3: {
    effects: [
      {
        label: 'All mercenary gear Unique',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'partial',
        treeUnit: 'see nodes',
        tree330: [{ text: 'Equipment Items on Infamous Mercenaries found in your Maps are Unique' }, { text: 'chance for Items worn by Mercenaries found in Maps to be Unique' }],
        note: 'Renowned Fighter: at least 3 items Unique, Infamous mercenaries only. Plus % increased unique chance on small nodes.',
      },
    ],
  },
  ScarabMercenaries4: {
    effects: [{ label: 'Wild Mercenary joins Rogue Exiles', scarab: 50, unit: '%', cap: 100, tree330: [{ text: 'chance to be accompanied by a Wild Mercenary' }] }],
  },

  // ───────────────────────── Ultimatum ─────────────────────────
  ScarabUltimatum1: thread('Ultimatum encounter', 'Ultimatum Threads'),
  ScarabUltimatum2: {
    effects: [
      {
        label: 'Rewards as if +rounds',
        scarab: 2,
        unit: 'count (rounds)',
        tree329: [{ text: 'grant rewards as though you completed an additional Round', fixed: 1 }],
        tree330: [{ text: 'grant rewards as though you completed an additional Round', fixed: 1 }],
      },
      {
        label: 'Ultimatum monster experience',
        scarab: 150,
        unit: '%',
        weight: 0.5,
        tree329: [{ text: 'Ultimatum Monsters in your Maps grant #% increased Experience' }],
        tree330: [{ text: 'Ultimatum Monsters in your Maps grant #% increased Experience per Round', scale: 10 }],
        note: 'Trial by Fire is 10% per round; assumes 10 rounds.',
      },
    ],
  },
  ScarabUltimatum4: removed('Only Catalyst rewards', 'Brave The Tower (boss drops 10 catalysts) was already on the 3.29 tree.'),
  ScarabUltimatum3: {
    effects: [
      {
        label: 'Always a unique boss',
        scarab: 100,
        unit: '%',
        stacks: false,
        fate: 'chance',
        treeUnit: '% increased chance',
        tree329: [{ text: 'increased chance for the final Round to include a Boss' }],
        tree330: [{ text: 'increased chance for the final Round to include a Boss' }],
        note: 'The 3.30 tree has the same "increased chance" nodes as 3.29. Nothing replaced the guarantee.',
      },
    ],
  },
  ScarabUltimatum5: binary(
    'Catalyst rewards → Inscribed Ultimatums',
    [{ text: 'chance for Catalyst rewards offered by Ultimatums in your Maps to be replaced by Inscribed Ultimatum' }],
    'Bound for Utzaal: 25% chance.',
  ),
};

/**
 * Scarabs whose mechanic isn't simply their family (first = primary, used for grouping).
 * Overlay scarabs (Maven, influence) are listed under every layer they touch.
 */
const MECHANIC_OVERRIDES: Record<string, string[]> = {
  ScarabUber4: ['Maven'],
  ScarabUber1: ['Magic Monsters'],
  ScarabUber2: ['Rare Monsters'],
  ScarabUber3: ['Scarabs → Threads'],
  ScarabMisc1: ['Magic Monsters'],
  ScarabMisc2: ['Rare Monsters'],
  ScarabMisc3: ['Rare Monsters'],
  ScarabMisc8: ['Viridian Wildwood'],
  ScarabInfluenceNew3: ['The Searing Exarch', 'The Eater of Worlds', 'The Shaper and Elder', 'Conquerors'],
  ScarabInfluenceNew4: ['The Shaper and Elder', 'Conquerors', 'Synthesis'],
  ScarabMercenaries4: ['Mercenaries', 'Rogue Exiles'],
  ScarabTormentNew4: ['Torment', 'Rare Monsters'],
};
for (const [id, mechanics] of Object.entries(MECHANIC_OVERRIDES)) {
  if (!SCARAB_MAP[id]) throw new Error(`MECHANIC_OVERRIDES: unknown scarab id ${id}`);
  SCARAB_MAP[id] = { ...SCARAB_MAP[id], mechanics };
}

/**
 * Nodes related to a scarab but not counted in its numbers (different unit or target).
 * They show up on the node ("related scarab") so nothing looks like a plain "New" notable.
 */
const RELATED: Record<string, { node: string; note: string }[]> = {
  ScarabStrongboxNew4: [{ node: 'Hidden Horrors', note: '25% more packs from Strongboxes: more of the "ambush", but not a map full of Strongboxes.' }],
  ScarabUber1: [{ node: 'Group Solidarity', note: 'Upgrades 4 Monster Packs to Magic: more magic monsters, counted in packs not %.' }],
  ScarabMisc1: [{ node: 'Group Solidarity', note: 'Upgrades 4 Monster Packs to Magic: more magic packs, but not a pack-size bonus.' }],
  ScarabTormentNew2: [
    { node: 'Exodus of Souls', note: '10% chance (T16) for a Tormented Procurator: one rare spirit type, not all spirits.' },
    { node: 'Unrelenting Torment', note: 'Spirits more likely to be less common varieties (already on the 3.29 tree).' },
  ],
  ScarabBreachNew1: [{ node: 'Divide and Conquer', note: 'Choose "Hives" and every Breach is a Hive; the Hive itself now comes from Breach Threads.' }],
  ScarabMapsNew5: [{ node: 'Invasive Adversaries', note: '10% more difficult & rewarding packs (already on the 3.29 tree); no 300% map drop bonus.' }],
  ScarabSettlers1: [{ node: "Prospector's Luck", note: 'Raises the chance for the first deposit (unchanged from 3.29); extra deposits need the "multiple Ore Deposits" nodes.' }],
  ScarabIncursion2: [{ node: 'Soldiers of Yore', note: 'Invading Incursion packs spawn when you leave an Incursion (count not stated).' }],
  ScarabRitual2: [{ node: 'A Light in the Dark', note: 'Wisps empower revived monsters per completed Ritual; no tribute bonus.' }],
  ScarabBetrayal2: [{ node: 'Secrets Unveiled', note: 'Choice: 4% chance for Veiled Items to drop as Allflames (no extra ember packs).' }],
  ScarabEssence2: [{ node: 'Amplified Energies', note: 'At least one essence at the highest tier (already on the 3.29 tree).' }],
  ScarabUltimatum4: [{ node: 'Brave The Tower', note: 'Ultimatum bosses drop 10 catalysts (already on the 3.29 tree).' }],
  ScarabUber7: [{ node: 'Destructive Play', note: 'The Maven summons extra Atlas Bosses at map bosses (already on the 3.29 tree).' }],
  ScarabTormentNew4: [{ node: 'Seance', note: 'Up to 5 Rare Monsters Possessed (already on the 3.29 tree).' }],
};
/**
 * 3.30 changes outside the Atlas tree (patch notes, Endgame section) that matter for a scarab.
 * `via` marks the ones where the scarab's effect itself can still be had another way.
 */
const OUTSIDE: Record<string, OutsideNote> = {
  ScarabDelirium1: { via: 'Rare Map suffix', note: 'Rare Maps can now roll the suffix "Area contains a Mirror of Delirium", which does what the scarab did.' },
  ScarabBeyond1: {
    via: 'Rare Map suffix',
    note: 'Maps now have a base chance for a Demonic Evocator, and Rare Maps can roll "Area contains an Evocator of Beidat / K\'Tash / Ghorr". Kills in Maps also have a small natural chance to attract Demons from Beyond.',
  },
  ScarabMisc8: { via: 'Rare Map suffix', note: 'Rare Maps can roll "Area contains the Viridian Wildwood", and the Wildwood can now spawn in any Map tier (was Tier 16 only).' },
  ScarabDelirium2: { note: 'Fog from Mirrors of Delirium now spreads much faster at the start and lasts longer, more so at higher area levels.' },
  ScarabDelirium3: { note: 'Starting a Delirium encounter from a Mirror now has a chance for 1–3 bonus rewards.' },
  ScarabDelirium4: { note: 'Delirium Bosses now spawn more often in the fog, more so at higher area levels.' },
  ScarabDelirium5: { note: 'Layered Delirium Maps are legacy. Delirium Orbs now reroll a Rare Map with a Delirious modifier instead (5–50% per orb, up to 100%).' },
  ScarabBetrayal2: { note: 'Allflame Embers are now currency used on a Map, and each one states how many packs it replaces.' },
  ScarabAnarchy1: { note: 'Rogue Exiles now have much higher base item rarity and give more experience.' },
  ScarabAnarchy2: { note: 'Gigantic Rogue Exiles were buffed (more Life and Item Quantity, split clones keep their modifiers), but the tree has nothing that makes them more common.' },
  ScarabAnarchy4: { note: 'Exceptional Rogue Exiles no longer have the bonus that dropped their items Mirrored or upgraded their rarity.' },
  ScarabMapsNew4: { note: 'The Vaal Orb outcome that rerolled a Map with 8 modifiers is gone too. It now adds 2 modifiers (up to 9).' },
  ScarabTormentNew2: { note: 'Tormented Heretics, one of the unusual variants, now have a base chance to spawn. Monsters they touch can drop Threads.' },
  ScarabDomination1: { note: 'Covetous Shrines now have a base chance to spawn, and Gloom and Resonating Shrines spawn more often.' },
  ScarabEssence1: { note: 'The average number of Essences on Imprisoned Monsters now scales with the Map\'s Atlas Drop scaling.' },
  ScarabEssence2: { note: 'Weeping Essences no longer appear in yellow or red Maps, and Wailing Essences no longer in red Maps.' },
  ScarabHarvest1: { note: 'Sacred Flora now spawn in the Map itself, and in high-tier Maps one can be a Sacred Specimen that spawns a Harvest Boss.' },
  ScarabHarvest3: { note: 'The closest thing in 3.30: in high-tier Maps a Sacred Flora can be a Sacred Specimen that spawns a Harvest Boss.' },
  ScarabHarvest2: { note: 'Lifeforce now drops in bigger stacks from fewer seeds (about the same total), and Atlas Drops raise the Lifeforce found.' },
  ScarabRitual2: { note: "Wisp's Blessing in Ritual encounters now gives 50% increased Tribute (was 30%), but the patch notes don't say what spawns the wisp now." },
  ScarabUltimatum2: { note: 'Ultimatum rewards now keep improving after round 10.' },
  ScarabBeastsNew2: { note: 'Yellow beasts are no longer captured. Red beasts, which this scarab added, still are.' },
  ...Object.fromEntries(
    ['ScarabDivinationCardsNew1', 'ScarabMapsNew5', 'ScarabMisc3'].map((id) => [
      id,
      { note: "Allflame Embers drop from Syndicate rewards in non-Intervention Safehouses and from Elreon's Transportation. The patch notes don't list which reward gives which Ember." },
    ]),
  ),
};

for (const [id, outside] of Object.entries(OUTSIDE)) {
  if (!SCARAB_MAP[id]) throw new Error(`OUTSIDE: unknown scarab id ${id}`);
  SCARAB_MAP[id] = { ...SCARAB_MAP[id], outside };
}

for (const [id, related] of Object.entries(RELATED)) {
  if (!SCARAB_MAP[id]) throw new Error(`RELATED: unknown scarab id ${id}`);
  SCARAB_MAP[id] = { ...SCARAB_MAP[id], related };
}

/**
 * Look-alikes the build's resemblance check flagged that were reviewed and are NOT the
 * same effect. Listing them keeps the build report focused on new, unreviewed hits.
 */
export const REVIEWED_LOOKALIKES: Record<string, string> = {
  'Mounting Modifiers|Ambush Scarab of Potency': 'map modifier effect, not strongbox modifiers',
  'Rich Soil|Ambush Scarab of Potency': 'Sacred Flora modifiers, not strongbox modifiers',
  'Rogue Trader|Anarchy Scarab of Partnership': 'extra exile rewards, not pairs',
  'Rogue Trader|Anarchy Scarab of Gigantification': 'extra exile rewards, not Rogue Giants',
  'Exotic Repositories|Titanic Scarab of Legend': 'unique strongboxes, unrelated',
  'Exotic Repositories|Ambush Scarab': 'unique/mercenary strongboxes, not extra strongboxes',
  'Drawn to Power|Incursion Scarab of Champions': 'shrine guard packs (already in 3.29), unrelated',
  'Crystal Lattice|Essence Scarab of Calcification': 'extra essences on imprisoned monsters (already in 3.29)',
  'Shaping the Mountains|Essence Scarab of Ascent': '"1 tier higher" is about maps, not essences',
};
