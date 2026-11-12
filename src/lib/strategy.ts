import type { Fate, NotableDiff, NotableStatus, ScarabEffectResult, ScarabResult, Strategy } from './types.ts';
import { round } from './stats.ts';
import { categoryOf, type MechanicCategory } from './mechanics.ts';

/** How a strategy's parts stack: the base content, layers added on top, and generic juice. */
export type StrategyLayer = 'content' | 'overlay' | 'juice';
export const LAYERS: StrategyLayer[] = ['content', 'overlay', 'juice'];
export const LAYER_LABEL: Record<StrategyLayer, string> = {
  content: 'Content',
  overlay: 'Layers on top',
  juice: 'Map juice',
};
export function layerOf(category: MechanicCategory): StrategyLayer {
  return category === 'overlay' ? 'overlay' : category === 'juice' ? 'juice' : 'content';
}

export const MAP_DEVICE_SLOTS = 5;

export interface StrategyEffectRow {
  label: string;
  unit: string;
  fate: Fate;
  /** Power from the scarabs actually used (perScarab x count, or perScarab if it doesn't stack). */
  scarabPower: number;
  before: number;
  after: number;
  retention: number | null;
  weight: number;
  surpassing: boolean;
}

export interface StrategyScarabRow {
  scarab: ScarabResult;
  layer: StrategyLayer;
  count: number;
  overLimit: boolean;
  effects: StrategyEffectRow[];
  fate: Fate;
  retention: number | null;
}

export interface StrategyNotableRow {
  name: string;
  mechanic: string;
  layer: StrategyLayer;
  status: NotableStatus | 'unknown';
  successors: string[];
  note?: string;
}

export type Verdict = 'better' | 'same' | 'mild' | 'nerfed' | 'gutted' | 'unknown';

export interface LayerBreakdown {
  layer: StrategyLayer;
  mechanics: string[];
  scarabRetention: number | null;
  coverage: number;
  slots: number;
  notables: number;
}

export interface StrategyEvaluation {
  scarabs: StrategyScarabRow[];
  layers: LayerBreakdown[];
  notables: StrategyNotableRow[];
  slotsUsed: number;
  overSlots: boolean;
  /** Weighted mean retention of quantifiable scarab effects (weight = effect weight x scarab count). */
  scarabRetention: number | null;
  /** Share of scarab "weight" whose fate could be quantified. */
  coverage: number;
  threadSlots: number;
  /** Slots whose scarab is now an Allflame Ember. */
  emberSlots: number;
  removedSlots: number;
  notableCounts: { kept: number; changed: number; removed: number };
  verdict: Verdict;
}

const COMPARABLE: Fate[] = ['full', 'reduced', 'removed'];

/** Re-evaluates one scarab effect for a given count instead of the full limit. */
export function effectForCount(e: ScarabEffectResult, count: number): StrategyEffectRow {
  const scarabPower = e.stacks ? e.perScarab * count : count > 0 ? e.perScarab : 0;
  const clamp = (v: number) => (e.cap != null ? Math.min(v, e.cap) : v);
  const before = clamp(e.tree329 + scarabPower);
  const after = clamp(e.tree330);
  const comparable = COMPARABLE.includes(e.fate);
  return {
    label: e.label,
    unit: e.unit,
    fate: e.fate,
    scarabPower: round(scarabPower, 4),
    before: round(before, 4),
    after: round(after, 4),
    retention: comparable && before > 0 ? round(after / before, 4) : null,
    weight: e.weight,
    surpassing: e.surpassing,
  };
}

export function verdictFor(retention: number | null): Verdict {
  if (retention == null) return 'unknown';
  if (retention >= 1.05) return 'better';
  if (retention >= 0.95) return 'same';
  if (retention >= 0.7) return 'mild';
  if (retention >= 0.4) return 'nerfed';
  return 'gutted';
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  better: 'Better in 3.30',
  same: 'About the same',
  mild: 'Slightly weaker',
  nerfed: 'Weaker',
  gutted: 'Mostly lost',
  unknown: "Can't be measured",
};

export function notableIndex(notables: NotableDiff[]): Map<string, NotableDiff> {
  const idx = new Map<string, NotableDiff>();
  for (const n of notables) for (const o of n.old) if (!idx.has(o.name)) idx.set(o.name, n);
  return idx;
}

/** Weighted mean retention over quantifiable effects (weight = effect weight x count). */
function aggregate(rows: StrategyScarabRow[]): { retention: number | null; coverage: number } {
  let weighted = 0;
  let quant = 0;
  let total = 0;
  for (const row of rows) {
    for (const e of row.effects) {
      const w = e.weight * row.count;
      total += w;
      if (e.retention == null) continue;
      weighted += Math.min(e.retention, 1.5) * w;
      quant += w;
    }
  }
  return { retention: quant ? round(weighted / quant, 4) : null, coverage: total ? round(quant / total, 4) : 0 };
}

export function evaluateStrategy(
  strategy: Strategy,
  scarabsById: Map<string, ScarabResult>,
  notablesByOldName: Map<string, NotableDiff>,
  notableMechanic: Map<string, string> = new Map(),
): StrategyEvaluation {
  const scarabRows: StrategyScarabRow[] = [];
  let threadSlots = 0;
  let emberSlots = 0;
  let removedSlots = 0;
  let slotsUsed = 0;

  for (const { id, count } of strategy.scarabs) {
    const scarab = scarabsById.get(id);
    if (!scarab || count <= 0) continue;
    slotsUsed += count;
    const effects = scarab.effects.map((e) => effectForCount(e, count));
    const { retention } = aggregate([{ scarab, count: 1, effects } as StrategyScarabRow]);
    if (scarab.fate === 'thread') threadSlots += count;
    if (scarab.fate === 'ember') emberSlots += count;
    if (scarab.fate === 'removed') removedSlots += count;
    scarabRows.push({ scarab, layer: layerOf(scarab.category), count, overLimit: count > scarab.limit, effects, fate: scarab.fate, retention });
  }

  const notableRows: StrategyNotableRow[] = strategy.notables.map((name) => {
    const diff = notablesByOldName.get(name);
    const mechanic = notableMechanic.get(name) ?? diff?.mechanic ?? 'General';
    const base = { name, mechanic, layer: layerOf(categoryOf(mechanic)) };
    if (!diff) return { ...base, status: 'unknown' as const, successors: [] };
    return { ...base, status: diff.status, successors: diff.new.map((n) => n.name).filter((n) => n !== name), ...(diff.note ? { note: diff.note } : {}) };
  });
  const notableCounts = { kept: 0, changed: 0, removed: 0 };
  for (const n of notableRows) {
    if (n.status === 'unchanged' || n.status === 'buffed') notableCounts.kept++;
    else if (n.status === 'removed' || n.status === 'unknown') notableCounts.removed++;
    else notableCounts.changed++;
  }

  const layers: LayerBreakdown[] = LAYERS.map((layer) => {
    const rows = scarabRows.filter((r) => r.layer === layer);
    const nots = notableRows.filter((n) => n.layer === layer);
    const { retention, coverage } = aggregate(rows);
    const mechanics = [...new Set([...rows.map((r) => r.scarab.mechanic), ...nots.map((n) => n.mechanic)])];
    return { layer, mechanics, scarabRetention: retention, coverage, slots: rows.reduce((a, r) => a + r.count, 0), notables: nots.length };
  }).filter((l) => l.slots || l.notables);

  const { retention: scarabRetention, coverage } = aggregate(scarabRows);
  return {
    scarabs: scarabRows,
    layers,
    notables: notableRows,
    slotsUsed,
    overSlots: slotsUsed > MAP_DEVICE_SLOTS,
    scarabRetention,
    coverage,
    threadSlots,
    emberSlots,
    removedSlots,
    notableCounts,
    verdict: verdictFor(scarabRetention),
  };
}
