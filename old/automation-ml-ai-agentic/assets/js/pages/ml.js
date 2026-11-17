/* ML page: classifier playground, gradient descent, neural net, MLOps */
(function () {
  const { $, $$, tip, tabs, icons } = App;
  tabs($('#mltype-tabs'));

  /* ======================= Classifier playground ======================= */
  (function classifier() {
    const svgEl = $('#clf'); if (!svgEl) return;
    const W = 600, H = 420, NX = 60, NY = 42, cw = W / NX, ch = H / NY;
    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
    const sx = d3.scaleLinear([-1, 1], [0, W]), sy = d3.scaleLinear([-1, 1], [H, 0]);
    const A = '#2dd4bf', B = '#ec4899';
    const color = d3.interpolateRgb(B, A);
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#070b18');
    const cellsG = svg.append('g');
    const contourG = svg.append('g');
    const ptsG = svg.append('g');
    const grid = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) grid.push({ i, j, x: sx.invert((i + .5) * cw), y: sy.invert((j + .5) * ch), p: .5 });
    const cells = cellsG.selectAll('rect').data(grid).join('rect')
      .attr('x', d => d.i * cw).attr('y', d => d.j * ch).attr('width', cw + .5).attr('height', ch + .5).attr('fill', '#1a1f3a').attr('opacity', .55);

    let pts = [], brush = 0, algo = 'logreg', k = 5, poly = true, w = null, timer = null, epochs = 0;
    const feats = (x, y) => poly ? [1, x, y, x * x, y * y, x * y] : [1, x, y];
    const sig = z => 1 / (1 + Math.exp(-z));
    const predictLR = (x, y) => { const f = feats(x, y); let z = 0; for (let i = 0; i < f.length; i++) z += w[i] * f[i]; return sig(z); };
    function predictKNN(x, y) {
      const d = pts.map(p => [(p.x - x) ** 2 + (p.y - y) ** 2, p.c]).sort((a, b) => a[0] - b[0]).slice(0, k);
      return d.length ? d.filter(e => e[1] === 0).length / d.length : .5;
    }
    function resetW() { w = new Array(feats(0, 0).length).fill(0); epochs = 0; }
    resetW();

    function render() {
      const pred = algo === 'knn' ? predictKNN : predictLR;
      if (pts.length) grid.forEach(g => g.p = pred(g.x, g.y)); else grid.forEach(g => g.p = .5);
      cells.attr('fill', d => pts.length ? color(d.p) : '#1a1f3a').attr('opacity', d => pts.length ? .18 + Math.abs(d.p - .5) * .5 : .55);
      contourG.selectAll('*').remove();
      if (pts.length > 1) {
        const values = grid.map(g => g.p);
        const contours = d3.contours().size([NX, NY]).thresholds([.5])(values);
        contourG.selectAll('path').data(contours).join('path')
          .attr('d', d3.geoPath(d3.geoIdentity().scale(cw)))
          .attr('transform', `translate(${-cw / 2},${-ch / 2})`)
          .attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 2).attr('stroke-opacity', .8).style('filter', 'drop-shadow(0 0 4px #fff)');
      }
      ptsG.selectAll('circle').data(pts).join(
        enter => enter.append('circle').attr('r', 0).call(e => e.transition().duration(300).ease(d3.easeBackOut).attr('r', 6.5))
      ).attr('cx', d => sx(d.x)).attr('cy', d => sy(d.y)).attr('fill', d => d.c === 0 ? A : B)
        .attr('stroke', '#060914').attr('stroke-width', 2).style('filter', d => `drop-shadow(0 0 5px ${d.c === 0 ? A : B})`);
      const acc = pts.length ? pts.filter(p => (pred(p.x, p.y) >= .5 ? 0 : 1) === p.c).length / pts.length : null;
      $('#clf-acc').textContent = acc === null ? '–' : Math.round(acc * 100) + '%';
      $('#clf-n').textContent = pts.length;
      $('#clf-note').innerHTML = algo === 'logreg'
        ? `Epoch ${epochs}. ${poly ? 'With polynomial features (x², y², xy) the boundary can curve.' : 'Linear features only: try the XOR preset and watch it fail — then enable polynomial features.'}`
        : `k-NN predicts by majority vote of the ${k} nearest points. No training step — “lazy learning”. Small k = jagged boundary (overfitting).`;
    }

    function train() {
      if (algo !== 'logreg' || pts.length < 2) return;
      const lr = 0.6;
      for (let it = 0; it < 15; it++) {
        const g = new Array(w.length).fill(0);
        for (const p of pts) {
          const f = feats(p.x, p.y); const err = predictLR(p.x, p.y) - (p.c === 0 ? 1 : 0);
          for (let i = 0; i < w.length; i++) g[i] += err * f[i];
        }
        for (let i = 0; i < w.length; i++) w[i] -= lr * g[i] / pts.length;
        epochs++;
      }
    }
    function startTimer() {
      if (timer) timer.stop();
      let frames = 0;
      timer = d3.timer(() => {
        train(); render();
        if (++frames > 160 || algo !== 'logreg') { timer.stop(); timer = null; }
      });
    }
    function changed() { if (algo === 'logreg') startTimer(); else render(); }

    svg.on('click', e => {
      const [mx, my] = d3.pointer(e);
      pts.push({ x: sx.invert(mx), y: sy.invert(my), c: e.shiftKey ? 1 - brush : brush });
      changed();
    });

    const setBrush = b => { brush = b; $('#brush-a').classList.toggle('active', b === 0); $('#brush-b').classList.toggle('active', b === 1); };
    $('#brush-a').addEventListener('click', () => setBrush(0));
    $('#brush-b').addEventListener('click', () => setBrush(1));

    function renderOpts() {
      $('#algo-opts').innerHTML = algo === 'logreg'
        ? `<label class="switch"><input type="checkbox" id="poly" ${poly ? 'checked' : ''}> Polynomial features</label>`
        : `<div class="field"><div class="field-row"><span>k (neighbours)</span><span class="val" id="k-val">${k}</span></div><input type="range" id="k" min="1" max="21" step="2" value="${k}"></div>`;
      if (algo === 'logreg') $('#poly').addEventListener('change', e => { poly = e.target.checked; resetW(); changed(); });
      else { const r = $('#k'); App.fillRange(r); r.addEventListener('input', () => { k = +r.value; $('#k-val').textContent = k; App.fillRange(r); render(); }); }
    }
    tabs($('#algo-tabs'), a => { algo = a; resetW(); renderOpts(); changed(); });
    renderOpts();

    const rn = d3.randomNormal(0, .18);
    const PRESETS = {
      blobs: () => d3.range(40).map(i => ({ x: (i < 20 ? -.4 : .4) + rn(), y: (i < 20 ? .3 : -.3) + rn(), c: i < 20 ? 0 : 1 })),
      xor: () => d3.range(60).map(() => { const x = Math.random() * 1.8 - .9, y = Math.random() * 1.8 - .9; return { x, y, c: x * y > 0 ? 0 : 1 }; }),
      circles: () => d3.range(70).map(i => { const a = Math.random() * 6.28, r = i < 30 ? Math.random() * .3 : .55 + Math.random() * .25; return { x: Math.cos(a) * r, y: Math.sin(a) * r, c: i < 30 ? 0 : 1 }; }),
      clear: () => []
    };
    $$('[data-preset]').forEach(b => b.addEventListener('click', () => {
      pts = PRESETS[b.dataset.preset](); ptsG.selectAll('*').remove(); resetW(); changed();
    }));
    pts = PRESETS.blobs(); changed();
  })();

  /* ======================= Gradient descent ======================= */
  (function gradient() {
    const svgEl = $('#gd'); if (!svgEl) return;
    const W = 600, H = 380, M = { t: 16, r: 16, b: 32, l: 40 };
    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear([0, 10], [M.l, W - M.r]), y = d3.scaleLinear([0, 10], [H - M.b, M.t]);
    svg.append('g').attr('class', 'gridline').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - M.l - M.r)).tickFormat('')).select('.domain').remove();
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(10));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5));
    const resG = svg.append('g'), ptsG = svg.append('g');
    const line = svg.append('line').attr('stroke', '#f59e0b').attr('stroke-width', 3).style('filter', 'drop-shadow(0 0 6px #f59e0b)');
    const rn = d3.randomNormal(0, .9);
    let data, m, b, epoch, losses, timer = null;
    const N = v => (v - 5) / 5, D = v => v * 5 + 5;
    function init() {
      data = d3.range(26).map(() => { const xv = Math.random() * 9 + .5; return { x: xv, y: Math.max(.2, Math.min(9.8, 0.65 * xv + 1.6 + rn())) }; });
      m = -0.6; b = 0.5; epoch = 0; losses = [];
      draw();
    }
    function loss() { return d3.mean(data, d => (m * N(d.x) + b - N(d.y)) ** 2); }
    function step() {
      const lr = +$('#lr').value; let gm = 0, gb = 0;
      data.forEach(d => { const e = m * N(d.x) + b - N(d.y); gm += 2 * e * N(d.x); gb += 2 * e; });
      m -= lr * gm / data.length; b -= lr * gb / data.length; epoch++;
      if (!isFinite(m) || Math.abs(m) > 1e6) { m = 0; b = 0; stop(); $('#gd-eq').textContent = '💥 diverged'; return; }
      draw();
    }
    const predict = xv => D(m * N(xv) + b);
    function draw() {
      const L = loss(); losses.push(L); if (losses.length > 200) losses.shift();
      line.transition().duration(50).attr('x1', x(0)).attr('y1', y(predict(0))).attr('x2', x(10)).attr('y2', y(predict(10)));
      resG.selectAll('line').data(data).join('line').attr('x1', d => x(d.x)).attr('x2', d => x(d.x)).attr('y1', d => y(d.y))
        .attr('y2', d => y(Math.max(-2, Math.min(12, predict(d.x))))).attr('stroke', '#f87171').attr('stroke-opacity', .45).attr('stroke-dasharray', '3 3');
      ptsG.selectAll('circle').data(data).join('circle').attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 5.5).attr('fill', '#8b5cf6').attr('stroke', '#060914').attr('stroke-width', 2);
      const slope = m, inter = D(b - m * N(0)) - 0; // y = slope*x' + ..., convert to raw space
      const rawSlope = m; const rawB = predict(0);
      $('#gd-eq').textContent = `y = ${rawSlope.toFixed(2)}x + ${rawB.toFixed(2)}`;
      $('#gd-epoch').textContent = epoch;
      drawLoss();
    }
    const lsvg = d3.select('#gd-loss').attr('viewBox', '0 0 300 120').attr('preserveAspectRatio', 'none');
    const lpath = lsvg.append('path').attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 2);
    const larea = lsvg.append('path').attr('fill', '#f59e0b').attr('fill-opacity', .12);
    const lt = lsvg.append('text').attr('x', 296).attr('y', 14).attr('text-anchor', 'end').style('font', '600 11px JetBrains Mono').style('fill', '#f59e0b');
    function drawLoss() {
      const lx = d3.scaleLinear([0, Math.max(1, losses.length - 1)], [0, 300]);
      const ly = d3.scaleLinear([0, d3.max(losses) || 1], [116, 6]);
      lpath.attr('d', d3.line().x((_, i) => lx(i)).y(d => ly(d))(losses));
      larea.attr('d', d3.area().x((_, i) => lx(i)).y0(120).y1(d => ly(d))(losses));
      lt.text('MSE ' + (losses[losses.length - 1] || 0).toFixed(4));
    }
    function stop() { if (timer) { timer.stop(); timer = null; } $('#gd-play').innerHTML = '<i data-lucide="play"></i>Train'; icons(); }
    $('#gd-play').addEventListener('click', () => {
      if (timer) return stop();
      timer = d3.interval(step, 70);
      $('#gd-play').innerHTML = '<i data-lucide="pause"></i>Pause'; icons();
    });
    $('#gd-step').addEventListener('click', step);
    $('#gd-reset').addEventListener('click', () => { stop(); init(); });
    $('#lr').addEventListener('input', e => $('#lr-val').textContent = (+e.target.value).toFixed(2));
    svg.on('click', e => { const [mx, my] = d3.pointer(e); data.push({ x: x.invert(mx), y: y.invert(my) }); draw(); });
    init();
  })();

  /* ======================= Neural network ======================= */
  (function neural() {
    const svgEl = $('#nn'); if (!svgEl) return;
    const W = 960, H = 400;
    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
    let layers = [3, 6, 5, 2], weights = [];
    const LABELS_IN = ['x₁ income', 'x₂ age', 'x₃ debt'], LABELS_OUT = ['approve', 'decline'];
    const rn = d3.randomNormal(0, 1);
    function randomize() { weights = layers.slice(1).map((n, l) => d3.range(n).map(() => d3.range(layers[l]).map(() => rn()))); }
    function layout() {
      const xs = d3.scalePoint(d3.range(layers.length), [110, W - 110]);
      return layers.map((n, l) => d3.range(n).map(i => ({ l, i, x: xs(l), y: H / 2 + (i - (n - 1) / 2) * Math.min(56, (H - 60) / n) })));
    }
    let nodes;
    function draw() {
      svg.selectAll('*').remove();
      nodes = layout();
      const edges = [];
      for (let l = 1; l < layers.length; l++) nodes[l].forEach((t, j) => nodes[l - 1].forEach((s, i) => edges.push({ s, t, w: weights[l - 1][j][i], l })));
      svg.append('g').selectAll('line').data(edges).join('line').attr('class', d => 'e e' + d.l)
        .attr('x1', d => d.s.x).attr('y1', d => d.s.y).attr('x2', d => d.t.x).attr('y2', d => d.t.y)
        .attr('stroke', d => d.w > 0 ? '#38bdf8' : '#ec4899').attr('stroke-width', d => .4 + Math.min(3, Math.abs(d.w)) * 1.1).attr('stroke-opacity', .22);
      const ng = svg.append('g').selectAll('g').data(nodes.flat()).join('g').attr('transform', d => `translate(${d.x},${d.y})`);
      ng.append('circle').attr('class', d => 'n n' + d.l).attr('r', 15).attr('fill', '#0f1630').attr('stroke', d => d.l === 0 ? '#2dd4bf' : d.l === layers.length - 1 ? '#f59e0b' : '#8b5cf6').attr('stroke-width', 2);
      ng.append('text').attr('class', d => 'nv nv' + d.l).attr('text-anchor', 'middle').attr('dy', 4).style('font', '600 9px JetBrains Mono').style('fill', '#e7ebff');
      ng.filter(d => d.l === 0).append('text').attr('x', -24).attr('dy', 4).attr('text-anchor', 'end').style('font-size', '12px').text(d => LABELS_IN[d.i] || '');
      ng.filter(d => d.l === layers.length - 1).append('text').attr('x', 24).attr('dy', 4).style('font-size', '12px').text(d => LABELS_OUT[d.i] || '');
      const names = layers.map((_, l) => l === 0 ? 'INPUT' : l === layers.length - 1 ? 'OUTPUT' : 'HIDDEN ' + l);
      svg.append('g').selectAll('text').data(nodes).join('text').attr('x', d => d[0].x).attr('y', 22).attr('text-anchor', 'middle')
        .style('font', '700 10px JetBrains Mono').style('fill', '#6f7aa3').style('letter-spacing', '1.5px').text((_, l) => names[l]);
      ng.on('mouseenter', (e, d) => tip.show(`<b>${names[d.l]} · neuron ${d.i + 1}</b><br>${d.l === 0 ? 'Input feature' : `a = tanh(Σ wᵢxᵢ + b)<br>${layers[d.l - 1]} incoming weights`}${d.a !== undefined ? `<br>activation: <b>${d.a.toFixed(3)}</b>` : ''}`, e))
        .on('mousemove', e => tip.move(e)).on('mouseleave', tip.hide);
      let params = 0; for (let l = 1; l < layers.length; l++) params += layers[l] * (layers[l - 1] + 1);
      $('#nn-params').textContent = `${layers.join(' → ')} · ${params} parameters`;
    }
    async function forward() {
      const btn = $('#nn-fwd'); btn.disabled = true;
      let a = d3.range(layers[0]).map(() => Math.random() * 2 - 1);
      const act = [a];
      for (let l = 1; l < layers.length; l++) {
        let next = weights[l - 1].map(row => Math.tanh(row.reduce((s, w, i) => s + w * a[i], 0) / Math.sqrt(a.length)));
        if (l === layers.length - 1) { const ex = next.map(v => Math.exp(v * 3)), s = d3.sum(ex); next = ex.map(v => v / s); }
        act.push(next); a = next;
      }
      svg.selectAll('.e').attr('stroke-opacity', .12);
      for (let l = 0; l < layers.length; l++) {
        if (l > 0) {
          svg.selectAll('.e' + l).transition().duration(380).attr('stroke-opacity', .85).transition().duration(500).attr('stroke-opacity', .3);
          await new Promise(r => setTimeout(r, 380));
        }
        nodes[l].forEach((n, i) => n.a = act[l][i]);
        svg.selectAll('.n' + l).transition().duration(300)
          .attr('fill', d => d3.interpolateRgb('#0f1630', d.a >= 0 ? '#8b5cf6' : '#ec4899')(Math.min(1, Math.abs(d.a))))
          .attr('r', d => 13 + Math.abs(d.a) * 6);
        svg.selectAll('.nv' + l).text(d => d.a.toFixed(2));
        await new Promise(r => setTimeout(r, 260));
      }
      btn.disabled = false;
    }
    $('#nn-fwd').addEventListener('click', forward);
    $('#nn-rand').addEventListener('click', () => { randomize(); draw(); });
    $('#nn-add').addEventListener('click', () => { if (layers.length < 7) { layers.splice(layers.length - 1, 0, 4 + Math.floor(Math.random() * 4)); randomize(); draw(); } });
    $('#nn-del').addEventListener('click', () => { if (layers.length > 3) { layers.splice(layers.length - 2, 1); randomize(); draw(); } });
    randomize(); draw();
  })();

  /* ======================= MLOps loop ======================= */
  (function mlops() {
    const el = $('#mlops-diagram'); if (!el) return;
    const ins = $('#mlops-ins');
    const spec = {
      groups: [
        { label: 'Data', x: -20, y: -40, w: 960, h: 130, color: '#38bdf8' },
        { label: 'Train & release', x: -20, y: 120, w: 1200, h: 130, color: '#8b5cf6' },
        { label: 'Operate', x: -20, y: 280, w: 960, h: 130, color: '#2dd4bf' }
      ],
      nodes: [
        { id: 'src', x: 0, y: 0, icon: '🗄️', title: 'Data sources', sub: 'DBs · events · files', kind: 'data', desc: 'Operational databases, clickstreams, sensors and third-party data feeds.', tech: ['Postgres', 'Kafka', 'S3'] },
        { id: 'ingest', x: 240, y: 0, icon: '🚰', title: 'Ingest / ETL', sub: 'Batch + streaming', kind: 'auto', desc: 'Automated pipelines extract, clean and land data in the lakehouse on a schedule or in real time.', tech: ['Airflow', 'dbt', 'Spark'] },
        { id: 'validate', x: 480, y: 0, icon: '🧪', title: 'Data validation', sub: 'Schema & quality', kind: 'auto', desc: 'Checks for schema changes, nulls, ranges and distribution shifts before training — garbage in, garbage out.', tech: ['Great Expectations', 'Deequ'] },
        { id: 'features', x: 720, y: 0, icon: '🧩', title: 'Feature store', sub: 'Online + offline', kind: 'data', desc: 'Reusable, versioned features served identically for training and inference (no training/serving skew).', tech: ['Feast', 'Tecton', 'Vertex FS'] },
        { id: 'train', x: 720, y: 160, icon: '🏋️', title: 'Train', sub: 'GPU jobs · HPO', kind: 'ml', desc: 'Training jobs fit models with hyper-parameter search, distributed across GPUs.', tech: ['PyTorch', 'XGBoost', 'Ray'] },
        { id: 'track', x: 960, y: 160, icon: '📒', title: 'Experiment tracking', sub: 'Params · metrics', kind: 'tool', desc: 'Every run’s code version, data snapshot, parameters and metrics are logged for reproducibility.', tech: ['MLflow', 'W&B'] },
        { id: 'eval', x: 480, y: 160, icon: '📏', title: 'Evaluate', sub: 'Accuracy · bias', kind: 'ml', desc: 'Compare against the champion model on hold-out data, slice metrics for fairness, check robustness.', tech: ['Fairlearn', 'Evidently'] },
        { id: 'registry', x: 240, y: 160, icon: '🏷️', title: 'Model registry', sub: 'Versioned models', kind: 'tool', desc: 'Approved models are versioned with lineage and promoted through staging → production.', tech: ['MLflow Registry', 'SageMaker'] },
        { id: 'cicd', x: 0, y: 160, icon: '🚀', title: 'CI/CD', sub: 'Canary rollout', kind: 'auto', desc: 'Automation packages the model in a container, runs tests and rolls out gradually (canary / shadow).', tech: ['GitHub Actions', 'Argo', 'KServe'] },
        { id: 'serve', x: 0, y: 320, icon: '⚡', title: 'Model serving', sub: 'REST · batch', kind: 'ml', desc: 'Low-latency inference endpoints or batch scoring jobs deliver predictions to apps.', tech: ['KServe', 'Triton', 'BentoML'] },
        { id: 'monitor', x: 240, y: 320, icon: '📡', title: 'Monitoring', sub: 'Latency · quality', kind: 'tool', desc: 'Tracks latency, errors, prediction distributions and — once labels arrive — real accuracy.', tech: ['Prometheus', 'Arize', 'Evidently'] },
        { id: 'drift', x: 480, y: 320, icon: '🌊', title: 'Drift detector', sub: 'PSI · KS tests', kind: 'ml', desc: 'Statistical tests detect when live data no longer looks like training data (e.g. new customer behaviour).', tech: ['PSI', 'KS-test'] },
        { id: 'retrain', x: 720, y: 320, icon: '🔁', title: 'Retrain trigger', sub: 'Automated', kind: 'auto', desc: 'Drift or a schedule automatically kicks off retraining — closing the continuous-training loop.', tech: ['Airflow sensor', 'Kubeflow'] }
      ],
      links: [['src', 'ingest'], ['ingest', 'validate'], ['validate', 'features'], ['features', 'train'], ['train', 'track', '', 'dashed'],
        ['train', 'eval'], ['eval', 'registry', 'pass'], ['registry', 'cicd'], ['cicd', 'serve'], ['serve', 'monitor'], ['monitor', 'drift'], ['drift', 'retrain', 'PSI > 0.2'], ['retrain', 'train']]
    };
    const kit = JointKit.create(el, { onSelect: s => JointKit.inspect(ins, s) });
    kit.load(spec);
    JointKit.inspect(ins, null);
    $('#mlops-train').addEventListener('click', () => kit.run(['src', 'ingest', 'validate', 'features', 'train', 'eval', 'registry', 'cicd', 'serve', 'monitor'], { onStep: (s, i, n) => JointKit.inspect(ins, n), stepDelay: 380 }));
    $('#mlops-drift').addEventListener('click', () => kit.run(['monitor', 'drift', 'retrain', 'train', 'eval', 'registry', 'cicd', 'serve'], { onStep: (s, i, n) => JointKit.inspect(ins, n), stepDelay: 420 }));
  })();

  icons();
})();
