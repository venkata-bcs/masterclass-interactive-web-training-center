/* Automation page: invoice workflow (JointJS), ROI calculator (D3), ladder, types */
(function () {
  const { $, $$, tip, icons } = App;
  const money = v => '$' + Math.round(v).toLocaleString();

  /* ---------------- Invoice workflow ---------------- */
  const WF = {
    groups: [
      { label: 'Capture', x: -20, y: 60, w: 470, h: 120, color: '#38bdf8' },
      { label: 'Rules & routing', x: 470, y: -40, w: 720, h: 380, color: '#2dd4bf' },
      { label: 'Systems of record', x: 1210, y: 60, w: 470, h: 120, color: '#94a3b8' }
    ],
    nodes: [
      { id: 'email', x: 0, y: 90, icon: '📧', title: 'Invoice email', sub: 'Trigger: ap@ inbox', kind: 'data', desc: 'A mailbox watcher fires whenever a message with a PDF attachment lands in the accounts-payable inbox.', tech: ['Power Automate', 'IMAP trigger', 'Webhook'] },
      { id: 'ocr', x: 245, y: 90, icon: '🧾', title: 'Extract fields', sub: 'Template OCR', kind: 'auto', desc: 'Template-based OCR reads vendor, PO number, amount and due date from fixed coordinates. New layouts need a new template — a classic automation limitation.', tech: ['ABBYY', 'Tesseract', 'Regex'] },
      { id: 'validate', x: 490, y: 90, icon: '✅', title: 'Validate rules', sub: '3-way PO match', kind: 'auto', desc: 'Deterministic checks: PO exists, quantities match the goods receipt, amount within tolerance, vendor not blocked.', tech: ['Business rules', 'SQL lookups'] },
      { id: 'decision', x: 735, y: 90, icon: '🔀', title: 'Amount > $10k?', sub: 'Routing rule', kind: 'auto', desc: 'A simple if/else gateway. Thresholds are configured by finance and never change unless someone edits the rule.', tech: ['BPMN gateway', 'DMN table'] },
      { id: 'approve', x: 980, y: -10, icon: '🧑‍💼', title: 'Manager approval', sub: 'Human task', kind: 'human', desc: 'High-value invoices create an approval task in Teams/Slack. The bot waits (with an SLA timer) before continuing.', tech: ['Teams adaptive card', 'SLA timer'] },
      { id: 'exception', x: 490, y: 240, icon: '⚠️', title: 'Exception queue', sub: 'Manual handling', kind: 'human', desc: 'Anything the rules can’t resolve lands here. In practice 10–30% of invoices — the motivation for adding ML/AI.', tech: ['ServiceNow', 'Work queue'] },
      { id: 'post', x: 980, y: 190, icon: '🏛️', title: 'Post to ERP', sub: 'RPA bot / API', kind: 'tool', desc: 'An RPA bot or API call creates the AP document in the ERP with GL coding from the PO.', tech: ['SAP', 'Oracle', 'UiPath'] },
      { id: 'pay', x: 1230, y: 90, icon: '💸', title: 'Schedule payment', sub: 'Payment run', kind: 'tool', desc: 'Invoice is added to the next payment run respecting early-payment discount terms.', tech: ['Bank API', 'ISO 20022'] },
      { id: 'notify', x: 1475, y: 90, icon: '📣', title: 'Notify vendor', sub: 'Email template', kind: 'auto', desc: 'A templated remittance advice email goes to the vendor. Done — no human touched it.', tech: ['SendGrid', 'Template'] }
    ],
    links: [
      ['email', 'ocr'], ['ocr', 'validate'], ['validate', 'decision', 'match'], ['validate', 'exception', 'mismatch', 'dashed'],
      ['decision', 'approve', '> $10k'], ['decision', 'post', '≤ $10k'], ['approve', 'post', 'approved'],
      ['post', 'pay'], ['pay', 'notify']
    ]
  };

  const wfEl = $('#wf-diagram');
  if (wfEl) {
    const ins = $('#wf-inspector');
    const kit = JointKit.create(wfEl, { onSelect: s => JointKit.inspect(ins, s), maxScale: 0.95 });
    kit.load(WF);
    JointKit.inspect(ins, null);
    $('#wf-legend').innerHTML = JointKit.legendHTML(['data', 'auto', 'human', 'tool']);

    const amt = $('#amt'), mm = $('#mismatch'), log = $('#wf-log');
    const showAmt = () => $('#amt-val').textContent = money(+amt.value);
    amt.addEventListener('input', showAmt); showAmt();

    const write = (cls, k, msg) => {
      log.insertAdjacentHTML('beforeend', `<div class="ln ${cls}"><span class="k">${k}</span> ${msg}</div>`);
      log.scrollTop = log.scrollHeight;
    };
    $('#wf-run').addEventListener('click', async () => {
      const a = +amt.value, bad = mm.checked;
      log.innerHTML = '';
      const inv = 'INV-' + Math.floor(10000 + Math.random() * 89999);
      const path = ['email', 'ocr', 'validate'];
      if (bad) path.push('exception');
      else {
        path.push('decision');
        if (a > 10000) path.push('approve');
        path.push('post', 'pay', 'notify');
      }
      const msgs = {
        email: ['sys', 'TRIGGER', `New email from billing@acme-supplies.com · ${inv}.pdf`],
        ocr: ['action', 'EXTRACT', `vendor=ACME · po=PO-55120 · amount=${money(a)} · due=Net30`],
        validate: bad ? ['warn', 'RULE ✗', 'Quantity on invoice (120) ≠ goods receipt (100)'] : ['ok', 'RULE ✓', 'PO found · GR matched · vendor active'],
        exception: ['warn', 'ROUTE', 'Sent to exception queue → AP clerk (SLA 48h)'],
        decision: ['action', 'IF', `${money(a)} ${a > 10000 ? '>' : '≤'} $10,000 → ${a > 10000 ? 'approval required' : 'straight-through'}`],
        approve: ['obs', 'WAIT', 'Approval card sent to M. Chen … approved ✔'],
        post: ['action', 'ERP', 'Created AP document 5100004211 (company 1000)'],
        pay: ['action', 'PAY', 'Queued in payment run F110 · Friday'],
        notify: ['ok', 'DONE', `Remittance sent. Total handling time: ${(path.length * 0.9 + (a > 10000 ? 3 : 0)).toFixed(1)}s`]
      };
      $('#wf-run').disabled = true;
      await kit.run(path, {
        stepDelay: 450,
        onStep: (s) => { const m = msgs[s.id]; write(m[0], `[${m[1]}]`, m[2]); JointKit.inspect(ins, kit.state.nodes[s.id].spec); }
      });
      $('#wf-run').disabled = false;
    });
    $('#wf-reset').addEventListener('click', () => { kit.stop(); log.innerHTML = '<div class="ln sys">Waiting for trigger…</div>'; JointKit.inspect(ins, null); });
  }

  /* ---------------- ROI calculator ---------------- */
  const svgEl = $('#roi-chart');
  if (svgEl) {
    const W = 640, H = 380, M = { t: 20, r: 20, b: 40, l: 70 };
    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear([0, 24], [M.l, W - M.r]);
    const y = d3.scaleLinear().range([H - M.b, M.t]);
    const defs = svg.append('defs');
    const gradA = defs.append('linearGradient').attr('id', 'roi-a').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    gradA.append('stop').attr('offset', '0%').attr('stop-color', '#2dd4bf').attr('stop-opacity', .35);
    gradA.append('stop').attr('offset', '100%').attr('stop-color', '#2dd4bf').attr('stop-opacity', 0);
    const gradM = defs.append('linearGradient').attr('id', 'roi-m').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    gradM.append('stop').attr('offset', '0%').attr('stop-color', '#f87171').attr('stop-opacity', .25);
    gradM.append('stop').attr('offset', '100%').attr('stop-color', '#f87171').attr('stop-opacity', 0);

    const gridG = svg.append('g').attr('class', 'gridline');
    const xAxis = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - M.b})`);
    const yAxis = svg.append('g').attr('class', 'axis').attr('transform', `translate(${M.l},0)`);
    svg.append('text').attr('x', W - M.r).attr('y', H - 6).attr('text-anchor', 'end').style('font-size', '11px').style('fill', '#6f7aa3').text('months');
    const areaM = svg.append('path').attr('fill', 'url(#roi-m)');
    const areaA = svg.append('path').attr('fill', 'url(#roi-a)');
    const lineM = svg.append('path').attr('fill', 'none').attr('stroke', '#f87171').attr('stroke-width', 2.5);
    const lineA = svg.append('path').attr('fill', 'none').attr('stroke', '#2dd4bf').attr('stroke-width', 2.5).style('filter', 'drop-shadow(0 0 6px #2dd4bf88)');
    const be = svg.append('g').style('opacity', 0);
    be.append('line').attr('stroke', '#f59e0b').attr('stroke-dasharray', '4 4');
    be.append('circle').attr('r', 7).attr('fill', '#f59e0b').style('filter', 'drop-shadow(0 0 8px #f59e0b)');
    be.append('text').attr('class', 'be-t').style('fill', '#f59e0b').style('font', '700 12px JetBrains Mono').attr('text-anchor', 'middle');
    const leg = svg.append('g').attr('transform', `translate(${M.l + 14},${M.t + 6})`);
    [['Manual', '#f87171'], ['Automated', '#2dd4bf']].forEach(([t, c], i) => {
      leg.append('rect').attr('x', i * 110).attr('y', 0).attr('width', 12).attr('height', 12).attr('rx', 3).attr('fill', c);
      leg.append('text').attr('x', i * 110 + 18).attr('y', 10).style('font-size', '12px').text(t);
    });
    const hoverLine = svg.append('line').attr('stroke', '#a9b2d6').attr('stroke-opacity', .3).attr('y1', M.t).attr('y2', H - M.b).style('opacity', 0);

    const ids = ['tasks', 'mins', 'rate', 'cov', 'build'];
    const fmt = { tasks: v => v, mins: v => v + ' min', rate: v => '$' + v + '/h', cov: v => v + '%', build: v => money(v) };
    let series = [];
    function update() {
      const p = {}; ids.forEach(k => { p[k] = +$('#r-' + k).value; $('#v-' + k).textContent = fmt[k](p[k]); });
      const hoursMonth = p.tasks * p.mins / 60 * 21;
      const manualMonth = hoursMonth * p.rate;
      const autoMonth = manualMonth * (1 - p.cov / 100) + p.build * 0.15 / 12 + 400; // residual + maintenance + infra
      series = d3.range(0, 25).map(m => ({ m, manual: manualMonth * m, auto: p.build + autoMonth * m }));
      const max = d3.max(series, d => Math.max(d.manual, d.auto));
      y.domain([0, max * 1.08]).nice();
      const t = svg.transition().duration(500);
      gridG.transition(t).call(d3.axisLeft(y).ticks(5).tickSize(-(W - M.l - M.r)).tickFormat('')).attr('transform', `translate(${M.l},0)`);
      gridG.select('.domain').remove();
      xAxis.call(d3.axisBottom(x).ticks(12));
      yAxis.transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d => '$' + d3.format('.2~s')(d)));
      const lm = d3.line().x(d => x(d.m)).y(d => y(d.manual)).curve(d3.curveMonotoneX);
      const la = d3.line().x(d => x(d.m)).y(d => y(d.auto)).curve(d3.curveMonotoneX);
      lineM.datum(series).transition(t).attr('d', lm);
      lineA.datum(series).transition(t).attr('d', la);
      areaM.datum(series).transition(t).attr('d', d3.area().x(d => x(d.m)).y0(H - M.b).y1(d => y(d.manual)).curve(d3.curveMonotoneX));
      areaA.datum(series).transition(t).attr('d', d3.area().x(d => x(d.m)).y0(H - M.b).y1(d => y(d.auto)).curve(d3.curveMonotoneX));
      const saveMonth = manualMonth - autoMonth;
      const payback = saveMonth > 0 ? p.build / saveMonth : Infinity;
      if (payback <= 24) {
        const bx = x(payback), by = y(manualMonth * payback);
        be.transition(t).style('opacity', 1);
        be.select('line').transition(t).attr('x1', bx).attr('x2', bx).attr('y1', by).attr('y2', H - M.b);
        be.select('circle').transition(t).attr('cx', bx).attr('cy', by);
        be.select('.be-t').transition(t).attr('x', bx).attr('y', by - 14).text('break-even · ' + payback.toFixed(1) + ' mo');
      } else be.transition(t).style('opacity', 0);
      $('#k-hours').textContent = Math.round(hoursMonth * 12 * p.cov / 100).toLocaleString();
      $('#k-save').textContent = saveMonth > 0 ? money(saveMonth * 12) : 'none';
      $('#k-pay').textContent = isFinite(payback) ? (payback < 1 ? '< 1 month' : payback.toFixed(1) + ' months') : 'never';
      $('#k-fte').textContent = (hoursMonth * p.cov / 100 / 160).toFixed(1);
    }
    ids.forEach(k => $('#r-' + k).addEventListener('input', update));
    update();
    svg.on('mousemove', e => {
      const [mx] = d3.pointer(e); const m = Math.round(x.invert(mx));
      if (m < 0 || m > 24) return;
      const d = series[m];
      hoverLine.attr('x1', x(m)).attr('x2', x(m)).style('opacity', 1);
      tip.show(`<b>Month ${m}</b><br><span style="color:#f87171">Manual: ${money(d.manual)}</span><br><span style="color:#2dd4bf">Automated: ${money(d.auto)}</span><br>Δ ${money(d.manual - d.auto)}`, e);
    }).on('mouseleave', () => { hoverLine.style('opacity', 0); tip.hide(); });
  }

  /* ---------------- Maturity ladder ---------------- */
  const LADDER = [
    { t: 'Scripts & macros', d: 'Individual power users automate their own tasks with Excel macros, shell or Python scripts. Fast wins, but undocumented and fragile (“the bot only Dave understands”).', ex: ['Excel VBA', 'Bash', 'Python cron'] },
    { t: 'RPA', d: 'Software robots mimic human clicks and keystrokes on existing UIs — no API needed. Great for legacy systems; breaks when screens change.', ex: ['UiPath', 'Automation Anywhere', 'Power Automate Desktop'] },
    { t: 'Process automation (BPA)', d: 'End-to-end workflows orchestrated with BPMN, APIs and human tasks. Processes become visible, measurable and governed.', ex: ['Camunda', 'ServiceNow', 'Temporal', 'Airflow'] },
    { t: 'Intelligent automation', d: 'Workflows gain ML/AI steps: document understanding, classification, sentiment, predictions. Exceptions shrink dramatically.', ex: ['IDP', 'ML scoring', 'LLM extraction'] },
    { t: 'Hyperautomation → Agents', d: 'Everything that can be automated is — orchestrated by event buses, process mining and increasingly by AI agents that decide which automation to run.', ex: ['Process mining', 'Event mesh', 'Agentic orchestration'] }
  ];
  if ($('#ladder')) {
    $('#ladder').innerHTML = LADDER.map((l, i) => `<div class="step ${i === 0 ? 'active' : ''}" data-i="${i}" id="ladder-${i}"><div class="n">L${i + 1}</div><div class="t">${l.t}</div></div>`).join('');
    const show = i => {
      $$('#ladder .step').forEach((s, j) => s.classList.toggle('active', j <= i));
      const l = LADDER[i];
      $('#ladder-detail').innerHTML = `<h3 style="color:var(--c-auto)">L${i + 1} · ${l.t}</h3><p>${l.d}</p>${l.ex.map(e => `<span class="tag">${e}</span>`).join('')}`;
    };
    $$('#ladder .step').forEach(s => s.addEventListener('click', () => show(+s.dataset.i)));
    show(0);
  }

  /* ---------------- Types grid ---------------- */
  const TYPES = [
    { i: 'mouse-pointer-click', t: 'Robotic Process Automation', d: 'Bots drive UIs like a human: copy/paste between apps, fill forms, download reports.', e: 'Insurance policy data entry' },
    { i: 'git-merge', t: 'Workflow / BPM', d: 'Model multi-step processes with approvals, timers and SLAs in BPMN.', e: 'Employee onboarding' },
    { i: 'server-cog', t: 'IT & Infrastructure as Code', d: 'Declare infrastructure in code; tools converge reality to the desired state.', e: 'Terraform, Ansible' },
    { i: 'rocket', t: 'CI/CD pipelines', d: 'Every commit is built, tested, scanned and deployed automatically.', e: 'GitHub Actions, Jenkins' },
    { i: 'flask-conical', t: 'Test automation', d: 'Regression suites run on every change across browsers and devices.', e: 'Playwright, Selenium' },
    { i: 'plug-zap', t: 'Event-driven integration', d: 'When X happens in one app, do Y in another — via webhooks and iPaaS.', e: 'Zapier, n8n, MuleSoft' }
  ];
  if ($('#types-grid')) {
    $('#types-grid').innerHTML = TYPES.map(t => `
      <div class="card hover reveal in" style="--accent:var(--c-auto)">
        <div class="card-ico"><i data-lucide="${t.i}"></i></div>
        <h3>${t.t}</h3><p>${t.d}</p>
        <div class="mono" style="font-size:.76rem;color:var(--c-auto)">e.g. ${t.e}</div>
      </div>`).join('');
  }
  icons();
})();
