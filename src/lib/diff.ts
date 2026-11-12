import type {
  EffectContribution,
  EffectDiff,
  EffectSide,
  EffectStatus,
  NotableDiff,
  NotableRef,
  NotableStatus,
  NotableValueChange,
  StatLine,
  TreeNode,
} from './types.ts';
import { jaccard, round, tokens } from './stats.ts';

// ---------- curation types ----------

export type LinkTemplate = string | { template: string; fixed?: number };

/** Ties together effects whose wording changed between versions. */
export interface EffectLink {
  old: LinkTemplate[];
  new: LinkTemplate[];
  /** Totals are in the same unit and can be compared numerically. */
  comparable: boolean;
  /** 'surpass': values are % where every 100% = +1 instance (display as counts). */
  unit?: 'surpass';
  label: string;
  note?: string;
}

/** Ties notables across versions (renames/merges/splits) or annotates a same-name pair. */
export interface NotableLink {
  old: string[];
  new: string[];
  note?: string;
  status?: NotableStatus;
}

// ---------- helpers ----------

const DIFFABLE = new Set(['small', 'notable', 'keystone']);

/**
 * Lines where a bigger number is worse for the player (monster toughness, damage taken
 * by players, costs). Only used to label buff vs nerf.
 */
const LOWER_IS_BETTER = [
  /(Monsters?|Boss(es)?|Fauna|Exiles)\b[^|]*\b(more|increased) (Life|Toughness)\b/i,
  /(Monsters?|Boss(es)?)\b[^|]*\bdeals? #% (more|increased) Damage/i,
  /reduced Radius each Round/i,
  /require #% increased Gold/i,
];

export function isLowerBetter(template: string): boolean {
  return LOWER_IS_BETTER.some((re) => re.test(template));
}

function linkTemplate(t: LinkTemplate): { template: string; fixed?: number } {
  return typeof t === 'string' ? { template: t } : t;
}

interface Occurrence {
  node: TreeNode;
  line: StatLine;
  choice: boolean;
}

function indexTemplates(nodes: TreeNode[]): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  const add = (key: string, occ: Occurrence) => {
    const list = map.get(key);
    if (list) list.push(occ);
    else map.set(key, [occ]);
  };
  for (const node of nodes) {
    if (!DIFFABLE.has(node.kind)) continue;
    for (const line of node.stats) add(line.template, { node, line, choice: false });
    for (const variant of node.variants ?? []) for (const line of variant) add(line.template, { node, line, choice: true });
  }
  return map;
}

function buildSide(templates: { template: string; fixed?: number }[], index: Map<string, Occurrence[]>): EffectSide | null {
  const contributions: EffectContribution[] = [];
  let total = 0;
  const bestChoicePerNode = new Map<string, number>();
  let surpassing = false;
  for (const { template, fixed } of templates) {
    for (const occ of index.get(template) ?? []) {
      // Lines without any number ("An additional Rare Monster is spawned...") count as 1 per node.
      const value = fixed ?? occ.line.main ?? (occ.line.values.length ? null : 1);
      surpassing ||= occ.line.surpassing;
      contributions.push({
        nodeId: occ.node.id,
        nodeName: occ.node.name,
        kind: occ.node.kind,
        value,
        text: occ.line.text,
        ...(occ.choice ? { choice: true } : {}),
      });
      if (value == null) continue;
      if (occ.choice) bestChoicePerNode.set(occ.node.id, Math.max(bestChoicePerNode.get(occ.node.id) ?? -Infinity, value));
      else total += value;
    }
  }
  if (!contributions.length) return null;
  const choiceBonus = [...bestChoicePerNode.values()].reduce((a, b) => a + b, 0);
  return {
    templates: templates.map((t) => t.template),
    total: round(total, 3),
    totalWithChoices: round(total + choiceBonus, 3),
    nodeCount: new Set(contributions.filter((c) => !c.choice).map((c) => c.nodeId)).size,
    surpassing,
    contributions,
  };
}

function majorityMechanic(sides: (EffectSide | null)[], nodeById: Map<string, TreeNode>): string {
  const counts = new Map<string, number>();
  // Prefer the new tree's grouping; fall back to the old one.
  for (const side of sides) {
    if (!side) continue;
    for (const c of side.contributions) {
      const mech = nodeById.get(c.nodeId)?.mechanic ?? 'General';
      counts.set(mech, (counts.get(mech) ?? 0) + 1);
    }
    if (counts.size) break;
  }
  let best = 'General';
  let bestN = -1;
  for (const [m, n] of counts) if (n > bestN) [best, bestN] = [m, n];
  return best;
}

function sameDistribution(a: EffectSide, b: EffectSide): boolean {
  const vals = (s: EffectSide) =>
    s.contributions
      .filter((c) => !c.choice)
      .map((c) => c.value)
      .sort()
      .join(',');
  return vals(a) === vals(b);
}

function compareSides(oldSide: EffectSide, newSide: EffectSide, lowerIsBetter: boolean): { status: EffectStatus; deltaPct: number | null } {
  const o = oldSide.totalWithChoices;
  const n = newSide.totalWithChoices;
  const deltaPct = o !== 0 ? round(((n - o) / Math.abs(o)) * 100, 1) : null;
  if (Math.abs(n - o) < 1e-9) {
    return { status: sameDistribution(oldSide, newSide) && oldSide.total === newSide.total ? 'unchanged' : 'reshuffled', deltaPct: 0 };
  }
  const up = n > o;
  return { status: up !== lowerIsBetter ? 'buffed' : 'nerfed', deltaPct };
}

// ---------- effect diff ----------

export function diffEffects(oldNodes: TreeNode[], newNodes: TreeNode[], links: EffectLink[]): EffectDiff[] {
  const oldIdx = indexTemplates(oldNodes);
  const newIdx = indexTemplates(newNodes);
  const oldById = new Map(oldNodes.map((n) => [n.id, n]));
  const newById = new Map(newNodes.map((n) => [n.id, n]));
  const consumedOld = new Set<string>();
  const consumedNew = new Set<string>();
  const results: EffectDiff[] = [];

  for (const link of links) {
    const oldT = link.old.map(linkTemplate);
    const newT = link.new.map(linkTemplate);
    for (const t of oldT) {
      if (!oldIdx.has(t.template)) throw new Error(`Effect link: old template not found in 3.29 tree: "${t.template}"`);
      consumedOld.add(t.template);
    }
    for (const t of newT) {
      if (!newIdx.has(t.template)) throw new Error(`Effect link: new template not found in 3.30 tree: "${t.template}"`);
      consumedNew.add(t.template);
    }
    const oldSide = buildSide(oldT, oldIdx);
    const newSide = buildSide(newT, newIdx);
    const lowerIsBetter = isLowerBetter(newT[0]?.template ?? oldT[0].template);
    let status: EffectStatus = 'reworded';
    let deltaPct: number | null = null;
    if (link.comparable && oldSide && newSide) ({ status, deltaPct } = compareSides(oldSide, newSide, lowerIsBetter));
    const newMech = majorityMechanic([newSide], newById);
    results.push({
      key: `link:${link.label}`,
      label: link.label,
      mechanic: newMech !== 'General' ? newMech : majorityMechanic([oldSide], oldById),
      status,
      old: oldSide && link.unit ? { ...oldSide, surpassing: true } : oldSide,
      new: newSide && link.unit ? { ...newSide, surpassing: true } : newSide,
      deltaPct,
      ...(lowerIsBetter ? { lowerIsBetter } : {}),
      ...(link.note ? { note: link.note } : {}),
    });
  }

  const allTemplates = new Set([...oldIdx.keys(), ...newIdx.keys()]);
  for (const template of allTemplates) {
    if (consumedOld.has(template) || consumedNew.has(template)) continue;
    const oldSide = oldIdx.has(template) ? buildSide([{ template }], oldIdx) : null;
    const newSide = newIdx.has(template) ? buildSide([{ template }], newIdx) : null;
    const lowerIsBetter = isLowerBetter(template);
    let status: EffectStatus;
    let deltaPct: number | null = null;
    if (oldSide && newSide) ({ status, deltaPct } = compareSides(oldSide, newSide, lowerIsBetter));
    else status = oldSide ? 'removed' : 'added';
    results.push({
      key: template,
      label: template,
      mechanic: newSide ? majorityMechanic([newSide], newById) : majorityMechanic([oldSide], oldById),
      status,
      old: oldSide,
      new: newSide,
      deltaPct,
      ...(lowerIsBetter ? { lowerIsBetter } : {}),
    });
  }

  addSimilarHints(results);
  return results.sort((a, b) => a.mechanic.localeCompare(b.mechanic) || a.label.localeCompare(b.label));
}

/** For unlinked removed/added effects, point at the closest effect on the other side. */
function addSimilarHints(results: EffectDiff[]) {
  const removed = results.filter((r) => r.status === 'removed');
  const added = results.filter((r) => r.status === 'added');
  const tok = new Map(results.map((r) => [r.key, tokens(r.label)]));
  const hint = (from: EffectDiff, pool: EffectDiff[]) => {
    let best: EffectDiff | null = null;
    let bestScore = 0;
    for (const cand of pool) {
      const sameMech = cand.mechanic === from.mechanic ? 0.1 : 0;
      const score = jaccard(tok.get(from.key)!, tok.get(cand.key)!) + sameMech;
      if (score > bestScore) [best, bestScore] = [cand, score];
    }
    if (best && bestScore >= 0.55) from.similar = { key: best.key, label: best.label, score: round(Math.min(bestScore, 1), 2) };
  };
  for (const r of removed) hint(r, added);
  for (const a of added) hint(a, removed);
}

// ---------- notable diff ----------

function toRef(n: TreeNode): NotableRef {
  return {
    id: n.id,
    name: n.name,
    icon: n.icon,
    kind: n.kind,
    mechanic: n.mechanic,
    stats: n.stats.map((s) => s.text),
    ...(n.variants ? { variants: n.variants.map((v) => v.map((s) => s.text)) } : {}),
  };
}

function notableTokens(n: TreeNode): Set<string> {
  return tokens([...n.stats, ...(n.variants ?? []).flat()].map((s) => s.template).join(' '));
}

function lineMap(n: TreeNode): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const s of n.stats) m.set(s.template, s.main);
  for (const v of n.variants ?? []) for (const s of v) if (!m.has(s.template)) m.set(s.template, s.main);
  return m;
}

/** Lines whose wording changed only slightly (e.g. "Scarabs" → "Threads") are paired up. */
const LINE_PAIR_THRESHOLD = 0.6;

export function compareNotables(oldN: TreeNode, newN: TreeNode): { status: NotableStatus; changes: NotableValueChange[] } {
  const a = lineMap(oldN);
  const b = lineMap(newN);
  const changes: NotableValueChange[] = [];
  const unpairedNew = new Set([...b.keys()].filter((t) => !a.has(t)));
  let sameShape = !!oldN.variants === !!newN.variants;

  for (const [t, ov] of a) {
    let newT: string | null = b.has(t) ? t : null;
    if (!newT) {
      // Fuzzy-pair with the most similar unpaired new line.
      let best: string | null = null;
      let bestScore = 0;
      for (const cand of unpairedNew) {
        const s = jaccard(tokens(t), tokens(cand));
        if (s > bestScore) [best, bestScore] = [cand, s];
      }
      if (best && bestScore >= LINE_PAIR_THRESHOLD) {
        newT = best;
        unpairedNew.delete(best);
      }
    }
    if (!newT) {
      sameShape = false;
      changes.push({ template: t, old: ov, new: null, better: null });
      continue;
    }
    const nv = b.get(newT)!;
    if (ov !== nv) {
      const up = (nv ?? 0) > (ov ?? 0);
      changes.push({ template: newT, old: ov, new: nv, better: up !== isLowerBetter(newT) });
    }
  }
  for (const t of unpairedNew) {
    sameShape = false;
    changes.push({ template: t, old: null, new: b.get(t)!, better: null });
  }

  if (!sameShape) return { status: 'changed', changes };
  if (!changes.length) return { status: 'unchanged', changes };
  const better = changes.filter((c) => c.better === true).length;
  const worse = changes.filter((c) => c.better === false).length;
  return { status: better && worse ? 'mixed' : better ? 'buffed' : 'nerfed', changes };
}

export function diffNotables(oldNodes: TreeNode[], newNodes: TreeNode[], links: NotableLink[]): NotableDiff[] {
  const isNotable = (n: TreeNode) => n.kind === 'notable' || n.kind === 'keystone';
  const oldPool = oldNodes.filter(isNotable);
  const newPool = newNodes.filter(isNotable);
  const usedOld = new Set<string>();
  const usedNew = new Set<string>();
  const results: NotableDiff[] = [];
  const byName = (pool: TreeNode[], name: string, used: Set<string>, side: string) => {
    const hits = pool.filter((n) => n.name === name && !used.has(n.id));
    if (!hits.length) throw new Error(`Notable link: "${name}" not found (or already used) in ${side} tree`);
    return hits[0];
  };

  for (const link of links) {
    const olds = link.old.map((name) => byName(oldPool, name, usedOld, '3.29'));
    const news = link.new.map((name) => byName(newPool, name, usedNew, '3.30'));
    olds.forEach((n) => usedOld.add(n.id));
    news.forEach((n) => usedNew.add(n.id));
    let status: NotableStatus = news.length ? 'replaced' : 'removed';
    let changes: NotableValueChange[] = [];
    if (olds.length === 1 && news.length === 1) {
      const cmp = compareNotables(olds[0], news[0]);
      changes = cmp.changes;
      // Same name on both sides = annotated pair; different names = rename/rework.
      status = olds[0].name === news[0].name ? cmp.status : 'replaced';
    }
    if (!olds.length) status = 'added';
    if (link.status) status = link.status;
    results.push({
      key: `${link.old.join('+')}→${link.new.join('+')}`,
      mechanic: (news[0] ?? olds[0]).mechanic,
      status,
      old: olds.map(toRef),
      new: news.map(toRef),
      changes,
      ...(link.note ? { note: link.note } : {}),
    });
  }

  // Same-name pairs. When a name appears more than once, pair by stat similarity.
  const remainingOld = oldPool.filter((n) => !usedOld.has(n.id));
  for (const o of remainingOld) {
    const candidates = newPool.filter((n) => n.name === o.name && !usedNew.has(n.id));
    if (!candidates.length) continue;
    const ot = notableTokens(o);
    const match = candidates.reduce((best, c) => (jaccard(ot, notableTokens(c)) > jaccard(ot, notableTokens(best)) ? c : best));
    usedOld.add(o.id);
    usedNew.add(match.id);
    const { status, changes } = compareNotables(o, match);
    results.push({ key: `${o.name}→${match.name}`, mechanic: match.mechanic, status, old: [toRef(o)], new: [toRef(match)], changes });
  }

  const leftoverOld = oldPool.filter((n) => !usedOld.has(n.id));
  const leftoverNew = newPool.filter((n) => !usedNew.has(n.id));
  const similar = (n: TreeNode, pool: TreeNode[]) => {
    const t = notableTokens(n);
    let best: TreeNode | null = null;
    let bestScore = 0;
    for (const c of pool) {
      const s = jaccard(t, notableTokens(c)) + (c.mechanic === n.mechanic ? 0.1 : 0);
      if (s > bestScore) [best, bestScore] = [c, s];
    }
    return best && bestScore >= 0.45 ? { name: best.name, score: round(Math.min(bestScore, 1), 2) } : undefined;
  };
  for (const o of leftoverOld) {
    const sim = similar(o, leftoverNew);
    results.push({ key: `${o.name}→`, mechanic: o.mechanic, status: 'removed', old: [toRef(o)], new: [], changes: [], ...(sim ? { similar: sim } : {}) });
  }
  for (const n of leftoverNew) {
    const sim = similar(n, leftoverOld);
    results.push({ key: `→${n.name}`, mechanic: n.mechanic, status: 'added', old: [], new: [toRef(n)], changes: [], ...(sim ? { similar: sim } : {}) });
  }
  return results.sort((a, b) => a.mechanic.localeCompare(b.mechanic) || a.key.localeCompare(b.key));
}
