"""Copy the home page's shared header menu and footer onto every page.

index.html is the source of truth. Edit its <nav class="master-menu-links"> (Home /
MasterClass / Demo menus) or its <footer class="site-footer">, then run from the repo root:

    python tools/sync_header_footer.py           # apply
    python tools/sync_header_footer.py --check   # report pages that are out of sync, change nothing

Only those two blocks are synced. Everything else in each page's header is page-specific
and left alone:
  - the brand block (<a class="master-brand-wrap">): the home and Why TinitiateAI pages use
    the logo + MasterClass wordmark, every other page has its own .master-brand-badge text
  - the classes on .master-top-nav-inner (e.g. "nav-centered" on home / Why TinitiateAI)
  - anything after the menu, e.g. the Instructors picker on why-tinitiate.html

Relative links are re-based for each page's folder depth. Pages in SKIP_DIRS are
separately branded or not part of the site. Safe to re-run.
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {"sales-pitch", "ramesh-operations", "pdfs", "node_modules", "tools"}
NAV_RE = re.compile(r'<nav class="master-menu-links">.*?</nav>', re.S)
FOOTER_RE = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)
REL_RE = re.compile(r'(\b(?:href|src)=")(?!https?:|mailto:|tel:|#|/|data:|javascript:)([^"]*)"')


def rebase(html, prefix):
    return REL_RE.sub(lambda m: f'{m.group(1)}{prefix}{m.group(2)}"', html) if prefix else html


def replace_block(s, regex, new):
    m = regex.search(s)
    return s[:m.start()] + new + s[m.end():]


def main():
    check_only = "--check" in sys.argv[1:]
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    nav_m, footer_m = NAV_RE.search(home), FOOTER_RE.search(home)
    if not nav_m or not footer_m:
        sys.exit('index.html is missing <nav class="master-menu-links"> or <footer class="site-footer">')
    nav_src, footer_src = nav_m.group(0), footer_m.group(0)

    changed, missing = [], []
    for path in sorted(ROOT.rglob("*.html")):
        rel = path.relative_to(ROOT)
        if rel.parts[0] in SKIP_DIRS or rel == pathlib.Path("index.html"):
            continue
        s = path.read_text(encoding="utf-8")
        if not NAV_RE.search(s) or not FOOTER_RE.search(s):
            missing.append(rel.as_posix())
            continue
        prefix = "../" * (len(rel.parts) - 1)
        out = replace_block(s, NAV_RE, rebase(nav_src, prefix))
        out = replace_block(out, FOOTER_RE, rebase(footer_src, prefix))
        if out != s:
            changed.append(rel.as_posix())
            if not check_only:
                path.write_text(out, encoding="utf-8", newline="\n")

    if check_only:
        print(f"{len(changed)} page(s) out of sync" + (":\n  " + "\n  ".join(changed) if changed else ""))
    else:
        print(f"updated {len(changed)} page(s)")
    if missing:
        print("no standard menu/footer (skipped):", ", ".join(missing))
    if check_only and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
