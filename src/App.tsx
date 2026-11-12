import { useEffect, useState } from 'react';
import { data } from './data.ts';
import { Overview } from './views/Overview.tsx';
import { MechanicView } from './views/Mechanic.tsx';
import { TreeMap } from './views/TreeMap.tsx';
import { Notables } from './views/Notables.tsx';
import { Effects } from './views/Effects.tsx';
import { Scarabs } from './views/Scarabs.tsx';
import { Strategies } from './views/Strategies.tsx';
import { About } from './views/About.tsx';
import { Changelog, LAST_UPDATED } from './views/Changelog.tsx';
import { Icon } from './components/icons.tsx';
import { MechanicIcon } from './components/art.tsx';
import { MechanicSidebar } from './components/sidebar.tsx';
import { TooltipLayer } from './components/tooltip.tsx';
import { REPO_URL, REPORT_URL } from './links.ts';
import { Autocomplete } from './components/Autocomplete.tsx';
import { SEARCH_INDEX } from './searchIndex.ts';
import type { SearchHit } from './lib/search.ts';
import { track } from './lib/analytics.ts';

const TABS = [
  { id: 'overview', label: 'Overview', short: 'Overview' },
  { id: 'mechanic', label: 'By mechanic', short: 'Mechanics' },
  { id: 'scarabs', label: 'Scarab fates', short: 'Scarabs' },
  { id: 'notables', label: 'Notables & keystones', short: 'Notables' },
  { id: 'effects', label: 'All tree effects', short: 'Effects' },
  { id: 'map', label: 'Tree map', short: 'Tree map' },
  { id: 'strategies', label: 'Strategies', short: 'Strategies' },
  { id: 'about', label: 'About', short: 'About' },
] as const;
/** Pages reachable by URL but not shown as a tab. */
const EXTRA_PAGES = [{ id: 'changelog', label: 'Changelog', short: 'Changelog' }] as const;
const PAGES = [...TABS, ...EXTRA_PAGES];
export type TabId = (typeof PAGES)[number]['id'];

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

/** Routes look like #/<tab>/<mechanic>?focus=<item>; focus = what a search result points at. */
function readHash(): { tab: TabId; mechanic: string; focus: string } {
  const [path, query] = window.location.hash.replace(/^#\/?/, '').split('?');
  const [tab, mech] = path.split('/');
  const valid = PAGES.some((t) => t.id === tab) ? (tab as TabId) : 'overview';
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
  // Mobile header: page menu + expandable search row.
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(0);

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
    setSearchOpen(false);
    track(`search/global/${hit.entry.kind}/${hit.entry.label}`);
  };
  const focusProps = { focus, focusNonce };

  return (
    <div className="app">
      <header className={`topbar${searchOpen ? ' search-open' : ''}`}>
        <div className="brand">
          <MechanicIcon mechanic="Maps" size={30} />
          <span className="brand-word">Atlas</span> {data.meta.old.version} → {data.meta.new.version}
          <small>Atlas tree and scarab changes</small>
        </div>
        <div className="mobile-nav">
          <button className="btn mobile-page" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name="menu" size={16} /> {PAGES.find((t) => t.id === tab)?.short}
          </button>
          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="mobile-menu" role="menu">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    role="menuitem"
                    className={tab === t.id ? 'active' : ''}
                    onClick={() => {
                      setMenuOpen(false);
                      go(t.id);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => go(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button
          className="btn mobile-search-btn"
          aria-label="Search"
          onClick={() => {
            setSearchOpen(!searchOpen);
            setSearchFocus((n) => n + 1);
          }}
        >
          <Icon name={searchOpen ? 'close' : 'search'} />
        </button>
        <div className="global-search">
          <Autocomplete
            className="global"
            entries={SEARCH_INDEX}
            value={globalQuery}
            onChange={setGlobalQuery}
            onSelect={openHit}
            placeholder="Search scarabs, notables, mechanics…"
            hotkey="/"
            limit={14}
            focusSignal={searchFocus}
          />
        </div>
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
        {tab === 'about' && <About />}
        {tab === 'changelog' && <Changelog />}
      </main>
      <TooltipLayer />
      <footer className="footer">
        <span>Fan-made, not affiliated with Grinding Gear Games.</span>
        <span>
          Data: {data.meta.old.label} vs {data.meta.new.label}, updated {LAST_UPDATED}.
        </span>
        <a href="#/about">About and sources</a>
        <a href="#/changelog">Changelog</a>
        <a href={REPORT_URL} target="_blank" rel="noopener noreferrer">
          Report a mistake
        </a>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </footer>
    </div>
  );
}
