/**
 * Everything searchable on the site, built once from the generated data.
 * Used by the global search (top bar) and, filtered by kind/mechanic, by each page's search.
 */
import { data, mapNodeById, PRESETS, strategyMechanic } from './data.ts';
import type { SearchEntry } from './lib/search.ts';
import { normalize } from './lib/search.ts';
import { CATEGORY_LABEL, categoryOf } from './lib/mechanics.ts';
import { FATE_LABEL } from './lib/scarabs.ts';
import { prettyTemplate } from './lib/format.ts';

const STATUS_WORD: Record<string, string> = {
  added: 'new in 3.30',
  removed: 'removed in 3.30',
  replaced: 'replaced',
  changed: 'changed',
  buffed: 'buffed',
  nerfed: 'nerfed',
  mixed: 'changed',
  unchanged: 'unchanged',
  reworded: 'reworded',
  reshuffled: 'redistributed',
};

const kw = (...parts: (string | undefined)[]) => normalize(parts.filter(Boolean).join(' '));

function scarabEntries(): SearchEntry[] {
  return data.scarabs.map((s) => ({
    id: `scarab:${s.id}`,
    kind: 'scarab',
    label: s.name,
    sub: `${FATE_LABEL[s.fate]}. ${s.description.join(' ')}`,
    keywords: kw('scarab', s.description.join(' '), s.mechanics.join(' '), FATE_LABEL[s.fate], s.effects.map((e) => e.label).join(' ')),
    mechanics: s.mechanics,
    target: { tab: 'scarabs', mechanic: s.mechanic, focus: s.id },
    art: { type: 'scarab', name: s.name },
  }));
}

function notableEntries(): SearchEntry[] {
  const out: SearchEntry[] = [];
  const seen = new Set<string>();
  for (const d of data.notables) {
    // One entry per name per diff, preferring the 3.30 art.
    const refs = [...d.new.map((r) => ({ r, version: '3.30' as const })), ...d.old.map((r) => ({ r, version: '3.29' as const }))];
    for (const { r, version } of refs) {
      const key = `${d.key}|${r.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const other = (version === '3.30' ? d.old : d.new).map((x) => x.name).filter((n) => n !== r.name);
      out.push({
        id: `notable:${key}`,
        kind: r.kind === 'keystone' ? 'keystone' : 'notable',
        label: r.name,
        sub: `${STATUS_WORD[d.status] ?? d.status}${other.length ? ` ${version === '3.30' ? '←' : '→'} ${other.join(', ')}` : ''}. ${r.stats[0] ?? r.variants?.[0]?.join(' ') ?? ''}`,
        keywords: kw(r.kind, d.mechanic, STATUS_WORD[d.status], r.stats.join(' '), (r.variants ?? []).flat().join(' '), other.join(' ')),
        mechanics: [d.mechanic],
        target: { tab: 'notables', mechanic: d.mechanic, focus: d.key },
        art: { type: 'node', version, kind: r.kind, icon: r.icon },
      });
    }
  }
  return out;
}

function mechanicEntries(): SearchEntry[] {
  return data.mechanics.map((m) => ({
    id: `mechanic:${m.name}`,
    kind: 'mechanic',
    label: m.name,
    sub: CATEGORY_LABEL[categoryOf(m.name)],
    keywords: kw('mechanic', CATEGORY_LABEL[categoryOf(m.name)]),
    mechanics: [m.name],
    target: { tab: 'mechanic', mechanic: m.name },
    art: { type: 'mechanic', mechanic: m.name },
  }));
}

function effectEntries(): SearchEntry[] {
  return data.effects.map((e) => {
    const c = e.new?.contributions[0] ?? e.old?.contributions[0];
    const node = c && (e.new ? mapNodeById.new : mapNodeById.old).get(c.nodeId);
    const label = e.key.startsWith('link:') ? e.label : prettyTemplate(e.label);
    const names = [...new Set([...(e.old?.contributions ?? []), ...(e.new?.contributions ?? [])].map((x) => x.nodeName))];
    return {
      id: `effect:${e.key}`,
      kind: 'effect',
      label,
      sub: `${e.mechanic}, ${STATUS_WORD[e.status] ?? e.status}`,
      keywords: kw('effect', e.mechanic, STATUS_WORD[e.status], names.join(' ')),
      mechanics: [e.mechanic],
      target: { tab: 'effects', mechanic: e.mechanic, focus: e.key },
      ...(node ? { art: { type: 'node' as const, version: e.new ? ('3.30' as const) : ('3.29' as const), kind: node.kind, icon: node.icon } } : {}),
    };
  });
}

/** Small-node names ("Essence Chance", "Thread Drop Chance"…) jump to the tree map with that name highlighted. */
function nodeEntries(): SearchEntry[] {
  const out = new Map<string, SearchEntry>();
  for (const [version, nodes] of [['3.30', data.nodes.new], ['3.29', data.nodes.old]] as const) {
    for (const n of nodes) {
      if (n.kind !== 'small' || !n.name || out.has(n.name)) continue;
      out.set(n.name, {
        id: `node:${n.name}`,
        kind: 'node',
        label: n.name,
        sub: `${version === '3.29' ? 'Only in 3.29. ' : ''}${n.stats.join('; ')}`,
        keywords: kw('node', n.mechanic, n.stats.join(' ')),
        mechanics: [n.mechanic],
        target: { tab: 'map', mechanic: n.mechanic, focus: `q:${n.name}` },
        art: { type: 'node', version, kind: n.kind, icon: n.icon },
      });
    }
  }
  return [...out.values()];
}

function strategyEntries(): SearchEntry[] {
  return PRESETS.map((p) => {
    const m = strategyMechanic(p);
    return {
      id: `strategy:${p.id}`,
      kind: 'strategy',
      label: p.name,
      sub: `Example strategy. ${p.description ?? ''}`,
      keywords: kw('strategy preset', p.description),
      mechanics: m ? [m] : [],
      target: { tab: 'strategies', focus: p.id },
      ...(m ? { art: { type: 'mechanic' as const, mechanic: m } } : {}),
    };
  });
}

export const SEARCH_INDEX: SearchEntry[] = [
  ...mechanicEntries(),
  ...scarabEntries(),
  ...notableEntries(),
  ...strategyEntries(),
  ...nodeEntries(),
  ...effectEntries(),
];

export const KIND_LABEL: Record<SearchEntry['kind'], string> = {
  scarab: 'Scarab',
  notable: 'Notable',
  keystone: 'Keystone',
  mechanic: 'Mechanic',
  effect: 'Effect',
  node: 'Node',
  strategy: 'Strategy',
};
