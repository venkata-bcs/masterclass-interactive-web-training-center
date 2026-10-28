# Project Skills

Repeatable procedures for this site. Background and decisions are in [MEMORY.md](MEMORY.md).

## 1. Rebuild the AI harness pages

Run after editing any file in `ai/shared/` (data, matrix, generator):

```bash
cd ai/shared
python build_harness_pages.py
rm -rf __pycache__
```

It rewrites `ai/<slug>/index.html` for all seven harnesses and is safe to re-run. It asserts that every icon it references exists in `assets/icons/tech/`.

## 2. Add a new harness track

1. **Data**: add a dict (slug, name, title, badge, accent, logo, lede, glance, 17 `modules` with `s`, `a`, `m`) to a `harness_data_*.py` file and add it to `HARNESSES` in `build_harness_pages.py` (order = matrix column order).
2. **Matrix**: in `harness_matrix.py`, add a cell for the new slug to every `MATRIX` row, plus entries in `TUNING`, `TOOLS` and `SECURITY_ICONS`.
3. **Page shell**: create `ai/<slug>/index.html` from an existing harness page (keep the `<!-- Hero Banner -->` and `<!-- Master Footer -->` markers), or add a shell function like `strands_shell()`.
4. **Run the generator** (skill 1).
5. **Menu and counts**: add the menu entry and bump the "N Tracks" counts in the `index.html` header, then sync it to every page (skill 4). Also add a card in the AI domain on `index.html` and a word to `CLOUD_WORDS` in `index.html`.

## 3. Add a technology logo

Logos are Iconify SVGs saved as `assets/icons/tech/<name>.svg`:

```text
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 W H">BODY</svg>
```

1. Download a set once (avoids the Iconify API rate limit), into a scratch folder outside the repo:
   `https://cdn.jsdelivr.net/npm/@iconify-json/logos@1/icons.json` (colour logos), `.../simple-icons@1/icons.json` (monochrome), `.../devicon@1/icons.json`.
2. Take `icons[name].body` and `width`/`height` (fall back to the set's top-level size; resolve `aliases` via `parent`).
3. For monochrome sets, replace `currentColor` with the brand colour.
4. Prefer square icon marks over wordmarks for small sizes (e.g. `crewai-icon.svg`, `google-gemini-icon.svg`). The harness generator swaps these in via `ICON_MARKS`.
5. Add a label to `ICON_LABELS` in `harness_matrix.py` if the harness pages use it.

## 4. Change the header, mega menu or footer

Every page carries a copy of the home page's header and footer. Never edit them page by page:

1. Edit `<header class="master-top-nav">` (including the Subjects mega menu and its "N Tracks" counts) or `<footer class="site-footer">` in [index.html](index.html). Write links relative to the repo root, as on the home page.
2. Run `python tools/sync_header_footer.py`. It copies both blocks to every page, re-bases relative links for each folder depth and keeps each page's badge text. A second run should report `updated 0 pages`.
3. Do not add page-specific buttons to `.master-menu-links` (user decision: Home, Subjects and the injected "Why TinitiateAI" only).
4. Footer icons must be inline SVG, not `<i data-lucide>`, because not every page runs Lucide.
5. A new page should start from an existing page so it has the header and footer blocks the script looks for. The script lists pages it skipped.

## 5. Edit showcase slides (home hero, pitch decks)

Markup contract used by `assets/js/showcase.js`:

- Stage `#showcase` with `#showcaseCanvas`, `.showcase-track`, `#showcaseCounter`, `#showcaseDots`, `#showcaseProgress`, `#showcasePause`, `#showcasePrev`, `#showcaseNext`.
- Each slide: `<article class="showcase-slide" data-enter="zoom|left|right|up" data-orb="0.27-0.36">` with `.showcase-copy` and an optional `.showcase-visual`. Add `is-center` for a centred single-column slide; the first slide also gets `is-active`.
- Inner animations by `data-fx`: `scramble` (label), `rise` (title; words wrapped automatically, `<em>` = accent), `blur`, `pop`, `slide`, `flip`, `wipe`, `scale`, `scatter`. Numbers with `data-count` count up.
- Components: `.showcase-stats`, `.showcase-index`, `.showcase-outcomes`, `.showcase-logos`, `.showcase-emblem` (+ `.showcase-dial`), `.showcase-contacts`, `.showcase-cta` (`a.is-primary`).
- Keep the label numbers ("03 | ...") and the counter's total in step with the slide count. The dots are built from the slides automatically.

## 6. Make a standalone showcase page

1. Load `assets/css/home-material.css`, the Lucide script and `assets/js/showcase.js`.
2. Add `*, *::before, *::after { box-sizing: border-box; }` and `body { margin: 0; }`. The base layout CSS is not loaded, and without border-box the slides overflow.
3. Init on `DOMContentLoaded`: `initShowcase(); lucide.createIcons();`.
4. Re-skin with the `--sc-*` variables on `.showcase`: `--sc-bg`, `--sc-ink`, `--sc-muted`, `--sc-dim`, `--sc-line`, `--sc-line-strong`, `--sc-accent`, `--sc-accent-rgb` ("r, g, b" for the orb arc), `--sc-font`, `--sc-mono`.
5. Only one `#showcase` per page. A second deck needs its own IDs and controller, like `initSolarDeck()` in `sales-pitch/index.html`.

## 7. Verify pages in headless Edge

Quick screenshot (desktop):

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1440,2400 --screenshot="<out>.png" "file:///<repo>/ai/langgraph/index.html"
```

For phone width, clicks, JS errors and measurements, drive Edge over the DevTools protocol from Node: launch with `--remote-debugging-port`, call `Emulation.setDeviceMetricsOverride` (`mobile: true` for 390px), `Page.navigate`, `Runtime.evaluate`, `Page.captureScreenshot`, and collect `Runtime.exceptionThrown` events. Checks worth running:

- `document.documentElement.scrollWidth` equals the viewport width (the shared top nav overflows on phones on every page; exclude it).
- No `i[data-lucide]` left unconverted (an unknown icon name), no broken `img`.
- For slideshows: the counter reads `01 / NN` and the dot count matches.
- Wait about 2.5s before screenshots of animated slides; earlier captures look blurred mid-entrance.

## 8. Writing pitch or marketing pages

- Use only facts the user or the company's own site provides. Do not invent clients, case studies, office locations, timelines or prices.
- Check the prospect's stated requirements (e.g. location) against the facts and tell the user which ones the page cannot claim.
