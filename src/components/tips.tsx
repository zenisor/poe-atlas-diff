/**
 * Icons with PoE-style hover tooltips (scarabs, atlas nodes, mechanics),
 * built on the raw sprite components in art.tsx and the shared tooltip layer.
 */
import { data, effectByTemplate, lineStacks, mapNodeById, mechanicSummary, notableDiffByNodeId, relatedScarabsByNode, scarabLinksByNode, scarabsByName, type ScarabLink } from '../data.ts';
import type { MapNode, MatchedContribution, NodeKind, NotableDiff, ScarabResult, Version } from '../lib/types.ts';
import { FATE_LABEL } from '../lib/scarabs.ts';
import { CATEGORY_LABEL, CATEGORY_NOTE, categoryOf } from '../lib/mechanics.ts';
import { fmtValue, likeText, pct, prettyTemplate, signedPct, surpass, surpassLong, trimNum, withValue } from '../lib/format.ts';
import { toTemplate } from '../lib/stats.ts';
import { CATEGORY_COLOR, FATE_COLOR, FateBadge, FATES, Retention, STATUS_LABEL, StatList, StatusBadge } from './ui.tsx';
import { ItemIcon, MechanicIcon, NodeIcon } from './art.tsx';
import { Tip } from './tooltip.tsx';
import { trackOnce } from '../lib/analytics.ts';

const Sep = () => <div className="sep" />;

// ---------------- scarabs ----------------

function nodeList(list: MatchedContribution[], version: Version, unit: string) {
  const byName = new Map<string, { c: MatchedContribution; n: number; sum: number }>();
  for (const c of list) {
    const e = byName.get(c.nodeName);
    if (e) {
      e.n++;
      e.sum += c.value;
    } else byName.set(c.nodeName, { c, n: 1, sum: c.value });
  }
  const nodes = version === '3.30' ? mapNodeById.new : mapNodeById.old;
  return (
    <div className="pt-nodes">
      {[...byName.values()].slice(0, 6).map(({ c, n, sum }) => (
        <div key={c.nodeName} className="with-icon" style={{ gap: 6 }}>
          <NodeIcon version={version} kind={c.kind} icon={nodes.get(c.nodeId)?.icon ?? ''} size={c.kind === 'small' ? 20 : 26} />
          <span>
            <b>{c.nodeName}</b>
            {n > 1 && ` ×${n}`}
            <span className="muted"> → {fmtValue(sum, unit, c.surpassing)}</span>
            {c.choice && <span className="muted"> (choice)</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ScarabTooltip({ s }: { s: ScarabResult }) {
  return (
    <>
      <div className="pt-head currency">
        <ItemIcon name={s.name} size={30} />
        <span>{s.name}</span>
      </div>
      <div className="pt-body">
        <div className="pt-center">
          <span className="muted">Limit</span> <b>{s.limit}</b>
          <span className="muted">, </span>
          {s.mechanics.join(', ')}
        </div>
        <Sep />
        <div className="pt-center mod">
          {s.description.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <Sep />
        <div className="pt-center" style={{ marginBottom: 6 }}>
          <span className="muted">In 3.30: </span>
          <FateBadge fate={s.fate} />
          {s.retention != null && <div className="muted">Keeps {pct(s.retention)} of the 3.29 best case</div>}
        </div>
        {s.effects.map((e, i) => (
          <div key={i} className="pt-eff">
            <div>
              <i className="sw" style={{ background: FATE_COLOR[e.fate] }} />
              <b>{e.label}</b>: <span style={{ color: FATE_COLOR[e.fate] }}>{FATE_LABEL[e.fate].toLowerCase()}</span>
            </div>
            {e.fate === 'thread' && (
              <div className="with-icon" style={{ gap: 6, marginTop: 3 }}>
                <ItemIcon name={`${s.mechanic} Thread`} size={22} fallbackMechanic={s.mechanic} />
                <span style={{ color: 'var(--f-thread)' }}>Now from {s.mechanic} Threads</span>
              </div>
            )}
            {e.retention != null && e.unit !== 'binary' && (
              <div className="small" style={{ marginTop: 3 }}>
                <span className="muted">Max power</span> {fmtValue(e.scarabMax, e.unit)}
                {e.stacks && s.limit > 1 && <span className="muted"> ({fmtValue(e.perScarab, e.unit)} × {s.limit})</span>}
                <br />
                <span className="muted">Best case</span> {fmtValue(e.before, e.unit)} → <b>{fmtValue(e.after, e.unit, e.surpassing)}</b>
                <div style={{ maxWidth: 240, marginTop: 3 }}>
                  <Retention value={e.retention} />
                </div>
              </div>
            )}
            {e.retention == null && e.fate !== 'thread' && e.treeUnit && e.treeUnit !== 'see nodes' && (
              <div className="small muted">3.30 tree: {fmtValue(e.tree330, e.treeUnit)}</div>
            )}
            {e.matches330.length > 0 && nodeList(e.matches330, '3.30', e.unit)}
            {e.note && <div className="note">{e.note}</div>}
          </div>
        ))}
        {s.related.length > 0 && (
          <div className="pt-eff">
            <div className="small muted">Related on the 3.30 tree (not counted):</div>
            {s.related.map((r) => {
              const n = mapNodeById.new.get(r.nodeId);
              return (
                <div key={r.nodeId} className="with-icon small" style={{ gap: 6, marginTop: 3, alignItems: 'flex-start' }}>
                  {n && <NodeIcon version="3.30" kind={n.kind} icon={n.icon} size={24} />}
                  <span>
                    <b>{r.nodeName}</b> <span className="muted">{r.note}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/** A scarab's inventory icon with its tooltip. Pass `underline` to show its fate as a coloured bar. */
export function ScarabIcon({ s, name, size = 36, underline = false }: { s?: ScarabResult; name?: string; size?: number; underline?: boolean }) {
  const scarab = s ?? (name ? scarabsByName.get(name) : undefined);
  if (!scarab) return <ItemIcon name={name ?? ''} size={size} />;
  return (
    <Tip
      content={() => {
        trackOnce(`tooltip/scarab/${scarab.name}`);
        return <ScarabTooltip s={scarab} />;
      }}
    >
      <span style={underline ? { borderBottom: `3px solid ${FATE_COLOR[scarab.fate]}`, lineHeight: 0, paddingBottom: 1, display: 'inline-block' } : { lineHeight: 0, display: 'inline-block' }}>
        <ItemIcon name={scarab.name} size={size} />
      </span>
    </Tip>
  );
}

// ---------------- atlas nodes ----------------

function diffSummary(d: NotableDiff, side: 'old' | 'new', name: string) {
  const others = (side === 'old' ? d.new : d.old).map((r) => r.name).filter((n) => n !== name);
  const numeric = d.changes.filter((c) => c.old != null && c.new != null);
  return (
    <>
      <div className="pt-center">
        <StatusBadge status={d.status} />
        {others.length > 0 && (
          <span className="muted">
            {' '}
            {side === 'old' ? '→ ' : '← '}
            {others.join(', ')}
          </span>
        )}
      </div>
      {numeric.length > 0 && (
        <div className="small" style={{ marginTop: 4 }}>
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
      {d.similar && <div className="small muted">closest {d.status === 'removed' ? 'new' : 'old'} notable: {d.similar.name}</div>}
      {d.note && <div className="note">{d.note}</div>}
    </>
  );
}

/**
 * For stat lines that several nodes share: the value of taking all of them,
 * plus the same effect's max on the other tree.
 */
function StackInfo({ node, version }: { node: MapNode; version: Version }) {
  const side = version === '3.29' ? 'old' : 'new';
  const otherSide = side === 'old' ? 'new' : 'old';
  const otherVersion = side === 'old' ? '3.30' : '3.29';
  const rows = node.stats
    .map((text) => ({ text, stack: lineStacks[side].get(toTemplate(text)), effect: effectByTemplate[side].get(toTemplate(text)) }))
    .filter((r) => r.stack && (r.stack.count > 1 || r.stack.choiceBonus > 0));
  if (!rows.length) return null;
  return (
    <>
      <Sep />
      {rows.map(({ text, stack, effect }) => {
        const s = stack!;
        const other = effect?.[otherSide];
        const linked = effect?.key.startsWith('link:');
        return (
          <div key={text} className="pt-eff small">
            <div className="muted">
              Stacks: <b style={{ color: 'var(--text)' }}>×{s.count}</b> on the {version} tree{s.choiceBonus > 0 && ' (+ a choice notable)'}
            </div>
            <div className="mod">
              Max: <span className="num-hl">{withValue(text, s.total)}</span>
            </div>
            {s.surpassing && (
              <div>
                <span className="muted">= </span>
                <b>{surpassLong(s.total)}</b>
                {s.choiceBonus > 0 && <div className="muted">with the choice notable: {surpassLong(s.total + s.choiceBonus)}</div>}
              </div>
            )}
            {!s.surpassing && s.choiceBonus > 0 && <div className="muted">{likeText(text, s.total + s.choiceBonus)} with the choice notable</div>}
            {effect && (
              <div className="muted">
                {otherVersion} {linked ? 'equivalent' : 'max'}:{' '}
                {other ? (
                  <b style={{ color: 'var(--text)' }}>{other.surpassing ? `${trimNum(other.totalWithChoices / 100)} expected (${surpass(other.totalWithChoices)})` : likeText(other.contributions[0]?.text ?? text, other.totalWithChoices)}</b>
                ) : (
                  'not on the tree'
                )}
                {effect.deltaPct != null && effect.deltaPct !== 0 && (
                  <span className={effect.status === 'nerfed' ? 's-nerfed' : 's-buffed'}> ({signedPct(side === 'new' ? effect.deltaPct : -effect.deltaPct)} {side === 'new' ? 'vs 3.29' : 'in 3.30'})</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** "This node took over (part of) these scarabs" — with each scarab's 3.29 → 3.30 numbers. */
export function ScarabLinks({ links, compact = false }: { links: ScarabLink[]; compact?: boolean }) {
  return (
    <div className="scarab-links">
      {links.map(({ scarab, effect }) => (
        <div key={scarab.id + effect.label} className="with-icon" style={{ gap: 8, alignItems: 'flex-start' }}>
          <ScarabIcon s={scarab} size={compact ? 26 : 32} />
          <div className="small">
            <span className="item-name">{scarab.name}</span>
            {!compact && <span className="muted">: {effect.label.toLowerCase()}</span>}
            <div>
              <span style={{ color: FATE_COLOR[effect.fate] }}>{FATE_LABEL[effect.fate]}</span>
              {effect.retention != null && effect.unit !== 'binary' && (
                <span className="muted">
                  {' '}
                  , {fmtValue(effect.before, effect.unit)} → {fmtValue(effect.after, effect.unit, effect.surpassing)} ({pct(effect.retention)})
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Scarabs this node resembles but isn't counted in (curated "related" links). */
export function RelatedScarabs({ nodeId }: { nodeId: string }) {
  const rel = relatedScarabsByNode.get(nodeId);
  if (!rel) return null;
  return (
    <div className="scarab-links">
      {rel.map(({ scarab, note }) => (
        <div key={scarab.id} className="with-icon" style={{ gap: 8, alignItems: 'flex-start' }}>
          <ScarabIcon s={scarab} size={26} />
          <div className="small">
            <span className="item-name">{scarab.name}</span> <span className="muted">(related, not counted)</span>
            <div className="muted">{note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NodeTooltip({ node, version }: { node: MapNode; version: Version }) {
  const side = version === '3.29' ? 'old' : 'new';
  const diff = notableDiffByNodeId[side].get(node.id);
  return (
    <>
      <div className={`pt-head ${node.kind}`}>
        <NodeIcon version={version} kind={node.kind} icon={node.icon} size={node.kind === 'small' ? 26 : 34} />
        <span>{node.name}</span>
      </div>
      <div className="pt-body">
        <div className="pt-center small muted">
          {node.kind === 'small' ? 'Node' : node.kind === 'keystone' ? 'Keystone' : 'Notable'} on the {version} tree, {node.mechanic}
        </div>
        <Sep />
        <div className="pt-center">
          <StatList stats={node.stats} variants={node.variants} />
        </div>
        <StackInfo node={node} version={version} />
        {version === '3.30' && scarabLinksByNode.get(node.id) && (
          <>
            <Sep />
            <div className="pt-center small" style={{ color: 'var(--item)', marginBottom: 4 }}>
              Took over a scarab effect
            </div>
            <ScarabLinks links={scarabLinksByNode.get(node.id)!} />
          </>
        )}
        {version === '3.30' && relatedScarabsByNode.get(node.id) && (
          <>
            <Sep />
            <RelatedScarabs nodeId={node.id} />
          </>
        )}
        <Sep />
        {diff ? (
          diffSummary(diff, side, node.name)
        ) : (
          <div className="pt-center small">
            <span className={`s-${node.status}`}>{STATUS_LABEL[node.status]}</span>
            <span className="muted"> {node.status === 'unchanged' ? 'compared with the other tree' : 'vs. the same effect on the other tree'}</span>
          </div>
        )}
      </div>
    </>
  );
}

/** Atlas node art with its tooltip; looks the node up by id (or by name for 3.29 notables). */
export function NodeTip({ version, id, kind, icon, size }: { version: Version; id: string; kind: NodeKind; icon: string; size: number }) {
  const node = (version === '3.29' ? mapNodeById.old : mapNodeById.new).get(id);
  const art = <NodeIcon version={version} kind={kind} icon={icon} size={size} />;
  if (!node) return art;
  return <Tip content={() => <NodeTooltip node={node} version={version} />}>{art}</Tip>;
}

// ---------------- mechanics ----------------

export function MechanicTooltip({ mechanic }: { mechanic: string }) {
  const m = mechanicSummary.get(mechanic);
  const cat = categoryOf(mechanic);
  const scarabs = data.scarabs.filter((s) => s.mechanics.includes(mechanic));
  const total = (s: { small: number; notable: number; keystone: number }) => s.small + s.notable + s.keystone;
  return (
    <>
      <div className="pt-head">
        <MechanicIcon mechanic={mechanic} size={34} />
        <span>{mechanic}</span>
      </div>
      <div className="pt-body">
        <div className="pt-center small" style={{ color: CATEGORY_COLOR[cat] }}>
          {CATEGORY_LABEL[cat]}
        </div>
        <div className="pt-center small muted">{CATEGORY_NOTE[cat]}</div>
        {m && (
          <>
            <Sep />
            <div className="small">
              <div>
                <span className="muted">Nodes</span> {total(m.old)} → {total(m.new)}
              </div>
              <div>
                <span className="muted">Notables</span> <span className="s-added">+{m.notables.added}</span> <span className="s-removed">−{m.notables.removed}</span>{' '}
                <span className="s-changed">~{m.notables.replaced + m.notables.changed + m.notables.mixed}</span>{' '}
                <span className="s-buffed">↑{m.notables.buffed}</span> <span className="s-nerfed">↓{m.notables.nerfed}</span>
              </div>
              <div>
                <span className="muted">Effects</span> <span className="s-buffed">{m.effects.buffed}↑</span> <span className="s-nerfed">{m.effects.nerfed}↓</span>{' '}
                <span className="s-added">+{m.effects.added}</span> <span className="s-removed">−{m.effects.removed}</span>
              </div>
            </div>
          </>
        )}
        {scarabs.length > 0 && (
          <>
            <Sep />
            <div className="icon-strip" style={{ justifyContent: 'center' }}>
              {[...scarabs]
                .sort((a, b) => FATES.indexOf(a.fate) - FATES.indexOf(b.fate))
                .map((s) => (
                  <span key={s.id} style={{ borderBottom: `3px solid ${FATE_COLOR[s.fate]}`, lineHeight: 0 }}>
                    <ItemIcon name={s.name} size={26} />
                  </span>
                ))}
            </div>
            <div className="pt-center small muted" style={{ marginTop: 4 }}>
              {FATES.filter((f) => scarabs.some((s) => s.fate === f))
                .map((f) => `${scarabs.filter((s) => s.fate === f).length} ${FATE_LABEL[f].toLowerCase()}`)
                .join(', ')}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Mechanic art with a summary tooltip. */
export function MechIcon({ mechanic, size = 24 }: { mechanic: string; size?: number }) {
  return (
    <Tip content={() => <MechanicTooltip mechanic={mechanic} />}>
      <MechanicIcon mechanic={mechanic} size={size} />
    </Tip>
  );
}
