/**
 * Downloads the raw inputs into data/raw/.
 *
 * Atlas trees are pinned to exact commits of grindinggear/atlastree-export so the
 * diff is reproducible. Scarab data (effects + per-map limits) comes from the
 * community wiki's Cargo API, because GGG's export does not include items.
 *
 * Also downloads the art: atlas sprite sheets from the same pinned commits and
 * scarab/Thread inventory icons from the wiki, into public/art/.
 *
 * Run: npm run fetch-data            (everything)
 *      node scripts/fetch-data.ts art (art only)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TREE_SOURCES } from './tree-sources.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');

const UA = 'poe-scarab-rework-diff/0.1 (atlas diff tool)';

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function fetchTrees() {
  for (const [version, src] of Object.entries(TREE_SOURCES)) {
    const url = `https://raw.githubusercontent.com/grindinggear/atlastree-export/${src.commit}/data.json`;
    const text = await fetchText(url);
    JSON.parse(text); // validate
    const file = join(rawDir, `atlas-${version}.json`);
    await writeFile(file, text);
    console.log(`tree ${version} (${src.label}) -> ${file}`);
  }
}

async function fetchScarabs() {
  const params = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    tables: 'items,map_fragments',
    join_on: 'items._pageID=map_fragments._pageID',
    fields: [
      'items.name=name',
      'items.metadata_id=metadata_id',
      'items.description=description',
      'items.tags=tags',
      'items.release_version=release_version',
      'items.removal_version=removal_version',
      'map_fragments.map_fragment_limit=limit',
    ].join(','),
    where: 'items.class_id="MapFragment" AND items.tags HOLDS "scarab"',
    limit: '500',
  });
  const text = await fetchText(`https://www.poewiki.net/w/api.php?${params}`);
  const json = JSON.parse(text) as { cargoquery?: { title: Record<string, string | null> }[] };
  if (!json.cargoquery) throw new Error(`Unexpected wiki response: ${text.slice(0, 300)}`);
  const rows = json.cargoquery.map((r) => r.title);
  const file = join(rawDir, 'scarabs-wiki.json');
  await writeFile(file, JSON.stringify(rows, null, 2));
  console.log(`scarabs: ${rows.length} rows -> ${file}`);
}

/** Sprite sheets (zoom 0.5) used for node/mastery icons and frames, per version. */
export const SPRITE_KEYS = ['normalActive', 'normalInactive', 'mastery', 'frame', 'background'] as const;
const artDir = join(root, 'public', 'art');

async function fetchBinary(url: string, file: string) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function fetchAtlasArt() {
  for (const [version, src] of Object.entries(TREE_SOURCES)) {
    const tree = JSON.parse(await readFile(join(rawDir, `atlas-${version}.json`), 'utf8')) as {
      sprites: Record<string, Record<string, { filename: string }>>;
    };
    const files = new Set<string>();
    for (const key of SPRITE_KEYS) files.add(basename(new URL(tree.sprites[key]['0.5'].filename).pathname));
    // Smaller atlas background for the tree map.
    files.add(basename(new URL(tree.sprites.atlasBackground['0.2972'].filename).pathname));
    for (const f of files) {
      await fetchBinary(`https://raw.githubusercontent.com/grindinggear/atlastree-export/${src.commit}/assets/${f}`, join(artDir, 'atlas', version, f));
    }
    console.log(`atlas art ${version}: ${[...files].join(', ')}`);
  }
}

/** Inventory icons for scarabs and Threads from the wiki (missing files are skipped). */
async function fetchItemIcons() {
  const params = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    tables: 'items',
    fields: 'items.name=name,items.inventory_icon=icon',
    where: '(items.class_id="MapFragment" AND items.tags HOLDS "scarab") OR (items.name LIKE "%Thread" AND items.release_version="3.30.0")',
    limit: '500',
  });
  const rows = (JSON.parse(await fetchText(`https://www.poewiki.net/w/api.php?${params}`)) as { cargoquery: { title: { name: string; icon: string | null } }[] }).cargoquery.map(
    (r) => r.title,
  );
  const titles = rows.map((r) => r.icon).filter((t): t is string => !!t);
  const urls = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const q = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url', titles: titles.slice(i, i + 50).join('|') });
    const json = JSON.parse(await fetchText(`https://www.poewiki.net/w/api.php?${q}`)) as {
      query: { pages: Record<string, { title: string; imageinfo?: { url: string }[] }>; normalized?: { from: string; to: string }[] };
    };
    const norm = new Map((json.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of Object.values(json.query.pages)) if (p.imageinfo?.[0]) urls.set(norm.get(p.title) ?? p.title, p.imageinfo[0].url);
  }
  const manifest: Record<string, string> = {};
  for (const r of rows) {
    const url = r.icon ? urls.get(r.icon) : undefined;
    if (!url) continue;
    const file = `${r.name.replace(/[^A-Za-z0-9]+/g, '-')}.png`;
    await fetchBinary(url, join(artDir, 'items', file));
    manifest[r.name] = `art/items/${file}`;
  }
  await writeFile(join(rawDir, 'item-icons.json'), JSON.stringify(manifest, null, 2));
  console.log(`item icons: ${Object.keys(manifest).length}/${rows.length} downloaded (missing: ${rows.filter((r) => !manifest[r.name]).map((r) => r.name).join(', ') || 'none'})`);
}

await mkdir(rawDir, { recursive: true });
const only = process.argv[2];
if (!only || only === 'data') {
  await fetchTrees();
  await fetchScarabs();
}
if (!only || only === 'art') {
  await fetchAtlasArt();
  await fetchItemIcons();
}
