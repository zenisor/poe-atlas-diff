import { Fragment, useMemo, useState } from 'react';
import { track, trackToggle, useTrackedSearch } from '../lib/analytics.ts';
import { Autocomplete } from '../components/Autocomplete.tsx';
import { SEARCH_INDEX } from '../searchIndex.ts';
import { flashFocus, useFocusTarget } from '../lib/focus.ts';
import { data, scarabLinksByNode } from '../data.ts';
import type { EffectDiff, EffectSide, EffectStatus } from '../lib/types.ts';
import { likeText, prettyTemplate, signedPct, surpass, trimNum } from '../lib/format.ts';
import { CATEGORY_COLOR, Chip, makeGroupHeaders, STATUS_COLOR, STATUS_LABEL, StatText, StatusBadge, toggle } from '../components/ui.tsx';
import { CATEGORY_LABEL, matchesMechanic } from '../lib/mechanics.ts';
import { MechIcon, NodeTip, ScarabIcon } from '../components/tips.tsx';

/** Scarabs whose effect this tree effect (partly) replaced. */
function scarabsOf(e: EffectDiff) {
  const seen = new Map<string, ScarabResult>();
  for (const c of e.new?.contributions ?? []) for (const l of scarabLinksByNode.get(c.nodeId) ?? []) seen.set(l.scarab.id, l.scarab);
  return [...seen.values()];
}
import type { ScarabResult, Version } from '../lib/types.ts';

const iconOf = { '3.29': new Map(data.nodes.old.map((n) => [n.id, n])), '3.30': new Map(data.nodes.new.map((n) => [n.id, n])) };
/** The art of the most prominent node giving this effect (notables first, new tree first). */
function effectNode(e: EffectDiff): { version: Version; id: string; kind: 'small' | 'notable' | 'keystone'; icon: string } | null {
  for (const [version, side] of [['3.30', e.new], ['3.29', e.old]] as const) {
    const contribs = side?.contributions ?? [];
    const c = contribs.find((x) => x.kind !== 'small') ?? contribs[0];
    const n = c && iconOf[version].get(c.nodeId);
    if (n && (n.kind === 'small' || n.kind === 'notable' || n.kind === 'keystone')) return { version, id: n.id, kind: n.kind, icon: n.icon };
  }
  return null;
}

const STATUSES: EffectStatus[] = ['removed', 'added', 'buffed', 'nerfed', 'reworded', 'reshuffled', 'unchanged'];

export function Effects({ mechanic, embedded = false, focus, focusNonce }: { mechanic: string; embedded?: boolean; focus?: string; focusNonce?: number }) {
  const [statuses, setStatuses] = useState<Set<EffectStatus>>(
    // A single mechanic page is short enough to show everything, including what didn't change.
    new Set(embedded ? STATUSES : STATUSES.filter((s) => s !== 'unchanged')),
  );
  const [q, setQ] = useState('');
  const [sortDelta, setSortDelta] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.effects.filter(
      (e) =>
        statuses.has(e.status) &&
        matchesMechanic(e.mechanic, mechanic) &&
        (!needle || e.label.toLowerCase().includes(needle) || sideText(e).toLowerCase().includes(needle)),
    );
    if (sortDelta) list.sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0));
    return list;
  }, [statuses, mechanic, q, sortDelta]);

  const count = (s: EffectStatus) => data.effects.filter((e) => e.status === s && matchesMechanic(e.mechanic, mechanic)).length;
  useTrackedSearch(embedded ? 'mechanic-effects' : 'effects', q);

  /** Expand an effect row (clearing filters that would hide it) and scroll to it. */
  const reveal = (key: string) => {
    const e = data.effects.find((x) => x.key === key);
    if (!e) return;
    if (!statuses.has(e.status)) setStatuses(new Set([...statuses, e.status]));
    setQ('');
    setOpen((o) => new Set([...o, key]));
    flashFocus(`effect:${key}`);
  };
  useFocusTarget(focus, focusNonce, (key) => reveal(key));
  // Effects by their text, plus node names (picking a node filters to the effects it gives).
  const localEntries = useMemo(
    () => SEARCH_INDEX.filter((e) => (e.kind === 'effect' || e.kind === 'node' || e.kind === 'notable' || e.kind === 'keystone') && matchesMechanic(e.mechanics, mechanic)),
    [mechanic],
  );
  const header = makeGroupHeaders();
  const single = !!mechanic && !mechanic.startsWith('cat:');

  return (
    <>
      {!embedded && <h2>All tree effects</h2>}
      {!embedded && (
      <p className="lead">
        Every stat line on the tree, grouped by wording (numbers ignored), with totals for taking every node that has it. "3.30" includes the best
        variant of multiple-choice notables. Effects marked <b>Surpassing</b> show the total as guaranteed + chance (every 100% = +1). Click a row
        to see which nodes give it.
      </p>
      )}
      <div className="toolbar">
        <Autocomplete
          entries={localEntries}
          value={q}
          onChange={setQ}
          onSelect={(h) => (h.entry.kind === 'effect' ? reveal(h.entry.target.focus!) : setQ(h.entry.label))}
          placeholder="Search effect text or node…"
        />
        <label className="small">
          <input type="checkbox" checked={sortDelta} onChange={(e) => {
              setSortDelta(e.target.checked);
              trackToggle('effects', 'biggest-nerfs-first', e.target.checked);
            }} /> biggest nerfs first
        </label>
        {STATUSES.map((s) => (
          <Chip key={s} on={statuses.has(s)} color={STATUS_COLOR[s]} onClick={() => {
            setStatuses(toggle(statuses, s));
            trackToggle('effects', `status-${s}`, !statuses.has(s));
          }}>
            {STATUS_LABEL[s]} ({count(s)})
          </Chip>
        ))}
      </div>
      <div className="panel">
        <table className="rtable">
          <thead>
            <tr>
              <th>Effect</th>
              <th className="num" title="Taking every node that has this effect">3.29 max (all nodes)</th>
              <th className="num" title="Taking every node that has this effect">3.30 max (all nodes)</th>
              <th className="num">Δ</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const g = sortDelta ? { category: null, mechanic: null } : header(e.mechanic);
              const isOpen = open.has(e.key);
              return (
                <Fragment key={e.key}>
                  {g.category && !mechanic && (
                    <tr className="cat-row">
                      <td colSpan={5}>
                        <span className="cat-title" style={{ color: CATEGORY_COLOR[g.category] }}>
                          {CATEGORY_LABEL[g.category]}
                        </span>
                      </td>
                    </tr>
                  )}
                  {g.mechanic && !single && (
                    <tr className="group-row">
                      <td colSpan={5}>
                        <span className="with-icon">
                          <MechIcon mechanic={g.mechanic} size={26} />
                          {g.mechanic}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr
                    data-focus={`effect:${e.key}`}
                    className="clickable"
                    onClick={() => {
                      if (!open.has(e.key)) track(`effect/open/${e.label}`);
                      setOpen(toggle(open, e.key));
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {(() => {
                        const n = effectNode(e);
                        return n ? <NodeTip version={n.version} id={n.id} kind={n.kind} icon={n.icon} size={n.kind === 'small' ? 28 : 34} /> : <span style={{ width: 28 }} />;
                      })()}
                      <div>
                      {e.key.startsWith('link:') ? <b>{e.label}</b> : <span className="mod">{prettyTemplate(e.label)}</span>}
                      {scarabsOf(e).length > 0 && (
                        <span className="icon-strip" style={{ marginLeft: 8 }} onClick={(ev) => ev.stopPropagation()}>
                          {scarabsOf(e).map((sc) => (
                            <ScarabIcon key={sc.id} s={sc} size={22} underline />
                          ))}
                        </span>
                      )}
                      {e.old?.surpassing || e.new?.surpassing ? <span className="badge" style={{ color: 'var(--gold)', marginLeft: 6 }}>Surpassing</span> : null}
                      {e.similar && <div className="small muted">similar {e.status === 'removed' ? 'new' : 'old'} effect: {prettyTemplate(e.similar.label)}</div>}
                      {e.note && <div className="note">{e.note}</div>}
                      </div>
                      </div>
                    </td>
                    <td className="num" data-label="3.29 max">{sideSummary(e.old)}</td>
                    <td className="num" data-label="3.30 max">{sideSummary(e.new)}</td>
                    <td className={`num ${e.status === 'buffed' ? 's-buffed' : e.status === 'nerfed' ? 's-nerfed' : 'muted'}`} data-label="Change">{signedPct(e.deltaPct)}</td>
                    <td data-label="Status">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        <div className="cols-2">
                          <Contribs title="3.29" side={e.old} />
                          <Contribs title="3.30" side={e.new} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="muted">Nothing matches these filters.</p>}
      </div>
    </>
  );
}

function sideText(e: EffectDiff): string {
  return [...(e.old?.contributions ?? []), ...(e.new?.contributions ?? [])].map((c) => `${c.nodeName} ${c.text}`).join(' ');
}

function sideSummary(s: EffectSide | null) {
  if (!s) return <span className="muted">—</span>;
  const fmt = (v: number) => (s.surpassing ? surpass(v) : trimNum(v));
  if (!s.nodeCount) return <span className="muted">only via choice: {fmt(s.totalWithChoices)}</span>;
  return (
    <span title={s.surpassing ? `${trimNum(s.totalWithChoices)}% Surpassing Chance` : undefined}>
      {fmt(s.total)}
      {s.totalWithChoices !== s.total && <span className="muted"> ({fmt(s.totalWithChoices)} w/ choice)</span>}
      <div className="small muted">{s.nodeCount} node{s.nodeCount === 1 ? '' : 's'}</div>
    </span>
  );
}

function Contribs({ title, side }: { title: string; side: EffectSide | null }) {
  if (!side) return <div className="small muted">{title}: not on the tree</div>;
  const grouped = new Map<string, { name: string; text: string; kind: string; choice?: boolean; n: number; sum: number }>();
  for (const c of side.contributions) {
    const key = `${c.nodeName}|${c.text}|${c.choice ?? false}`;
    const g = grouped.get(key);
    if (g) {
      g.n++;
      g.sum += c.value ?? 0;
    } else grouped.set(key, { name: c.nodeName, text: c.text, kind: c.kind, choice: c.choice, n: 1, sum: c.value ?? 0 });
  }
  return (
    <div>
      <div className="small muted">{title}</div>
      <ul className="stats small">
        {[...grouped.values()].map((g) => (
          <li key={`${g.name}${g.text}${g.choice}`} className={g.choice ? 'choice' : ''}>
            <b>{g.name}</b>
            {g.n > 1 && ` ×${g.n}`}
            {g.kind !== 'small' && <span className="muted"> ({g.kind})</span>}: <StatText text={g.text} />
            {g.n > 1 && <span style={{ color: 'var(--text)' }}> → max {likeText(g.text, g.sum)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
