/* =========================================================================
   Executor Work-Distribution Studio
   How the Spark driver turns Delta Lake / Iceberg files into splits and
   tasks, and how the TaskScheduler hands them to executor cores — with
   live CPU / memory, fragmentation, skew + salting, spill, failures and
   speculation. Engine is pure (testable in Node); UI renders into
   #mxStudio. Timings are illustrative.
   ========================================================================= */
(function (root) {
  'use strict';

  // =====================================================================
  // DOMAIN DATA
  // =====================================================================
  const DOMAINS = {
    sales: { label: 'Retail sales', table: 'sales', l1: 'sale_date', l2: 'region', keys: ['US', 'EU', 'APAC', 'LATAM'], fact: 'sales', dim: 'dim_store', agg: 'store_id', measure: 'amount' },
    iot: { label: 'IoT telemetry', table: 'telemetry', l1: 'event_date', l2: 'device_type', keys: ['sensor', 'gateway', 'camera', 'meter'], fact: 'telemetry', dim: 'dim_device', agg: 'device_id', measure: 'reading' },
    bank: { label: 'Banking transactions', table: 'transactions', l1: 'txn_date', l2: 'branch_region', keys: ['NORTH', 'SOUTH', 'EAST', 'WEST'], fact: 'transactions', dim: 'dim_account', agg: 'account_id', measure: 'txn_amount' },
    click: { label: 'Clickstream events', table: 'events', l1: 'event_date', l2: 'country', keys: ['IN', 'US', 'DE', 'BR'], fact: 'events', dim: 'dim_user', agg: 'user_id', measure: 'duration_ms' }
  };
  const DATES = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'];
  const KEEP_FROM = 2; // query filters the last 3 dates
  const MAX_SPLIT = 128, OPEN_COST = 4;

  function rng(seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------------- single Parquet file anatomy ----------------
  // 12 columns with relative on-disk weights (sum = 100)
  function pqColumns(D) {
    return [[D.l1, 3], [D.l2, 2], [D.agg, 5], [D.measure, 6], ['order_id', 8], ['event_ts', 6], ['customer_id', 8], ['product_id', 8], ['qty', 3], ['discount', 4], ['channel', 3], ['raw_payload', 44]];
  }
  const PQ_PROJ = { 2: [2, 3], 6: [0, 1, 2, 3, 5, 8], 12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  function parquetModel(S) {
    const D = DOMAINS[S.domain], F = S.pqFile, RG = Math.min(S.pqRG, F), cores = S.workers * S.cores;
    const cols = pqColumns(D), sel = PQ_PROJ[S.pqCols] || PQ_PROJ[12];
    const colFrac = sel.reduce((a, i) => a + cols[i][1], 0) / 100;
    const nRG = Math.max(1, Math.ceil(F / RG - 1e-9)), rgs = [];
    for (let i = 0; i < nRG; i++) {
      const start = i * RG, size = Math.min(RG, F - start);
      rgs.push({ id: 'rg' + i, i, start, size, mid: start + size / 2, skipped: !!S.pqFilter && nRG > 1 && (i % 5 === 1 || i % 5 === 3) });
    }
    // Spark: maxSplitBytes = min(maxPartitionBytes, max(openCostInBytes, totalBytes / defaultParallelism))
    const bytesPerCore = F / cores;
    const maxSplit = Math.min(S.pqSplit, Math.max(OPEN_COST, bytesPerCore));
    const nSplits = Math.max(1, Math.ceil(F / maxSplit - 1e-9)), splits = [];
    for (let j = 0; j < nSplits; j++) splits.push({ j, start: j * maxSplit, end: Math.min(F, (j + 1) * maxSplit), rgs: [] });
    // a row group belongs to the split that contains its midpoint — it is never divided
    rgs.forEach(r => { const j = Math.min(nSplits - 1, Math.floor(r.mid / maxSplit)); r.split = j; splits[j].rgs.push(r); });
    return { D, F, RG, nRG, rgs, cols, sel, colFrac, maxSplit, bytesPerCore, cores, splits };
  }
  const mbTxt = mb => mb >= 1024 ? (mb / 1024).toFixed(mb % 1024 ? 1 : 0) + ' GB' : (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB';

  // ---------------- files per scenario ----------------
  function buildFiles(S) {
    if (S.tab === 'parquet') return parquetModel(S).rgs.map(r => ({ id: r.id, di: 0, ki: r.split % 4, size: r.size, kind: 'data', pruned: false }));
    const r = rng(hashStr(S.tab + S.domain)), files = [];
    let id = 0;
    DATES.forEach((d, di) => {
      for (let ki = 0; ki < 4; ki++) {
        const pruned = di < KEEP_FROM;
        const add = (size, kind) => files.push({ id: id++, di, ki, size, kind: kind || 'data', pruned });
        if (S.tab === 'fragment') {
          const small = []; for (let i = 0; i < 40; i++) small.push(1 + 5 * r());
          if (S.compacted) add(small.reduce((a, b) => a + b, 0) * 0.97);
          else { small.forEach(s => add(s)); for (let i = 0; i < 5; i++) add(0.05, 'del'); }
        } else if (S.tab === 'skew') {
          const n = ki === 0 ? 8 : 1; for (let i = 0; i < n; i++) add(110 + 18 * r());
        } else if (S.tab === 'memory') {
          for (let i = 0; i < 2; i++) add(96 + 32 * r());
        } else {
          for (let i = 0; i < 2; i++) add(96 + 32 * r());
        }
      }
    });
    return files;
  }

  // Spark FilePartition bin-packing: split files > maxSplit, sort desc, pack with open cost
  function binpack(files) {
    const chunks = [];
    files.filter(f => f.kind === 'data' && !f.pruned).forEach(f => {
      let off = 0; while (off < f.size - 1e-9) { const len = Math.min(MAX_SPLIT, f.size - off); chunks.push({ file: f, size: len }); off += len; }
    });
    chunks.sort((a, b) => b.size - a.size);
    const parts = []; let cur = [], curSize = 0;
    for (const c of chunks) {
      if (cur.length && curSize + c.size > MAX_SPLIT) { parts.push(cur); cur = []; curSize = 0; }
      cur.push(c); curSize += c.size + OPEN_COST;
    }
    if (cur.length) parts.push(cur);
    return parts;
  }

  function scanTasks(files, prefix) {
    const splits = binpack(files);
    const delCount = {};
    files.filter(f => f.kind === 'del' && !f.pruned).forEach(f => { const k = f.di + '_' + f.ki; delCount[k] = (delCount[k] || 0) + 1; });
    return splits.map((sp, i) => {
      const size = sp.reduce((a, c) => a + c.size, 0);
      const byKey = [0, 0, 0, 0]; sp.forEach(c => { byKey[c.file.ki] += c.size; });
      const key = byKey.indexOf(Math.max(...byKey));
      const parts = new Set(sp.map(c => c.file.di + '_' + c.file.ki));
      let dels = 0; parts.forEach(p => { dels += delCount[p] || 0; });
      return { name: `${prefix}.${i}`, key, sizeMB: size, nFiles: sp.length, files: [...new Set(sp.map(c => c.file.id))], dels, byKey, rate: 120, memNeed: Math.min(size * 0.5, 200) + 48 };
    });
  }

  function buildStages(S, files) {
    const D = DOMAINS[S.domain];
    if (S.tab === 'parquet') {
      const pm = parquetModel(S);
      return [{ name: `Stage 1 · scan part-00000.parquet (${pm.splits.length} split${pm.splits.length > 1 ? 's' : ''})`, kind: 'scan', tasks: pm.splits.map(sp => {
        const read = sp.rgs.filter(r => !r.skipped).reduce((a, r) => a + r.size * pm.colFrac, 0);
        const rgl = sp.rgs.length ? 'RG ' + sp.rgs.map(r => r.i).join(',') : 'empty';
        return { name: `T1.${sp.j}`, key: sp.j % 4, sizeMB: read, nFiles: 1, files: sp.rgs.map(r => r.id), dels: 0, rate: 30, memNeed: Math.min(read * 0.5, 200) + 48, label: `split ${sp.j} · ${rgl}` };
      }) }];
    }
    const scan = scanTasks(files, 'T1');
    const scannedByKey = [0, 0, 0, 0]; scan.forEach(t => t.byKey.forEach((v, k) => { scannedByKey[k] += v; }));
    const scanned = scannedByKey.reduce((a, b) => a + b, 0);
    const stages = [];
    if (S.tab === 'memory') {
      const cache = [];
      for (let i = 0; i < 8; i++) cache.push({ name: `T1.${i}`, key: i % 4, sizeMB: 400, nFiles: 1, files: [], dels: 0, rate: 400, memNeed: 96, cacheMB: S.cache ? 400 : 0, label: `${D.dim} part ${i}` });
      stages.push({ name: `Stage 1 · scan ${D.dim}${S.cache ? ' + cache()' : ''}`, kind: 'scan', tasks: cache });
      stages.push({ name: `Stage 2 · scan ${D.fact} + shuffle write`, kind: 'scan', tasks: scan.map((t, i) => Object.assign(t, { name: `T2.${i}` })) });
      const join = [];
      for (let i = 0; i < 8; i++) join.push({ name: `T3.${i}`, key: i % 4, sizeMB: 600, nFiles: 0, files: [], dels: 0, rate: 150, memNeed: 2400, label: `join part ${i}` });
      stages.push({ name: `Stage 3 · sort-merge join ${D.fact} ⋈ ${D.dim}`, kind: 'reduce', tasks: join });
      return stages;
    }
    stages.push({ name: `Stage 1 · scan ${D.table} + partial agg`, kind: 'scan', tasks: scan });
    if (S.tab === 'skew') {
      if (!S.salted) {
        stages.push({ name: `Stage 2 · Window.partitionBy("${D.l2}") — rank per ${D.l2}`, kind: 'reduce', tasks: D.keys.map((k, ki) => ({ name: `T2.${ki}`, key: ki, sizeMB: scannedByKey[ki] * 0.5, nFiles: 0, files: [], dels: 0, rate: 150, memNeed: scannedByKey[ki] * 0.5 * 2, label: `${D.l2}=${k}` })) });
      } else {
        const t2 = [];
        D.keys.forEach((k, ki) => { for (let s = 0; s < 8; s++) { const sz = scannedByKey[ki] * 0.5 / 8; t2.push({ name: `T2.${ki * 8 + s}`, key: ki, sizeMB: sz, nFiles: 0, files: [], dels: 0, rate: 150, memNeed: sz * 2, label: `${k}·salt${s}` }); } });
        stages.push({ name: `Stage 2 · partitionBy("${D.l2}", "salt") — local top-N`, kind: 'reduce', tasks: t2 });
        stages.push({ name: `Stage 3 · merge salted top-N per ${D.l2}`, kind: 'reduce', tasks: D.keys.map((k, ki) => ({ name: `T3.${ki}`, key: ki, sizeMB: 6, nFiles: 0, files: [], dels: 0, rate: 150, memNeed: 12, label: `${D.l2}=${k}` })) });
      }
      return stages;
    }
    const sh = scanned * 0.12, t2 = [];
    for (let i = 0; i < 8; i++) t2.push({ name: `T2.${i}`, key: i % 4, sizeMB: sh / 8, nFiles: 0, files: [], dels: 0, rate: 150, memNeed: sh / 8 * 1.5, label: `shuffle part ${i}` });
    stages.push({ name: `Stage 2 · groupBy("${D.l2}", "${D.agg}") final agg`, kind: 'reduce', tasks: t2 });
    return stages;
  }

  function buildPlan(S, files, stages) {
    const D = DOMAINS[S.domain];
    if (S.tab === 'parquet') {
      const pm = parquetModel(S), empty = pm.splits.filter(x => !x.rgs.length).length, skipped = pm.rgs.filter(r => r.skipped).length;
      const ice = S.format === 'iceberg';
      return [
        { label: `Catalyst: column projection [${pm.sel.map(i => pm.cols[i][0]).join(', ')}]${S.pqFilter ? ` + filter <code>${D.measure} &gt; 1000</code>` : ''}`, dur: 0.25 },
        { label: `Read the Parquet <b>footer</b>: ${pm.nRG} row group(s) × ${pm.cols.length} column chunks — byte offsets + min/max stats${ice ? ' (Iceberg also stores <code>split_offsets</code> in metadata)' : ''}`, dur: 0.3 },
        { label: `${ice ? '<code>read.split.target-size</code>' : 'maxSplitBytes'} = min(${S.pqSplit} MB, max(4 MB, ${mbTxt(pm.F)} ÷ ${pm.cores} cores)) = <b>${mbTxt(pm.maxSplit)}</b> → ${pm.splits.length} split(s)`, dur: 0.2 },
        { label: `Each row group goes to the split holding its <b>midpoint</b>${empty ? ` → <b>${empty} empty split(s)</b>` : ''}${skipped ? `; ${skipped} row group(s) skipped by min/max` : ''}`, dur: 0.2 }
      ];
    }
    const data = files.filter(f => f.kind === 'data'), kept = data.filter(f => !f.pruned), dels = files.filter(f => f.kind === 'del');
    const ice = S.format === 'iceberg';
    const meta = ice
      ? `Load <b>metadata.json</b> → current snapshot → manifest list → ${Math.max(1, Math.ceil(data.length / 40))} manifest(s) → ${data.length} data + ${dels.length} delete files`
      : `Replay <b>_delta_log</b> (checkpoint.parquet + JSON commits) → ${data.length} <code>add</code> actions${dels.length ? ` + ${dels.length} deletion vectors` : ''}`;
    const prune = ice
      ? `Prune with hidden partition <code>days(${D.l1.replace('_date', '_ts')})</code> + manifest bounds → keep ${kept.length} files (3 of 5 days)`
      : `Partition pruning <code>${D.l1} ≥ ${DATES[KEEP_FROM]}</code> + min/max data skipping → keep ${kept.length} files`;
    const plan = [
      { label: 'Catalyst parses & optimizes the query → physical plan', dur: 0.25 },
      { label: meta, dur: 0.3 + (data.length + dels.length) * 0.004 },
      { label: prune, dur: 0.15 + kept.length * 0.0015 },
      { label: `Bin-pack splits (<code>maxPartitionBytes</code>=128 MB, <code>openCostInBytes</code>=4 MB) → <b>${stages[0].tasks.length} tasks</b>`, dur: 0.12 + kept.length * 0.001 }
    ];
    if (S.tab === 'memory') plan[3].label = `Plan splits for ${D.dim} and ${D.fact} → ${stages[0].tasks.length} + ${stages[1].tasks.length} tasks`;
    return plan;
  }

  // =====================================================================
  // ENGINE
  // =====================================================================
  function createEngine(cfg) {
    const W = cfg.workers, C = cfg.cores, heap = cfg.mem * 1024;
    const reserved = 300, usable = heap - reserved, unified = usable * 0.6, userReg = usable * 0.4, floor = unified * 0.5, overhead = Math.max(384, heap * 0.1);
    const slowIdx = cfg.degraded && W > 1 ? Math.min(2, W - 1) : -1;
    const workers = Array.from({ length: W }, (_, i) => ({ id: i, slots: new Array(C).fill(null), storage: 0, lost: false, slow: i === slowIdx ? 6 : 1, done: 0, busyT: 0, spill: 0, evicted: 0 }));
    const stages = cfg.stages.map((s, si) => Object.assign({}, s, { idx: si, tasks: s.tasks.map(t => Object.assign({}, t, { stage: si, done: false, attempts: 0, running: 0, loc: null })) }));
    const E = {
      t: 0, phase: 'plan', planIdx: 0, planT: 0, stageIdx: -1, barrierT: 0, queue: [], events: [], history: [],
      workers, stages, plan: cfg.plan, W, C, doneAt: null, totalSpill: 0, failed: 0, spec: 0, rr: 0, recomputePending: 0, nextSample: 0,
      mem: { heap, reserved, usable, unified, userReg, floor, overhead, userUsed: userReg * 0.22 }, slowIdx, planSec: 0
    };
    const emit = (type, d) => { if (!cfg.fast) E.events.push(Object.assign({ type }, d)); };
    const execUsed = w => w.slots.reduce((a, s) => a + (s ? s.granted : 0), 0);
    E.execUsed = execUsed;

    function startStage(i) {
      E.stageIdx = i; E.phase = 'stage';
      E.stages[i].start = E.t;
      E.queue.push(...E.stages[i].tasks.filter(t => !t.done));
      emit('stage', { i });
    }
    function assign(task, w, si, spec) {
      const cap = (unified - Math.min(w.storage, floor)) / C;
      const granted = Math.min(task.memNeed, cap), spill = Math.max(0, task.memNeed - granted);
      const used = execUsed(w) + granted;
      if (w.storage + used > unified) {
        const target = Math.max(Math.min(w.storage, floor), unified - used);
        if (target < w.storage - 1) { const ev = w.storage - target; w.storage = target; w.evicted += ev; emit('evict', { w: w.id, mb: ev }); }
      }
      const dur = (0.1 + task.nFiles * 0.06 + task.dels * 0.05 + task.sizeMB / task.rate + spill * 2 / 300) * w.slow;
      const a = { task, w: w.id, slot: si, start: E.t, dur, granted, spill, spec: !!spec };
      w.slots[si] = a; task.running++; task.attempts++;
      emit('assign', { a });
      return a;
    }
    function freeSlots() {
      const out = [], alive = workers.filter(w => !w.lost);
      if (!alive.length) return out;
      const start = E.rr++ % alive.length;
      for (let k = 0; k < C; k++) for (let j = 0; j < alive.length; j++) { const w = alive[(start + j) % alive.length]; if (!w.slots[k]) out.push([w, k]); }
      return out;
    }
    function tryAssign() {
      for (const [w, si] of freeSlots()) {
        const qi = E.queue.findIndex(t => t.recompute || E.recomputePending === 0);
        if (qi < 0) break;
        assign(E.queue.splice(qi, 1)[0], w, si, false);
      }
    }
    function killAttempts(task, except) {
      workers.forEach(x => x.slots.forEach((b, j) => { if (b && b.task === task && b !== except) { x.slots[j] = null; task.running--; emit('kill', { w: x.id, slot: j, a: b }); } }));
    }
    function finish(w, si, a) {
      w.slots[si] = null; const t = a.task; t.running--;
      if (t.done) return;
      t.done = true; t.loc = w.id; t.took = E.t - a.start; w.done++;
      E.totalSpill += a.spill; w.spill += a.spill;
      if (t.cacheMB) w.storage = Math.min(unified, w.storage + t.cacheMB);
      if (t.recompute) { E.recomputePending--; if (t.orig) t.orig.loc = w.id; }
      killAttempts(t, a);
      emit('finish', { a, w: w.id, slot: si });
    }
    function speculate() {
      const st = E.stages[E.stageIdx], done = st.tasks.filter(t => t.done);
      if (done.length < st.tasks.length * 0.75) return;
      const durs = done.map(t => t.took).sort((x, y) => x - y), med = durs[Math.floor(durs.length / 2)] || 0;
      workers.forEach(w => w.slots.forEach(a => {
        if (!a || a.spec || a.task.running > 1 || a.task.done || E.t - a.start < Math.max(1.5 * med, 0.5)) return;
        const free = freeSlots().find(([x]) => x.id !== w.id && x.slow === 1);
        if (!free) return;
        const b = assign(a.task, free[0], free[1], true); E.spec++;
        emit('spec', { a: b, from: w.id });
      }));
    }
    E.kill = function (i) {
      const w = workers[i];
      if (!w || w.lost || workers.filter(x => !x.lost).length <= 1 || E.phase === 'done') return false;
      w.lost = true;
      w.slots.forEach((a, j) => {
        if (!a) return;
        a.task.running--; w.slots[j] = null; E.failed++;
        if (!a.task.done && a.task.running === 0) E.queue.unshift(a.task);
        emit('fail', { w: i, slot: j, a });
      });
      if (E.stageIdx > 0) {
        const lostMaps = E.stages[E.stageIdx - 1].tasks.filter(t => t.loc === i);
        lostMaps.forEach(t => { E.queue.unshift(Object.assign({}, t, { name: t.name + '′', recompute: true, orig: t, done: false, running: 0, attempts: 0, loc: null })); E.recomputePending++; });
        if (lostMaps.length) emit('fetchFailed', { w: i, n: lostMaps.length });
      }
      w.storage = 0;
      return true;
    };
    E.step = function (dt) {
      if (E.phase === 'done') return;
      E.t += dt;
      if (E.phase === 'plan') {
        E.planT += dt;
        while (E.planIdx < E.plan.length && E.planT >= E.plan[E.planIdx].dur) { E.planT -= E.plan[E.planIdx].dur; E.planIdx++; emit('plan', { i: E.planIdx }); }
        if (E.planIdx >= E.plan.length) { E.planSec = E.t; startStage(0); }
      } else if (E.phase === 'barrier') {
        E.barrierT -= dt;
        if (E.barrierT <= 0) {
          if (E.stageIdx + 1 < E.stages.length) startStage(E.stageIdx + 1);
          else { E.phase = 'done'; E.doneAt = E.t; emit('done', {}); }
        }
      }
      workers.forEach(w => {
        let busy = 0;
        w.slots.forEach((a, si) => { if (!a) return; busy++; if (E.t - a.start >= a.dur) finish(w, si, a); });
        w.busyT += busy * dt;
      });
      if (E.phase === 'stage') {
        const st = E.stages[E.stageIdx];
        if (st.tasks.every(t => t.done) && E.recomputePending === 0) { st.end = E.t; E.phase = 'barrier'; E.barrierT = 0.35; emit('barrier', { i: E.stageIdx }); }
        else { if (cfg.speculation) speculate(); tryAssign(); }
      }
      if (E.t >= E.nextSample) {
        E.nextSample = E.t + 0.1;
        const alive = workers.filter(w => !w.lost);
        let busy = 0, memSum = 0;
        alive.forEach(w => { busy += w.slots.filter(Boolean).length; memSum += (reserved + E.mem.userUsed + w.storage + execUsed(w)) / heap; });
        E.history.push({ t: E.t, cpu: alive.length ? busy / (alive.length * C) : 0, mem: alive.length ? memSum / alive.length : 0 });
      }
    };
    E.totalTasks = () => E.stages.reduce((a, s) => a + s.tasks.length, 0);
    E.doneTasks = () => E.stages.reduce((a, s) => a + s.tasks.filter(t => t.done).length, 0);
    E.utilization = () => { const t = E.doneAt || E.t; return t > 0 ? workers.reduce((a, w) => a + w.busyT, 0) / (W * C * t) : 0; };
    return E;
  }

  function scenarioConfig(S) {
    const files = buildFiles(S), stages = buildStages(S, files), plan = buildPlan(S, files, stages);
    return { files, stages, plan, workers: S.workers, cores: S.cores, mem: S.mem, degraded: S.tab === 'failure' && S.degraded, speculation: S.tab === 'failure' && S.speculation };
  }
  function simulate(S, overrides) {
    const cfg = Object.assign(scenarioConfig(S), overrides || {}, { fast: true });
    const E = createEngine(cfg); let g = 0;
    while (E.phase !== 'done' && g++ < 400000) E.step(0.02);
    return { time: E.doneAt || E.t, util: E.utilization(), spill: E.totalSpill, tasks: E.totalTasks(), plan: E.planSec };
  }

  const ENGINE = { DOMAINS, DATES, parquetModel, buildFiles, binpack, buildStages, buildPlan, createEngine, scenarioConfig, simulate };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENGINE; return; }
  root.ExecStudioEngine = ENGINE;
  if (typeof document === 'undefined') return;

  // =====================================================================
  // UI
  // =====================================================================
  const host = document.getElementById('mxStudio');
  if (!host) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmtMB = mb => mb >= 1024 ? (mb / 1024).toFixed(mb >= 10240 ? 0 : 1) + ' GB' : Math.round(mb) + ' MB';
  const fmtS = s => s < 60 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
  const KC = ['var(--k0)', 'var(--k1)', 'var(--k2)', 'var(--k3)'];

  const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
  const TABS = [
    { id: 'assign', icon: 'git-branch-plus', label: 'Driver → Task Assignment' },
    { id: 'parquet', icon: 'file-box', label: 'Parquet Row Groups & Splits' },
    { id: 'fragment', icon: 'files', label: 'Small-File Fragmentation' },
    { id: 'skew', icon: 'flame', label: 'Partition Skew & Salting' },
    { id: 'memory', icon: 'memory-stick', label: 'Executor Memory & Spill' },
    { id: 'failure', icon: 'server-crash', label: 'Node Failure & Speculation' }
  ];
  const S = { tab: 'assign', domain: 'sales', format: 'delta', workers: 4, cores: 2, mem: 8, speed: 1, compacted: false, salted: false, cache: true, speculation: false, degraded: false, pqFile: 1024, pqRG: 128, pqSplit: 128, pqCols: 2, pqFilter: false };
  const flying = new Set();
  let E = null, cfg = null, running = false, lastTs = 0, fileEls = {}, slotEls = [], runLabel = '', history = [], autoStarted = false;

  // ---------------- static scaffold ----------------
  host.innerHTML = `
    <div class="mx-tabs" role="tablist" aria-label="Scenarios">${TABS.map((t, i) => `<button class="mx-tab" role="tab" id="mxTab-${t.id}" aria-controls="mxBody" aria-selected="${t.id === S.tab}" tabindex="${t.id === S.tab ? 0 : -1}" data-tab="${t.id}"><i data-lucide="${t.icon}" style="width:18px;height:18px;"></i><span>${t.label}</span><span class="mx-tab-num">0${i + 1}</span></button>`).join('')}</div>
    <div class="mx-body" id="mxBody" role="tabpanel">
      <details class="mx-card mx-rules" id="mxRules" open></details>
      <div class="mx-card" id="mxIntro"></div>
      <div class="mx-card mx-toolbar" id="mxToolbar"></div>
      <div class="mx-row2">
        <div class="mx-card" id="mxStorage"></div>
        <div class="mx-card" id="mxDriver"></div>
      </div>
      <div>
        <div class="mx-card-hd" style="margin-bottom:8px;"><h4 class="mx-card-title"><i data-lucide="server" style="width:18px;height:18px;color:var(--cpu)"></i>Executors on worker nodes</h4>
          <div class="mx-mem-legend"><span><i class="mx-dot" style="background:var(--cpu)"></i>CPU (busy cores)</span><span><i class="mx-dot" style="background:var(--mem-res)"></i>Reserved 300 MB</span><span><i class="mx-dot" style="background:var(--mem-user)"></i>User memory</span><span><i class="mx-dot" style="background:repeating-linear-gradient(135deg,var(--mem) 0 2px,transparent 2px 4px)"></i>Storage (cache)</span><span><i class="mx-dot" style="background:var(--mem)"></i>Execution (tasks)</span></div>
        </div>
        <div class="mx-workers" id="mxWorkers"></div>
      </div>
      <div class="mx-row2">
        <div class="mx-card" id="mxLoad"></div>
        <div class="mx-card" id="mxMetrics"></div>
      </div>
      <div class="mx-row2">
        <div class="mx-card" id="mxScale"></div>
        <div class="mx-card" id="mxCode"></div>
      </div>
    </div>
    <div class="mx-snack" id="mxSnack" aria-live="polite"></div>`;
  const $ = id => document.getElementById(id);

  // ---------------- tab content ----------------
  function D() { return DOMAINS[S.domain]; }
  function rules() {
    const d = D();
    const R = [
      ['send', 'The driver plans, executors read', 'The driver never ships table data. It sends each executor a <b>task description</b> — file path + byte range + columns — and the executor reads those bytes directly from S3 / ADLS / HDFS.'],
      ['split', '1 split = 1 partition = 1 task = 1 core', 'Read parallelism equals the number of splits. A core runs one task at a time; extra tasks wait for the next <b>wave</b>.'],
      ['ruler', 'How big is a split?', '<code>maxSplitBytes = min(maxPartitionBytes 128 MB, max(openCostInBytes 4 MB, total bytes ÷ total cores))</code>. Small data on a big cluster gets smaller splits.'],
      ['rows-3', 'Parquet row groups are atomic', 'A row group goes <b>whole</b> to the split that holds its midpoint. Rows travel with their row group. Columns are never split across workers — projection just skips unread column chunks.'],
      ['package', 'Small files are packed, tiny files are not split', 'Files below the split size are bin-packed together (each costs a 4 MB "open"); a single tiny file is one task on one worker.'],
      ['folder-tree', "Partition folders prune, they don't parallelize", `<code>${d.l1}=…/${d.l2}=…/</code> lets the driver skip whole files at planning time; the task count still comes from bytes, not from folders.`],
      ['file-lock', 'Unsplittable formats', 'gzip-compressed CSV or JSON = one task per file, whatever its size. Parquet, ORC, Delta and Iceberg data files are splittable.'],
      ['shuffle', 'After a shuffle, keys decide', `groupBy / join / window re-distribute rows by <code>hash(key)</code> into <code>spark.sql.shuffle.partitions</code>. From here on, skew comes from key values (e.g. ${d.l2}=${d.keys[0]}), not from files.`]
    ];
    $('mxRules').innerHTML = `<summary class="mx-card-title"><i data-lucide="list-ordered" style="width:18px;height:18px;color:var(--mx-primary)"></i>How data gets distributed — 8 rules behind every tab</summary>
      <div class="mx-rules-grid">${R.map(([ic, t, b], i) => `<div class="mx-rule"><div class="mx-rule-hd"><span class="mx-rule-n">${i + 1}</span><i data-lucide="${ic}" style="width:15px;height:15px;"></i>${t}</div><p>${b}</p></div>`).join('')}</div>`;
  }
  function intro() {
    const d = D(), ice = S.format === 'iceberg', fmt = ice ? 'Apache Iceberg' : 'Delta Lake';
    const C = {
      parquet: {
        title: 'One Parquet file, many workers: <b>row groups</b> are the unit of parallelism',
        what: ['Reads only the file <b>footer</b> first: row-group byte offsets, column-chunk locations and min/max statistics.', ice ? 'Iceberg plans the splits itself (<code>read.split.target-size</code>, 128 MB) and snaps them to the row-group <code>split_offsets</code> stored in its metadata.' : 'Cuts the file into byte-range <b>splits</b> of <code>maxSplitBytes</code> (driver step 3).', 'Assigns each row group to the split containing its <b>midpoint</b> — a row group is never divided between workers.', 'Sends each executor only the split\'s byte range + the projected columns; the executor reads those column chunks straight from storage.'],
        watch: ['Split smaller than a row group (try 64 MB splits with 128 MB row groups) → some tasks get <b>no row group</b> and finish instantly.', 'Projection: grey cells are column chunks that are never read.', 'Filter: striped row groups are skipped using footer min/max stats.', 'Pick the <b>4 MB</b> file: one split, one task, one busy core — every other worker idles.'],
        fix: ['Write row groups ≈ split size (128–256 MB): <code>parquet.block.size</code> / <code>write.parquet.row-group-size-bytes</code>.', 'Keep files ≥ 128 MB (ideally 256 MB–1 GB); compact tiny files.', 'Select only needed columns; sort / Z-order by filter columns so min/max stats can skip row groups.']
      },
      assign: {
        title: `How the driver turns <code>${d.table}/${d.l1}=…/${d.l2}=…/</code> files into tasks on ${S.workers} worker(s)`,
        what: [`Reads the ${fmt} ${ice ? 'metadata tree (metadata.json → manifest list → manifests)' : 'transaction log (_delta_log)'} — never lists S3 directories.`, `Prunes partitions outside the date filter, skips files by min/max stats.`, `Bin-packs the surviving files into ~128 MB <b>splits</b>; one split = one task.`, `TaskScheduler offers tasks to free executor <b>cores</b> round-robin, wave after wave.`],
        watch: ['Each core runs exactly one task at a time — tasks > cores means multiple waves.', 'Stage 2 cannot start until every Stage 1 task finishes (shuffle barrier).', 'CPU bars show how evenly the cluster is loaded.'],
        fix: ['Aim for 2–4× more tasks than cores so stragglers overlap.', 'Keep files 128 MB–1 GB so splits map to whole files.', 'Filter on the partition column so pruning happens at planning time.']
      },
      fragment: {
        title: `Streaming/CDC micro-batches left <b>40 tiny files per partition</b>${S.compacted ? ' — now compacted' : ''}`,
        what: [`Driver must read metadata for every small file (${ice ? 'manifest entries + delete files' : 'add actions + deletion vectors'}) — planning time grows with file count.`, 'Each task opens ~17 files (4 MB open cost each) and merges row-level deletes on read.', 'Executors spend time on object-store GETs, not on rows.'],
        watch: ['Long planning phase in the driver stepper.', 'Many short tasks with high per-file overhead.', 'Compare runs in the history table after compacting.'],
        fix: ice ? ['<code>CALL system.rewrite_data_files(\'db.' + d.table + '\')</code> (bin-pack or sort).', '<code>rewrite_position_delete_files</code> + <code>expire_snapshots</code> + <code>rewrite_manifests</code>.', 'Write with <code>write.distribution-mode=hash</code> and a target file size.'] : ['<code>OPTIMIZE ' + d.table + ' ZORDER BY (' + d.agg + ')</code> or liquid clustering.', 'Enable <code>optimizeWrite</code> + <code>autoCompact</code> on streaming tables.', '<code>VACUUM</code> to remove old files; purge deletion vectors via <code>REORG … APPLY (PURGE)</code>.']
      },
      skew: {
        title: `<code>${d.l2}=${d.keys[0]}</code> holds ~70% of rows — and the next stage groups by ${d.l2}`,
        what: ['Stage 1 is fine: splits are sized by bytes, not by key.', `Stage 2 hashes every row of a ${d.l2} to <b>one</b> task — the ${d.keys[0]} task gets 8× the data.`, 'AQE cannot split window/aggregate skew — only sort-merge join partitions.'],
        watch: ['One core pegged while the rest of the cluster idles (CPU bars).', 'Spill on the hot task (execution memory per task is ~pool ÷ cores).', S.salted ? 'Salted: the hot key is spread over 8 tasks, then merged in a tiny Stage 3.' : 'Toggle salting and re-run to compare.'],
        fix: ['Salt: add <code>salt = rand()*8</code>, compute partial results per (key, salt), then merge per key.', 'Partition the table by a higher-cardinality column, or Z-ORDER / cluster by it.', 'Filter or isolate default/NULL keys before the shuffle.']
      },
      memory: {
        title: `Inside each executor: ${S.mem} GB heap, ${S.cores} cores — where the memory actually goes`,
        what: [`Reserved 300 MB; the rest splits into <b>user memory</b> (40%) and the <b>unified pool</b> (60%, <code>spark.memory.fraction</code>).`, 'The unified pool is shared: <b>storage</b> (cached blocks) and <b>execution</b> (sorts, joins, aggregations).', 'Execution can evict cached blocks down to <code>spark.memory.storageFraction</code> (50%); storage can never evict execution.', `Each running task gets ≈ pool ÷ cores; anything beyond spills to local disk.`],
        watch: ['Striped bars = cached dimension blocks; solid = task execution memory.', 'Spill badges on cores when a join task needs more than its share.', 'Try 4 cores vs 2 cores, or 4 GB vs 16 GB, with and without cache().'],
        fix: ['Fewer cores per executor = more memory per task.', 'Only cache what you reuse; <code>unpersist()</code> when done.', 'More shuffle partitions = smaller tasks; add <code>memoryOverhead</code> for PySpark/Arrow.']
      },
      failure: {
        title: 'What the driver does when an executor dies — or just runs slow',
        what: ['Running tasks on a lost executor are re-queued (attempt 2).', 'If the next stage needs that executor\'s shuffle files → <b>FetchFailed</b>, and the driver re-runs the lost map tasks first.', 'With <code>spark.speculation</code>, a slow task gets a duplicate copy on another node; the first to finish wins.'],
        watch: ['Kill a worker mid-stage and watch tasks move.', 'Enable the degraded disk on Worker 3 and compare with/without speculation.', 'Lost cached blocks must be recomputed too.'],
        fix: ['External shuffle service / decommissioning keeps shuffle files alive.', '<code>spark.speculation=true</code>, <code>speculation.multiplier=1.5</code>, <code>quantile=0.75</code>.', 'Spot-instance fleets: keep shuffle data small and stages short.']
      }
    }[S.tab];
    $('mxIntro').innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="${TABS.find(t => t.id === S.tab).icon}" style="width:18px;height:18px;color:var(--mx-primary)"></i><span>${C.title}</span></h4></div>
      <div class="mx-intro-grid">
        <div class="mx-intro-col"><h4><i data-lucide="crown" style="width:14px;height:14px;"></i>What the driver (master) does</h4><ul>${C.what.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="mx-intro-col"><h4><i data-lucide="eye" style="width:14px;height:14px;"></i>What to watch</h4><ul>${C.watch.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="mx-intro-col"><h4><i data-lucide="wrench" style="width:14px;height:14px;"></i>How to fix it</h4><ul>${C.fix.map(x => `<li>${x}</li>`).join('')}</ul></div>
      </div>${S.tab === 'parquet' ? parquetTable() : ''}`;
  }
  function parquetTable() {
    return `<div class="mx-table-wrap"><table class="mx-table mx-table-l"><caption class="mx-cap">How a single Parquet file is distributed</caption><thead><tr><th>Component</th><th>Distributed across workers?</th><th>What happens</th></tr></thead><tbody>
      <tr><td><b>Row groups</b></td><td><span class="mx-yn yes"><i data-lucide="check" style="width:13px;height:13px;"></i>Yes</span></td><td>The file is cut horizontally into row groups (usually 100–128 MB of rows). Worker A gets row group 1, worker B gets row group 2 — in parallel.</td></tr>
      <tr><td><b>Individual rows</b></td><td><span class="mx-yn yes"><i data-lucide="check" style="width:13px;height:13px;"></i>Yes</span></td><td>Rows travel with their row group and are processed by whichever worker received that split.</td></tr>
      <tr><td><b>Columns (selected)</b></td><td><span class="mx-yn no"><i data-lucide="minus" style="width:13px;height:13px;"></i>No — but optimized</span></td><td>Columns are never split across workers. Parquet is columnar, so <b>column projection</b> makes each worker read only the needed column chunks: 2 of 50 columns ⇒ a fraction of the I/O.</td></tr>
      <tr><td><b>Tiny files</b></td><td><span class="mx-yn no"><i data-lucide="x" style="width:13px;height:13px;"></i>No</span></td><td>A file of a few KB/MB fits inside one block/split, so the whole file goes to a single worker — there isn't enough data to split efficiently.</td></tr>
    </tbody></table></div>`;
  }

  function seg(key, opts, label) {
    return `<div class="mx-field"><span>${label}</span><div class="mx-seg" role="group" aria-label="${label}">${opts.map(([v, l]) => `<button type="button" data-k="${key}" data-v="${v}" aria-pressed="${String(S[key]) === String(v)}">${l}</button>`).join('')}</div></div>`;
  }
  function sw(key, label) { return `<label class="mx-switch"><input type="checkbox" data-sw="${key}" ${S[key] ? 'checked' : ''}><span class="mx-track"></span>${label}</label>`; }
  function toolbar() {
    let extra = '';
    if (S.tab === 'fragment') extra = `<button type="button" class="mx-btn tonal" id="mxCompact" ${S.compacted ? 'disabled' : ''}><i data-lucide="combine" style="width:16px;height:16px;"></i>${S.format === 'iceberg' ? 'rewrite_data_files' : 'OPTIMIZE'}</button>${S.compacted ? '<button type="button" class="mx-btn outlined" id="mxFragment"><i data-lucide="undo-2" style="width:16px;height:16px;"></i>Back to fragmented</button>' : ''}`;
    if (S.tab === 'parquet') extra = seg('pqFile', [[4, '4 MB (tiny)'], [512, '512 MB'], [1024, '1 GB'], [2048, '2 GB']], 'Parquet file size') + seg('pqRG', [[64, '64 MB'], [128, '128 MB'], [256, '256 MB']], 'Row group size') + seg('pqSplit', [[64, '64 MB'], [128, '128 MB'], [256, '256 MB']], S.format === 'iceberg' ? 'read.split.target-size' : 'maxPartitionBytes') + seg('pqCols', [[2, '2'], [6, '6'], [12, 'all 12']], 'Columns selected') + sw('pqFilter', `WHERE ${D().measure} > 1000`);
    if (S.tab === 'skew') extra = sw('salted', 'Salt the key (×8)');
    if (S.tab === 'memory') extra = sw('cache', `cache() ${D().dim}`);
    if (S.tab === 'failure') extra = sw('speculation', 'spark.speculation') + sw('degraded', 'Degraded disk on Worker 3') + '<button type="button" class="mx-btn danger" id="mxKill"><i data-lucide="zap-off" style="width:16px;height:16px;"></i>Kill a worker</button>';
    $('mxToolbar').innerHTML = `
      <div class="mx-field"><span>Business domain</span><select class="mx-select" id="mxDomain">${Object.entries(DOMAINS).map(([k, v]) => `<option value="${k}" ${k === S.domain ? 'selected' : ''}>${v.label} — ${v.l1} › ${v.l2}</option>`).join('')}</select></div>
      ${seg('format', [['delta', 'Delta Lake'], ['iceberg', 'Apache Iceberg']], 'Table format')}
      <div class="mx-field"><span>Worker nodes (N)</span><div class="mx-slider"><input type="range" min="1" max="8" value="${S.workers}" id="mxWorkersIn" aria-label="Number of workers"><output id="mxWorkersOut">${S.workers}</output></div></div>
      ${seg('cores', [[2, '2'], [4, '4']], 'Cores / executor')}
      ${seg('mem', [[4, '4 GB'], [8, '8 GB'], [16, '16 GB']], 'Executor heap')}
      <div class="mx-field"><span>Animation speed</span><div class="mx-slider"><input type="range" min="0" max="${SPEEDS.length - 1}" step="1" value="${Math.max(0, SPEEDS.indexOf(S.speed))}" id="mxSpeedIn" aria-label="Animation speed" aria-valuetext="${S.speed}×"><output id="mxSpeedOut" style="min-width:42px">${S.speed}×</output></div></div>
      ${extra ? `<div class="mx-field" style="flex-direction:row;flex-wrap:wrap;gap:12px;align-items:center;">${extra}</div>` : ''}
      <div class="mx-actions">
        <button type="button" class="mx-btn filled" id="mxRun"><i data-lucide="play" style="width:16px;height:16px;"></i>Run job</button>
        <button type="button" class="mx-btn outlined" id="mxReset"><i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>Reset</button>
      </div>`;
  }

  // ---------------- storage ----------------
  function collectFileEls() {
    fileEls = {};
    $('mxStorage').querySelectorAll('[data-f]').forEach(el => { (fileEls[el.dataset.f] = fileEls[el.dataset.f] || []).push(el); });
  }
  function parquetStorage() {
    const d = D(), pm = ExecStudioEngine.parquetModel(S), mbTxt = fmtMB;
    const path = (S.format === 'iceberg' ? `s3://lake/warehouse/db.db/${d.table}/data/${d.l1.replace('_date', '_ts')}_day=${DATES[4]}/` : `s3://lake/${d.table}/${d.l1}=${DATES[4]}/${d.l2}=${d.keys[0]}/`) + 'part-00000.parquet';
    const projPct = Math.round(pm.colFrac * 100), empty = pm.splits.filter(x => !x.rgs.length).length;
    const segs = pm.rgs.map(r => `<span class="mx-pq-seg${r.skipped ? ' skipped' : ''}" data-f="${r.id}" style="--c:${KC[r.split % 4]};flex:${r.size} 1 0" title="Row group ${r.i} · ${mbTxt(r.size)} · bytes ${Math.round(r.start)}–${Math.round(r.start + r.size)} MB · midpoint ${Math.round(r.mid)} MB → split ${r.split}${r.skipped ? ' · skipped by min/max' : ''}">${pm.nRG <= 16 ? 'RG' + r.i : ''}</span>`).join('');
    const marks = pm.splits.map(sp => `<span class="mx-pq-mark${sp.rgs.length ? '' : ' empty'}" style="left:${sp.start / pm.F * 100}%;width:${(sp.end - sp.start) / pm.F * 100}%" title="split ${sp.j}: bytes ${Math.round(sp.start)}–${Math.round(sp.end)} MB${sp.rgs.length ? '' : ' · no row-group midpoint inside → empty task'}"><b>S${sp.j}</b>${sp.rgs.length || pm.splits.length > 12 ? '' : ' empty'}</span>`).join('');
    const short = n => n.length > 9 ? n.slice(0, 8) + '…' : n;
    const head = `<div class="mx-pq-row hd"><span class="mx-pq-rl">row group → task</span>${pm.cols.map((c, i) => `<span class="mx-pq-ch${pm.sel.includes(i) ? ' on' : ''}" title="${c[0]} · ${c[1]}% of bytes">${short(c[0])}</span>`).join('')}</div>`;
    const rows = pm.rgs.map(r => `<div class="mx-pq-row${r.skipped ? ' skipped' : ''}" data-f="${r.id}" style="--c:${KC[r.split % 4]}"><span class="mx-pq-rl">RG${r.i} · ${mbTxt(r.size)} → <b>T1.${r.split}</b></span>${pm.cols.map((c, i) => `<span class="mx-pq-cell${pm.sel.includes(i) ? ' on' : ''}"></span>`).join('')}</div>`).join('');
    const tiny = pm.splits.length === 1 && pm.nRG === 1;
    $('mxStorage').innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="file-box" style="width:18px;height:18px;color:var(--k0)"></i>Inside one Parquet file</h4><span class="mx-card-sub" style="font-family:var(--font-mono);word-break:break-all">${path}</span></div>
      <div class="mx-chips" style="margin-bottom:10px;"><span class="mx-chip">${mbTxt(pm.F)} file</span><span class="mx-chip">${pm.nRG} row group(s) × ${mbTxt(pm.RG)}</span><span class="mx-chip">${pm.cols.length} columns · reading ${pm.sel.length} (${projPct}% of bytes)</span><span class="mx-chip">split = <b>${mbTxt(pm.maxSplit)}</b> → ${pm.splits.length} task(s)${empty ? ` · ${empty} empty` : ''}</span></div>
      <div class="mx-pq-lbl">Byte layout — splits (top) vs row groups (bar). Tick = row-group midpoint; the split it falls in owns the whole row group.</div>
      <div class="mx-pq-map"><div class="mx-pq-marks">${marks}</div><div class="mx-pq-bar">${segs}<span class="mx-pq-footer" title="Footer: schema, row-group offsets, column min/max stats">footer</span></div></div>
      ${tiny ? `<div class="mx-pq-note"><i data-lucide="info" style="width:15px;height:15px;flex-shrink:0;"></i><span><b>Tiny file:</b> ${mbTxt(pm.F)} fits in a single split, so the whole file is assigned to <b>one worker</b>; the other ${pm.cores - 1} core(s) have nothing to do.</span></div>` : ''}
      <div class="mx-pq-lbl" style="margin-top:12px;">Row groups × column chunks — filled = read by the task, grey = skipped by projection${S.pqFilter ? ', striped = row group skipped by min/max' : ''}</div>
      <div class="mx-store mx-pq-grid">${head}${rows}</div>
      <div class="mx-legend">${[0, 1, 2, 3].filter(k => k < pm.splits.length).map(k => `<span><i class="mx-dot" style="background:${KC[k]}"></i>split ${k}${pm.splits.length > 4 + k ? `, ${k + 4}…` : ''}</span>`).join('')}<span><i class="mx-dot" style="background:var(--mx-grid);border:1px solid var(--border-color)"></i>column not read</span></div>`;
    collectFileEls();
  }
  function storage() {
    if (S.tab === 'parquet') return parquetStorage();
    const d = D(), files = cfg.files;
    const data = files.filter(f => f.kind === 'data'), dels = files.filter(f => f.kind === 'del');
    const total = data.reduce((a, f) => a + f.size, 0);
    const path = S.format === 'iceberg' ? `s3://lake/warehouse/db.db/${d.table}/data/` : `s3://lake/${d.table}/`;
    let html = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="database" style="width:18px;height:18px;color:var(--k0)"></i>${S.format === 'iceberg' ? 'Iceberg' : 'Delta'} table storage</h4><span class="mx-card-sub" style="font-family:var(--font-mono)">${path}</span></div>
      <div class="mx-chips" style="margin-bottom:10px;"><span class="mx-chip"><i data-lucide="file" style="width:13px;height:13px;"></i>${data.length} data files</span><span class="mx-chip">${fmtMB(total)}</span>${dels.length ? `<span class="mx-chip"><span class="mx-dot" style="border:1.5px solid var(--st-crit);border-radius:50%;"></span>${dels.length} ${S.format === 'iceberg' ? 'position-delete files' : 'deletion vectors'}</span>` : ''}${d.keys.map((k, i) => `<span class="mx-chip"><span class="mx-dot" style="background:${KC[i]}"></span>${d.l2}=${k}</span>`).join('')}</div>
      <div class="mx-store" id="mxStore">`;
    DATES.forEach((dt, di) => {
      const pruned = di < KEEP_FROM;
      html += `<div class="mx-date${pruned ? ' pruned' : ''}"><div class="mx-date-hd"><span>${S.format === 'iceberg' ? `${d.l1.replace('_date', '_ts')}_day=${dt}` : `${d.l1}=${dt}`}/</span><span class="tag ${pruned ? '' : 'keep'}">${pruned ? 'pruned' : 'read'}</span></div><div class="mx-parts">`;
      d.keys.forEach((k, ki) => {
        const fs = files.filter(f => f.di === di && f.ki === ki);
        const mb = fs.filter(f => f.kind === 'data').reduce((a, f) => a + f.size, 0);
        html += `<div class="mx-part"><div class="mx-part-lbl" title="${d.l2}=${k} · ${fs.length} files · ${fmtMB(mb)}">${d.l2}=${k} · ${fmtMB(mb)}</div><div class="mx-files">${fs.map(f => {
          const px = f.kind === 'del' ? 7 : Math.max(5, Math.min(22, Math.sqrt(f.size / 128) * 18));
          return `<span class="mx-file${f.kind === 'del' ? ' del' : ''}${S._pop ? ' pop' : ''}" data-f="${f.id}" style="--c:${KC[ki]};width:${px}px;height:${px}px" title="${f.kind === 'del' ? 'delete file' : 'part-' + String(f.id).padStart(5, '0') + '.parquet · ' + f.size.toFixed(1) + ' MB'}"></span>`;
        }).join('')}</div></div>`;
      });
      html += '</div></div>';
    });
    $('mxStorage').innerHTML = html + '</div>';
    collectFileEls();
    S._pop = false;
  }

  // ---------------- driver ----------------
  function driver() {
    const steps = cfg.plan.map(p => p.label).concat(cfg.stages.map((s, i) => `${i > 0 ? 'Shuffle barrier → ' : 'TaskScheduler launches '}<b>${esc(s.name)}</b> (${s.tasks.length} tasks)`)).concat(['Job complete → results committed']);
    $('mxDriver').innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="crown" style="width:18px;height:18px;color:var(--mx-primary)"></i>Driver (master)</h4><span class="mx-card-sub">SparkSession · DAGScheduler · TaskScheduler</span></div>
      <ol class="mx-steps" id="mxSteps">${steps.map((s, i) => `<li class="mx-step" data-i="${i}"><span class="mx-step-ic">${i + 1}</span><span class="mx-step-txt">${s}</span><span class="mx-step-t"></span></li>`).join('')}</ol>
      <div class="mx-queue-hd"><span>Pending task queue</span><span id="mxQCount" style="font-family:var(--font-mono)">0</span></div>
      <div class="mx-queue" id="mxQueue" aria-label="Pending tasks"></div>`;
  }

  // ---------------- workers ----------------
  function workersUI() {
    let html = '';
    for (let w = 0; w < S.workers; w++) {
      html += `<div class="mx-worker" id="mxW${w}"><div class="mx-w-hd"><span class="mx-w-av"><i data-lucide="server" style="width:18px;height:18px;"></i></span><div><div class="mx-w-name">Worker ${w + 1}</div><div class="mx-w-sub">Exec ${w + 1} · ${S.cores} cores · ${S.mem} GB</div></div><span class="mx-w-status" id="mxWs${w}">idle</span></div>`;
      for (let c = 0; c < S.cores; c++) html += `<div class="mx-slot"><span class="mx-slot-lbl">core ${c + 1}</span><div class="mx-slot-box" id="mxS${w}_${c}"><div class="mx-slot-fill"></div><div class="mx-slot-txt"><span class="tn">idle</span><span class="tm"></span></div></div></div>`;
      html += `<div class="mx-meter"><div class="mx-meter-hd"><span>CPU</span><b id="mxCpuV${w}">0%</b></div><div class="mx-bar" aria-hidden="true"><i class="cpu" id="mxCpu${w}" style="width:0"></i></div></div>
        <div class="mx-meter"><div class="mx-meter-hd"><span>Heap</span><b id="mxMemV${w}">—</b></div><div class="mx-bar" aria-hidden="true"><i class="res" id="mxMr${w}"></i><i class="usr" id="mxMu${w}"></i><i class="sto" id="mxMs${w}"></i><i class="exe" id="mxMe${w}"></i></div></div>
        <div class="mx-w-ft"><span id="mxWd${w}">0 tasks done</span><span id="mxWsp${w}"></span></div></div>`;
    }
    $('mxWorkers').innerHTML = html;
    slotEls = [];
    for (let w = 0; w < S.workers; w++) { slotEls[w] = []; for (let c = 0; c < S.cores; c++) { const el = $(`mxS${w}_${c}`); slotEls[w][c] = { box: el, fill: el.querySelector('.mx-slot-fill'), name: el.querySelector('.tn'), tm: el.querySelector('.tm') }; } }
  }

  // ---------------- load + metrics ----------------
  function loadUI() {
    $('mxLoad').innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="activity" style="width:18px;height:18px;color:var(--cpu)"></i>Live load per worker</h4><span class="mx-card-sub">CPU = busy cores ÷ cores · Memory = used heap ÷ heap</span></div>
      <div class="mx-chart" id="mxBars"></div>
      <div class="mx-legend"><span><i class="mx-dot" style="background:var(--cpu)"></i>CPU %</span><span><i class="mx-dot" style="background:var(--mem)"></i>Memory %</span></div>
      <div class="mx-chart" id="mxTimeline" style="margin-top:12px;"></div>`;
    $('mxMetrics').innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="gauge" style="width:18px;height:18px;color:var(--mx-primary)"></i>Job metrics</h4><span class="mx-card-sub" id="mxRunLbl"></span></div>
      <div class="mx-kpis" id="mxKpis"></div>
      <div class="mx-table-wrap"><table class="mx-table"><thead><tr><th>Run</th><th>Files / RGs</th><th>Tasks</th><th>Planning</th><th>Runtime</th><th>Spill</th><th>Avg CPU</th></tr></thead><tbody id="mxHist"><tr><td colspan="7" style="text-align:left;color:var(--text-muted);font-family:var(--mx-font)">Completed runs appear here — compare before/after fixes.</td></tr></tbody></table></div>`;
    renderHistory();
  }
  function renderBars() {
    const el = $('mxBars'); if (!el) return;
    const Wd = Math.max(260, el.clientWidth || 400), H = 150, pl = 34, pb = 20, pt = 14, iw = Wd - pl - 6, ih = H - pt - pb;
    const n = S.workers, gw = iw / n, bw = Math.min(26, (gw - 10) / 2);
    let s = `<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="CPU and memory percent per worker">`;
    [0, 50, 100].forEach(p => { const y = pt + ih - p / 100 * ih; s += `<line x1="${pl}" x2="${Wd - 6}" y1="${y}" y2="${y}" stroke="var(--mx-grid)"/><text x="${pl - 6}" y="${y + 3}" font-size="10" text-anchor="end" fill="var(--mx-axis)">${p}%</text>`; });
    for (let w = 0; w < n; w++) {
      const x0 = pl + w * gw + (gw - 2 * bw - 2) / 2;
      s += `<path id="mxBc${w}" fill="var(--cpu)"/><path id="mxBm${w}" fill="var(--mem)"/><text id="mxBtc${w}" font-size="9" text-anchor="middle" fill="var(--text-main)"></text><text id="mxBtm${w}" font-size="9" text-anchor="middle" fill="var(--text-main)"></text>`;
      s += `<text x="${x0 + bw + 1}" y="${H - 5}" font-size="10" text-anchor="middle" fill="var(--mx-axis)">W${w + 1}</text>`;
    }
    el.innerHTML = s + '</svg>';
    el._geo = { pl, pt, ih, gw, bw };
  }
  function barPath(x, y0, w, h) { const r = Math.min(4, w / 2, h); if (h <= 0.5) return `M${x},${y0} h${w} v-0.5 h${-w}Z`; return `M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + w - r} Q${x + w},${y0 - h} ${x + w},${y0 - h + r} V${y0} Z`; }
  function updateBars() {
    const el = $('mxBars'); if (!el || !el._geo) return;
    const { pl, pt, ih, gw, bw } = el._geo, y0 = pt + ih;
    E.workers.forEach((w, i) => {
      const cpu = w.lost ? 0 : w.slots.filter(Boolean).length / S.cores;
      const mem = w.lost ? 0 : (E.mem.reserved + E.mem.userUsed + w.storage + E.execUsed(w)) / E.mem.heap;
      const x0 = pl + i * gw + (gw - 2 * bw - 2) / 2;
      const c = el.querySelector('#mxBc' + i), m = el.querySelector('#mxBm' + i);
      if (!c) return;
      c.setAttribute('d', barPath(x0, y0, bw, cpu * ih)); m.setAttribute('d', barPath(x0 + bw + 2, y0, bw, mem * ih));
      const tc = el.querySelector('#mxBtc' + i), tm = el.querySelector('#mxBtm' + i);
      tc.setAttribute('x', x0 + bw / 2); tc.setAttribute('y', y0 - cpu * ih - 3); tc.textContent = Math.round(cpu * 100);
      tm.setAttribute('x', x0 + bw * 1.5 + 2); tm.setAttribute('y', y0 - mem * ih - 3); tm.textContent = Math.round(mem * 100);
    });
  }
  function renderTimeline() {
    const el = $('mxTimeline'); if (!el) return;
    const Wd = Math.max(260, el.clientWidth || 400), H = 120, pl = 34, pb = 18, pt = 8, iw = Wd - pl - 6, ih = H - pt - pb;
    const h = E.history, tmax = Math.max(5, E.doneAt || E.t, cfg._est || 0);
    const x = t => pl + t / tmax * iw, y = v => pt + ih - v * ih;
    let s = `<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Cluster CPU and memory over time">`;
    [0, 0.5, 1].forEach(p => { s += `<line x1="${pl}" x2="${Wd - 6}" y1="${y(p)}" y2="${y(p)}" stroke="var(--mx-grid)"/><text x="${pl - 6}" y="${y(p) + 3}" font-size="10" text-anchor="end" fill="var(--mx-axis)">${p * 100}%</text>`; });
    for (let i = 0; i <= 4; i++) { const t = tmax * i / 4; s += `<text x="${x(t)}" y="${H - 4}" font-size="10" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}" fill="var(--mx-axis)">${t.toFixed(1)}s</text>`; }
    E.stages.forEach(st => { if (st.start != null) s += `<line x1="${x(st.start)}" x2="${x(st.start)}" y1="${pt}" y2="${pt + ih}" stroke="var(--mx-axis)" stroke-dasharray="2 3" opacity="0.6"/>`; });
    if (h.length > 1) {
      let a = `M${x(h[0].t)},${y(0)}`; h.forEach(p => { a += ` L${x(p.t).toFixed(1)},${y(p.cpu).toFixed(1)}`; }); a += ` L${x(h[h.length - 1].t)},${y(0)} Z`;
      let l = ''; h.forEach((p, i) => { l += (i ? ' L' : 'M') + x(p.t).toFixed(1) + ',' + y(p.mem).toFixed(1); });
      let lc = ''; h.forEach((p, i) => { lc += (i ? ' L' : 'M') + x(p.t).toFixed(1) + ',' + y(p.cpu).toFixed(1); });
      s += `<path d="${a}" fill="var(--cpu)" opacity="0.18"/><path d="${lc}" fill="none" stroke="var(--cpu)" stroke-width="2"/><path d="${l}" fill="none" stroke="var(--mem)" stroke-width="2"/>`;
    }
    el.innerHTML = s + '</svg>';
  }
  function kpis() {
    const kept = cfg.files.filter(f => f.kind === 'data' && !f.pruned).length;
    const filesRead = cfg.files.filter(f => f.kind === 'data' && !f.pruned && fileEls[f.id] && fileEls[f.id][0].classList.contains('done')).length;
    const items = [
      ['Elapsed', fmtS(E.doneAt || E.t)],
      ['Tasks', `${E.doneTasks()} / ${E.totalTasks()}`],
      [S.tab === 'parquet' ? 'Row groups read' : 'Files read', S.tab === 'memory' ? '—' : `${filesRead} / ${kept}`],
      ['Planning', E.planSec ? fmtS(E.planSec) : '…'],
      ['Spill', fmtMB(E.totalSpill)],
      ['Avg CPU', Math.round(E.utilization() * 100) + '%'],
      ['Retries / spec.', `${E.failed} / ${E.spec}`]
    ];
    $('mxKpis').innerHTML = items.map(([l, v]) => `<div class="mx-kpi"><div class="mx-kpi-l">${l}</div><div class="mx-kpi-v">${v}</div></div>`).join('');
  }
  function renderHistory() {
    const tb = $('mxHist'); if (!tb || !history.length) return;
    tb.innerHTML = history.slice(-8).map(r => `<tr><td>${esc(r.label)}</td><td>${r.files}</td><td>${r.tasks}</td><td>${fmtS(r.plan)}</td><td>${fmtS(r.time)}</td><td>${fmtMB(r.spill)}</td><td>${Math.round(r.util * 100)}%</td></tr>`).join('');
  }

  // ---------------- scaling chart ----------------
  function scaleUI() {
    const el = $('mxScale');
    el.innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="bar-chart-3" style="width:18px;height:18px;color:var(--cpu)"></i>Same job on 1 → 8 workers</h4><span class="mx-card-sub">Simulated runtime · dashed = perfect linear scaling</span></div><div class="mx-chart" id="mxScaleChart"></div>
      <div class="mx-legend"><span><i class="mx-dot" style="background:var(--cpu)"></i>Runtime (current settings)</span><span><svg width="18" height="8"><line x1="0" x2="18" y1="4" y2="4" stroke="var(--text-muted)" stroke-dasharray="4 3" stroke-width="2"/></svg>Ideal = T(1) ÷ N</span><span>Highlighted bar = your N</span></div>`;
    const Ns = [1, 2, 3, 4, 5, 6, 8];
    const res = Ns.map(n => simulate(Object.assign({}, S, { workers: n })));
    const c = $('mxScaleChart'), Wd = Math.max(260, c.clientWidth || 400), H = 190, pl = 40, pb = 22, pt = 16, iw = Wd - pl - 8, ih = H - pt - pb;
    const tmax = Math.max(...res.map(r => r.time)) * 1.1, bw = iw / Ns.length;
    const y = v => pt + ih - v / tmax * ih;
    let s = `<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Runtime by number of workers">`;
    for (let i = 0; i <= 3; i++) { const v = tmax * i / 3; s += `<line x1="${pl}" x2="${Wd - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--mx-grid)"/><text x="${pl - 6}" y="${y(v) + 3}" font-size="10" text-anchor="end" fill="var(--mx-axis)">${v.toFixed(0)}s</text>`; }
    let ideal = '';
    res.forEach((r, i) => {
      const x = pl + i * bw + bw * 0.2, w = bw * 0.6, cur = Ns[i] === S.workers;
      s += `<path d="${barPath(x, y(0), w, y(0) - y(r.time))}" fill="var(--cpu)" opacity="${cur ? 1 : 0.55}" ${cur ? 'stroke="var(--text-main)" stroke-width="1.5"' : ''}><title>${Ns[i]} worker(s): ${fmtS(r.time)} · avg CPU ${Math.round(r.util * 100)}%</title></path>`;
      s += `<text x="${x + w / 2}" y="${y(r.time) - 4}" font-size="10" text-anchor="middle" fill="var(--text-main)">${r.time.toFixed(1)}</text>`;
      s += `<text x="${x + w / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--mx-axis)">${Ns[i]}W</text>`;
      ideal += (i ? ' L' : 'M') + (x + w / 2).toFixed(1) + ',' + y(res[0].time / Ns[i]).toFixed(1);
    });
    s += `<path d="${ideal}" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="4 3"/>`;
    c.innerHTML = s + '</svg>';
    const idx = Ns.indexOf(S.workers);
    cfg._est = idx >= 0 ? res[idx].time : simulate(S).time;
  }

  // ---------------- code ----------------
  let codeTab = null;
  function codeUI() {
    const d = D(), ice = S.format === 'iceberg';
    const tbl = ice ? `lake.db.${d.table}` : d.table;
    const read = ice ? `df = spark.table("${tbl}")` : `df = spark.read.format("delta").load("s3://lake/${d.table}")`;
    const pqp = S.format === 'iceberg' ? `s3://lake/warehouse/db.db/${d.table}/data/…/part-00000.parquet` : `s3://lake/${d.table}/${d.l1}=${DATES[4]}/${d.l2}=${d.keys[0]}/part-00000.parquet`;
    const C = {
      parquet: {
        PySpark: `spark.conf.set("spark.sql.files.maxPartitionBytes", "${S.pqSplit}m")   # split size cap\nspark.conf.set("spark.sql.files.openCostInBytes", "4m")\n\ndf = spark.read.parquet("${pqp}")\nout = (df.select("${d.agg}", "${d.measure}")            # column projection\n        .filter(F.col("${d.measure}") > 1000))           # row-group skipping via min/max\nout.explain()\n# FileScan parquet [${d.agg},${d.measure}] PushedFilters: [GreaterThan(${d.measure},1000)]\n\ndf.rdd.getNumPartitions()   # = number of splits (tasks)\n\n# write side: make row groups match the split size\n(df.write.option("parquet.block.size", ${S.pqRG} * 1024 * 1024)\n   .mode("overwrite").parquet(out_path))`,
        'Delta Lake': `-- file sizes the driver will split\nDESCRIBE DETAIL ${d.table};                       -- numFiles, sizeInBytes\nALTER TABLE ${d.table} SET TBLPROPERTIES ('delta.targetFileSize' = '256mb');\n-- tighter min/max per file & row group => more skipping\nOPTIMIZE ${d.table} ZORDER BY (${d.measure});`,
        'Apache Iceberg': `-- Iceberg plans splits itself and aligns them to row groups\nALTER TABLE ${tbl} SET TBLPROPERTIES (\n  'read.split.target-size'             = '${S.pqSplit * 1048576}',\n  'write.parquet.row-group-size-bytes' = '${S.pqRG * 1048576}',\n  'write.target-file-size-bytes'       = '536870912');\n-- row-group start offsets used for split planning\nSELECT file_path, file_size_in_bytes, record_count, split_offsets\nFROM ${tbl}.files;`
      },
      assign: {
        PySpark: `${read}\nout = (df.filter(F.col("${d.l1}") >= "${DATES[KEEP_FROM]}")      # partition pruning\n        .groupBy("${d.l2}", "${d.agg}")\n        .agg(F.sum("${d.measure}").alias("total")))\nout.write.mode("overwrite").saveAsTable("gold.${d.table}_daily")\n\n# what decides the task count of Stage 1\nspark.conf.get("spark.sql.files.maxPartitionBytes")   # 128m\nspark.conf.get("spark.sql.files.openCostInBytes")     # 4m\nspark.sparkContext.defaultParallelism                 # total executor cores`,
        'Delta Lake': `-- partitioned by date + region\nCREATE TABLE ${d.table} (...) USING DELTA PARTITIONED BY (${d.l1}, ${d.l2});\nDESCRIBE DETAIL ${d.table};          -- numFiles, sizeInBytes\nDESCRIBE HISTORY ${d.table};         -- commits the driver replays`,
        'Apache Iceberg': `CREATE TABLE ${tbl} (...) USING iceberg\n  PARTITIONED BY (days(${d.l1.replace('_date', '_ts')}), ${d.l2});\nSELECT * FROM ${tbl}.files;          -- per-file stats the driver reads\nSELECT * FROM ${tbl}.manifests;`
      },
      fragment: {
        PySpark: `# streaming micro-batches every minute -> tiny files\n(stream.writeStream.format("${ice ? 'iceberg' : 'delta'}")\n   .trigger(processingTime="1 minute")\n   .option("checkpointLocation", ckpt)${ice ? '\n   .toTable("' + tbl + '"))' : '\n   .start("s3://lake/' + d.table + '"))'}\n\n# fewer, bigger micro-batches\n.trigger(processingTime="10 minutes")\n# and see the damage\nspark.sql("${ice ? 'SELECT count(*), avg(file_size_in_bytes) FROM ' + tbl + '.files' : 'DESCRIBE DETAIL ' + d.table}").show()`,
        'Delta Lake': `-- compact + co-locate by a common filter column\nOPTIMIZE ${d.table} WHERE ${d.l1} >= '${DATES[KEEP_FROM]}' ZORDER BY (${d.agg});\n-- or liquid clustering (no partition explosion)\nALTER TABLE ${d.table} CLUSTER BY (${d.l1}, ${d.l2});\n-- prevent it at write time\nALTER TABLE ${d.table} SET TBLPROPERTIES (\n  'delta.autoOptimize.optimizeWrite' = 'true',\n  'delta.autoOptimize.autoCompact'   = 'true');\n-- materialize deletion vectors, then clean up\nREORG TABLE ${d.table} APPLY (PURGE);\nVACUUM ${d.table} RETAIN 168 HOURS;`,
        'Apache Iceberg': `CALL lake.system.rewrite_data_files(\n  table => 'db.${d.table}',\n  strategy => 'binpack',\n  where => '${d.l1.replace('_date', '_ts')} >= TIMESTAMP \\'${DATES[KEEP_FROM]}\\'',\n  options => map('target-file-size-bytes','536870912',\n                 'min-input-files','5'));\nCALL lake.system.rewrite_position_delete_files('db.${d.table}');\nCALL lake.system.rewrite_manifests('db.${d.table}');\nCALL lake.system.expire_snapshots('db.${d.table}', TIMESTAMP '${DATES[0]} 00:00:00');\n-- write side\nALTER TABLE ${tbl} SET TBLPROPERTIES (\n  'write.distribution-mode'='hash',\n  'write.target-file-size-bytes'='536870912');`
      },
      skew: {
        PySpark: `from pyspark.sql import Window\n${read}\n\n# BEFORE: every ${d.keys[0]} row lands in ONE task\nw = Window.partitionBy("${d.l2}").orderBy(F.desc("${d.measure}"))\ntop = df.withColumn("rk", F.row_number().over(w)).filter("rk <= 100")\n\n# AFTER: salt -> local top-N per (key, salt) -> merge per key\nN = 8\nsalted = df.withColumn("salt", (F.rand() * N).cast("int"))\nw1 = Window.partitionBy("${d.l2}", "salt").orderBy(F.desc("${d.measure}"))\nlocal = salted.withColumn("rk", F.row_number().over(w1)).filter("rk <= 100")\nw2 = Window.partitionBy("${d.l2}").orderBy(F.desc("${d.measure}"))\ntop = local.withColumn("rk", F.row_number().over(w2)).filter("rk <= 100")`,
        'Delta Lake': `-- spread hot partitions physically: cluster by a high-cardinality column\nALTER TABLE ${d.table} CLUSTER BY (${d.l1}, ${d.agg});\nOPTIMIZE ${d.table};\n-- AQE handles JOIN skew, not window/aggregate skew\nSET spark.sql.adaptive.skewJoin.enabled = true;`,
        'Apache Iceberg': `-- bucket the hot dimension so writes and reads spread out\nALTER TABLE ${tbl} ADD PARTITION FIELD bucket(16, ${d.agg});\n-- sort within files for better skipping\nALTER TABLE ${tbl} WRITE ORDERED BY ${d.l2}, ${d.agg};\nCALL lake.system.rewrite_data_files(table => 'db.${d.table}', strategy => 'sort');`
      },
      memory: {
        PySpark: `spark = (SparkSession.builder\n  .config("spark.executor.memory", "${S.mem}g")\n  .config("spark.executor.cores", "${S.cores}")\n  .config("spark.memory.fraction", "0.6")          # unified pool\n  .config("spark.memory.storageFraction", "0.5")   # cache floor\n  .config("spark.executor.memoryOverhead", "${Math.max(384, S.mem * 102)}m")\n  .getOrCreate())\n\ndim = spark.table("${d.dim}")${S.cache ? '.cache()   # occupies storage memory' : ''}\nfact = spark.table("${d.fact}")\nout = fact.join(dim, "${d.agg}")      # sort-merge join -> execution memory\n# per-task execution memory ≈ (heap - 300MB) * 0.6 / cores`,
        'Delta Lake': `-- smaller join partitions = less memory per task\nSET spark.sql.shuffle.partitions = 400;\nSET spark.sql.adaptive.advisoryPartitionSizeInBytes = 64m;\n-- cache only hot, reused tables\nCACHE TABLE ${d.dim};\nUNCACHE TABLE ${d.dim};`,
        'Apache Iceberg': `-- same Spark memory rules apply to Iceberg reads\nSET spark.sql.shuffle.partitions = 400;\n-- vectorized Parquet reads keep batches off-heap-friendly\nALTER TABLE ${tbl} SET TBLPROPERTIES ('read.parquet.vectorization.enabled'='true');`
      },
      failure: {
        PySpark: `spark = (SparkSession.builder\n  .config("spark.speculation", "true")\n  .config("spark.speculation.multiplier", "1.5")   # 1.5x median\n  .config("spark.speculation.quantile", "0.75")    # after 75% done\n  .config("spark.task.maxFailures", "4")\n  .config("spark.shuffle.service.enabled", "true")  # shuffle files survive executor loss\n  .config("spark.decommission.enabled", "true")\n  .config("spark.storage.decommission.shuffleBlocks.enabled", "true")\n  .getOrCreate())`,
        'Delta Lake': `-- writes are atomic: a failed/retried task never leaves partial commits\n-- speculative duplicates write temp files; only the winner's files are committed\nDESCRIBE HISTORY ${d.table};`,
        'Apache Iceberg': `-- optimistic concurrency: a commit is a metadata.json swap\n-- orphaned files from failed attempts are cleaned up by:\nCALL lake.system.remove_orphan_files(table => 'db.${d.table}');`
      }
    }[S.tab];
    const keys = Object.keys(C);
    if (!codeTab || !keys.includes(codeTab)) codeTab = ice ? 'Apache Iceberg' : 'Delta Lake';
    if (S._fmtChanged) { codeTab = ice ? 'Apache Iceberg' : 'Delta Lake'; S._fmtChanged = false; }
    const hl = t => esc(t).split('\n').map(l => { const i = l.search(/(#|--)/); return i >= 0 ? l.slice(0, i) + `<span class="cm">${l.slice(i)}</span>` : l; }).join('\n');
    $('mxCode').innerHTML = `<div class="mx-card-hd"><h4 class="mx-card-title"><i data-lucide="code-2" style="width:18px;height:18px;color:var(--mx-primary)"></i>Code &amp; fixes</h4></div>
      <div class="mx-code-tabs" role="tablist">${keys.map(k => `<button type="button" role="tab" aria-selected="${k === codeTab}" data-ct="${k}">${k}</button>`).join('')}</div>
      <pre class="mx-pre">${hl(C[codeTab])}</pre>`;
    $('mxCode').querySelectorAll('[data-ct]').forEach(b => b.addEventListener('click', () => { codeTab = b.dataset.ct; codeUI(); }));
  }

  // ---------------- snackbar ----------------
  let snackN = 0;
  function snack(msg, icon) {
    const box = $('mxSnack'); if (!box) return;
    if (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div'); el.className = 'mx-snack-item';
    el.innerHTML = `<i data-lucide="${icon || 'info'}" style="width:16px;height:16px;flex-shrink:0;"></i><span>${msg}</span>`;
    box.appendChild(el); if (window.lucide) window.lucide.createIcons({ nodes: [el] });
    const id = ++snackN;
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600 + (id % 2) * 100);
  }

  // ---------------- animation of assignment ----------------
  function fly(a) {
    const dur = Math.min(14, 1.4 / S.speed); // seconds a task chip takes from the queue to its core
    if (reduceMotion || dur < 0.12 || document.hidden) return;
    const q = $('mxQueue'), slot = slotEls[a.w] && slotEls[a.w][a.slot];
    if (!q || !slot) return;
    const r1 = q.getBoundingClientRect(), r2 = slot.box.getBoundingClientRect();
    if (r2.bottom < 0 || r1.top > window.innerHeight + 400) return;
    const el = document.createElement('div'); el.className = 'mx-fly';
    el.style.setProperty('--c', KC[a.task.key]); el.textContent = a.task.name;
    el.style.left = (r1.left + 8) + 'px'; el.style.top = (r1.top + 6) + 'px';
    el.style.setProperty('--d', dur + 's');
    document.body.appendChild(el);
    flying.add(a);
    requestAnimationFrame(() => { el.style.transform = `translate(${r2.left - r1.left}px, ${r2.top - r1.top}px)`; });
    setTimeout(() => { flying.delete(a); el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, dur * 1000);
  }

  // ---------------- per-frame update ----------------
  function processEvents() {
    const d = D();
    for (const ev of E.events) {
      if (ev.type === 'assign') {
        fly(ev.a);
        ev.a.task.files.forEach(f => (fileEls[f] || []).forEach(el => { el.classList.remove('done'); el.classList.add('reading'); }));
        if (ev.a.spec) snack(`Speculative copy of <b>${ev.a.task.name}</b> launched on Worker ${ev.a.w + 1}`, 'copy');
      } else if (ev.type === 'finish') {
        ev.a.task.files.forEach(f => (fileEls[f] || []).forEach(el => { el.classList.remove('reading'); el.classList.add('done'); }));
        if (ev.a.spec) snack(`Speculative copy on Worker ${ev.a.w + 1} won — original attempt killed`, 'trophy');
      } else if (ev.type === 'evict') snack(`Worker ${ev.w + 1} evicted ${fmtMB(ev.mb)} of cached ${d.dim} blocks for execution memory`, 'trash-2');
      else if (ev.type === 'fail') snack(`Task <b>${ev.a.task.name}</b> lost with Worker ${ev.w + 1} → re-queued (attempt ${ev.a.task.attempts + 1})`, 'alert-triangle');
      else if (ev.type === 'fetchFailed') snack(`FetchFailed: ${ev.n} map output(s) were on Worker ${ev.w + 1} → driver re-runs them first`, 'refresh-cw');
      else if (ev.type === 'done') {
        snack(`Job finished in <b>${fmtS(E.doneAt)}</b> on ${E.workers.filter(w => !w.lost).length} worker(s)`, 'check-circle-2');
        history.push({ label: runLabel, files: cfg.files.filter(f => f.kind === 'data' && !f.pruned).length, tasks: E.totalTasks(), plan: E.planSec, time: E.doneAt, spill: E.totalSpill, util: E.utilization() });
        renderHistory(); setRunning(false);
      }
    }
    E.events.length = 0;
  }
  function updateDriver() {
    const steps = $('mxSteps'); if (!steps) return;
    const nPlan = E.plan.length, items = steps.children;
    let active;
    if (E.phase === 'plan') active = E.planIdx;
    else if (E.phase === 'done') active = items.length;
    else active = nPlan + E.stageIdx + (E.phase === 'barrier' ? 1 : 0);
    if (E.phase === 'done') active = items.length - 1 + 1;
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      li.classList.toggle('done', i < active || (E.phase === 'done'));
      li.classList.toggle('active', i === active && E.phase !== 'done' && (running || E.t > 0));
      const t = li.querySelector('.mx-step-t');
      if (i < nPlan && i < E.planIdx) t.textContent = E.plan[i].dur.toFixed(2) + 's';
      else if (i >= nPlan && i < nPlan + E.stages.length) { const st = E.stages[i - nPlan]; t.textContent = st.end ? (st.end - st.start).toFixed(1) + 's' : st.start != null ? `${st.tasks.filter(x => x.done).length}/${st.tasks.length}` : ''; }
    }
    const q = E.queue;
    $('mxQCount').textContent = q.length;
    const show = q.slice(0, 28);
    $('mxQueue').innerHTML = show.map(t => `<span class="mx-qchip" style="--c:${KC[t.key]}">${t.name}${t.recompute ? ' ↻' : ''}</span>`).join('') + (q.length > show.length ? `<span class="mx-qmore">+${q.length - show.length}</span>` : '') || '';
  }
  function updateWorkers() {
    const mm = E.mem;
    E.workers.forEach((w, i) => {
      const card = $('mxW' + i); if (!card) return;
      const busy = w.slots.filter(Boolean).length;
      card.classList.toggle('busy', busy > 0 && !w.lost); card.classList.toggle('lost', w.lost);
      const st = $('mxWs' + i);
      st.textContent = w.lost ? 'lost' : w.slow > 1 ? 'slow disk' : busy ? 'running' : E.phase === 'done' ? 'done' : 'idle';
      st.className = 'mx-w-status' + (w.slow > 1 && !w.lost ? ' slow' : busy ? ' busy' : '');
      w.slots.forEach((a, c) => {
        const s = slotEls[i][c];
        if (!a) { s.box.className = 'mx-slot-box'; s.box.title = ''; s.box.style.removeProperty('--c'); s.fill.style.width = '0'; s.name.textContent = 'idle'; s.tm.textContent = ''; return; }
        if (flying.has(a)) {
          s.box.className = 'mx-slot-box on'; s.box.style.setProperty('--c', KC[a.task.key]); s.fill.style.width = '0';
          s.name.textContent = `${a.task.name} dispatching…`; s.tm.textContent = '';
          return;
        }
        const p = Math.min(1, (E.t - a.start) / a.dur);
        s.box.className = 'mx-slot-box on' + (a.spec ? ' spec' : '');
        s.box.style.setProperty('--c', KC[a.task.key]);
        s.fill.style.width = (p * 100).toFixed(1) + '%';
        const dd = DOMAINS[S.domain], lbl = a.task.label || dd.keys[a.task.key];
        s.name.textContent = `${a.task.name} ${lbl} ${fmtMB(a.task.sizeMB).replace(' ', '')}`;
        s.box.title = `${a.task.name}${a.spec ? ' (speculative copy)' : ''} · ${a.task.label || dd.l2 + '=' + dd.keys[a.task.key]} · ${fmtMB(a.task.sizeMB)}${a.task.nFiles ? ' · ' + a.task.nFiles + ' file(s)' : ''} · exec memory ${fmtMB(a.granted)}${a.spill ? ' · spill ' + fmtMB(a.spill) : ''}`;
        s.tm.innerHTML = a.spill > 0 ? `<span class="sp">spill ${fmtMB(a.spill)}</span>` : Math.max(0, a.dur - (E.t - a.start)).toFixed(1) + 's';
      });
      const cpu = w.lost ? 0 : busy / S.cores;
      $('mxCpu' + i).style.width = (cpu * 100) + '%'; $('mxCpuV' + i).textContent = Math.round(cpu * 100) + '%';
      const exe = E.execUsed(w), pct = v => (v / mm.heap * 100).toFixed(2) + '%';
      $('mxMr' + i).style.width = pct(mm.reserved); $('mxMu' + i).style.width = pct(mm.userUsed); $('mxMs' + i).style.width = pct(w.storage); $('mxMe' + i).style.width = pct(exe);
      $('mxMemV' + i).textContent = `${fmtMB(mm.reserved + mm.userUsed + w.storage + exe)} / ${S.mem} GB`;
      $('mxWd' + i).textContent = `${w.done} tasks done`;
      $('mxWsp' + i).innerHTML = w.spill > 0 ? `<span class="warn">spilled ${fmtMB(w.spill)}</span>` : w.storage > 0 ? `cache ${fmtMB(w.storage)}` : '';
    });
  }
  let lastTimeline = 0;
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.1, (ts - (lastTs || ts)) / 1000) * S.speed; lastTs = ts;
    if (!flying.size) { // tasks start only once their chip has landed on the core
      const sub = Math.max(1, Math.ceil(dt / 0.02));
      for (let i = 0; i < sub; i++) E.step(dt / sub);
    }
    processEvents(); paint(ts);
    if (running) requestAnimationFrame(frame);
  }
  function paint(ts) {
    updateDriver(); updateWorkers(); updateBars(); kpis();
    if (!ts || ts - lastTimeline > 150 || E.phase === 'done') { renderTimeline(); lastTimeline = ts || 0; }
  }
  function setRunning(on) {
    running = on;
    const b = $('mxRun'); if (!b) return;
    if (E.phase === 'done') b.innerHTML = '<i data-lucide="rotate-cw" style="width:16px;height:16px;"></i>Run again';
    else b.innerHTML = on ? '<i data-lucide="pause" style="width:16px;height:16px;"></i>Pause' : `<i data-lucide="play" style="width:16px;height:16px;"></i>${E.t > 0 ? 'Resume' : 'Run job'}`;
    if (window.lucide) window.lucide.createIcons({ nodes: [b] });
    if (on) { lastTs = 0; requestAnimationFrame(frame); }
  }

  function variantLabel() {
    const parts = [`${S.workers}W×${S.cores}c·${S.mem}GB`];
    if (S.tab === 'fragment') parts.unshift(S.compacted ? 'compacted' : 'fragmented');
    if (S.tab === 'parquet') parts.unshift(`${fmtMB(S.pqFile)} file · RG ${S.pqRG} · split ${S.pqSplit} · ${S.pqCols} cols${S.pqFilter ? ' · filter' : ''}`);
    if (S.tab === 'skew') parts.unshift(S.salted ? 'salted' : 'unsalted');
    if (S.tab === 'memory') parts.unshift(S.cache ? 'with cache' : 'no cache');
    if (S.tab === 'failure') parts.unshift((S.speculation ? 'spec on' : 'spec off') + (S.degraded ? ', slow W3' : ''));
    return parts.join(' · ');
  }

  // ---------------- (re)build ----------------
  function reset(opts) {
    running = false;
    flying.clear(); document.querySelectorAll('.mx-fly').forEach(el => el.remove());
    cfg = scenarioConfig(S);
    E = createEngine(cfg);
    runLabel = variantLabel();
    if (!opts || !opts.keepStorage) storage();
    driver(); workersUI(); renderBars(); scaleUI(); paint(0); renderTimeline();
    $('mxRunLbl').textContent = runLabel;
    setRunning(false);
    if (window.lucide) window.lucide.createIcons();
  }
  function rebuildAll() {
    document.querySelectorAll('.mx-tab').forEach(t => { const on = t.dataset.tab === S.tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    rules(); intro(); toolbar(); loadUI(); codeUI(); bindToolbar(); reset();
  }

  function ripple(e) {
    const b = e.target.closest('.mx-btn'); if (!b || reduceMotion) return;
    const r = b.getBoundingClientRect(), s = document.createElement('span'), size = Math.max(r.width, r.height);
    s.className = 'mx-ripple'; s.style.width = s.style.height = size + 'px'; s.style.left = (e.clientX - r.left - size / 2) + 'px'; s.style.top = (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(s); setTimeout(() => s.remove(), 600);
  }
  function bindToolbar() {
    const tb = $('mxToolbar');
    tb.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k, v = b.dataset.v, val = k === 'format' ? v : +v;
      if (S[k] === val) return;
      S[k] = val;
      if (k === 'speed') { tb.querySelectorAll('[data-k="speed"]').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); return; }
      if (k === 'format') S._fmtChanged = true;
      rebuildAll();
    }));
    tb.querySelectorAll('[data-sw]').forEach(c => c.addEventListener('change', () => { S[c.dataset.sw] = c.checked; intro(); codeUI(); reset(); }));
    $('mxDomain').addEventListener('change', e => { S.domain = e.target.value; rebuildAll(); });
    const sp = $('mxSpeedIn');
    sp.addEventListener('input', () => { S.speed = SPEEDS[+sp.value]; $('mxSpeedOut').textContent = S.speed + '×'; sp.setAttribute('aria-valuetext', S.speed + '×'); });
    const wi = $('mxWorkersIn');
    wi.addEventListener('input', () => { $('mxWorkersOut').textContent = wi.value; });
    wi.addEventListener('change', () => { S.workers = +wi.value; intro(); reset(); });
    $('mxRun').addEventListener('click', () => {
      if (E.phase === 'done') { reset({ keepStorage: false }); setRunning(true); return; }
      setRunning(!running);
    });
    $('mxReset').addEventListener('click', () => reset());
    const cp = $('mxCompact');
    if (cp) cp.addEventListener('click', () => {
      running = false; cp.disabled = true;
      snack(S.format === 'iceberg' ? 'rewrite_data_files: bin-packing 40 small files per partition into 1' : 'OPTIMIZE: compacting small files and purging deletion vectors', 'combine');
      Object.values(fileEls).flat().forEach(el => el.classList.add('merging'));
      setTimeout(() => { S.compacted = true; S._pop = true; toolbar(); bindToolbar(); intro(); codeUI(); reset(); }, reduceMotion ? 0 : 700);
    });
    const fr = $('mxFragment');
    if (fr) fr.addEventListener('click', () => { S.compacted = false; toolbar(); bindToolbar(); intro(); reset(); });
    const kl = $('mxKill');
    if (kl) kl.addEventListener('click', () => {
      if (!E || E.phase === 'done' || (E.phase === 'plan' && !running)) { snack('Start the job first, then kill a worker mid-stage', 'info'); return; }
      const alive = E.workers.filter(w => !w.lost);
      const target = alive.slice().sort((a, b) => b.slots.filter(Boolean).length - a.slots.filter(Boolean).length || b.done - a.done)[0];
      if (!target || !E.kill(target.id)) { snack('At least one worker must stay alive', 'info'); return; }
      runLabel = variantLabel() + ' · W' + (target.id + 1) + ' killed';
      processEvents(); paint(performance.now());
    });
  }

  // step the simulation without animation frames (used by tests / screenshots)
  root.ExecStudio = { advance(sec) { const n = Math.round(sec / 0.02); for (let i = 0; i < n && E.phase !== 'done'; i++) E.step(0.02); processEvents(); paint(); renderTimeline(); }, tab(id) { S.tab = id; rebuildAll(); } };

  host.addEventListener('click', ripple);
  host.querySelector('.mx-tabs').addEventListener('click', e => { const t = e.target.closest('.mx-tab'); if (!t || t.dataset.tab === S.tab) return; S.tab = t.dataset.tab; rebuildAll(); });
  host.querySelector('.mx-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(t => t.id === S.tab), n = (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    S.tab = TABS[n].id; rebuildAll(); $('mxTab-' + S.tab).focus();
  });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!E) return; renderBars(); updateBars(); renderTimeline(); scaleUI(); }, 200); });
  new MutationObserver(() => { if (E) { renderBars(); updateBars(); renderTimeline(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  rebuildAll();
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting && !autoStarted && E && E.t === 0) { autoStarted = true; setRunning(true); io.disconnect(); } }); }, { threshold: 0.35 });
    io.observe($('mxWorkers'));
  }
})(typeof window !== 'undefined' ? window : globalThis);
