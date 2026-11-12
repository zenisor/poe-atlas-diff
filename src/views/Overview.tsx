import { Fragment } from 'react';
import { data, mechanicsByCategory } from '../data.ts';
import type { TabId } from '../App.tsx';
import { REPORT_URL } from '../links.ts';
import type { MechanicSummary } from '../lib/types.ts';
import { FATE_LABEL } from '../lib/scarabs.ts';
import { CATEGORY_LABEL, CATEGORY_NOTE } from '../lib/mechanics.ts';
import { CATEGORY_COLOR, FATE_COLOR, FATES, Legend, Stack, STATUS_COLOR, Tile } from '../components/ui.tsx';
import { MechIcon, ScarabIcon } from '../components/tips.tsx';

const EFFECT_PARTS = ['buffed', 'nerfed', 'added', 'removed', 'reworded', 'unchanged'] as const;
const nodeTotal = (s: MechanicSummary['old']) => s.small + s.notable + s.keystone;

export function Overview({ go }: { go: (tab: TabId, mechanic?: string) => void }) {
  const { meta, scarabs, notables, effects } = data;
  const fateCounts = Object.fromEntries(FATES.map((f) => [f, scarabs.filter((s) => s.fate === f).length]));
  const notableCount = (s: string) => notables.filter((n) => n.status === s).length;
  const effectCount = (s: string) => effects.filter((e) => e.status === s).length;
  const kindCount = (side: 'old' | 'new', kind: string) => data.nodes[side].filter((n) => n.kind === kind).length;
  const link = (tab: TabId, m: string, label: string) => (
    <a href="#" onClick={(e) => (e.preventDefault(), go(tab, m))}>
      {label}
    </a>
  );

  return (
    <>
      <h2>Overview</h2>
      <p className="lead">
        Comparing the 3.29.3 Atlas tree with the 3.30.0 tree (preview 2). Scarabs are removed in 3.30. For every 3.29 scarab, <b>Scarab fates</b>{' '}
        shows whether its effect moved to the tree, at what strength (measured against the scarab's <i>max power = effect × map limit</i>), or
        is gone. Mechanics are grouped the way the patch notes split them: <b>content</b> (primary / secondary / tertiary), <b>additive endgame
        layers</b> that stack on top of any map (Maven, Exarch, Eater…), and generic <b>map juice</b>. Surpassing Chance counts as +1 guaranteed
        per 100%.
      </p>

      <div className="caveat">
        <div className="caveat-title">Before you trust a number</div>
        <ul>
          <li>
            Built from the <b>3.30.0 preview 2</b> Atlas tree export. GGG can still change values before or after launch.
          </li>
          <li>
            <b>Surpassing Chance</b> is read as +1 guaranteed per 100% (the remainder is the chance for one more). Content base spawn rates aren't
            modelled, only what the Atlas tree and scarabs add.
          </li>
          <li>
            Which tree node replaces which scarab effect is a <b>curated judgment call</b> (every pairing and note is on the Scarab fates tab).
            Thread modifiers are random and not scored.
          </li>
          <li>
            Spotted something wrong?{' '}
            <a href={REPORT_URL} target="_blank" rel="noopener noreferrer">
              Report a mistake
            </a>{' '}
            and it gets fixed for everyone.
          </li>
        </ul>
      </div>

      <div className="grid tiles">
        <Tile label="Atlas points" value={`${meta.old.totalPoints} → ${meta.new.totalPoints}`} sub={`+${meta.new.totalPoints - meta.old.totalPoints} points`} />
        <Tile label="Allocatable nodes" value={`${meta.old.nodeCount} → ${meta.new.nodeCount}`} sub="small + notable + keystone" />
        <Tile
          label="Notables"
          value={`${kindCount('old', 'notable')} → ${kindCount('new', 'notable')}`}
          sub={`${notableCount('removed')} removed · ${notableCount('added')} new · ${notableCount('replaced')} replaced`}
        />
        <Tile label="Keystones" value={`${kindCount('old', 'keystone')} → ${kindCount('new', 'keystone')}`} />
        <Tile
          label="Tree effects"
          value={`${effectCount('buffed')}↑ ${effectCount('nerfed')}↓`}
          sub={`${effectCount('added')} new · ${effectCount('removed')} removed · ${effectCount('unchanged')} unchanged`}
        />
        <Tile label="Scarabs removed" value={scarabs.length} sub={`${fateCounts.full} kept at full power on the tree`} />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>What happened to the {scarabs.length} scarabs</h3>
        <Stack parts={FATES.map((f) => ({ value: fateCounts[f], color: FATE_COLOR[f], label: FATE_LABEL[f] }))} />
        <Legend items={FATES.map((f) => ({ label: `${FATE_LABEL[f]} (${fateCounts[f]})`, color: FATE_COLOR[f] }))} />
        <table style={{ marginTop: 14 }}>
          <tbody>
            {mechanicsByCategory.map(({ category }) => {
              const list = scarabs.filter((s) => s.category === category);
              if (!list.length) return null;
              return (
                <tr key={category}>
                  <td style={{ width: 230 }}>
                    <a href="#" style={{ color: CATEGORY_COLOR[category] }} onClick={(e) => (e.preventDefault(), go('scarabs', `cat:${category}`))}>
                      {CATEGORY_LABEL[category]}
                    </a>{' '}
                    <span className="muted small">({list.length})</span>
                  </td>
                  <td>
                    <div className="icon-strip">
                      {[...list]
                        .sort((a, b) => FATES.indexOf(a.fate) - FATES.indexOf(b.fate))
                        .map((s) => (
                          <ScarabIcon key={s.id} s={s} size={30} underline />
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>By mechanic</h3>
        <table>
          <thead>
            <tr>
              <th>Mechanic</th>
              <th className="num">Nodes 3.29 → 3.30</th>
              <th>Notables</th>
              <th>Effects</th>
              <th style={{ width: 220 }}>Scarab fates</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {mechanicsByCategory.map(({ category, items }) => (
              <Fragment key={category}>
                <tr className="cat-row">
                  <td colSpan={6}>
                    <div className="cat-title" style={{ color: CATEGORY_COLOR[category] }}>
                      {CATEGORY_LABEL[category]}
                    </div>
                    <div className="cat-note">{CATEGORY_NOTE[category]}</div>
                  </td>
                </tr>
                {items.map((m) => {
                  const oldN = nodeTotal(m.old);
                  const newN = nodeTotal(m.new);
                  const scarabTotal = FATES.reduce((a, f) => a + m.scarabs[f], 0);
                  return (
                    <tr key={m.name}>
                      <td>
                        <a href="#" className="with-icon" style={{ color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }} onClick={(e) => (e.preventDefault(), go('mechanic', m.name))}>
                          <MechIcon mechanic={m.name} size={30} />
                          {m.name}
                        </a>
                      </td>
                      <td className="num">
                        {oldN} → {newN}{' '}
                        <span className={newN > oldN ? 's-added' : newN < oldN ? 's-removed' : 'muted'}>
                          ({newN - oldN >= 0 ? '+' : ''}
                          {newN - oldN})
                        </span>
                      </td>
                      <td className="small">
                        <span className="s-added">+{m.notables.added}</span> <span className="s-removed">−{m.notables.removed}</span>{' '}
                        <span className="s-changed">~{m.notables.replaced + m.notables.changed + m.notables.mixed}</span>{' '}
                        <span className="s-buffed">↑{m.notables.buffed}</span> <span className="s-nerfed">↓{m.notables.nerfed}</span>
                      </td>
                      <td>
                        <Stack parts={EFFECT_PARTS.map((s) => ({ value: m.effects[s], color: STATUS_COLOR[s], label: s }))} />
                      </td>
                      <td>
                        {scarabTotal ? (
                          <Stack parts={FATES.map((f) => ({ value: m.scarabs[f], color: FATE_COLOR[f], label: FATE_LABEL[f] }))} />
                        ) : (
                          <span className="muted small">no scarabs</span>
                        )}
                      </td>
                      <td className="small" style={{ whiteSpace: 'nowrap' }}>
                        {link('mechanic', m.name, 'details')} {link('map', m.name, 'map')}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        <Legend items={EFFECT_PARTS.map((s) => ({ label: `effect ${s}`, color: STATUS_COLOR[s] }))} />
      </div>
    </>
  );
}
