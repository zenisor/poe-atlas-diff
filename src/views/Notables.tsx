import { useMemo, useState } from 'react';
import { track, trackToggle, useTrackedSearch } from '../lib/analytics.ts';
import { Autocomplete } from '../components/Autocomplete.tsx';
import { SEARCH_INDEX } from '../searchIndex.ts';
import { flashFocus, useFocusTarget } from '../lib/focus.ts';
import { data, relatedScarabsByNode, scarabLinksByNode } from '../data.ts';
import { RelatedScarabs, ScarabLinks } from '../components/tips.tsx';

const linksOf = (n: NotableDiff) => n.new.flatMap((r) => scarabLinksByNode.get(r.id) ?? []);
const relatedOf = (n: NotableDiff) => n.new.filter((r) => relatedScarabsByNode.has(r.id));
import type { NotableDiff, NotableStatus, NotableRef, Version } from '../lib/types.ts';
import { MechIcon, NodeTip } from '../components/tips.tsx';
import { prettyTemplate, trimNum } from '../lib/format.ts';
import { CATEGORY_COLOR, Chip, STATUS_COLOR, STATUS_LABEL, StatList, StatusBadge, toggle } from '../components/ui.tsx';
import { CATEGORY_LABEL, categoryOf, matchesMechanic } from '../lib/mechanics.ts';

const STATUSES: NotableStatus[] = ['removed', 'added', 'replaced', 'changed', 'buffed', 'nerfed', 'mixed', 'unchanged'];

export function Notables({ mechanic, embedded = false, focus, focusNonce }: { mechanic: string; embedded?: boolean; focus?: string; focusNonce?: number }) {
  const [statuses, setStatuses] = useState<Set<NotableStatus>>(
    // A single mechanic page is short enough to show everything, including what didn't change.
    new Set(embedded ? STATUSES : STATUSES.filter((s) => s !== 'unchanged')),
  );
  const [kind, setKind] = useState<'all' | 'keystone' | 'notable'>('all');
  const [onlyScarab, setOnlyScarab] = useState(false);
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const text = (n: NotableDiff) => [...n.old, ...n.new].map((r) => `${r.name} ${r.stats.join(' ')} ${(r.variants ?? []).flat().join(' ')}`).join(' ').toLowerCase();
    return data.notables.filter(
      (n) =>
        statuses.has(n.status) &&
        (!onlyScarab || linksOf(n).length > 0 || relatedOf(n).length > 0) &&
        matchesMechanic(n.mechanic, mechanic) &&
        (kind === 'all' || [...n.old, ...n.new].some((r) => r.kind === kind)) &&
        (!needle || text(n).includes(needle)),
    );
  }, [statuses, mechanic, kind, q, onlyScarab]);

  useTrackedSearch(embedded ? 'mechanic-notables' : 'notables', q);

  /** Show a notable diff (clearing filters that would hide it) and scroll to its card. */
  const reveal = (key: string, query = '') => {
    const d = data.notables.find((x) => x.key === key);
    if (!d) return;
    if (!statuses.has(d.status)) setStatuses(new Set([...statuses, d.status]));
    setOnlyScarab(false);
    setKind('all');
    setQ(query);
    flashFocus(`notable:${key}`);
  };
  useFocusTarget(focus, focusNonce, (key) => reveal(key));
  const localEntries = useMemo(
    () => SEARCH_INDEX.filter((e) => (e.kind === 'notable' || e.kind === 'keystone') && matchesMechanic(e.mechanics, mechanic)),
    [mechanic],
  );
  const grouped = new Map<string, NotableDiff[]>();
  for (const r of rows) grouped.set(r.mechanic, [...(grouped.get(r.mechanic) ?? []), r]);
  const count = (s: NotableStatus) => data.notables.filter((n) => n.status === s && matchesMechanic(n.mechanic, mechanic)).length;
  let lastCat = '';

  return (
    <>
      {!embedded && <h2>Notables & keystones</h2>}
      {!embedded && (
      <p className="lead">Notables and keystones in 3.29 and 3.30, including renames and the ones merged into pick-one notables.</p>
      )}
      <div className="toolbar">
        <Autocomplete
          entries={localEntries}
          value={q}
          onChange={setQ}
          onSelect={(h) => reveal(h.entry.target.focus!, h.entry.label)}
          placeholder="Search name or stat…"
        />
        <Chip on={onlyScarab} color="var(--item)" onClick={() => {
            setOnlyScarab(!onlyScarab);
            trackToggle('notables', 'took-over-scarab', !onlyScarab);
          }}>
          Took over a scarab ({data.notables.filter((n) => (linksOf(n).length || relatedOf(n).length) && matchesMechanic(n.mechanic, mechanic)).length})
        </Chip>
        <select value={kind} onChange={(e) => {
            setKind(e.target.value as typeof kind);
            track(`notables/kind/${e.target.value}`);
          }}>
          <option value="all">Notables + keystones</option>
          <option value="keystone">Keystones only</option>
          <option value="notable">Notables only</option>
        </select>
        {STATUSES.map((s) => (
          <Chip key={s} on={statuses.has(s)} color={STATUS_COLOR[s]} onClick={() => {
            setStatuses(toggle(statuses, s));
            trackToggle('notables', `status-${s}`, !statuses.has(s));
          }}>
            {STATUS_LABEL[s]} ({count(s)})
          </Chip>
        ))}
      </div>
      {[...grouped].map(([mech, list]) => {
        const cat = categoryOf(mech);
        const showCat = cat !== lastCat && !(mechanic && !mechanic.startsWith('cat:'));
        lastCat = cat;
        return (
          <section key={mech} style={{ marginBottom: 18 }}>
            {showCat && (
              <div className="cat-head">
                <div className="cat-title" style={{ color: CATEGORY_COLOR[cat] }}>
                  {CATEGORY_LABEL[cat]}
                </div>
              </div>
            )}
            {!(mechanic && !mechanic.startsWith('cat:')) && (
              <h3 className="with-icon" style={{ display: 'flex' }}>
                <MechIcon mechanic={mech} size={30} />
                {mech} <span className="muted small">({list.length})</span>
              </h3>
            )}
            {list.map((n) => (
              <NotableCard key={n.key} n={n} />
            ))}
          </section>
        );
      })}
      {!rows.length && <p className="muted">Nothing matches these filters.</p>}
    </>
  );
}

function Side({ refs, empty, version }: { refs: NotableRef[]; empty: string; version: Version }) {
  if (!refs.length) return <div className="muted small">{empty}</div>;
  return (
    <div>
      {refs.map((r) => (
        <div key={r.id} className="notable-line">
          <NodeTip version={version} id={r.id} kind={r.kind} icon={r.icon} size={r.kind === 'keystone' ? 58 : 48} />
          <div>
            <div className="nl-name">
              {r.name} {r.kind === 'keystone' && <span className="badge" style={{ color: 'var(--gold)' }}>Keystone</span>}
            </div>
            <StatList stats={r.stats} variants={r.variants} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotableCard({ n }: { n: NotableDiff }) {
  const numeric = n.changes.filter((c) => c.old != null && c.new != null);
  return (
    <div className="card" data-focus={`notable:${n.key}`}>
      <div className="card-head">
        <StatusBadge status={n.status} />
        {linksOf(n).length > 0 && (
          <span className="small" style={{ color: 'var(--item)' }}>
            took over a scarab effect
          </span>
        )}
        {/* Only renames/merges need a header name; otherwise it's shown next to the icon below. */}
        {new Set([...n.old, ...n.new].map((r) => r.name)).size > 1 && (
          <span className="name">{[...new Set([...n.old, ...n.new].map((r) => r.name))].join(' → ')}</span>
        )}
        {n.similar && <span className="small muted">closest {n.status === 'removed' ? 'new' : 'old'} notable: {n.similar.name}</span>}
      </div>
      {n.old.length && n.new.length ? (
        <div className="cols-2">
          <div>
            <div className="side-label">3.29</div>
            <Side refs={n.old} empty="did not exist" version="3.29" />
          </div>
          <div>
            <div className="side-label">3.30</div>
            <Side refs={n.new} empty="removed" version="3.30" />
          </div>
        </div>
      ) : (
        <Side refs={n.old.length ? n.old : n.new} empty="" version={n.old.length ? '3.29' : '3.30'} />
      )}
      {numeric.length > 0 && (
        <div className="small" style={{ marginTop: 6 }}>
          {numeric.map((c, i) => (
            <div key={i}>
              <span className={c.better ? 's-buffed' : 's-nerfed'}>
                {trimNum(c.old!)} → {trimNum(c.new!)}
              </span>{' '}
              <span className="muted">{prettyTemplate(c.template)}</span>
            </div>
          ))}
        </div>
      )}
      {n.note && <div className="note">{n.note}</div>}
      {linksOf(n).length > 0 && (
        <div className="scarab-box">
          <div className="small" style={{ color: 'var(--item)', marginBottom: 4 }}>
            Took over a scarab effect
          </div>
          <ScarabLinks links={linksOf(n)} />
        </div>
      )}
      {relatedOf(n).length > 0 && (
        <div className="scarab-box">
          {relatedOf(n).map((r) => (
            <RelatedScarabs key={r.id} nodeId={r.id} />
          ))}
        </div>
      )}
    </div>
  );
}
