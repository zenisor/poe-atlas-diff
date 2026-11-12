import { jaccard, tokens } from './stats.ts';

/**
 * Word overlap between a scarab's text and a node's text, tuned for
 * "scarab-in-disguise" detection: plural/singular folded, "Area"/"Maps" ignored.
 */
const IGNORE = new Set(['area', 'increased', 'chance', 'additional', 'more', 'monster']);

export function stemTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of tokens(text)) {
    const s = t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
    if (!IGNORE.has(s)) out.add(s);
  }
  return out;
}

export function resemblance(a: string, b: string): number {
  return jaccard(stemTokens(a), stemTokens(b));
}
