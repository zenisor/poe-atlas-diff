import type { ReactNode } from 'react';
import type { Fate } from '../lib/types.ts';
import { FATE_LABEL } from '../lib/scarabs.ts';
import { pct } from '../lib/format.ts';
import { Tip } from './tooltip.tsx';
import { CATEGORY_LABEL, categoryOf, type MechanicCategory } from '../lib/mechanics.ts';

export const STATUS_LABEL: Record<string, string> = {
  added: 'New',
  removed: 'Removed',
  buffed: 'Stronger',
  nerfed: 'Weaker',
  unchanged: 'Unchanged',
  reshuffled: 'Redistributed',
  reworded: 'Reworded',
  changed: 'Changed',
  mixed: 'Mixed',
  replaced: 'Replaced',
};

export const STATUS_COLOR: Record<string, string> = {
  added: 'var(--added)',
  removed: 'var(--removed)',
  buffed: 'var(--buffed)',
  nerfed: 'var(--nerfed)',
  changed: 'var(--changed)',
  mixed: 'var(--changed)',
  replaced: 'var(--changed)',
  reworded: 'var(--changed)',
  reshuffled: 'var(--changed)',
  unchanged: 'var(--unchanged)',
};

export const FATE_COLOR: Record<Fate, string> = {
  full: 'var(--f-full)',
  reduced: 'var(--f-reduced)',
  partial: 'var(--f-partial)',
  chance: 'var(--f-chance)',
  thread: 'var(--f-thread)',
  reworked: 'var(--f-reworked)',
  removed: 'var(--f-removed)',
};

export const FATES: Fate[] = ['full', 'reduced', 'partial', 'chance', 'thread', 'reworked', 'removed'];

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge s-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

const FATE_SHORT: Record<Fate, string> = {
  full: 'Kept',
  reduced: 'Weaker',
  partial: 'Partly',
  chance: 'Chance only',
  thread: 'Threads',
  reworked: 'Reworked',
  removed: 'Gone',
};

export function FateBadge({ fate, short = false }: { fate: Fate; short?: boolean }) {
  return (
    <span className={`badge f-${fate}`} title={short ? FATE_LABEL[fate] : undefined}>
      {short ? FATE_SHORT[fate] : FATE_LABEL[fate]}
    </span>
  );
}

/** Horizontal bar for a 0..1(+) ratio. Values above 100% render green. */
export function Retention({ value, title }: { value: number | null; title?: string }) {
  if (value == null) return <span className="muted small">not quantifiable</span>;
  const w = Math.max(0, Math.min(value, 1)) * 100;
  const color = value >= 0.95 ? 'var(--added)' : value >= 0.7 ? 'var(--f-partial)' : value >= 0.4 ? 'var(--nerfed)' : 'var(--removed)';
  return (
    <div className="retention" title={title}>
      <div className={`bar${value > 1 ? ' over' : ''}`}>
        <span style={{ width: `${w}%`, background: color }} />
      </div>
      <b style={{ color }}>{pct(value)}</b>
    </div>
  );
}

type StackPart = { value: number; color: string; label: string };

/** Breakdown shown when hovering/tapping a stacked bar. */
function StackTip({ title, parts }: { title: string; parts: StackPart[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <>
      <div className="pt-head">{title}</div>
      <div className="pt-body">
        <table className="stack-tip">
          <tbody>
            {parts
              .filter((p) => p.value)
              .map((p) => (
                <tr key={p.label}>
                  <td>
                    <i className="sw" style={{ background: p.color }} />
                    {p.label}
                  </td>
                  <td className="num">{p.value}</td>
                  <td className="num muted">{Math.round((p.value / (total || 1)) * 100)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Proportional bar; with a `title` it gets a tooltip listing every segment. */
export function Stack({ parts, title }: { parts: StackPart[]; title?: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const bar = (
    <div className="stack">
      {parts.map((p) => (p.value ? <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} /> : null))}
    </div>
  );
  if (!title) return bar;
  return (
    <Tip className="stack-anchor" content={() => <StackTip title={title} parts={parts} />}>
      {bar}
    </Tip>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Highlights numbers inside a stat line. */
export function StatText({ text }: { text: string }) {
  const parts = text.split(/((?:[+-])?\d+(?:\.\d+)?%?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^(?:[+-])?\d/.test(p) ? (
          <span key={i} className="num-hl">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function StatList({ stats, variants }: { stats: string[]; variants?: string[][] }) {
  return (
    <ul className="stats">
      {stats.map((s, i) => (
        <li key={i}>
          <StatText text={s} />
        </li>
      ))}
      {variants?.map((v, i) => (
        <li key={`v${i}`} className="choice">
          <StatText text={v.join('; ')} />
        </li>
      ))}
    </ul>
  );
}

export function Chip({ on, onClick, color, children }: { on: boolean; onClick: () => void; color?: string; children: ReactNode }) {
  return (
    <button className={`chip${on ? ' on' : ''}`} onClick={onClick}>
      {color && <span className="dot" style={{ background: color }} />}
      {children}
    </button>
  );
}

export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/** Toggle membership of a value in a Set-like filter. */
export function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

// ---------- mechanics ----------

// Categories are told apart by their headings, not by colour.
export const CATEGORY_COLOR: Record<MechanicCategory, string> = {
  primary: 'var(--dim)',
  secondary: 'var(--dim)',
  tertiary: 'var(--dim)',
  overlay: 'var(--dim)',
  juice: 'var(--dim)',
  removed: 'var(--faint)',
};

export function CategoryBadge({ mechanic, category }: { mechanic?: string; category?: MechanicCategory }) {
  const c = category ?? categoryOf(mechanic ?? '');
  return (
    <span className="badge" style={{ color: CATEGORY_COLOR[c] }}>
      {CATEGORY_LABEL[c]}
    </span>
  );
}

/** Two-level group headers (category, then mechanic) for tables sorted in taxonomy order. */
export function makeGroupHeaders() {
  let lastCat = '';
  let lastMech = '';
  return (mechanic: string): { category: MechanicCategory | null; mechanic: string | null } => {
    const cat = categoryOf(mechanic);
    const out = { category: cat !== lastCat ? cat : null, mechanic: mechanic !== lastMech ? mechanic : null };
    lastCat = cat;
    lastMech = mechanic;
    return out;
  };
}
