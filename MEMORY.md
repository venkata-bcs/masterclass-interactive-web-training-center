# Project Memory

Context, decisions and known issues for the Tinitiate MasterClass site. Read this before changing the AI harness pages, the home hero or the sales pitch page. How-to steps live in [SKILLS.md](SKILLS.md).

Last updated: 2026-10-28.

## The site

- Static HTML/CSS/JS, no build step. Open files directly or serve the folder.
- Home page: [index.html](index.html). Styles: inline `<style>` + [assets/css/master-global-layout.css](assets/css/master-global-layout.css) + [assets/css/home-material.css](assets/css/home-material.css).
- **Header and footer are standardized** (2026-10-28): every page carries an exact copy of the home page's `<header class="master-top-nav">` and `<footer class="site-footer">`. [index.html](index.html) is the source of truth; copy changes to all pages with `python tools/sync_header_footer.py` (see SKILLS.md, skill 4).
  - Header: brand logo + page badge, Home, Subjects mega menu, "Why TinitiateAI" (injected by `master-global-nav.js`), instructor badge, LinkedIn, GitHub. Only the badge text differs per page.
  - User decision: **no page-specific nav buttons** (no "Interactive Demo", no duplicate current-page button, no course shortcuts). Demo pages are reached from course content.
  - Excluded from the standard chrome: `sales-pitch/` (ILM360-branded) and `pdfs/` (working folder for the "Evolution of AI" PDF, not a site page).
  - The 4 `agentic-development/` pages (hub, Agents, Agentic Loops, Agent Swarms) keep their own section links in a sticky `.sw-subbar` under the header. `agentic.css` re-points `--font-sans` / `--font-mono` inside `.sw-main` so the shared stylesheet does not replace their fonts. They are linked from the AI column of the Subjects menu and a home-page card (2026-10-28).
- The Subjects mega menu is part of the header, so it is also edited in `index.html` and synced.
- Track counts appear in several places in `index.html`: the AI `mega-cat-count` ("9 Tracks"), "34 Tracks + 15 Placement Guides", the home stats and showcase slide 1 (`data-count="34"`), and the AI domain card count.
- Every page is reachable from `index.html` except the intentional standalones `sales-pitch/` (shared by direct link) and `pdfs/`. The 2026-10-28 clean-up removed root screenshots, `scratch/` scripts, `*-old.html` pages, duplicate per-folder favicon/banner copies, an unused `package.json` and dead CSS for retired footers. Pages use the root `favicon.png` and banners, except the 7 course folders that still reference their own `favicon.png`.
- Tech logos live in [assets/icons/tech/](assets/icons/tech/) as Iconify-style SVGs (`width="1em" height="1em"`, brand colours baked in).
- Icons in markup use Lucide (`<i data-lucide="name">`). The home page pins `lucide@0.468.0`; older sub-pages use `lucide@latest`.

## AI harness tracks (`ai/<slug>/index.html`)

- Seven harness tracks: LangGraph, CrewAI, AWS Bedrock, **AWS Strands** (added 2026-10-28, `ai/aws-strands/`), Azure Foundry, Claude SDK, Google Gemini SDK. Plus the "AI Master Class" flagship and "Agentic Development", so the AI domain shows 9 tracks.
- The `<main>` of each harness page is **generated**. Do not hand-edit it; edit the data and re-run the generator:
  - [ai/shared/build_harness_pages.py](ai/shared/build_harness_pages.py): generator, step list, layout.
  - [ai/shared/harness_data_1.py](ai/shared/harness_data_1.py) to `_3.py`: per-harness roadmap modules (summary, key APIs, matrix phrase).
  - [ai/shared/harness_matrix.py](ai/shared/harness_matrix.py): architecture matrix rows and cells, tuning step, sidebar tools, icon labels.
  - [ai/shared/harness.css](ai/shared/harness.css): Material-style light theme.
- Page layout (user's requirements): a roadmap "poster" in the style of the home page's **AI & AGENTIC SYSTEMS ROADMAP (2026)** (numbered spine of 19 steps, each with bullets, key-API chips and a LEARN box of real tech logos, plus sidebar cards), followed by the **Enterprise AI Architecture Matrix** (17 layers x 7 harnesses, logos in every cell, current harness column highlighted).
- User preferences for these pages: Material UI style, light/white, real technology icons. **No scenarios, use cases, capstones, labs or interactive dashboards/progress trackers.**
- The generator keeps each page's existing header and footer and replaces everything between `<!-- Hero Banner -->` and `<!-- Master Footer -->`.
- The Strands page has no `demo.html`; its header is derived from the Bedrock page.

### Matrix source and corrections

The matrix rows come from [enterprise_architecture_matrix.md](enterprise_architecture_matrix.md), but several cells in that file are wrong and were corrected in `harness_matrix.py`:
- Strands is an open-source, code-first SDK, not a visual low-code platform.
- Bedrock session state is `sessionAttributes` / agent memory, not Knowledge Bases.
- CrewAI HITL is `human_input=True` (not `human_in_the_loop=True`); its "skills attribute" could not be confirmed.

### Accuracy notes

- Code-level API names were written from documentation knowledge, not executed. Newest APIs worth re-checking: Strands interrupts, Google ADK `require_confirmation`, Foundry tool approvals and `agent_framework` workflows, CrewAI `crewai.events`.
- Claude examples use model id `claude-opus-5-5`.

## Home page hero (showcase slideshow)

- The first element after the header is the **8-slide showcase** (`#about-academy`, "Tinitiate AI / MasterClass Academy"). It merged the old "Learn Right" deck and the old showcase on 2026-10-28; the Learn Right deck and its CSS/JS were removed.
- The static `.hero-section` ("Demystifying AI, Lakehouses...") still follows it and partly repeats slide 1. The user has not decided whether to remove it.
- Shared slideshow code: [assets/js/showcase.js](assets/js/showcase.js) (`initShowcase`, `splitTitleWords`, `scrambleText`, `countUp`, `createShowcaseScene`, `SHOWCASE_INTERVAL`). The home page keeps `buildCourseCloud()` (slide 7 word cloud) inline and calls it before `initShowcase()`.
- Showcase styles are in `home-material.css` (`.showcase*`). Theme by overriding the `--sc-*` variables, including `--sc-accent-rgb` (orb accent arc).

## Sales pitch page ([sales-pitch/index.html](sales-pitch/index.html))

- Prospect (from [sales-pitch/to-do.md](sales-pitch/to-do.md)): a ~225-person California firm wants a small data engineering firm to design, implement and maintain a data warehouse for legacy-system data. They prefer a **physical presence in California or the Western US**. The user later said the prospect is a **solar company**.
- Branded as **ILM360** (user's request), using ilm360.com's palette and fonts:
  - Colours: deepest navy `#040c21`, ink `#0e1032`, violet `#5f3dc3`, accent `#6d3fd9` / `#9a6bf2`, brand light `#b98be0`, lilac `#d6bbeb`, logo purple `#7030A0`.
  - Fonts: IBM Plex Sans / IBM Plex Mono, Libre Bodoni for headings.
  - Logo: inline SVG; dark-background variant uses `#B98BE0` + `#D6BBEB`.
- Only facts published on ilm360.com are used: since 2012, 150+ clients, 15+ certified professionals, WBENC-certified, Microsoft CSP reseller, SAM-registered, co-founder Jai Kanuri (25+ years data engineering), Azure/AWS/Oracle/Google Cloud, Power BI, Sage X3 / Dynamics GP migrations. Contact: info@ilm360.com, (844) 245-6360.
- **ILM360 is based in Round Rock, Texas.** The page does not claim a California or Western US presence; add it only if the user confirms it is true.
- The page has two slideshows:
  1. **v1**: 8-slide showcase (`#showcase`).
  2. **v2 "Solar Edition"** (`#solarDeck`): clones v1's slides at load, inserts a "Built for Solar" slide as 02 (9 slides) and renumbers labels. The sun moves east (right) to west (left) as slides advance, panels tilt like trackers (+26deg to -26deg), the sky warms at dawn and dusk. Edit slide text in v1 only.
- The page does not load `master-global-layout.css`, so it sets `box-sizing: border-box` itself (without it every slide is 32px too wide).

## Known issues

- The shared top nav is wider than a phone screen on every page (pre-existing), so pages scroll sideways at ~390px.
- In the v2 solar deck, the circular emblems on slides 3 and 7 overlap the sun's rings mid-morning and mid-afternoon.
