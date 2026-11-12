import type { CSSProperties } from 'react';
import { data } from '../data.ts';
import type { NodeKind, SheetKey, Version } from '../lib/types.ts';

/** Draws one icon out of a GGG sprite sheet, scaled so its longer side is `size` px. */
export function Sprite({ version, sheet, icon, size, round = false, dim = false, title }: { version: Version; sheet: SheetKey; icon: string; size: number; round?: boolean; dim?: boolean; title?: string }) {
  const s = data.art.atlas[version].sheets[sheet];
  const c = s?.coords[icon];
  if (!s || !c) return <span className="sprite missing" style={{ width: size, height: size }} title={title} />;
  const [x, y, w, h] = c;
  const k = size / Math.max(w, h);
  const style: CSSProperties = {
    width: w * k,
    height: h * k,
    backgroundImage: `url(${s.file})`,
    backgroundSize: `${s.w * k}px ${s.h * k}px`,
    backgroundPosition: `${-x * k}px ${-y * k}px`,
    ...(round ? { borderRadius: '50%' } : {}),
    ...(dim ? { filter: 'grayscale(0.7) brightness(0.6)' } : {}),
  };
  return <span className="sprite" style={style} title={title} />;
}

// Frame art is bigger than the icon it surrounds (ratios from the export's sheets).
const FRAME: Partial<Record<NodeKind, { active: string; inactive: string; ratio: number; sheet: [SheetKey, SheetKey] }>> = {
  small: { active: 'PSSkillFrameActive', inactive: 'PSSkillFrame', ratio: 1.5, sheet: ['normalActive', 'normalInactive'] },
  notable: { active: 'NotableFrameAllocated', inactive: 'NotableFrameUnallocated', ratio: 1.55, sheet: ['notableActive', 'notableInactive'] },
  keystone: { active: 'KeystoneFrameAllocated', inactive: 'KeystoneFrameUnallocated', ratio: 1.6, sheet: ['keystoneActive', 'keystoneInactive'] },
  wormhole: { active: 'WormholeFrameAllocated', inactive: 'WormholeFrameUnallocated', ratio: 1.69, sheet: ['wormholeActive', 'wormholeInactive'] },
};

/** An atlas node as it looks in game: icon + frame. `size` = outer frame size. */
export function NodeIcon({ version, kind, icon, size, active = true, title }: { version: Version; kind: NodeKind; icon: string; size: number; active?: boolean; title?: string }) {
  const f = FRAME[kind];
  if (!f) return <Sprite version={version} sheet="mastery" icon={icon} size={size} title={title} />;
  const inner = size / f.ratio;
  return (
    <span className="node-icon" style={{ width: size, height: size }} title={title}>
      <span className="node-icon-art">
        <Sprite version={version} sheet={f.sheet[active ? 0 : 1]} icon={icon} size={inner} round />
      </span>
      <span className="node-icon-frame">
        <Sprite version={version} sheet="frame" icon={active ? f.active : f.inactive} size={size} />
      </span>
    </span>
  );
}

/** Mastery art for a mechanic (falls back to one of its notables). */
export function MechanicIcon({ mechanic, size = 24 }: { mechanic: string; size?: number }) {
  const ref = data.art.mechanicIcons[mechanic];
  if (!ref) return <span className="sprite missing" style={{ width: size, height: size }} />;
  if (ref.sheet === 'mastery') return <Sprite version={ref.version} sheet="mastery" icon={ref.icon} size={size} />;
  const kind: NodeKind = ref.sheet.startsWith('keystone') ? 'keystone' : ref.sheet.startsWith('notable') ? 'notable' : 'small';
  return <NodeIcon version={ref.version} kind={kind} icon={ref.icon} size={size} />;
}

/** Inventory art for an item (scarab / Thread). Threads without art yet use their mechanic's mastery. */
export function ItemIcon({ name, size = 36, fallbackMechanic }: { name: string; size?: number; fallbackMechanic?: string }) {
  const src = data.art.itemIcons[name];
  if (src) return <img className="item-icon" src={src} width={size} height={size} alt={name} loading="lazy" />;
  if (fallbackMechanic) return <MechanicIcon mechanic={fallbackMechanic} size={size} />;
  return <span className="sprite missing" style={{ width: size, height: size }} />;
}
