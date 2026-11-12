import { useEffect } from 'react';

/**
 * Scrolls to the element marked data-focus="<id>" and flashes it.
 * Runs on a timer so it lands after React re-renders the filtered list and after
 * the app's own scroll-to-top on page change.
 */
export function flashFocus(id: string, delay = 120): void {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('flash');
  }, delay);
}

/** Calls `run(focus)` whenever a search result targets this page (nonce allows re-selecting the same item). */
export function useFocusTarget(focus: string | undefined, nonce: number | undefined, run: (focus: string) => void): void {
  useEffect(() => {
    if (focus) run(focus);
    // Only re-run for a new target; `run` is a fresh closure every render.
  }, [focus, nonce]);
}
