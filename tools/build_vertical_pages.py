"""Build a home page for every vertical (Foundational, AI, Data Engineering, ...).

Source of truth: tools/domains-source.html (the topic cards, between the
SUBJECT-DOMAINS markers; formerly the home page's "Explore by Domain" section). Each <section class="domain-section" id="domain-<slug>"> there
becomes verticals/<slug>.html with the same header, cards and Open course / Demo buttons,
plus chips to jump between verticals. Edit the cards in tools/domains-source.html, then run
from the repo root:

    python tools/build_vertical_pages.py
    python tools/sync_header_footer.py

The MasterClass menu's column headings link to these pages.

It also fills a topic-card section on each vertical's own Master Class page (listed in
MASTERCLASS_PAGES) wherever that page has <!-- VERTICAL-TOPICS:START --> ... END markers,
leaving out the card that points at the page itself. Safe to re-run.
"""
import html
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "verticals"
HEADER_RE = re.compile(r'<header class="master-top-nav">.*?</header>', re.S)
FOOTER_RE = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)
DOMAINS_RE = re.compile(r'<!-- SUBJECT-DOMAINS:START -->.*?<!-- SUBJECT-DOMAINS:END -->', re.S)
SECTION_RE = re.compile(r'<section class="domain-section" id="domain-([a-z0-9-]+)".*?</section>', re.S)
CHIP_RE = re.compile(r'<a href="#domain-([a-z0-9-]+)" class="domain-chip"[^>]*>.*?</a>', re.S)
REL_RE = re.compile(r'(\b(?:href|src)=")(?!https?:|mailto:|tel:|#|/|data:|javascript:)([^"]*)"')
MORE_LINK_RE = re.compile(r'\s*<a href="[^"]*verticals/[^"]*" class="domain-more-link">.*?</a>', re.S)
CARD_RE = re.compile(r'[ \t]*<article class="topic-card[^"]*">.*?</article>\n?', re.S)
TOPICS_RE = re.compile(r'(<!-- VERTICAL-TOPICS:START[^>]*-->).*?(<!-- VERTICAL-TOPICS:END -->)', re.S)

# Cards to leave off a vertical's home page (verticals/<slug>.html), by the card's link
HIDE_ON_VERTICAL_PAGE = {
    "foundational": {"foundational/index.html"},  # "Foundational Master Class" card
}

# vertical slug -> that vertical's Master Class page (gets a dark-themed topic section)
MASTERCLASS_PAGES = {
    "foundational": "foundational/index.html",
}

# Dark card styles for the Master Class pages (scoped; those pages don't load home-material.css)
TOPICS_CSS = """
    <style>
      .vt-topics { margin-bottom: 36px; scroll-margin-top: 80px; padding: 28px; border-radius: 16px;
        background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); }
      .vt-topics-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
      .vt-topics-eyebrow { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--domain-accent); }
      .vt-topics-title { font-size: 1.5rem; font-weight: 700; color: #ffffff; margin: 4px 0 0; }
      .vt-topics-title span { font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-left: 8px; }
      .vt-topics-all { font-size: 0.88rem; font-weight: 600; color: var(--domain-accent); text-decoration: none; }
      .vt-topics-all:hover { text-decoration: underline; }
      @media (max-width: 640px) { .vt-topics { padding: 18px; } }
      .vt-topics .topic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
      .vt-topics .topic-card { display: flex; flex-direction: column; gap: 14px; padding: 16px; border-radius: 14px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-top: 3px solid var(--domain-accent);
        transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
      .vt-topics .topic-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--domain-accent) 55%, transparent);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45); }
      .vt-topics .topic-card-link { display: flex; flex-direction: column; gap: 6px; flex: 1; color: inherit; text-decoration: none; }
      .vt-topics .topic-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .vt-topics .topic-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
        background: color-mix(in srgb, var(--domain-accent) 18%, transparent); color: var(--domain-accent); }
      .vt-topics .topic-icon svg { width: 18px; height: 18px; }
      .vt-topics .topic-icon.has-logo { background: #ffffff; }
      .vt-topics .topic-icon.has-logo img { width: 22px; height: 22px; object-fit: contain; }
      .vt-topics .topic-name { font-size: 1.05rem; font-weight: 700; color: #ffffff; margin: 8px 0 0; }
      .vt-topics .topic-desc { font-size: 0.88rem; line-height: 1.5; color: #94a3b8; margin: 0; }
      .vt-topics .topic-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .vt-topics .topic-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 999px;
        font-size: 0.8rem; font-weight: 700; text-decoration: none; transition: filter 0.15s ease, background 0.15s ease; }
      .vt-topics .topic-btn svg { width: 14px; height: 14px; }
      .vt-topics .topic-btn-primary { background: var(--domain-accent); color: #0b1220; }
      .vt-topics .topic-btn-primary:hover { filter: brightness(1.12); }
      .vt-topics .topic-btn-ghost { border: 1px solid rgba(255, 255, 255, 0.22); color: #e2e8f0; }
      .vt-topics .topic-btn-ghost:hover { background: rgba(255, 255, 255, 0.08); }
    </style>"""


def fill_masterclass_page(slug, section, title, accent):
    rel = MASTERCLASS_PAGES.get(slug)
    if not rel:
        return None
    path = ROOT / rel
    s = path.read_text(encoding="utf-8")
    if not TOPICS_RE.search(s):
        return f"{rel} (no VERTICAL-TOPICS markers, skipped)"
    prefix = "../" * (len(pathlib.PurePosixPath(rel).parts) - 1)
    cards = [c for c in CARD_RE.findall(section)
             if re.search(r'class="topic-card-link"', c)
             and re.search(r'<a href="([^"]+)" class="topic-card-link"', c).group(1) != rel]
    body = "".join(rebase(c, prefix) for c in cards).rstrip()
    block = f'''{TOPICS_CSS}
    <section class="vt-topics" id="sec-topics" style="--domain-accent:{accent};">
      <div class="vt-topics-head">
        <div>
          <span class="vt-topics-eyebrow">All topics in this vertical</span>
          <h2 class="vt-topics-title">{html.escape(title)} Topics<span>{len(cards)} tracks</span></h2>
        </div>
        <a href="{prefix}verticals/{slug}.html" class="vt-topics-all">{html.escape(title)} home &rarr;</a>
      </div>
      <div class="topic-grid">
{body}
      </div>
    </section>
    '''
    out = TOPICS_RE.sub(lambda m: m.group(1) + block + m.group(2), s, count=1)
    if out != s:
        path.write_text(out, encoding="utf-8", newline="\n")
    return f"{rel} ({len(cards)} topics)"


def rebase(fragment, prefix="../"):
    return REL_RE.sub(lambda m: f'{m.group(1)}{prefix}{m.group(2)}"', fragment)


def plain(fragment):
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def main():
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    domains = DOMAINS_RE.search((ROOT / "tools" / "domains-source.html").read_text(encoding="utf-8")).group(0)
    header = rebase(HEADER_RE.search(home).group(0))
    footer = rebase(FOOTER_RE.search(home).group(0))
    chips = {slug: chip for slug, chip in ((m.group(1), m.group(0)) for m in CHIP_RE.finditer(domains))}
    sections = {m.group(1): m.group(0) for m in SECTION_RE.finditer(domains)}

    OUT_DIR.mkdir(exist_ok=True)
    for slug, section in sections.items():
        section = MORE_LINK_RE.sub("", section)  # the "Vertical home" link points at this very page
        page_section = section
        for hidden in HIDE_ON_VERTICAL_PAGE.get(slug, ()):
            page_section = CARD_RE.sub(lambda m: "" if f'<a href="{hidden}" class="topic-card-link"' in m.group(0) else m.group(0), page_section)
        title = plain(re.search(r'<h3 class="domain-title">(.*?)<span', section, re.S).group(1))
        blurb_m = re.search(r'<p class="domain-blurb">(.*?)</p>', section, re.S)
        blurb = plain(blurb_m.group(1)) if blurb_m else ""
        jump = "".join(
            chip.replace(f'href="#domain-{s}"', f'href="{s}.html"' + (' aria-current="page"' if s == slug else ""), 1)
            for s, chip in chips.items()
        )
        page = f'''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} | Tinitiate MasterClass Academy</title>
  <meta name="description" content="{html.escape(blurb, quote=True)}">
  <link rel="icon" type="image/png" href="../favicon.png">
  <link rel="stylesheet" href="../assets/css/master-global-layout.css">
  <link rel="stylesheet" href="../assets/css/home-material.css">
  <script src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"></script>
  <style>
    body {{ background: var(--md-surface); color: var(--md-on-surface); }}
    .vertical-home {{ padding: 28px 0 8px; }}
    .vertical-crumbs {{ max-width: 1400px; margin: 0 auto 18px; padding: 0 24px; font-size: 0.85rem; color: var(--md-on-surface-var); }}
    .vertical-crumbs a {{ color: var(--md-primary); text-decoration: none; font-weight: 600; }}
    .vertical-crumbs a:hover {{ text-decoration: underline; }}
    .vertical-home .domain-chip[aria-current="page"] {{
      background: color-mix(in srgb, var(--domain-accent) 14%, #fff);
      border-color: color-mix(in srgb, var(--domain-accent) 60%, #fff);
      font-weight: 700;
    }}
    @media (max-width: 640px) {{ .vertical-crumbs {{ padding: 0 16px; }} }}
  </style>
</head>
<body>

  <!-- GENERATED by tools/build_vertical_pages.py from tools/domains-source.html. Edit there, not here. -->
  {header}

  <main class="vertical-home">
    <nav class="vertical-crumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a> &rsaquo; {html.escape(title)}</nav>
    <div class="domains-wrap">
      <nav class="domain-jump" aria-label="Verticals">
        {jump}
      </nav>
    {rebase(page_section)}
    </div>
  </main>

  {footer}

  <script src="../assets/js/master-global-nav.js"></script>
  <script>if (window.lucide) lucide.createIcons();</script>
</body>
</html>
'''
        (OUT_DIR / f"{slug}.html").write_text(page, encoding="utf-8", newline="\n")
        accent = re.search(r'style="--domain-accent:([^;"]+)', section).group(1)
        filled = fill_masterclass_page(slug, section, title, accent)
        if filled:
            print("topics:", filled)
    print("built:", ", ".join(f"verticals/{s}.html" for s in sections))


if __name__ == "__main__":
    main()
