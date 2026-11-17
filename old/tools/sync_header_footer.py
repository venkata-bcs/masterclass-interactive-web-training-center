"""Copy the home page's header and footer onto every page.

index.html is the source of truth. Edit its <header class="master-top-nav"> or
<footer class="site-footer">, then run from the repo root:

    python tools/sync_header_footer.py

Relative links are re-based for each page's folder depth, and each page keeps its own
.master-brand-badge text. Pages in SKIP_DIRS are left alone (sales-pitch is a
separately branded standalone page; pdfs is not part of the site). Safe to re-run.
"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {"sales-pitch", "pdfs", "node_modules", "tools"}
HEADER_RE = re.compile(r'<header class="master-top-nav">.*?</header>', re.S)
FOOTER_RE = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)
BADGE_RE = re.compile(r'<span class="master-brand-badge">(.*?)</span>', re.S)
REL_RE = re.compile(r'(\b(?:href|src)=")(?!https?:|mailto:|tel:|#|/|data:|javascript:)([^"]*)"')


def rebase(html, prefix):
    return REL_RE.sub(lambda m: f'{m.group(1)}{prefix}{m.group(2)}"', html) if prefix else html


def main():
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    header_src = HEADER_RE.search(home).group(0)
    footer_src = FOOTER_RE.search(home).group(0)
    home_badge = BADGE_RE.search(header_src).group(0)

    changed, missing = 0, []
    for path in sorted(ROOT.rglob("*.html")):
        rel = path.relative_to(ROOT)
        if rel.parts[0] in SKIP_DIRS or rel == pathlib.Path("index.html"):
            continue
        s = path.read_text(encoding="utf-8")
        header, footer = HEADER_RE.search(s), FOOTER_RE.search(s)
        if not header or not footer:
            missing.append(str(rel))
            continue
        prefix = "../" * (len(rel.parts) - 1)
        badge = BADGE_RE.search(header.group(0)).group(0)
        new_header = rebase(header_src, prefix).replace(home_badge, badge, 1)
        new_footer = rebase(footer_src, prefix)
        out = s[:header.start()] + new_header + s[header.end():footer.start()] + new_footer + s[footer.end():]
        if out != s:
            path.write_text(out, encoding="utf-8", newline="\n")
            changed += 1

    print(f"updated {changed} pages")
    if missing:
        print("no standard header/footer (skipped):", ", ".join(missing))


if __name__ == "__main__":
    main()
