/**
 * Builds src/data/generated/atlas-data.json from data/raw + data/curation.
 *
 * Run: npm run build-data   (after npm run fetch-data)
 *
 * Fails loudly when curation drifts from the data: unknown templates/notables,
 * scarab matches that hit nothing, missing scarab entries, invalid presets.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  EffectDiff,
  Fate,
  GeneratedData,
  MapNode,
  MapNodeStatus,
  MechanicSummary,
  NotableDiff,
  NotableStatus,
  RawTree,
  ScarabResult,
  TreeNode,
  AtlasArt,
  IconRef,
  SheetKey,
  SpriteSheet,
  Version,
} from '../src/lib/types.ts';
import { buildNodes } from '../src/lib/tree.ts';
import { diffEffects, diffNotables } from '../src/lib/diff.ts';
import { evaluateScarab, sumMatches, type WikiScarabRow } from '../src/lib/scarabs.ts';
import { EFFECT_LINKS } from '../data/curation/effect-links.ts';
import { NOTABLE_LINKS } from '../data/curation/notable-links.ts';
import { REVIEWED_LOOKALIKES, SCARAB_MAP } from '../data/curation/scarab-map.ts';
import { PRESET_STRATEGIES } from '../data/curation/strategies.ts';
import { TREE_SOURCES } from './tree-sources.ts';
import { categoryOf, compareMechanics, MECHANIC_CATEGORY } from '../src/lib/mechanics.ts';
import { resemblance } from '../src/lib/resemblance.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(join(root, p), 'utf8')) as T;

const oldTree = await readJson<RawTree>('data/raw/atlas-3.29.json');
const newTree = await readJson<RawTree>('data/raw/atlas-3.30.json');
const wikiRows = await readJson<WikiScarabRow[]>('data/raw/scarabs-wiki.json');

const oldNodes = buildNodes(oldTree);
const newNodes = buildNodes(newTree);

// ---------- diffs ----------
const effects = diffEffects(oldNodes, newNodes, EFFECT_LINKS);
const notables = diffNotables(oldNodes, newNodes, NOTABLE_LINKS);
effects.sort((a, b) => compareMechanics(a.mechanic, b.mechanic) || a.label.localeCompare(b.label));
notables.sort((a, b) => compareMechanics(a.mechanic, b.mechanic) || a.key.localeCompare(b.key));

// ---------- scarabs ----------
const removedIn330 = wikiRows.filter((r) => r.removal_version === '3.30.0');
const errors: string[] = [];
const scarabs: ScarabResult[] = [];
for (const row of removedIn330) {
  const id = row.metadata_id.split('/').pop()!;
  const spec = SCARAB_MAP[id];
  if (!spec) {
    errors.push(`No scarab-map entry for ${id} (${row.name})`);
    continue;
  }
  // Every declared match must hit at least one node, or the curation is stale.
  for (const eff of spec.effects) {
    for (const [side, nodes] of [['tree329', oldNodes], ['tree330', newNodes]] as const) {
      for (const m of eff[side] ?? []) {
        if (!sumMatches(nodes, [m], eff.unit).contributions.length) errors.push(`${row.name} / "${eff.label}": ${side} match "${m.text}" hits no node`);
      }
    }
  }
  scarabs.push(evaluateScarab(row, spec, oldNodes, newNodes));
}
const knownIds = new Set(removedIn330.map((r) => r.metadata_id.split('/').pop()));
for (const id of Object.keys(SCARAB_MAP)) if (!knownIds.has(id)) errors.push(`scarab-map has unknown id ${id}`);
scarabs.sort((a, b) => compareMechanics(a.mechanic, b.mechanic) || a.name.localeCompare(b.name));

// Every mechanic must have a category, so nothing silently lands in the wrong bucket.
const allMechanics = new Set([...oldNodes, ...newNodes].filter((n) => n.kind !== 'root').map((n) => n.mechanic));
for (const s of scarabs) s.mechanics.forEach((m) => allMechanics.add(m));
for (const m of allMechanics) if (!(m in MECHANIC_CATEGORY)) errors.push(`Mechanic "${m}" has no category in src/lib/mechanics.ts`);

// ---------- presets ----------
const scarabById = new Map(scarabs.map((s) => [s.id, s]));
const oldNotableNames = new Set(oldNodes.filter((n) => n.kind === 'notable' || n.kind === 'keystone').map((n) => n.name));
for (const p of PRESET_STRATEGIES) {
  for (const s of p.scarabs) {
    const sc = scarabById.get(s.id);
    if (!sc) errors.push(`Preset "${p.name}": unknown scarab ${s.id}`);
    else if (s.count > sc.limit) errors.push(`Preset "${p.name}": ${sc.name} x${s.count} exceeds limit ${sc.limit}`);
  }
  for (const n of p.notables) if (!oldNotableNames.has(n)) errors.push(`Preset "${p.name}": unknown 3.29 notable "${n}"`);
}

// ---------- curation review: scarabs-in-disguise ----------
// New notables whose wording resembles a scarab that the mapping does NOT link to them.
// Not an error (most hits are coincidental wording), but every new hit deserves a look.
const REVIEW_THRESHOLD = 0.4;
// Nodes already linked (counted or "related") to any scarab have been looked at, so skip them.
const accountedNodes = new Set(scarabs.flatMap((sc) => [...sc.effects.flatMap((e) => e.matches330.map((m) => m.nodeId)), ...sc.related.map((r) => r.nodeId)]));
const reviewHints: string[] = [];
for (const n of newNodes) {
  if (n.kind !== 'notable' && n.kind !== 'keystone') continue;
  const text = [...n.stats, ...(n.variants ?? []).flat()].map((l) => l.text).join(' ');
  for (const sc of scarabs) {
    if (sc.fate === 'thread' || sc.fate === 'full' || accountedNodes.has(n.id) || REVIEWED_LOOKALIKES[`${n.name}|${sc.name}`]) continue;
    const score = resemblance(sc.description.join(' '), text);
    if (score >= REVIEW_THRESHOLD) reviewHints.push(`${score.toFixed(2)}  ${n.name}  <->  ${sc.name} [${sc.fate}]`);
  }
}

if (errors.length) {
  console.error(`Curation errors (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

// ---------- node statuses for the map ----------
/**
 * Small nodes are coloured by how their own value compares with the same effect's
 * per-node values on the other tree (not by the tree-wide total, which mostly reflects
 * how many copies exist). Notables/keystones use the notable diff status.
 */
function lineStatus(e: EffectDiff, value: number | null, side: 'old' | 'new'): MapNodeStatus {
  if (e.status === 'added') return 'added';
  if (e.status === 'removed') return 'removed';
  const other = side === 'new' ? e.old : e.new;
  if (!other || value == null || (e.status === 'reworded' && !e.old?.surpassing)) return e.status === 'reworded' ? 'changed' : 'unchanged';
  const vals = other.contributions.filter((c) => !c.choice && c.value != null && c.kind === 'small').map((c) => c.value!);
  if (!vals.length) return 'unchanged';
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  // On the new tree, "higher than any old node" = buffed. On the old tree it's mirrored.
  const stronger = side === 'new' ? value > hi : value < lo;
  const weaker = side === 'new' ? value < lo : value > hi;
  if (!stronger && !weaker) return 'unchanged';
  return stronger !== !!e.lowerIsBetter ? 'buffed' : 'nerfed';
}

function nodeStatuses(nodes: TreeNode[], side: 'old' | 'new'): Map<string, MapNodeStatus> {
  const lineStatuses = new Map<string, MapNodeStatus[]>();
  for (const e of effects) {
    for (const c of e[side]?.contributions ?? []) {
      if (c.choice) continue;
      const list = lineStatuses.get(c.nodeId) ?? [];
      list.push(lineStatus(e, c.value, side));
      lineStatuses.set(c.nodeId, list);
    }
  }
  const notableStatus = new Map<string, NotableStatus>();
  for (const n of notables) for (const ref of n[side]) notableStatus.set(ref.id, n.status);

  const result = new Map<string, MapNodeStatus>();
  for (const node of nodes) {
    if (node.kind === 'notable' || node.kind === 'keystone') {
      result.set(node.id, notableToMap(notableStatus.get(node.id), side));
    } else if (node.kind === 'small') {
      result.set(node.id, smallToMap(lineStatuses.get(node.id) ?? []));
    } else {
      result.set(node.id, 'unchanged');
    }
  }
  return result;
}

function notableToMap(s: NotableStatus | undefined, side: 'old' | 'new'): MapNodeStatus {
  switch (s) {
    case 'removed':
      return 'removed';
    case 'added':
      return 'added';
    case 'buffed':
      return 'buffed';
    case 'nerfed':
      return 'nerfed';
    case 'unchanged':
    case undefined:
      return 'unchanged';
    case 'replaced':
      return side === 'old' ? 'removed' : 'added';
    default:
      return 'changed';
  }
}

function smallToMap(lines: MapNodeStatus[]): MapNodeStatus {
  if (!lines.length) return 'unchanged';
  if (lines.every((l) => l === 'removed')) return 'removed';
  if (lines.includes('added')) return 'added';
  if (lines.includes('removed')) return 'changed';
  if (lines.includes('nerfed')) return lines.includes('buffed') ? 'changed' : 'nerfed';
  if (lines.includes('buffed')) return 'buffed';
  if (lines.includes('changed')) return 'changed';
  return 'unchanged';
}

function toMapNodes(nodes: TreeNode[], statuses: Map<string, MapNodeStatus>): MapNode[] {
  return nodes
    .filter((n) => n.kind !== 'root' || n.id === 'root')
    .map((n) => ({
      id: n.id,
      name: n.name,
      icon: n.icon,
      kind: n.kind,
      mechanic: n.mechanic,
      x: n.x,
      y: n.y,
      out: n.out,
      stats: n.stats.map((s) => s.text),
      ...(n.variants ? { variants: n.variants.map((v) => v.map((s) => s.text)) } : {}),
      status: statuses.get(n.id) ?? 'unchanged',
    }));
}

// ---------- mechanic summaries ----------
const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
const EFFECT_KEYS = ['added', 'removed', 'buffed', 'nerfed', 'unchanged', 'reshuffled', 'reworded'] as const;
const NOTABLE_KEYS = ['unchanged', 'buffed', 'nerfed', 'mixed', 'changed', 'replaced', 'removed', 'added'] as const;
const FATE_KEYS = ['full', 'reduced', 'partial', 'chance', 'thread', 'reworked', 'removed'] as const;

function summarize(): MechanicSummary[] {
  const map = new Map<string, MechanicSummary>();
  const get = (name: string) => {
    let s = map.get(name);
    if (!s) {
      s = {
        name,
        category: categoryOf(name),
        old: { small: 0, notable: 0, keystone: 0 },
        new: { small: 0, notable: 0, keystone: 0 },
        effects: zero(EFFECT_KEYS),
        notables: zero(NOTABLE_KEYS),
        scarabs: zero(FATE_KEYS),
      };
      map.set(name, s);
    }
    return s;
  };
  for (const [nodes, side] of [[oldNodes, 'old'], [newNodes, 'new']] as const) {
    for (const n of nodes) if (n.kind === 'small' || n.kind === 'notable' || n.kind === 'keystone') get(n.mechanic)[side][n.kind]++;
  }
  for (const e of effects as EffectDiff[]) get(e.mechanic).effects[e.status]++;
  for (const n of notables as NotableDiff[]) get(n.mechanic).notables[n.status]++;
  for (const s of scarabs) get(s.mechanic).scarabs[s.fate as Fate]++;
  return [...map.values()].sort((a, b) => compareMechanics(a.name, b.name));
}

// ---------- art manifest ----------
const SHEETS: SheetKey[] = ['normalActive', 'notableActive', 'keystoneActive', 'wormholeActive', 'normalInactive', 'notableInactive', 'keystoneInactive', 'wormholeInactive', 'mastery', 'frame'];
const ART_ZOOM = '0.5';

function atlasArt(version: Version, tree: RawTree, nodes: TreeNode[]): AtlasArt {
  const used = new Set(nodes.map((n) => n.icon));
  const local = (url: string) => `art/atlas/${version}/${basename(new URL(url).pathname)}`;
  const sheets: AtlasArt['sheets'] = {};
  for (const key of SHEETS) {
    const sheet = tree.sprites[key][ART_ZOOM];
    const keepAll = key === 'mastery' || key === 'frame';
    const coords: SpriteSheet['coords'] = {};
    for (const [icon, c] of Object.entries(sheet.coords)) if (keepAll || used.has(icon)) coords[icon] = [c.x, c.y, c.w, c.h];
    sheets[key] = { file: local(sheet.filename), w: sheet.w, h: sheet.h, coords };
  }
  return {
    zoom: Number(ART_ZOOM),
    sheets,
    background: local(tree.sprites.atlasBackground['0.2972'].filename),
    tile: local(tree.sprites.background[ART_ZOOM].filename),
  };
}

const ICON_SHEET: Record<string, SheetKey> = { notable: 'notableActive', keystone: 'keystoneActive', small: 'normalActive' };
function mechanicIcons(): Record<string, IconRef> {
  const out: Record<string, IconRef> = {};
  const names = new Set([...oldNodes, ...newNodes].map((n) => n.mechanic));
  for (const m of names) {
    for (const [version, nodes] of [['3.30', newNodes], ['3.29', oldNodes]] as const) {
      const mastery = nodes.find((n) => n.kind === 'mastery' && n.mechanic === m && n.icon);
      if (mastery) {
        out[m] = { version, sheet: 'mastery', icon: mastery.icon };
        break;
      }
    }
    if (out[m]) continue;
    // No mastery art (e.g. Maven): use the mechanic's first keystone/notable, then any node.
    for (const kind of ['keystone', 'notable', 'small']) {
      for (const [version, nodes] of [['3.30', newNodes], ['3.29', oldNodes]] as const) {
        const n = nodes.find((x) => x.kind === kind && x.mechanic === m && x.icon);
        if (n && !out[m]) out[m] = { version, sheet: ICON_SHEET[kind], icon: n.icon };
      }
    }
  }
  return out;
}

const itemIcons = await readJson<Record<string, string>>('data/raw/item-icons.json').catch(() => ({}));

const bounds = (t: RawTree) => ({ minX: t.min_x, minY: t.min_y, maxX: t.max_x, maxY: t.max_y });
const countNodes = (nodes: TreeNode[]) => nodes.filter((n) => n.kind === 'small' || n.kind === 'notable' || n.kind === 'keystone').length;

const data: GeneratedData = {
  meta: {
    generatedAt: new Date().toISOString(),
    old: { version: '3.29', label: TREE_SOURCES['3.29'].label, commit: TREE_SOURCES['3.29'].commit, totalPoints: oldTree.points.totalPoints, nodeCount: countNodes(oldNodes), bounds: bounds(oldTree) },
    new: { version: '3.30', label: TREE_SOURCES['3.30'].label, commit: TREE_SOURCES['3.30'].commit, totalPoints: newTree.points.totalPoints, nodeCount: countNodes(newNodes), bounds: bounds(newTree) },
    sources: [
      { label: 'grindinggear/atlastree-export', url: 'https://github.com/grindinggear/atlastree-export' },
      { label: 'Scarab effects & limits: poewiki.net Cargo (items + map_fragments)', url: 'https://www.poewiki.net/wiki/Scarab' },
      { label: '3.30 patch notes (Maxroll mirror)', url: 'https://maxroll.gg/poe/news/3-30-covens-of-umbra-patch-notes' },
    ],
  },
  mechanics: summarize(),
  nodes: { old: toMapNodes(oldNodes, nodeStatuses(oldNodes, 'old')), new: toMapNodes(newNodes, nodeStatuses(newNodes, 'new')) },
  effects,
  notables,
  scarabs,
  art: {
    atlas: { '3.29': atlasArt('3.29', oldTree, oldNodes), '3.30': atlasArt('3.30', newTree, newNodes) },
    mechanicIcons: mechanicIcons(),
    itemIcons,
  },
};

const outDir = join(root, 'src', 'data', 'generated');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'atlas-data.json'), JSON.stringify(data));
await writeFile(join(outDir, 'presets.json'), JSON.stringify(PRESET_STRATEGIES, null, 2));

const count = <T>(list: T[], key: (t: T) => string) => list.reduce<Record<string, number>>((acc, x) => ((acc[key(x)] = (acc[key(x)] ?? 0) + 1), acc), {});
console.log(`nodes: 3.29=${data.meta.old.nodeCount} 3.30=${data.meta.new.nodeCount}`);
console.log('effects:', count(effects, (e) => e.status));
console.log('notables:', count(notables, (n) => n.status));
console.log('scarabs:', count(scarabs, (s) => s.fate));
console.log(`wrote ${join(outDir, 'atlas-data.json')}`);
if (reviewHints.length) {
  console.log(`\nreview hints: ${reviewHints.length} unlinked notable(s) resemble a scarab. Link them in scarab-map.ts (counted or RELATED) or add them to REVIEWED_LOOKALIKES:`);
  for (const h of reviewHints.sort().reverse()) console.log(`  ${h}`);
}
