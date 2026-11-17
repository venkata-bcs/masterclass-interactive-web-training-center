/* =========================================================================
   Shuffle Operations Lab — UI layer (controls, charts, timeline, advisor)
   Depends on shuffle-ops-model.js (window.ShuffleModel)
   ========================================================================= */
(function () {
  'use strict';
  const M = window.ShuffleModel;
  const { MB, GB, VOL_LABELS, SRC, TGT, OPS, CARD, fmtB, fmtT, fmtN } = M;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const DEFAULT = { source: 'parquet', op: 'groupby', target: 'parquet', volIdx: 4, workers: 4, cores: 8, mem: 32, card: 'high', skew: 'none', parts: 200, aqe: true, bcast: 10 * MB, salt: false };
  let state = Object.assign({}, DEFAULT);
  let model = null, selStage = null, selEx = 0;

  const PILLS = {
    workers: [[2, '2 workers'], [4, '4'], [8, '8'], [16, '16']],
    cores: [[4, '4 cores'], [8, '8'], [16, '16']],
    mem: [[16, '16 GB'], [32, '32 GB'], [64, '64 GB']],
    card: [['low', 'Low card.'], ['medium', 'Medium'], ['high', 'High card.']],
    skew: [['none', 'No skew'], ['moderate', 'Hot key 8%'], ['severe', 'Hot key 35%']]
  };
  const PARTS = [[8, '8'], [50, '50'], [200, '200 (default)'], [1000, '1,000'], [4000, '4,000'], [16000, '16,000'], ['auto', 'auto-sized ≈ shuffle bytes ÷ 128 MB']];
  const BCAST = [[-1, '-1 (disabled)'], [10 * MB, '10 MB (default)'], [100 * MB, '100 MB'], [1 * GB, '1 GB']];

  const SOURCE_HINT = {
    parquet: 'Splits ≈ min(128 MB, max(4 MB, bytes ÷ cores)). Column pruning + row-group skipping.',
    smallfiles: 'Files packed into splits with a 4 MB open cost each; driver lists every object.',
    csvgz: 'Gzip cannot be split: 1 task per file, every column parsed.',
    jdbc1: 'No partitionColumn ⇒ exactly 1 task and 1 DB session.',
    jdbcN: 'numPartitions value-range strides on partitionColumn (capped at 64 here).',
    mpp: 'Connector UNLOADs to a stage, Spark reads the Parquet in parallel.'
  };
  const OP_HINT = {
    select: 'Narrow: projection only — no shuffle.', filter: 'Narrow: filters pushed to the source when it supports it.', withcol: 'Narrow: expression evaluation in the scan stage.',
    distinct: 'Wide: map-side dedupe, then hash exchange on all columns.', groupby: 'Wide: partial aggregation shrinks shuffle data before the exchange.',
    groupby_collect: 'Wide: collect_list/countDistinct keep every row — skew is not absorbed.', orderby: 'Wide: sampling job + range partitioning.',
    window: 'Wide: all rows of a key must meet in one task, then sort.', join_small: 'Broadcast if dim ≤ threshold, else sort-merge (2 shuffles).',
    join_large: 'Sort-merge join: both sides hash-shuffled on the key.', repartition: 'Wide: round-robin full shuffle into N even partitions.',
    coalesce: 'Narrow: merges partitions without a shuffle — also shrinks upstream parallelism.', complex: '4 exchanges (or 3 with broadcast): join, window, sort.'
  };
  const TARGET_HINT = {
    count: 'Result returns to the driver — no files.', parquet: 'One file per non-empty final task.', partitioned: 'One file per task × event_date value it holds.',
    delta_merge: 'Adds a join shuffle against touched target files + rewrite.', jdbc: 'One DB connection per non-empty final task.', snowflake: 'Tasks write staged files, then COPY INTO.'
  };

  const PRESETS = [
    { label: 'Simple select · 1 GB', icon: 'mouse-pointer-click', s: { op: 'select', volIdx: 2 } },
    { label: 'JDBC single connection · 200 GB', icon: 'database', s: { source: 'jdbc1', op: 'filter', volIdx: 5 } },
    { label: 'groupBy 2 TB · 200 partitions · AQE off', icon: 'group', s: { op: 'groupby_collect', volIdx: 8, aqe: false } },
    { label: 'Skewed join 2 TB · AQE off', icon: 'flame', s: { op: 'join_large', volIdx: 8, skew: 'severe', aqe: false } },
    { label: '…same join · AQE on', icon: 'wand-2', s: { op: 'join_large', volIdx: 8, skew: 'severe', aqe: true } },
    { label: 'Window on low-card key · 500 GB', icon: 'panel-top', s: { op: 'window', card: 'low', volIdx: 6 } },
    { label: 'Small files → partitionBy write', icon: 'files', s: { source: 'smallfiles', op: 'filter', target: 'partitioned', volIdx: 5 } },
    { label: 'Broadcast missed (10 MB)', icon: 'radio-tower', s: { op: 'join_small', volIdx: 6, bcast: 10 * MB } },
    { label: 'CSV.gz → JDBC write', icon: 'file-archive', s: { source: 'csvgz', op: 'withcol', target: 'jdbc', volIdx: 4 } },
    { label: 'Complex pipeline · 500 GB', icon: 'workflow', s: { op: 'complex', volIdx: 6, card: 'high' } },
    { label: 'Reset', icon: 'rotate-ccw', s: {} }
  ];

  // ---------------- controls ----------------
  function fillSelect(el, items, val) {
    el.innerHTML = items.map(([v, l]) => `<option value="${v}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('');
  }
  function initControls() {
    fillSelect($('sxSource'), Object.entries(SRC).map(([k, v]) => [k, v.label]), state.source);
    fillSelect($('sxTarget'), Object.entries(TGT).map(([k, v]) => [k, v.label]), state.target);
    const groups = {};
    Object.entries(OPS).forEach(([k, v]) => { (groups[v.group] = groups[v.group] || []).push([k, v.label]); });
    $('sxOp').innerHTML = Object.entries(groups).map(([g, items]) => `<optgroup label="${esc(g)}">${items.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</optgroup>`).join('');
    fillSelect($('sxParts'), PARTS, state.parts);
    fillSelect($('sxBcast'), BCAST, state.bcast);

    $('sxSource').addEventListener('change', e => set({ source: e.target.value }));
    $('sxOp').addEventListener('change', e => set({ op: e.target.value }));
    $('sxTarget').addEventListener('change', e => set({ target: e.target.value }));
    $('sxVol').addEventListener('input', e => set({ volIdx: +e.target.value }));
    $('sxParts').addEventListener('change', e => set({ parts: e.target.value === 'auto' ? 'auto' : +e.target.value }));
    $('sxBcast').addEventListener('change', e => set({ bcast: +e.target.value }));
    $('sxAqe').addEventListener('change', e => set({ aqe: e.target.checked }));
    $('sxSalt').addEventListener('change', e => set({ salt: e.target.checked }));

    document.querySelectorAll('.sx-pills[data-key]').forEach(box => {
      const key = box.dataset.key;
      box.innerHTML = PILLS[key].map(([v, l]) => `<button type="button" class="sx-pill" data-v="${v}" aria-pressed="false">${esc(l)}</button>`).join('');
      box.addEventListener('click', e => {
        const b = e.target.closest('.sx-pill'); if (!b) return;
        const raw = b.dataset.v; set({ [key]: isNaN(+raw) ? raw : +raw });
      });
    });

    $('sxPresets').innerHTML = PRESETS.map((p, i) => `<button type="button" class="sx-preset" data-i="${i}"><i data-lucide="${p.icon}" style="width:14px;height:14px;"></i>${esc(p.label)}</button>`).join('');
    $('sxPresets').addEventListener('click', e => {
      const b = e.target.closest('.sx-preset'); if (!b) return;
      state = Object.assign({}, DEFAULT, PRESETS[+b.dataset.i].s);
      selStage = null; selEx = 0; syncControls(); render();
    });

    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const txt = $(b.dataset.copy).textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1200); }).catch(() => {});
    }));
  }
  function syncControls() {
    $('sxSource').value = state.source; $('sxOp').value = state.op; $('sxTarget').value = state.target;
    $('sxVol').value = state.volIdx; $('sxVolVal').textContent = VOL_LABELS[state.volIdx];
    $('sxParts').value = String(state.parts); $('sxBcast').value = String(state.bcast);
    $('sxAqe').checked = state.aqe; $('sxSalt').checked = state.salt;
    $('sxSalt').disabled = state.op !== 'join_large';
    document.querySelectorAll('.sx-pills[data-key]').forEach(box => {
      box.querySelectorAll('.sx-pill').forEach(b => {
        const on = String(state[box.dataset.key]) === b.dataset.v;
        b.classList.toggle('active', on); b.setAttribute('aria-pressed', on);
      });
    });
    $('sxSourceHint').textContent = SOURCE_HINT[state.source];
    $('sxOpHint').textContent = OP_HINT[state.op];
    $('sxTargetHint').textContent = TARGET_HINT[state.target];
    const memTask = Math.max(64 * MB, (state.mem * GB - 300 * MB) * 0.6 / state.cores);
    $('sxClusterHint').textContent = `${state.workers * state.cores} task slots · ~${fmtB(memTask)} execution memory per task`;
  }
  function set(patch) {
    Object.assign(state, patch);
    if ('op' in patch || 'source' in patch || 'target' in patch) { selStage = null; selEx = 0; }
    syncControls(); render();
  }

  // ---------------- colors ----------------
  function cssVar(name) { return getComputedStyle(document.querySelector('.sx-viz')).getPropertyValue(name).trim(); }
  const SEV = {
    critical: { v: '--st-crit', label: 'Critical', icon: 'octagon-alert' },
    serious: { v: '--st-serious', label: 'Serious', icon: 'triangle-alert' },
    warning: { v: '--st-warn', label: 'Warning', icon: 'circle-alert' },
    good: { v: '--st-good', label: 'Good', icon: 'circle-check' }
  };

  // ---------------- render ----------------
  function render() {
    model = M.buildModel(state, true);
    if (selStage === null || selStage >= model.stages.length) {
      let best = 0; model.stages.forEach((s, i) => { if (s.time > model.stages[best].time) best = i; }); selStage = best;
    }
    if (selEx >= model.exchanges.length) selEx = 0;
    renderKpis(); renderDag(); renderCode(); renderExTabs(); renderPartChart(); renderStageTabs(); renderGantt(); renderFindings(); renderSweep();
    if (window.lucide) window.lucide.createIcons();
    try { history.replaceState(null, '', '#' + encodeState()); } catch (e) { /* ignore */ }
  }

  function kpi(icon, lbl, val, sub) {
    return `<div class="sx-kpi"><div class="sx-kpi-lbl"><i data-lucide="${icon}" style="width:13px;height:13px;"></i>${lbl}</div><div class="sx-kpi-val">${val}</div><div class="sx-kpi-sub">${sub || '&nbsp;'}</div></div>`;
  }
  function renderKpis() {
    const m = model, sev = SEV[m.health];
    const maxPart = m.exchanges.length ? Math.max(...m.exchanges.map(e => Math.max(...e.arrFinal))) : 0;
    $('sxKpis').innerHTML = [
      kpi('timer', 'Simulated wall clock', fmtT(m.totalSec), `${m.jobs} job(s) · driver ${fmtT(m.driverSec)}`),
      kpi('layers', 'Stages / tasks', `${m.stages.length} / ${fmtN(m.totalTasks)}`, `${m.P} slots (${state.workers}×${state.cores})`),
      kpi('shuffle', 'Shuffle write', m.exchanges.length ? fmtB(m.shuffleBytes) : '0 B', `${m.exchanges.length} exchange(s)`),
      kpi('network', 'Network transfer', fmtB(m.networkBytes), m.broadcastBytes ? 'incl. broadcast' : `${state.workers > 1 ? Math.round((state.workers - 1) / state.workers * 100) : 0}% of shuffle is remote`),
      kpi('maximize-2', 'Largest reduce partition', maxPart ? fmtB(maxPart) : '—', maxPart ? `exec mem/task ${fmtB(m.memTask)}` : 'no shuffle'),
      kpi('hard-drive', 'Spill to disk', fmtB(m.spillBytes), m.spillBytes ? 'memory + disk round trip' : 'fits in memory'),
      kpi('file-stack', state.target === 'jdbc' ? 'DB connections' : 'Output files', state.target === 'jdbc' ? fmtN(m.jdbcWriteConns || 0) : state.target === 'count' ? '—' : fmtN(m.files), state.target === 'count' ? 'action only' : `out ≈ ${fmtB(m.outBytes)}`),
      `<div class="sx-kpi"><div class="sx-kpi-lbl"><i data-lucide="heart-pulse" style="width:13px;height:13px;"></i>Health</div><div class="sx-kpi-val"><span class="sx-status"><span class="sx-dot" style="background:var(${sev.v})"></span>${sev.label}</span></div><div class="sx-kpi-sub">${m.findings.filter(f => f.sev !== 'good').length} issue(s) · see advisor</div></div>`
    ].join('');
  }

  function stageCard(s, maxT) {
    const pct = Math.max(2, s.time / maxT * 100);
    return `<div class="sx-stage${s.id === selStage ? ' sel' : ''}" data-stage="${s.id}" tabindex="0" role="button" aria-label="Stage ${s.id}: ${esc(s.name)}">
      <div class="sx-stage-hd"><span>STAGE ${s.id}${s.job ? ' · JOB ' + s.job : ''}</span><span>${s.kind === 'scan' ? 'READ' : 'REDUCE'}</span></div>
      <div class="sx-stage-name">${esc(s.name)}</div>
      <div class="sx-stage-ops">${s.ops.map(o => `<span class="sx-op">${esc(o)}</span>`).join('')}${s.writeRate ? '<span class="sx-op">Write</span>' : ''}</div>
      <div class="sx-stage-meta">
        <div>Tasks<b>${fmtN(s.n)}</b></div><div>Avg input<b>${fmtB(s.avg)}</b></div>
        <div>Time<b>${fmtT(s.time)}</b></div><div>Slowest task<b>${fmtT(s.maxT || 0)}</b></div>
        ${s.shuffleWrite ? `<div>Shuffle write<b>${fmtB(s.shuffleWrite)}</b></div>` : ''}${s.spill ? `<div>Spill<b>${fmtB(s.spill)}</b></div>` : ''}
      </div>
      <div class="sx-stage-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    </div>`;
  }
  function renderDag() {
    const m = model, maxT = Math.max(...m.stages.map(s => s.time));
    const parts = [];
    m.stages.forEach((s, i) => {
      if (i > 0) {
        const prev = m.stages[i - 1], ins = s.inputs || [];
        if (prev.isBroadcast) parts.push(`<div class="sx-edge bcast"><div class="sx-edge-lbl"><strong>BROADCAST</strong>${fmtB(prev.avg * prev.n)} → ${state.workers} executors</div><div class="sx-edge-line"></div></div>`);
        else if (ins.length) {
          const ex = ins[0], bytes = ins.reduce((a, e) => a + e.D, 0);
          parts.push(`<div class="sx-edge shuffle"><div class="sx-edge-lbl"><strong>SHUFFLE${ins.length > 1 ? ' ×' + ins.length : ''}</strong>${ex.kind === 'hash' ? 'hash' : ex.kind === 'range' ? 'range' : 'round-robin'}(${esc(ex.label)})</div><div class="sx-edge-line"></div><div class="sx-edge-lbl">${fmtB(bytes)} · ${fmtN(ex.N)} parts${ex.aqe ? ` → AQE ${fmtN(ex.aqe.after)}` : ''}${ex.skew ? ` · skew split` : ''}</div></div>`);
        } else parts.push(`<div class="sx-edge"><div class="sx-edge-lbl">${s.job !== prev.job ? 'next job' : s.kind === 'scan' ? 'second input (runs alongside)' : 'then'}</div><div class="sx-edge-line"></div></div>`);
      }
      parts.push(stageCard(s, maxT));
    });
    const tail = state.target === 'count' ? 'Driver ← count' : (TGT[state.target].label.split('(')[0]);
    parts.push(`<div class="sx-edge"><div class="sx-edge-lbl"><strong style="color:var(--exec-green)">SINK</strong>${esc(tail)}</div><div class="sx-edge-line"></div><div class="sx-edge-lbl">${state.target === 'jdbc' ? fmtN(m.jdbcWriteConns) + ' conns' : state.target === 'count' ? '' : fmtN(m.files) + ' files'}</div></div>`);
    $('sxDag').innerHTML = parts.join('');
    $('sxDag').querySelectorAll('.sx-stage').forEach(el => {
      const pick = () => { selStage = +el.dataset.stage; renderDag(); renderStageTabs(); renderGantt(); if (window.lucide) window.lucide.createIcons(); };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  }

  function hlCode(line) {
    const i = line.indexOf('#');
    const code = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? line.slice(i) : '';
    let h = esc(code).replace(/("[^"]*")/g, '<span class="st">$1</span>').replace(/\b(from|import|def|for|in|as|True|False|None)\b/g, '<span class="kw">$1</span>');
    return h + (cm ? `<span class="cm">${esc(cm)}</span>` : '');
  }
  function renderCode() {
    const lines = ['from pyspark.sql import functions as F', 'from pyspark.sql.window import Window', ''].concat(model.code.join('\n').split('\n'));
    $('sxCode').innerHTML = lines.map(hlCode).join('\n');
    $('sxPlan').innerHTML = model.planLines.map(l => {
      const e = esc(l);
      if (/Exchange (hash|range|RoundRobin)/.test(l)) return `<span class="ex">${e}</span>`;
      if (/AQEShuffleRead|AdaptiveSparkPlan|isSkewJoin/.test(l)) return `<span class="aqe">${e}</span>`;
      if (/Broadcast/.test(l)) return `<span class="bc">${e}</span>`;
      return e;
    }).join('\n');
  }

  // ---------------- partition chart ----------------
  function renderExTabs() {
    const m = model;
    if (!m.exchanges.length) { $('sxExTabs').innerHTML = ''; return; }
    $('sxExTabs').innerHTML = m.exchanges.map((e, i) => `<button type="button" role="tab" aria-selected="${i === selEx}" class="sx-pill${i === selEx ? ' active' : ''}" data-ex="${i}">Exchange ${i + 1}: ${esc(e.label)}</button>`).join('');
    $('sxExTabs').querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { selEx = +b.dataset.ex; renderExTabs(); renderPartChart(); }));
  }
  function partStatus(v, med, memTask) {
    if (v <= 0) return null;
    if ((v > 5 * med && v > 256 * MB) || v * 2.2 > memTask * 4) return 'critical';
    if (v > 256 * MB || v * 2.2 > memTask) return 'serious';
    if (v < 8 * MB) return 'warning';
    return 'good';
  }
  const STATUS_LABEL = { good: '8–256 MB healthy', warning: '< 8 MB tiny', serious: '> 256 MB or spills', critical: 'Skewed (> 5× median) / severe spill' };

  function barChart(host, arr, opts) {
    const W = Math.max(280, host.clientWidth || 600), H = opts.h || 200, pl = 56, pr = 10, pt = 10, pb = 26;
    const maxBars = Math.max(40, Math.floor((W - pl - pr) / 3));
    const k = Math.ceil(arr.length / maxBars), bars = [];
    for (let i = 0; i < arr.length; i += k) {
      const sl = arr.slice(i, i + k); bars.push({ i0: i, i1: Math.min(arr.length, i + k) - 1, max: Math.max(...sl), sum: sl.reduce((a, b) => a + b, 0), empty: sl.filter(x => x <= 0).length });
    }
    const vmax = Math.max(...arr, 1), med = M.median(arr.filter(x => x > 0));
    const iw = W - pl - pr, ih = H - pt - pb, bw = iw / bars.length, gap = bw > 4 ? 2 : bw > 2 ? 1 : 0;
    const y = v => pt + ih - v / vmax * ih;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * vmax);
    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria)}">`;
    ticks.forEach(t => { svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--viz-grid)"/><text x="${pl - 6}" y="${y(t) + 3}" font-size="10" text-anchor="end" fill="var(--viz-axis)">${fmtB(t)}</text>`; });
    bars.forEach((b, j) => {
      const st = partStatus(b.max, med, model.memTask), x = pl + j * bw;
      if (!st) { svg += `<rect x="${x}" y="${pt + ih - 1}" width="${Math.max(1, bw - gap)}" height="1" fill="var(--viz-axis)" opacity="0.4"/>`; }
      else {
        const top = y(b.max), hgt = Math.max(1.5, pt + ih - top), w = Math.max(1, bw - gap), r = Math.min(4, w / 2, hgt);
        svg += `<path d="M${x},${pt + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${pt + ih} Z" fill="var(${SEV[st].v})"/>`;
      }
      svg += `<rect class="hit" data-j="${j}" x="${x}" y="${pt}" width="${Math.max(bw, 1)}" height="${ih}" fill="transparent"/>`;
    });
    if (med > 0) svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(med)}" y2="${y(med)}" stroke="var(--text-muted)" stroke-dasharray="4 4"/><text x="${W - pr}" y="${y(med) - 4}" font-size="10" text-anchor="end" fill="var(--text-muted)">median ${fmtB(med)}</text>`;
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${pt + ih}" y2="${pt + ih}" stroke="var(--viz-axis)"/>`;
    svg += `<text x="${pl}" y="${H - 6}" font-size="10" fill="var(--viz-axis)">partition 0</text><text x="${W - pr}" y="${H - 6}" font-size="10" text-anchor="end" fill="var(--viz-axis)">${fmtN(arr.length - 1)}${k > 1 ? ` · each bar = max of ${k}` : ''}</text></svg>`;
    host.innerHTML = `<div class="sx-chart-title" style="font-size:0.78rem;color:var(--text-muted);margin:6px 0 2px;">${esc(opts.title)}</div>` + svg;
    const tip = document.createElement('div'); tip.className = 'sx-tip'; host.appendChild(tip); host.style.position = 'relative';
    const svgEl = host.querySelector('svg');
    svgEl.addEventListener('mousemove', e => {
      const t = e.target.closest('.hit'); if (!t) { tip.style.display = 'none'; return; }
      const b = bars[+t.dataset.j], st = partStatus(b.max, med, model.memTask);
      tip.innerHTML = (b.i0 === b.i1 ? `Partition <b>${b.i0}</b>` : `Partitions <b>${b.i0}–${b.i1}</b>`) + `<br>${b.i0 === b.i1 ? 'Size' : 'Largest'}: <b>${fmtB(b.max)}</b>` + (b.i0 !== b.i1 ? `<br>Total: <b>${fmtB(b.sum)}</b>${b.empty ? ` · ${b.empty} empty` : ''}` : '') + `<br>${st ? STATUS_LABEL[st] : 'empty (no keys hashed here)'}`;
      const r = host.getBoundingClientRect(); tip.style.display = 'block';
      let lx = e.clientX - r.left + 12; if (lx > r.width - 200) lx = e.clientX - r.left - 210;
      tip.style.left = lx + 'px'; tip.style.top = (e.clientY - r.top - 10) + 'px';
    });
    svgEl.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }

  function renderPartChart() {
    const host = $('sxPartChart'), m = model;
    if (!m.exchanges.length) {
      host.innerHTML = `<div class="sx-hint" style="padding:30px 10px;text-align:center;font-size:0.9rem;"><i data-lucide="check-circle-2" style="width:18px;height:18px;color:var(--exec-green);vertical-align:-3px;"></i> No exchange in this plan — read partitions flow straight to the sink. Pick a wide operation to see shuffle partitions.</div>`;
      $('sxPartTitle').textContent = 'Shuffle partition sizes'; $('sxPartNote').textContent = ''; $('sxPartLegend').innerHTML = ''; return;
    }
    const ex = m.exchanges[selEx];
    const st = ex.stats || {};
    $('sxPartTitle').textContent = `Exchange ${selEx + 1}: ${ex.kind === 'hash' ? 'hashpartitioning' : ex.kind === 'range' ? 'rangepartitioning' : 'RoundRobinPartitioning'}(${ex.label}, ${ex.N})`;
    $('sxPartNote').textContent = `${fmtB(ex.D)} shuffled · ${fmtN(st.nonEmpty || 0)} non-empty of ${fmtN(ex.N)} · max ${fmtB(st.max || 0)}`;
    const after = ex.skew ? ex.skew.arr : ex.aqe ? ex.arrFinal : null;
    host.innerHTML = '<div id="sxPc1"></div><div id="sxPc2"></div>';
    barChart($('sxPc1'), ex.arr, { h: after ? 170 : 220, title: `Planned: ${fmtN(ex.N)} shuffle partitions (spark.sql.shuffle.partitions${ex.kind === 'rr' ? ' / repartition(N)' : ''})`, aria: 'Shuffle partition sizes before AQE' });
    if (after) barChart($('sxPc2'), after, { h: 150, title: `After AQE: ${fmtN(after.length)} reduce tasks${ex.aqe ? ` (coalesced toward ~${fmtB(ex.aqe.target)})` : ''}${ex.skew ? ` · ${ex.skew.splits} skewed partition(s) split into ${ex.skew.pieces}` : ''}`, aria: 'Reduce task input sizes after AQE' });
    $('sxPartLegend').innerHTML = ['good', 'warning', 'serious', 'critical'].map(s => `<span><span class="sx-swatch" style="background:var(${SEV[s].v})"></span>${STATUS_LABEL[s]}</span>`).join('') + '<span>— — median</span>';
  }

  // ---------------- gantt ----------------
  function renderStageTabs() {
    $('sxStageTabs').innerHTML = model.stages.map(s => `<button type="button" role="tab" aria-selected="${s.id === selStage}" class="sx-pill${s.id === selStage ? ' active' : ''}" data-st="${s.id}">Stage ${s.id} · ${fmtN(s.n)} tasks</button>`).join('');
    $('sxStageTabs').querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { selStage = +b.dataset.st; renderDag(); renderStageTabs(); renderGantt(); }));
  }
  let ganttHit = null;
  function renderGantt() {
    const s = model.stages[selStage], cv = $('sxGantt'), P = model.P, cores = state.cores;
    $('sxGanttTitle').textContent = `Stage ${s.id}: ${s.name}`;
    $('sxGanttNote').textContent = `${fmtN(s.n)} tasks on ${P} slots · ${fmtN(Math.ceil(s.n / P))} wave(s) · median ${fmtT(s.medT || 0)} · max ${fmtT(s.maxT || 0)} · stage ${fmtT(s.time)}`;
    const laneH = Math.max(1.2, Math.min(10, 300 / P)), axis = 22, H = Math.ceil(P * laneH + axis + 6);
    const W = Math.max(280, cv.parentElement.clientWidth || 600), dpr = window.devicePixelRatio || 1;
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const cGrid = cssVar('--viz-grid'), cAxis = cssVar('--viz-axis'), cTask = cssVar('--viz-s1'), cStr = cssVar('--st-crit');
    const pl = 46, pr = 10, iw = W - pl - pr;
    ctx.font = '10px ' + getComputedStyle(document.body).fontFamily;
    if (!s.sched) {
      ctx.fillStyle = cAxis; ctx.fillText(`${fmtN(s.n)} tasks — too many to draw individually. Each wave ≈ ${fmtT(s.medT)}; ${fmtN(Math.ceil(s.n / P))} waves on ${P} slots.`, pl, 30);
      ganttHit = null; return;
    }
    const tmax = Math.max(...s.sched.map(t => t.end), 0.001), xs = v => pl + v / tmax * iw;
    // worker bands
    for (let w = 0; w < state.workers; w++) {
      const y0 = w * cores * laneH;
      if (w % 2 === 1) { ctx.fillStyle = cGrid; ctx.fillRect(pl, y0, iw, cores * laneH); }
      if (cores * laneH >= 10) { ctx.fillStyle = cAxis; ctx.fillText('W' + (w + 1), 6, y0 + Math.min(cores * laneH, 14) - 2); }
    }
    const med = s.medT || 0, row = slot => (slot % state.workers) * cores + Math.floor(slot / state.workers);
    s.sched.forEach(t => {
      const y = row(t.slot) * laneH, x = xs(t.start), w = Math.max(0.6, xs(t.end) - x - (laneH > 3 ? 0.8 : 0));
      ctx.fillStyle = (t.end - t.start) > 3 * med && med > 0 ? cStr : cTask;
      ctx.fillRect(x, y + (laneH > 3 ? 0.5 : 0), w, Math.max(0.8, laneH - (laneH > 3 ? 1 : 0)));
    });
    const yA = P * laneH + 4;
    ctx.strokeStyle = cAxis; ctx.beginPath(); ctx.moveTo(pl, yA); ctx.lineTo(W - pr, yA); ctx.stroke();
    ctx.fillStyle = cAxis;
    for (let i = 0; i <= 5; i++) { const v = tmax * i / 5, x = xs(v); ctx.fillText(i === 0 ? '0' : fmtT(v), Math.min(x, W - pr - 40), yA + 14); }
    ganttHit = { s, laneH, xs, tmax, pl, iw, row };
  }
  function initGanttHover() {
    const cv = $('sxGantt'), tip = $('sxGanttTip');
    cv.addEventListener('mousemove', e => {
      if (!ganttHit) return;
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const lane = Math.floor(my / ganttHit.laneH), tv = (mx - ganttHit.pl) / ganttHit.iw * ganttHit.tmax;
      const t = ganttHit.s.sched.find(q => ganttHit.row(q.slot) === lane && q.start <= tv && q.end >= tv);
      if (!t) { tip.style.display = 'none'; return; }
      const s = ganttHit.s, bytes = s.arr ? s.arr[t.i] : s.avg;
      tip.innerHTML = `Task <b>${t.i}</b> · worker ${t.slot % state.workers + 1}<br>Input <b>${fmtB(bytes)}</b><br>Ran <b>${fmtT(t.end - t.start)}</b> (${fmtT(t.start)} → ${fmtT(t.end)})`;
      tip.style.display = 'block';
      let lx = mx + 12; if (lx > r.width - 190) lx = mx - 200;
      tip.style.left = lx + 'px'; tip.style.top = Math.max(0, my - 10) + 'px';
    });
    cv.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }

  // ---------------- advisor ----------------
  function renderFindings() {
    $('sxFindings').innerHTML = model.findings.map(f => {
      const s = SEV[f.sev];
      return `<div class="sx-find" style="--sev:var(${s.v})"><div class="sx-find-hd"><span class="sx-sev"><i data-lucide="${s.icon}" style="width:11px;height:11px;"></i>${s.label}</span>${esc(f.title)}</div><p>${esc(f.detail)}</p><p class="fix">${esc(f.fix)}</p></div>`;
    }).join('') || '<div class="sx-hint">No findings.</div>';
  }

  // ---------------- volume sweep ----------------
  const SWEEP = [
    { key: 'A', label: 'A · 200 partitions, AQE off', v: '--viz-s2', patch: { parts: 200, aqe: false } },
    { key: 'B', label: 'B · 200 partitions, AQE on', v: '--viz-s1', patch: { parts: 200, aqe: true } },
    { key: 'C', label: 'C · sized ≈128 MB/partition, AQE on', v: '--viz-s3', patch: { parts: 'auto', aqe: true } }
  ];
  const TIME_TICKS = [0.1, 1, 10, 60, 600, 3600, 36000, 360000];
  const TIME_LBL = { 0.1: '100 ms', 1: '1 s', 10: '10 s', 60: '1 min', 600: '10 min', 3600: '1 h', 36000: '10 h', 360000: '100 h' };
  const BYTE_TICKS = [1, 2, 3, 4, 5, 6].flatMap(p => [1, 10, 100].map(k => k * 1024 ** p)).filter(v => v < 1024 ** 5);
  let sweepCache = { key: '', data: null };
  function sweepData() {
    const k = JSON.stringify(Object.assign({}, state, { volIdx: 0, parts: 0, aqe: 0 }));
    if (sweepCache.key === k) return sweepCache.data;
    const data = SWEEP.map(cfg => VOL_LABELS.map((_, vi) => {
      const mm = M.buildModel(Object.assign({}, state, cfg.patch, { volIdx: vi }), false);
      let big = null; mm.exchanges.forEach(e => { if (!big || e.D > big.D) big = e; });
      const tasks = big ? (big.skew ? big.skew.arr.length : big.arrFinal.length) : 0;
      return { t: mm.totalSec, avgPart: big ? big.D / Math.max(1, tasks) : null, N: big ? big.N : 0, tasks, shuffle: mm.shuffleBytes, readTasks: mm.stages[0].n, spill: mm.spillBytes, health: mm.health };
    }));
    sweepCache = { key: k, data }; return data;
  }
  function lineChart(host, series, opts) {
    const W = Math.max(280, host.clientWidth || 500), H = 240, pl = 58, pr = 26, pt = 12, pb = 30;
    const iw = W - pl - pr, ih = H - pt - pb, n = VOL_LABELS.length;
    const vals = series.flatMap(s => s.pts.map(p => p.v)).filter(v => v != null && v > 0);
    if (!vals.length) { host.innerHTML = `<div class="sx-hint" style="padding:60px 10px;text-align:center;">${esc(opts.empty || 'No data')}</div>`; return; }
    const vmin = Math.min(...vals, opts.bandLo || Infinity), vmax = Math.max(...vals, opts.bandHi || 0);
    const T = opts.ticks;
    let i0 = 0; while (i0 < T.length - 1 && T[i0 + 1] <= vmin) i0++;
    let i1 = T.length - 1; while (i1 > 0 && T[i1 - 1] >= vmax) i1--;
    if (i1 <= i0) i1 = Math.min(T.length - 1, i0 + 1);
    const ticks = T.slice(i0, i1 + 1), lo = Math.log10(ticks[0]), hi = Math.log10(ticks[ticks.length - 1]);
    const x = i => pl + i / (n - 1) * iw, y = v => pt + ih - (Math.log10(v) - lo) / (hi - lo) * ih;
    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria)}">`;
    if (opts.bandLo) svg += `<rect x="${pl}" width="${iw}" y="${y(opts.bandHi)}" height="${y(opts.bandLo) - y(opts.bandHi)}" fill="var(--viz-band)"/>`;
    ticks.forEach(t => { svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--viz-grid)"/><text x="${pl - 6}" y="${y(t) + 3}" font-size="10" text-anchor="end" fill="var(--viz-axis)">${opts.tickFmt(t)}</text>`; });
    VOL_LABELS.forEach((l, i) => { if (i % 2 === 0 || W > 520) svg += `<text x="${x(i)}" y="${H - 10}" font-size="10" text-anchor="middle" fill="var(--viz-axis)">${l.replace(' ', '')}</text>`; });
    svg += `<line x1="${x(state.volIdx)}" x2="${x(state.volIdx)}" y1="${pt}" y2="${pt + ih}" stroke="var(--spark-orange)" stroke-dasharray="3 3"/>`;
    const ends = [];
    series.forEach(s => {
      let d = ''; s.pts.forEach((p, i) => { if (p.v == null || p.v <= 0) return; d += (d ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1); });
      svg += `<path d="${d}" fill="none" stroke="var(${s.v})" stroke-width="2" stroke-linejoin="round"/>`;
      const last = s.pts.length - 1; if (s.pts[last].v > 0) ends.push({ k: s.key, y: y(s.pts[last].v), v: s.v });
    });
    ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 11) ends[i].y = ends[i - 1].y + 11;
    ends.forEach(e => { svg += `<text x="${W - pr + 4}" y="${e.y + 3}" font-size="10" font-weight="700" fill="var(--text-main)">${e.k}</text>`; });
    svg += `<g class="xh" style="display:none"><line y1="${pt}" y2="${pt + ih}" stroke="var(--viz-axis)"/>${series.map(s => `<circle r="4.5" fill="var(${s.v})" stroke="var(--bg-card)" stroke-width="2"/>`).join('')}</g>`;
    svg += `<rect class="hitarea" x="${pl}" y="${pt}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;
    host.innerHTML = svg;
    const tip = document.createElement('div'); tip.className = 'sx-tip'; host.appendChild(tip);
    const svgEl = host.querySelector('svg'), xh = svgEl.querySelector('.xh');
    svgEl.addEventListener('mousemove', e => {
      const r = svgEl.getBoundingClientRect(), mx = e.clientX - r.left;
      const i = Math.max(0, Math.min(n - 1, Math.round((mx - pl) / iw * (n - 1))));
      xh.style.display = ''; xh.querySelector('line').setAttribute('x1', x(i)); xh.querySelector('line').setAttribute('x2', x(i));
      xh.querySelectorAll('circle').forEach((c, j) => { const v = series[j].pts[i].v; if (v > 0) { c.setAttribute('cx', x(i)); c.setAttribute('cy', y(v)); c.style.display = ''; } else c.style.display = 'none'; });
      tip.innerHTML = `<b>${VOL_LABELS[i]}</b>` + series.map(s => `<br><span class="sx-swatch" style="background:var(${s.v});width:9px;height:9px;"></span> ${s.key}: <b>${s.pts[i].v > 0 ? opts.fmt(s.pts[i].v) : '—'}</b>${s.pts[i].extra ? ' · ' + s.pts[i].extra : ''}`).join('');
      tip.style.display = 'block'; let lx = mx + 14; if (lx > r.width - 200) lx = mx - 210; tip.style.left = lx + 'px'; tip.style.top = '8px';
    });
    svgEl.addEventListener('mouseleave', () => { xh.style.display = 'none'; tip.style.display = 'none'; });
    svgEl.addEventListener('click', e => {
      const r = svgEl.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - pl) / iw * (n - 1))));
      set({ volIdx: i });
    });
  }
  function renderSweep() {
    const data = sweepData();
    lineChart($('sxSweepTime'), SWEEP.map((c, j) => ({ key: c.key, v: c.v, pts: data[j].map(d => ({ v: d.t })) })), { fmt: fmtT, ticks: TIME_TICKS, tickFmt: t => TIME_LBL[t], aria: 'Simulated runtime by volume for three configurations' });
    const hasShuffle = data[0].some(d => d.avgPart != null);
    lineChart($('sxSweepPart'), hasShuffle ? SWEEP.map((c, j) => ({ key: c.key, v: c.v, pts: data[j].map(d => ({ v: d.avgPart, extra: d.tasks ? fmtN(d.tasks) + ' tasks' : '' })) })) : [], { fmt: fmtB, ticks: BYTE_TICKS, tickFmt: t => fmtB(t).replace(/\.0+ /, ' '), bandLo: 64 * MB, bandHi: 256 * MB, aria: 'Average shuffle partition size by volume', empty: 'This operation has no shuffle — partition size is set by the source splits.' });
    $('sxSweepLegend').innerHTML = SWEEP.map(c => `<span><span class="sx-swatch" style="background:var(${c.v})"></span>${esc(c.label)}</span>`).join('') + '<span><span class="sx-swatch" style="background:var(--spark-orange);width:3px;"></span>current volume · click a chart to jump</span>';
    const sev = h => `<span class="sx-dot" style="background:var(${SEV[h].v})"></span> ${SEV[h].label}`;
    let html = '<thead><tr><th>Volume</th><th>Read tasks</th><th>Shuffle data</th><th>Avg part @200</th><th>AQE tasks</th><th>Sized N</th><th>Time A</th><th>Time B</th><th>Time C</th><th>Spill A</th><th>Spill C</th><th>Health C</th></tr></thead><tbody>';
    VOL_LABELS.forEach((l, i) => {
      const a = data[0][i], b = data[1][i], c = data[2][i];
      html += `<tr class="${i === state.volIdx ? 'cur' : ''}"><td>${l}</td><td>${fmtN(a.readTasks)}</td><td>${a.shuffle ? fmtB(a.shuffle) : '—'}</td><td>${a.avgPart != null ? fmtB(a.avgPart) : '—'}</td><td>${b.tasks ? fmtN(b.tasks) : '—'}</td><td>${c.N ? fmtN(c.N) : '—'}</td><td>${fmtT(a.t)}</td><td>${fmtT(b.t)}</td><td>${fmtT(c.t)}</td><td>${fmtB(a.spill)}</td><td>${fmtB(c.spill)}</td><td>${sev(c.health)}</td></tr>`;
    });
    $('sxSweepTable').innerHTML = html + '</tbody>';
  }

  // ---------------- static reference content ----------------
  const LADDER = [
    ['select', 'df.select(cols)', 'narrow', '—', 0, '—', '—', 'No'],
    ['filter', 'df.filter(cond)', 'narrow', '—', 0, '—', '—', 'No'],
    ['withcol', 'withColumn / when / cast', 'narrow', '—', 0, '—', '—', 'No'],
    ['coalesce', 'df.coalesce(n)', 'narrow', '— (merges splits)', 0, '—', '—', 'Collapses upstream parallelism'],
    ['distinct', 'distinct() / dropDuplicates()', 'wide', 'hashpartitioning(all cols)', 1, 'Yes', 'Coalesce', 'Low'],
    ['groupby', 'groupBy().agg(sum, count)', 'wide', 'hashpartitioning(keys)', 1, 'Yes', 'Coalesce', 'Low (partial agg absorbs it)'],
    ['groupby_collect', 'groupBy().agg(collect_list)', 'wide', 'hashpartitioning(keys)', 1, 'No size reduction', 'Coalesce only', 'High — AQE will not split'],
    ['orderby', 'orderBy() / sort()', 'wide', 'rangepartitioning + sample job', 1, '—', 'Coalesce', 'High on repeated values'],
    ['window', 'Window.partitionBy().orderBy()', 'wide', 'hashpartitioning(partition keys)', 1, 'No', 'Coalesce only', 'High — AQE will not split'],
    ['join_small', 'join(small_dim)', 'wide → none', 'BroadcastExchange (if ≤ threshold)', '0 or 2', '—', 'Can convert SMJ→BHJ at runtime', 'None when broadcast'],
    ['join_large', 'join(large) sort-merge', 'wide', 'hashpartitioning(key) × 2 sides', 2, '—', 'Coalesce + skew-join split', 'High — AQE splits it'],
    ['repartition', 'repartition(n)', 'wide', 'RoundRobinPartitioning(n)', 1, '—', 'Not coalesced (explicit N)', 'None (even)'],
    ['complex', 'filter→join→groupBy→window→orderBy', 'wide', 'join + window + range', '3–4', 'Yes (agg)', 'All of the above', 'Window on low-card key']
  ];
  function renderLadder() {
    let h = '<thead><tr><th class="l">Operation</th><th class="l">Dependency</th><th class="l">Exchange in plan</th><th>Shuffles</th><th class="l">Map-side combine</th><th class="l">What AQE does</th><th class="l">Skew sensitivity</th><th></th></tr></thead><tbody>';
    LADDER.forEach(r => {
      h += `<tr><td class="l"><code>${esc(r[1])}</code></td><td class="l"><span class="sx-tag ${r[2].startsWith('narrow') ? 'narrow' : 'wide'}">${esc(r[2].toUpperCase())}</span></td><td class="l">${esc(r[3])}</td><td>${r[4]}</td><td class="l">${esc(r[5])}</td><td class="l">${esc(r[6])}</td><td class="l">${esc(r[7])}</td><td><button type="button" class="sx-pill" data-load-op="${r[0]}">Load</button></td></tr>`;
    });
    $('sxLadder').innerHTML = h + '</tbody>';
  }

  const SOURCE_CARDS = [
    { k: 'parquet', icon: 'file-box', acc: 'var(--exec-green)', title: 'Parquet / Delta on object storage', p: 'Splittable, columnar, statistics-rich. The best default source.', li: ['Read tasks ≈ total bytes ÷ <code>maxSplitBytes</code> where maxSplitBytes = min(<code>spark.sql.files.maxPartitionBytes</code> 128 MB, max(<code>openCostInBytes</code> 4 MB, bytes ÷ cores)).', 'Column pruning reads only selected columns; row-group min/max + Delta data skipping prune I/O.', 'Partition columns (<code>event_date=…</code>) give directory pruning when filtered.'] },
    { k: 'smallfiles', icon: 'files', acc: 'var(--st-crit)', title: 'Many small files', p: 'Same format, wrong geometry: 100Ks of KB-sized objects.', li: ['Driver lists every object and reads footers — minutes before the first task.', 'Each file costs a 4 MB "open cost" when packing splits, plus one GET per file.', 'Fix upstream: <code>OPTIMIZE</code>, auto-compaction, or a compaction job writing 128 MB–1 GB files.'] },
    { k: 'csvgz', icon: 'file-archive', acc: 'var(--st-warn)', title: 'CSV / JSON with gzip', p: 'Row text formats: no column pruning, no stats, and gzip is not splittable.', li: ['1 task per <code>.gz</code> file — a 40 GB gzip is a single 40 GB task.', 'Always pass an explicit schema (avoid <code>inferSchema</code> double read).', 'Convert to Parquet/Delta at the bronze layer; <code>repartition()</code> right after read if you cannot.'] },
    { k: 'jdbc1', icon: 'database', acc: 'var(--st-crit)', title: 'RDBMS via JDBC (default)', p: 'Without partitioning options Spark opens exactly one connection.', li: ['<code>spark.read.jdbc(url, table)</code> → 1 partition, 1 task, 1 DB session.', 'Projection and simple filters are pushed down into the SQL <code>WHERE</code>.', 'Default <code>fetchsize</code> is driver-specific (Oracle 10 rows!) — set 5K–10K.'] },
    { k: 'jdbcN', icon: 'database-zap', acc: 'var(--driver-blue)', title: 'RDBMS via JDBC (parallel)', p: 'partitionColumn + lowerBound + upperBound + numPartitions.', li: ['Spark issues N queries with <code>WHERE col &gt;= x AND col &lt; y</code> strides — equal value ranges, not equal rows.', 'Bounds do not filter: rows outside go to the first/last partition.', 'Cap numPartitions to what the DB tolerates; use <code>predicates=[…]</code> for skewed keys or read replicas.'] },
    { k: 'mpp', icon: 'warehouse', acc: 'var(--worker-purple)', title: 'Snowflake / Redshift / BigQuery / Synapse', p: 'Native connectors unload in bulk instead of streaming rows over one socket.', li: ['Query/filters pushed into the warehouse; results UNLOAD to a stage (S3/ADLS/GCS).', 'Spark reads staged Parquet in parallel → read tasks scale with unload files.', 'Watch warehouse credits and stage cleanup; avoid generic JDBC for MPP engines.'] }
  ];
  const TARGET_CARDS = [
    { k: 'parquet', icon: 'hard-drive-upload', acc: 'var(--exec-green)', title: 'Delta / Parquet table', p: 'Files written = non-empty tasks of the final stage.', li: ['200 shuffle partitions on a 500 MB result ⇒ 200 × 2.5 MB files.', 'Size output with AQE coalesce, <code>repartition(n)</code>, or Delta <code>optimizeWrite</code>.', 'Use S3A magic / Delta commit protocol — never rename-based commits on S3.'] },
    { k: 'partitioned', icon: 'folder-tree', acc: 'var(--st-crit)', title: 'partitionBy("event_date")', p: 'Each task writes one file per partition value it contains.', li: ['2,000 tasks × 365 dates ⇒ up to 730,000 files.', '<code>df.repartition("event_date").write.partitionBy("event_date")</code> ⇒ ~1 file per date.', 'Large dates: <code>repartition(N, "event_date", salt)</code> or <code>maxRecordsPerFile</code>.'] },
    { k: 'delta_merge', icon: 'git-merge', acc: 'var(--storage-amber)', title: 'Delta MERGE INTO', p: 'An upsert is a join between the source and the target files it touches.', li: ['Target files matching source keys are scanned, joined (shuffle) and rewritten.', 'Add partition predicates to the ON clause; Z-ORDER / liquid-cluster on the merge key.', 'Deletion vectors and low-shuffle merge cut rewrite volume.'] },
    { k: 'jdbc', icon: 'database', acc: 'var(--st-serious)', title: 'RDBMS via JDBC write', p: 'Each non-empty partition opens its own connection and INSERTs in batches.', li: ['200 partitions ⇒ 200 concurrent sessions → max_connections, lock waits.', '<code>coalesce(16–32)</code> before write; <code>batchsize=10000</code>; <code>isolationLevel=NONE</code> for staging tables.', 'For big loads, write files and bulk-load (COPY / bcp / SQL*Loader).'] },
    { k: 'snowflake', icon: 'snowflake', acc: 'var(--worker-purple)', title: 'Snowflake / MPP write', p: 'Spark writes staged files, the warehouse runs COPY INTO.', li: ['File count and size matter to COPY parallelism (aim 100–250 MB compressed).', 'Warehouse size drives COPY time and credit burn.', 'Prefer append + MERGE inside the warehouse over row-level JDBC upserts.'] },
    { k: 'count', icon: 'calculator', acc: 'var(--driver-blue)', title: 'Actions: count / display / collect', p: 'Results return to the driver.', li: ['<code>count()</code> on Delta/Parquet can use metadata; with filters it still scans.', '<code>collect()</code> / <code>toPandas()</code> on large data ⇒ driver OOM (<code>spark.driver.maxResultSize</code>).', 'Each action re-runs the lineage unless cached.'] }
  ];
  function cards(host, list, field) {
    host.innerHTML = list.map(c => `<div class="sx-card" style="--acc:${c.acc}"><h4><i data-lucide="${c.icon}" style="width:16px;height:16px;color:${c.acc}"></i>${esc(c.title)}</h4><p>${esc(c.p)}</p><ul>${c.li.map(x => `<li>${x}</li>`).join('')}</ul><button type="button" class="sx-pill sx-load" data-load-${field}="${c.k}">Load in simulator</button></div>`).join('');
  }
  function renderNarrowWide() {
    let n = '', w = '';
    const ys = [32, 62, 92, 122];
    ys.forEach((y, i) => {
      n += `<rect x="20" y="${y - 10}" width="70" height="20" rx="4" fill="var(--exec-green)" opacity="0.85"/><text x="55" y="${y + 4}" font-size="10" text-anchor="middle" fill="#fff">P${i}</text>`;
      n += `<line x1="92" y1="${y}" x2="208" y2="${y}" stroke="var(--exec-green)" stroke-width="2"/>`;
      n += `<rect x="210" y="${y - 10}" width="70" height="20" rx="4" fill="var(--exec-green)" opacity="0.55"/><text x="245" y="${y + 4}" font-size="10" text-anchor="middle" fill="#fff">P${i}′</text>`;
      w += `<rect x="20" y="${y - 10}" width="70" height="20" rx="4" fill="var(--driver-blue)" opacity="0.85"/><text x="55" y="${y + 4}" font-size="10" text-anchor="middle" fill="#fff">map ${i}</text>`;
      w += `<rect x="210" y="${y - 10}" width="70" height="20" rx="4" fill="var(--shuffle-rose)" opacity="0.85"/><text x="245" y="${y + 4}" font-size="10" text-anchor="middle" fill="#fff">reduce ${i}</text>`;
      ys.forEach(y2 => { w += `<line x1="92" y1="${y}" x2="208" y2="${y2}" stroke="var(--shuffle-rose)" stroke-width="1" opacity="0.55"/>`; });
    });
    $('sxNarrowSvg').innerHTML = n; $('sxWideSvg').innerHTML = w;
  }
  function initStatic() {
    renderLadder(); renderNarrowWide();
    cards($('sxSourceCards'), SOURCE_CARDS, 'source'); cards($('sxTargetCards'), TARGET_CARDS, 'target');
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-load-op],[data-load-source],[data-load-target]'); if (!b) return;
      if (b.dataset.loadOp) set({ op: b.dataset.loadOp });
      if (b.dataset.loadSource) set({ source: b.dataset.loadSource });
      if (b.dataset.loadTarget) set({ target: b.dataset.loadTarget });
      document.getElementById('sec-lab-sim').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ---------------- URL state ----------------
  const KEYS = Object.keys(DEFAULT);
  function encodeState() { return KEYS.map(k => k + '=' + encodeURIComponent(state[k])).join('&'); }
  function decodeState() {
    const h = location.hash.slice(1); if (!h.includes('=')) return;
    h.split('&').forEach(kv => {
      const [k, v] = kv.split('='); if (!KEYS.includes(k) || v === undefined) return;
      const d = decodeURIComponent(v), def = DEFAULT[k];
      if (typeof def === 'boolean') state[k] = d === 'true';
      else if (k === 'parts') state[k] = d === 'auto' ? 'auto' : +d || def;
      else if (typeof def === 'number') state[k] = isNaN(+d) ? def : +d;
      else state[k] = d;
    });
    if (!SRC[state.source]) state.source = DEFAULT.source;
    if (!OPS[state.op]) state.op = DEFAULT.op;
    if (!TGT[state.target]) state.target = DEFAULT.target;
    state.volIdx = Math.max(0, Math.min(10, state.volIdx | 0));
  }

  function init() {
    decodeState(); initControls(); initStatic(); initGanttHover(); syncControls(); render();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderPartChart(); renderGantt(); renderSweep(); }, 150); });
    const mo = new MutationObserver(() => { renderGantt(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
