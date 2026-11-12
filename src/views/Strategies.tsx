import { Fragment, useEffect, useMemo, useState } from 'react';
import { data, notablesByOldName, oldNotableMechanic, oldNotableNames, oldNotableNode, PRESETS, scarabsById, strategyMechanic } from '../data.ts';
import { MechanicIcon } from '../components/art.tsx';
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

const LAYER_COLOR: Record<StrategyLayer, string> = { content: '#d9a54f', overlay: '#e06a9f', juice: '#4fb3d9' };
const LAYER_HINT: Record<StrategyLayer, string> = {
  content: 'the mechanic you farm (Abyss, Essence, Delirium…)',
  overlay: 'stacked on top of any map (Maven, Exarch, Eater, Shaper/Elder…)',
  juice: 'generic monsters / map mods / rewards',
};

function LayerCards({ layers }: { layers: LayerBreakdown[] }) {
  if (!layers.length) return null;
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${layers.length}, minmax(0, 1fr))`, marginBottom: 16 }}>
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
            {l.slots} scarab slot{l.slots === 1 ? '' : 's'} · {l.notables} notable{l.notables === 1 ? '' : 's'}
            {l.slots > 0 && l.coverage < 1 && ` · ${pct(l.coverage)} quantifiable`}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Strategies() {
  const [custom, setCustom] = useState<Strategy[]>(loadCustom);
  const [selectedId, setSelectedId] = useState<string>(PRESETS[0]?.id ?? '');
  const [mode, setMode] = useState<'edit' | 'compare'>('edit');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  }, [custom]);

  const all = useMemo(() => [...PRESETS.map((p) => ({ ...p, preset: true })), ...custom], [custom]);
  const selected = all.find((s) => s.id === selectedId) ?? all[0];

  const update = (next: Strategy) => setCustom((list) => list.map((s) => (s.id === next.id ? next : s)));
  const clone = (s: Strategy) => {
    const copy: Strategy = { ...s, id: newId(), name: `${s.name} (copy)`, preset: false, scarabs: s.scarabs.map((x) => ({ ...x })), notables: [...s.notables] };
    setCustom((list) => [...list, copy]);
    setSelectedId(copy.id);
    setMode('edit');
  };
  const create = () => {
    const s: Strategy = { id: newId(), name: 'New strategy', scarabs: [], notables: [] };
    setCustom((list) => [...list, s]);
    setSelectedId(s.id);
    setMode('edit');
  };
  const remove = (id: string) => {
    setCustom((list) => list.filter((s) => s.id !== id));
    setSelectedId(PRESETS[0]?.id ?? '');
  };

  return (
    <>
      <h2>Strategies</h2>
      <p className="lead">
        Describe a 3.29 farming setup (scarabs + the Atlas notables it relied on) to see how much of it carries over to 3.30. Scarab power is
        re-evaluated for the counts you use, not the limit: best case 3.29 (full tree + your scarabs) vs 3.30 (full tree). Scarabs replaced by
        Threads, or only kept as a chance, are listed but not scored. Your strategies are saved in this browser.
      </p>
      <div className="toolbar">
        <button className={`btn${mode === 'edit' ? ' primary' : ''}`} onClick={() => setMode('edit')}>
          Edit & evaluate
        </button>
        <button className={`btn${mode === 'compare' ? ' primary' : ''}`} onClick={() => setMode('compare')}>
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
              <button key={s.id} className={`btn${s.id === selected?.id ? ' active' : ''}`} onClick={() => setSelectedId(s.id)}>
                <StrategyIcon s={s} />
                {s.name}
              </button>
            ))}
            <div className="small muted" style={{ margin: '12px 0 6px' }}>
              Yours
            </div>
            {custom.length === 0 && <div className="small muted">None yet. Clone a preset or create a new one.</div>}
            {custom.map((s) => (
              <button key={s.id} className={`btn${s.id === selected?.id ? ' active' : ''}`} onClick={() => setSelectedId(s.id)}>
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
  const [pick, setPick] = useState('');
  const [notable, setNotable] = useState('');
  const families = useMemo(() => {
    const map = new Map<string, typeof data.scarabs>();
    for (const s of data.scarabs) map.set(s.mechanic, [...(map.get(s.mechanic) ?? []), s]);
    return [...map];
  }, []);
  const setCount = (id: string, count: number) => {
    const limit = scarabsById.get(id)?.limit ?? 1;
    const c = Math.max(0, Math.min(count, limit));
    onChange({ ...strategy, scarabs: c ? strategy.scarabs.map((s) => (s.id === id ? { ...s, count: c } : s)) : strategy.scarabs.filter((s) => s.id !== id) });
  };
  const addScarab = () => {
    if (!pick || strategy.scarabs.some((s) => s.id === pick)) return;
    onChange({ ...strategy, scarabs: [...strategy.scarabs, { id: pick, count: 1 }] });
    setPick('');
  };
  const addNotable = () => {
    if (!oldNotableNames.includes(notable) || strategy.notables.includes(notable)) return;
    onChange({ ...strategy, notables: [...strategy.notables, notable] });
    setNotable('');
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
        {ro && <span className="badge" style={{ color: 'var(--muted)' }}>preset</span>}
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
          <table>
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
                          <div className="small mod">{sc.description.join(' · ')}</div>
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
              <select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Add scarab…</option>
                {families.map(([mech, list]) => (
                  <optgroup key={mech} label={mech}>
                    {list.map((s) => (
                      <option key={s.id} value={s.id} disabled={strategy.scarabs.some((x) => x.id === s.id)}>
                        {s.name} (limit {s.limit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button className="btn" onClick={addScarab} disabled={!pick}>
                Add
              </button>
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
              <input type="text" list="old-notables" placeholder="Add 3.29 notable…" value={notable} onChange={(e) => setNotable(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNotable()} />
              <datalist id="old-notables">
                {oldNotableNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <button className="btn" onClick={addNotable} disabled={!oldNotableNames.includes(notable)}>
                Add
              </button>
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
          scarab power kept: <b>{pct(ev.scarabRetention)}</b> · {pct(ev.coverage)} of the scarab setup is quantifiable
          {ev.threadSlots > 0 && ` · ${ev.threadSlots} slot(s) now come from Threads`}
          {ev.removedSlots > 0 && ` · ${ev.removedSlots} slot(s) removed outright`}
        </span>
      </div>
      <div style={{ maxWidth: 420, marginBottom: 14 }}>
        <Retention value={ev.scarabRetention} />
      </div>
      <LayerCards layers={ev.layers} />

      <h3>Scarabs</h3>
      <table>
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
                <td className="small">
                  <span style={{ color: FATE_COLOR[e.fate] }}>●</span> {e.label}
                </td>
                <td className="num">{e.unit === 'binary' || e.unit === 'content' ? '—' : fmtValue(e.scarabPower, e.unit)}</td>
                <td className="num">
                  {e.fate === 'thread' ? 'via Threads' : e.retention == null ? '—' : `${fmtValue(e.before, e.unit)} → ${fmtValue(e.after, e.unit, e.surpassing)}`}
                </td>
                <td>{e.fate === 'thread' ? <span className="small muted">needs Threads</span> : <Retention value={e.retention} />}</td>
                <td>
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
          {ev.notableCounts.kept} kept · {ev.notableCounts.changed} changed/replaced · {ev.notableCounts.removed} removed
        </span>
      </h3>
      <table>
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
      <table>
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
              <td>
                <Retention value={ev.scarabRetention} />
              </td>
              {LAYERS.map((l) => {
                const lb = ev.layers.find((x) => x.layer === l);
                return (
                  <td key={l} className="small">
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
              <td className="num">{pct(ev.coverage)}</td>
              <td className="num">{ev.threadSlots}</td>
              <td className="num">{ev.removedSlots}</td>
              <td>
                <span className="s-added">{ev.notableCounts.kept}</span> / <span className="s-changed">{ev.notableCounts.changed}</span> /{' '}
                <span className="s-removed">{ev.notableCounts.removed}</span>
              </td>
              <td>
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
      setText('');
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };
  return (
    <details style={{ marginTop: 16 }}>
      <summary className="small">Import / export</summary>
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => setText(JSON.stringify(custom, null, 2))}>
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
