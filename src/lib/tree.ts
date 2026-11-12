import type { NodeKind, RawNode, RawTree, TreeNode } from './types.ts';
import { parseStat } from './stats.ts';

// Orbits with 16 and 40 slots use non-uniform angles (same as the passive tree).
const ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const ANGLES_40 = [
  0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220,
  225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350,
];

export function nodePosition(tree: RawTree, node: RawNode): { x: number; y: number } {
  const group = tree.groups[String(node.group)];
  if (!group) return { x: 0, y: 0 };
  const slots = tree.constants.skillsPerOrbit[node.orbit];
  const radius = tree.constants.orbitRadii[node.orbit];
  let deg: number;
  if (slots === 16) deg = ANGLES_16[node.orbitIndex];
  else if (slots === 40) deg = ANGLES_40[node.orbitIndex];
  else deg = (360 * node.orbitIndex) / slots;
  const rad = (deg * Math.PI) / 180;
  return { x: group.x + radius * Math.sin(rad), y: group.y - radius * Math.cos(rad) };
}

export function nodeKind(id: string, n: RawNode): NodeKind {
  // 'root' plus the unnamed, stat-less start node it connects to.
  if (id === 'root' || (!n.name && !n.stats?.length)) return 'root';
  if (n.isMastery) return 'mastery';
  if (n.isKeystone) return 'keystone';
  if (n.isWormhole) return 'wormhole';
  if (n.isNotable) return 'notable';
  return 'small';
}

/** Mastery names differ between versions for the same content. */
const MASTERY_ALIASES: Record<string, string> = {
  Harvest: 'Harvest / Sacred Flora',
  'Sacred Flora': 'Harvest / Sacred Flora',
  Scarabs: 'Scarabs → Threads',
  Threads: 'Scarabs → Threads',
};

export function normalizeMechanic(name: string): string {
  return MASTERY_ALIASES[name] ?? name;
}

/**
 * Ordered keyword rules. The first rule whose pattern matches "name + stats" wins.
 * Order matters: e.g. "Contract Killers" mentions Mercenaries AND contracts (Heist),
 * so Mercenaries is checked first.
 */
const NAME_RULES: [string, RegExp][] = [
  // 3.30 "Select a type of content" notables, split by which content they offer.
  ['Secondary content (choice)', /^(Blended Realities|Merged Worlds)$/],
  ['Tertiary content (choice)', /^Outside Entities$/],
  ['Scarabs → Threads', /Carapaces|Skittering Swarms|Remarkable Relics|Dextral Threads|Sinistral Threads|Threadbare|Unthreaded/],
];

const TEXT_RULES: [string, RegExp][] = [
  ['Atlas Memories', /Memory (Tear|Strand|Thread|Trace|Influence)|Incarnation of/],
  ['Maven', /Maven/],
  ['The Searing Exarch', /Searing Exarch/],
  ['The Eater of Worlds', /Eater of Worlds/],
  ['Conquerors', /Conqueror/],
  ['The Shaper and Elder', /\bShaper\b|\bElder\b/],
  ['Synthesis', /Synthes/],
  ['Labyrinth', /Labyrinth|Trial of Ascendancy/],
  ['Vaal Side Areas', /Vaal Side Area/],
  ['Ultimatum', /Ultimatum|Catalyst|Trialmaster/],
  ['Mercenaries', /Mercenar|Trarthan/],
  ['Harvest / Sacred Flora', /Harvest|Sacred (Grove|Flora|Fauna)|Lifeforce|\bPlants?\b|\bCrops?\b/],
  ['Settlers of Kalguur', /Ore Deposit|\bOre\b|Lost Shipment|Smelted|Kalguuran Scarab/],
  ['Incursion', /Incursion|\bAlva\b|Architect|Stone of Passage|Vaal Flesh Merchant|Cursed Treasure/],
  ['Abyss', /Abyss/],
  ['Bestiary', /Beast|Einhar|Bestiary/],
  ['Betrayal', /Syndicate|\bJun\b|Veiled|Safehouse|Betrayal/],
  ['Beyond', /Beyond|Demonic Evocator|Beidat|Ghorr|K'?tash/i],
  ['Blight', /Blight|Towers?\b|Ichor Pump/],
  ['Breach', /Breach|\bHive|Wombgift|Ailith|Flammable Burrow|Grasping Coffer|Chayula/],
  ['Delirium', /Deliri|Simulacrum|Cluster Jewel/],
  ['Delve', /Sulphite|\bNiko\b|Azurite/],
  ['Essence', /Essence|Imprisoned Monster/],
  ['Expedition', /Expedition|Remnant|Explosive|Logbook|Runic Monster|Artifacts?\b|Vendor Refresh|Detonation|Dannig|Gwennen|\bRog\b|Tujen/],
  ['Heist', /Heist|Smuggler's Cache|Blueprint|Rogue's Marker|\bContracts?\b/],
  ['Legion', /Legion|Timeless|Sergeant|Stasis|War Hoard/],
  ['Ritual', /Ritual|Favours?\b|Tribute|Blood-filled Vessel/],
  ['Rogue Exiles', /Rogue Exile|\bExiles?\b/],
  ['Shrines', /Shrine/],
  ['Strongboxes', /Strongbox/],
  ['Torment', /Torment|Possess|haunted/i],
  ['Mirage', /Mirage/],
  ['Sentinels', /Sentinel/],
  ['Viridian Wildwood', /Viridian Wildwood/],
  ['Atlas Anomalies', /Atlas Anomal|Shaped Region/],
  ['Divination Cards', /Divination|Diviner|Stacked Deck/],
  ['Scarabs → Threads', /Scarab|\bThreads?\b|Map Device|Fragment/],
  ['Gold', /\bGold/],
  ['Unique Monsters', /Unique Monsters/],
  ['Rare Monsters', /Rare Monsters/],
  ['Magic Monsters', /Magic Monsters|Magic Pack|upgraded to Magic/],
  [
    'Maps',
    /Maps found|tier higher|Explicit Modifiers on your Maps|Prefix Modifiers|Suffix Modifiers|random Modifier|Pack Size in your Maps|Quantity of Items found|Rarity of Items found|Portals|Map Boss|difficult and rewarding|Monsters in your Maps (deal|have)|Corrupted Rare Maps|Atlas Passives|Scrying Orb/,
  ],
];

export function classifyByText(name: string, statText: string): string | null {
  for (const [mech, re] of NAME_RULES) if (re.test(name)) return mech;
  const text = `${name} ${statText}`;
  for (const [mech, re] of TEXT_RULES) if (re.test(text)) return mech;
  return null;
}

/**
 * Parses a raw tree into TreeNodes with positions and a mechanic label.
 * Mechanic = keyword rules on name+stats, falling back to the nearest mastery
 * (masteries sit at cluster centres), else "General".
 */
export function buildNodes(tree: RawTree): TreeNode[] {
  const entries = Object.entries(tree.nodes);
  const masteries = entries
    .filter(([, n]) => n.isMastery)
    .map(([, n]) => ({ name: normalizeMechanic(n.name ?? ''), ...nodePosition(tree, n) }));

  return entries.map(([id, n]) => {
    const kind = nodeKind(id, n);
    const pos = id === 'root' ? { x: 0, y: 0 } : nodePosition(tree, n);
    const stats = (n.stats ?? []).map(parseStat);
    const variants = n.variantEffects?.map((v) => v.stats.map(parseStat));
    let mechanic: string;
    if (kind === 'mastery') mechanic = normalizeMechanic(n.name ?? '');
    else if (kind === 'root') mechanic = 'General';
    else if (kind === 'wormhole') mechanic = 'Gateways';
    else {
      const statText = [...stats, ...(variants ?? []).flat()].map((s) => s.text).join(' ');
      mechanic = classifyByText(n.name ?? '', statText) ?? nearestMastery(masteries, pos, 700) ?? 'General';
    }
    return {
      id,
      name: n.name ?? '',
      icon: kind === 'wormhole' ? 'Wormhole' : (n.icon ?? ''),
      kind,
      mechanic,
      stats,
      ...(variants ? { variants } : {}),
      x: Math.round(pos.x * 10) / 10,
      y: Math.round(pos.y * 10) / 10,
      out: n.out ?? [],
    };
  });
}

function nearestMastery(
  masteries: { name: string; x: number; y: number }[],
  pos: { x: number; y: number },
  maxDist: number,
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const m of masteries) {
    const d = Math.hypot(m.x - pos.x, m.y - pos.y);
    if (d < bestD) {
      bestD = d;
      best = m.name;
    }
  }
  return bestD <= maxDist ? best : null;
}
