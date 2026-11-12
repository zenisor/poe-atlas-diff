import { data, mechanicSummary, mechanicsByCategory } from '../data.ts';
import type { TabId } from '../App.tsx';
import { FATE_LABEL } from '../lib/scarabs.ts';
import { CATEGORY_NOTE, categoryOf } from '../lib/mechanics.ts';
import { CategoryBadge, FATE_COLOR, FATES, Legend, Stack, Tile } from '../components/ui.tsx';
import { Scarabs } from './Scarabs.tsx';
import { Notables } from './Notables.tsx';
import { Effects } from './Effects.tsx';
import { MechanicIcon } from '../components/art.tsx';
import { MechanicSidebar } from '../components/sidebar.tsx';

export function MechanicView({ mechanic, go }: { mechanic: string; go: (tab: TabId, mechanic?: string) => void }) {
  const current = mechanicSummary.has(mechanic) ? mechanic : mechanicsByCategory[0].items[0].name;
  const m = mechanicSummary.get(current)!;
  const category = categoryOf(current);
  const scarabs = data.scarabs.filter((s) => s.mechanics.includes(current));
  const total = (s: typeof m.old) => s.small + s.notable + s.keystone;
  const changedNotables = m.notables.replaced + m.notables.changed + m.notables.mixed;

  return (
    <div className="mech-layout">
      <MechanicSidebar
        value={current}
        onChange={(m) => go('mechanic', m)}
        count={(name) => data.scarabs.filter((s) => s.mechanics.includes(name)).length}
        countLabel="scarabs"
        allowGroups={false}
      />

      <div>
        <div className="mech-title">
          <MechanicIcon mechanic={current} size={64} />
          <h2>{current}</h2>
          <CategoryBadge category={category} />
          <div style={{ flex: 1 }} />
          <a href="#" className="small" onClick={(e) => (e.preventDefault(), go('map', current))}>
            Show on the tree map
          </a>
        </div>
        <p className="lead">{CATEGORY_NOTE[category]}</p>

        <div className="grid tiles">
          <Tile label="Nodes" value={`${total(m.old)} → ${total(m.new)}`} sub={`Notables ${m.old.notable} → ${m.new.notable}, keystones ${m.old.keystone} → ${m.new.keystone}`} />
          <Tile
            label="Notables"
            value={
              <>
                <span className="s-added">+{m.notables.added}</span> <span className="s-removed">−{m.notables.removed}</span>
              </>
            }
            sub={`${changedNotables} reworked, ${m.notables.buffed} stronger, ${m.notables.nerfed} weaker, ${m.notables.unchanged} unchanged`}
          />
          <Tile
            label="Tree effects"
            value={
              <>
                <span className="s-buffed">{m.effects.buffed}↑</span> <span className="s-nerfed">{m.effects.nerfed}↓</span>
              </>
            }
            sub={`${m.effects.added} new, ${m.effects.removed} gone, ${m.effects.unchanged} unchanged`}
          />
          <Tile
            label="Scarabs"
            value={scarabs.length || '—'}
            sub={scarabs.length ? <Stack title={`${current} scarabs`} parts={FATES.map((f) => ({ value: scarabs.filter((s) => s.fate === f).length, color: FATE_COLOR[f], label: FATE_LABEL[f] }))} /> : 'none in 3.29'}
          />
        </div>

        {scarabs.length > 0 && (
          <>
            <div className="section-title">Scarabs</div>
            <Legend items={FATES.filter((f) => scarabs.some((s) => s.fate === f)).map((f) => ({ label: FATE_LABEL[f], color: FATE_COLOR[f] }))} />
            <div style={{ marginTop: 10 }}>
              <Scarabs mechanic={current} embedded />
            </div>
          </>
        )}

        <div className="section-title">Notables & keystones</div>
        <Notables mechanic={current} embedded />

        <div className="section-title">Tree effects</div>
        <Effects mechanic={current} embedded />
      </div>
    </div>
  );
}
