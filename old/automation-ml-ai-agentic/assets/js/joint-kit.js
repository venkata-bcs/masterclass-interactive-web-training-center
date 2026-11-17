/* ==========================================================================
   JointKit — a thin wrapper around JointJS (@joint/core v4) giving every page
   consistent, animated, interactive diagrams:
     • custom glowing node shape with icon/title/subtitle
     • group "zones", smooth links with optional labels
     • pan (drag blank), wheel zoom, fit-to-content, SVG export
     • highlight / token-pulse animations and step-by-step "run" sequences
   ========================================================================== */
(function () {
  if (!window.joint) { console.warn('JointJS not loaded'); return; }

  const KIND = {
    auto: { color: '#2dd4bf', name: 'Automation' },
    ml: { color: '#8b5cf6', name: 'Machine Learning' },
    ai: { color: '#ec4899', name: 'AI / GenAI' },
    agent: { color: '#f59e0b', name: 'Agent' },
    data: { color: '#38bdf8', name: 'Data / Event' },
    human: { color: '#a3e635', name: 'Human' },
    tool: { color: '#94a3b8', name: 'Tool / System' },
    user: { color: '#e2e8f0', name: 'User / Channel' },
    guard: { color: '#f87171', name: 'Guardrail / Security' }
  };

  const Node = joint.dia.Element.define('kit.Node', {
    size: { width: 184, height: 64 },
    attrs: {
      body: { width: 'calc(w)', height: 'calc(h)', rx: 14, ry: 14, fill: '#0f1630', stroke: '#8b5cf6', strokeWidth: 1.4 },
      accent: { x: 0, y: 12, width: 4, height: 'calc(h-24)', rx: 2, fill: '#8b5cf6' },
      iconBg: { cx: 32, cy: 'calc(0.5*h)', r: 18, fill: '#8b5cf6', fillOpacity: 0.16 },
      icon: { x: 32, y: 'calc(0.5*h)', fontSize: 18, textAnchor: 'middle', textVerticalAnchor: 'middle', text: '' },
      title: { x: 58, y: 'calc(0.5*h-8)', fontSize: 13, fontWeight: 600, fill: '#e7ebff', fontFamily: 'Inter, sans-serif', textVerticalAnchor: 'middle', text: '' },
      sub: { x: 58, y: 'calc(0.5*h+10)', fontSize: 10.5, fill: '#8b95b8', fontFamily: 'Inter, sans-serif', textVerticalAnchor: 'middle', text: '' }
    }
  }, {
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'rect', selector: 'accent' },
      { tagName: 'circle', selector: 'iconBg' },
      { tagName: 'text', selector: 'icon' },
      { tagName: 'text', selector: 'title' },
      { tagName: 'text', selector: 'sub' }
    ]
  });

  const Group = joint.dia.Element.define('kit.Group', {
    attrs: {
      root: { pointerEvents: 'none' },
      body: { width: 'calc(w)', height: 'calc(h)', rx: 18, ry: 18, fill: '#8b5cf6', fillOpacity: 0.04, stroke: '#8b5cf6', strokeOpacity: 0.35, strokeDasharray: '6 6', strokeWidth: 1.2 },
      label: { x: 16, y: 18, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, fill: '#8b5cf6', fontFamily: 'JetBrains Mono, monospace', textVerticalAnchor: 'middle', text: '' }
    }
  }, {
    markup: [{ tagName: 'rect', selector: 'body' }, { tagName: 'text', selector: 'label' }]
  });

  joint.shapes.kit = { Node, Group };

  function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function create(el, opts = {}) {
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const height = el.clientHeight || 480;
    const paper = new joint.dia.Paper({
      el: document.createElement('div'),
      model: graph,
      width: '100%',
      height: '100%',
      gridSize: 10,
      async: false,
      background: { color: 'transparent' },
      cellViewNamespace: joint.shapes,
      defaultConnectionPoint: { name: 'boundary', args: { offset: 4 } },
      interactive: (cv) => {
        if (cv.model.isLink()) return false;
        if (cv.model.get('type') === 'kit.Group') return false;
        return opts.draggable === false ? false : { elementMove: true };
      }
    });
    el.appendChild(paper.el);
    el.classList.add('diagram');
    if (opts.flow !== false) el.classList.add('kit-flow');

    const state = { nodes: {}, links: {}, spec: null, selected: null };

    /* ---- Tools overlay ---- */
    const tools = document.createElement('div');
    tools.className = 'diagram-tools';
    tools.innerHTML = `
      <button title="Zoom in" data-a="in"><i data-lucide="zoom-in"></i></button>
      <button title="Zoom out" data-a="out"><i data-lucide="zoom-out"></i></button>
      <button title="Fit to screen" data-a="fit"><i data-lucide="maximize"></i></button>
      <button title="Toggle flow animation" data-a="flow"><i data-lucide="activity"></i></button>
      ${opts.exportable ? '<button title="Export SVG" data-a="svg"><i data-lucide="download"></i></button>' : ''}`;
    el.appendChild(tools);
    const hint = document.createElement('div');
    hint.className = 'diagram-hint';
    hint.textContent = opts.hint || 'drag nodes · drag canvas to pan · scroll to zoom · click to inspect';
    el.appendChild(hint);
    tools.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'in') zoomBy(1.2);
      if (a === 'out') zoomBy(1 / 1.2);
      if (a === 'fit') fit();
      if (a === 'flow') el.classList.toggle('kit-flow');
      if (a === 'svg') exportSVG(opts.exportName || 'diagram');
    });
    if (window.lucide) window.lucide.createIcons();

    /* ---- Pan & zoom ---- */
    let pan = null;
    paper.on('blank:pointerdown', (evt) => {
      const t = paper.translate();
      pan = { x: evt.clientX, y: evt.clientY, tx: t.tx, ty: t.ty };
    });
    const onMove = (e) => { if (pan) paper.translate(pan.tx + e.clientX - pan.x, pan.ty + e.clientY - pan.y); };
    const onUp = () => { pan = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    function zoomAt(factor, cx, cy) {
      const s = paper.scale().sx, t = paper.translate();
      const ns = Math.max(0.25, Math.min(2.5, s * factor));
      const lx = (cx - t.tx) / s, ly = (cy - t.ty) / s;
      paper.scale(ns, ns);
      paper.translate(cx - lx * ns, cy - ly * ns);
    }
    function zoomBy(f) { zoomAt(f, el.clientWidth / 2, el.clientHeight / 2); }
    el.addEventListener('wheel', e => {
      if (opts.wheel === false) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    function fit() {
      if (!el.clientWidth || !graph.getElements().length) return;
      const opt = { padding: opts.padding || 36, maxScale: opts.maxScale || 1.1, minScale: 0.2, horizontalAlign: 'middle', verticalAlign: 'middle' };
      if (paper.transformToFitContent) paper.transformToFitContent(opt);
      else paper.scaleContentToFit(opt);
    }
    if (window.ResizeObserver) {
      let raf;
      new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); }).observe(el);
    }

    /* ---- Selection ---- */
    paper.on('element:pointerclick', (view) => {
      const id = view.model.get('kitId');
      if (!id) return;
      select(id);
    });
    paper.on('blank:pointerclick', () => select(null));
    function select(id) {
      if (state.selected && state.nodes[state.selected]) viewEl(state.selected)?.classList.remove('kit-selected');
      state.selected = id;
      if (id) viewEl(id)?.classList.add('kit-selected');
      opts.onSelect && opts.onSelect(id ? state.nodes[id].spec : null);
    }

    function viewEl(id) {
      const n = state.nodes[id]; if (!n) return null;
      const v = paper.findViewByModel(n.cell); return v ? v.el : null;
    }

    /* ---- Load a spec ---- */
    function load(spec) {
      state.spec = spec;
      graph.clear();
      state.nodes = {}; state.links = {}; state.selected = null;
      const cells = [];
      (spec.groups || []).forEach(g => {
        const c = g.color || '#8b5cf6';
        const cell = new Group({
          position: { x: g.x, y: g.y }, size: { width: g.w, height: g.h }, z: -1,
          attrs: { body: { fill: c, stroke: c }, label: { text: String(g.label).toUpperCase(), fill: c } }
        });
        cells.push(cell);
      });
      spec.nodes.forEach(n => {
        const k = KIND[n.kind] || KIND.tool;
        const w = n.w || 184, h = n.h || 64;
        const maxChars = Math.floor((w - 66) / 7.2);
        const cell = new Node({
          position: { x: n.x, y: n.y }, size: { width: w, height: h }, kitId: n.id,
          attrs: {
            body: { stroke: k.color },
            accent: { fill: k.color },
            iconBg: { fill: k.color },
            icon: { text: n.icon || '•' },
            title: { text: truncate(n.title, maxChars) },
            sub: { text: truncate(n.sub || k.name, Math.floor(maxChars * 1.2)) }
          }
        });
        cells.push(cell);
        state.nodes[n.id] = { cell, spec: Object.assign({ kindName: k.name, color: k.color }, n) };
      });
      (spec.links || []).forEach(l => {
        const [from, to, label, style] = Array.isArray(l) ? l : [l.from, l.to, l.label, l.style];
        if (!state.nodes[from] || !state.nodes[to]) return;
        const dashed = style === 'dashed';
        const link = new joint.shapes.standard.Link({
          source: { id: state.nodes[from].cell.id },
          target: { id: state.nodes[to].cell.id },
          connector: { name: 'smooth' },
          z: 0,
          attrs: {
            line: {
              stroke: dashed ? '#4b5683' : '#3b4a80', strokeWidth: 1.6,
              strokeDasharray: dashed ? '4 4' : null,
              targetMarker: { type: 'path', d: 'M 8 -4 0 0 8 4 z', fill: '#5b6aa8', stroke: 'none' }
            },
            wrapper: { cursor: 'default' }
          }
        });
        if (label) link.labels([{
          attrs: {
            text: { text: label, fill: '#c5cdf0', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
            rect: { fill: '#0b1126', stroke: '#2a3561', strokeWidth: 1, rx: 5, ry: 5 }
          }
        }]);
        cells.push(link);
        state.links[from + '->' + to] = link;
      });
      graph.resetCells(cells);
      // tag views with classes and kind color var for CSS glows
      graph.getElements().forEach(cell => {
        const v = paper.findViewByModel(cell); if (!v) return;
        if (cell.get('type') === 'kit.Group') v.el.classList.add('kit-group');
      });
      Object.values(state.nodes).forEach(n => {
        const v = paper.findViewByModel(n.cell); if (v) v.el.style.setProperty('--kc', n.spec.color);
      });
      requestAnimationFrame(fit);
    }

    /* ---- Animation primitives ---- */
    function clear() {
      el.classList.remove('kit-running');
      Object.keys(state.nodes).forEach(id => { const v = viewEl(id); v && v.classList.remove('kit-active', 'kit-done'); });
    }
    function highlight(id, on = true) {
      const v = viewEl(id); if (!v) return;
      el.classList.add('kit-running');
      v.classList.toggle('kit-active', on);
      if (!on) v.classList.add('kit-done');
    }
    function pulse(from, to, color, duration = 700) {
      const link = state.links[from + '->' + to];
      const reverse = !link && state.links[to + '->' + from];
      const l = link || reverse;
      if (!l) return new Promise(r => setTimeout(r, duration * 0.5));
      const lv = paper.findViewByModel(l);
      if (!lv) return Promise.resolve();
      const len = lv.getConnectionLength ? lv.getConnectionLength() : 0;
      const NS = 'http://www.w3.org/2000/svg';
      const c = color || (state.nodes[to] && state.nodes[to].spec.color) || '#f59e0b';
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'kit-token');
      g.style.color = c;
      g.innerHTML = `<circle r="9" fill="${c}" fill-opacity="0.25"></circle><circle r="5" fill="${c}"></circle>`;
      lv.el.appendChild(g);
      const line = lv.el.querySelector('[joint-selector="line"]');
      const prevStroke = line && line.getAttribute('stroke');
      if (line) { line.setAttribute('stroke', c); line.setAttribute('stroke-width', '2.6'); }
      return new Promise(resolve => {
        const t0 = performance.now();
        const step = now => {
          const p = Math.min(1, (now - t0) / duration);
          const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const pt = lv.getPointAtLength(len * (reverse ? 1 - e : e));
          if (pt) g.setAttribute('transform', `translate(${pt.x},${pt.y})`);
          if (p < 1) requestAnimationFrame(step);
          else {
            g.remove();
            if (line) { line.setAttribute('stroke', prevStroke || '#3b4a80'); line.setAttribute('stroke-width', '1.6'); }
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    }

    /* Run a path: array of node ids or {id, wait, log} objects. */
    let runToken = 0;
    async function run(path, { onStep, stepDelay = 520, pulseMs = 650 } = {}) {
      const my = ++runToken;
      clear();
      const steps = path.map(p => typeof p === 'string' ? { id: p } : p);
      for (let i = 0; i < steps.length; i++) {
        if (my !== runToken) return false;
        const s = steps[i];
        highlight(s.id, true);
        if (onStep) await onStep(s, i, state.nodes[s.id] && state.nodes[s.id].spec);
        await new Promise(r => setTimeout(r, s.wait || stepDelay));
        if (my !== runToken) return false;
        const next = steps[i + 1];
        if (next) {
          highlight(s.id, false);
          await pulse(s.id, next.id, null, pulseMs);
        }
      }
      return true;
    }
    function stop() { runToken++; clear(); }

    function exportSVG(name) {
      const svg = paper.svg.cloneNode(true);
      const bb = paper.getContentBBox ? paper.getContentBBox() : { x: 0, y: 0, width: el.clientWidth, height: el.clientHeight };
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('viewBox', `${bb.x - 20} ${bb.y - 20} ${bb.width + 40} ${bb.height + 40}`);
      svg.setAttribute('width', bb.width + 40); svg.setAttribute('height', bb.height + 40);
      svg.style.background = '#060914';
      const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name + '.svg'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    return { graph, paper, el, load, fit, highlight, clear, pulse, run, stop, select, exportSVG, state, zoomBy };
  }

  /* Serpentine auto-layout: steps -> nodes + chained links. */
  function serpentine(steps, cols = 3, dx = 250, dy = 150) {
    const nodes = steps.map((s, i) => {
      const row = Math.floor(i / cols), c = i % cols;
      const col = row % 2 === 0 ? c : cols - 1 - c;
      return Object.assign({ id: 's' + i, x: col * dx, y: row * dy }, s);
    });
    const links = nodes.slice(1).map((n, i) => [nodes[i].id, n.id]);
    return { nodes, links };
  }

  function legendHTML(kinds) {
    return (kinds || Object.keys(KIND)).map(k => `<span><i style="background:${KIND[k].color}"></i>${KIND[k].name}</span>`).join('');
  }

  /* Render a node spec into an inspector panel element */
  function inspect(panel, spec, emptyText) {
    if (!spec) {
      panel.innerHTML = `<div class="empty"><div><div style="font-size:2rem;margin-bottom:8px">👆</div>${emptyText || 'Click any node in the diagram to inspect it.'}</div></div>`;
      return;
    }
    panel.style.setProperty('--kc', spec.color);
    panel.innerHTML = `
      <div class="ins-head"><div class="ins-icon">${spec.icon || '•'}</div>
      <div><div class="kind">${spec.kindName}</div><h3 style="margin:0">${spec.title}</h3></div></div>
      <p>${spec.desc || spec.sub || ''}</p>
      ${spec.tech ? `<div style="margin-top:6px">${spec.tech.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}`;
  }

  window.JointKit = { create, serpentine, KIND, legendHTML, inspect };
})();
