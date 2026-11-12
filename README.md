# PoE Atlas 3.29 → 3.30 diff & scarab fates

A static web app that compares the Path of Exile **3.29.3** and **3.30.0** Atlas passive trees. For each of the 116 scarabs removed in 3.30, it shows whether the effect moved to the tree, at what strength, or is gone. It also lets you check how 3.29 farming strategies hold up.

## Run

```bash
npm install
npm run fetch-data   # pinned tree JSON + scarab data into data/raw/, game art into public/art/
npm run build-data   # diff + scarab evaluation -> src/data/generated/
npm run dev          # http://localhost:5173
npm test             # unit tests for the core math
npm run build        # static site in dist/ (serve with `npm run preview` or any static host)
```

`data/raw/` and `src/data/generated/` are checked in, so `npm run dev` works without fetching.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` runs the tests, builds, and publishes `dist/` to GitHub Pages on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. The app uses hash routing and relative paths, so it works from the `/<repo>/` sub-path without extra configuration.

Visits are counted with [GoatCounter](https://www.goatcounter.com/) (cookieless; script in `index.html`). Each hash route (`#/scarabs`, `#/map/Essence`…) is counted as its own page, so the dashboard shows which tabs and mechanics people open. Local dev on `localhost` is not counted.

Page actions are sent as GoatCounter events (`src/lib/analytics.ts`), named `area/action/detail`:

| Event | When |
|---|---|
| `scarab/open/<scarab>` | a scarab row is expanded |
| `tooltip/scarab/<scarab>` | a scarab tooltip is opened (first time per visit) |
| `scarabs/fate-<fate>:on\|off`, `scarabs/sort/<key>` | fate filter / sort changed |
| `notables/status-<status>:on\|off`, `notables/took-over-scarab:on\|off`, `notables/kind/<kind>` | notable filters |
| `effects/status-<status>:on\|off`, `effects/biggest-nerfs-first:on\|off`, `effect/open/<effect>` | effect filters / row expanded |
| `map/tree/3.29\|3.30`, `map/only-changed:on\|off`, `map/took-over-scarab:on\|off`, `map/reset-view` | tree map controls |
| `strategy/view/<preset>`, `strategy/clone/<preset>`, `strategy/new`, `strategy/delete`, `strategy/compare`, `strategy/add-scarab/<scarab>`, `strategy/add-notable/<notable>`, `strategy/import`, `strategy/export` | strategy actions |
| `<area>/search` | a search was used (≥ 3 chars, once typing stops); the search text is never sent |
| `search/global/<kind>/<item>` | a global search result was picked (the picked item, not the typed text) |

## Tabs

| Tab | What it shows |
|---|---|
| **Overview** | Totals, scarab fates per category, and the per-mechanic table grouped by category |
| **By mechanic** | One page per mechanic (sidebar grouped by category): its scarabs, notables and tree effects together |
| **Scarab fates** | Every 3.29 scarab: limit, max power, the 3.30 nodes that replace it, best-case retention, % absorbed, fate. Click a row for the full breakdown |
| **Notables & keystones** | Old ↔ new notables: unchanged / buffed / nerfed / changed / replaced (renames & merges) / removed / new |
| **All tree effects** | Every stat line grouped by wording, with tree-wide totals in 3.29 vs 3.30. Click a row to see the nodes |
| **Tree map** | Both trees drawn from the export, coloured by per-node change; hover for stats, scroll to zoom |
| **Strategies** | Build or clone a 3.29 setup (scarabs + notables), see how much survives, compare all strategies. Saved in localStorage, import/export as JSON |

## Search

- **Global** (top bar, press `/`): scarabs, notables/keystones, mechanics, tree effects, node names and example strategies, with autocomplete. Picking a result jumps to it. The scarab row opens, the notable card or effect row is highlighted, the tree map zooms onto the node, the strategy opens. The URL (`#/<tab>/<mechanic>?focus=<item>`) is shareable.
- **Per page**: each page's search box autocompletes only that page's items within the selected mechanic. The strategy builder uses the same autocomplete to add scarabs and 3.29 notables.
- Ranking lives in `src/lib/search.ts` (pure, unit-tested) and the index in `src/searchIndex.ts`.

## Look & feel

- **Overview opens with a stash tab**: all 116 scarabs in their mechanic groups. Scarabs whose effect survives keep their colour; gone ones are greyed out like empty slots. A coloured edge on each slot shows its fate.
- **Palette "Atlas night"**: ink navy from the Atlas of Worlds screen, brass for interaction, and Path of Exile's own text colours (currency beige for item names, magic blue for modifiers). Fates use five colours: kept, weaker, partly/chance/reworked, Threads, gone. All tokens are at the top of `src/styles.css`.
- **Type**: Alegreya SC (small caps, close in spirit to PoE's Fontin) for item names and titles; Alegreya Sans for everything else, sentence case throughout. Both are open-licence and bundled.
- Game art comes from the sprite sheets in `grindinggear/atlastree-export` (same pinned commits) and the wiki's scarab icons, downloaded into `public/art/` by `npm run fetch-data`.
- Hover or tap any scarab, node, mechanic icon or stacked bar for a tooltip. On touch screens it opens as a bottom sheet.
- The methodology, caveats, sources and privacy notes are on the **About** page.

## Mechanic categories (`src/lib/mechanics.ts`)

Mechanics are grouped the way the 3.30 patch notes split them, so base content is kept apart from layers that stack on top of it:

| Category | Mechanics |
|---|---|
| Primary league mechanics (now via Threads) | Abyss, Bestiary, Betrayal, Blight, Breach, Expedition, Incursion, Legion, Ritual, Ultimatum |
| Secondary (Surpassing Chance content) | Essence, Harvest / Sacred Flora, Mercenaries, Ore Deposits, Rogue Exiles, Shrines, Strongboxes, Torment |
| Tertiary (chance only) | Beyond, Delirium, Mirage, Sentinels, Viridian Wildwood, Labyrinth |
| **Additive endgame layers** | Maven, The Searing Exarch, The Eater of Worlds, The Shaper and Elder, Conquerors, Synthesis, Atlas Memories, Atlas Anomalies |
| Map juice & rewards | Maps, Magic/Rare/Unique Monsters, Divination Cards, Gold, Scarabs → Threads |
| Removed | Delve, Heist, Vaal Side Areas |

Every filter accepts a single mechanic or a whole category. Scarabs that touch several layers (e.g. Influencing Scarab of Hordes → Exarch, Eater, Shaper/Elder, Conquerors) appear on each of those pages. Strategies are split into **Content / Additive layers / Map juice**, each with its own retention, so you can see whether the base farm or the layer on top took the hit. The build fails if a mechanic has no category.

## How the numbers work

- **Max power** = one scarab's effect × its map limit (limits from the wiki's `map_fragment_limit`).
- **Best case 3.29** = full 3.29 tree + max scarabs. **Best case 3.30** = full 3.30 tree. **Retention** = 3.30 / 3.29, and it drives the fate:
  - `full` ≥ 95%. `reduced`: below that, but the 3.30 tree adds something new. `removed`: no equivalent, or the 3.30 tree adds nothing beyond what 3.29 already had.
  - `thread`: primary league content (Abyss, Bestiary, Betrayal, Blight, Breach, Expedition, Incursion, Legion, Ultimatum) now comes from Threads.
  - `chance`: a guaranteed effect became "% increased chance" (unknown base, not quantifiable). `partial` / `reworked` are judgment calls, each with a note.
- **Absorbed** = (3.30 tree − 3.29 tree) / max power: how much of the scarab the tree really took in.
- **Surpassing Chance**: every 100% = +1 guaranteed, remainder = chance for one more (610% → "6 + 10%"). Count-based effects convert it automatically.
- **Multiple-choice notables** count only their best variant, and are marked as a choice.
- **Caps**: % chances are capped at 100% where it matters (e.g. Mercenary chance).
- **Strategies** re-run the math for the counts you actually use (Ambush ×2 is not Ambush ×3). Thread and chance-only scarabs are listed but not scored. The "quantifiable" column says how much of the setup was scored.

## Curation (`data/curation/`)

Matching scarab effects to tree nodes takes judgment, so it lives in reviewed files. **The numbers themselves always come from the tree data.**

- `scarab-map.ts`: per scarab, which 3.29/3.30 stat lines replicate each effect (substring of the stat template, `#` = number), plus scaling, caps, forced fates and notes.
- `effect-links.ts`: effects whose wording changed (e.g. "chance for an additional Shrine" → "Surpassing Chance to contain a Shrine").
- `notable-links.ts`: renames, merges into multiple-choice notables, and same-name notables that changed meaning.
- `strategies.ts`: example 3.29 setups. These are typical shapes, not exact meta builds.

`npm run build-data` **fails** if curation drifts from the data: a match that hits no node, an unknown template or notable, a missing scarab entry, or a preset over a scarab's limit.

## Updating when the final 3.30 tree lands

1. Set the new commit in `scripts/tree-sources.ts`.
2. `npm run fetch-data && npm run build-data`, then fix any curation errors it reports.

## Assumptions & limits

- 3.30 data is **preview 2** of the export. Values can still change before launch.
- Scarab text and limits are the wiki's final 3.29 values.
- Base spawn chances of content in maps are not modelled. Example: patch notes say Essences now have a base chance; the tool only compares atlas tree + scarab contributions.
- "Increased chance" effects multiply an unknown base, so they are shown but not scored.
- Thread modifiers are random per Thread and aren't in the export, so Thread-replaced content isn't scored.
- Node mechanic grouping is keyword-based with a nearest-mastery fallback (`src/lib/tree.ts`).

Sources: [grindinggear/atlastree-export](https://github.com/grindinggear/atlastree-export), [poewiki.net](https://www.poewiki.net/wiki/Scarab), [3.30 patch notes (Maxroll)](https://maxroll.gg/poe/news/3-30-covens-of-umbra-patch-notes).
