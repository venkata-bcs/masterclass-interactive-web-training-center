/* =========================================================================
   PySpark Lakehouse Demo Lab
   1. Same table, three storage designs: plain Parquet data lake vs Delta Lake vs Apache Iceberg
   2. Read path & planning cost
   3. Copy-on-Write vs Merge-on-Read
   4. Lazy DAG & AQE mini-lab
   Numbers are illustrative; file layouts follow the real on-disk conventions.
   ========================================================================= */
(function (root) {
  'use strict';

  // =====================================================================
  // ENGINE — COW vs MOR cost model (pure, MB units)
  // =====================================================================
  function cowMor(o) {
    // o: { files, fileMB, rowsPerFile, updPct, spread: 'clustered'|'scattered', commits, compactEvery, readsPerDay, writesPerDay }
    const F = o.files, S = o.fileMB, R = o.rowsPerFile, u = o.updPct / 100;
    const changedRows = F * R * u, rowMB = S / R;
    const touched = o.spread === 'clustered' ? Math.min(F, Math.max(1, Math.ceil(F * u))) : Math.min(F, Math.max(1, Math.round(F * (1 - Math.pow(1 - u, Math.min(R, 2000))))));
    const changedMB = changedRows * rowMB;
    // COW: rewrite every touched file in full
    const cowWrite = touched * S;
    // MOR: one small delete file per touched data file (position deletes / deletion vector) + one file with the new row versions
    const delFileMB = r => Math.max(0.004, r * 16 / 1048576);
    const morWrite = touched * delFileMB(changedRows / touched) + changedMB;
    const baseRead = F * S;
    // MOR read penalty per accumulated delete file: open + decode + apply (MB-equivalent) + per-row merge CPU
    const perDelete = 1.5, perRowMerge = rowMB * 0.6;
    const morReadAt = k => baseRead + k * (touched * perDelete + changedRows * perRowMerge) + k * changedMB;
    const series = [];
    let since = 0;
    for (let c = 1; c <= o.commits; c++) {
      since++;
      const compacted = o.compactEvery > 0 && since > o.compactEvery;
      if (compacted) since = 1;
      series.push({ c, cow: baseRead, mor: morReadAt(since), compacted });
    }
    const avgMorRead = series.reduce((a, p) => a + p.mor, 0) / series.length;
    const compactionMB = o.compactEvery > 0 ? (touched * S) / o.compactEvery : 0; // amortized per commit
    const cowDaily = o.writesPerDay * cowWrite + o.readsPerDay * baseRead;
    const morDaily = o.writesPerDay * (morWrite + compactionMB) + o.readsPerDay * avgMorRead;
    return { touched, changedRows, changedMB, cowWrite, morWrite, baseRead, series, avgMorRead, compactionMB, cowDaily, morDaily, ampCow: cowWrite / Math.max(changedMB, 1e-6), ampMor: morWrite / Math.max(changedMB, 1e-6), delFileMB: delFileMB(changedRows / touched) };
  }

  // planning-time model for the read path (seconds)
  function planning(files, commits) {
    const plain = 0.5 + files / 1000 * 0.12 + files * 0.0004;                 // recursive LIST + footer/schema sampling
    const delta = 0.3 + 0.25 + Math.min(commits % 10, 10) * 0.03 + files * 0.00002; // checkpoint + ≤10 JSON tail + reconcile
    const iceberg = 0.3 + 0.05 + Math.ceil(files / 8000) * 0.04 * 0.3 + files * 0.000015; // metadata.json + manifest list + pruned manifests
    return { plain, delta, iceberg };
  }

  const API = { cowMor, planning };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  root.LakehouseEngine = API;
  if (typeof document === 'undefined') return;

  // =====================================================================
  // UI helpers
  // =====================================================================
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmtMB = mb => mb <= 0 ? '0' : mb >= 1048576 ? (mb / 1048576).toFixed(1) + ' TB' : mb >= 1024 ? (mb / 1024).toFixed(mb >= 10240 ? 0 : 1) + ' GB' : mb >= 1 ? (mb >= 10 ? Math.round(mb) : mb.toFixed(1)) + ' MB' : Math.max(1, Math.round(mb * 1024)) + ' KB';
  const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(Math.round(n));
  const fmtS = s => s < 1 ? Math.round(s * 1000) + ' ms' : s < 60 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  let speed = 1;
  const timers = {};
  const later = (g, fn, ms) => (timers[g] = timers[g] || []).push(setTimeout(fn, reduceMotion ? 0 : ms / speed));
  const cancel = g => { (timers[g] || []).forEach(clearTimeout); timers[g] = []; };
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const code = t => `<pre class="lh-pre">${esc(t).replace(/(#[^\n]*|--[^\n]*)/g, '<span class="c">$1</span>')}</pre>`;

  // =====================================================================
  // 1. THREE STORAGE DESIGNS — operation timeline
  // =====================================================================
  const D1 = 'date=2026-10-13', D2 = 'date=2026-10-14';
  // Each op: title, sql, and per-format effects: add [[path, kind, label]], remove [paths], see (reader view), verdict ok|warn|bad, note
  const OPS = [
    {
      t: 'CREATE + INSERT 1M rows', sql: `df.write.partitionBy("date").format(FMT).save(path)`,
      plain: { add: [[`${D1}/part-00000.parquet`, 'data', '64 MB'], [`${D1}/part-00001.parquet`, 'data', '64 MB'], ['_SUCCESS', 'marker', '0 B']], see: '1,000,000 rows (found by listing folders)', v: 'ok', note: 'Just Parquet files in folders. The "table" is whatever a directory listing finds; the schema lives in the files.' },
      delta: { add: [[`${D1}/part-00000.parquet`, 'data', '64 MB'], [`${D1}/part-00001.parquet`, 'data', '64 MB'], ['_delta_log/00000000000000000000.json', 'log', 'protocol · metaData · add ×2']], see: '1,000,000 rows (version 0)', v: 'ok', note: 'Commit 0 records the schema, partition columns and an <code>add</code> action (with min/max stats) for each data file.' },
      iceberg: { add: [[`data/${D1}/00000-0-a1.parquet`, 'data', '64 MB'], [`data/${D1}/00001-0-a1.parquet`, 'data', '64 MB'], ['metadata/m-1.avro', 'manifest', '2 files + stats'], ['metadata/snap-1.avro', 'mlist', 'manifest list'], ['metadata/v1.metadata.json', 'meta', 'schema · spec · snapshot 1'], ['catalog → v1.metadata.json', 'ptr', 'current pointer']], see: '1,000,000 rows (snapshot 1)', v: 'ok', note: 'A metadata tree: table metadata → snapshot\'s manifest list → manifests → data files. The catalog holds one pointer to the current metadata file.' }
    },
    {
      t: 'APPEND 500K rows (new day)', sql: `df_new.write.mode("append").format(FMT).save(path)`,
      plain: { add: [[`${D2}/part-00000.parquet`, 'data', '32 MB']], see: '1,500,000 rows', v: 'ok', note: 'Appends are easy: drop new files in. Readers mid-write may see a half-written file.' },
      delta: { add: [[`${D2}/part-00000.parquet`, 'data', '32 MB'], ['_delta_log/00000000000000000001.json', 'log', 'add ×1']], see: '1,500,000 rows (version 1)', v: 'ok', note: 'The file is invisible until <code>00…01.json</code> is written atomically (put-if-absent). Readers see v0 or v1, never in between.' },
      iceberg: { add: [[`data/${D2}/00000-1-b2.parquet`, 'data', '32 MB'], ['metadata/m-2.avro', 'manifest', '1 file'], ['metadata/snap-2.avro', 'mlist', 'm-1 + m-2'], ['metadata/v2.metadata.json', 'meta', 'snapshot 2'], ['catalog → v2.metadata.json', 'ptr', 'swapped atomically']], remove: ['catalog → v1.metadata.json'], see: '1,500,000 rows (snapshot 2)', v: 'ok', note: 'The new snapshot reuses manifest m-1 and adds m-2; the commit is an atomic compare-and-swap of the catalog pointer.' }
    },
    {
      t: 'UPDATE amount WHERE customer = C42', sql: `UPDATE sales SET amount = amount * 1.1 WHERE customer_id = 'C42'`,
      plain: { add: [[`${D1}/part-00001.parquet (rewritten)`, 'data', '64 MB']], remove: [`${D1}/part-00001.parquet`], see: 'Not supported — Spark raises "UPDATE is only supported with v2 tables". You must read the partition, change it and overwrite the whole folder.', v: 'bad', note: 'No row-level operations. A manual partition overwrite deletes then rewrites files, so concurrent readers can see missing or duplicate rows.' },
      delta: { add: [[`${D1}/part-00002.parquet`, 'data', '64 MB · new version']], remove: [`${D1}/part-00001.parquet`], plus: [['_delta_log/00000000000000000002.json', 'log', 'remove part-00001 · add part-00002']], see: '1,500,000 rows, C42 updated (version 2)', v: 'ok', note: 'Copy-on-write by default: the file holding C42 is rewritten and swapped in one commit. With deletion vectors on, Delta writes a small DV file instead (merge-on-read — see section 3).' },
      iceberg: { add: [[`data/${D1}/00002-2-c3.parquet`, 'data', '64 MB · rewritten']], remove: [`data/${D1}/00001-0-a1.parquet`, 'catalog → v2.metadata.json'], plus: [['metadata/m-3.avro', 'manifest', 'DELETED 00001 · ADDED 00002'], ['metadata/snap-3.avro', 'mlist', 'overwrite'], ['metadata/v3.metadata.json', 'meta', 'snapshot 3'], ['catalog → v3.metadata.json', 'ptr', 'swapped']], see: '1,500,000 rows, C42 updated (snapshot 3)', v: 'ok', note: '<code>write.update.mode</code> = copy-on-write (default) rewrites the file. With merge-on-read Iceberg writes a position-delete file + the new rows instead.' }
    },
    {
      t: "DELETE WHERE status = 'test'", sql: `DELETE FROM sales WHERE status = 'test'`,
      plain: { add: [[`${D2}/part-00000.parquet (rewritten)`, 'data', '31 MB']], remove: [`${D2}/part-00000.parquet`], see: 'Manual: filter the partition and overwrite it. A crash between delete and write loses the day.', v: 'bad', note: 'GDPR-style deletes mean rewriting folders by hand, with no audit trail of what changed.' },
      delta: { add: [[`${D2}/part-00001.parquet`, 'data', '31 MB'], ['_delta_log/00000000000000000003.json', 'log', 'remove · add']], remove: [`${D2}/part-00000.parquet`], see: '1,499,200 rows (version 3)', v: 'ok', note: 'Only files containing matching rows are rewritten; the log keeps the full history (<code>DESCRIBE HISTORY</code>).' },
      iceberg: { add: [[`data/${D2}/00003-3-d4.parquet`, 'data', '31 MB'], ['metadata/m-4.avro', 'manifest', 'DELETED 00000 · ADDED 00003'], ['metadata/snap-4.avro', 'mlist', 'delete'], ['metadata/v4.metadata.json', 'meta', 'snapshot 4'], ['catalog → v4.metadata.json', 'ptr', 'swapped']], remove: [`data/${D2}/00000-1-b2.parquet`, 'catalog → v3.metadata.json'], see: '1,499,200 rows (snapshot 4)', v: 'ok', note: 'A delete that matches whole partitions is metadata-only; otherwise files are rewritten (COW) or delete files added (MOR).' }
    },
    {
      t: 'ADD COLUMN channel', sql: `ALTER TABLE sales ADD COLUMN channel STRING`,
      plain: { add: [[`${D2}/part-00002.parquet`, 'data', 'new files have "channel"']], see: 'Old files lack the column. Readers need mergeSchema=true; a renamed column silently reads as NULL.', v: 'warn', note: 'No central schema. Every file carries its own; compatibility is your problem.' },
      delta: { add: [['_delta_log/00000000000000000004.json', 'log', 'metaData (new schema)']], see: 'Schema v2 everywhere; old files return NULL for channel', v: 'ok', note: 'Schema change is a metadata-only commit. Schema enforcement rejects writes that don\'t match; column mapping enables rename/drop.' },
      iceberg: { add: [['metadata/v5.metadata.json', 'meta', 'schema-id 1 (field id 7)'], ['catalog → v5.metadata.json', 'ptr', 'swapped']], remove: ['catalog → v4.metadata.json'], see: 'Schema 1 everywhere; columns tracked by ID', v: 'ok', note: 'Columns have permanent IDs, so add / drop / rename / reorder are safe with no rewrite. Partition specs can evolve too (e.g. days → hours).' }
    },
    {
      t: 'Writer crashes mid-job', sql: `job.write(...)  # executor lost after 1 of 3 files`,
      plain: { add: [[`${D2}/part-00003.parquet`, 'partial', 'half-written!'], ['_temporary/0/task_17/', 'temp', 'leftovers']], see: 'Readers pick up the partial file → corrupt or duplicate rows until someone cleans up.', v: 'bad', note: 'No commit protocol on object stores: files appear as soon as they are written.' },
      delta: { add: [[`${D2}/part-00003.parquet`, 'orphan', 'never committed']], see: 'Still version 4 — the orphan file is invisible', v: 'ok', note: 'No JSON commit = no change. <code>VACUUM</code> removes uncommitted files older than the retention period.' },
      iceberg: { add: [[`data/${D2}/00004-5-e5.parquet`, 'orphan', 'never committed']], see: 'Still snapshot 4 (schema 1) — invisible', v: 'ok', note: 'The pointer was never swapped. <code>remove_orphan_files</code> cleans up.' }
    },
    {
      t: 'Two jobs write at once', sql: `job A: MERGE INTO sales …   job B: UPDATE sales … (same files)`,
      plain: { add: [[`${D1}/part-00004.parquet`, 'data', 'job A'], [`${D1}/part-00005.parquet`, 'data', 'job B']], see: 'Last writer wins, or both partial results mix. Nothing detects the conflict.', v: 'bad', note: 'No isolation between writers.' },
      delta: { add: [['_delta_log/00000000000000000005.json', 'log', 'job A wins']], see: 'Job A commits v5. Job B gets ConcurrentModificationException and retries on v5.', v: 'ok', note: 'Optimistic concurrency: both try to create <code>00…05.json</code>; only one can. Non-conflicting appends are retried automatically.' },
      iceberg: { add: [['metadata/v6.metadata.json', 'meta', 'job A wins'], ['catalog → v6.metadata.json', 'ptr', 'CAS ok']], remove: ['catalog → v5.metadata.json'], see: 'Job A swaps the pointer; job B\'s CAS fails, it re-applies on v6 and retries.', v: 'ok', note: 'Serializable isolation through the catalog\'s atomic compare-and-swap.' }
    },
    {
      t: 'Time travel to the original data', sql: `SELECT * FROM sales VERSION AS OF 1`,
      plain: { see: 'Impossible — the original files were overwritten in steps 3–4.', v: 'bad', note: 'Unless you keep manual backups or bucket versioning.' },
      delta: { see: 'Replays the log up to 00…01.json → the 3 files of version 1 → 1,500,000 original rows', v: 'ok', note: 'Old files stay until VACUUM. Also <code>TIMESTAMP AS OF</code>, <code>RESTORE TABLE … TO VERSION AS OF 1</code>.' },
      iceberg: { see: 'Opens snapshot 2\'s manifest list → original files → 1,500,000 rows', v: 'ok', note: '<code>VERSION AS OF &lt;snapshot-id&gt;</code> or <code>TIMESTAMP AS OF</code>; branches and tags can pin snapshots.' }
    },
    {
      t: 'Maintenance: compact + clean up', sql: `OPTIMIZE sales; VACUUM sales  |  CALL system.rewrite_data_files(...); CALL system.expire_snapshots(...)`,
      plain: { see: 'Manual compaction jobs; risky while readers are active.', v: 'warn', note: 'Small files accumulate and every read lists them all.' },
      delta: { add: [[`${D1}/part-00006.parquet`, 'data', 'compacted 128 MB'], ['_delta_log/00000000000000000006.json', 'log', 'OPTIMIZE'], ['_delta_log/00000000000000000010.checkpoint.parquet', 'ckpt', 'every 10 commits']], see: 'Fewer, bigger files; history kept until VACUUM retention', v: 'ok', note: 'OPTIMIZE (bin-pack / Z-ORDER / liquid clustering), VACUUM removes unreferenced files, checkpoints keep log replay fast.' },
      iceberg: { add: [[`data/${D1}/00005-7-f6.parquet`, 'data', 'compacted 128 MB'], ['metadata/v7.metadata.json', 'meta', 'replace snapshot'], ['catalog → v7.metadata.json', 'ptr', 'swapped']], remove: ['catalog → v6.metadata.json'], see: 'Fewer files; expired snapshots are no longer time-travelable', v: 'ok', note: 'rewrite_data_files, rewrite_manifests, expire_snapshots, remove_orphan_files.' }
    }
  ];
  const FMTS = [
    { id: 'plain', label: 'Plain PySpark data lake', sub: 'Parquet files in folders (Hive-style)', icon: 'folder-open', root: 's3://lake/sales/' },
    { id: 'delta', label: 'Delta Lake', sub: 'Parquet + _delta_log transaction log', icon: 'triangle', root: 's3://lake/sales/' },
    { id: 'iceberg', label: 'Apache Iceberg', sub: 'Parquet + metadata tree + catalog', icon: 'snowflake', root: 's3://warehouse/db/sales/' }
  ];
  const KIND = { data: 'Parquet data', log: 'commit JSON', ckpt: 'checkpoint', meta: 'metadata.json', mlist: 'manifest list', manifest: 'manifest', ptr: 'catalog pointer', marker: 'marker', partial: 'partial file', temp: 'temp dir', orphan: 'orphan file' };
  const TL = { step: 0, playing: false, showRemoved: true };

  function stateAt(fmt, k) {
    const files = new Map();
    for (let i = 0; i <= k; i++) {
      const e = OPS[i][fmt];
      (e.remove || []).forEach(p => { const f = files.get(p); if (f) f.removed = i; });
      [...(e.add || []), ...(e.plus || [])].forEach(([p, kind, label]) => files.set(p, { p, kind, label, born: i, removed: null }));
    }
    return [...files.values()];
  }
  function timelineUI() {
    $('lhTimeline').innerHTML = `
      <div class="lh-card">
        <div class="lh-row" style="justify-content:space-between">
          <div class="lh-steps" id="lhSteps" role="tablist" aria-label="Operations">${OPS.map((o, i) => `<button type="button" class="lh-step" role="tab" data-i="${i}" title="${esc(o.t)}"><span>${i + 1}</span></button>`).join('')}</div>
          <div class="lh-row">
            <button type="button" class="lh-btn ghost" id="lhPrev"><i data-lucide="chevron-left" style="width:16px;height:16px;"></i>Back</button>
            <button type="button" class="lh-btn primary" id="lhPlay"><i data-lucide="play" style="width:16px;height:16px;"></i>Play all</button>
            <button type="button" class="lh-btn ghost" id="lhNext">Next<i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>
            <label class="lh-check"><input type="checkbox" id="lhShowRm" checked> show removed files</label>
          </div>
        </div>
        <div class="lh-op" id="lhOp"></div>
      </div>
      <div class="lh-three" id="lhCols"></div>
      <div class="lh-legend">${Object.entries({ data: 'Parquet data file', log: 'Delta commit / checkpoint', meta: 'Iceberg metadata / manifests', ptr: 'catalog pointer', partial: 'partial / orphan / temp' }).map(([k, l]) => `<span><i class="lh-kind k-${k}"></i>${l}</span>`).join('')}<span><i class="lh-kind" style="background:transparent;border:1px dashed var(--text-muted)"></i>struck = no longer part of the current version</span></div>`;
    $('lhSteps').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; stopPlay(); TL.step = +b.dataset.i; timelineRender(); });
    $('lhPrev').addEventListener('click', () => { stopPlay(); TL.step = Math.max(0, TL.step - 1); timelineRender(); });
    $('lhNext').addEventListener('click', () => { stopPlay(); TL.step = Math.min(OPS.length - 1, TL.step + 1); timelineRender(); });
    $('lhPlay').addEventListener('click', () => { if (TL.playing) { stopPlay(); return; } TL.playing = true; TL.step = 0; timelineRender(); playTick(); playLabel(); });
    $('lhShowRm').addEventListener('change', e => { TL.showRemoved = e.target.checked; timelineRender(); });
    timelineRender();
  }
  function playLabel() { $('lhPlay').innerHTML = TL.playing ? '<i data-lucide="pause" style="width:16px;height:16px;"></i>Pause' : '<i data-lucide="play" style="width:16px;height:16px;"></i>Play all'; icons(); }
  function stopPlay() { TL.playing = false; cancel('play'); playLabel(); }
  function playTick() { later('play', () => { if (!TL.playing) return; if (TL.step < OPS.length - 1) { TL.step++; timelineRender(); playTick(); } else stopPlay(); }, 4200); }
  function timelineRender() {
    const k = TL.step, op = OPS[k];
    $('lhSteps').querySelectorAll('.lh-step').forEach((b, i) => { b.classList.toggle('on', i === k); b.classList.toggle('done', i < k); b.setAttribute('aria-selected', i === k); });
    $('lhOp').innerHTML = `<div class="lh-op-t"><span class="lh-num">Step ${k + 1} / ${OPS.length}</span>${esc(op.t)}</div><code class="lh-sql">${esc(op.sql.replace('FMT', '"delta" | "iceberg" | "parquet"'))}</code>`;
    $('lhCols').innerHTML = FMTS.map(f => {
      const e = op[f.id], files = stateAt(f.id, k).filter(x => TL.showRemoved || x.removed === null);
      const groups = {};
      files.forEach(x => { const parts = x.p.split('/'); const dir = x.kind === 'ptr' ? '(catalog)' : parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : './'; (groups[dir] = groups[dir] || []).push(x); });
      const order = Object.keys(groups).sort((a, b) => (a === '(catalog)') - (b === '(catalog)') || a.localeCompare(b));
      const tree = order.map(dir => `<div class="lh-dir"><i data-lucide="${dir === '(catalog)' ? 'database' : 'folder'}" style="width:13px;height:13px;"></i>${esc(dir)}</div>${groups[dir].map(x => `<div class="lh-file k-${x.kind}${x.removed !== null ? ' rm' : ''}${x.born === k && x.removed === null ? ' new' : ''}${x.removed === k ? ' gone' : ''}" title="${KIND[x.kind] || x.kind}"><i class="lh-kind k-${x.kind}"></i><span class="fn">${esc(x.p.split('/').pop())}</span><span class="fl">${esc(x.label)}</span></div>`).join('')}`).join('');
      const vIcon = { ok: 'shield-check', warn: 'alert-triangle', bad: 'shield-x' }[e.v], vTxt = { ok: 'Safe', warn: 'Caveats', bad: 'Unsafe / unsupported' }[e.v];
      return `<div class="lh-col fmt-${f.id}"><div class="lh-col-hd"><i data-lucide="${f.icon}" style="width:18px;height:18px;"></i><div><div class="lh-col-t">${f.label}</div><div class="lh-col-s">${f.sub}</div></div></div>
        <div class="lh-root">${f.root}</div><div class="lh-tree">${tree || '<div class="lh-dim">(empty)</div>'}</div>
        <div class="lh-see v-${e.v}"><div class="lh-verdict"><i data-lucide="${vIcon}" style="width:15px;height:15px;"></i>${vTxt}</div><b>Reader sees:</b> ${e.see}</div>
        <p class="lh-note">${e.note}</p></div>`;
    }).join('');
    icons();
  }

  // capability matrix
  const CAPS = [
    ['ACID transactions / atomic commits', 'No', 'Yes — log-based', 'Yes — catalog pointer swap'],
    ['UPDATE / DELETE / MERGE', 'No (rewrite folders by hand)', 'Yes', 'Yes'],
    ['Row-level change strategy', 'Copy-on-write by hand', 'COW · MOR via deletion vectors', 'COW or MOR per operation'],
    ['Time travel', 'No', 'VERSION / TIMESTAMP AS OF', 'Snapshot id / timestamp · branches & tags'],
    ['Schema evolution', 'Per-file, mergeSchema', 'Add; rename/drop with column mapping', 'Add / drop / rename / reorder by column ID'],
    ['Partitioning', 'Folder names, user must filter', 'Partition columns / liquid clustering', 'Hidden partitioning + partition evolution'],
    ['File listing at read time', 'Recursive S3 LIST', 'None — log + checkpoint', 'None — manifests with partition summaries'],
    ['Concurrent writers', 'Unsafe', 'Optimistic concurrency', 'Optimistic concurrency (CAS)'],
    ['Engine ecosystem', 'Any Parquet reader', 'Spark, Databricks, Trino, Flink, DuckDB…', 'Spark, Trino, Flink, Snowflake, Athena, DuckDB…']
  ];
  function matrixUI() {
    $('lhMatrix').innerHTML = `<div class="lh-tw"><table class="lh-table"><thead><tr><th>Capability</th><th class="fmt-plain">Plain Parquet</th><th class="fmt-delta">Delta Lake</th><th class="fmt-iceberg">Apache Iceberg</th></tr></thead><tbody>${CAPS.map(r => `<tr><td>${r[0]}</td><td class="${/^No|Unsafe/.test(r[1]) ? 'neg' : ''}">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // =====================================================================
  // 2. READ PATH & PLANNING COST
  // =====================================================================
  const RP = { fmt: 'delta', files: 3 }; // index into FILES
  const FILES = [100, 1000, 10000, 100000, 1000000];
  const READ_STEPS = {
    plain: ['Recursive LIST of s3://lake/sales/ (1,000 keys per call)', 'Infer partitions from folder names date=…', 'Sample Parquet footers to infer / merge schema', 'Every listed file is a candidate — including partial or stale ones', 'Prune only by folder name, then read'],
    delta: ['Read _delta_log/_last_checkpoint', 'Read the latest checkpoint.parquet (full file list + stats)', 'Replay the ≤ 10 JSON commits after it (add / remove)', 'Prune by partition values and min/max stats per file', 'Read only the surviving files'],
    iceberg: ['Ask the catalog for the current metadata.json', 'Load the current snapshot\'s manifest list', 'Skip whole manifests using partition summaries', 'Read surviving manifests: per-file stats → prune files', 'Read data files (+ delete files for MOR)']
  };
  function readUI() {
    $('lhRead').innerHTML = `<div class="lh-two">
      <div class="lh-card"><div class="lh-row" style="margin-bottom:12px">
        <div class="lh-seg" role="group" aria-label="Format">${FMTS.map(f => `<button type="button" data-rf="${f.id}" aria-pressed="${f.id === RP.fmt}">${f.label.replace('Plain PySpark data lake', 'Plain Parquet')}</button>`).join('')}</div>
        <button type="button" class="lh-btn primary" id="lhReadGo"><i data-lucide="play" style="width:16px;height:16px;"></i>Animate read</button></div>
        <ol class="lh-rsteps" id="lhRSteps"></ol></div>
      <div class="lh-card"><div class="lh-field"><span>Files in the table: <b id="lhRFilesOut"></b></span><input type="range" id="lhRFiles" min="0" max="${FILES.length - 1}" value="${RP.files}" aria-label="Files in the table"></div>
        <div class="lh-chart" id="lhRChart"></div>
        <p class="lh-note">Query planning time before the first task runs (illustrative). Plain Parquet pays for a recursive listing that grows with file count. Delta reads a checkpoint plus a few JSON files. Iceberg skips whole manifests.</p></div></div>`;
    $('lhRead').querySelectorAll('[data-rf]').forEach(b => b.addEventListener('click', () => { RP.fmt = b.dataset.rf; $('lhRead').querySelectorAll('[data-rf]').forEach(x => x.setAttribute('aria-pressed', x === b)); readRender(); }));
    const r = $('lhRFiles'); r.addEventListener('input', () => { RP.files = +r.value; readChart(); });
    $('lhReadGo').addEventListener('click', readAnimate);
    readRender(); readChart();
  }
  function readRender() {
    cancel('read');
    $('lhRSteps').innerHTML = READ_STEPS[RP.fmt].map((s, i) => `<li data-s="${i}"><span class="n">${i + 1}</span>${esc(s)}</li>`).join('');
  }
  function readAnimate() {
    readRender();
    const items = [...$('lhRSteps').children];
    items.forEach((li, i) => later('read', () => { items.forEach(x => x.classList.remove('on')); li.classList.add('on', 'done'); }, 200 + i * 900));
    later('read', () => items.forEach(x => x.classList.remove('on')), 200 + items.length * 900);
  }
  function readChart() {
    const n = FILES[RP.files], p = planning(n, 23);
    $('lhRFilesOut').textContent = n.toLocaleString('en-US');
    const vals = [['Plain Parquet', p.plain, 'var(--lh-plain)'], ['Delta Lake', p.delta, 'var(--lh-delta)'], ['Apache Iceberg', p.iceberg, 'var(--lh-iceberg)']];
    const max = Math.max(...vals.map(v => v[1]));
    $('lhRChart').innerHTML = vals.map(([l, v, c]) => `<div class="lh-hbar"><span>${l}</span><div class="tr"><div class="fi" style="width:${Math.max(1, v / max * 100)}%;background:${c}"></div></div><b>${fmtS(v)}</b></div>`).join('');
  }

  // =====================================================================
  // 3. COPY-ON-WRITE vs MERGE-ON-READ
  // =====================================================================
  const CM = { updPct: 1, spread: 'clustered', commits: 20, compactEvery: 10, readsPerDay: 50, writesPerDay: 24, fmt: 'iceberg' };
  const GRID = { files: 24, fileMB: 128, rowsPerFile: 1000000 };
  let cmGrid = null;
  const TBL = { fmt: 'delta' };
  function cmUI() {
    $('lhCM').innerHTML = `
      <div class="lh-card">
        <div class="lh-row" style="justify-content:space-between;margin-bottom:10px">
          <div class="lh-card-t" style="margin:0">What each block means</div>
          <div class="lh-row"><span class="lh-note" style="margin:0">File names as written by</span><div class="lh-seg" role="group" aria-label="Table format for file names">${[['delta', 'Delta Lake'], ['iceberg', 'Apache Iceberg']].map(([k, l]) => `<button type="button" data-tf="${k}" aria-pressed="${k === TBL.fmt}">${l}</button>`).join('')}</div></div>
        </div>
        <div class="lh-blegend" id="lhBLegend"></div>
      </div>
      <div class="lh-card"><div class="lh-row">
        <button type="button" class="lh-btn ghost" id="lhIns"><i data-lucide="plus" style="width:16px;height:16px;"></i>Run INSERT</button>
        <button type="button" class="lh-btn primary" id="lhUpd"><i data-lucide="pencil" style="width:16px;height:16px;"></i>Run UPDATE</button>
        <button type="button" class="lh-btn ghost" id="lhCompact"><i data-lucide="combine" style="width:16px;height:16px;"></i><span id="lhCompactLbl">Compact</span></button>
        <button type="button" class="lh-btn ghost" id="lhGReset"><i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>Reset table</button>
        <span class="lh-note" style="margin:0">Both panels receive exactly the same commands.</span></div></div>
      <div class="lh-two">
        <div class="lh-card cow"><div class="lh-cm-hd"><span class="lh-tag cow">COW</span><b>Copy-on-Write</b></div>
          <p class="lh-note" style="margin-top:6px">UPDATE / DELETE / MERGE <b>rewrites every data file that holds a changed row</b>, in full. Writes are expensive; a reader only opens current data files.</p>
          <div id="lhLanesCow"></div><div class="lh-gstat" id="lhGStatCow"></div><ol class="lh-clog" id="lhLogCow"></ol></div>
        <div class="lh-card mor"><div class="lh-cm-hd"><span class="lh-tag mor">MOR</span><b>Merge-on-Read</b></div>
          <p class="lh-note" style="margin-top:6px">UPDATE writes <b>delete markers</b> for the old row positions plus <b>one small file with the new row versions</b>. Writes are cheap; every reader merges them until compaction.</p>
          <div id="lhLanesMor"></div><div class="lh-gstat" id="lhGStatMor"></div><ol class="lh-clog" id="lhLogMor"></ol></div>
      </div>
      <div class="lh-card"><div class="lh-row" style="gap:14px 22px;align-items:flex-end">
        <div class="lh-field"><span>Rows changed per commit: <b id="lhUOut"></b></span><input type="range" id="lhU" min="0" max="6" value="2" aria-label="Rows changed per commit"></div>
        <div class="lh-field"><span>Changed rows are</span><div class="lh-seg" role="group" aria-label="Spread"><button type="button" data-sp="clustered" aria-pressed="true">clustered</button><button type="button" data-sp="scattered" aria-pressed="false">scattered</button></div></div>
        <div class="lh-field"><span>Compact every <b id="lhKOut"></b> commits</span><input type="range" id="lhK" min="0" max="30" value="${CM.compactEvery}" aria-label="Compaction interval"></div>
        <div class="lh-field"><span>Reads / day: <b id="lhROut"></b></span><input type="range" id="lhR" min="1" max="500" value="${CM.readsPerDay}" aria-label="Reads per day"></div>
        <div class="lh-field"><span>Writes / day: <b id="lhWOut"></b></span><input type="range" id="lhW" min="1" max="500" value="${CM.writesPerDay}" aria-label="Writes per day"></div>
      </div></div>
      <div class="lh-two">
        <div class="lh-card"><div class="lh-card-t">Bytes written per UPDATE commit</div><div id="lhWBars"></div><div class="lh-kpis" id="lhCMK"></div></div>
        <div class="lh-card"><div class="lh-card-t">Read cost per query as commits accumulate</div><div class="lh-chart" id="lhRCost"></div>
          <div class="lh-legend"><span><i class="lh-sw" style="background:var(--lh-cow)"></i>COW (flat)</span><span><i class="lh-sw" style="background:var(--lh-mor)"></i>MOR (grows until compaction)</span><span>▼ compaction</span></div></div>
      </div>
      <div class="lh-two">
        <div class="lh-card" id="lhRec"></div>
        <div class="lh-card"><div class="lh-row" style="justify-content:space-between;margin-bottom:8px"><div class="lh-card-t" style="margin:0">How each engine does it</div>
          <div class="lh-seg" role="group" aria-label="Code">${[['iceberg', 'Iceberg'], ['delta', 'Delta Lake'], ['hudi', 'Hudi'], ['plain', 'Plain Parquet']].map(([k, l]) => `<button type="button" data-cf="${k}" aria-pressed="${k === CM.fmt}">${l}</button>`).join('')}</div></div><div id="lhCMCode"></div></div>
      </div>
      <div class="lh-tw"><table class="lh-table"><thead><tr><th></th><th><span class="lh-tag cow">COW</span> Copy-on-Write</th><th><span class="lh-tag mor">MOR</span> Merge-on-Read</th></tr></thead><tbody>
        <tr><td>On UPDATE / DELETE</td><td>Rewrite whole files that contain changed rows</td><td>Write delete files / deletion vectors + new rows</td></tr>
        <tr><td>Write cost & latency</td><td>High (write amplification)</td><td>Low — good for frequent small changes, CDC, streaming upserts</td></tr>
        <tr><td>Read cost</td><td>Lowest — plain Parquet scan</td><td>Grows with unmerged deletes until compaction</td></tr>
        <tr><td>Maintenance</td><td>OPTIMIZE for small files only</td><td>Regular compaction is mandatory</td></tr>
        <tr><td>Best for</td><td>Read-heavy BI tables, batch updates</td><td>Write-heavy upserts, GDPR deletes, near-real-time ingest</td></tr>
      </tbody></table></div>`;
    const U = [0.01, 0.1, 1, 5, 10, 20, 50];
    const u = $('lhU'), k = $('lhK'), r = $('lhR'), w = $('lhW');
    const sync = () => { CM.updPct = U[+u.value]; CM.compactEvery = +k.value; CM.readsPerDay = +r.value; CM.writesPerDay = +w.value; cmRender(); };
    [u, k, r, w].forEach(x => x.addEventListener('input', sync));
    $('lhCM').querySelectorAll('[data-sp]').forEach(b => b.addEventListener('click', () => { CM.spread = b.dataset.sp; $('lhCM').querySelectorAll('[data-sp]').forEach(x => x.setAttribute('aria-pressed', x === b)); cmRender(); }));
    $('lhCM').querySelectorAll('[data-cf]').forEach(b => b.addEventListener('click', () => { CM.fmt = b.dataset.cf; $('lhCM').querySelectorAll('[data-cf]').forEach(x => x.setAttribute('aria-pressed', x === b)); cmCode(); }));
    $('lhIns').addEventListener('click', cmInsert);
    $('lhUpd').addEventListener('click', cmUpdate);
    $('lhCompact').addEventListener('click', cmCompact);
    $('lhGReset').addEventListener('click', () => { cmGridReset(); });
    $('lhCM').querySelectorAll('[data-tf]').forEach(b => b.addEventListener('click', () => { TBL.fmt = b.dataset.tf; $('lhCM').querySelectorAll('[data-tf]').forEach(x => x.setAttribute('aria-pressed', x === b)); cmGridReset(); cmRender(); }));
    sync(); cmGridReset(); cmCode();
  }
  // ---- file-level simulation of the two strategies ----
  // data file kinds: base (initial load) · insert (INSERT) · rewritten (COW update) · upd (MOR new row versions) · compacted
  const INS_MB = 32;
  function newSide() {
    return { data: Array.from({ length: GRID.files }, (_, i) => ({ id: i, ver: 1, kind: 'base' })), old: [], dels: [], meta: [{ n: 0, op: 'CREATE' }], log: [], written: 0, next: GRID.files, updN: 0 };
  }
  const fname = f => f.kind === 'upd' ? `U${f.id}` : `f${f.id}`;
  const metaName = n => TBL.fmt === 'delta' ? `${String(n).padStart(3, '0')}.json` : `snap-${n + 1}`;
  const metaFull = n => TBL.fmt === 'delta' ? `_delta_log/${String(n).padStart(20, '0')}.json` : `metadata/v${n + 1}.metadata.json → snap-${n + 1}.avro (manifest list) → manifest m-${n + 1}.avro`;
  const BLOCKS = () => [
    ['base', 'f3', 'Data file (Parquet)', 'Rows from the initial load. 128 MB each.'],
    ['insert', 'f24', 'INSERT file', 'INSERT / append only adds a new data file. Identical in COW and MOR; no existing file changes.'],
    ['rewritten', 'f3·v2', 'COW rewritten file', 'COW UPDATE copies the whole file with the changed rows applied → new version v2, v3…'],
    ['old', 'f3·v1', 'Replaced old version', 'No longer in the current snapshot, but still on storage for time travel until ' + (TBL.fmt === 'delta' ? 'VACUUM' : 'expire_snapshots') + '.'],
    ['upd', 'U1', 'MOR new-rows file', 'MOR UPDATE writes only the new versions of the changed rows into a small new data file.'],
    ['del', TBL.fmt === 'delta' ? 'DV f3' : 'pos-del', TBL.fmt === 'delta' ? 'Deletion vector' : 'Position-delete file', TBL.fmt === 'delta' ? 'A small bitmap (deletion_vector_*.bin) marking which rows of one data file are deleted. One per data file, replaced on the next change.' : 'A small Parquet file listing (data-file path, row position) pairs to skip. One new file per commit. (Iceberg v3 also supports deletion vectors.)'],
    ['meta', metaName(3), TBL.fmt === 'delta' ? 'Commit (_delta_log JSON)' : 'Snapshot + manifest', TBL.fmt === 'delta' ? 'Every commit writes one JSON with add / remove actions (and DV references).' : 'Every commit writes a new metadata.json, a manifest list and manifest(s) that list data + delete files.']
  ];
  function legendRender() {
    $('lhBLegend').innerHTML = BLOCKS().map(([k, t, l, d]) => `<div class="lh-bl"><span class="lh-blk b-${k}">${t}</span><div><b>${l}</b><span>${d}</span></div></div>`).join('');
    $('lhCompactLbl').textContent = TBL.fmt === 'delta' ? 'Compact (OPTIMIZE)' : 'Compact (rewrite_data_files)';
  }
  function cmGridReset() {
    cancel('cm');
    cmGrid = { cow: newSide(), mor: newSide(), commits: 0 };
    ['cow', 'mor'].forEach(k => cmGrid[k].log.push({ n: 0, t: `CREATE + load → ${GRID.files} data files (f0–f${GRID.files - 1}), commit ${metaName(0)}` }));
    legendRender(); cmGridRender();
  }
  function lanes(side, key, flash) {
    const g = cmGrid[side], fl = (flash && flash[side]) || [];
    const delsFor = id => g.dels.filter(d => d.targets.includes(id)).length;
    const blk = (cls, txt, tip, extra) => `<span class="lh-blk b-${cls}${extra || ''}" title="${esc(tip)}">${txt}</span>`;
    const data = g.data.map(f => {
      const kindTip = { base: 'original data file', insert: 'added by INSERT', rewritten: `rewritten by COW UPDATE (version ${f.ver})`, upd: 'MOR new row versions from an UPDATE', compacted: `rewritten by compaction (version ${f.ver})` }[f.kind];
      const d = side === 'mor' ? delsFor(f.id) : 0;
      const label = f.kind === 'rewritten' || f.kind === 'compacted' ? `${fname(f)}·v${f.ver}` : fname(f);
      return blk(f.kind === 'compacted' ? 'rewritten' : f.kind, label + (d ? `<i class="lh-dmark" title="${d} delete marker(s)">✕${d > 1 ? d : ''}</i>` : ''), `${fname(f)} · ${kindTip}${d ? ` · ${d} delete marker(s) apply to this file` : ''}`, fl.includes(f.id) && f.kind !== 'upd' ? ' flash' : '');
    }).join('');
    const delBlocks = g.dels.map(d => TBL.fmt === 'delta'
      ? blk('del', `DV f${d.targets[0]}${d.ver > 1 ? '·v' + d.ver : ''}`, `deletion_vector for f${d.targets[0]} (version ${d.ver}) — marks its updated rows as deleted`)
      : blk('del', `pos-del ${d.n}`, `position-delete file from commit ${d.n} → skips rows in ${d.targets.map(t => 'f' + t).join(', ')}`)).join('');
    const oldShown = g.old.slice(-18);
    const oldBlocks = oldShown.map(o => blk('old', o.label, `${o.label} — replaced at commit ${o.at}; kept for time travel until ${TBL.fmt === 'delta' ? 'VACUUM' : 'expire_snapshots'}`)).join('') + (g.old.length > 18 ? `<span class="lh-more">+${g.old.length - 18} more</span>` : '');
    const metaShown = g.meta.slice(-8);
    const metaBlocks = (g.meta.length > 8 ? `<span class="lh-more">+${g.meta.length - 8} earlier</span>` : '') + metaShown.map(m => blk('meta', `${metaName(m.n)} <small>${m.op}</small>`, `${metaFull(m.n)} — ${m.op}`)).join('');
    return `<div class="lh-lane"><div class="lh-lane-h"><i data-lucide="file" style="width:13px;height:13px;"></i>Current data files <span>(what a reader opens)</span></div><div class="lh-blks">${data}</div></div>
      ${side === 'mor' ? `<div class="lh-lane"><div class="lh-lane-h"><i data-lucide="eraser" style="width:13px;height:13px;"></i>${TBL.fmt === 'delta' ? 'Deletion vectors' : 'Position-delete files'} <span>(merged into every read)</span></div><div class="lh-blks">${delBlocks || '<span class="lh-empty">none — no unmerged updates</span>'}</div></div>` : ''}
      <div class="lh-lane"><div class="lh-lane-h"><i data-lucide="history" style="width:13px;height:13px;"></i>Replaced old versions <span>(time travel only)</span></div><div class="lh-blks">${oldBlocks || '<span class="lh-empty">none yet</span>'}</div></div>
      <div class="lh-lane"><div class="lh-lane-h"><i data-lucide="${TBL.fmt === 'delta' ? 'scroll-text' : 'list-tree'}" style="width:13px;height:13px;"></i>${TBL.fmt === 'delta' ? 'Commit log (_delta_log)' : 'Metadata (snapshots + manifests)'}</div><div class="lh-blks">${metaBlocks}</div></div>`;
  }
  function cmGridRender(flash) {
    const g = cmGrid;
    $('lhLanesCow').innerHTML = lanes('cow', 'cow', flash);
    $('lhLanesMor').innerHTML = lanes('mor', 'mor', flash);
    [['cow', 'Cow'], ['mor', 'Mor']].forEach(([k, K]) => {
      const x = g[k];
      $('lhGStat' + K).innerHTML = `Commits <b>${x.meta.length - 1}</b> · written by these commands <b>${fmtMB(x.written)}</b> · a query opens <b>${x.data.length}</b> data file(s)${k === 'mor' ? ` + <b>${x.dels.length}</b> ${TBL.fmt === 'delta' ? 'deletion vector(s)' : 'delete file(s)'}` : ''}`;
      $('lhLog' + K).innerHTML = x.log.slice(-4).map(l => `<li><span>${TBL.fmt === 'delta' ? String(l.n).padStart(3, '0') + '.json' : 'snap-' + (l.n + 1)}</span>${l.t}</li>`).join('');
    });
    icons();
  }
  function commit(side, op, text) {
    const x = cmGrid[side], n = x.meta.length;
    x.meta.push({ n, op }); x.log.push({ n, t: text });
  }
  function cmInsert() {
    cancel('cm');
    ['cow', 'mor'].forEach(k => {
      const x = cmGrid[k], id = x.next++;
      x.data.push({ id, ver: 1, kind: 'insert' }); x.written += INS_MB;
      commit(k, 'INSERT', `INSERT → +1 new data file <b>f${id}</b> (${INS_MB} MB). Existing files untouched.`);
    });
    cmGridRender();
  }
  function cmUpdate() {
    cancel('cm');
    const m = cowMor(Object.assign({}, CM, GRID, { commits: 1 }));
    const g = cmGrid, n = m.touched;
    const pick = side => {   // same row positions in both tables
      const pool = g[side].data.filter(f => f.kind !== 'upd').map(f => f.id), pos = [];
      if (CM.spread === 'clustered') { const start = (g.commits * 3) % pool.length; for (let i = 0; i < n; i++) pos.push(pool[(start + i) % pool.length]); }
      else { const step = pool.length / n, off = g.commits % Math.max(1, Math.floor(step)); for (let i = 0; i < n; i++) pos.push(pool[Math.floor(i * step + off) % pool.length]); }
      return [...new Set(pos)];
    };
    const ids = pick('cow'), idsM = pick('mor');
    cmGridRender({ cow: ids, mor: idsM });
    later('cm', () => {
      g.commits++;
      // COW: rewrite every touched file in full
      const c = g.cow, cn = c.meta.length;
      ids.forEach(id => { const f = c.data.find(x => x.id === id); c.old.push({ label: `f${id}·v${f.ver}`, at: cn }); f.ver++; f.kind = 'rewritten'; });
      c.written += m.cowWrite;
      commit('cow', 'UPDATE', `UPDATE → rewrote <b>${ids.length}</b> file(s) in full (${ids.slice(0, 6).map(i => 'f' + i).join(', ')}${ids.length > 6 ? '…' : ''}) = ${fmtMB(m.cowWrite)}; old versions kept.`);
      // MOR: delete markers + one new-rows file
      const r = g.mor, rn = r.meta.length;
      if (TBL.fmt === 'delta') idsM.forEach(id => { const dv = r.dels.find(d => d.targets[0] === id); if (dv) dv.ver++; else r.dels.push({ targets: [id], ver: 1, n: rn }); });
      else r.dels.push({ targets: idsM.slice(), n: rn, ver: 1 });
      const u = ++r.updN;
      r.data.push({ id: u, ver: 1, kind: 'upd' });
      r.written += m.morWrite;
      commit('mor', 'UPDATE', `UPDATE → ${TBL.fmt === 'delta' ? `<b>${idsM.length}</b> deletion vector(s)` : `<b>1</b> position-delete file`} for ${idsM.length} file(s) + new-rows file <b>U${u}</b> = ${fmtMB(m.morWrite)}.`);
      cmGridRender();
    }, 800);
  }
  function cmCompact() {
    cancel('cm');
    const g = cmGrid;
    // MOR: fold delete markers + new-rows files back into rewritten data files
    const r = g.mor, rn = r.meta.length;
    const hit = [...new Set(r.dels.flatMap(d => d.targets))];
    const upds = r.data.filter(f => f.kind === 'upd');
    // COW: only small files to bin-pack (INSERT files)
    const c = g.cow, cn = c.meta.length;
    const smallC = c.data.filter(f => f.kind === 'insert');
    cmGridRender({ mor: hit, cow: smallC.map(f => f.id) });
    later('cm', () => {
      if (hit.length || upds.length) {
        hit.forEach(id => { const f = r.data.find(x => x.id === id); if (!f) return; r.old.push({ label: `f${id}·v${f.ver}`, at: rn }); f.ver++; f.kind = 'compacted'; });
        upds.forEach(f => r.old.push({ label: `U${f.id}`, at: rn }));
        r.data = r.data.filter(f => f.kind !== 'upd');
        r.dels = []; r.written += hit.length * GRID.fileMB;
        commit('mor', 'COMPACT', `Compaction → rewrote <b>${hit.length}</b> file(s) with deletes applied and new rows merged in; ${upds.length} new-rows file(s) and all delete markers retired.`);
      } else commit('mor', 'COMPACT', 'Compaction → nothing to merge (no delete markers).');
      if (smallC.length >= 2) {
        smallC.forEach(f => c.old.push({ label: `f${f.id}`, at: cn }));
        const id = c.next++;
        c.data = c.data.filter(f => f.kind !== 'insert'); c.data.push({ id, ver: 1, kind: 'insert' });
        c.written += smallC.length * INS_MB;
        commit('cow', 'COMPACT', `Compaction → bin-packed ${smallC.length} small INSERT files into <b>f${id}</b>. COW never has delete markers to merge.`);
      } else commit('cow', 'COMPACT', 'Compaction → nothing to do: COW has no delete markers, and there are no small files to bin-pack.');
      cmGridRender();
    }, 800);
  }
  function cmRender() {
    const m = cowMor(Object.assign({}, CM, GRID));
    $('lhUOut').textContent = `${CM.updPct}% (${fmtN(m.changedRows)} rows)`;
    $('lhKOut').textContent = CM.compactEvery || 'never';
    $('lhROut').textContent = CM.readsPerDay; $('lhWOut').textContent = CM.writesPerDay;
    const max = Math.max(m.cowWrite, m.morWrite);
    $('lhWBars').innerHTML = [['COW', m.cowWrite, 'var(--lh-cow)', `${m.touched} file(s) rewritten in full`], ['MOR', m.morWrite, 'var(--lh-mor)', `${m.touched} ${TBL.fmt === 'delta' ? 'deletion vector(s)' : 'position-delete file(s)'} of ~${fmtMB(m.delFileMB)} + ${fmtMB(m.changedMB)} of new rows`]]
      .map(([l, v, c, s]) => `<div class="lh-hbar"><span>${l}</span><div class="tr"><div class="fi" style="width:${Math.max(0.6, v / max * 100)}%;background:${c}"></div></div><b>${fmtMB(v)}</b></div><div class="lh-sub">${s}</div>`).join('');
    $('lhCMK').innerHTML = [['Changed data', fmtMB(m.changedMB)], ['Files touched', `${m.touched} / ${GRID.files}`], ['Write amplification', `COW ${m.ampCow >= 100 ? Math.round(m.ampCow) : m.ampCow.toFixed(1)}× · MOR ${m.ampMor.toFixed(1)}×`]].map(([l, v]) => `<div class="lh-kpi"><span>${l}</span><b>${v}</b></div>`).join('');
    // read cost chart (SVG, one y-axis, MB scanned-equivalent)
    const host = $('lhRCost'), Wd = Math.max(280, host.clientWidth || 460), H = 210, pl = 54, pr = 12, pt = 10, pb = 26, iw = Wd - pl - pr, ih = H - pt - pb;
    const s = m.series, ymax = Math.max(...s.map(p => Math.max(p.cow, p.mor))) * 1.08, ymin = 0;
    const x = c => pl + (c - 1) / Math.max(1, s.length - 1) * iw, y = v => pt + ih - (v - ymin) / (ymax - ymin) * ih;
    let svg = `<svg width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Read cost per query by commit">`;
    for (let i = 0; i <= 4; i++) { const v = ymax * i / 4; svg += `<line x1="${pl}" x2="${Wd - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--lh-grid)"/><text x="${pl - 6}" y="${y(v) + 3}" font-size="10" text-anchor="end" fill="var(--lh-axis)">${fmtMB(v)}</text>`; }
    [1, Math.ceil(s.length / 2), s.length].forEach((c, i) => { svg += `<text x="${x(c)}" y="${H - 8}" font-size="10" text-anchor="${['start', 'middle', 'end'][i]}" fill="var(--lh-axis)">commit ${c}</text>`; });
    s.filter(p => p.compacted).forEach(p => { svg += `<text x="${x(p.c)}" y="${pt + 9}" font-size="10" text-anchor="middle" fill="var(--lh-mor)">▼</text>`; });
    svg += `<path d="${s.map((p, i) => (i ? 'L' : 'M') + x(p.c).toFixed(1) + ',' + y(p.cow).toFixed(1)).join(' ')}" fill="none" stroke="var(--lh-cow)" stroke-width="2"/>`;
    svg += `<path d="${s.map((p, i) => (i ? 'L' : 'M') + x(p.c).toFixed(1) + ',' + y(p.mor).toFixed(1)).join(' ')}" fill="none" stroke="var(--lh-mor)" stroke-width="2"/>`;
    host.innerHTML = svg + '</svg>';
    const cowBetter = m.cowDaily <= m.morDaily, ratio = cowBetter ? m.morDaily / m.cowDaily : m.cowDaily / m.morDaily;
    $('lhRec').innerHTML = `<div class="lh-card-t">Recommendation for this workload</div>
      <div class="lh-rec ${cowBetter ? 'cow' : 'mor'}"><span class="lh-tag ${cowBetter ? 'cow' : 'mor'}">${cowBetter ? 'COW' : 'MOR'}</span><div><b>${cowBetter ? 'Copy-on-Write' : 'Merge-on-Read'}</b> moves ~${ratio.toFixed(1)}× less data per day
      (${fmtMB(Math.min(m.cowDaily, m.morDaily))} vs ${fmtMB(Math.max(m.cowDaily, m.morDaily))}) at ${CM.writesPerDay} writes and ${CM.readsPerDay} reads per day.</div></div>
      <ul class="lh-list"><li>${CM.readsPerDay >= CM.writesPerDay * 2 ? `Read-heavy (${CM.readsPerDay} reads vs ${CM.writesPerDay} writes): every query pays the MOR merge, so rewriting once at write time tends to win unless updates touch many files.` : CM.writesPerDay >= CM.readsPerDay * 2 ? `Write-heavy (${CM.writesPerDay} writes vs ${CM.readsPerDay} reads): rewriting whole files for every small change dominates — MOR keeps commits small and fast.` : 'Balanced reads and writes: the deciding factor is how many files each update touches and how often you compact.'}</li>
      <li>${CM.compactEvery ? `Compaction every ${CM.compactEvery} commits caps MOR read cost at ~${fmtMB(Math.max(...m.series.map(p => p.mor)))} per query.` : '<b>No compaction:</b> MOR read cost grows without limit — always schedule compaction.'}</li>
      <li>${CM.spread === 'scattered' ? 'Scattered changes touch many files, which makes COW rewrites very expensive.' : 'Clustered changes touch few files, so COW stays affordable. Clustering by the update key (Z-order / sort) helps both.'}</li></ul>`;
  }
  function cmCode() {
    const C = {
      iceberg: `-- per-operation strategy (default: copy-on-write)
ALTER TABLE db.sales SET TBLPROPERTIES (
  'write.update.mode' = 'merge-on-read',
  'write.delete.mode' = 'merge-on-read',
  'write.merge.mode'  = 'merge-on-read');
-- MOR writes position-delete files (Spark) or equality deletes (Flink)

-- compaction folds deletes back into data files
CALL catalog.system.rewrite_data_files(table => 'db.sales',
     options => map('delete-file-threshold', '2'));
CALL catalog.system.rewrite_position_delete_files('db.sales');`,
      delta: `-- Delta is copy-on-write by default.
-- Deletion vectors make DELETE / UPDATE / MERGE merge-on-read:
ALTER TABLE sales SET TBLPROPERTIES ('delta.enableDeletionVectors' = true);

UPDATE sales SET amount = amount * 1.1 WHERE customer_id = 'C42';
-- -> writes a small deletion vector (.bin) instead of rewriting the file

-- materialize deletion vectors (rewrite files)
OPTIMIZE sales;
REORG TABLE sales APPLY (PURGE);`,
      hudi: `# Hudi exposes the choice as the table type
(df.write.format("hudi")
   .option("hoodie.table.name", "sales")
   .option("hoodie.datasource.write.table.type", "MERGE_ON_READ")  # or COPY_ON_WRITE
   .option("hoodie.datasource.write.recordkey.field", "order_id")
   .option("hoodie.compact.inline", "true")
   .option("hoodie.compact.inline.max.delta.commits", "10")
   .mode("append").save("s3://lake/hudi/sales"))
# MOR: base Parquet + row-based log files, merged at read / compaction`,
      plain: `# Plain Parquet has no row-level operations: "copy-on-write by hand".
day = spark.read.parquet("s3://lake/sales/date=2026-10-13")
fixed = day.withColumn("amount",
          F.when(F.col("customer_id") == "C42", F.col("amount") * 1.1)
           .otherwise(F.col("amount")))
# NOT atomic: readers see a missing/half-written folder during the overwrite
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
fixed.write.mode("overwrite").parquet("s3://lake/sales_tmp/date=2026-10-13")  # then swap folders`
    };
    $('lhCMCode').innerHTML = code(C[CM.fmt]);
  }

  // =====================================================================
  // 4. LAZY DAG & AQE MINI-LAB (fixed version of the original demo)
  // =====================================================================
  const DAG = [
    ['SESSION', 'Spark 3.5 · 4 executors × 4 cores · AQE on'],
    ['LAZY', 'df.filter(...).select(...).groupBy("region") recorded — nothing has run yet'],
    ['ACTION', '.count() triggers Job 1; Catalyst builds the optimized physical plan'],
    ['STAGE 1', 'Scan + filter + partial aggregate: narrow, pipelined, no network'],
    ['SHUFFLE', 'Exchange hashpartitioning(region, 200): map outputs written to local disk'],
    ['AQE', 'Runtime stats: 200 partitions total 410 MB → coalesced to 8 partitions'],
    ['STAGE 2', 'Final aggregate on 8 tasks'],
    ['DONE', 'Job finished · 24,500,000 rows counted']
  ];
  function dagUI() {
    $('lhDag').innerHTML = `<div class="lh-card"><div class="lh-row" style="justify-content:space-between;margin-bottom:12px">
      <div class="lh-row"><span class="lh-pill" id="lhDagState">Driver idle</span><span class="lh-note" style="margin:0">Transformations are lazy; only an action creates a job.</span></div>
      <div class="lh-row"><button type="button" class="lh-btn primary" id="lhDagGo"><i data-lucide="zap" style="width:16px;height:16px;"></i>Trigger action (.count())</button><button type="button" class="lh-btn ghost" id="lhDagReset"><i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>Reset</button></div></div>
      <div class="lh-dagflow" id="lhDagFlow">${['Driver: plan', 'Stage 1 · 32 tasks', 'Shuffle', 'AQE coalesce', 'Stage 2 · 8 tasks'].map((s, i) => `<span class="lh-dagnode" data-n="${i}">${s}</span>`).join('<i data-lucide="arrow-right" style="width:16px;height:16px;"></i>')}</div>
      <div class="lh-term" id="lhTerm" aria-live="polite"></div>
      <p class="lh-note">Go deeper in the <a href="shuffle-ops-lab.html">Shuffle Operations Lab</a> and <a href="cluster-architecture.html#sec-memory">Work Distribution Studio</a>.</p></div>`;
    $('lhDagGo').addEventListener('click', dagRun);
    $('lhDagReset').addEventListener('click', dagReset);
    dagReset();
  }
  function dagReset() { cancel('dag'); $('lhTerm').textContent = '[READY] Transformations recorded. Click "Trigger action".'; $('lhDagState').textContent = 'Driver idle'; $('lhDagFlow').querySelectorAll('.lh-dagnode').forEach(n => n.classList.remove('on', 'done')); }
  function dagRun() {
    dagReset(); $('lhTerm').textContent = '';
    const nodeAt = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4 };
    DAG.forEach(([tag, msg], i) => later('dag', () => {
      $('lhTerm').textContent += `[${tag}] ${msg}\n`; $('lhTerm').scrollTop = 1e6;
      $('lhDagState').textContent = i === DAG.length - 1 ? 'Job complete' : 'Running: ' + tag;
      const n = nodeAt[i];
      if (n !== undefined) $('lhDagFlow').querySelectorAll('.lh-dagnode').forEach((el, j) => { el.classList.toggle('on', j === n); if (j < n) el.classList.add('done'); });
      if (i === DAG.length - 1) $('lhDagFlow').querySelectorAll('.lh-dagnode').forEach(el => { el.classList.remove('on'); el.classList.add('done'); });
    }, 300 + i * 700));
  }

  // ---------------- speed + init ----------------
  function speedUI() {
    const el = $('lhSpeed');
    el.addEventListener('input', () => { speed = SPEEDS[+el.value]; $('lhSpeedOut').textContent = speed + '×'; el.setAttribute('aria-valuetext', speed + '×'); });
  }
  function init() {
    timelineUI(); matrixUI(); readUI(); cmUI(); dagUI(); speedUI(); icons();
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(cmRender, 200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
