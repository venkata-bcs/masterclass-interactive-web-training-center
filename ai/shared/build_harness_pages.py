"""Rebuild the <main> of every ai/<harness>/index.html: a 2026 roadmap poster followed by the
Enterprise AI Architecture Matrix.

Keeps each page's existing header (nav + mega menu) and footer, replaces everything between
"<!-- Hero Banner -->" and "<!-- Master Footer -->". Safe to re-run.

    python ai/shared/build_harness_pages.py
"""
import html
import re
from pathlib import Path

from harness_data_1 import LANGGRAPH, CREWAI, STRANDS
from harness_data_2 import BEDROCK, FOUNDRY
from harness_data_3 import CLAUDE, GEMINI
from harness_matrix import ICON_LABELS, ROWS, MATRIX, TUNING, TOOLS, SECURITY_ICONS

AI_DIR = Path(__file__).resolve().parent.parent
ICON_DIR = AI_DIR.parent / "assets" / "icons" / "tech"
HARNESSES = [LANGGRAPH, CREWAI, BEDROCK, STRANDS, FOUNDRY, CLAUDE, GEMINI]

START_MARK = "  <!-- Hero Banner -->"
END_MARK = "  <!-- Master Footer -->"
FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap">'

# Roadmap steps: key, title, lucide icon, matrix row used for the LEARN icons
STEPS = [
    ("setup", "Setup, Models & Credentials", "plug-zap", None),
    ("anatomy", "Harness, Runtime & Sandbox", "box", "sandbox"),
    ("state", "State & Data Management", "database", "state"),
    ("memory", "Memory & Persistence", "hard-drive", "memoryfile"),
    ("edges", "Edges, Routing & Control Flow", "git-branch", "orchestration"),
    ("lifecycle", "Calling, Starting & Stopping", "circle-play", "lifecycle"),
    ("errors", "Errors, Retries & Limits", "life-buoy", None),
    ("tools", "Function Calling & Tools", "square-function", "tools"),
    ("rag", "RAG Pipeline", "library", "rag"),
    ("mcp", "MCP Integration", "plug", "mcp"),
    ("context", "Context Files: skills.md, memory.md, tools.md", "file-text", "skills"),
    ("orchestration", "Multi-Agent Orchestration", "network", "orchestration"),
    ("hitl", "Human-in-the-Loop (HITL)", "user-check", "hitl"),
    ("guardrails", "Guardrails & Safety", "shield-check", "guardrails"),
    ("testing", "Testing & Evaluation", "flask-conical", "testing"),
    ("auditing", "Auditing & Tracing", "scan-search", "auditing"),
    ("mlops", "MLOps, LLMOps & Edge Deployment", "rocket", "mlops"),
    ("tuning", "LLM Training & Tuning", "sliders-horizontal", "tuning"),
    ("security", "Security, Identity & Cost", "lock", None),
]
NODE_COLORS = ["#0891b2", "#059669", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04",
               "#0d9488", "#4f46e5", "#c026d3", "#0369a1", "#16a34a", "#9333ea", "#dc2626",
               "#65a30d", "#d97706", "#6366f1", "#475569", "#be123c"]

e = html.escape
CUR = ' class="is-current"'


def stem(h):
    return h["logo"].removesuffix(".svg")


# Square icon marks for brands whose main file is a wordmark
ICON_MARKS = {"crewai": "crewai-icon", "google-gemini": "google-gemini-icon"}


def logo(name, size=22):
    name = ICON_MARKS.get(name, name)
    assert (ICON_DIR / f"{name}.svg").exists(), name
    return f'<img src="../../assets/icons/tech/{name}.svg" alt="" width="{size}" height="{size}" loading="lazy">'


def sentences(text):
    return [s.rstrip(".") for s in re.split(r"(?<=[.])\s+(?=[A-Z])", text.strip())]


def step_content(h, key):
    """Bullets (list of (lead, text)) and key APIs for one roadmap step."""
    slug = h["slug"]
    if key == "context":
        rows = [("skills.md", "skills"), ("memory.md", "memoryfile"), ("tools.md", "toolsfile")]
        bullets = [(f"{label}:", f"{MATRIX[r][slug][1]}. {MATRIX[r][slug][2].rstrip('.')}") for label, r in rows]
        return bullets, [MATRIX[r][slug][1] for _, r in rows]
    mod = TUNING[slug] if key == "tuning" else h["modules"][key]
    bullets = [("", s) for s in sentences(mod["s"])]
    if key == "anatomy":
        bullets.append(("Sandbox:", MATRIX["sandbox"][slug][2].rstrip(".")))
    if key == "mlops":
        bullets.append(("Edge:", f'{MATRIX["edge"][slug][1]}. {MATRIX["edge"][slug][2].rstrip(".")}'))
    return bullets, mod["a"]


def learn_icons(h, key, row):
    if key == "security":
        icons = SECURITY_ICONS[h["slug"]]
    elif key == "context":
        icons = ["markdown"] + MATRIX["skills"][h["slug"]][0]
    elif row:
        icons = [stem(h)] + MATRIX[row][h["slug"]][0]
    else:
        icons = TOOLS[h["slug"]][:3]
    seen = []
    for i in icons + TOOLS[h["slug"]]:
        if i not in seen:
            seen.append(i)
    return seen[:3]


def step_html(h, n, key, title, icon, row):
    bullets, apis = step_content(h, key)
    items = "".join(f"<li>{f'<b>{e(lead)}</b> ' if lead else ''}{e(text)}</li>" for lead, text in bullets)
    chips = "".join(f"<li>{e(a)}</li>" for a in apis)
    learn = "".join(
        f'<div class="hx-learn-item"><span>{logo(i, 24)}</span><span>{e(ICON_LABELS[i])}</span></div>'
        for i in learn_icons(h, key, row))
    return f'''          <article class="hx-step" id="step-{key}" style="--node:{NODE_COLORS[n - 1]};">
            <div class="hx-step-nodes"><span class="hx-step-num">{n:02d}</span><span class="hx-step-icon"><i data-lucide="{icon}"></i></span></div>
            <div class="hx-step-card">
              <div class="hx-step-main">
                <h3 class="hx-step-title">{e(title)}</h3>
                <ul class="hx-bullets">{items}</ul>
                <ul class="hx-chips" aria-label="Key APIs">{chips}</ul>
              </div>
              <div class="hx-learn"><span class="hx-learn-tag">LEARN</span><div class="hx-learn-icons">{learn}</div></div>
            </div>
          </article>'''


def sidebar(h):
    m = h["modules"]
    tools = "".join(f'<div class="hx-tool">{logo(t)}<span>{e(ICON_LABELS[t])}</span></div>' for t in TOOLS[h["slug"]])
    skills = [
        ("database", "State & Memory", f'{m["state"]["m"]}; {m["memory"]["m"]}'),
        ("git-branch", "Control Flow", f'{m["edges"]["m"]}; {m["lifecycle"]["m"]}'),
        ("square-function", "Tools, RAG & MCP", f'{m["tools"]["m"]}; {m["rag"]["m"]}; {m["mcp"]["m"]}'),
        ("shield-check", "Safety & Oversight", f'{m["guardrails"]["m"]}; {m["hitl"]["m"]}'),
        ("rocket", "Production Operations", f'{m["testing"]["m"]}; {m["auditing"]["m"]}; {m["mlops"]["m"]}'),
    ]
    skills_html = "".join(
        f'<div class="hx-skill"><span><i data-lucide="{i}"></i></span><div><strong>{e(t)}</strong><p>{e(d)}</p></div></div>'
        for i, t, d in skills)
    facts = "".join(f'<div class="hx-fact"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in h["glance"])
    return f'''        <aside class="hx-side">
          <section class="hx-card">
            <h3 class="hx-card-head" style="--head:#1e293b;"><i data-lucide="wrench"></i>Essential Tools</h3>
            <div class="hx-card-body">{tools}</div>
          </section>
          <section class="hx-card">
            <h3 class="hx-card-head" style="--head:#312e81;"><i data-lucide="award"></i>Skills You Will Gain</h3>
            <div class="hx-card-body">{skills_html}</div>
          </section>
          <section class="hx-card">
            <h3 class="hx-card-head" style="--head:#0f766e;"><i data-lucide="info"></i>At a Glance</h3>
            <div class="hx-card-body"><dl class="hx-facts">{facts}</dl></div>
          </section>
        </aside>'''


def poster(h):
    name = h["name"]
    tiles = "".join(f"<span>{logo(t, 24)}</span>" for t in TOOLS[h["slug"]][1:7])
    steps = "\n".join(step_html(h, n, *s) for n, s in enumerate(STEPS, 1))
    return f'''    <section class="hx-paper hx-poster" id="roadmap" aria-labelledby="roadmap-title">
      <header class="hx-poster-head">
        <div>
          <div class="hx-overline">Tinitiate AI IT Training &bull; 2026 Edition</div>
          <h1 class="hx-poster-title" id="roadmap-title">{e(name.upper())} ROADMAP (2026)</h1>
          <span class="hx-pill">Step-by-step guide to production agents with {e(name)}</span>
          <p class="hx-lede">{e(h["lede"])}</p>
        </div>
        <div class="hx-head-art" aria-hidden="true">
          <div class="hx-head-logo">{logo(stem(h), 56)}</div>
          <div class="hx-head-tiles">{tiles}</div>
        </div>
      </header>
      <div class="hx-poster-body">
        <div class="hx-spine">
{steps}
        </div>
{sidebar(h)}
      </div>
    </section>'''


def matrix(h):
    head = "".join(
        f'<th scope="col"{CUR if x is h else ""}><a class="hx-col" href="../{x["slug"]}/index.html">'
        f'<span>{logo(stem(x))}</span>{e(x["name"])}</a></th>' for x in HARNESSES)
    rows = []
    for key, label, icon, color in ROWS:
        name = f"<code>{e(label)}</code>" if label.endswith(".md") else e(label)
        cells = []
        for x in HARNESSES:
            icons, prim, detail = MATRIX[key][x["slug"]]
            ic = "".join(f'<span title="{e(ICON_LABELS[i])}">{logo(i, 16)}</span>' for i in icons)
            cells.append(f'<td{CUR if x is h else ""}><div class="hx-cell"><div class="hx-cell-icons">{ic}</div>'
                         f'<strong>{e(prim)}</strong><p>{e(detail)}</p></div></td>')
        rows.append(f'<tr><th scope="row"><div class="hx-row" style="--row:{color};"><span><i data-lucide="{icon}"></i></span>{name}</div></th>{"".join(cells)}</tr>')
    body = "\n            ".join(rows)
    return f'''    <section id="architecture-matrix" aria-labelledby="matrix-title">
      <div class="hx-paper hx-matrix-head">
        <div>
          <div class="hx-overline">Enterprise AI Architecture Matrix</div>
          <h2 id="matrix-title">{len(ROWS)} architectural layers across 7 agent harnesses</h2>
          <p>How each harness implements the same layer, from sandboxing and state to MCP, guardrails, the skills.md / memory.md / tools.md context files and model tuning.</p>
        </div>
        <span class="hx-legend"><i></i>{e(h["name"])} column</span>
      </div>
      <div class="hx-table-wrap" tabindex="0" aria-label="Architecture matrix, scrolls horizontally">
        <table class="hx-table">
          <thead><tr><th scope="col">Layer</th>{head}</tr></thead>
          <tbody>
            {body}
          </tbody>
        </table>
      </div>
    </section>'''


def main_html(h):
    return f'''{START_MARK}
  <main class="hx-page" data-harness="{h["slug"]}" style="--hx-accent:{h["accent"]};">

{poster(h)}

{matrix(h)}

  </main>

'''


def strands_shell():
    """Header/footer for the Strands page, derived from the Bedrock page."""
    src = (AI_DIR / "aws-bedrock" / "index.html").read_text(encoding="utf-8")
    src = src.replace('<span class="master-brand-badge">AWS Bedrock AI</span>',
                      '<span class="master-brand-badge">AWS Strands Agents</span>')
    src = re.sub(r'(<a href="index.html" class="master-nav-btn subject-home-btn" title=")[^"]*(">.*?<span>)[^<]*(</span>)',
                 r'\1AWS Strands Agents SDK: Model-Driven Agents\2Strands Agents\3', src, count=1, flags=re.S)
    src = re.sub(r'\s*<a href="demo.html" class="master-nav-btn".*?</a>', "", src, count=1, flags=re.S)
    return src


def build(h):
    target = AI_DIR / h["slug"] / "index.html"
    if target.exists():
        src = target.read_text(encoding="utf-8")
    elif h is STRANDS:
        src = strands_shell()
        target.parent.mkdir(exist_ok=True)
    else:
        raise FileNotFoundError(target)

    head, rest = src.split(START_MARK, 1)
    _, footer = rest.split(END_MARK, 1)

    title = f"{h['name']} Roadmap (2026) | Tinitiate MasterClass Academy"
    head = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", head, count=1, flags=re.S)
    desc = (f'<meta name="description" content="{e(h["name"])} roadmap 2026: state, edges, function calling, '
            f'RAG, MCP, orchestration, HITL, guardrails, testing, auditing, MLOps and an enterprise architecture matrix.">')
    head = re.sub(r'\s*<meta name="description"[^>]*>', "", head)
    head = head.replace("<title>", desc + "\n  <title>", 1)
    if "shared/harness.css" not in head:
        head = head.replace('<link rel="stylesheet" href="../../assets/css/master-global-layout.css">',
                            '<link rel="stylesheet" href="../../assets/css/master-global-layout.css">\n'
                            '  <link rel="stylesheet" href="../shared/harness.css">', 1)
    if FONT_LINK not in head:
        head = head.replace('  <link rel="stylesheet" href="../shared/harness.css">',
                            f'  {FONT_LINK}\n  <link rel="stylesheet" href="../shared/harness.css">', 1)
    if "hx-body" not in head:
        head = head.replace('<body class="theme-dark">', '<body class="theme-dark hx-body">', 1)
    footer = footer.replace('  <script src="../shared/harness.js"></script>\n', "")

    target.write_text(head + main_html(h) + END_MARK + footer, encoding="utf-8", newline="\n")
    print("wrote", target.relative_to(AI_DIR.parent))


if __name__ == "__main__":
    for harness in HARNESSES:
        for key, *_ in ROWS:
            assert harness["slug"] in MATRIX[key], (key, harness["slug"])
        build(harness)
