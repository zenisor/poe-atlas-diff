import { Fragment, type CSSProperties } from 'react';
import { data, mechanicsByCategory } from '../data.ts';
import type { TabId } from '../App.tsx';
import type { Fate, MechanicSummary, ScarabResult } from '../lib/types.ts';
import { CATEGORY_LABEL } from '../lib/mechanics.ts';
import { FATE_COLOR, FATES, Stack, STATUS_COLOR, STATUS_LABEL } from '../components/ui.tsx';
import { FATE_LABEL } from '../lib/scarabs.ts';
import { MechanicIcon } from '../components/art.tsx';
import { MechIcon, ScarabIcon } from '../components/tips.tsx';

const nodeTotal = (s: MechanicSummary['old']) => s.small + s.notable + s.keystone;
const EFFECT_PARTS = ['buffed', 'nerfed', 'added', 'removed', 'reworded', 'unchanged'] as const;
const fateParts = (list: ScarabResult[]) => FATES.map((f) => ({ value: list.filter((s) => s.fate === f).length, color: FATE_COLOR[f], label: FATE_LABEL[f] }));

/** The legend groups the seven fates into the five colours used in the stash. */
const LEGEND: { label: string; fates: Fate[]; color: string }[] = [
  { label: 'Kept on the tree', fates: ['full'], color: 'var(--kept)' },
  { label: 'Weaker on the tree', fates: ['reduced'], color: 'var(--weaker)' },
  { label: 'Partly, as a chance, or reworked', fates: ['partial', 'chance', 'reworked'], color: 'var(--shape)' },
  { label: 'Now from Threads', fates: ['thread'], color: 'var(--threads)' },
  { label: 'Gone', fates: ['removed'], color: 'var(--gone)' },
];

/** One stash slot: the scarab's art, a fate-coloured edge, greyed out when the effect is gone. */
function Slot({ s }: { s: ScarabResult }) {
  return (
    <span className={`slot${s.fate === 'removed' ? ' gone' : ''}`} style={{ '--fate': FATE_COLOR[s.fate] } as CSSProperties}>
      <ScarabIcon s={s} size={34} />
    </span>
  );
}

export function Overview({ go }: { go: (tab: TabId, mechanic?: string) => void }) {
  const { meta, scarabs, notables, effects } = data;
  const count = (fates: Fate[]) => scarabs.filter((s) => fates.includes(s.fate)).length;
  const notableCount = (s: string) => notables.filter((n) => n.status === s).length;
  const effectCount = (s: string) => effects.filter((e) => e.status === s).length;
  const kindCount = (side: 'old' | 'new', kind: string) => data.nodes[side].filter((n) => n.kind === kind).length;

  // Stash rows: one per mechanic that had scarabs, in category order; slots sorted from kept to gone.
  const rows = mechanicsByCategory
    .map(({ category, items }) => ({
      category,
      mechanics: items
        .map((m) => ({ m, list: scarabs.filter((s) => s.mechanic === m.name).sort((a, b) => FATES.indexOf(a.fate) - FATES.indexOf(b.fate)) }))
        .filter((r) => r.list.length),
    }))
    .filter((g) => g.mechanics.length);

  return (
    <>
      <section className="hero">
        <h1>What 3.30 did to your scarabs</h1>
        <p className="hero-sub">
          All {scarabs.length} scarabs are gone in 3.30. Each slot shows what the new Atlas tree gives back. Hover or tap a scarab for the numbers.
        </p>
        <div className="legend">
          {LEGEND.map((l) => (
            <span key={l.label}>
              <i style={{ background: l.color }} />
              {l.label} <b style={{ color: 'var(--text)', fontWeight: 500 }}>{count(l.fates)}</b>
            </span>
          ))}
        </div>

        <div className="overall-bar">
          <Stack parts={fateParts(scarabs)} title={`All ${scarabs.length} scarabs`} />
        </div>
        <div className="stash">
          {rows.map(({ category, mechanics }) => (
            <div key={category} className="stash-section">
              <div className="stash-cat">{CATEGORY_LABEL[category]}</div>
              <div className="stash-groups">
                {mechanics.map(({ m, list }) => (
                  <div key={m.name} className="stash-group">
                    <a
                      href={`#/scarabs/${encodeURIComponent(m.name)}`}
                      className="stash-label"
                      onClick={(e) => {
                        e.preventDefault();
                        go('scarabs', m.name);
                      }}
                    >
                      <MechanicIcon mechanic={m.name} size={18} />
                      {m.name}
                    </a>
                    <div className="stash-slots">
                      {list.map((s) => (
                        <Slot key={s.id} s={s} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="stash-foot">
          Based on GGG's 3.30 preview tree. <a href="#/about">How the numbers work</a>
        </p>
      </section>

      <h2 className="section-title">The Atlas tree itself</h2>
      <dl className="facts">
        <dt>Atlas points</dt>
        <dd>
          {meta.old.totalPoints} → {meta.new.totalPoints}
        </dd>
        <dt>Nodes you can take</dt>
        <dd>
          {meta.old.nodeCount} → {meta.new.nodeCount}
        </dd>
        <dt>Notables</dt>
        <dd>
          {kindCount('old', 'notable')} → {kindCount('new', 'notable')}, with {notableCount('removed')} removed, {notableCount('added')} new and{' '}
          {notableCount('replaced')} renamed or merged
        </dd>
        <dt>Keystones</dt>
        <dd>
          {kindCount('old', 'keystone')} → {kindCount('new', 'keystone')}
        </dd>
        <dt>Stat lines</dt>
        <dd>
          {effectCount('buffed')} stronger, {effectCount('nerfed')} weaker, {effectCount('added')} new, {effectCount('removed')} gone
        </dd>
      </dl>

      <h2 className="section-title">By mechanic</h2>
      <div className="panel">
        <table className="rtable">
          <thead>
            <tr>
              <th>Mechanic</th>
              <th className="num">Nodes</th>
              <th>Notables</th>
              <th style={{ width: 200 }}>Stat lines</th>
              <th style={{ width: 200 }}>Scarab fates</th>
            </tr>
          </thead>
          <tbody>
            {mechanicsByCategory.map(({ category, items }) => (
              <Fragment key={category}>
                <tr className="cat-row">
                  <td colSpan={5}>
                    <span className="cat-title">{CATEGORY_LABEL[category]}</span>
                  </td>
                </tr>
                {items.map((m) => {
                  const oldN = nodeTotal(m.old);
                  const newN = nodeTotal(m.new);
                  const list = scarabs.filter((s) => s.mechanic === m.name);
                  const kept = list.filter((s) => s.fate !== 'removed').length;
                  return (
                    <tr key={m.name}>
                      <td>
                        <span className="with-icon">
                          <MechIcon mechanic={m.name} size={26} />
                          <a href={`#/mechanic/${encodeURIComponent(m.name)}`} onClick={(e) => (e.preventDefault(), go('mechanic', m.name))} style={{ color: 'var(--text)' }}>
                            {m.name}
                          </a>
                        </span>
                      </td>
                      <td className="num" data-label="Nodes">
                        {oldN} → {newN}
                      </td>
                      <td data-label="Notables">
                        {m.notables.added > 0 && <span className="s-added">{m.notables.added} new</span>}
                        {m.notables.added > 0 && m.notables.removed > 0 && ', '}
                        {m.notables.removed > 0 && <span className="s-removed">{m.notables.removed} removed</span>}
                        {!m.notables.added && !m.notables.removed && <span className="muted">no change in count</span>}
                      </td>
                      <td data-label="Stat lines">
                        <Stack
                          title={`${m.name}: stat lines`}
                          parts={EFFECT_PARTS.map((st) => ({ value: m.effects[st], color: STATUS_COLOR[st], label: STATUS_LABEL[st] }))}
                        />
                      </td>
                      <td data-label="Scarab fates">
                        {list.length ? (
                          <Stack title={`${m.name}: ${kept} of ${list.length} scarabs still do something`} parts={fateParts(list)} />
                        ) : (
                          <span className="muted">no scarabs</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
