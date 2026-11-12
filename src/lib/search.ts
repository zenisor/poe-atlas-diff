/**
 * Search ranking for the autocomplete (global and per-page). Pure and UI-free.
 *
 * Every query word must appear in the entry's label or keywords. Label matches
 * rank above keyword-only matches; a label that starts with the query ranks highest.
 */
export type SearchKind = 'scarab' | 'notable' | 'keystone' | 'mechanic' | 'effect' | 'node' | 'strategy';

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  label: string;
  /** Secondary line (description, first stat, status…). */
  sub?: string;
  /** Extra searchable text (lowercased). */
  keywords: string;
  /** Mechanics the entry belongs to (for page-scoped search). */
  mechanics: string[];
  /** Where selecting the entry should take you. */
  target: { tab: string; mechanic?: string; focus?: string };
  /** What to draw next to it in the dropdown. */
  art?: { type: 'scarab'; name: string } | { type: 'node'; version: '3.29' | '3.30'; kind: string; icon: string } | { type: 'mechanic'; mechanic: string };
}

export interface SearchHit {
  entry: SearchEntry;
  score: number;
  /** [start, end) of the highlighted match in the label, if any. */
  match?: [number, number];
}

const KIND_BOOST: Record<SearchKind, number> = {
  mechanic: 12,
  scarab: 10,
  keystone: 8,
  notable: 7,
  strategy: 6,
  node: 4,
  effect: 0,
};

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

function wordStart(hay: string, needle: string): number {
  let i = hay.indexOf(needle);
  while (i > 0 && /[a-z0-9]/.test(hay[i - 1])) i = hay.indexOf(needle, i + 1);
  return i;
}

export function rank(entries: SearchEntry[], query: string, limit = 12): SearchHit[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const hits: SearchHit[] = [];
  for (const entry of entries) {
    const label = normalize(entry.label);
    const hay = `${label} ${entry.keywords}`;
    if (!tokens.every((t) => hay.includes(t))) continue;

    let score: number;
    let match: [number, number] | undefined;
    if (label === q) score = 200;
    else if (label.startsWith(q)) score = 120;
    else if (wordStart(label, q) >= 0) score = 90;
    else if (label.includes(q)) score = 60;
    else if (tokens.every((t) => label.includes(t))) score = 45;
    else score = 15; // keyword-only match (description, stats…)

    const at = label.indexOf(q);
    if (at >= 0) match = [at, at + q.length];
    else {
      const t0 = label.indexOf(tokens[0]);
      if (t0 >= 0) match = [t0, t0 + tokens[0].length];
    }
    score += KIND_BOOST[entry.kind] - Math.min(entry.label.length, 120) / 30;
    hits.push({ entry, score, ...(match ? { match } : {}) });
  }
  return hits.sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label)).slice(0, limit);
}
