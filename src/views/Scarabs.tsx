import { Fragment, useMemo, useState } from 'react';
import { data } from '../data.ts';
import type { Fate, MatchedContribution, ScarabEffectResult, ScarabResult } from '../lib/types.ts';
import { FATE_LABEL } from '../lib/scarabs.ts';
import { fmtValue, pct } from '../lib/format.ts';
import { CATEGORY_COLOR, Chip, FATE_COLOR, FateBadge, FATES, makeGroupHeaders, Retention, StatText, toggle } from '../components/ui.tsx';
import { CATEGORY_LABEL, matchesMechanic } from '../lib/mechanics.ts';
import { ItemIcon } from '../components/art.tsx';
import { MechIcon, NodeTip, ScarabIcon } from '../components/tips.tsx';

type SortKey = 'mechanic' | 'retention' | 'name';

export function Scarabs({ mechanic, embedded = false }: { mechanic: string; embedded?: boolean }) {
  const [fates, setFates] = useState<Set<Fate>>(new Set(FATES));
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('mechanic');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.scarabs.filter(
      (s) =>
        fates.has(s.fate) &&
        matchesMechanic(s.mechanics, mechanic) &&
        (!needle || s.name.toLowerCase().includes(needle) || s.description.join(' ').toLowerCase().includes(needle)),
    );
    const byRetention = (s: ScarabResult) => (s.retention == null ? 9 : s.retention);
    if (sort === 'retention') list.sort((a, b) => byRetention(a) - byRetention(b) || a.name.localeCompare(b.name));
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [fates, mechanic, q, sort]);

  const counts = Object.fromEntries(FATES.map((f) => [f, data.scarabs.filter((s) => s.fate === f && matchesMechanic(s.mechanics, mechanic)).length]));
  const header = makeGroupHeaders();
  // On a single-mechanic page, list multi-mechanic scarabs under that mechanic.
  const groupOf = (s: ScarabResult) => (mechanic && s.mechanics.includes(mechanic) ? mechanic : s.mechanic);

  return (
    <>
      {!embedded && <h2>Scarab fates in 3.30</h2>}
      {!embedded && (
      <p className="lead">
        <b>Max power</b> = one scarab's effect × its map limit. <b>Best case</b> compares 3.29 (full tree + max scarabs) with 3.30 (full tree, no
        scarabs). Its <b>retention</b> drives the verdict. <b>Absorbed</b> is how much of the scarab's max power the 3.30 tree added on top of what
        3.29's tree already gave. Surpassing Chance converts to counts (100% = +1). Choice notables count their best variant.
      </p>
      )}
      <div className="toolbar">
        <input type="search" placeholder="Search scarab or effect…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="mechanic">Group by mechanic</option>
          <option value="retention">Most nerfed first</option>
          <option value="name">Name</option>
        </select>
        {FATES.map((f) => (
          <Chip key={f} on={fates.has(f)} color={FATE_COLOR[f]} onClick={() => setFates(toggle(fates, f))}>
            {FATE_LABEL[f]} ({counts[f]})
          </Chip>
        ))}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 240 }}>Scarab</th>
              <th className="num">Limit</th>
              <th>Effect → 3.30</th>
              <th className="num">Max power</th>
              <th className="num">3.29 best → 3.30</th>
              <th style={{ width: 130 }}>Retention</th>
              <th className="num">Absorbed</th>
              <th>Fate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const g = sort === 'mechanic' ? header(groupOf(s)) : { category: null, mechanic: null };
              const isOpen = open.has(s.id);
              const main = s.effects[0];
              const quantified = s.effects.filter((e) => e.retention != null).length;
              return (
                <Fragment key={s.id}>
                  {g.category && !mechanic && (
                    <tr className="cat-row">
                      <td colSpan={8}>
                        <span className="cat-title" style={{ color: CATEGORY_COLOR[g.category] }}>
                          {CATEGORY_LABEL[g.category]}
                        </span>
                      </td>
                    </tr>
                  )}
                  {g.mechanic && !(mechanic && !mechanic.startsWith('cat:')) && (
                    <tr className="group-row">
                      <td colSpan={8}>
                        <span className="with-icon">
                          <MechIcon mechanic={g.mechanic} size={26} />
                          {g.mechanic}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="clickable" onClick={() => setOpen(toggle(open, s.id))}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <ScarabIcon s={s} size={44} />
                        <div>
                          <span className="item-name">{s.name}</span>
                          {s.mechanics.length > 1 && (
                            <div className="small" style={{ color: 'var(--gold-dim)', display: 'flex', gap: 4, alignItems: 'center', margin: '2px 0' }}>
                              {s.mechanics.map((m) => (
                                <MechIcon key={m} mechanic={m} size={18} />
                              ))}
                              <span>{s.mechanics.join(', ')}</span>
                            </div>
                          )}
                          <div className="small mod">
                            {s.description.map((d, i) => (
                              <div key={i}>{d}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{s.limit}</td>
                    <td className="small">
                      {s.effects.map((e, i) => (
                        <div key={i} style={{ marginBottom: 4 }}>
                          <span style={{ color: FATE_COLOR[e.fate] }}>◆</span> {e.label}
                          {e.fate === 'thread' && (
                            <div className="with-icon" style={{ marginTop: 3 }}>
                              <ItemIcon name={`${s.mechanic} Thread`} size={24} fallbackMechanic={s.mechanic} />
                              <span style={{ color: 'var(--f-thread)' }}>{s.mechanic} Thread</span>
                            </div>
                          )}
                          {e.matches330.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', marginTop: 3 }}>
                              {uniqueNodes(e.matches330).map((n) => (
                                <span key={n.name} className="with-icon muted" style={{ gap: 4 }}>
                                  <NodeTip version="3.30" id={n.id} kind={n.kind} icon={n.icon} size={n.kind === 'small' ? 22 : 28} />
                                  {n.name}
                                  {n.count > 1 && ` ×${n.count}`}
                                  {e.unit !== 'binary' && e.unit !== 'content' && <span style={{ color: 'var(--text)' }}>&nbsp;{fmtValue(n.sum, e.unit, n.surpassing)}</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="num">{main.unit === 'binary' || main.unit === 'content' ? '—' : fmtValue(main.scarabMax, main.unit)}</td>
                    <td className="num">{bestCase(main)}</td>
                    <td>
                      <Retention value={s.retention} />
                      {quantified > 0 && quantified < s.effects.length && (
                        <div className="small muted">
                          {quantified} of {s.effects.length} effects quantifiable
                        </div>
                      )}
                    </td>
                    <td className="num">{main.absorbed == null ? '–' : pct(main.absorbed)}</td>
                    <td>
                      <FateBadge fate={s.fate} short />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="detail-row">
                      <td colSpan={8}>
                        <ScarabDetail s={s} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="muted">No scarabs match these filters.</p>}
      </div>
    </>
  );
}

const nodeIconById = new Map(data.nodes.new.map((n) => [n.id, n.icon]));

/** Distinct matched nodes (by name) with how many copies the tree has. Notables first. */
function uniqueNodes(list: MatchedContribution[]) {
  const map = new Map<string, { id: string; name: string; kind: MatchedContribution['kind']; icon: string; count: number; sum: number; surpassing: boolean }>();
  for (const c of list) {
    const e = map.get(c.nodeName);
    if (e) {
      e.count++;
      e.sum += c.value;
    } else map.set(c.nodeName, { id: c.nodeId, name: c.nodeName, kind: c.kind, icon: nodeIconById.get(c.nodeId) ?? '', count: 1, sum: c.value, surpassing: c.surpassing });
  }
  const rank = { keystone: 0, notable: 1, small: 2 } as Record<string, number>;
  return [...map.values()].sort((a, b) => (rank[a.kind] ?? 3) - (rank[b.kind] ?? 3));
}

function bestCase(e: ScarabEffectResult): string {
  if (e.fate === 'thread') return 'via Threads';
  if (e.unit === 'binary') return 'yes → no';
  if (e.retention == null) {
    return e.treeUnit && e.treeUnit !== 'see nodes' ? `tree: ${fmtValue(e.tree330, e.treeUnit)}` : '—';
  }
  return `${fmtValue(e.before, e.unit)} → ${fmtValue(e.after, e.unit, e.surpassing)}`;
}

function ScarabDetail({ s }: { s: ScarabResult }) {
  return (
    <div>
      {s.effects.map((e, i) => (
        <div key={i} className="card">
          <div className="card-head">
            <span className="name">{e.label}</span>
            <FateBadge fate={e.fate} />
            {e.weight !== 1 && <span className="small muted">weight {e.weight}</span>}
          </div>
          <dl className="kv">
            {e.unit !== 'binary' && e.unit !== 'content' && (
              <>
                <dt>Per scarab</dt>
                <dd>
                  {fmtValue(e.perScarab, e.unit)} {e.stacks ? `× limit ${s.limit} = ${fmtValue(e.scarabMax, e.unit)}` : '(does not stack)'}
                  {e.cap != null && <span className="muted"> · capped at {e.cap}</span>}
                </dd>
                <dt>3.29 tree</dt>
                <dd>{fmtValue(e.tree329, e.treeUnit && e.retention == null ? e.treeUnit : e.unit)}</dd>
                <dt>3.30 tree</dt>
                <dd>{fmtValue(e.tree330, e.treeUnit && e.retention == null ? e.treeUnit : e.unit, e.surpassing)}</dd>
                {e.retention != null && (
                  <>
                    <dt>Best case</dt>
                    <dd>
                      {fmtValue(e.before, e.unit)} (3.29 tree + max scarabs) → {fmtValue(e.after, e.unit, e.surpassing)} (3.30 tree) = <b>{pct(e.retention)}</b>
                    </dd>
                    <dt>Absorbed</dt>
                    <dd>{pct(e.absorbed)} of the scarab's max power was added to the tree</dd>
                  </>
                )}
              </>
            )}
          </dl>
          {e.note && <div className="note">{e.note}</div>}
          {(e.matches329.length > 0 || e.matches330.length > 0) && (
            <div className="cols-2" style={{ marginTop: 10 }}>
              <MatchList title="3.29 tree" list={e.matches329} />
              <MatchList title="3.30 tree" list={e.matches330} />
            </div>
          )}
        </div>
      ))}
      {s.related.length > 0 && (
        <div className="card">
          <div className="small muted" style={{ marginBottom: 6 }}>
            Related on the 3.30 tree (not counted in the numbers)
          </div>
          {s.related.map((r) => {
            const n = data.nodes.new.find((x) => x.id === r.nodeId);
            return (
              <div key={r.nodeId} className="with-icon small" style={{ gap: 8, marginBottom: 4 }}>
                {n && <NodeTip version="3.30" id={n.id} kind={n.kind} icon={n.icon} size={30} />}
                <span>
                  <b>{r.nodeName}</b> <span className="muted">{r.note}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {s.note && <div className="note">{s.note}</div>}
    </div>
  );
}

function MatchList({ title, list }: { title: string; list: MatchedContribution[] }) {
  if (!list.length)
    return (
      <div>
        <div className="small muted">{title}</div>
        <div className="small muted">nothing</div>
      </div>
    );
  const grouped = new Map<string, { c: MatchedContribution; n: number }>();
  for (const c of list) {
    const key = `${c.nodeName}|${c.text}|${c.choice}`;
    const g = grouped.get(key);
    if (g) g.n++;
    else grouped.set(key, { c, n: 1 });
  }
  return (
    <div>
      <div className="small muted">{title}</div>
      <ul className="stats small">
        {[...grouped.values()].map(({ c, n }) => (
          <li key={`${c.nodeId}${c.text}`} className={c.choice ? 'choice' : ''}>
            <b>{c.nodeName}</b>
            {n > 1 && ` ×${n}`}
            {c.kind !== 'small' && <span className="muted"> ({c.kind})</span>}: <StatText text={c.text} />
            {c.choice && <span className="muted"> (choice; pick one variant)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
