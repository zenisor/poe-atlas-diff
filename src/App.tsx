import { useEffect, useState } from 'react';
import { data } from './data.ts';
import { Overview } from './views/Overview.tsx';
import { MechanicView } from './views/Mechanic.tsx';
import { TreeMap } from './views/TreeMap.tsx';
import { Notables } from './views/Notables.tsx';
import { Effects } from './views/Effects.tsx';
import { Scarabs } from './views/Scarabs.tsx';
import { Strategies } from './views/Strategies.tsx';
import { MechanicIcon } from './components/art.tsx';
import { MechanicSidebar } from './components/sidebar.tsx';
import { TooltipLayer } from './components/tooltip.tsx';
import type { CSSProperties } from 'react';
import { REPO_URL, REPORT_URL } from './links.ts';
import { Autocomplete } from './components/Autocomplete.tsx';
import { SEARCH_INDEX } from './searchIndex.ts';
import type { SearchHit } from './lib/search.ts';
import { track } from './lib/analytics.ts';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'mechanic', label: 'By mechanic' },
  { id: 'scarabs', label: 'Scarab fates' },
  { id: 'notables', label: 'Notables & keystones' },
  { id: 'effects', label: 'All tree effects' },
  { id: 'map', label: 'Tree map' },
  { id: 'strategies', label: 'Strategies' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

const countBy = <T,>(list: T[], has: (t: T, m: string) => boolean) => (m: string) => list.filter((t) => has(t, m)).length;
/** What the sidebar numbers mean on each list page. */
const SIDEBAR_COUNT = {
  scarabs: { label: 'scarabs', count: countBy(data.scarabs, (s, m) => s.mechanics.includes(m)) },
  notables: { label: 'changed notables', count: countBy(data.notables, (n, m) => n.mechanic === m && n.status !== 'unchanged') },
  effects: { label: 'changed effects', count: countBy(data.effects, (e, m) => e.mechanic === m && e.status !== 'unchanged') },
  map: {
    label: 'changed 3.30 nodes',
    count: countBy(data.nodes.new, (n, m) => n.mechanic === m && n.status !== 'unchanged' && (n.kind === 'small' || n.kind === 'notable' || n.kind === 'keystone')),
  },
};

/**
 * Absolute URL on purpose: the variable is consumed inside the built stylesheet
 * (assets/*.css), where a relative url() would resolve against assets/.
 */
const ATLAS_BG = new URL(data.art.atlas['3.30'].background, document.baseURI).href;

/** Routes look like #/<tab>/<mechanic>?focus=<item>; focus = what a search result points at. */
function readHash(): { tab: TabId; mechanic: string; focus: string } {
  const [path, query] = window.location.hash.replace(/^#\/?/, '').split('?');
  const [tab, mech] = path.split('/');
  const valid = TABS.some((t) => t.id === tab) ? (tab as TabId) : 'overview';
  return { tab: valid, mechanic: mech ? decodeURIComponent(mech) : '', focus: new URLSearchParams(query ?? '').get('focus') ?? '' };
}

function hashFor(tab: string, mechanic?: string, focus?: string): string {
  return `#/${tab}${mechanic ? '/' + encodeURIComponent(mechanic) : ''}${focus ? '?focus=' + encodeURIComponent(focus) : ''}`;
}

export function App() {
  const [{ tab, mechanic, focus }, setRoute] = useState(readHash);
  // Bumped on every search pick so re-selecting the same item still scrolls to it.
  const [focusNonce, setFocusNonce] = useState(0);
  const [globalQuery, setGlobalQuery] = useState('');

  // New page (or a different mechanic page) starts at the top; filter changes on the same tab keep the scroll.
  const pageKey = tab === 'mechanic' ? `${tab}/${mechanic}` : tab;
  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
    window.scrollTo(0, 0);
  }, [pageKey]);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (nextTab: TabId, nextMech = mechanic) => {
    window.location.hash = hashFor(nextTab, nextMech);
  };

  const openHit = (hit: SearchHit) => {
    const { tab: t, mechanic: m, focus: f } = hit.entry.target;
    const next = hashFor(t, m, f);
    if (window.location.hash !== next) window.location.hash = next;
    setFocusNonce((n) => n + 1);
    setGlobalQuery('');
    track(`search/global/${hit.entry.kind}/${hit.entry.label}`);
  };
  const focusProps = { focus, focusNonce };

  return (
    <div className="app" style={{ '--atlas-bg': `url(${ATLAS_BG})` } as CSSProperties}>
      <header className="topbar">
        <div className="brand">
          <MechanicIcon mechanic="Maps" size={30} />
          Atlas {data.meta.old.version} → {data.meta.new.version}
          <small>scarab rework diff</small>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => go(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <Autocomplete
          className="global"
          entries={SEARCH_INDEX}
          value={globalQuery}
          onChange={setGlobalQuery}
          onSelect={openHit}
          placeholder="Search scarabs, notables, mechanics…"
          hotkey="/"
          limit={14}
        />
      </header>
      <main>
        {tab === 'overview' && <Overview go={go} />}
        {tab === 'mechanic' && <MechanicView mechanic={mechanic} go={go} />}
        {(tab === 'scarabs' || tab === 'notables' || tab === 'effects' || tab === 'map') && (
          <div className="mech-layout">
            <MechanicSidebar value={mechanic} onChange={(v) => go(tab, v)} count={SIDEBAR_COUNT[tab].count} countLabel={SIDEBAR_COUNT[tab].label} />
            <div style={{ minWidth: 0 }}>
              {tab === 'scarabs' && <Scarabs mechanic={mechanic} {...focusProps} />}
              {tab === 'notables' && <Notables mechanic={mechanic} {...focusProps} />}
              {tab === 'effects' && <Effects mechanic={mechanic} {...focusProps} />}
              {tab === 'map' && <TreeMap mechanic={mechanic} {...focusProps} />}
            </div>
          </div>
        )}
        {tab === 'strategies' && <Strategies {...focusProps} />}
      </main>
      <TooltipLayer />
      <footer className="footer">
        <div className="footer-links">
          <a href={REPORT_URL} target="_blank" rel="noopener noreferrer">
            Report a mistake
          </a>
          <span>·</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
        </div>
        <div>
          Fan-made and non-commercial. Not affiliated with or endorsed by Grinding Gear Games. Path of Exile, its game data and art are © Grinding Gear Games.
        </div>
        <div>
          Atlas trees and art:{' '}
          <a href="https://github.com/grindinggear/atlastree-export" target="_blank" rel="noopener noreferrer">
            grindinggear/atlastree-export
          </a>{' '}
          {data.meta.old.label} (<span className="mono">{data.meta.old.commit.slice(0, 7)}</span>) vs {data.meta.new.label} (
          <span className="mono">{data.meta.new.commit.slice(0, 7)}</span>) · Scarab effects, limits and icons:{' '}
          <a href="https://www.poewiki.net/wiki/Scarab" target="_blank" rel="noopener noreferrer">
            poewiki.net
          </a>{' '}
          (CC BY-NC-SA 3.0) · Built {new Date(data.meta.generatedAt).toLocaleDateString()}
        </div>
        <div>
          Anonymous, cookieless visit and click counts via{' '}
          <a href="https://www.goatcounter.com/" target="_blank" rel="noopener noreferrer">
            GoatCounter
          </a>
          . No cookies, no personal data, nothing you type is recorded.
        </div>
      </footer>
    </div>
  );
}
