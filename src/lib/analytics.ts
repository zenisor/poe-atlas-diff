/**
 * Tiny wrapper around GoatCounter custom events (script loaded in index.html).
 * Events show up in the GoatCounter dashboard next to page views, named
 * "area/action/detail", e.g. "scarab/open/Essence Scarab".
 *
 * GoatCounter ignores localhost, so nothing is sent during development.
 */
import { useEffect, useRef } from 'react';

interface GoatCounter {
  count?: (vars: { path: string; title?: string; event?: boolean }) => void;
}

const MAX_LEN = 120;

export function track(path: string, title?: string): void {
  const gc = (window as unknown as { goatcounter?: GoatCounter }).goatcounter;
  if (typeof gc?.count !== 'function') return;
  const p = path.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
  gc.count({ path: p, title: title ?? p, event: true });
}

const seen = new Set<string>();
/** Count an event only the first time it happens in this visit (e.g. tooltip views). */
export function trackOnce(path: string): void {
  if (seen.has(path)) return;
  seen.add(path);
  track(path);
}

/**
 * Counts that a search was used (once the user stops typing, min 3 chars).
 * The search text itself is never sent.
 */
export function useTrackedSearch(scope: string, query: string, delayMs = 1500): void {
  const last = useRef('');
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3 || q === last.current) return;
    const t = setTimeout(() => {
      last.current = q;
      track(`${scope}/search`);
    }, delayMs);
    return () => clearTimeout(t);
  }, [scope, query, delayMs]);
}

/** Tracks toggles as "<area>/<name>:on|off". */
export function trackToggle(area: string, name: string, on: boolean): void {
  track(`${area}/${name}:${on ? 'on' : 'off'}`);
}
