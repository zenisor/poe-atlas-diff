import { Fragment, useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics.ts';
import { notablesByOldName, oldNotableMechanic, oldNotableNames, oldNotableNode, PRESETS, scarabsById, strategyMechanic } from '../data.ts';
import { MechanicIcon } from '../components/art.tsx';
import { Autocomplete } from '../components/Autocomplete.tsx';
import { SEARCH_INDEX } from '../searchIndex.ts';
import { useFocusTarget } from '../lib/focus.ts';
import type { SearchEntry } from '../lib/search.ts';
import { normalize } from '../lib/search.ts';

/** Every 3.29 notable/keystone, for the "add notable" search in the builder. */
const OLD_NOTABLE_ENTRIES: SearchEntry[] = oldNotableNames.map((name) => {
  const n = oldNotableNode.get(name)!;
  return {
    id: `old-notable:${name}`,
    kind: n.kind === 'keystone' ? 'keystone' : 'notable',
    label: name,
    sub: `${n.mechanic}. ${n.stats[0] ?? ''}`,
    keywords: normalize(`${n.mechanic} ${n.stats.join(' ')}`),
    mechanics: [n.mechanic],
    target: { tab: 'strategies' },
    art: { type: 'node', version: '3.29', kind: n.kind, icon: n.icon },
  };
});
import { MechIcon, NodeTip, ScarabIcon } from '../components/tips.tsx';
import type { Strategy } from '../lib/types.ts';
import { evaluateStrategy, LAYER_LABEL, LAYERS, MAP_DEVICE_SLOTS, VERDICT_LABEL, type LayerBreakdown, type StrategyEvaluation, type StrategyLayer } from '../lib/strategy.ts';
import { fmtValue, pct } from '../lib/format.ts';
import { FATE_COLOR, FateBadge, Retention, StatusBadge } from '../components/ui.tsx';

const STORAGE_KEY = 'poe330.strategies.v1';

function loadCustom(): Strategy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const newId = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const evaluate = (s: Strategy) => evaluateStrategy(s, scarabsById, notablesByOldName, oldNotableMechanic);

// Layers are named, not colour-coded.
const LAYER_COLOR: Record<StrategyLayer, string> = { content: 'var(--title)', overlay: 'var(--title)', juice: 'var(--title)' };
const LAYER_HINT: Record<StrategyLayer, string> = {
  content: 'the mechanic you farm (Abyss, Essence, Delirium…)',
  overlay: 'stacked on top of any map (Maven, Exarch, Eater, Shaper/Elder…)',
  juice: 'generic monsters / map mods / rewards',
};

function LayerCards({ layers }: { layers: LayerBreakdown[] }) {
  if (!layers.length) return null;
  return (
    <div className="grid layer-cards" style={{ gridTemplateColumns: `repeat(${layers.length}, minmax(0, 1fr))`, marginBottom: 16 }}>
      {layers.map((l) => (
        <div key={l.layer} className="tile">
          <div className="label" style={{ color: LAYER_COLOR[l.layer] }}>
            {LAYER_LABEL[l.layer]}
          </div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            {LAYER_HINT[l.layer]}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontWeight: 600, marginBottom: 8 }}>
            {l.mechanics.map((m) => (
              <span key={m} className="with-icon" style={{ gap: 6 }}>
                <MechIcon mechanic={m} size={26} />
                {m}
              </span>
            ))}
            {!l.mechanics.length && '—'}
          </div>
          {l.slots > 0 ? <Retention value={l.scarabRetention} /> : <span className="small muted">no scarabs</span>}
          <div className="small muted" style={{ marginTop: 4 }}>
            {l.slots} scarab slot{l.slots === 1 ? '' : 's'}, {l.notables} notable{l.notables === 1 ? '' : 's'}
            {l.slots > 0 && l.coverage < 1 && `, ${pct(l.coverage)} measurable`}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Strategies({ focus, focusNonce }: { focus?: string; focusNonce?: number } = {}) {
  const [custom, setCustom] = useState<Strategy[]>(loadCustom);
  const [selectedId, setSelectedId] = useState<string>(PRESETS[0]?.id ?? '');
  const [mode, setMode] = useState<'edit' | 'compare'>('edit');
  // A search pick for an example strategy opens it.
  useFocusTarget(focus, focusNonce, (id) => {
    setSelectedId(id);
    setMode('edit');
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  }, [custom]);

  const all = useMemo(() => [...PRESETS.map((p) => ({ ...p, preset: true })), ...custom], [custom]);
  const selected = all.find((s) => s.id === selectedId) ?? all[0];

  const update = (next: Strategy) => setCustom((list) => list.map((s) => (s.id === next.id ? next : s)));
  const clone = (s: Strategy) => {
    track(`strategy/clone/${s.preset ? s.name : 'custom'}`);
    const copy: Strategy = { ...s, id: newId(), name: `${s.name} (copy)`, preset: false, scarabs: s.scarabs.map((x) => ({ ...x })), notables: [...s.notables] };
    setCustom((list) => [...list, copy]);
    setSelectedId(copy.id);
    setMode('edit');
  };
  const create = () => {
    track('strategy/new');
    const s: Strategy = { id: newId(), name: 'New strategy', scarabs: [], notables: [] };
    setCustom((list) => [...list, s]);
    setSelectedId(s.id);
    setMode('edit');
  };
  const remove = (id: string) => {
    track('strategy/delete');
    setCustom((list) => list.filter((s) => s.id !== id));
    setSelectedId(PRESETS[0]?.id ?? '');
  };

  return (
    <>
      <h2>Strategies</h2>
      <p className="lead">Enter a 3.29 farming setup to see how much of it 3.30 keeps. Your strategies are saved in this browser.</p>
      <div className="toolbar">
        <button className={`btn${mode === 'edit' ? ' primary' : ''}`} onClick={() => setMode('edit')}>
          Edit & evaluate
        </button>
        <button className={`btn${mode === 'compare' ? ' primary' : ''}`} onClick={() => {
            setMode('compare');
            track('strategy/compare');
          }}>
          Compare all ({all.length})
        </button>
        <button className="btn" onClick={create}>
          + New strategy
        </button>
      </div>

      {mode === 'compare' ? (
        <CompareTable
          strategies={all}
          onOpen={(id) => {
            setSelectedId(id);
            setMode('edit');
          }}
        />
      ) : (
        <div className="strat-layout">
          <div className="strat-list">
            <div className="small muted" style={{ marginBottom: 6 }}>
              Presets (examples)
            </div>
            {PRESETS.map((s) => (
              <button
                key={s.id}
                className={`btn${s.id === selected?.id ? ' active' : ''}`}
                onClick={() => {
                  setSelectedId(s.id);
                  track(`strategy/view/${s.name}`);
                }}
              >
                <StrategyIcon s={s} />
                {s.name}
              </button>
            ))}
            <div className="small muted" style={{ margin: '12px 0 6px' }}>
              Yours
            </div>
            {custom.length === 0 && <div className="small muted">None yet. Clone a preset or create a new one.</div>}
            {custom.map((s) => (
              <button
                key={s.id}
                className={`btn${s.id === selected?.id ? ' active' : ''}`}
                onClick={() => {
                  setSelectedId(s.id);
                  track('strategy/view/custom');
                }}
              >
                <StrategyIcon s={s} />
                {s.name}
              </button>
            ))}
            <ImportExport custom={custom} setCustom={setCustom} />
          </div>
          {selected && (
            <div>
              <Editor key={selected.id} strategy={selected} onChange={update} onClone={() => clone(selected)} onDelete={() => remove(selected.id)} />
              <EvaluationPanel ev={evaluate(selected)} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Editor({ strategy, onChange, onClone, onDelete }: { strategy: Strategy; onChange: (s: Strategy) => void; onClone: () => void; onDelete: () => void }) {
  const ro = !!strategy.preset;
  const [scarabQuery, setScarabQuery] = useState('');
  const [notableQuery, setNotableQuery] = useState('');
  // Scarabs not already in the strategy; 3.29 notables/keystones not already listed.
  const scarabEntries = useMemo(
    () => SEARCH_INDEX.filter((e) => e.kind === 'scarab' && !strategy.scarabs.some((x) => `scarab:${x.id}` === e.id)),
    [strategy.scarabs],
  );
  const notableEntries = useMemo(() => OLD_NOTABLE_ENTRIES.filter((e) => !strategy.notables.includes(e.label)), [strategy.notables]);
  const setCount = (id: string, count: number) => {
    const limit = scarabsById.get(id)?.limit ?? 1;
    const c = Math.max(0, Math.min(count, limit));
    onChange({ ...strategy, scarabs: c ? strategy.scarabs.map((s) => (s.id === id ? { ...s, count: c } : s)) : strategy.scarabs.filter((s) => s.id !== id) });
  };
  const addScarab = (id: string) => {
    if (strategy.scarabs.some((s) => s.id === id)) return;
    track(`strategy/add-scarab/${scarabsById.get(id)?.name ?? id}`);
    onChange({ ...strategy, scarabs: [...strategy.scarabs, { id, count: 1 }] });
    setScarabQuery('');
  };
  const addNotable = (name: string) => {
    if (!oldNotableNames.includes(name) || strategy.notables.includes(name)) return;
    track(`strategy/add-notable/${name}`);
    onChange({ ...strategy, notables: [...strategy.notables, name] });
    setNotableQuery('');
  };
  const slots = strategy.scarabs.reduce((a, s) => a + s.count, 0);

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="card-head">
        {ro ? (
          <h3 style={{ margin: 0 }}>{strategy.name}</h3>
        ) : (
          <input type="text" value={strategy.name} onChange={(e) => onChange({ ...strategy, name: e.target.value })} style={{ fontWeight: 600, minWidth: 280 }} />
        )}
        {ro && <span className="small muted">Example</span>}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onClone}>
          {ro ? 'Clone to edit' : 'Duplicate'}
        </button>
        {!ro && (
          <button className="btn danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
      {ro ? (
        strategy.description && <p className="muted small">{strategy.description}</p>
      ) : (
        <input
          type="text"
          placeholder="Description (optional)"
          value={strategy.description ?? ''}
          onChange={(e) => onChange({ ...strategy, description: e.target.value })}
          style={{ width: '100%', marginBottom: 10 }}
        />
      )}

      <div className="cols-2">
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            Scarabs ({slots}/{MAP_DEVICE_SLOTS} slots{slots > MAP_DEVICE_SLOTS ? ', over the usual map device limit' : ''})
          </div>
          <table className="rtable">
            <tbody>
              {strategy.scarabs.map(({ id, count }) => {
                const sc = scarabsById.get(id);
                if (!sc) return null;
                return (
                  <tr key={id}>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <ScarabIcon s={sc} size={34} />
                        <div>
                          <span className="item-name">{sc.name}</span>
                          <div className="small mod">{sc.description.join(' ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">
                      <span className="counter">
                        <button className="btn" disabled={ro} onClick={() => setCount(id, count - 1)}>
                          −
                        </button>
                        <b>{count}</b>
                        <button className="btn" disabled={ro || count >= sc.limit} onClick={() => setCount(id, count + 1)}>
                          +
                        </button>
                        <span className="small muted">/{sc.limit}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!ro && (
            <div className="toolbar" style={{ marginTop: 8 }}>
              <Autocomplete
                entries={scarabEntries}
                value={scarabQuery}
                onChange={setScarabQuery}
                onSelect={(h) => addScarab(h.entry.target.focus!)}
                placeholder="Add scarab… (type to search)"
              />
            </div>
          )}
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            3.29 Atlas notables / keystones used
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {strategy.notables.map((n) => (
              <span key={n} className="chip on">
                {oldNotableNode.get(n) && <NodeTip version="3.29" id={oldNotableNode.get(n)!.id} kind={oldNotableNode.get(n)!.kind} icon={oldNotableNode.get(n)!.icon} size={22} />}
                {n}
                {!ro && (
                  <a href="#" onClick={(e) => (e.preventDefault(), onChange({ ...strategy, notables: strategy.notables.filter((x) => x !== n) }))}>
                    ×
                  </a>
                )}
              </span>
            ))}
            {!strategy.notables.length && <span className="small muted">none</span>}
          </div>
          {!ro && (
            <div className="toolbar" style={{ marginTop: 8 }}>
              <Autocomplete
                entries={notableEntries}
                value={notableQuery}
                onChange={setNotableQuery}
                onSelect={(h) => addNotable(h.entry.label)}
                placeholder="Add 3.29 notable… (type to search)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvaluationPanel({ ev }: { ev: StrategyEvaluation }) {
  return (
    <div className="panel">
      <div className="card-head">
        <span className={`verdict v-${ev.verdict}`}>{VERDICT_LABEL[ev.verdict]}</span>
        <span className="muted">
          Keeps <b>{pct(ev.scarabRetention)}</b> of its scarab power ({pct(ev.coverage)} of the setup can be measured).
          {ev.threadSlots > 0 && ` ${ev.threadSlots} slot${ev.threadSlots === 1 ? ' now comes' : 's now come'} from Threads.`}
          {ev.removedSlots > 0 && ` ${ev.removedSlots} slot${ev.removedSlots === 1 ? ' is' : 's are'} gone entirely.`}
        </span>
      </div>
      <div style={{ maxWidth: 420, marginBottom: 14 }}>
        <Retention value={ev.scarabRetention} />
      </div>
      <LayerCards layers={ev.layers} />

      <h3>Scarabs</h3>
      <table className="rtable">
        <thead>
          <tr>
            <th>Scarab</th>
            <th>Effect</th>
            <th className="num">Your scarab power</th>
            <th className="num">3.29 best → 3.30</th>
            <th style={{ width: 150 }}>Kept</th>
            <th>Fate</th>
          </tr>
        </thead>
        <tbody>
          {LAYERS.flatMap((layer) => {
            const rows = ev.scarabs.filter((r) => r.layer === layer);
            if (!rows.length) return [];
            return [
              <tr key={`h-${layer}`} className="group-row">
                <td colSpan={6} style={{ color: LAYER_COLOR[layer] }}>
                  {LAYER_LABEL[layer]}
                </td>
              </tr>,
              ...rows.flatMap((row) =>
            row.effects.map((e, i) => (
              <tr key={`${row.scarab.id}-${i}`}>
                <td>
                  {i === 0 && (
                    <span className="with-icon">
                      <ScarabIcon s={row.scarab} size={30} />
                      <span>
                        <span className="item-name">{row.scarab.name}</span> ×{row.count}
                      </span>
                    </span>
                  )}
                </td>
                <td className="small full" data-label="Effect">
                  <i className="sw" style={{ background: FATE_COLOR[e.fate] }} />
                  {e.label}
                </td>
                <td className="num" data-label="Your scarab power">{e.unit === 'binary' || e.unit === 'content' ? '—' : fmtValue(e.scarabPower, e.unit)}</td>
                <td className="num" data-label="3.29 best → 3.30">
                  {e.fate === 'thread' ? 'via Threads' : e.retention == null ? '—' : `${fmtValue(e.before, e.unit)} → ${fmtValue(e.after, e.unit, e.surpassing)}`}
                </td>
                <td data-label="Kept">{e.fate === 'thread' ? <span className="small muted">needs Threads</span> : <Retention value={e.retention} />}</td>
                <td data-label="Fate">
                  <FateBadge fate={e.fate} short />
                </td>
              </tr>
            )),
              ),
            ];
          })}
        </tbody>
      </table>
      {!ev.scarabs.length && <p className="muted small">No scarabs in this strategy.</p>}

      <h3 style={{ marginTop: 18 }}>
        Notables{' '}
        <span className="small muted">
          {ev.notableCounts.kept} kept, {ev.notableCounts.changed} reworked, {ev.notableCounts.removed} removed
        </span>
      </h3>
      <table className="rtable">
        <tbody>
          {LAYERS.map((layer) => {
            const rows = ev.notables.filter((n) => n.layer === layer);
            if (!rows.length) return null;
            return (
              <Fragment key={layer}>
                <tr className="group-row">
                  <td colSpan={3} style={{ color: LAYER_COLOR[layer] }}>
                    {LAYER_LABEL[layer]}
                  </td>
                </tr>
          {rows.map((n) => (
            <tr key={n.name}>
              <td>
                <span className="with-icon">
                  {oldNotableNode.get(n.name) && <NodeTip version="3.29" id={oldNotableNode.get(n.name)!.id} kind={oldNotableNode.get(n.name)!.kind} icon={oldNotableNode.get(n.name)!.icon} size={36} />}
                  <span>
                    <b>{n.name}</b>
                    <div className="small muted">{n.mechanic}</div>
                  </span>
                </span>
              </td>
              <td>{n.status === 'unknown' ? <span className="muted">not found</span> : <StatusBadge status={n.status} />}</td>
              <td className="small">
                {n.successors.length > 0 && <span>→ {n.successors.join(', ')}</span>}
                {n.note && <div className="note">{n.note}</div>}
              </td>
            </tr>
          ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {!ev.notables.length && <p className="muted small">No notables listed.</p>}
    </div>
  );
}

function CompareTable({ strategies, onOpen }: { strategies: Strategy[]; onOpen: (id: string) => void }) {
  const rows = strategies
    .map((s) => ({ s, ev: evaluate(s) }))
    .sort((a, b) => (a.ev.scarabRetention ?? 9) - (b.ev.scarabRetention ?? 9));
  return (
    <div className="panel">
      <table className="rtable">
        <thead>
          <tr>
            <th>Strategy</th>
            <th style={{ width: 180 }}>Scarab power kept</th>
            {LAYERS.map((l) => (
              <th key={l} style={{ width: 150, color: LAYER_COLOR[l] }}>
                {LAYER_LABEL[l]}
              </th>
            ))}
            <th className="num">Quantifiable</th>
            <th className="num">Thread slots</th>
            <th className="num">Removed slots</th>
            <th>Notables kept / changed / removed</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ s, ev }) => (
            <tr key={s.id} className="clickable" onClick={() => onOpen(s.id)}>
              <td>
                <span className="with-icon">
                  <StrategyIcon s={s} size={30} />
                  <b>{s.name}</b>
                </span>{' '}
                {s.preset && <span className="small muted">preset</span>}
                <div className="icon-strip" style={{ marginTop: 4 }}>
                  {s.scarabs.flatMap((x) => {
                    const sc = scarabsById.get(x.id);
                    return sc ? Array.from({ length: x.count }, (_, i) => <ScarabIcon key={`${x.id}-${i}`} s={sc} size={24} underline />) : [];
                  })}
                </div>
              </td>
              <td data-label="Scarab power kept">
                <Retention value={ev.scarabRetention} />
              </td>
              {LAYERS.map((l) => {
                const lb = ev.layers.find((x) => x.layer === l);
                return (
                  <td key={l} className="small" data-label={LAYER_LABEL[l]}>
                    {lb ? (
                      <>
                        <div>{lb.mechanics.join(', ')}</div>
                        {lb.slots > 0 && <Retention value={lb.scarabRetention} />}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                );
              })}
              <td className="num" data-label="Quantifiable">{pct(ev.coverage)}</td>
              <td className="num" data-label="Thread slots">{ev.threadSlots}</td>
              <td className="num" data-label="Removed slots">{ev.removedSlots}</td>
              <td data-label="Notables kept / changed / removed">
                <span className="s-added">{ev.notableCounts.kept}</span> / <span className="s-changed">{ev.notableCounts.changed}</span> /{' '}
                <span className="s-removed">{ev.notableCounts.removed}</span>
              </td>
              <td data-label="Verdict">
                <span className={`v-${ev.verdict}`}>{VERDICT_LABEL[ev.verdict]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportExport({ custom, setCustom }: { custom: Strategy[]; setCustom: (s: Strategy[]) => void }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const doImport = () => {
    try {
      const parsed = JSON.parse(text) as Strategy[];
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of strategies');
      const valid = parsed.filter((s) => s && typeof s.name === 'string' && Array.isArray(s.scarabs) && Array.isArray(s.notables));
      setCustom([...custom, ...valid.map((s) => ({ ...s, id: newId(), preset: false }))]);
      setMsg(`Imported ${valid.length} strateg${valid.length === 1 ? 'y' : 'ies'}.`);
      track('strategy/import');
      setText('');
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };
  return (
    <details style={{ marginTop: 16 }}>
      <summary className="small">Import / export</summary>
      <div style={{ marginTop: 8 }}>
        <button
          className="btn"
          onClick={() => {
            setText(JSON.stringify(custom, null, 2));
            track('strategy/export');
          }}
        >
          Export mine
        </button>
        <textarea rows={8} style={{ width: '100%', marginTop: 6 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste exported JSON here…" />
        <button className="btn" onClick={doImport} disabled={!text.trim()}>
          Import
        </button>
        {msg && <div className="small muted">{msg}</div>}
      </div>
    </details>
  );
}

function StrategyIcon({ s, size = 22 }: { s: Strategy; size?: number }) {
  const m = strategyMechanic(s);
  return m ? <MechanicIcon mechanic={m} size={size} /> : <span style={{ width: size }} />;
}
