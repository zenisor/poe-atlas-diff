import type {
  Fate,
  MatchedContribution,
  ScarabEffectResult,
  ScarabEffectSpec,
  ScarabResult,
  ScarabSpec,
  TreeMatch,
  TreeNode,
} from './types.ts';
import { round } from './stats.ts';
import { categoryOf } from './mechanics.ts';

/** Row from the wiki Cargo query (data/raw/scarabs-wiki.json). */
export interface WikiScarabRow {
  name: string;
  metadata_id: string;
  description: string | null;
  tags: string | null;
  release_version: string | null;
  removal_version: string | null;
  limit: string | null;
}

/** Retention at or above this counts as "kept at full power". */
export const FULL_THRESHOLD = 0.95;

export const FATE_LABEL: Record<Fate, string> = {
  full: 'Kept on the tree',
  reduced: 'Weaker on the tree',
  partial: 'Partly on the tree',
  chance: 'Only a chance on the tree',
  thread: 'Now comes from Threads',
  reworked: 'Mechanic reworked',
  removed: 'Gone',
};

const FAMILY_MECHANIC: Record<string, string> = {
  Abyss: 'Abyss',
  Ambush: 'Strongboxes',
  Anarchy: 'Rogue Exiles',
  Bestiary: 'Bestiary',
  Betrayal: 'Betrayal',
  Beyond: 'Beyond',
  Blight: 'Blight',
  Breach: 'Breach',
  Cartography: 'Maps',
  Delirium: 'Delirium',
  Divination: 'Divination Cards',
  Domination: 'Shrines',
  Essence: 'Essence',
  Expedition: 'Expedition',
  Harvest: 'Harvest / Sacred Flora',
  Horned: 'Maps',
  Incursion: 'Incursion',
  Influencing: 'The Shaper and Elder',
  Kalguuran: 'Settlers of Kalguur',
  Legion: 'Legion',
  Ritual: 'Ritual',
  Scarab: 'Maps',
  Sulphite: 'Delve',
  Titanic: 'Unique Monsters',
  Torment: 'Torment',
  Trarthan: 'Mercenaries',
  Ultimatum: 'Ultimatum',
};

export function scarabFamily(name: string): string {
  return name.split(' ')[0];
}

export function scarabMechanic(name: string): string {
  return FAMILY_MECHANIC[scarabFamily(name)] ?? 'Maps';
}

/** Wiki descriptions contain HTML spans and <br>; turn them into plain lines. */
export function descriptionLines(html: string | null): string[] {
  if (!html) return [];
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .split(/<br\s*\/?>/i)
    .map((l) => l.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const MATCHABLE = new Set(['small', 'notable', 'keystone']);

/**
 * Sums the tree's contribution for one effect. Lines with Surpassing Chance are
 * converted to an expected count (100% = +1) when the effect is measured in counts.
 * Multiple-choice nodes contribute only their best matching variant.
 */
export function sumMatches(nodes: TreeNode[], matches: TreeMatch[] | undefined, unit: string): { total: number; contributions: MatchedContribution[] } {
  const contributions: MatchedContribution[] = [];
  if (!matches?.length) return { total: 0, contributions };
  let total = 0;
  const bestChoice = new Map<string, MatchedContribution>();

  for (const m of matches) {
    const needle = m.text.toLowerCase();
    for (const node of nodes) {
      if (!MATCHABLE.has(node.kind)) continue;
      if (m.nodes && !m.nodes.includes(node.name)) continue;
      if (m.exclude?.includes(node.name)) continue;
      const lines = [
        ...node.stats.map((line) => ({ line, choice: false })),
        ...(node.variants ?? []).flatMap((v) => v.map((line) => ({ line, choice: true }))),
      ];
      for (const { line, choice } of lines) {
        if (!line.template.toLowerCase().includes(needle)) continue;
        const raw = m.fixed ?? (m.valueIndex != null ? line.values[m.valueIndex] : line.main);
        if (raw == null) continue;
        const scale = m.scale ?? (line.surpassing && unit === 'count' ? 0.01 : 1);
        const c: MatchedContribution = {
          nodeId: node.id,
          nodeName: node.name,
          kind: node.kind,
          text: line.text,
          value: round(raw * scale, 4),
          choice,
          surpassing: line.surpassing,
        };
        if (choice) {
          const prev = bestChoice.get(node.id);
          if (!prev || c.value > prev.value) bestChoice.set(node.id, c);
        } else {
          contributions.push(c);
          total += c.value;
        }
      }
    }
  }
  for (const c of bestChoice.values()) {
    contributions.push(c);
    total += c.value;
  }
  return { total: round(total, 4), contributions };
}

const cap = (v: number, c?: number) => (c != null ? Math.min(v, c) : v);

export function evaluateEffect(spec: ScarabEffectSpec, limit: number, oldNodes: TreeNode[], newNodes: TreeNode[]): ScarabEffectResult {
  const stacks = spec.stacks ?? true;
  const scarabMax = stacks ? spec.scarab * limit : spec.scarab;
  const m329 = sumMatches(oldNodes, spec.tree329, spec.unit);
  const m330 = sumMatches(newNodes, spec.tree330, spec.unit);
  const before = cap(m329.total + scarabMax, spec.cap);
  const after = cap(m330.total, spec.cap);
  const oldTreeOnly = cap(m329.total, spec.cap);

  const comparable = !spec.fate || spec.fate === 'full' || spec.fate === 'reduced' || spec.fate === 'removed';
  const retention = comparable && before > 0 ? round(after / before, 4) : null;
  const absorbed = comparable && scarabMax > 0 ? round(Math.max(0, after - oldTreeOnly) / scarabMax, 4) : null;

  let fate: Fate;
  let autoNote: string | undefined;
  if (spec.fate) fate = spec.fate;
  else if (!m330.contributions.length) fate = 'removed';
  else if (retention != null && retention >= FULL_THRESHOLD) fate = 'full';
  else if (after <= oldTreeOnly + 1e-9) {
    fate = 'removed';
    autoNote = "The 3.30 tree adds nothing on top of what the 3.29 tree already gave, so the scarab's power is simply gone.";
  } else fate = 'reduced';

  const note = [spec.note, autoNote].filter(Boolean).join(' ');
  return {
    label: spec.label,
    unit: spec.unit,
    ...(spec.treeUnit ? { treeUnit: spec.treeUnit } : {}),
    perScarab: spec.scarab,
    stacks,
    ...(spec.cap != null ? { cap: spec.cap } : {}),
    scarabMax: round(scarabMax, 4),
    tree329: m329.total,
    tree330: m330.total,
    before: round(before, 4),
    after: round(after, 4),
    retention,
    absorbed,
    fate,
    surpassing: m330.contributions.some((c) => c.surpassing),
    weight: spec.weight ?? 1,
    matches329: m329.contributions,
    matches330: m330.contributions,
    ...(note ? { note } : {}),
  };
}

export function overallFate(effects: ScarabEffectResult[]): Fate {
  const fates = effects.map((e) => e.fate);
  if (fates.every((f) => f === fates[0])) return fates[0];
  if (fates.every((f) => f === 'removed')) return 'removed';
  const primary = fates[0];
  if (primary === 'thread' || primary === 'chance' || primary === 'reworked') return primary;
  return 'reduced';
}

/** Weighted mean best-case retention; retention above 150% is clamped so one effect can't hide losses. */
export function overallRetention(effects: ScarabEffectResult[]): number | null {
  let sum = 0;
  let weight = 0;
  for (const e of effects) {
    if (e.retention == null) continue;
    sum += Math.min(e.retention, 1.5) * e.weight;
    weight += e.weight;
  }
  return weight ? round(sum / weight, 4) : null;
}

export function evaluateScarab(row: WikiScarabRow, spec: ScarabSpec, oldNodes: TreeNode[], newNodes: TreeNode[]): ScarabResult {
  const limit = Number(row.limit ?? 1) || 1;
  const id = row.metadata_id.split('/').pop()!;
  const effects = spec.effects.map((e) => evaluateEffect(e, limit, oldNodes, newNodes));
  const mechanics = spec.mechanics?.length ? spec.mechanics : [scarabMechanic(row.name)];
  return {
    id,
    name: row.name,
    family: scarabFamily(row.name),
    mechanic: mechanics[0],
    mechanics,
    category: categoryOf(mechanics[0]),
    related: (spec.related ?? []).map((r) => {
      const node = newNodes.find((n) => n.name === r.node && (n.kind === 'notable' || n.kind === 'keystone'));
      if (!node) throw new Error(`${row.name}: related node "${r.node}" not found in the 3.30 tree`);
      return { nodeId: node.id, nodeName: node.name, note: r.note };
    }),
    limit,
    description: descriptionLines(row.description),
    fate: overallFate(effects),
    retention: overallRetention(effects),
    effects,
    ...(spec.note ? { note: spec.note } : {}),
  };
}
