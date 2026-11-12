import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { Icon } from './icons.tsx';

/**
 * One shared tooltip layer for the whole app. `Tip` wrappers push lazily-built
 * content into it, so hundreds of icons don't each render a tooltip.
 *
 * Mouse: shows on hover next to the cursor.
 * Touch: a tap toggles it; on narrow/touch screens CSS turns it into a bottom sheet
 * with a close button (see .poe-tip in styles.css).
 */
type TipState = { render: () => ReactNode; x: number; y: number; owner: object } | null;
let push: ((s: TipState) => void) | null = null;
let current: TipState = null;
/** Time of the last touch tap; browsers fire emulated mouse events right after it. */
let lastTouch = 0;
const recentlyTouched = () => Date.now() - lastTouch < 800;

export function hideTooltip(): void {
  push?.(null);
}

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
    // A press anywhere except on a tooltip or its anchor closes it (anchors toggle themselves).
    const onPress = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('.poe-tip, .tip-anchor')) return;
      hide();
    };
    const events = ['hashchange', 'blur'] as const;
    for (const ev of events) window.addEventListener(ev, hide, true);
    window.addEventListener('pointerdown', onPress, true);
    // Desktop: scrolling closes it. Touch: the sheet stays while you scroll the page.
    const onScroll = () => {
      if (!recentlyTouched() && !matchMedia('(hover: none)').matches) hide();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      push = null;
      for (const ev of events) window.removeEventListener(ev, hide, true);
      window.removeEventListener('pointerdown', onPress, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  // Place next to the cursor, flipping to stay inside the viewport (ignored when shown as a sheet).
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
      <button className="pt-close" aria-label="Close" onClick={() => push?.(null)}>
        <Icon name="close" size={16} />
      </button>
      {tip.render()}
    </div>
  );
}

export function Tip({ content, children, className }: { content: () => ReactNode; children: ReactNode; className?: string }) {
  const owner = useRef({}).current;
  const show = (x: number, y: number) => push?.({ render: content, x, y, owner });
  const onEnter = (e: MouseEvent) => {
    if (!recentlyTouched()) show(e.clientX, e.clientY);
  };
  const onMove = (e: MouseEvent) => {
    if (recentlyTouched()) return;
    if (current && Math.hypot(current.x - e.clientX, current.y - e.clientY) > 24) show(e.clientX, e.clientY);
  };
  const onLeave = () => {
    if (!recentlyTouched()) push?.(null);
  };
  // Touch/pen: tap toggles this tooltip.
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    lastTouch = Date.now();
    if (current?.owner === owner) push?.(null);
    else show(e.clientX, e.clientY);
  };
  // A tap meant for the tooltip shouldn't also click the row/link underneath.
  const onClick = (e: MouseEvent) => {
    if (recentlyTouched()) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  return (
    <span
      className={`tip-anchor${className ? ' ' + className : ''}`}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
