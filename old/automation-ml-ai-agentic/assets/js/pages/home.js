/* Home page: hero network canvas, typing, evolution diagram, radar, timeline */
(function () {
  const { $, $$, tip, tabs, icons, sleep } = App;
  const { INDUSTRIES } = APP_DATA;
  const COLORS = ['#2dd4bf', '#8b5cf6', '#ec4899', '#f59e0b'];

  /* ---------------- Hero: interactive neural particle network ---------------- */
  (function hero() {
    const cv = $('#hero-canvas'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, pts = [], mouse = { x: -999, y: -999 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((W * H) / 9000);
      pts = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.8 + 0.8, c: COLORS[i % 4], ph: Math.random() * 6.28
      }));
    }
    cv.parentElement.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    cv.parentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -999; });
    window.addEventListener('resize', resize);
    resize();
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 160) { p.vx += dx / d * 0.02; p.vy += dy / d * 0.02; }
        p.vx *= 0.985; p.vy *= 0.985;
        p.vx += (Math.random() - .5) * 0.02; p.vy += (Math.random() - .5) * 0.02;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.strokeStyle = a.c; ctx.globalAlpha = (1 - d / 120) * 0.35; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        const glow = 0.6 + 0.4 * Math.sin(t / 600 + p.ph);
        ctx.globalAlpha = glow; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + glow * .4), 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------------- Typing effect ---------------- */
  (function typing() {
    const el = $('#typing'); if (!el) return;
    const lines = [
      '> if invoice.amount > 10000: route_to("approver")   # automation',
      '> model.predict(transaction) → fraud_prob = 0.93     # ML',
      '> llm("Summarize this contract in 3 bullets") …      # AI',
      '> agent.goal("Resolve ticket #4821") → plan, act, reflect  # agentic'
    ];
    let li = 0, ci = 0, del = false;
    el.classList.add('cursor-blink');
    (function tick() {
      const line = lines[li];
      el.textContent = line.slice(0, ci);
      if (!del && ci < line.length) { ci++; setTimeout(tick, 28); }
      else if (!del) { del = true; setTimeout(tick, 1800); }
      else if (ci > 0) { ci -= 2; setTimeout(tick, 10); }
      else { del = false; ci = 0; li = (li + 1) % lines.length; setTimeout(tick, 300); }
    })();
  })();

  /* ---------------- Evolution: refund email at four levels ---------------- */
  const EVO = {
    automation: {
      color: '#2dd4bf', title: 'Rule-based automation',
      text: 'A keyword rule spots “refund” and sends a canned reply. Fast and cheap — but sarcasm, typos or a new product break it.',
      pros: ['100% predictable', 'Cheap to run', 'Easy to audit'], cons: ['Brittle to variation', 'No understanding', 'Humans handle exceptions'],
      steps: [
        { icon: '📧', title: 'Email arrives', sub: 'Inbox trigger', kind: 'data', log: 'Trigger fired: new email in support@' },
        { icon: '🔤', title: 'Keyword rule', sub: 'contains "refund"', kind: 'auto', log: 'Rule matched: subject contains "refund"' },
        { icon: '📄', title: 'Template reply', sub: 'Canned response', kind: 'auto', log: 'Sent template #12 "We received your request"' },
        { icon: '🧑‍💼', title: 'Agent queue', sub: 'Human resolves', kind: 'human', log: 'Ticket queued for human agent (avg wait 2 days)' }
      ]
    },
    ml: {
      color: '#8b5cf6', title: 'Machine learning',
      text: 'A classifier trained on 200k past tickets predicts intent and fraud risk. Low-risk refunds are auto-approved by a rule.',
      pros: ['Handles phrasing variety', 'Learns from history', 'Measurable accuracy'], cons: ['Needs labeled data', 'Can drift over time', 'Fixed set of outputs'],
      steps: [
        { icon: '📧', title: 'Email arrives', sub: 'Inbox trigger', kind: 'data', log: 'New email ingested' },
        { icon: '🏷️', title: 'Intent classifier', sub: 'refund · 94%', kind: 'ml', log: 'Intent = refund_request (p=0.94)' },
        { icon: '🚩', title: 'Fraud model', sub: 'risk 0.07', kind: 'ml', log: 'Fraud risk score = 0.07 (low)' },
        { icon: '⚙️', title: 'Approve rule', sub: 'risk < 0.2', kind: 'auto', log: 'Rule: risk < 0.2 → auto-approve' },
        { icon: '💳', title: 'Refund API', sub: 'Payment system', kind: 'tool', log: 'Refund issued via payments API ✔' }
      ]
    },
    ai: {
      color: '#ec4899', title: 'Generative AI',
      text: 'An LLM reads the whole email, retrieves the refund policy (RAG) and drafts a personal, policy-accurate reply for a human to send.',
      pros: ['Understands nuance', 'Writes natural language', 'Grounded with RAG'], cons: ['Can hallucinate', 'Doesn’t take actions itself', 'Needs guardrails'],
      steps: [
        { icon: '📧', title: 'Email arrives', sub: 'Inbox trigger', kind: 'data', log: 'New email ingested' },
        { icon: '🧠', title: 'LLM understands', sub: 'Context + sentiment', kind: 'ai', log: 'LLM: customer upset, item arrived damaged, order #A-77' },
        { icon: '📚', title: 'Retrieve policy', sub: 'RAG · vector DB', kind: 'ai', log: 'Retrieved: "Damaged items → full refund within 30 days"' },
        { icon: '✍️', title: 'Draft reply', sub: 'Empathetic + cited', kind: 'ai', log: 'Drafted reply citing policy §4.2' },
        { icon: '🧑‍💼', title: 'Human sends', sub: 'Review & click', kind: 'human', log: 'Human reviewed draft and sent (45s)' }
      ]
    },
    agentic: {
      color: '#f59e0b', title: 'Agentic AI',
      text: 'An agent owns the goal “resolve this refund”. It plans, looks up the order, checks policy, issues the refund, replies — and asks a human only when stakes are high.',
      pros: ['End-to-end resolution', 'Uses tools & memory', 'Adapts plan on the fly'], cons: ['Needs strict permissions', 'Harder to test', 'Must monitor cost & loops'],
      steps: [
        { icon: '📧', title: 'Email arrives', sub: 'Goal created', kind: 'data', log: 'Goal: resolve refund request from jane@…' },
        { icon: '🤖', title: 'Agent plans', sub: '4-step plan', kind: 'agent', log: 'Plan: lookup order → check policy → refund → reply' },
        { icon: '🔎', title: 'Lookup order', sub: 'tool: orders.get', kind: 'tool', log: 'Action orders.get(A-77) → $129, delivered 3d ago' },
        { icon: '📚', title: 'Check policy', sub: 'RAG', kind: 'ai', log: 'Observation: eligible for full refund' },
        { icon: '💳', title: 'Issue refund', sub: 'tool: payments', kind: 'tool', log: 'Action payments.refund($129) ✔' },
        { icon: '✉️', title: 'Reply & close', sub: 'Personalized', kind: 'ai', log: 'Reply sent, ticket closed, memory updated' },
        { icon: '🧑‍⚖️', title: 'Human if > $500', sub: 'Guardrail', kind: 'human', log: 'Guardrail not triggered (amount < $500)' }
      ]
    }
  };

  let evoKit, evoLevel = 'automation';
  function renderEvoInfo(level, logs) {
    const e = EVO[level];
    $('#evo-info').innerHTML = `
      <span class="section-num" style="color:${e.color}">LEVEL · ${level.toUpperCase()}</span>
      <h3>${e.title}</h3><p>${e.text}</p>
      <div class="grid g-2" style="gap:10px;margin-bottom:12px">
        <div>${e.pros.map(p => `<div style="font-size:.84rem">✅ ${p}</div>`).join('')}</div>
        <div>${e.cons.map(p => `<div style="font-size:.84rem">⚠️ ${p}</div>`).join('')}</div>
      </div>
      <div class="terminal"><div class="terminal-bar"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#4ade80"></i><span style="margin-left:8px">run.log</span></div>
      <div class="terminal-body" id="evo-log" style="height:140px">${logs || '<div class="ln sys">Press Play to run this level…</div>'}</div></div>`;
  }
  function loadEvo(level) {
    evoLevel = level;
    evoKit.stop();
    const spec = JointKit.serpentine(EVO[level].steps, 4, 235, 130);
    evoKit.load(spec);
    renderEvoInfo(level);
  }
  if ($('#evo-diagram')) {
    evoKit = JointKit.create($('#evo-diagram'), { padding: 24, maxScale: 1, hint: 'press play · drag to rearrange' });
    tabs($('#evo-tabs'), loadEvo);
    loadEvo('automation');
    $('#evo-run').addEventListener('click', async () => {
      const level = evoLevel;
      const spec = evoKit.state.spec;
      const log = $('#evo-log'); log.innerHTML = '';
      await evoKit.run(spec.nodes.map(n => n.id), {
        onStep: (s, i, node) => {
          if (level !== evoLevel) return;
          const t = (i * 0.8 + Math.random() * 0.3).toFixed(1);
          log.insertAdjacentHTML('beforeend', `<div class="ln ${node.kind === 'human' ? 'ok' : node.kind === 'agent' ? 'thought' : 'action'}"><span class="k">[${t}s] ${node.icon}</span> ${EVO[level].steps[i].log}</div>`);
          log.scrollTop = log.scrollHeight;
        }
      });
    });
  }

  /* ---------------- Radar chart ---------------- */
  const DIMS = ['Determinism', 'Adaptability', 'Autonomy', 'Data hunger', 'Explainability', 'Reasoning', 'Speed to deploy'];
  const SERIES = [
    { id: 'automation', name: 'Automation', color: '#2dd4bf', v: [10, 2, 3, 1, 10, 1, 8], note: 'Perfectly predictable and explainable, fast to deploy for stable processes — but zero adaptability.' },
    { id: 'ml', name: 'Machine Learning', color: '#8b5cf6', v: [6, 7, 4, 9, 5, 3, 4], note: 'Adapts to patterns in data but needs lots of it, plus MLOps to keep models fresh.' },
    { id: 'ai', name: 'AI / GenAI', color: '#ec4899', v: [3, 9, 5, 7, 3, 7, 7], note: 'Foundation models generalize broadly and deploy fast via APIs, at the cost of determinism.' },
    { id: 'agentic', name: 'Agentic AI', color: '#f59e0b', v: [2, 9, 9, 6, 4, 9, 4], note: 'Maximum autonomy and multi-step reasoning; requires guardrails, evaluation and observability.' }
  ];
  const active = new Set(SERIES.map(s => s.id));
  function drawRadar() {
    const svg = d3.select('#radar'); if (svg.empty()) return;
    const W = 560, H = 440, R = 165, cx = W / 2, cy = H / 2 + 6;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    const ang = i => (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const r = d3.scaleLinear([0, 10], [0, R]);
    const defs = svg.append('defs');
    SERIES.forEach(s => {
      const g = defs.append('radialGradient').attr('id', 'rg-' + s.id);
      g.append('stop').attr('offset', '0%').attr('stop-color', s.color).attr('stop-opacity', .05);
      g.append('stop').attr('offset', '100%').attr('stop-color', s.color).attr('stop-opacity', .35);
    });
    const g = svg.append('g');
    [2, 4, 6, 8, 10].forEach(l => {
      g.append('polygon').attr('points', DIMS.map((_, i) => [cx + Math.cos(ang(i)) * r(l), cy + Math.sin(ang(i)) * r(l)].join(',')).join(' '))
        .attr('fill', 'none').attr('stroke', 'rgba(120,140,220,.14)');
    });
    DIMS.forEach((d, i) => {
      g.append('line').attr('x1', cx).attr('y1', cy).attr('x2', cx + Math.cos(ang(i)) * R).attr('y2', cy + Math.sin(ang(i)) * R).attr('stroke', 'rgba(120,140,220,.14)');
      const lx = cx + Math.cos(ang(i)) * (R + 26), ly = cy + Math.sin(ang(i)) * (R + 20);
      g.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', Math.abs(Math.cos(ang(i))) < .2 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle').style('font-size', '12px').style('font-weight', 600).style('fill', '#a9b2d6').text(d);
    });
    const line = d3.lineRadial().angle((_, i) => ang(i) + Math.PI / 2).radius(d => r(d)).curve(d3.curveCardinalClosed.tension(.4));
    SERIES.filter(s => active.has(s.id)).forEach(s => {
      const path = g.append('path').datum(s.v).attr('transform', `translate(${cx},${cy})`)
        .attr('fill', `url(#rg-${s.id})`).attr('stroke', s.color).attr('stroke-width', 2.2)
        .style('filter', `drop-shadow(0 0 8px ${s.color}66)`)
        .attr('d', line(s.v.map(() => 0)));
      path.transition().duration(900).ease(d3.easeBackOut.overshoot(1.2)).attr('d', line(s.v));
      s.v.forEach((v, i) => {
        g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 4.5).attr('fill', s.color).attr('stroke', '#060914').attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseenter', e => tip.show(`<b style="color:${s.color}">${s.name}</b><br>${DIMS[i]}: <b>${v}/10</b>`, e))
          .on('mousemove', e => tip.move(e)).on('mouseleave', tip.hide)
          .transition().duration(900).ease(d3.easeBackOut)
          .attr('cx', cx + Math.cos(ang(i)) * r(v)).attr('cy', cy + Math.sin(ang(i)) * r(v));
      });
    });
    $('#radar-note').innerHTML = SERIES.filter(s => active.has(s.id)).map(s =>
      `<div style="border-left:3px solid ${s.color};padding:4px 0 4px 12px;margin-bottom:12px"><b style="color:${s.color}">${s.name}</b><p style="font-size:.86rem;margin:2px 0 0">${s.note}</p></div>`).join('') || '<p class="muted">Select at least one pillar.</p>';
  }
  if ($('#radar-chips')) {
    $('#radar-chips').innerHTML = SERIES.map(s => `<button class="chip active" data-id="${s.id}" style="--accent:${s.color}">${s.name}</button>`).join('');
    $$('#radar-chips .chip').forEach(c => c.addEventListener('click', () => {
      const id = c.dataset.id;
      active.has(id) ? active.delete(id) : active.add(id);
      c.classList.toggle('active', active.has(id));
      drawRadar();
    }));
    let drawn = false;
    new IntersectionObserver((en, io) => { if (en[0].isIntersecting && !drawn) { drawn = true; drawRadar(); io.disconnect(); } }, { threshold: .2 }).observe($('#radar'));
  }

  /* ---------------- Timeline ---------------- */
  const EVENTS = [
    [1950, 'Turing Test', 'ai', 'Alan Turing asks “Can machines think?” and proposes the imitation game.'],
    [1956, 'Dartmouth Workshop', 'ai', 'John McCarthy coins “Artificial Intelligence”; the field is born.'],
    [1959, '“Machine Learning” coined', 'ml', 'Arthur Samuel’s checkers program learns to beat its creator.'],
    [1961, 'Unimate robot', 'automation', 'First industrial robot joins the GM assembly line.'],
    [1969, 'PLC invented', 'automation', 'Programmable logic controllers replace relay panels in factories.'],
    [1980, 'Expert systems boom', 'ai', 'Rule-based systems like XCON encode expert knowledge.'],
    [1986, 'Backpropagation', 'ml', 'Rumelhart, Hinton & Williams popularize training multi-layer nets.'],
    [1997, 'Deep Blue', 'ai', 'IBM’s chess computer defeats Garry Kasparov.'],
    [2001, 'CI & scripting era', 'automation', 'Continuous integration and scripted IT automation go mainstream.'],
    [2006, 'Deep learning revival', 'ml', 'Hinton’s deep belief nets reignite neural network research.'],
    [2012, 'AlexNet', 'ml', 'A GPU-trained CNN crushes ImageNet — the deep learning era begins.'],
    [2014, 'GANs', 'ai', 'Generative adversarial networks create realistic synthetic images.'],
    [2015, 'RPA goes mainstream', 'automation', 'Software robots automate UI-level business tasks at scale.'],
    [2016, 'AlphaGo', 'ml', 'Reinforcement learning + deep nets beat the Go world champion.'],
    [2017, 'Transformer', 'ai', '“Attention Is All You Need” introduces the architecture behind LLMs.'],
    [2018, 'BERT & GPT-1', 'ai', 'Pre-trained language models transform NLP.'],
    [2020, 'GPT-3', 'ai', '175B parameters show few-shot learning from prompts.'],
    [2022, 'ChatGPT', 'ai', 'Conversational AI reaches 100M users in two months.'],
    [2023, 'ReAct & tool calling', 'agentic', 'LLMs start reasoning + acting with tools; AutoGPT sparks agent hype.'],
    [2024, 'MCP & computer-use', 'agentic', 'Standard tool protocols and agents that operate browsers & desktops.'],
    [2025, 'Multi-agent enterprise', 'agentic', 'Teams of specialized agents run real business workflows with oversight.'],
    [2026, 'Agentic operations', 'agentic', 'Agents become first-class “digital coworkers” with governance platforms.']
  ];
  const PCOL = { automation: '#2dd4bf', ml: '#8b5cf6', ai: '#ec4899', agentic: '#f59e0b' };
  const tlActive = new Set(Object.keys(PCOL));
  function drawTimeline() {
    const svgEl = $('#tl'); if (!svgEl) return;
    const W = Math.max(640, svgEl.parentElement.clientWidth - 20), H = 320, M = { l: 30, r: 30 }, axisY = 170;
    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    const x0 = d3.scaleLinear([1946, 2028], [M.l, W - M.r]);
    let x = x0.copy();
    const defs = svg.append('defs');
    const lg = defs.append('linearGradient').attr('id', 'tl-grad');
    [['0%', '#2dd4bf'], ['40%', '#8b5cf6'], ['75%', '#ec4899'], ['100%', '#f59e0b']].forEach(([o, c]) => lg.append('stop').attr('offset', o).attr('stop-color', c));
    defs.append('clipPath').attr('id', 'tl-clip').append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H);
    const root = svg.append('g').attr('clip-path', 'url(#tl-clip)');
    root.append('rect').attr('x', 0).attr('y', axisY - 2).attr('width', W).attr('height', 4).attr('rx', 2).attr('fill', 'url(#tl-grad)').attr('opacity', .8);
    const axisG = root.append('g').attr('class', 'axis').attr('transform', `translate(0,${axisY + 14})`);
    const data = EVENTS.filter(e => tlActive.has(e[2])).map((e, i) => ({ y: e[0], t: e[1], p: e[2], d: e[3], up: i % 2 === 0, lvl: (i % 4 < 2) ? 0 : 1 }));
    const ev = root.selectAll('g.ev').data(data).join('g').attr('class', 'ev').style('cursor', 'pointer');
    ev.append('line').attr('stroke', d => PCOL[d.p]).attr('stroke-opacity', .5).attr('stroke-dasharray', '2 3')
      .attr('y1', axisY).attr('y2', d => d.up ? axisY - 40 - d.lvl * 46 : axisY + 40 + d.lvl * 46);
    ev.append('circle').attr('cy', axisY).attr('r', 0).attr('fill', '#060914').attr('stroke', d => PCOL[d.p]).attr('stroke-width', 3)
      .style('filter', d => `drop-shadow(0 0 6px ${PCOL[d.p]})`)
      .transition().delay((_, i) => i * 40).duration(500).attr('r', 7);
    const lab = ev.append('g').attr('transform', d => `translate(0,${d.up ? axisY - 48 - d.lvl * 46 : axisY + 52 + d.lvl * 46})`);
    lab.append('text').attr('text-anchor', 'middle').style('font', '700 11px JetBrains Mono').style('fill', d => PCOL[d.p]).text(d => d.y);
    lab.append('text').attr('text-anchor', 'middle').attr('y', 14).style('font-size', '11.5px').style('font-weight', 600).style('fill', '#e7ebff').text(d => d.t);
    ev.on('mouseenter', (e, d) => tip.show(`<b style="color:${PCOL[d.p]}">${d.y} · ${d.t}</b><br>${d.d}<br><span class="tag" style="margin-top:6px">${d.p}</span>`, e))
      .on('mousemove', e => tip.move(e)).on('mouseleave', tip.hide);
    function update() {
      axisG.call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(Math.round(W / 90)).tickSize(0).tickPadding(6));
      axisG.select('.domain').remove();
      ev.attr('transform', d => `translate(${x(d.y)},0)`);
    }
    update();
    svg.call(d3.zoom().scaleExtent([1, 6]).translateExtent([[0, 0], [W, H]]).extent([[0, 0], [W, H]])
      .on('zoom', e => { x = e.transform.rescaleX(x0); update(); }));
  }
  if ($('#tl-chips')) {
    const names = { automation: 'Automation', ml: 'ML', ai: 'AI', agentic: 'Agentic' };
    $('#tl-chips').innerHTML = Object.keys(PCOL).map(k => `<button class="chip active" data-k="${k}" style="--accent:${PCOL[k]}">${names[k]}</button>`).join('');
    $$('#tl-chips .chip').forEach(c => c.addEventListener('click', () => {
      const k = c.dataset.k; tlActive.has(k) ? tlActive.delete(k) : tlActive.add(k);
      c.classList.toggle('active', tlActive.has(k)); drawTimeline();
    }));
    drawTimeline();
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawTimeline, 200); });
  }

  /* ---------------- Industries teaser ---------------- */
  if ($('#ind-grid')) {
    $('#ind-grid').innerHTML = INDUSTRIES.map(i => `
      <a class="card hover reveal in" href="industries.html#${i.id}" style="--accent:${i.color}" id="teaser-${i.id}">
        <div style="font-size:2rem;margin-bottom:6px">${i.emoji}</div>
        <h3 style="margin-bottom:6px">${i.name}</h3>
        <p style="font-size:.84rem">${i.tagline}</p>
        <div class="mono" style="font-size:.75rem;color:${i.color}">${i.stats[0].v} · ${i.stats[0].l}</div>
      </a>`).join('');
  }
  icons();
})();
