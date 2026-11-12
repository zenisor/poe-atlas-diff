import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './icons.tsx';
import { mechanicsByCategory } from '../data.ts';
import { CATEGORY_LABEL, type MechanicCategory } from '../lib/mechanics.ts';
import { CATEGORY_COLOR } from './ui.tsx';
import { MechanicIcon } from './art.tsx';

/**
 * Mechanic navigation used on every list page. `value` is '' (all), 'cat:<category>'
 * (a whole category: click its header) or a mechanic name. `count` shows how many
 * items that page has for each mechanic; zero-count mechanics are dimmed.
 */
export function MechanicSidebar({
  value,
  onChange,
  count,
  countLabel,
  allowGroups = true,
}: {
  value: string;
  onChange: (v: string) => void;
  count?: (mechanic: string) => number;
  countLabel?: string;
  allowGroups?: boolean;
}) {
  // On narrow screens the list collapses behind a "Mechanic: …" button.
  const [open, setOpen] = useState(false);
  const current = !value ? 'All mechanics' : value.startsWith('cat:') ? CATEGORY_LABEL[value.slice(4) as MechanicCategory] : value;
  const link = (v: string, active: boolean, children: ReactNode, className = '', style?: CSSProperties) => (
    <a
      key={v}
      href="#"
      className={`${className}${active ? ' active' : ''}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        setOpen(false);
        onChange(v);
      }}
    >
      {children}
    </a>
  );
  return (
    <div className={`mech-side${open ? ' open' : ''}`}>
    <button className="btn mech-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
      {value && !value.startsWith('cat:') && <MechanicIcon mechanic={value} size={22} />}
      <span>
        <span className="muted">Mechanic:</span> {current}
      </span>
      <span className="caret">
        <Icon name={open ? 'up' : 'down'} size={16} />
      </span>
    </button>
    <nav className="mech-nav">
      {allowGroups && link('', value === '', <span className="all">All mechanics</span>, 'all-link')}
      {countLabel && <div className="small muted" style={{ margin: '6px 8px 0' }}>numbers = {countLabel}</div>}
      {mechanicsByCategory.map(({ category, items }) => (
        <div key={category}>
          {allowGroups ? (
            link(`cat:${category}`, value === `cat:${category}`, CATEGORY_LABEL[category], 'cat cat-link', { color: CATEGORY_COLOR[category] })
          ) : (
            <div className="cat" style={{ color: CATEGORY_COLOR[category] }}>
              {CATEGORY_LABEL[category]}
            </div>
          )}
          {items.map((m) => {
            const n = count?.(m.name);
            return link(
              m.name,
              value === m.name,
              <>
                <MechanicIcon mechanic={m.name} size={22} />
                <span>{m.name}</span>
                {n != null && <span className="cnt">{n || ''}</span>}
              </>,
              n === 0 ? 'empty' : '',
            );
          })}
        </div>
      ))}
    </nav>
    </div>
  );
}
