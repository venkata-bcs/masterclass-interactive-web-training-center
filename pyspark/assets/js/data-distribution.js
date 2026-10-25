/* =========================================================================
   Data Distribution & File Splits Explorer (Material 3, light)
   Split planning mirrors Spark's FilePartition logic:
     maxSplitBytes = min(maxPartitionBytes, max(openCostInBytes, Σ(len + openCost) / parallelism))
     files are cut into maxSplitBytes chunks (if splittable), sorted by size desc,
     then bin-packed: close the partition when current + chunk > maxSplitBytes,
     each chunk adds chunk + openCost to the running size.
   Parquet: a task reads the row groups whose midpoint lies in its byte range.
   Sizes are in MB.
   ========================================================================= */
(function (root) {
  'use strict';

  // ---------------- engine (pure) ----------------
  function plan(files, o) {
    const total = files.reduce((a, f) => a + f.size + o.openCost, 0);
    const bpc = total / Math.max(1, o.cores);
    const maxSplit = Math.min(o.maxPB, Math.max(o.openCost, bpc));
    const winner = maxSplit === o.maxPB ? 'maxPB' : (o.openCost >= bpc ? 'open' : 'bpc');
    const chunks = [];
    files.forEach((f, fi) => {
      if (f.splittable) { for (let off = 0; off < f.size - 1e-9; off += maxSplit) chunks.push({ fi, f, start: off, len: Math.min(maxSplit, f.size - off) }); }
      else chunks.push({ fi, f, start: 0, len: f.size });
    });
    const sorted = chunks.map((c, i) => Object.assign(c, { seq: i })).slice().sort((a, b) => b.len - a.len || a.seq - b.seq);
    const parts = []; let cur = [], cs = 0;
    const close = () => { if (cur.length) { parts.push({ chunks: cur, bytes: cur.reduce((a, c) => a + c.len, 0), cost: cs }); cur = []; cs = 0; } };
    sorted.forEach(c => { if (cur.length && cs + c.len > maxSplit) close(); cur.push(c); cs += c.len + o.openCost; });
    close();
    parts.forEach((p, i) => {
      p.i = i; p.rgs = []; p.read = 0;
      p.chunks.forEach(c => {
        c.p = i;
        if (c.f.format === 'parquet' && c.f.rg) {
          const n = Math.ceil(c.f.size / c.f.rg - 1e-9);
          for (let k = 0; k < n; k++) {
            const s = k * c.f.rg, len = Math.min(c.f.rg, c.f.size - s), mid = s + len / 2;
            if (mid >= c.start && mid < c.start + c.len) { p.rgs.push({ fi: c.fi, k, len }); p.read += len; }
          }
        } else p.read += c.len;
      });
      p.empty = p.read <= 0;
    });
    return { total, bpc, maxSplit, winner, chunks, parts };
  }
  function assign(nTasks, W, C) {
    const slots = W * C;
    return Array.from({ length: nTasks }, (_, i) => { const slot = i % slots; return { i, wave: Math.floor(i / slots), slot, w: slot % W, core: Math.floor(slot / W) }; });
  }
  const API = { plan, assign };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  root.SplitEngine = API;
  if (typeof document === 'undefined') return;

  // ---------------- helpers ----------------
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = mb => mb <= 0 ? '0 MB' : mb >= 1024 ? (mb / 1024).toFixed(mb % 1024 ? 2 : 0).replace(/\.?0+$/, '') + ' GB' : mb >= 10 ? Math.round(mb) + ' MB' : mb >= 1 ? mb.toFixed(1).replace(/\.0$/, '') + ' MB' : Math.max(1, Math.round(mb * 1024)) + ' KB';
  const bytes = mb => Math.round(mb * 1048576).toLocaleString('en-US');
  const brange = c => `${bytes(c.start)}–${(Math.round((c.start + c.len) * 1048576) - 1).toLocaleString('en-US')}`;
  const W_COL = i => `var(--w${i % 8})`;
  const W_NAME = i => 'Worker ' + String.fromCharCode(65 + i);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  let speed = 1;
  const wait = ms => ms / speed;
  const timers = {};
  function later(group, fn, ms) { (timers[group] = timers[group] || []).push(setTimeout(fn, reduceMotion ? 0 : wait(ms))); }
  function cancel(group) { (timers[group] || []).forEach(clearTimeout); timers[group] = []; }
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function rangeFill(el) { const p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p + '%'); }
  function slider(id, label, min, max, val, out) {
    return `<div class="dd-field"><span class="dd-label">${label}</span><div class="dd-slider"><input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${val}" aria-label="${esc(label)}"><output id="${id}Out">${out}</output></div></div>`;
  }
  function seg(name, opts, val, label) {
    return `<div class="dd-field">${label ? `<span class="dd-label">${label}</span>` : ''}<div class="dd-seg" role="group" aria-label="${esc(label || name)}">${opts.map(([v, l]) => `<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${String(v) === String(val)}">${l}</button>`).join('')}</div></div>`;
  }
  function kpi(l, v, s) { return `<div class="dd-kpi"><div class="dd-kpi-l">${l}</div><div class="dd-kpi-v">${v}</div>${s ? `<div class="dd-kpi-s">${s}</div>` : ''}</div>`; }
  function codeBlock(t) { return `<pre class="dd-pre">${esc(t).replace(/(#[^\n]*|--[^\n]*)/g, '<span class="c">$1</span>')}</pre>`; }
  function bindRange(id, fn) { const el = $(id); rangeFill(el); el.addEventListener('input', () => { rangeFill(el); fn(+el.value); }); }
  function bindSeg(host, fn) {
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-seg]'); if (!b) return;
      host.querySelectorAll(`[data-seg="${b.dataset.seg}"]`).forEach(x => x.setAttribute('aria-pressed', x === b));
      fn(b.dataset.seg, b.dataset.v);
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.dd .dd-btn'); if (!b || reduceMotion) return;
    const r = b.getBoundingClientRect(), s = document.createElement('span'), z = Math.max(r.width, r.height);
    s.className = 'dd-ripple'; s.style.width = s.style.height = z + 'px'; s.style.left = (e.clientX - r.left - z / 2) + 'px'; s.style.top = (e.clientY - r.top - z / 2) + 'px';
    b.appendChild(s); setTimeout(() => s.remove(), 550);
  });

  // =====================================================================
  // 01 · ROWS VS COLUMNS
  // =====================================================================
  const SCHEMA = [['user_id', 8], ['amount', 8], ['city', 12], ['ts', 8], ['device', 16], ['tenant_id', 8], ['notes', 120], ['payload', 400]];
  const ROWS_OPTS = [1e6, 1e7, 1e8, 1e9];
  const R = { rows: 1e6, parts: 4, W: 4, sel: new Set(['user_id', 'amount']) };
  function rowsUI() {
    $('ddRows').innerHTML = `<div class="dd-card">
      <div class="dd-controls" style="margin-bottom:14px;">
        ${seg('rows', ROWS_OPTS.map(v => [v, v >= 1e9 ? '1B' : v / 1e6 + 'M']), R.rows, 'Rows in the DataFrame')}
        ${slider('ddRParts', 'Partitions', 1, 12, R.parts, R.parts)}
        ${slider('ddRW', 'Worker nodes', 1, 8, R.W, R.W)}
        <div class="dd-field"><span class="dd-label">Query reads columns (Parquet projection)</span><div class="dd-chips" id="ddRCols">${SCHEMA.map(([c]) => `<button type="button" class="dd-chip" data-col="${c}" aria-pressed="${R.sel.has(c)}">${c}</button>`).join('')}</div></div>
        <button type="button" class="dd-btn filled" id="ddRGo"><i data-lucide="send" style="width:16px;height:16px;"></i>Distribute rows</button>
      </div>
      <div class="dd-grid2">
        <div><div class="dd-card-t"><i data-lucide="table" style="width:18px;height:18px;"></i>DataFrame — split horizontally into partitions</div><div class="dd-dataset" id="ddRSet"></div></div>
        <div><div class="dd-card-t"><i data-lucide="server" style="width:18px;height:18px;"></i>What each worker receives</div><div class="dd-workers" id="ddRWk"></div></div>
      </div>
      <div class="dd-tw" style="margin-top:16px;"><table class="dd-table"><thead><tr><th>Data unit</th><th>Distributed across workers?</th><th>Description</th></tr></thead><tbody id="ddRTab"></tbody></table></div>
    </div>`;
    bindSeg($('ddRows'), (k, v) => { if (k === 'rows') { R.rows = +v; rowsRender(); } });
    bindRange('ddRParts', v => { R.parts = v; $('ddRPartsOut').textContent = v; rowsRender(); });
    bindRange('ddRW', v => { R.W = v; $('ddRWOut').textContent = v; rowsRender(); });
    $('ddRCols').addEventListener('click', e => { const b = e.target.closest('[data-col]'); if (!b) return; const c = b.dataset.col; if (R.sel.has(c) && R.sel.size > 1) R.sel.delete(c); else R.sel.add(c); b.setAttribute('aria-pressed', R.sel.has(c)); rowsRender(); });
    $('ddRGo').addEventListener('click', rowsAnimate);
    rowsRender();
  }
  function rowsRender() {
    cancel('rows');
    const per = Math.floor(R.rows / R.parts), rowB = SCHEMA.reduce((a, c) => a + c[1], 0), readB = SCHEMA.filter(c => R.sel.has(c[0])).reduce((a, c) => a + c[1], 0);
    let start = 0, set = '';
    const byW = Array.from({ length: R.W }, () => ({ parts: [], rows: 0 }));
    for (let p = 0; p < R.parts; p++) {
      const n = p === R.parts - 1 ? R.rows - start : per, w = p % R.W;
      set += `<div class="dd-band" data-p="${p}" style="--c:${W_COL(w)}">P${p} · rows ${start.toLocaleString('en-US')} – ${(start + n - 1).toLocaleString('en-US')} → ${W_NAME(w)}</div>`;
      byW[w].parts.push({ p, start, n }); byW[w].rows += n; start += n;
    }
    $('ddRSet').innerHTML = set;
    $('ddRWk').innerHTML = byW.map((x, w) => `<div class="dd-wcard" id="ddRW${w}" style="--c:${W_COL(w)}"><h4><i data-lucide="server" style="width:15px;height:15px;color:${W_COL(w)}"></i>${W_NAME(w)}</h4>
      <div class="meta">${x.parts.length ? x.parts.map(q => `P${q.p}`).join(', ') : 'no partition (idle)'}<br>${x.rows.toLocaleString('en-US')} complete rows<br>reads ${fmt(x.rows * readB / 1048576)} of ${fmt(x.rows * rowB / 1048576)}</div>
      <div class="dd-schema" aria-label="schema">${SCHEMA.map(([c]) => `<span class="dd-col${R.sel.has(c) ? ' on' : ''}">${c}</span>`).join('')}</div></div>`).join('');
    const idle = byW.filter(x => !x.parts.length).length;
    $('ddRTab').innerHTML = `
      <tr class="hl"><td><b>Partitions (groups of rows)</b></td><td><span class="dd-yn yes">Yes</span></td><td>The unit of distribution: ${R.parts} partition(s) of ~${per.toLocaleString('en-US')} rows processed in parallel by ${R.W - idle} worker(s)${idle ? ` — ${idle} worker(s) idle because partitions &lt; workers` : ''}.</td></tr>
      <tr><td><b>Rows</b></td><td><span class="dd-yn yes">Yes</span></td><td>Split horizontally. A worker gets complete rows containing all their fields.</td></tr>
      <tr><td><b>Columns / fields</b></td><td><span class="dd-yn no">No</span></td><td>Kept intact: every worker has the full ${SCHEMA.length}-column schema. With Parquet, only the ${R.sel.size} selected column(s) are <i>read from disk</i> — ${Math.round((1 - readB / rowB) * 100)}% less I/O.</td></tr>`;
    icons();
  }
  function rowsAnimate() {
    rowsRender();
    const bands = [...$('ddRSet').children];
    bands.forEach((b, i) => later('rows', () => {
      b.classList.add('sent');
      const w = $('ddRW' + (i % R.W)); w.classList.add('flash'); setTimeout(() => w.classList.remove('flash'), 500);
    }, 350 + i * 450));
  }

  // =====================================================================
  // 02 · DRIVER PIPELINE
  // =====================================================================
  const P = { fmt: 'delta', step: 0, playing: false };
  const PIPE_FILES = [
    { name: 'part-0002.parquet', size: 300, splittable: true, format: 'parquet', rg: 128 },
    { name: 'part-0003.parquet', size: 900, splittable: true, format: 'parquet', rg: 128 },
    { name: 'part-0004.parquet', size: 40, splittable: true, format: 'parquet', rg: 128 }
  ];
  const PIPE = { W: 4, C: 2 };
  const STEPS = ['Metadata lookup', 'Split calculation', 'Task assignment', 'Execution on workers'];
  function pipeUI() {
    $('ddPipe').innerHTML = `<div class="dd-card">
      <div class="dd-controls" style="margin-bottom:14px;">
        ${seg('fmt', [['delta', 'Delta Lake'], ['iceberg', 'Apache Iceberg']], P.fmt, 'Table format (the catalog)')}
        <div class="dd-field" style="flex-direction:row;gap:8px;align-items:center;">
          <button type="button" class="dd-btn outlined" id="ddPPrev"><i data-lucide="chevron-left" style="width:16px;height:16px;"></i>Back</button>
          <button type="button" class="dd-btn filled" id="ddPPlay"><i data-lucide="play" style="width:16px;height:16px;"></i>Play all</button>
          <button type="button" class="dd-btn tonal" id="ddPNext">Next<i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>
        </div>
      </div>
      <div class="dd-stepper" role="tablist" aria-label="Pipeline steps">${STEPS.map((s, i) => `<button type="button" class="dd-step" role="tab" data-step="${i}"><span class="dot">${i + 1}</span>${s}</button>`).join('')}</div>
      <div class="dd-card outlined dd-pane" id="ddPPane" role="tabpanel"></div>
    </div>`;
    bindSeg($('ddPipe'), (k, v) => { if (k === 'fmt') { P.fmt = v; pipeRender(); } });
    $('ddPipe').querySelector('.dd-stepper').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) { pipeStop(); P.step = +b.dataset.step; pipeRender(); } });
    $('ddPPrev').addEventListener('click', () => { pipeStop(); P.step = Math.max(0, P.step - 1); pipeRender(); });
    $('ddPNext').addEventListener('click', () => { pipeStop(); P.step = Math.min(3, P.step + 1); pipeRender(); });
    $('ddPPlay').addEventListener('click', () => { if (P.playing) { pipeStop(); return; } P.playing = true; P.step = 0; pipeRender(); pipeTick(); setPlayLabel(); });
    pipeRender();
  }
  function setPlayLabel() { $('ddPPlay').innerHTML = P.playing ? '<i data-lucide="pause" style="width:16px;height:16px;"></i>Pause' : '<i data-lucide="play" style="width:16px;height:16px;"></i>Play all'; icons(); }
  function pipeStop() { P.playing = false; cancel('pipeplay'); setPlayLabel(); }
  function pipeTick() { later('pipeplay', () => { if (!P.playing) return; if (P.step < 3) { P.step++; pipeRender(); pipeTick(); } else pipeStop(); }, P.step === 3 ? 6000 : 4200); }
  function pipeRender() {
    cancel('pipe');
    $('ddPipe').querySelectorAll('.dd-step').forEach((b, i) => { b.classList.toggle('active', i === P.step); b.classList.toggle('done', i < P.step); b.setAttribute('aria-selected', i === P.step); });
    const pl = plan(PIPE_FILES, { maxPB: 128, openCost: 4, cores: PIPE.W * PIPE.C });
    const asg = assign(pl.parts.length, PIPE.W, PIPE.C);
    const pane = $('ddPPane'), ice = P.fmt === 'iceberg';
    if (P.step === 0) {
      const log = ice ? `<div class="dd-dim">metadata/v3.metadata.json → current-snapshot-id: 3</div>
<div class="dd-dim">  snap-3.avro (manifest list)</div>
<div>    manifest-a.avro: <span class="rm">DELETED  part-0001.parquet  512 MB</span></div>
<div>                     <span class="add">EXISTING part-0002.parquet  300 MB  min/max(ts)</span></div>
<div>    manifest-b.avro: <span class="add">ADDED    part-0003.parquet  900 MB  min/max(ts)</span></div>
<div>    manifest-c.avro: <span class="add">ADDED    part-0004.parquet   40 MB  min/max(ts)</span></div>`
        : `<div class="dd-dim">_delta_log/</div>
<div>  00000000000000000000.json  <span class="add">add part-0001.parquet 512 MB</span>  <span class="add">add part-0002.parquet 300 MB</span></div>
<div>  00000000000000000001.json  <span class="add">add part-0003.parquet 900 MB</span></div>
<div>  00000000000000000002.json  <span class="rm">remove part-0001.parquet</span>  <span class="add">add part-0004.parquet 40 MB</span>  <span class="dim">(DELETE … rewrite)</span></div>`;
      pane.innerHTML = `<div class="dd-card-t"><i data-lucide="book-open" style="width:18px;height:18px;"></i>Step 1 · ${ice ? 'Iceberg' : 'Delta Lake'} tells the driver which files make up the current version</div>
        <div class="dd-grid2"><div class="dd-log">${log}</div>
        <div><p style="margin:0 0 10px;line-height:1.55">The table format is the <b>catalog</b>: it lists the live Parquet files with their paths, sizes and min/max statistics. Files removed by later commits (<span style="color:var(--md-error)">part-0001</span>) are never read — no directory listing on S3.</p>
        <div class="dd-kpis">${kpi('Live files', '3')}${kpi('Live data', fmt(1240))}${kpi('Ignored (removed)', '1 file')}</div></div></div>`;
    } else if (P.step === 1) {
      pane.innerHTML = `<div class="dd-card-t"><i data-lucide="calculator" style="width:18px;height:18px;"></i>Step 2 · The driver computes the split size and cuts the files</div>
        <div class="dd-formula">totalBytes = Σ(size + openCost) = 1,240 MB + 3 × 4 MB = <span class="v">${fmt(pl.total)}</span><br>
        bytesPerCore = ${fmt(pl.total)} ÷ ${PIPE.W * PIPE.C} cores = <span class="v">${fmt(pl.bpc)}</span><br>
        maxSplitBytes = min(<span class="win">128 MB</span>, max(4 MB, ${fmt(pl.bpc)})) = <span class="v">${fmt(pl.maxSplit)}</span></div>
        <div class="dd-files" style="margin-top:14px;">${PIPE_FILES.map((f, fi) => fileRowW(f, fi, pl, 900, asg)).join('')}</div>
        <p style="margin:12px 0 0;color:var(--md-on-surface-var);font-size:.86rem;">Chunks are bin-packed largest-first: the 44 MB tail of part-0002, the whole 40 MB part-0004 and the 4 MB tail of part-0003 share one partition (each chunk also adds the 4 MB open cost). Result: <b>${pl.parts.length} partitions</b>.</p>`;
    } else if (P.step === 2) {
      pane.innerHTML = `<div class="dd-card-t"><i data-lucide="send" style="width:18px;height:18px;"></i>Step 3 · One task per partition, offered to free cores (${PIPE.W} workers × ${PIPE.C} cores = ${PIPE.W * PIPE.C} slots)</div><div id="ddPTasks"></div>`;
      const host = $('ddPTasks');
      pl.parts.forEach((p, i) => later('pipe', () => {
        const a = asg[i];
        const lines = p.chunks.map(c => `read <b>${esc(c.f.name)}</b> bytes ${brange(c)}`).join('<br>');
        host.insertAdjacentHTML('beforeend', `<div class="dd-task" style="--c:${W_COL(a.w)}"><i data-lucide="file-input" style="width:16px;height:16px;flex-shrink:0;color:${W_COL(a.w)}"></i><div><b>Task ${i}</b> → ${W_NAME(a.w)} · core ${a.core + 1} · wave ${a.wave + 1}<br>${lines}</div></div>`);
        icons();
      }, 150 + i * 320));
    } else {
      pane.innerHTML = `<div class="dd-card-t"><i data-lucide="cpu" style="width:18px;height:18px;"></i>Step 4 · Workers only execute: open, seek, read the assigned row groups, process rows</div><div class="dd-exec" id="ddPExec"></div>
        <p style="margin:12px 0 0;color:var(--md-on-surface-var);font-size:.86rem;">No worker decides anything. Each one follows its task: it reads the Parquet footer, skips straight to its byte offset and decodes only the selected columns of its row groups.</p>`;
      const OPS = ['Open S3 object (HTTP GET)', 'Read footer → row-group offsets', 'Seek to assigned byte offset', 'Read column chunks of its row group(s)', 'Decode & process rows'];
      const firstWave = asg.filter(a => a.wave === 0 && a.core === 0);
      $('ddPExec').innerHTML = firstWave.map(a => { const p = pl.parts[a.i]; return `<div class="dd-exec-w" style="--c:${W_COL(a.w)}"><b>${W_NAME(a.w)}</b> · Task ${a.i}<div style="font:.72rem var(--mono);color:var(--md-on-surface-var)">${esc(p.chunks[0].f.name)} @ byte ${bytes(p.chunks[0].start)} · RG ${p.rgs.map(r => r.k).join(',') || '—'}</div><ul class="dd-ops">${OPS.map((o, j) => `<li data-op="${j}"><i data-lucide="circle" style="width:12px;height:12px;"></i>${o}</li>`).join('')}</ul></div>`; }).join('');
      OPS.forEach((_, j) => later('pipe', () => {
        $('ddPExec').querySelectorAll(`[data-op="${j}"]`).forEach(li => { li.classList.add('on'); });
        if (j > 0) $('ddPExec').querySelectorAll(`[data-op="${j - 1}"]`).forEach(li => { li.classList.remove('on'); li.classList.add('done'); });
        if (j === OPS.length - 1) later('pipe', () => $('ddPExec').querySelectorAll(`[data-op="${j}"]`).forEach(li => { li.classList.remove('on'); li.classList.add('done'); }), 900);
      }, 300 + j * 900));
    }
    icons();
  }

  // =====================================================================
  // 03 · SPLIT CALCULATOR
  // =====================================================================
  const pq = (name, size) => ({ name, size, splittable: true, format: 'parquet', rg: 128 });
  const PRESETS = {
    one: { label: 'One 1 GB file', files: () => [pq('part-00000.parquet', 1024)] },
    mixed: { label: 'Mixed: 900 + 300 + 40 MB', files: () => [pq('part-0003.parquet', 900), pq('part-0002.parquet', 300), pq('part-0004.parquet', 40)] },
    many: { label: '20 × 300 MB', files: () => Array.from({ length: 20 }, (_, i) => pq(`part-${String(i).padStart(4, '0')}.parquet`, 300)) },
    tiny: { label: '200 tiny files (2 MB)', files: () => Array.from({ length: 200 }, (_, i) => pq(`part-${String(i).padStart(4, '0')}.parquet`, 2)) },
    single: { label: 'One tiny 3 MB file', files: () => [pq('part-00000.parquet', 3)] },
    gzip: { label: '2 GB CSV.gz (unsplittable)', files: () => [{ name: 'orders_2026.csv.gz', size: 2048, splittable: false, format: 'csv.gz' }] }
  };
  const MAXPB = [16, 32, 64, 128, 256, 512, 1024], OPEN = [0, 1, 2, 4, 8, 16, 32], RGS = [32, 64, 128, 256];
  const CC = { preset: 'mixed', files: PRESETS.mixed.files(), maxPB: 128, open: 4, W: 4, C: 2, rg: 128 };
  const sizeFromV = v => Math.max(1, Math.round(Math.pow(2, v / 10)));      // v 0..120 → 1 MB .. 4 GB
  const vFromSize = s => Math.round(Math.log2(s) * 10);
  function calcUI() {
    $('ddCalc').innerHTML = `<div class="dd-stack">
      <div class="dd-card">
        <div class="dd-field" style="margin-bottom:14px;"><span class="dd-label">Input files (presets)</span><div class="dd-chips" id="ddCPre">${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="dd-chip" data-pre="${k}" aria-pressed="${k === CC.preset}">${p.label}</button>`).join('')}</div></div>
        <div class="dd-controls">
          ${slider('ddCMax', 'spark.sql.files.maxPartitionBytes', 0, MAXPB.length - 1, MAXPB.indexOf(CC.maxPB), fmt(CC.maxPB))}
          ${slider('ddCOpen', 'spark.sql.files.openCostInBytes', 0, OPEN.length - 1, OPEN.indexOf(CC.open), fmt(CC.open) || '0')}
          ${slider('ddCW', 'Worker nodes', 1, 8, CC.W, CC.W)}
          ${slider('ddCC', 'Cores per worker', 1, 8, CC.C, CC.C)}
          ${seg('rg', RGS.map(v => [v, v + ' MB']), CC.rg, 'Parquet row-group size')}
        </div>
      </div>
      <div class="dd-grid2">
        <div class="dd-card"><div class="dd-card-t"><i data-lucide="sigma" style="width:18px;height:18px;"></i>Step A · Split size</div><div class="dd-formula" id="ddCF"></div><div class="dd-note" id="ddCWhy" style="margin-top:10px;"></div></div>
        <div class="dd-card"><div class="dd-card-t"><i data-lucide="gauge" style="width:18px;height:18px;"></i>Result</div><div class="dd-kpis" id="ddCK"></div><div id="ddCNote" style="margin-top:10px;"></div></div>
      </div>
      <div class="dd-card"><div class="dd-card-t"><i data-lucide="scissors" style="width:18px;height:18px;"></i>Step B · Cut files into chunks of maxSplitBytes <span class="dd-label" style="margin-left:auto">colour = worker that will run the chunk's partition · | row-group boundary · ● row-group midpoint</span></div><div class="dd-files" id="ddCFiles"></div><div class="dd-file-editor" id="ddCEdit" style="margin-top:12px;"></div></div>
      <div class="dd-card"><div class="dd-card-t"><i data-lucide="package" style="width:18px;height:18px;"></i>Step C · Bin-pack chunks into partitions <span class="dd-label" style="margin-left:auto">hatched = openCost penalty · red line = maxSplitBytes</span></div><div class="dd-parts" id="ddCParts"></div></div>
      <div class="dd-card"><div class="dd-card-t"><i data-lucide="layout-grid" style="width:18px;height:18px;"></i>Step D · Tasks run in waves on worker cores
        <button type="button" class="dd-btn filled" id="ddCAnim" style="margin-left:auto"><i data-lucide="play" style="width:16px;height:16px;"></i>Animate assignment</button></div>
        <div class="dd-waves" id="ddCWaves"></div><div id="ddCTasks" style="margin-top:12px;"></div></div>
    </div>`;
    $('ddCPre').addEventListener('click', e => { const b = e.target.closest('[data-pre]'); if (!b) return; CC.preset = b.dataset.pre; CC.files = PRESETS[CC.preset].files(); CC.files.forEach(f => { if (f.rg) f.rg = CC.rg; }); $('ddCPre').querySelectorAll('[data-pre]').forEach(x => x.setAttribute('aria-pressed', x === b)); calcRender(); });
    bindRange('ddCMax', v => { CC.maxPB = MAXPB[v]; $('ddCMaxOut').textContent = fmt(CC.maxPB); calcRender(); });
    bindRange('ddCOpen', v => { CC.open = OPEN[v]; $('ddCOpenOut').textContent = CC.open ? fmt(CC.open) : '0'; calcRender(); });
    bindRange('ddCW', v => { CC.W = v; $('ddCWOut').textContent = v; calcRender(); });
    bindRange('ddCC', v => { CC.C = v; $('ddCCOut').textContent = v; calcRender(); });
    bindSeg($('ddCalc'), (k, v) => { if (k === 'rg') { CC.rg = +v; CC.files.forEach(f => { if (f.format === 'parquet') f.rg = CC.rg; }); calcRender(); } });
    $('ddCAnim').addEventListener('click', calcAnimate);
    calcRender();
  }
  function calcRender() {
    cancel('calc');
    const cores = CC.W * CC.C, pl = plan(CC.files, { maxPB: CC.maxPB, openCost: CC.open, cores });
    const asg = assign(pl.parts.length, CC.W, CC.C), dataMB = CC.files.reduce((a, f) => a + f.size, 0);
    const empties = pl.parts.filter(p => p.empty).length, waves = Math.ceil(pl.parts.length / cores);
    const win = k => pl.winner === k ? 'win' : '';
    $('ddCF').innerHTML = `totalBytes   = Σ(file + openCost) = ${fmt(dataMB)} + ${CC.files.length} × ${fmt(CC.open) || '0'} = <span class="v">${fmt(pl.total)}</span><br>
      bytesPerCore = ${fmt(pl.total)} ÷ (${CC.W} × ${CC.C} cores) = <span class="v">${fmt(pl.bpc)}</span><br>
      maxSplitBytes = min(<span class="${win('maxPB')}">${fmt(CC.maxPB)}</span>, max(<span class="${win('open')}">${CC.open ? fmt(CC.open) : '0'}</span>, <span class="${win('bpc')}">${fmt(pl.bpc)}</span>)) = <span class="v">${fmt(pl.maxSplit)}</span>`;
    $('ddCWhy').innerHTML = `<i data-lucide="lightbulb" style="width:18px;height:18px;flex-shrink:0;"></i><span>${pl.winner === 'maxPB' ? `<b>maxPartitionBytes caps the split.</b> There's enough data for every core, so splits stay at ${fmt(CC.maxPB)}.` : pl.winner === 'bpc' ? `<b>bytesPerCore wins:</b> there's too little data to give every core ${fmt(CC.maxPB)}, so Spark shrinks splits to ${fmt(pl.bpc)} to keep all ${cores} cores busy.` : `<b>openCostInBytes is the floor:</b> splits never get smaller than the cost of opening a file.`}</span>`;
    const avg = pl.parts.reduce((a, p) => a + p.bytes, 0) / Math.max(1, pl.parts.length);
    $('ddCK').innerHTML = kpi('Files', CC.files.length.toLocaleString('en-US'), fmt(dataMB) + ' total') + kpi('Chunks', pl.chunks.length) + kpi('Partitions = tasks', pl.parts.length) + kpi('Avg partition', fmt(avg)) + kpi('Waves', waves, `${cores} slots`) + kpi('Empty tasks', empties, 'no row-group midpoint');
    const notes = [];
    const unsplit = CC.files.filter(f => !f.splittable);
    if (unsplit.length) notes.push(`<div class="dd-note err"><i data-lucide="lock" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>Unsplittable:</b> ${esc(unsplit[0].name)} is gzip — the whole ${fmt(unsplit[0].size)} goes to one task on one core, whatever maxPartitionBytes says.</span></div>`);
    if (CC.files.length === 1 && pl.parts.length === 1 && CC.files[0].size < 16) notes.push(`<div class="dd-note"><i data-lucide="info" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>Tiny file exception:</b> ${fmt(CC.files[0].size)} fits in one split, so the <b>entire file</b> goes to a single worker; ${cores - 1} other core(s) idle.</span></div>`);
    if (empties) notes.push(`<div class="dd-note err"><i data-lucide="circle-off" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>${empties} empty task(s):</b> splits (${fmt(pl.maxSplit)}) are smaller than row groups (${CC.rg} MB). A split that contains no row-group midpoint reads only the footer.</span></div>`);
    const packed = pl.parts.filter(p => p.chunks.length > 1).length;
    if (packed && CC.preset === 'tiny') notes.push(`<div class="dd-note ok"><i data-lucide="package" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>Packing:</b> ~${Math.round(CC.files.length / pl.parts.length)} tiny files share each partition; open-cost overhead is ${Math.round(CC.files.length * CC.open / pl.total * 100)}% of the planned bytes.</span></div>`);
    if (!notes.length && pl.parts.length < cores) notes.push(`<div class="dd-note"><i data-lucide="info" style="width:18px;height:18px;flex-shrink:0;"></i><span>Only ${pl.parts.length} task(s) for ${cores} cores — some cores stay idle.</span></div>`);
    $('ddCNote').innerHTML = notes.join('<div style="height:8px"></div>');

    // files
    const showF = CC.files.slice(0, 24), maxF = Math.max(...CC.files.map(f => f.size));
    $('ddCFiles').innerHTML = showF.map((f, fi) => fileRowW(f, fi, pl, maxF, asg)).join('') + (CC.files.length > 24 ? `<div class="dd-label">… and ${CC.files.length - 24} more files</div>` : '');
    // editor
    $('ddCEdit').innerHTML = CC.files.length <= 8 ? CC.files.map((f, i) => `<div class="dd-fe"><span>${esc(f.name)}</span><div class="dd-slider"><input type="range" min="0" max="120" value="${vFromSize(f.size)}" data-fe="${i}" aria-label="Size of ${esc(f.name)}"><output>${fmt(f.size)}</output></div><button type="button" class="dd-icon-btn" data-del="${i}" aria-label="Remove ${esc(f.name)}" ${CC.files.length <= 1 ? 'disabled' : ''}><i data-lucide="x" style="width:16px;height:16px;"></i></button></div>`).join('') + `<div><button type="button" class="dd-btn text" id="ddCAdd" ${CC.files.length >= 8 ? 'disabled' : ''}><i data-lucide="plus" style="width:16px;height:16px;"></i>Add file</button></div>` : `<div class="dd-label">Pick a preset with ≤ 8 files to edit sizes individually.</div>`;
    $('ddCEdit').querySelectorAll('[data-fe]').forEach(el => { rangeFill(el); el.addEventListener('input', () => { rangeFill(el); const f = CC.files[+el.dataset.fe]; f.size = sizeFromV(+el.value); el.nextElementSibling.textContent = fmt(f.size); clearTimeout(calcRender._t); calcRender._t = setTimeout(calcRender, 120); }); });
    $('ddCEdit').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { CC.files.splice(+b.dataset.del, 1); calcRender(); }));
    const add = $('ddCAdd'); if (add) add.addEventListener('click', () => { CC.files.push(Object.assign(pq(`part-${String(CC.files.length + 10).padStart(4, '0')}.parquet`, 256), { rg: CC.rg })); calcRender(); });

    // partitions
    const showP = pl.parts.slice(0, 60), scale = pl.maxSplit * 1.25 + CC.open * 2;
    $('ddCParts').innerHTML = showP.map(p => {
      const a = asg[p.i];
      const segs = p.chunks.map(c => `<span class="dd-pseg" style="--c:${W_COL(a.w)};width:${c.len / scale * 100}%" title="${esc(c.f.name)} ${fmt(c.start)}–${fmt(c.start + c.len)}"></span>${CC.open ? `<span class="dd-pcost" style="width:${CC.open / scale * 100}%"></span>` : ''}`).join('');
      return `<div class="dd-prow"><span>P${p.i} · ${W_NAME(a.w).replace('Worker ', 'W-')}</span><div class="dd-pbar">${segs}<span class="dd-pmax" style="left:${pl.maxSplit / scale * 100}%"></span></div><span class="pr">${fmt(p.bytes)} · ${p.chunks.length} chunk${p.chunks.length > 1 ? 's' : ''}${p.empty ? ' · <b style="color:var(--md-error)">empty</b>' : ''}</span></div>`;
    }).join('') + (pl.parts.length > 60 ? `<div class="dd-label">… ${pl.parts.length - 60} more partitions</div>` : '');

    // waves table
    let wt = `<table class="dd-wtable"><thead><tr><th></th>${Array.from({ length: cores }, (_, s) => `<th>${W_NAME(s % CC.W).replace('Worker ', '')}${Math.floor(s / CC.W) + 1}</th>`).join('')}</tr></thead><tbody>`;
    for (let w = 0; w < Math.min(waves, 12); w++) {
      wt += `<tr><th>wave ${w + 1}</th>`;
      for (let s = 0; s < cores; s++) { const t = w * cores + s; wt += t < pl.parts.length ? `<td class="dd-cell on" data-t="${t}" style="--c:${W_COL(s % CC.W)}">P${t}</td>` : '<td class="dd-cell">idle</td>'; }
      wt += '</tr>';
    }
    $('ddCWaves').innerHTML = wt + '</tbody></table>' + (waves > 12 ? `<div class="dd-label">… ${waves - 12} more waves</div>` : '') + `<div class="dd-legend">${Array.from({ length: CC.W }, (_, w) => `<span><i class="dd-sw" style="background:${W_COL(w)}"></i>${W_NAME(w)}</span>`).join('')}<span>Column header = worker letter + core number</span></div>`;
    $('ddCTasks').innerHTML = pl.parts.slice(0, 6).map(p => { const a = asg[p.i]; return `<div class="dd-task" style="--c:${W_COL(a.w)};animation:none"><i data-lucide="file-input" style="width:16px;height:16px;flex-shrink:0;color:${W_COL(a.w)}"></i><div><b>Task ${p.i}</b> → ${W_NAME(a.w)} · core ${a.core + 1}: ${p.chunks.slice(0, 3).map(c => `read ${esc(c.f.name)} bytes ${brange(c)}`).join('; ')}${p.chunks.length > 3 ? `; + ${p.chunks.length - 3} more files` : ''}${p.rgs.length ? ` → row group${p.rgs.length > 1 ? 's' : ''} ${p.rgs.slice(0, 6).map(r => r.k).join(',')}` : p.chunks[0].f.format === 'parquet' ? ' → <b>no row group (empty)</b>' : ''}</div></div>`; }).join('') + (pl.parts.length > 6 ? `<div class="dd-label">Showing the first 6 of ${pl.parts.length} task instructions.</div>` : '');
    icons();
  }
  function fileRowW(f, fi, pl, scaleMax, asg) {
    const wpct = Math.max(6, f.size / scaleMax * 100);
    let inner = pl.chunks.filter(c => c.fi === fi).map(c => { const a = asg[c.p]; return `<span class="dd-chunk" style="--c:${W_COL(a.w)};left:${c.start / f.size * 100}%;width:${c.len / f.size * 100}%" title="${esc(f.name)} bytes ${brange(c)} → P${c.p} on ${W_NAME(a.w)}">${c.len / f.size * wpct > 4 ? 'P' + c.p : ''}</span>`; }).join('');
    if (f.format === 'parquet' && f.rg) {
      const n = Math.ceil(f.size / f.rg - 1e-9);
      if (n <= 40) {
        for (let k = 1; k < n; k++) inner += `<span class="dd-rgtick" style="left:${k * f.rg / f.size * 100}%"></span>`;
        for (let k = 0; k < n; k++) { const s = k * f.rg, len = Math.min(f.rg, f.size - s); inner += `<span class="dd-mid" style="left:${(s + len / 2) / f.size * 100}%" title="row group ${k} midpoint"></span>`; }
      }
    }
    return `<div class="dd-frow"><span class="dd-fname" title="${esc(f.name)}">${f.splittable ? '' : '<i data-lucide="lock" style="width:12px;height:12px;flex-shrink:0;"></i>'}${esc(f.name)} · ${fmt(f.size)}</span><div style="width:${wpct}%"><div class="dd-fbar">${inner}</div></div></div>`;
  }
  function calcAnimate() {
    cancel('calc');
    const cells = [...$('ddCWaves').querySelectorAll('[data-t]')];
    cells.forEach(c => c.classList.remove('on'));
    const cores = CC.W * CC.C;
    cells.forEach(c => { const t = +c.dataset.t, w = Math.floor(t / cores), s = t % cores; later('calc', () => { c.classList.add('on', 'pop'); setTimeout(() => c.classList.remove('pop'), 300); }, 200 + w * 1100 + s * 90); });
  }

  // =====================================================================
  // 04 · ROW-GROUP ALIGNMENT (single file)
  // =====================================================================
  const FSIZES = [3, 64, 256, 512, 1024, 2048], SPL = [32, 64, 96, 128, 192, 256];
  const G = { size: 1024, rg: 128, split: 128 };
  function rgUI() {
    $('ddRG').innerHTML = `<div class="dd-card">
      <div class="dd-controls" style="margin-bottom:6px;">
        ${slider('ddGF', 'Parquet file size', 0, FSIZES.length - 1, FSIZES.indexOf(G.size), fmt(G.size))}
        ${seg('grg', RGS.map(v => [v, v + ' MB']), G.rg, 'Row-group size (parquet.block.size)')}
        ${slider('ddGS', 'Byte-split size (maxSplitBytes)', 0, SPL.length - 1, SPL.indexOf(G.split), fmt(G.split))}
      </div>
      <div class="dd-bytes" id="ddGBytes"></div>
      <div class="dd-legend"><span><i class="dd-sw" style="background:var(--md-on-surface)"></i>tick on a row group = its midpoint</span><span><i class="dd-sw" style="border:2px dashed var(--md-on-surface-var)"></i>byte-split boundary</span><span>colour = worker that reads the row group</span></div>
      <div class="dd-grid2" style="margin-top:16px;"><div class="dd-tw"><table class="dd-table"><thead><tr><th>Split / task</th><th>Byte range</th><th>Row groups it reads</th><th>Worker</th></tr></thead><tbody id="ddGTab"></tbody></table></div><div id="ddGNote" class="dd-stack"></div></div>
    </div>`;
    bindRange('ddGF', v => { G.size = FSIZES[v]; $('ddGFOut').textContent = fmt(G.size); rgRender(); });
    bindRange('ddGS', v => { G.split = SPL[v]; $('ddGSOut').textContent = fmt(G.split); rgRender(); });
    bindSeg($('ddRG'), (k, v) => { if (k === 'grg') { G.rg = +v; rgRender(); } });
    rgRender();
  }
  function rgRender() {
    const F = G.size, RGs = Math.min(G.rg, F), n = Math.max(1, Math.ceil(F / RGs - 1e-9)), split = Math.min(G.split, Math.max(F, 0.001));
    const ns = Math.max(1, Math.ceil(F / G.split - 1e-9)), W = 4;
    const rgs = Array.from({ length: n }, (_, k) => { const s = k * RGs, len = Math.min(RGs, F - s), mid = s + len / 2; return { k, s, len, mid, sp: Math.min(ns - 1, Math.floor(mid / G.split)) }; });
    const splits = Array.from({ length: ns }, (_, j) => ({ j, s: j * G.split, e: Math.min(F, (j + 1) * G.split), rgs: rgs.filter(r => r.sp === j) }));
    const lines = splits.map(sp => `<span class="dd-splitline${sp.rgs.length ? '' : ' empty'}" style="left:calc(${sp.s / F} * (100% - 56px))">S${sp.j}${sp.rgs.length ? '' : ' ∅'}</span>`).join('');
    $('ddGBytes').innerHTML = `${lines}<div class="dd-rgbar">${rgs.map(r => `<span class="dd-rg" style="--c:${W_COL(r.sp % W)};flex:${r.len} 1 0" title="Row group ${r.k}: ${fmt(r.s)}–${fmt(r.s + r.len)}, midpoint ${fmt(r.mid)} → split S${r.sp}">${n <= 20 ? 'RG' + r.k : ''}</span>`).join('')}<span class="dd-footer">footer</span></div>`;
    $('ddGTab').innerHTML = splits.map(sp => `<tr${sp.rgs.length ? '' : ' class="hl"'}><td style="white-space:nowrap"><b>S${sp.j}</b> / Task ${sp.j}</td><td style="font-family:var(--mono);font-size:.78rem;white-space:nowrap">${fmt(sp.s)} – ${fmt(sp.e)}</td><td>${sp.rgs.length ? sp.rgs.map(r => `RG${r.k} (${fmt(r.len)})`).join(', ') : '<span style="color:var(--md-error)">none — reads footer only</span>'}</td><td style="white-space:nowrap"><span class="dd-sw" style="background:${W_COL(sp.j % W)}"></span> ${W_NAME(sp.j % W)}</td></tr>`).join('');
    const empty = splits.filter(s => !s.rgs.length).length, multi = splits.filter(s => s.rgs.length > 1).length;
    const notes = [];
    if (F < G.split) notes.push(`<div class="dd-note"><i data-lucide="info" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>Tiny file exception:</b> the whole ${fmt(F)} file fits in one split, so one worker gets the entire file.</span></div>`);
    if (empty) notes.push(`<div class="dd-note err"><i data-lucide="circle-off" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>${empty} empty task(s).</b> The split (${fmt(G.split)}) is smaller than a row group (${fmt(RGs)}), so some byte ranges contain no midpoint. Those tasks open the file, read the footer and exit.</span></div>`);
    if (multi) notes.push(`<div class="dd-note"><i data-lucide="layers" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>${multi} task(s) read several row groups</b> because the split is larger than the row group. Parallelism is capped at ${ns} tasks.</span></div>`);
    if (!empty && !multi && F >= G.split) notes.push(`<div class="dd-note ok"><i data-lucide="check-circle-2" style="width:18px;height:18px;flex-shrink:0;"></i><span><b>Aligned:</b> split size = row-group size, so each worker reads exactly one whole row group and no task is wasted.</span></div>`);
    notes.push(`<div class="dd-card filled" style="font-size:.86rem;line-height:1.55"><b>Why midpoints?</b> The driver cuts byte ranges without opening files. At read time each task checks the footer and keeps only row groups whose <i>midpoint</i> is inside its range. Every row group is therefore read by exactly one task and never in part.</div>`);
    $('ddGNote').innerHTML = notes.join('');
    icons();
  }

  // =====================================================================
  // 05 · COLUMN PROJECTION
  // =====================================================================
  const COLS50 = (() => {
    const named = [['user_id', 8], ['amount', 8], ['city', 12], ['ts', 8], ['tenant_id', 8], ['device', 16], ['country', 4], ['status', 6], ['email', 28], ['notes', 160]];
    const out = named.slice();
    for (let i = out.length; i < 50; i++) out.push([`attr_${String(i + 1).padStart(2, '0')}`, [8, 8, 16, 24, 40][i % 5]]);
    return out;
  })();
  const PJ = { sel: new Set(['user_id', 'amount']), file: 1024, W: 4 };
  function projUI() {
    $('ddProj').innerHTML = `<div class="dd-grid2">
      <div class="dd-card"><div class="dd-controls" style="margin-bottom:12px;">
        <div class="dd-field"><span class="dd-label">Quick select</span><div class="dd-chips" id="ddJPre"><button type="button" class="dd-chip" data-jp="2">2 of 50</button><button type="button" class="dd-chip" data-jp="10">10 of 50</button><button type="button" class="dd-chip" data-jp="50">All 50</button></div></div>
        ${slider('ddJW', 'Worker nodes', 1, 8, PJ.W, PJ.W)}</div>
        <div class="dd-label" style="margin-bottom:6px;">Schema — 50 columns (click to project). Avg bytes per value shown.</div>
        <div class="dd-colgrid" id="ddJGrid"></div></div>
      <div class="dd-stack"><div class="dd-card"><div class="dd-card-t"><i data-lucide="hard-drive-download" style="width:18px;height:18px;"></i>I/O for a 1 GB Parquet file on <span id="ddJWn"></span> workers</div><div id="ddJBars"></div><div class="dd-kpis" id="ddJK" style="margin-top:10px"></div></div>
      <div class="dd-card filled"><div class="dd-card-t"><i data-lucide="code-2" style="width:18px;height:18px;"></i>The code that triggers it</div><div id="ddJCode"></div></div></div>
    </div>`;
    $('ddJGrid').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c; if (PJ.sel.has(c) && PJ.sel.size > 1) PJ.sel.delete(c); else PJ.sel.add(c); projRender(); });
    $('ddJPre').addEventListener('click', e => { const b = e.target.closest('[data-jp]'); if (!b) return; PJ.sel = new Set(COLS50.slice(0, +b.dataset.jp).map(c => c[0])); projRender(); });
    bindRange('ddJW', v => { PJ.W = v; $('ddJWOut').textContent = v; projRender(); });
    projRender();
  }
  function projRender() {
    $('ddJGrid').innerHTML = COLS50.map(([c, b]) => `<button type="button" class="dd-colbtn" data-c="${c}" aria-pressed="${PJ.sel.has(c)}">${c}<small>${b} B</small></button>`).join('');
    const full = COLS50.reduce((a, c) => a + c[1], 0), sel = COLS50.filter(c => PJ.sel.has(c[0])).reduce((a, c) => a + c[1], 0), frac = sel / full;
    const rowsTotal = Math.round(PJ.file * 1048576 / full), perW = PJ.file / PJ.W;
    $('ddJWn').textContent = PJ.W;
    const bar = (l, v, max, col) => `<div class="dd-hbar"><span>${l}</span><div class="track"><div class="fill" style="width:${v / max * 100}%;background:${col}"></div></div><span class="val">${fmt(v)}</span></div>`;
    $('ddJBars').innerHTML = bar('Without projection (per worker)', perW, perW, 'var(--md-outline)') + bar(`With ${PJ.sel.size} column(s) (per worker)`, perW * frac, perW, 'var(--md-primary)') + bar('Whole file, projected', PJ.file * frac, PJ.file, 'var(--w0)');
    $('ddJK').innerHTML = kpi('Rows per worker', Math.round(rowsTotal / PJ.W).toLocaleString('en-US'), 'unchanged') + kpi('Columns read', `${PJ.sel.size} / 50`) + kpi('I/O saved', Math.round((1 - frac) * 100) + '%');
    const cols = [...PJ.sel].slice(0, 5).map(c => `"${c}"`).join(', ') + (PJ.sel.size > 5 ? ', ...' : '');
    $('ddJCode').innerHTML = codeBlock(`# Spark pushes the projection into the Parquet reader.\n# Workers ONLY fetch the column chunks for: ${[...PJ.sel].slice(0, 5).join(', ')}${PJ.sel.size > 5 ? ', …' : ''}\ndf = (spark.read.table("my_iceberg_table")\n        .select(${cols})\n        .filter("amount > 100"))\ndf.explain()   # ReadSchema: struct<${[...PJ.sel].slice(0, 3).join(',')}${PJ.sel.size > 3 ? ',…' : ''}>`);
  }

  // =====================================================================
  // 06 · TINY FILES & COMPACTION
  // =====================================================================
  const K = { state: 'before', fmt: 'delta' };
  function compactUI() {
    $('ddCompact').innerHTML = `<div class="dd-stack">
      <div class="dd-card"><div class="dd-controls" style="margin-bottom:12px;">
        ${seg('kstate', [['before', 'Before: 200 × 2 MB'], ['after', 'After compaction']], K.state, 'Table layout')}
        <button type="button" class="dd-btn filled" id="ddKRun"><i data-lucide="combine" style="width:16px;height:16px;"></i>Run compaction</button></div>
        <div class="dd-grid2"><div class="dd-tiles" id="ddKTiles" aria-label="Files in the table"></div>
        <div class="dd-kpis" id="ddKK" style="align-content:start"></div></div></div>
      <div class="dd-stack"><div class="dd-card filled"><div class="dd-card-t"><i data-lucide="wrench" style="width:18px;height:18px;"></i>Lakehouse optimization commands</div>
        <div class="dd-tw"><table class="dd-table"><thead><tr><th>Strategy</th><th>Delta Lake</th><th>Apache Iceberg</th></tr></thead><tbody>
        <tr><td><b>Compaction</b><br><span style="font-size:.78rem;color:var(--md-on-surface-var)">merge tiny files into clean 128 MB+ files</span></td><td><code>OPTIMIZE my_delta_table</code></td><td><code>CALL catalog.system.rewrite_data_files('db.my_table')</code></td></tr>
        <tr><td><b>Z-ordering</b><br><span style="font-size:.78rem;color:var(--md-on-surface-var)">cluster similar rows so whole files are skipped</span></td><td><code>OPTIMIZE t ZORDER BY (city)</code></td><td><code>ALTER TABLE t WRITE ORDERED BY city</code> (sets <code>write.sort.order</code>) or <code>rewrite_data_files(strategy =&gt; 'sort')</code></td></tr>
        <tr><td><b>Prevent at write</b></td><td><code>delta.autoOptimize.optimizeWrite = true</code></td><td><code>write.target-file-size-bytes = 536870912</code></td></tr>
        </tbody></table></div></div>
        <div class="dd-note"><i data-lucide="info" style="width:18px;height:18px;flex-shrink:0;"></i><span>You do not hand-tune split math: keep files well-sized and Spark's default <code>maxPartitionBytes</code> / <code>openCostInBytes</code> planning runs at peak efficiency.</span></div></div>
    </div>`;
    bindSeg($('ddCompact'), (k, v) => { if (k === 'kstate') { K.state = v; compactRender(); } });
    $('ddKRun').addEventListener('click', () => {
      if (K.state === 'after') { K.state = 'before'; compactRender(); }
      cancel('compact');
      const tiles = [...$('ddKTiles').children];
      tiles.forEach((t, i) => later('compact', () => t.classList.add('merge'), 100 + (i % 50) * 18));
      later('compact', () => { K.state = 'after'; $('ddCompact').querySelectorAll('[data-seg="kstate"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'after')); compactRender(true); }, 1500);
    });
    compactRender();
  }
  function compactRender(pop) {
    const before = K.state === 'before';
    const files = before ? Array.from({ length: 200 }, (_, i) => pq('f' + i, 2)) : Array.from({ length: 4 }, (_, i) => pq('f' + i, 100));
    const pl = plan(files, { maxPB: 128, openCost: 4, cores: 8 });
    $('ddKTiles').innerHTML = files.map((f, i) => { const px = before ? 12 : 120; return `<span class="dd-tile${pop ? ' big' : ''}" style="width:${px}px;height:${before ? 12 : 60}px;background:${W_COL(pl.chunks.find(c => c.fi === i).p % 4)}" title="${fmt(f.size)} file → P${pl.chunks.find(c => c.fi === i).p}"></span>`; }).join('');
    const overhead = files.length * 4 / pl.total * 100;
    $('ddKK').innerHTML = kpi('Files', files.length) + kpi('Partitions', pl.parts.length) + kpi('Open-cost share', Math.round(overhead) + '%', 'of planned bytes') + kpi('Metadata entries', files.length, 'driver must read');
    icons();
  }

  // =====================================================================
  // 07 · Z-ORDERING
  // =====================================================================
  const CITIES = ['Amsterdam', 'Berlin', 'Cairo', 'Delhi', 'Lagos', 'Lima', 'London', 'Madrid', 'Mumbai', 'Oslo', 'Paris', 'Rome', 'Seoul', 'Sydney', 'Tokyo', 'Toronto'];
  const Z = { on: false, city: 'Paris' };
  function zUI() {
    $('ddZ').innerHTML = `<div class="dd-card"><div class="dd-controls" style="margin-bottom:14px;">
      ${seg('zon', [['off', 'Unordered writes'], ['on', 'OPTIMIZE … ZORDER BY (city)']], Z.on ? 'on' : 'off', 'Data layout')}
      <div class="dd-field"><span class="dd-label">Query</span><div style="display:flex;align-items:center;gap:8px;font:500 .86rem var(--mono)">SELECT * WHERE city = <select id="ddZCity" class="dd-chip" style="height:36px" aria-label="City filter">${CITIES.map(c => `<option ${c === Z.city ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div></div>
      <div class="dd-axis"><span></span><div class="dd-ticks">${CITIES.map((c, i) => `<span style="left:${(i + 0.5) / CITIES.length * 100}%" title="${c}">${c.slice(0, 3)}</span>`).join('')}</div><span></span></div><div id="ddZFiles"></div>
      <div class="dd-grid2" style="margin-top:14px"><div class="dd-kpis" id="ddZK"></div><div id="ddZNote"></div></div></div>`;
    bindSeg($('ddZ'), (k, v) => { if (k === 'zon') { Z.on = v === 'on'; zRender(); } });
    $('ddZCity').addEventListener('change', e => { Z.city = e.target.value; zRender(); });
    zRender();
  }
  function zRender() {
    const N = CITIES.length, ci = CITIES.indexOf(Z.city);
    const files = Array.from({ length: 8 }, (_, i) => Z.on ? { lo: i * 2, hi: i * 2 + 1 } : { lo: [0, 1, 0, 2, 0, 1, 0, 0][i], hi: [15, 14, 15, 15, 13, 15, 14, 15][i] });
    let hits = 0;
    $('ddZFiles').innerHTML = files.map((f, i) => {
      const hit = ci >= f.lo && ci <= f.hi; if (hit) hits++;
      return `<div class="dd-axis"><span>part-000${i}.parquet</span><div class="dd-range"><span class="r${hit ? ' hit' : ''}" style="left:${f.lo / N * 100}%;width:${(f.hi - f.lo + 1) / N * 100}%" title="min ${CITIES[f.lo]} · max ${CITIES[f.hi]}"></span><span class="dd-target" style="left:${(ci + 0.5) / N * 100}%"></span></div><span style="color:${hit ? 'var(--md-primary)' : 'var(--md-on-surface-var)'}">${hit ? 'READ' : 'skipped'}</span></div>`;
    }).join('') + `<div class="dd-legend"><span><i class="dd-sw" style="background:var(--md-primary)"></i>min–max range overlaps the filter → file is read</span><span><i class="dd-sw" style="background:var(--md-outline);opacity:.45"></i>skipped by statistics</span><span><i class="dd-sw" style="background:var(--md-error);width:3px"></i>city = ${Z.city}</span></div>`;
    $('ddZK').innerHTML = kpi('Files read', `${hits} / 8`) + kpi('Data scanned', fmt(hits * 256), 'of ' + fmt(8 * 256)) + kpi('Tasks created', Math.ceil(hits * 256 / 128));
    $('ddZNote').innerHTML = Z.on ? `<div class="dd-note ok"><i data-lucide="check-circle-2" style="width:18px;height:18px;flex-shrink:0;"></i><span>Each file now covers a narrow band of cities. The driver drops the other ${8 - hits} file(s) <b>during planning</b>, before any task is created.</span></div>` : `<div class="dd-note err"><i data-lucide="alert-triangle" style="width:18px;height:18px;flex-shrink:0;"></i><span>Rows were written in arrival order, so every file contains almost every city. Min/max stats cannot exclude anything, and all 8 files are read.</span></div>`;
    icons();
  }

  // =====================================================================
  // 08 · SKEW & SALTING
  // =====================================================================
  const T = { heavy: 80, salt: 4, slots: 8, tab: 'py' };
  const TENANTS = ['acme', 'globex', 'initech', 'umbrella', 'hooli', 'stark'];
  function saltUI() {
    $('ddSalt').innerHTML = `<div class="dd-stack"><div class="dd-card"><div class="dd-controls">
      ${slider('ddTH', 'Heavy key share (tenant acme)', 10, 90, T.heavy, T.heavy + '%')}
      ${slider('ddTS', 'Salt buckets', 1, 16, T.salt, T.salt)}
      ${slider('ddTW', 'Executor slots (cores)', 2, 16, T.slots, T.slots)}</div></div>
      <div class="dd-grid2"><div class="dd-card"><div class="dd-card-t"><i data-lucide="flame" style="width:18px;height:18px;color:var(--md-error)"></i>Without salt: groupBy("tenant_id")</div><div id="ddTBefore"></div></div>
      <div class="dd-card"><div class="dd-card-t"><i data-lucide="sparkles" style="width:18px;height:18px;color:var(--md-success)"></i>With salt: groupBy("salted_key") → re-aggregate</div><div id="ddTAfter"></div></div></div>
      <div class="dd-grid2"><div class="dd-kpis" id="ddTK"></div><div class="dd-card filled"><div class="dd-tabs" role="tablist"><button type="button" class="dd-tab" role="tab" data-tt="py" aria-selected="${T.tab === 'py'}">Salting code (corrected)</button><button type="button" class="dd-tab" role="tab" data-tt="fix" aria-selected="${T.tab === 'fix'}">What was fixed</button></div><div id="ddTCode"></div></div></div></div>`;
    bindRange('ddTH', v => { T.heavy = v; $('ddTHOut').textContent = v + '%'; saltRender(); });
    bindRange('ddTS', v => { T.salt = v; $('ddTSOut').textContent = v; saltRender(); });
    bindRange('ddTW', v => { T.slots = v; $('ddTWOut').textContent = v; saltRender(); });
    $('ddSalt').querySelector('.dd-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tt]'); if (!b) return; T.tab = b.dataset.tt; $('ddSalt').querySelectorAll('[data-tt]').forEach(x => x.setAttribute('aria-selected', x === b)); saltCode(); });
    saltRender(); saltCode();
  }
  function schedule(tasks, slots) {
    const free = new Array(slots).fill(0), out = [];
    tasks.forEach(t => { let s = 0; for (let i = 1; i < slots; i++) if (free[i] < free[s]) s = i; out.push(Object.assign({ slot: s, start: free[s], end: free[s] + t.size }, t)); free[s] += t.size; });
    return { out, makespan: Math.max(...free) };
  }
  function gantt(sched, maxT, title) {
    const Wd = 520, lane = 18, H = T.slots * lane + 30, pl = 46, iw = Wd - pl - 10;
    let s = `<svg class="dd-gantt" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(title)}">`;
    for (let i = 0; i < T.slots; i++) s += `<text x="${pl - 6}" y="${i * lane + 13}" font-size="10" text-anchor="end" fill="#52443c" font-family="Roboto Mono">core ${i + 1}</text><rect x="${pl}" y="${i * lane + 2}" width="${iw}" height="${lane - 4}" rx="4" fill="#fceae2"/>`;
    sched.out.forEach(t => { const x = pl + t.start / maxT * iw, w = Math.max(1.5, (t.end - t.start) / maxT * iw - 1); s += `<rect x="${x}" y="${t.slot * lane + 2}" width="${w}" height="${lane - 4}" rx="4" fill="${t.heavy ? '#e34948' : '#2a78d6'}"><title>${esc(t.label)} · ${t.size.toFixed(1)}M rows</title></rect>${w > 46 ? `<text x="${x + 5}" y="${t.slot * lane + 13}" font-size="9.5" fill="#fff" font-family="Roboto Mono">${esc(t.label)}</text>` : ''}`; });
    s += `<line x1="${pl + sched.makespan / maxT * iw}" x2="${pl + sched.makespan / maxT * iw}" y1="0" y2="${T.slots * lane}" stroke="#221a15" stroke-dasharray="3 3"/><text x="${Math.min(Wd - 4, pl + sched.makespan / maxT * iw + 4)}" y="${H - 8}" font-size="10" fill="#221a15" text-anchor="${sched.makespan / maxT > 0.8 ? 'end' : 'start'}" font-family="Roboto">stage ends · ${sched.makespan.toFixed(1)}M row-units</text></svg>`;
    return s;
  }
  function saltRender() {
    const total = 100, heavy = total * T.heavy / 100, rest = (total - heavy) / (TENANTS.length - 1);
    const sizes = TENANTS.map((t, i) => i === 0 ? heavy : rest);
    const before = sizes.map((s, i) => ({ label: TENANTS[i], size: s, heavy: i === 0 }));
    const after = [];
    sizes.forEach((s, i) => { for (let k = 0; k < T.salt; k++) after.push({ label: `${TENANTS[i]}_${k}`, size: s / T.salt, heavy: i === 0 }); });
    after.sort((a, b) => b.size - a.size);
    const sb = schedule(before, T.slots), sa = schedule(after, T.slots);
    const merge = TENANTS.length * T.salt * 0.002 + 0.2;
    const maxT = Math.max(sb.makespan, sa.makespan + merge);
    $('ddTBefore').innerHTML = gantt(sb, maxT, 'Task timeline without salting') + `<div class="dd-legend"><span><i class="dd-sw" style="background:#e34948"></i>heavy key rows</span><span><i class="dd-sw" style="background:#2a78d6"></i>other tenants</span></div>`;
    $('ddTAfter').innerHTML = gantt(sa, maxT, 'Task timeline with salting') + `<div class="dd-legend"><span>${after.length} salted keys → spread over ${T.slots} cores, then a tiny 2nd aggregation (${TENANTS.length * T.salt} partial rows)</span></div>`;
    $('ddTK').innerHTML = kpi('Largest task before', heavy.toFixed(0) + 'M rows') + kpi('Largest task after', (heavy / T.salt).toFixed(1) + 'M rows') + kpi('Stage time', `${sb.makespan.toFixed(0)} → ${(sa.makespan + merge).toFixed(1)}`, 'relative units') + kpi('Speed-up', (sb.makespan / (sa.makespan + merge)).toFixed(1) + '×');
  }
  function saltCode() {
    $('ddTCode').innerHTML = T.tab === 'py' ? codeBlock(`import pyspark.sql.functions as F

N = ${T.salt}   # salt buckets
# 1. add a random salt 0..N-1 to break up the heavy key
salted = (df.withColumn("salt", F.floor(F.rand() * N).cast("int"))
            .withColumn("salted_key", F.concat_ws("_", "tenant_id", "salt")))

# 2. aggregate on the salted key (the heavy tenant now spans N tasks)
partial = salted.groupBy("tenant_id", "salted_key").agg(F.sum("amount").alias("partial_sum"))

# 3. drop the salt: re-aggregate the N partial sums per real key
final_df = partial.groupBy("tenant_id").agg(F.sum("partial_sum").alias("total_amount"))`)
      : `<ul style="margin:0;padding-left:18px;line-height:1.7;font-size:.88rem">
        <li>The guide's step 3 used <code>F.split(col, "_")</code> as the key — that returns an <b>array</b>, not the original key. Carrying <code>tenant_id</code> through the partial aggregation avoids string surgery entirely (or use <code>F.split(...)[0]</code>).</li>
        <li>Summing <code>"sum(amount)"</code> relies on Spark's auto-generated column name; an explicit <code>.alias("partial_sum")</code> is safer.</li>
        <li><code>F.concat_ws("_", …)</code> casts the integer salt for you; <code>F.concat</code> with a non-string column needs a cast.</li>
        <li>Salting only helps <b>re-aggregatable</b> functions (sum, count, min, max). For a join, salt the big side and explode the small side × N instead.</li></ul>`;
  }

  // =====================================================================
  // 09 · CHEAT SHEET
  // =====================================================================
  function cheatUI() {
    $('ddCheat').innerHTML = `<div class="dd-grid2">
      <div class="dd-card"><div class="dd-card-t"><i data-lucide="sliders-horizontal" style="width:18px;height:18px;"></i>Criteria the driver evaluates during file planning</div>
      <div class="dd-tw"><table class="dd-table"><thead><tr><th>Setting</th><th>Default</th><th>What it decides</th></tr></thead><tbody>
        <tr><td><code>spark.sql.files.maxPartitionBytes</code></td><td>128 MB (134,217,728 B)</td><td>Upper bound of one partition; larger files are cut into chunks of this size.</td></tr>
        <tr><td><code>spark.sql.files.openCostInBytes</code></td><td>4 MB (4,194,304 B)</td><td>Penalty for opening a file. Tiny files are packed together so a worker doesn't spend more time opening than reading.</td></tr>
        <tr><td>Parallelism (total cores)</td><td>executors × cores</td><td>bytesPerCore = total ÷ cores; small inputs get smaller splits so every core works.</td></tr>
        <tr><td>Parquet row groups</td><td>~128 MB (<code>parquet.block.size</code>)</td><td>Physical unit actually read; a task reads the row groups whose midpoint is in its byte range.</td></tr>
        <tr><td>Splittable format?</td><td>Parquet / ORC yes · gzip no</td><td>Unsplittable files become exactly one task each.</td></tr>
      </tbody></table></div></div>
      <div class="dd-card"><div class="dd-card-t"><i data-lucide="workflow" style="width:18px;height:18px;"></i>Who does what</div>
      <div class="dd-tw"><table class="dd-table"><thead><tr><th>Component</th><th>Role</th></tr></thead><tbody>
        <tr><td><b>Delta Lake / Iceberg</b></td><td>Catalog: lists the live Parquet files of the current version with sizes and statistics. Does <b>not</b> decide splits.</td></tr>
        <tr><td><b>Spark driver</b></td><td>Prunes files, computes maxSplitBytes, cuts and packs files into partitions, creates one task per partition and assigns tasks to free cores.</td></tr>
        <tr><td><b>Workers / executors</b></td><td>Pure executors: open the file, seek to the byte offset, read the selected column chunks of their row groups, process the rows.</td></tr>
        <tr><td><b>After a shuffle</b></td><td>Rows are re-distributed by <code>hash(key)</code> into <code>spark.sql.shuffle.partitions</code>; skew now comes from key values → salting.</td></tr>
      </tbody></table></div></div></div>`;
  }

  // ---------------- speed control ----------------
  function speedUI() {
    const el = $('ddSpeed'); rangeFill(el);
    el.addEventListener('input', () => { speed = SPEEDS[+el.value]; $('ddSpeedOut').textContent = speed + '×'; el.setAttribute('aria-valuetext', speed + '×'); rangeFill(el); });
  }

  function init() {
    rowsUI(); pipeUI(); calcUI(); rgUI(); projUI(); compactUI(); zUI(); saltUI(); cheatUI(); speedUI(); icons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
