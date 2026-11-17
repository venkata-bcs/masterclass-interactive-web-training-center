/* ==========================================================================
   NeuralAtlas — core shell: folder-tree navigation, topbar, command palette,
   scroll-spy, reveal animations and small shared helpers (window.App).
   ========================================================================== */
(function () {
  const D = window.APP_DATA;
  const page = document.body.dataset.page || 'home';

  const CAT_COLORS = {
    Overview: '#38bdf8', Automation: '#2dd4bf', 'Machine Learning': '#8b5cf6',
    AI: '#ec4899', Agentic: '#f59e0b', Industries: '#4ade80', Architecture: '#60a5fa'
  };
  const CAT_ICONS = {
    Overview: 'home', Automation: 'workflow', 'Machine Learning': 'brain-circuit',
    AI: 'sparkles', Agentic: 'bot', Industries: 'building-2', Architecture: 'layers'
  };

  /* ---------------- Navigation tree definition ---------------- */
  const NAV = [
    {
      label: 'home', icon: 'home', href: 'index.html', page: 'home', color: '#38bdf8', children: [
        { label: 'compare.radar', icon: 'radar', href: 'index.html#compare' },
        { label: 'timeline.d3', icon: 'history', href: 'index.html#timeline' },
        { label: 'comparison.table', icon: 'table-2', href: 'index.html#table' }
      ]
    },
    {
      label: 'foundations', icon: 'folder', children: [
        {
          label: 'automation', icon: 'workflow', href: 'automation.html', page: 'automation', color: '#2dd4bf', children: [
            { label: 'invoice-workflow.flow', icon: 'git-branch', href: 'automation.html#workflow' },
            { label: 'roi-calculator.chart', icon: 'calculator', href: 'automation.html#roi' },
            { label: 'maturity-ladder', icon: 'signal', href: 'automation.html#levels' },
            { label: 'types-of-automation', icon: 'boxes', href: 'automation.html#types' }
          ]
        },
        {
          label: 'machine-learning', icon: 'brain-circuit', href: 'ml.html', page: 'ml', color: '#8b5cf6', children: [
            { label: 'types-of-ml', icon: 'shapes', href: 'ml.html#types' },
            { label: 'classifier.playground', icon: 'scatter-chart', href: 'ml.html#classifier' },
            { label: 'gradient-descent.viz', icon: 'trending-down', href: 'ml.html#gradient' },
            { label: 'neural-net.viz', icon: 'share-2', href: 'ml.html#neural' },
            { label: 'mlops.flow', icon: 'refresh-cw', href: 'ml.html#mlops' }
          ]
        },
        {
          label: 'artificial-intelligence', icon: 'sparkles', href: 'ai.html', page: 'ai', color: '#ec4899', children: [
            { label: 'landscape.pack', icon: 'circle-dot', href: 'ai.html#landscape' },
            { label: 'attention.heatmap', icon: 'grid-3x3', href: 'ai.html#attention' },
            { label: 'next-token.sampler', icon: 'dice-5', href: 'ai.html#nexttoken' },
            { label: 'rag.flow', icon: 'database-zap', href: 'ai.html#rag' }
          ]
        },
        {
          label: 'agentic', icon: 'bot', href: 'agentic.html', page: 'agentic', color: '#f59e0b', children: [
            { label: 'agent-loop.cycle', icon: 'rotate-cw', href: 'agentic.html#loop' },
            { label: 'multi-agent.sim', icon: 'play-circle', href: 'agentic.html#simulator' },
            { label: 'design-patterns', icon: 'puzzle', href: 'agentic.html#patterns' },
            { label: 'autonomy-levels', icon: 'gauge', href: 'agentic.html#autonomy' },
            { label: 'guardrails', icon: 'shield-check', href: 'agentic.html#guardrails' }
          ]
        }
      ]
    },
    {
      label: 'industries', icon: 'building-2', href: 'industries.html', page: 'industries', color: '#4ade80',
      children: [{ label: 'adoption.heatmap', icon: 'grid-3x3', href: 'industries.html#heatmap' }]
        .concat(D.INDUSTRIES.map(i => ({ label: i.id, emoji: i.emoji, href: `industries.html#${i.id}` })))
    },
    {
      label: 'architecture', icon: 'layers', href: 'architecture.html', page: 'architecture', color: '#60a5fa',
      children: D.ARCHITECTURES.map(a => ({ label: a.id + '.joint', icon: a.icon, href: `architecture.html#${a.id}` }))
    },
    { label: 'search', icon: 'search', href: 'search.html', page: 'search', color: '#e2e8f0' }
  ];

  /* ---------------- Helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const fileName = () => (location.pathname.split('/').pop() || 'index.html');

  const OPEN_KEY = 'na.tree.open';
  const openState = JSON.parse(localStorage.getItem(OPEN_KEY) || '{}');
  const saveOpen = () => localStorage.setItem(OPEN_KEY, JSON.stringify(openState));

  function containsPage(node) {
    if (node.page === page) return true;
    return (node.children || []).some(containsPage);
  }

  function renderNode(node, path) {
    const key = path + '/' + node.label;
    const isFolder = !!node.children;
    const li = document.createElement('li');
    li.className = isFolder ? 'tree-folder' : 'tree-file';
    const isOpen = openState[key] !== undefined ? openState[key] : containsPage(node);
    if (isFolder && (isOpen || containsPage(node))) li.classList.add('open');

    const row = document.createElement(node.href ? 'a' : 'div');
    row.className = 'tree-row';
    if (node.href) row.href = node.href;
    row.dataset.href = node.href || '';
    const caret = isFolder ? '<i data-lucide="chevron-right" class="caret"></i>' : '<span class="caret-spacer"></span>';
    const ico = node.emoji
      ? `<span class="ico" style="font-size:13px;line-height:16px">${node.emoji}</span>`
      : `<i data-lucide="${isFolder && !node.page ? (li.classList.contains('open') ? 'folder-open' : 'folder') : node.icon}" class="ico" style="${node.color ? 'color:' + node.color : ''}"></i>`;
    row.innerHTML = `${caret}${ico}<span class="lbl">${esc(node.label)}${isFolder ? '/' : ''}</span>${node.page === page ? `<span class="dot" style="color:${node.color || '#8b5cf6'};background:${node.color || '#8b5cf6'}"></span>` : ''}`;
    if (node.page === page) row.classList.add('active');
    li.appendChild(row);

    if (isFolder) {
      const toggle = (e) => {
        e.preventDefault(); e.stopPropagation();
        li.classList.toggle('open');
        openState[key] = li.classList.contains('open');
        saveOpen();
      };
      const caretEl = row.querySelector('.caret');
      caretEl.addEventListener('click', toggle);
      if (!node.href) row.addEventListener('click', toggle);
      else row.addEventListener('dblclick', toggle);
      const ul = document.createElement('ul');
      node.children.forEach(c => ul.appendChild(renderNode(c, key)));
      li.appendChild(ul);
    }
    return li;
  }

  function findTrail(nodes, trail = []) {
    for (const n of nodes) {
      if (n.page === page) return trail.concat(n);
      if (n.children) { const t = findTrail(n.children, trail.concat(n)); if (t) return t; }
    }
    return null;
  }

  /* ---------------- Build shell ---------------- */
  function buildSidebar() {
    const sb = $('#sidebar');
    if (!sb) return;
    sb.classList.add('sidebar');
    sb.innerHTML = `
      <a class="brand" href="index.html" aria-label="NeuralAtlas home">
        <div class="brand-logo">N</div>
        <div><div class="brand-name">NeuralAtlas</div><div class="brand-sub">automation → agents</div></div>
      </a>
      <div class="tree-label">Explorer · ~/neural-atlas</div>
      <nav aria-label="Folder navigation"><ul class="tree" id="tree"></ul></nav>
      <div class="tree-label">Pillars</div>
      <div style="padding:0 20px" class="legend">
        <span><i style="background:var(--c-auto)"></i>Automation</span>
        <span><i style="background:var(--c-ml)"></i>ML</span>
        <span><i style="background:var(--c-ai)"></i>AI</span>
        <span><i style="background:var(--c-agent)"></i>Agentic</span>
      </div>
      <div class="sidebar-foot">⌘/Ctrl + K to search<br>Double-click a folder to collapse</div>`;
    const tree = $('#tree', sb);
    NAV.forEach(n => tree.appendChild(renderNode(n, '')));
  }

  function buildTopbar() {
    const tb = $('#topbar');
    if (!tb) return;
    tb.classList.add('topbar');
    const trail = findTrail(NAV) || [];
    const crumbs = ['<a href="index.html">~</a>'].concat(trail.map((n, i) => {
      const last = i === trail.length - 1;
      return `<span>/</span>${n.href && !last ? `<a href="${n.href}">${esc(n.label)}</a>` : `<span class="${last ? 'cur' : ''}">${esc(n.label)}</span>`}`;
    })).join('');
    tb.innerHTML = `
      <button class="menu-btn" id="menu-btn" aria-label="Open navigation"><i data-lucide="menu"></i></button>
      <div class="crumbs">${crumbs}<span id="crumb-hash" class="cur"></span></div>
      <div class="spacer"></div>
      <button class="search-trigger" id="search-trigger" aria-label="Search">
        <i data-lucide="search"></i><span class="st-text">Search topics, demos, industries…</span><span class="kbd">Ctrl K</span>
      </button>`;
    $('#menu-btn').addEventListener('click', e => { e.stopPropagation(); document.body.classList.toggle('nav-open'); });
    document.addEventListener('click', e => {
      if (document.body.classList.contains('nav-open') && !e.target.closest('#sidebar')) document.body.classList.remove('nav-open');
    });
    $('#search-trigger').addEventListener('click', openPalette);
  }

  /* ---------------- Search engine ---------------- */
  function search(q, cat) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let pool = D.SEARCH_INDEX;
    if (cat && cat !== 'All') pool = pool.filter(e => e.cat === cat);
    if (!terms.length) return pool.map(e => ({ e, score: 0 }));
    const out = [];
    for (const e of pool) {
      const title = e.title.toLowerCase(), text = e.text.toLowerCase(), tags = e.tags.join(' ').toLowerCase(), c = e.cat.toLowerCase();
      let score = 0, all = true;
      for (const t of terms) {
        let s = 0;
        if (title.includes(t)) s += 6 + (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(title) ? 3 : 0);
        if (tags.includes(t)) s += 4;
        if (c.includes(t)) s += 2;
        if (text.includes(t)) s += 1 + Math.min(3, text.split(t).length - 2);
        if (!s) { all = false; break; }
        score += s;
      }
      if (all) out.push({ e, score });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  function highlight(str, q) {
    let html = esc(str);
    q.toLowerCase().split(/\s+/).filter(t => t.length > 1).forEach(t => {
      const re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      html = html.replace(re, '<mark>$1</mark>');
    });
    return html;
  }

  function snippet(text, q, len = 140) {
    const t = q.toLowerCase().split(/\s+/).filter(Boolean)[0];
    let i = t ? text.toLowerCase().indexOf(t) : -1;
    if (i < 0 || text.length <= len) return text.slice(0, len) + (text.length > len ? '…' : '');
    const start = Math.max(0, i - 40);
    return (start ? '…' : '') + text.slice(start, start + len) + (start + len < text.length ? '…' : '');
  }

  function resultHTML(r, q, idx, sel) {
    const e = r.e, color = CAT_COLORS[e.cat] || '#8b5cf6';
    return `<a class="result ${idx === sel ? 'sel' : ''}" href="${e.href}" data-idx="${idx}" style="--rc:${color}">
      <span class="r-ico"><i data-lucide="${CAT_ICONS[e.cat] || 'file'}"></i></span>
      <span><div class="r-title">${highlight(e.title, q)}</div>
      <div class="r-path">${esc(e.cat)} · ${esc(e.href)}</div>
      <div class="r-text">${highlight(snippet(e.text, q), q)}</div></span></a>`;
  }

  /* ---------------- Command palette ---------------- */
  let pal, palInput, palList, sel = 0, current = [];
  function buildPalette() {
    pal = document.createElement('div');
    pal.className = 'palette-overlay';
    pal.innerHTML = `<div class="palette" role="dialog" aria-label="Search">
      <div class="palette-input"><i data-lucide="search"></i><input id="palette-input" placeholder="Search demos, concepts, industries, diagrams…" autocomplete="off"><span class="kbd">Esc</span></div>
      <div class="palette-results" id="palette-results"></div>
      <div class="palette-foot"><span>↑↓ navigate</span><span>↵ open</span><span>Shift+↵ full results</span></div></div>`;
    document.body.appendChild(pal);
    palInput = $('#palette-input', pal);
    palList = $('#palette-results', pal);
    pal.addEventListener('click', e => { if (e.target === pal) closePalette(); });
    palInput.addEventListener('input', () => { sel = 0; renderPalette(); });
    palInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { sel = Math.min(current.length - 1, sel + 1); renderPalette(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); renderPalette(); e.preventDefault(); }
      else if (e.key === 'Enter') {
        if (e.shiftKey || !current[sel]) location.href = 'search.html?q=' + encodeURIComponent(palInput.value);
        else go(current[sel].e.href);
      } else if (e.key === 'Escape') closePalette();
    });
    palList.addEventListener('click', e => {
      const a = e.target.closest('.result'); if (!a) return;
      e.preventDefault(); go(a.getAttribute('href'));
    });
  }
  function go(href) {
    closePalette();
    const [file, hash] = href.split('#');
    if (file === fileName() && hash) { location.hash = hash; }
    else location.href = href;
  }
  function renderPalette() {
    const q = palInput.value.trim();
    current = search(q).slice(0, 9);
    palList.innerHTML = current.length
      ? current.map((r, i) => resultHTML(r, q, i, sel)).join('')
      : `<div class="muted" style="padding:24px;text-align:center">No results for “${esc(q)}”</div>`;
    icons();
    const s = palList.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function openPalette() { pal.classList.add('open'); palInput.value = ''; sel = 0; renderPalette(); setTimeout(() => palInput.focus(), 30); }
  function closePalette() { pal.classList.remove('open'); }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? closePalette() : openPalette(); }
    else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
  });

  /* ---------------- Scroll-spy & hash highlighting ---------------- */
  function markHash() {
    const href = fileName() + location.hash;
    $$('.tree-row.spy').forEach(r => r.classList.remove('spy'));
    if (location.hash) {
      const row = $$('.tree-row').find(r => r.dataset.href === href);
      if (row) row.classList.add('spy');
      const ch = $('#crumb-hash'); if (ch) ch.textContent = ' #' + location.hash.slice(1);
    }
  }
  function scrollSpy() {
    const sections = $$('section[id]');
    if (!sections.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const href = fileName() + '#' + en.target.id;
        const row = $$('.tree-row').find(r => r.dataset.href === href);
        if (row) { $$('.tree-row.spy').forEach(r => r.classList.remove('spy')); row.classList.add('spy'); }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------------- Reveal + counters + range fill ---------------- */
  function reveal() {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.08 });
    $$('.reveal').forEach(el => io.observe(el));
  }
  function counters() {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target, end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1400;
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
        el.textContent = pre + v.toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.4 });
    $$('[data-count]').forEach(el => io.observe(el));
  }
  function fillRange(el) {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--p', p + '%');
  }
  function ranges() {
    $$('input[type=range]').forEach(el => { fillRange(el); el.addEventListener('input', () => fillRange(el)); });
  }

  /* ---------------- Tabs (generic) ---------------- */
  function tabs(root, onChange) {
    const btns = $$('.tab', root);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.toggle('active', x === b));
      const target = b.dataset.tab;
      const scope = root.closest('[data-tabs-scope]') || document;
      $$('.tab-panel', scope).forEach(p => { if (p.dataset.group === root.dataset.group) p.classList.toggle('active', p.dataset.panel === target); });
      onChange && onChange(target);
    }));
  }

  /* ---------------- Tooltip ---------------- */
  const tipEl = document.createElement('div');
  tipEl.className = 'd3-tip';
  const tip = {
    show(html, evt) { tipEl.innerHTML = html; tipEl.style.opacity = 1; tip.move(evt); },
    move(evt) {
      const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      let x = evt.clientX + 14, y = evt.clientY + 14;
      if (x + w > innerWidth - 8) x = evt.clientX - w - 14;
      if (y + h > innerHeight - 8) y = evt.clientY - h - 14;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    },
    hide() { tipEl.style.opacity = 0; }
  };

  /* ---------------- Footer ---------------- */
  function footer() {
    const c = $('.content');
    if (!c || $('.site-foot', c)) return;
    const f = document.createElement('footer');
    f.className = 'site-foot';
    f.innerHTML = `<span>NeuralAtlas · An interactive guide to Automation, ML, AI & Agentic systems</span>
      <span class="mono">Built with D3.js · JointJS · Lucide · vanilla CSS</span>`;
    c.appendChild(f);
  }

  /* ---------------- Init ---------------- */
  window.App = { $, $$, esc, sleep, icons, tip, tabs, search, highlight, snippet, resultHTML, fillRange, CAT_COLORS, NAV, openPalette };

  function init() {
    if (!$('.aurora')) {
      const a = document.createElement('div'); a.className = 'aurora';
      a.innerHTML = '<div class="grid-bg"></div><span></span>';
      document.body.prepend(a);
    }
    document.body.appendChild(tipEl);
    buildSidebar();
    buildTopbar();
    buildPalette();
    footer();
    icons();
    reveal();
    counters();
    ranges();
    scrollSpy();
    markHash();
    window.addEventListener('hashchange', markHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
