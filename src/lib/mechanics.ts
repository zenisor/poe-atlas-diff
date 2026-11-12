/**
 * Mechanic taxonomy. Categories follow the 3.30 patch notes split:
 *  - primary: league mechanics added to maps with Threads
 *  - secondary: content whose spawn is driven by Surpassing Chance nodes
 *  - tertiary: content the tree can only make more likely
 *  - overlay: endgame layers that sit on top of whatever content a map has
 *  - juice: generic map/monster/reward modifiers
 *  - removed: mechanics whose Atlas clusters are gone in 3.30
 */
export type MechanicCategory = 'primary' | 'secondary' | 'tertiary' | 'overlay' | 'juice' | 'removed';

export const CATEGORIES: MechanicCategory[] = ['primary', 'secondary', 'tertiary', 'overlay', 'juice', 'removed'];

export const CATEGORY_LABEL: Record<MechanicCategory, string> = {
  primary: 'Primary league mechanics',
  secondary: 'Secondary mechanics',
  tertiary: 'Tertiary mechanics',
  overlay: 'Additive endgame layers',
  juice: 'Map juice & rewards',
  removed: 'Removed from the Atlas',
};

export const CATEGORY_NOTE: Record<MechanicCategory, string> = {
  primary: 'Added to maps with Threads in 3.30 (up to 8 Threads, max 3 types). Their scarabs became Threads; their "chance to contain X" nodes were removed.',
  secondary: 'No Threads. How often they appear comes from Surpassing Chance nodes (every 100% = +1 guaranteed), which replaced their scarabs.',
  tertiary: 'Only "increased chance to appear" clusters. Nothing guarantees them anymore.',
  overlay: 'Layers that stack on top of any map content (Maven witnessing, Eldritch altars/influence, Shaper/Elder, Conquerors, Synthesis, Memories, Anomalies).',
  juice: 'Generic map modifiers, monster density/rarity and reward nodes that apply to every strategy.',
  removed: 'Atlas clusters removed in 3.30.',
};

export const MECHANIC_CATEGORY: Record<string, MechanicCategory> = {
  Abyss: 'primary',
  Bestiary: 'primary',
  Betrayal: 'primary',
  Blight: 'primary',
  Breach: 'primary',
  Expedition: 'primary',
  Incursion: 'primary',
  Legion: 'primary',
  Ritual: 'primary',
  Ultimatum: 'primary',

  Essence: 'secondary',
  'Harvest / Sacred Flora': 'secondary',
  Mercenaries: 'secondary',
  'Settlers of Kalguur': 'secondary',
  'Rogue Exiles': 'secondary',
  Shrines: 'secondary',
  Strongboxes: 'secondary',
  Torment: 'secondary',
  'Secondary content (choice)': 'secondary',

  Beyond: 'tertiary',
  Delirium: 'tertiary',
  Mirage: 'tertiary',
  Sentinels: 'tertiary',
  'Viridian Wildwood': 'tertiary',
  Labyrinth: 'tertiary',
  'Tertiary content (choice)': 'tertiary',

  Maven: 'overlay',
  'The Searing Exarch': 'overlay',
  'The Eater of Worlds': 'overlay',
  'The Shaper and Elder': 'overlay',
  Conquerors: 'overlay',
  Synthesis: 'overlay',
  'Atlas Memories': 'overlay',
  'Atlas Anomalies': 'overlay',

  Maps: 'juice',
  'Magic Monsters': 'juice',
  'Rare Monsters': 'juice',
  'Unique Monsters': 'juice',
  'Divination Cards': 'juice',
  Gold: 'juice',
  'Scarabs → Threads': 'juice',
  Gateways: 'juice',
  General: 'juice',

  Delve: 'removed',
  Heist: 'removed',
  'Vaal Side Areas': 'removed',
};

export function categoryOf(mechanic: string): MechanicCategory {
  return MECHANIC_CATEGORY[mechanic] ?? 'juice';
}

/** Sort key: category order first, then name. */
export function compareMechanics(a: string, b: string): number {
  return CATEGORIES.indexOf(categoryOf(a)) - CATEGORIES.indexOf(categoryOf(b)) || a.localeCompare(b);
}

/**
 * The mechanic filter used across the UI: '' = all, 'cat:<category>' = a whole
 * category, anything else = one mechanic.
 */
export function matchesMechanic(mechanic: string | string[], filter: string): boolean {
  if (!filter) return true;
  const list = Array.isArray(mechanic) ? mechanic : [mechanic];
  if (filter.startsWith('cat:')) return list.some((m) => categoryOf(m) === filter.slice(4));
  return list.includes(filter);
}

export function filterLabel(filter: string): string {
  if (!filter) return 'All mechanics';
  if (filter.startsWith('cat:')) return CATEGORY_LABEL[filter.slice(4) as MechanicCategory] ?? filter;
  return filter;
}
