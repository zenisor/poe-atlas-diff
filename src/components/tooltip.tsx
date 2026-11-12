import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

/**
 * One shared tooltip layer for the whole app. `Tip` wrappers push lazily-built
 * content into it on hover, so hundreds of icons don't each render a tooltip.
 */
type TipState = { render: () => ReactNode; x: number; y: number } | null;
let push: ((s: TipState) => void) | null = null;
let current: TipState = null;

export function TooltipLayer() {
  const [tip, setTip] = useState<TipState>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    push = (s) => {
      current = s;
      setTip(s);
    };
    const hide = () => push?.(null);
    // Navigating or clicking never leaves a stale tooltip behind.
    const events = ['scroll', 'hashchange', 'mousedown', 'blur'] as const;
    for (const ev of events) window.addEventListener(ev, hide, true);
    return () => {
      push = null;
      for (const ev of events) window.removeEventListener(ev, hide, true);
    };
  }, []);

  // Place next to the cursor, flipping to stay inside the viewport.
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const pad = 14;
    let left = tip.x + pad;
    let top = tip.y + pad;
    if (left + width > window.innerWidth - 8) left = Math.max(8, tip.x - width - pad);
    if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
    setPos({ left, top });
  }, [tip]);

  if (!tip) return null;
  return (
    <div ref={ref} className="poe-tip" style={{ left: pos.left, top: pos.top }}>
      {tip.render()}
    </div>
  );
}

export function Tip({ content, children, className }: { content: () => ReactNode; children: ReactNode; className?: string }) {
  const show = (e: MouseEvent) => push?.({ render: content, x: e.clientX, y: e.clientY });
  const move = (e: MouseEvent) => {
    if (current && Math.hypot(current.x - e.clientX, current.y - e.clientY) > 24) push?.({ render: content, x: e.clientX, y: e.clientY });
  };
  return (
    <span className={`tip-anchor${className ? ' ' + className : ''}`} onMouseEnter={show} onMouseMove={move} onMouseLeave={() => push?.(null)}>
      {children}
    </span>
  );
}
