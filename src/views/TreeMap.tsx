import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { track, trackToggle, useTrackedSearch } from '../lib/analytics.ts';
import { data, relatedScarabsByNode, scarabLinksByNode } from '../data.ts';
import type { MapNode, MapNodeStatus, SheetKey, Version } from '../lib/types.ts';
import { matchesMechanic } from '../lib/mechanics.ts';
import { Chip, Legend, STATUS_LABEL } from '../components/ui.tsx';
import { NodeTooltip } from '../components/tips.tsx';
import { Autocomplete } from '../components/Autocomplete.tsx';
import { SEARCH_INDEX } from '../searchIndex.ts';
import { useFocusTarget } from '../lib/focus.ts';
import type { SearchEntry } from '../lib/search.ts';

type Side = 'old' | 'new';
const VERSION: Record<Side, Version> = { old: '3.29', new: '3.30' };
const STATUSES: MapNodeStatus[] = ['added', 'removed', 'buffed', 'nerfed', 'changed', 'unchanged'];
// Canvas can't read CSS variables cheaply, so the status palette is mirrored here.
const COLOR: Record<MapNodeStatus, string> = {
  added: '#62c94f',
  removed: '#d9443a',
  buffed: '#7d8cff',
  nerfed: '#e8944a',
  changed: '#c58cf0',
  unchanged: '#6f675a',
};

/** World-unit sizes (sheet px / sprite zoom 0.5): [icon, frame]. */
const SIZE: Record<string, [number, number]> = {
  small: [68, 102],
  notable: [98, 152],
  keystone: [136, 218],
  wormhole: [172, 290],
};
const SHEET: Record<string, [SheetKey, SheetKey, string, string]> = {
  small: ['normalActive', 'normalInactive', 'PSSkillFrameActive', 'PSSkillFrame'],
  notable: ['notableActive', 'notableInactive', 'NotableFrameAllocated', 'NotableFrameUnallocated'],
  keystone: ['keystoneActive', 'keystoneInactive', 'KeystoneFrameAllocated', 'KeystoneFrameUnallocated'],
  wormhole: ['wormholeActive', 'wormholeInactive', 'WormholeFrameAllocated', 'WormholeFrameUnallocated'],
};

function boundsOf(nodes: MapNode[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX + 400, h: maxY - minY + 400 };
}

/** Scarab inventory icons for nodes that took over a scarab effect (drawn as a badge). */
function useScarabImages() {
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());
  useEffect(() => {
    const names = new Set([...[...scarabLinksByNode.values()].flat(), ...[...relatedScarabsByNode.values()].flat()].map((l) => l.scarab.name));
    const map = new Map<string, HTMLImageElement>();
    let pending = names.size;
    for (const name of names) {
      const src = data.art.itemIcons[name];
      if (!src) {
        pending--;
        continue;
      }
      const img = new Image();
      img.onload = img.onerror = () => {
        if (--pending <= 0) setImages(new Map(map));
      };
      img.src = src;
      map.set(name, img);
    }
  }, []);
  return images;
}

/** Loads the sprite sheets for one tree version; resolves to file -> image. */
function useSheets(version: Version) {
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());
  useEffect(() => {
    const art = data.art.atlas[version];
    const files = new Set([...Object.values(art.sheets).map((s) => s!.file), art.background]);
    let cancelled = false;
    Promise.all(
      [...files].map(
        (file) =>
          new Promise<[string, HTMLImageElement]>((resolve) => {
            const img = new Image();
            img.onload = () => resolve([file, img]);
            img.onerror = () => resolve([file, img]);
            img.src = file;
          }),
      ),
    ).then((entries) => {
      if (!cancelled) setImages(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [version]);
  return images;
}

export function TreeMap({ mechanic, focus, focusNonce }: { mechanic: string; focus?: string; focusNonce?: number }) {
  const [side, setSide] = useState<Side>('new');
  const [q, setQ] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [onlyScarab, setOnlyScarab] = useState(false);
  const [hover, setHover] = useState<{ node: MapNode; x: number; y: number } | null>(null);
  const nodes = data.nodes[side];
  const version = VERSION[side];
  const art = data.art.atlas[version];
  const images = useSheets(version);
  const scarabImages = useScarabImages();
  const bounds = useMemo(() => boundsOf(nodes.filter((n) => n.kind !== 'mastery')), [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<{ cx: number; cy: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fit = useCallback(() => {
    if (!size.w) return;
    setView({ cx: bounds.cx, cy: bounds.cy, scale: Math.min(size.w / bounds.w, size.h / bounds.h) });
  }, [bounds, size]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    fit();
  }, [fit, side]);

  useTrackedSearch('map', q);

  // Node to centre on once the view/side is ready (set by a search pick).
  const [centerOn, setCenterOn] = useState<{ name: string; n: number } | null>(null);
  /** Highlight a node by name, switch to the tree that has it, and zoom onto it. */
  const showNode = (name: string, preferred?: Version) => {
    const inNew = data.nodes.new.some((n) => n.name === name);
    const inOld = data.nodes.old.some((n) => n.name === name);
    const want: Side = preferred === '3.29' && inOld ? 'old' : inNew ? 'new' : inOld ? 'old' : side;
    if (want !== side) setSide(want);
    setQ(name);
    setCenterOn({ name, n: Date.now() });
  };
  useEffect(() => {
    if (!centerOn || !size.w) return;
    const matches = nodes.filter((n) => n.name === centerOn.name && n.kind !== 'mastery');
    if (!matches.length) return;
    // Centre on the matches' bounding box; zoom in for a single node, less for a group.
    const xs = matches.map((n) => n.x);
    const ys = matches.map((n) => n.y);
    const w = Math.max(...xs) - Math.min(...xs) + 1200;
    const h = Math.max(...ys) - Math.min(...ys) + 1200;
    setView({ cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, scale: Math.min(0.45, size.w / w, size.h / h) });
    setCenterOn(null);
  }, [centerOn, nodes, size]);
  useFocusTarget(focus, focusNonce, (f) => showNode(f.replace(/^q:/, '')));
  const localEntries = useMemo(
    () => SEARCH_INDEX.filter((e: SearchEntry) => (e.kind === 'node' || e.kind === 'notable' || e.kind === 'keystone') && matchesMechanic(e.mechanics, mechanic)),
    [mechanic],
  );
  const needle = q.trim().toLowerCase();
  const isLit = useCallback(
    (n: MapNode) =>
      matchesMechanic(n.mechanic, mechanic) &&
      (!onlyChanged || n.status !== 'unchanged') &&
      (!onlyScarab || (side === 'new' && (scarabLinksByNode.has(n.id) || relatedScarabsByNode.has(n.id)))) &&
      (!needle || n.name.toLowerCase().includes(needle) || n.stats.join(' ').toLowerCase().includes(needle)),
    [mechanic, needle, onlyChanged, onlyScarab, side],
  );

  // ---------- drawing ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !view || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, size.w, size.h);
    const { cx, cy, scale } = view;
    const sx = (x: number) => (x - cx) * scale + size.w / 2;
    const sy = (y: number) => (y - cy) * scale + size.h / 2;

    /** Draws a sprite centred at (x, y), `d` px wide; optionally clipped to a circle. */
    const blit = (key: SheetKey, icon: string, x: number, y: number, d: number, clipRound = false) => {
      const s = art.sheets[key];
      const img = s && images.get(s.file);
      const c = s?.coords[icon];
      if (!img?.naturalWidth || !c) return false;
      const [ix, iy, iw, ih] = c;
      if (clipRound) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, d / 2, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.drawImage(img, ix, iy, iw, ih, x - d / 2, y - (d * (ih / iw)) / 2, d, d * (ih / iw));
      if (clipRound) ctx.restore();
      return true;
    };

    // atlas background
    const bg = images.get(art.background);
    if (bg?.naturalWidth) {
      const d = Math.max(bounds.w, bounds.h) * 1.15 * scale;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bg, sx(bounds.cx) - d / 2, sy(bounds.cy) - d / 2, d, d);
      ctx.globalAlpha = 1;
    }

    // connections
    ctx.lineCap = 'round';
    for (const n of nodes) {
      if (n.kind === 'mastery') continue;
      for (const to of n.out) {
        const m = byId.get(to);
        if (!m || m.kind === 'mastery') continue;
        const lit = isLit(n) && isLit(m);
        ctx.strokeStyle = lit ? '#8a6d3b' : '#2a2116';
        ctx.globalAlpha = lit ? 0.85 : 0.35;
        ctx.lineWidth = Math.max(1, (lit ? 12 : 8) * scale);
        ctx.beginPath();
        ctx.moveTo(sx(n.x), sy(n.y));
        ctx.lineTo(sx(m.x), sy(m.y));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // mastery art at cluster centres
    for (const n of nodes) {
      if (n.kind !== 'mastery') continue;
      ctx.globalAlpha = isLit(n) || !mechanic ? 0.7 : 0.15;
      blit('mastery', n.icon, sx(n.x), sy(n.y), 226 * scale);
    }
    ctx.globalAlpha = 1;

    // nodes
    for (const n of nodes) {
      if (n.kind === 'mastery') continue;
      const x = sx(n.x);
      const y = sy(n.y);
      if (x < -200 || y < -200 || x > size.w + 200 || y > size.h + 200) continue;
      const lit = isLit(n);
      const alpha = lit ? 1 : 0.12;
      ctx.globalAlpha = alpha;
      if (n.kind === 'root') {
        ctx.fillStyle = '#c9a463';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(3, 40 * scale), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const [iconW, frameW] = SIZE[n.kind] ?? SIZE.small;
      const [activeSheet, inactiveSheet, activeFrame, inactiveFrame] = SHEET[n.kind] ?? SHEET.small;
      const isGateway = n.kind === 'wormhole';
      // Unchanged nodes look unallocated (greyed); changed ones are lit and ringed in their status colour.
      const changed = n.status !== 'unchanged';
      if (changed && !isGateway) {
        ctx.save();
        ctx.shadowColor = COLOR[n.status];
        ctx.shadowBlur = Math.max(6, 40 * scale);
        ctx.fillStyle = COLOR[n.status];
        ctx.globalAlpha = alpha * 0.55;
        ctx.beginPath();
        ctx.arc(x, y, (frameW / 2) * 0.82 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = alpha;
      }
      const lightUp = changed || isGateway;
      if (!blit(lightUp ? activeSheet : inactiveSheet, n.icon, x, y, iconW * scale, true)) {
        ctx.fillStyle = COLOR[n.status];
        ctx.beginPath();
        ctx.arc(x, y, (iconW / 2) * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      blit('frame', lightUp ? activeFrame : inactiveFrame, x, y, frameW * scale);
      if (changed && !isGateway) {
        ctx.strokeStyle = COLOR[n.status];
        ctx.lineWidth = Math.max(1.5, 7 * scale);
        ctx.beginPath();
        ctx.arc(x, y, (frameW / 2) * 0.9 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Scarab badge: this node took over (part of) a scarab's effect.
      const links = side === 'new' ? (scarabLinksByNode.get(n.id) ?? relatedScarabsByNode.get(n.id)) : undefined;
      const relatedOnly = side === 'new' && !scarabLinksByNode.has(n.id);
      if (links && (n.kind !== 'small' || scale > 0.18)) {
        const img = scarabImages.get(links[0].scarab.name);
        ctx.save();
        if (relatedOnly) ctx.globalAlpha *= 0.55;
        const d = Math.max(n.kind === 'small' ? 9 : 14, frameW * 0.55 * scale);
        const bx = x + (frameW / 2) * 0.62 * scale;
        const by = y - (frameW / 2) * 0.62 * scale;
        ctx.fillStyle = 'rgba(10,8,5,.85)';
        ctx.strokeStyle = '#aa9e82';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, d / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (img?.naturalWidth) ctx.drawImage(img, bx - d * 0.45, by - d * 0.45, d * 0.9, d * 0.9);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // notable/keystone names once zoomed in
    if (scale > 0.22) {
      ctx.font = `600 ${Math.round(Math.min(14, 40 * scale))}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const n of nodes) {
        if ((n.kind !== 'notable' && n.kind !== 'keystone') || !isLit(n)) continue;
        const x = sx(n.x);
        const y = sy(n.y) + (SIZE[n.kind][1] / 2) * scale + 2;
        if (x < -100 || y < -50 || x > size.w + 100 || y > size.h + 50) continue;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,.9)';
        ctx.strokeText(n.name, x, y);
        ctx.fillStyle = n.status === 'unchanged' ? '#a89a7c' : COLOR[n.status];
        ctx.fillText(n.name, x, y);
      }
    }
  }, [view, size, nodes, byId, images, scarabImages, art, bounds, isLit, mechanic, side]);

  // ---------- interaction ----------
  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const v = view!;
    return { x: (clientX - rect.left - size.w / 2) / v.scale + v.cx, y: (clientY - rect.top - size.h / 2) / v.scale + v.cy, rect };
  };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    if (!view) return;
    const p = toWorld(e.clientX, e.clientY);
    const minScale = Math.min(size.w / bounds.w, size.h / bounds.h) * 0.6;
    const scale = Math.min(Math.max(view.scale * (e.deltaY > 0 ? 1 / 1.18 : 1.18), minScale), 1.5);
    const k = view.scale / scale;
    setView({ scale, cx: p.x - (p.x - view.cx) * k, cy: p.y - (p.y - view.cy) * k });
  };
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!view) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!view) return;
    if (drag.current) {
      const d = drag.current;
      setView({ ...view, cx: d.cx - (e.clientX - d.x) / view.scale, cy: d.cy - (e.clientY - d.y) / view.scale });
      return;
    }
    const p = toWorld(e.clientX, e.clientY);
    let best: MapNode | null = null;
    let bestD = Infinity;
    for (const n of nodes) {
      if (n.kind === 'mastery' || n.kind === 'root') continue;
      const r = (SIZE[n.kind] ?? SIZE.small)[1] / 2;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < r && d < bestD) [best, bestD] = [n, d];
    }
    setHover(best ? { node: best, x: e.clientX - p.rect.left, y: e.clientY - p.rect.top } : null);
  };
  const onUp = () => {
    drag.current = null;
    setDragging(false);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of nodes) if (n.kind === 'small' || n.kind === 'notable' || n.kind === 'keystone') c[n.status] = (c[n.status] ?? 0) + 1;
    return c;
  }, [nodes]);

  return (
    <>
      <div className="toolbar">
        <Chip
          on={side === 'old'}
          onClick={() => {
            setSide('old');
            track('map/tree/3.29');
          }}
        >
          3.29 tree
        </Chip>
        <Chip
          on={side === 'new'}
          onClick={() => {
            setSide('new');
            track('map/tree/3.30');
          }}
        >
          3.30 tree
        </Chip>
        <Chip
          on={onlyChanged}
          onClick={() => {
            setOnlyChanged(!onlyChanged);
            trackToggle('map', 'only-changed', !onlyChanged);
          }}
        >
          Only changed nodes
        </Chip>
        <Chip
          on={onlyScarab}
          color="var(--poe-currency)"
          onClick={() => {
            setOnlyScarab(!onlyScarab);
            trackToggle('map', 'took-over-scarab', !onlyScarab);
          }}
        >
          ❖ Took over a scarab
        </Chip>
        <Autocomplete
          entries={localEntries}
          value={q}
          onChange={setQ}
          onSelect={(h) => showNode(h.entry.label, h.entry.art?.type === 'node' ? h.entry.art.version : undefined)}
          placeholder="Find a node or stat…"
        />
        <span className="small muted">Greyed = unchanged · lit + coloured ring = changed · scarab badge = took over a scarab effect. Scroll to zoom, drag to pan.</span>
      </div>
      <div className="map-wrap" ref={wrapRef}>
        <div className="map-controls">
          <button
            className="btn"
            onClick={() => {
              fit();
              track('map/reset-view');
            }}
          >
            Reset view
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className={dragging ? 'dragging' : ''}
          onWheel={onWheel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => {
            onUp();
            setHover(null);
          }}
        />
        {hover && !dragging && (
          <div className="poe-tip" style={{ position: 'absolute', left: Math.max(4, Math.min(hover.x + 16, size.w - 450)), top: Math.max(4, Math.min(hover.y + 16, size.h - 260)) }}>
            <NodeTooltip node={hover.node} version={version} />
          </div>
        )}
      </div>
      <Legend items={STATUSES.map((s) => ({ label: `${STATUS_LABEL[s]} (${counts[s] ?? 0})`, color: COLOR[s] }))} />
    </>
  );
}
