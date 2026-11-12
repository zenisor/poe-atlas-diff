import type { CSSProperties, ReactNode } from 'react';
import { mechanicsByCategory } from '../data.ts';
import { CATEGORY_LABEL } from '../lib/mechanics.ts';
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
  const link = (v: string, active: boolean, children: ReactNode, className = '', style?: CSSProperties) => (
    <a
      key={v}
      href="#"
      className={`${className}${active ? ' active' : ''}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        onChange(v);
      }}
    >
      {children}
    </a>
  );
  return (
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
  );
}
