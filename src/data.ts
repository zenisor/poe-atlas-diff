import raw from './data/generated/atlas-data.json';
import presetsRaw from './data/generated/presets.json';
import patchRaw from './data/generated/patch-notes.json';
import type { PatchNote } from '../data/curation/patch-notes.ts';
import type { EffectDiff, GeneratedData, MapNode, MechanicSummary, ScarabResult, Strategy } from './lib/types.ts';
import { mainValue, toTemplate } from './lib/stats.ts';
import { notableIndex } from './lib/strategy.ts';
import { CATEGORIES, type MechanicCategory } from './lib/mechanics.ts';

export const data = raw as unknown as GeneratedData;
export const PRESETS = presetsRaw as Strategy[];

/** Paraphrased 3.30.0 patch notes that matter for Atlas farming (data/curation/patch-notes.ts). */
export const patchNotes = patchRaw as { url: string; atlasWide: { title: string; text: string }[]; notes: PatchNote[] };

/** Patch notes for any of these mechanics, in curated order, without duplicates. */
export function patchNotesFor(mechanicNames: string[]): PatchNote[] {
  const wanted = new Set(mechanicNames);
  return patchNotes.notes.filter((n) => n.mechanics.some((m) => wanted.has(m)));
}

export const scarabsById = new Map<string, ScarabResult>(data.scarabs.map((s) => [s.id, s]));
export const notablesByOldName = notableIndex(data.notables);
export const oldNotableNames = [...new Set(data.nodes.old.filter((n) => n.kind === 'notable' || n.kind === 'keystone').map((n) => n.name))].sort();
export const mechanics = data.mechanics.map((m) => m.name);
export const mechanicSummary = new Map(data.mechanics.map((m) => [m.name, m]));

/** Mechanic summaries grouped by category, in display order. */
export const mechanicsByCategory: { category: MechanicCategory; items: MechanicSummary[] }[] = CATEGORIES.map((category) => ({
  category,
  items: data.mechanics.filter((m) => m.category === category),
})).filter((g) => g.items.length);

/** 3.29 notable name -> mechanic (for grouping a strategy's notables). */
export const oldNotableMechanic = new Map(data.nodes.old.filter((n) => n.kind === 'notable' || n.kind === 'keystone').map((n) => [n.name, n.mechanic]));

/** 3.29 notable/keystone name -> its node (for art). */
export const oldNotableNode = new Map(data.nodes.old.filter((n) => n.kind === 'notable' || n.kind === 'keystone').map((n) => [n.name, n]));

/** The mechanic a strategy is mostly about (first content scarab, else first scarab/notable). */
export function strategyMechanic(s: Strategy): string | null {
  const scarabs = s.scarabs.map((x) => scarabsById.get(x.id)).filter((x): x is ScarabResult => !!x);
  const content = scarabs.find((x) => !['overlay', 'juice'].includes(x.category));
  return content?.mechanic ?? scarabs[0]?.mechanic ?? oldNotableMechanic.get(s.notables[0] ?? '') ?? null;
}

export const scarabsByName = new Map(data.scarabs.map((s) => [s.name, s]));

/** node id -> the notable diff it belongs to, per tree. */
export const notableDiffByNodeId = {
  old: new Map(data.notables.flatMap((d) => d.old.map((r) => [r.id, d] as const))),
  new: new Map(data.notables.flatMap((d) => d.new.map((r) => [r.id, d] as const))),
};
export const mapNodeById = {
  old: new Map(data.nodes.old.map((n) => [n.id, n])),
  new: new Map(data.nodes.new.map((n) => [n.id, n])),
};

// ---------- stacking: the same stat line on several nodes ----------

export interface LineStack {
  template: string;
  /** Non-choice nodes with this exact line. */
  count: number;
  /** Sum of their headline values (taking every one of them). */
  total: number;
  /** Best variant of each multiple-choice notable that offers the line. */
  choiceBonus: number;
  surpassing: boolean;
  nodes: MapNode[];
}

function stackIndex(nodes: MapNode[]): Map<string, LineStack> {
  const idx = new Map<string, LineStack>();
  const get = (t: string, text: string) => {
    let s = idx.get(t);
    if (!s) idx.set(t, (s = { template: t, count: 0, total: 0, choiceBonus: 0, surpassing: /Surpassing Chance/.test(text), nodes: [] }));
    return s;
  };
  for (const n of nodes) {
    if (n.kind !== 'small' && n.kind !== 'notable' && n.kind !== 'keystone') continue;
    // A pick-one notable's base line is only a header ("…certain Essences"); its meaning
    // depends on the chosen variant, so only its variants (as a choice bonus) can stack.
    for (const text of n.variants?.length ? [] : n.stats) {
      const s = get(toTemplate(text), text);
      s.count++;
      s.total += mainValue(text) ?? 1;
      s.nodes.push(n);
    }
    const best = new Map<string, number>();
    for (const v of n.variants ?? []) for (const text of v) best.set(toTemplate(text), Math.max(best.get(toTemplate(text)) ?? 0, mainValue(text) ?? 1));
    for (const [t, v] of best) {
      const text = n.variants!.flat().find((x) => toTemplate(x) === t)!;
      get(t, text).choiceBonus += v;
    }
  }
  return idx;
}

export const lineStacks = { old: stackIndex(data.nodes.old), new: stackIndex(data.nodes.new) };

/** template -> the effect diff that contains it, per tree (covers reworded/linked effects). */
export const effectByTemplate = {
  old: new Map<string, EffectDiff>(data.effects.flatMap((e) => (e.old?.templates ?? []).map((t) => [t, e] as const))),
  new: new Map<string, EffectDiff>(data.effects.flatMap((e) => (e.new?.templates ?? []).map((t) => [t, e] as const))),
};

// ---------- scarab -> tree links, seen from the node side ----------
export interface ScarabLink {
  scarab: ScarabResult;
  effect: ScarabResult['effects'][number];
}

/** 3.30 node id -> scarab effects that node (partly) took over. */
export const scarabLinksByNode = (() => {
  const map = new Map<string, ScarabLink[]>();
  for (const scarab of data.scarabs) {
    for (const effect of scarab.effects) {
      // 'removed' = the tree adds nothing beyond 3.29, so its nodes didn't take anything over.
      if (effect.fate === 'thread' || effect.fate === 'ember' || effect.fate === 'removed') continue;
      for (const id of new Set(effect.matches330.map((m) => m.nodeId))) {
        const list = map.get(id) ?? [];
        if (!list.some((l) => l.scarab.id === scarab.id && l.effect.label === effect.label)) list.push({ scarab, effect });
        map.set(id, list);
      }
    }
  }
  return map;
})();

/** 3.30 node id -> scarabs it is related to but not counted in (curated). */
export const relatedScarabsByNode = (() => {
  const map = new Map<string, { scarab: ScarabResult; note: string }[]>();
  for (const scarab of data.scarabs) for (const r of scarab.related) map.set(r.nodeId, [...(map.get(r.nodeId) ?? []), { scarab, note: r.note }]);
  return map;
})();
