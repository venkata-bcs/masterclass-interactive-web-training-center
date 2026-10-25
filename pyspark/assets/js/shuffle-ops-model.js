/* =========================================================================
   Shuffle Operations Lab — simulation model (pure functions, no DOM)
   Illustrative cost model of how Spark turns a DataFrame pipeline into
   stages, exchanges (shuffles) and tasks for a given source, target,
   data volume, data shape and cluster/config. Numbers are teaching
   approximations, not benchmarks.
   ========================================================================= */
(function (root) {
  'use strict';

  const KB = 1024, MB = KB * 1024, GB = MB * 1024, TB = GB * 1024;

  const VOLS = [100 * MB, 500 * MB, 1 * GB, 10 * GB, 50 * GB, 200 * GB, 500 * GB, 1 * TB, 2 * TB, 5 * TB, 10 * TB];
  const VOL_LABELS = ['100 MB', '500 MB', '1 GB', '10 GB', '50 GB', '200 GB', '500 GB', '1 TB', '2 TB', '5 TB', '10 TB'];

  const CARD = {
    low: { K: 40, label: 'Low (~40 keys, e.g. country)' },
    medium: { K: 50000, label: 'Medium (~50K keys, e.g. store_id)' },
    high: { K: 50000000, label: 'High (~50M keys, e.g. customer_id)' }
  };
  const SKEW = { none: 0, moderate: 0.08, severe: 0.35 };

  const SRC = {
    parquet: { label: 'Parquet / Delta on S3 · ADLS · GCS', kind: 'file', split: true, columnar: true, pushdown: true, fileSize: 128 * MB },
    smallfiles: { label: 'Small files (~256 KB each, landing zone)', kind: 'file', split: true, columnar: true, pushdown: true, fileSize: 256 * KB },
    csvgz: { label: 'CSV.gz drops (unsplittable, 4 GB files)', kind: 'file', split: false, columnar: false, pushdown: false, fileSize: 4 * GB },
    jdbc1: { label: 'RDBMS via JDBC — single connection', kind: 'jdbc', columnar: true, pushdown: true },
    jdbcN: { label: 'RDBMS via JDBC — partitionColumn + numPartitions', kind: 'jdbc', columnar: true, pushdown: true },
    mpp: { label: 'Snowflake / Redshift / BigQuery connector', kind: 'mpp', columnar: true, pushdown: true }
  };

  const TGT = {
    count: { label: 'Action only: count() / display()' },
    parquet: { label: 'Delta / Parquet table (overwrite)' },
    partitioned: { label: 'Parquet partitionBy("event_date")' },
    delta_merge: { label: 'Delta MERGE INTO (upsert)' },
    jdbc: { label: 'RDBMS via JDBC write' },
    snowflake: { label: 'Snowflake / MPP via staged COPY' }
  };

  const OPS = {
    select: { group: 'Narrow (no shuffle)', label: 'select(cols) — projection', wide: false },
    filter: { group: 'Narrow (no shuffle)', label: 'filter() + select() — predicate pushdown', wide: false },
    withcol: { group: 'Narrow (no shuffle)', label: 'withColumn / when / cast', wide: false },
    distinct: { group: 'Aggregations', label: 'distinct() / dropDuplicates()', wide: true },
    groupby: { group: 'Aggregations', label: 'groupBy().agg(sum, count) — partial agg', wide: true },
    groupby_collect: { group: 'Aggregations', label: 'groupBy().agg(collect_list) — non-reducing', wide: true },
    orderby: { group: 'Sorting & windows', label: 'orderBy() — global sort', wide: true },
    window: { group: 'Sorting & windows', label: 'Window.partitionBy().orderBy()', wide: true },
    join_small: { group: 'Joins', label: 'join small dimension (40 MB)', wide: true },
    join_large: { group: 'Joins', label: 'join large ⋈ large (sort-merge)', wide: true },
    repartition: { group: 'Partition control', label: 'repartition(N) — round robin', wide: true },
    coalesce: { group: 'Partition control', label: 'coalesce(8) — no shuffle', wide: false },
    complex: { group: 'Pipeline', label: 'filter → join → groupBy → window → orderBy', wide: true }
  };

  // ---------- helpers ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sum(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; }
  function median(a) {
    const nz = Array.from(a).sort((x, y) => x - y);
    return nz.length ? nz[Math.floor(nz.length / 2)] : 0;
  }
  function fmtB(b) {
    if (!isFinite(b)) return '—';
    if (b < KB) return Math.round(b) + ' B';
    const u = ['KB', 'MB', 'GB', 'TB', 'PB']; let i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
    return (b >= 100 ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2)) + ' ' + u[i];
  }
  function fmtT(s) {
    if (s < 1) return Math.max(1, Math.round(s * 1000)) + ' ms';
    if (s < 60) return s.toFixed(1) + ' s';
    if (s < 3600) return (s / 60).toFixed(1) + ' min';
    return (s / 3600).toFixed(2) + ' h';
  }
  function fmtN(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
    return Math.round(n).toLocaleString('en-US');
  }

  // Partition-size generators -------------------------------------------
  function hashParts(D, N, K, h, seed) {
    const r = rng(seed), arr = new Array(N).fill(0), base = D * (1 - h);
    let tot = 0;
    if (K <= 20000) {
      for (let k = 0; k < K; k++) { const x = 0.5 + r(); arr[Math.floor(r() * N)] += x; tot += x; }
    } else {
      for (let i = 0; i < N; i++) { const x = 1 + 0.25 * (r() + r() + r() - 1.5); arr[i] = x; tot += x; }
    }
    for (let i = 0; i < N; i++) arr[i] = tot ? arr[i] / tot * base : 0;
    if (h > 0) {
      let p = Math.floor(r() * N);
      for (let j = 0; j < N && arr[p] === 0; j++) p = (p + 1) % N; // hot key lands on a real key's partition
      arr[p] += D * h;
    }
    return arr;
  }
  function rangeParts(D, N, h, seed) {
    const r = rng(seed), arr = new Array(N), base = D * (1 - h);
    let tot = 0;
    for (let i = 0; i < N; i++) { arr[i] = 1 + 0.16 * (r() - 0.5); tot += arr[i]; }
    for (let i = 0; i < N; i++) arr[i] = arr[i] / tot * base;
    if (h > 0) arr[N - 1] += D * h; // e.g. NULLs sort last and cannot be split
    return arr;
  }
  function evenParts(D, N) { return new Array(N).fill(D / N); }

  function aqeCoalesce(arr, P) {
    const total = sum(arr);
    const target = Math.max(1 * MB, Math.min(64 * MB, total / Math.max(1, P)));
    const out = []; let cur = 0, cnt = 0;
    for (const s of arr) {
      if (cnt > 0 && s > 0 && cur + s > target) { out.push(cur); cur = 0; cnt = 0; }
      cur += s; cnt++;
    }
    if (cnt) out.push(cur);
    return { arr: out, target };
  }

  function aqeSkewSplit(arr) {
    const med = median(arr.filter(x => x > 0));
    const thr = Math.max(256 * MB, 5 * med);
    const out = []; let splits = 0, pieces = 0;
    for (const s of arr) {
      if (s > thr) {
        const k = Math.ceil(s / (64 * MB));
        for (let i = 0; i < k; i++) out.push(s / k);
        splits++; pieces += k;
      } else out.push(s);
    }
    return { arr: out, splits, pieces, thr };
  }

  // Explain-plan tree renderer
  const node = (t, ...kids) => ({ t, kids });
  function renderTree(n) {
    const out = [];
    (function rec(x, prefix, conn) {
      out.push(prefix + conn + x.t);
      const kids = x.kids || [];
      const childPrefix = prefix + (conn === '' ? '' : conn === ':- ' ? ':  ' : '   ');
      kids.forEach((k, i) => rec(k, childPrefix, i === kids.length - 1 ? '+- ' : ':- '));
    })(n, '', '');
    return out;
  }

  // ---------- model building blocks ----------
  function newStage(m, props) {
    const s = Object.assign({
      id: m.stages.length, name: '', ops: [], kind: 'scan', arr: null, n: 0, avg: 0,
      rate: 120 * MB, fixed: 0.05, perTaskExtraFn: null, memHeavy: false,
      outRatio: 1, shuffleWrite: 0, writeBytes: 0, writeFiles: 0, writeRate: 0, writeFixedPerFile: 0,
      inputs: [], job: 0
    }, props);
    if (s.arr) { s.n = s.arr.length; s.avg = s.n ? sum(s.arr) / s.n : 0; }
    m.stages.push(s);
    return s;
  }
  function stageBytes(s) { return s.arr ? sum(s.arr) : s.n * s.avg; }

  // Scan of the main fact table from the selected source
  function scan(m, cfg) {
    const st = m.st, src = SRC[st.source], V = m.V, P = m.P;
    const cols = cfg.cols, sel = cfg.sel;
    const io = V * (src.columnar ? cols : 1) * (src.pushdown && sel < 1 ? Math.min(1, sel * 1.6) : 1);
    const out = V * cols * sel;
    let n, rate = 120 * MB, fixed = 0.05, arr = null, avg = 0, name = 'Scan orders';
    const r = rng(7 + st.volIdx);
    m.scanInfo = { io, out };
    if (src.kind === 'file') {
      const maxSplit = Math.min(128 * MB, Math.max(4 * MB, V / P));
      m.scanInfo.maxSplit = maxSplit;
      if (src.split) {
        const nFiles = Math.max(1, Math.ceil(V / src.fileSize));
        m.scanInfo.nFiles = nFiles;
        if (src.fileSize < maxSplit) {
          const perPart = Math.max(1, Math.floor(maxSplit / (src.fileSize + 4 * MB)));
          n = Math.ceil(nFiles / perPart);
          fixed += perPart * 0.025; // one object-store GET + footer read per file
          m.driverSec += nFiles / 1000 * 0.15 + nFiles * 0.0002;
          m.listingSec = nFiles / 1000 * 0.15 + nFiles * 0.0002;
          m.scanInfo.filesPerTask = perPart;
        } else {
          n = Math.ceil(V / maxSplit);
          m.driverSec += nFiles / 1000 * 0.15;
        }
        name = st.source === 'smallfiles' ? 'Scan small files' : 'Scan Parquet/Delta';
      } else {
        const nFiles = Math.max(1, Math.ceil(V / src.fileSize));
        m.scanInfo.nFiles = nFiles;
        n = nFiles; rate = 25 * MB; name = 'Scan CSV.gz (1 task per file)';
        if (n <= 60000) {
          arr = [];
          for (let i = 0; i < n; i++) arr.push(i < n - 1 ? src.fileSize : V - src.fileSize * (n - 1));
          const scale = io / V; arr = arr.map(x => x * scale);
        }
      }
    } else if (src.kind === 'jdbc') {
      n = st.source === 'jdbc1' ? 1 : Math.min(P, 64);
      rate = Math.min(25 * MB, 300 * MB / n);
      name = st.source === 'jdbc1' ? 'JDBC read (1 connection)' : `JDBC read (${n} connections)`;
      m.scanInfo.connections = n;
      if (n > 1) {
        arr = [];
        for (let i = 0; i < n; i++) arr.push(io * (1 - m.h) / n * (0.9 + 0.2 * r()));
        arr[Math.floor(n / 3)] += io * m.h; // hot range of partitionColumn
      } else arr = [io];
    } else { // mpp staged unload
      const unload = io / (1.2 * GB);
      m.driverSec += unload + 4;
      m.unloadSec = unload + 4;
      n = Math.max(1, Math.ceil(io / (128 * MB)));
      rate = 150 * MB; name = 'Read staged unload (Parquet)';
    }
    if (!arr) {
      if (n <= 60000) { arr = []; for (let i = 0; i < n; i++) arr.push(io / n * (0.92 + 0.16 * r())); }
      else avg = io / n;
    }
    const s = newStage(m, { name, kind: 'scan', arr, n: arr ? arr.length : n, avg: arr ? 0 : avg, rate, fixed, outRatio: io ? out / io : 0, ops: cfg.ops || [] });
    if (arr) s.avg = sum(arr) / arr.length;
    return s;
  }

  // Scan of a Delta dimension / second table (always Parquet/Delta)
  function scanTable(m, bytes, name, ops) {
    const P = m.P, maxSplit = Math.min(128 * MB, Math.max(4 * MB, bytes / P));
    const n = Math.max(1, Math.ceil(bytes / maxSplit));
    const s = newStage(m, { name, kind: 'scan', rate: 120 * MB, ops: ops || [] });
    if (n <= 60000) { s.arr = evenParts(bytes, n); s.n = n; s.avg = bytes / n; } else { s.n = n; s.avg = bytes / n; }
    return s;
  }

  function partitionsFor(m, D) {
    const p = m.st.parts;
    if (p === 'auto') return Math.min(100000, Math.max(1, Math.ceil(D / (128 * MB)), Math.min(m.P, Math.ceil(D / (4 * MB)))));
    return p;
  }

  // Create an exchange fed by `from` stage(s) carrying D bytes
  function exchange(m, from, cfg) {
    const N = cfg.N || partitionsFor(m, cfg.D);
    const seed = 1000 + m.exchanges.length * 97 + m.st.volIdx * 13 + (cfg.seedAdd || 0);
    let arr;
    if (cfg.kind === 'hash') arr = hashParts(cfg.D, N, cfg.K, cfg.h || 0, seed);
    else if (cfg.kind === 'range') arr = rangeParts(cfg.D, N, cfg.h || 0, seed);
    else arr = evenParts(cfg.D, N);
    const ex = { id: m.exchanges.length, kind: cfg.kind, label: cfg.label, N, D: cfg.D, arr, arrFinal: arr, aqe: null, skew: null, from };
    (Array.isArray(from) ? from : [from]).forEach((s, i) => { s.shuffleWrite += cfg.writes ? cfg.writes[i] : cfg.D; });
    if (m.st.aqe && cfg.kind !== 'rr') {
      const c = aqeCoalesce(arr, m.P);
      if (c.arr.length < arr.length) { ex.aqe = { before: arr.length, after: c.arr.length, target: c.target }; ex.arrFinal = c.arr; }
    }
    m.exchanges.push(ex);
    return ex;
  }

  function reduceStage(m, ex, props) {
    const s = newStage(m, Object.assign({ kind: 'reduce', arr: ex.arrFinal.slice(), inputs: [ex] }, props));
    s.n = s.arr.length; s.avg = s.n ? sum(s.arr) / s.n : 0;
    return s;
  }

  const CPU = { agg: 150 * MB, sort: 60 * MB, join: 70 * MB, window: 55 * MB, rr: 160 * MB, narrow: 140 * MB };

  // ---------- operations ----------
  function readCode(st, nump) {
    switch (st.source) {
      case 'parquet': return 'orders = spark.read.format("delta").load("s3://lake/silver/orders")';
      case 'smallfiles': return 'orders = spark.read.parquet("s3://landing/orders_raw/")   # 100Ks of ~256 KB files';
      case 'csvgz': return 'orders = (spark.read.option("header", True).schema(orders_schema)\n          .csv("s3://drops/orders/*.csv.gz"))          # gzip = 1 task per file';
      case 'jdbc1': return 'orders = spark.read.jdbc(url, "sales.orders", properties=props)   # 1 connection!';
      case 'jdbcN': return 'orders = spark.read.jdbc(url, "sales.orders", column="order_id",\n                         lowerBound=1, upperBound=500_000_000,\n                         numPartitions=' + nump + ', properties={**props, "fetchsize": "10000"})';
      case 'mpp': return 'orders = (spark.read.format("snowflake").options(**sf_opts)\n          .option("dbtable", "SALES.ORDERS").load())          # UNLOAD -> stage -> Parquet';
    }
  }
  function scanNode(m, cols, filters) {
    const st = m.st, src = SRC[st.source];
    const c = cols.join(','), pf = filters && filters.length && src.pushdown ? filters.join(', ') : '';
    switch (st.source) {
      case 'parquet': return node(`FileScan parquet [${c}] Batched: true, PushedFilters: [${pf}], Location: PreparedDeltaFileIndex[s3://lake/silver/orders], ReadSchema: struct<${c}>`);
      case 'smallfiles': return node(`FileScan parquet [${c}] Location: InMemoryFileIndex(${fmtN(m.scanInfo.nFiles)} files)[s3://landing/orders_raw], PushedFilters: [${pf}]`);
      case 'csvgz': return node(`FileScan csv [${c}] Location: InMemoryFileIndex(${fmtN(m.scanInfo.nFiles)} paths)[s3://drops/orders/*.csv.gz], PushedFilters: [], ReadSchema: struct<all 24 columns>`);
      case 'jdbc1': return node(`Scan JDBCRelation(sales.orders) [numPartitions=1] [${c}] PushedFilters: [${pf}]`);
      case 'jdbcN': return node(`Scan JDBCRelation(sales.orders) [numPartitions=${m.scanInfo.connections}] [${c}] PushedFilters: [${pf}]`);
      case 'mpp': return node(`Scan SnowflakeRelation [${c}] PushedFilters: [${pf}] (UNLOAD to @stage, then Parquet read)`);
    }
  }
  function colNode(m, inner) {
    const src = SRC[m.st.source];
    return src.kind === 'file' && src.split ? node('ColumnarToRow', inner) : inner;
  }
  function exText(m, ex, keyText) {
    const k = ex.kind === 'hash' ? `hashpartitioning(${keyText}, ${ex.N})` : ex.kind === 'range' ? `rangepartitioning(${keyText}, ${ex.N})` : `RoundRobinPartitioning(${ex.N})`;
    return `Exchange ${k}, ${ex.kind === 'rr' ? 'REPARTITION_BY_NUM' : 'ENSURE_REQUIREMENTS'}  ◀ SHUFFLE`;
  }
  function readNode(m, ex, inner) {
    if (ex.skew && ex.skew.splits) return node(`AQEShuffleRead coalesced and skewed (${ex.skew.splits} skewed → ${ex.skew.pieces} splits)`, inner);
    if (ex.aqe) return node(`AQEShuffleRead coalesced (${ex.aqe.before} → ${ex.aqe.after})`, inner);
    return inner;
  }

  const ROW = 200; // bytes per row (illustrative)
  function partialAggBytes(D, mapTasks, K, aggRow) {
    const rows = D / ROW, rpt = rows / Math.max(1, mapTasks);
    const keysPerTask = K * (1 - Math.exp(-rpt / K));
    return Math.min(D, mapTasks * keysPerTask * aggRow);
  }

  function build(m) {
    const st = m.st, K = m.K, h = m.h;
    const conf = [];
    conf.push(`spark.conf.set("spark.sql.adaptive.enabled", "${st.aqe}")`);
    conf.push(`spark.conf.set("spark.sql.shuffle.partitions", "${st.parts === 'auto' ? 'auto→sized' : st.parts}")`);
    conf.push(`spark.conf.set("spark.sql.autoBroadcastJoinThreshold", "${st.bcast < 0 ? -1 : fmtB(st.bcast).replace(' ', '').replace('MB', 'm').replace('GB', 'g')}")`);
    m.code.push(...conf, '');
    m.code.push(readCode(st, Math.min(m.P, 64)));
    const keyCol = 'customer_id';
    let s, ex, ex2, s2, last, tree;
    switch (st.op) {
      case 'select': {
        s = scan(m, { cols: 0.3, sel: 1, ops: ['Scan', 'Project'] });
        m.code.push('out = orders.select("order_id", "customer_id", "amount", "event_date")');
        tree = node('*(1) Project [order_id, customer_id, amount, event_date]', colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'event_date'])));
        s.rate = Math.min(s.rate, s.rate); last = s; m.outBytes = m.scanInfo.out; break;
      }
      case 'filter': {
        s = scan(m, { cols: 0.35, sel: 0.1, ops: ['Scan', 'Filter', 'Project'] });
        m.code.push('out = (orders.filter((F.col("event_date") >= "2026-01-01") & (F.col("status") == "SHIPPED"))\n             .select("order_id", "customer_id", "amount", "event_date"))');
        tree = node('*(1) Project [order_id, customer_id, amount, event_date]',
          node('*(1) Filter (isnotnull(event_date) AND (event_date >= 2026-01-01) AND (status = SHIPPED))',
            colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'event_date', 'status'], ['GreaterThanOrEqual(event_date,2026-01-01)', 'EqualTo(status,SHIPPED)']))));
        last = s; m.outBytes = m.scanInfo.out; break;
      }
      case 'withcol': {
        s = scan(m, { cols: 0.5, sel: 1, ops: ['Scan', 'Project (expressions)'] });
        s.rate = Math.min(s.rate, CPU.narrow);
        m.code.push('out = (orders.withColumn("amount_usd", F.col("amount") * F.col("fx_rate"))\n             .withColumn("tier", F.when(F.col("amount") > 1000, "GOLD").otherwise("STD"))\n             .withColumn("order_ts", F.col("order_ts").cast("timestamp")))');
        tree = node('*(1) Project [..., (amount * fx_rate) AS amount_usd, CASE WHEN (amount > 1000) THEN GOLD ELSE STD END AS tier, cast(order_ts as timestamp)]', colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'fx_rate', 'order_ts', '...'])));
        last = s; m.outBytes = m.scanInfo.out * 1.1; break;
      }
      case 'distinct':
      case 'groupby':
      case 'groupby_collect': {
        const isDistinct = st.op === 'distinct', isCollect = st.op === 'groupby_collect';
        s = scan(m, { cols: isDistinct ? 0.15 : 0.2, sel: 1, ops: ['Scan', isCollect ? 'ObjectHashAggregate (partial)' : 'HashAggregate (partial)'] });
        const D = m.scanInfo.out;
        const keys = isDistinct ? Math.max(K, Math.floor(D / ROW * 0.85)) : K;
        const shBytes = isCollect ? D * 0.9 : partialAggBytes(D, s.n, keys, isDistinct ? 40 : 48);
        const hEff = isCollect ? h : (h > 0 ? Math.min(h, (s.n * 48) / Math.max(1, shBytes)) : 0);
        const keyText = isDistinct ? 'customer_id#12, product_id#15' : 'customer_id#12';
        ex = exchange(m, s, { kind: 'hash', D: shBytes, K: Math.min(keys, 5e7), h: hEff, label: isDistinct ? 'customer_id, product_id' : keyCol });
        s2 = reduceStage(m, ex, { name: isCollect ? 'Final ObjectHashAggregate' : 'Final HashAggregate', ops: ['Shuffle read', isCollect ? 'ObjectHashAggregate (final)' : 'HashAggregate (final)'], rate: isCollect ? CPU.sort : CPU.agg, memHeavy: true });
        const outRows = Math.min(keys, D / ROW);
        m.outBytes = isCollect ? D * 0.9 : outRows * (isDistinct ? 40 : 48);
        s2.outRatio = m.outBytes / Math.max(1, sum(s2.arr));
        if (isDistinct) {
          m.code.push('out = orders.select("customer_id", "product_id").distinct()');
          tree = node(`HashAggregate(keys=[customer_id, product_id], functions=[])`,
            readNode(m, ex, node(exText(m, ex, keyText), node('HashAggregate(keys=[customer_id, product_id], functions=[])  ◀ map-side dedupe', colNode(m, scanNode(m, ['customer_id', 'product_id']))))));
        } else if (isCollect) {
          m.code.push('out = (orders.groupBy("customer_id")\n             .agg(F.collect_list("product_id").alias("basket"), F.countDistinct("sku")))');
          tree = node('ObjectHashAggregate(keys=[customer_id], functions=[collect_list(product_id), count(distinct sku)])',
            readNode(m, ex, node(exText(m, ex, keyText), node('ObjectHashAggregate(keys=[customer_id], functions=[partial_collect_list(product_id)])  ◀ no size reduction', colNode(m, scanNode(m, ['customer_id', 'product_id', 'sku']))))));
        } else {
          m.code.push('out = (orders.groupBy("customer_id")\n             .agg(F.sum("amount").alias("revenue"), F.count("*").alias("orders")))');
          tree = node('HashAggregate(keys=[customer_id], functions=[sum(amount), count(1)])',
            readNode(m, ex, node(exText(m, ex, keyText), node('HashAggregate(keys=[customer_id], functions=[partial_sum(amount), partial_count(1)])  ◀ map-side combine', colNode(m, scanNode(m, ['customer_id', 'amount']))))));
        }
        m.partialAgg = !isCollect; last = s2; break;
      }
      case 'orderby': {
        const sample = scan(m, { cols: 0.4, sel: 1, ops: ['Scan', 'RangePartitioner sample (job 0)'] });
        sample.name = 'Job 0 · sample for range bounds'; sample.job = 0; sample.outRatio = 0;
        sample.rate = sample.rate * 1.15;
        s = scan(m, { cols: 0.4, sel: 1, ops: ['Scan', 'Project'] }); s.job = 1;
        m.driverSec -= (m.listingSec || 0); // listing is cached for second job
        const D = m.scanInfo.out;
        ex = exchange(m, s, { kind: 'range', D, h, label: 'amount DESC' });
        s2 = reduceStage(m, ex, { name: 'Sort (global order)', ops: ['Shuffle read', 'Sort'], rate: CPU.sort, memHeavy: true, job: 1 });
        m.code.push('out = orders.orderBy(F.col("amount").desc())');
        tree = node('Sort [amount DESC NULLS LAST], true', readNode(m, ex, node(exText(m, ex, 'amount DESC NULLS LAST'), colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'event_date'])))));
        m.outBytes = D; m.jobs = 2; last = s2; break;
      }
      case 'window': {
        s = scan(m, { cols: 0.4, sel: 1, ops: ['Scan', 'Project'] });
        const D = m.scanInfo.out;
        ex = exchange(m, s, { kind: 'hash', D, K, h, label: keyCol });
        s2 = reduceStage(m, ex, { name: 'Sort + Window', ops: ['Shuffle read', 'Sort', 'Window'], rate: CPU.window, memHeavy: true });
        m.code.push('w = Window.partitionBy("customer_id").orderBy("order_ts")\nout = (orders.withColumn("rn", F.row_number().over(w))\n             .withColumn("prev_amount", F.lag("amount").over(w)))');
        tree = node('Window [row_number() ..., lag(amount, -1, null) ...], [customer_id], [order_ts ASC]',
          node('Sort [customer_id ASC, order_ts ASC], false', readNode(m, ex, node(exText(m, ex, 'customer_id#12'), colNode(m, scanNode(m, ['order_id', 'customer_id', 'order_ts', 'amount']))))));
        m.outBytes = D * 1.05; last = s2; break;
      }
      case 'join_small': {
        const dim = 40 * MB;
        s = scan(m, { cols: 0.4, sel: 1, ops: ['Scan'] });
        const D = m.scanInfo.out;
        const canBcast = st.bcast >= dim;
        m.code.push('dim_product = spark.read.format("delta").load("s3://lake/dim/product")   # ~40 MB');
        m.code.push(canBcast ? 'out = orders.join(dim_product, "product_id")   # auto-broadcast (≤ threshold)' : 'out = orders.join(dim_product, "product_id")\n# tip: orders.join(F.broadcast(dim_product), "product_id") skips the shuffle');
        if (canBcast) {
          const d = scanTable(m, dim, 'Scan dim_product → collect & broadcast', ['Scan', 'BroadcastExchange']);
          d.isBroadcast = true;
          m.broadcastBytes = dim * 1.6 * st.workers; // built hash relation replicated to every executor
          m.driverSec += (dim * 1.6) / (300 * MB);
          s.ops = ['Scan', 'BroadcastHashJoin', 'Project'];
          s.rate = Math.min(s.rate, CPU.narrow * 0.9);
          m.stages.splice(m.stages.indexOf(d), 1); m.stages.unshift(d); m.stages.forEach((x, i) => x.id = i);
          tree = node('*(2) Project [...]', node('*(2) BroadcastHashJoin [product_id], [product_id], Inner, BuildRight',
            colNode(m, scanNode(m, ['order_id', 'product_id', 'amount'])),
            node('BroadcastExchange HashedRelationBroadcastMode(List(product_id))  ◀ no shuffle of orders', node('FileScan parquet dim_product [product_id, name, category]'))));
          m.outBytes = D * 1.2; last = s;
        } else {
          const d = scanTable(m, dim, 'Scan dim_product', ['Scan']);
          ex = exchange(m, s, { kind: 'hash', D, K: 5000, h: h * 0.5, label: 'product_id' });
          ex2 = exchange(m, d, { kind: 'hash', D: dim, K: 5000, h: 0, label: 'product_id', N: ex.N, seedAdd: 0 });
          if (ex.aqe) ex2.arrFinal = aqeCoalesce(ex2.arr, m.P).arr;
          s2 = reduceStage(m, ex, { name: 'SortMergeJoin', ops: ['Shuffle read ×2', 'Sort', 'SortMergeJoin'], rate: CPU.join, memHeavy: true, inputs: [ex, ex2] });
          const add = dim / s2.n; s2.arr = s2.arr.map(x => x + add); s2.avg = sum(s2.arr) / s2.n;
          tree = node('*(5) Project [...]', node('*(5) SortMergeJoin [product_id], [product_id], Inner',
            node('*(2) Sort [product_id ASC]', readNode(m, ex, node(exText(m, ex, 'product_id#20'), colNode(m, scanNode(m, ['order_id', 'product_id', 'amount']))))),
            node('*(4) Sort [product_id ASC]', node(exText(m, ex2, 'product_id#40'), node('FileScan parquet dim_product [product_id, name, category]')))));
          m.outBytes = D * 1.2; last = s2;
        }
        break;
      }
      case 'join_large': {
        s = scan(m, { cols: 0.4, sel: 1, ops: ['Scan'] });
        const D = m.scanInfo.out, dimB = m.V * 0.15 * 0.5;
        const d = scanTable(m, dimB, 'Scan customers', ['Scan']);
        const salt = st.salt && h > 0;
        const SALT = 16;
        let hJoin = h;
        if (salt) { hJoin = h / SALT; }
        ex = exchange(m, s, { kind: 'hash', D, K, h: hJoin, label: salt ? 'customer_id, salt' : keyCol });
        // spread salted hot key across 16 partitions
        if (salt) {
          const r = rng(99), extra = D * (h - hJoin);
          for (let i = 0; i < SALT - 1; i++) ex.arr[Math.floor(r() * ex.N)] += extra / (SALT - 1);
          ex.arrFinal = st.aqe ? aqeCoalesce(ex.arr, m.P).arr : ex.arr;
        }
        const dimShuffled = salt ? dimB * SALT : dimB;
        ex2 = exchange(m, d, { kind: 'hash', D: dimShuffled, K, h: 0, label: salt ? 'customer_id, salt (dim exploded ×16)' : keyCol, N: ex.N });
        let arrF = ex.arrFinal.slice();
        if (st.aqe) {
          const sk = aqeSkewSplit(arrF);
          if (sk.splits) { ex.skew = sk; arrF = sk.arr; }
        }
        s2 = newStage(m, { name: 'SortMergeJoin', kind: 'reduce', arr: arrF, ops: ['Shuffle read ×2', 'Sort', 'SortMergeJoin'], rate: CPU.join, memHeavy: true, inputs: [ex, ex2] });
        const add = dimShuffled / s2.arr.length;
        s2.arr = s2.arr.map(x => x + add); s2.n = s2.arr.length; s2.avg = sum(s2.arr) / s2.n;
        if (salt) {
          m.code.push('customers = spark.read.format("delta").load("s3://lake/silver/customers")');
          m.code.push('N = 16\norders_s = orders.withColumn("salt", (F.rand() * N).cast("int"))\ncust_s = customers.crossJoin(spark.range(N).withColumnRenamed("id", "salt"))\nout = orders_s.join(cust_s, ["customer_id", "salt"]).drop("salt")');
        } else {
          m.code.push('customers = spark.read.format("delta").load("s3://lake/silver/customers")');
          m.code.push('out = orders.join(customers, "customer_id")');
        }
        const kt = salt ? 'customer_id#12, salt#90' : 'customer_id#12';
        tree = node('*(5) Project [...]', node(`*(5) SortMergeJoin [${salt ? 'customer_id, salt' : 'customer_id'}], [${salt ? 'customer_id, salt' : 'customer_id'}], Inner${ex.skew ? ', isSkewJoin=true' : ''}`,
          node('*(2) Sort [customer_id ASC]', readNode(m, ex, node(exText(m, ex, kt), colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'order_ts']))))),
          node('*(4) Sort [customer_id ASC]', node(exText(m, ex2, kt), node('FileScan parquet customers [customer_id, segment, region, ...]')))));
        m.outBytes = D * 1.5; last = s2; m.salted = salt; break;
      }
      case 'repartition': {
        s = scan(m, { cols: 0.5, sel: 1, ops: ['Scan'] });
        const D = m.scanInfo.out, N = st.parts === 'auto' ? partitionsFor(m, D) : st.parts;
        ex = exchange(m, s, { kind: 'rr', D, N, label: 'round robin' });
        s2 = reduceStage(m, ex, { name: 'Repartitioned stage', ops: ['Shuffle read'], rate: CPU.rr });
        m.code.push(`out = orders.repartition(${N})          # full shuffle, even partitions`);
        tree = node(exText(m, ex, ''), colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'event_date', '...'])));
        m.outBytes = D; last = s2; break;
      }
      case 'coalesce': {
        s = scan(m, { cols: 0.5, sel: 1, ops: ['Scan', 'Coalesce 8'] });
        const total = stageBytes(s), n0 = s.n;
        m.coalesceFrom = n0;
        const nT = Math.min(8, n0);
        s.arr = evenParts(total, nT); s.n = nT; s.avg = total / nT; s.fixed += (n0 / nT) * 0.02; s.ops = ['Scan (' + fmtN(n0) + ' splits merged)', 'Coalesce 8'];
        s.name = 'Scan + coalesce(8) — parallelism collapsed';
        m.code.push('out = orders.coalesce(8)                 # no shuffle — but upstream now runs as 8 tasks');
        tree = node('Coalesce 8', colNode(m, scanNode(m, ['order_id', 'customer_id', 'amount', 'event_date', '...'])));
        m.outBytes = m.scanInfo.out; last = s; break;
      }
      case 'complex': {
        s = scan(m, { cols: 0.4, sel: 0.3, ops: ['Scan', 'Filter'] });
        const D = m.scanInfo.out, dimB = Math.max(5 * MB, m.V * 0.02);
        const canBcast = st.bcast >= dimB;
        let joinTree, aggStage, aggEx = null;
        m.code.push('customers = spark.read.format("delta").load("s3://lake/silver/customers")   # ~' + fmtB(dimB));
        m.code.push('w = Window.partitionBy("region").orderBy(F.desc("revenue"))\nout = (orders.filter(F.col("event_date") >= "2026-01-01")\n             .join(customers, "customer_id")\n             .groupBy("region", "customer_id").agg(F.sum("amount").alias("revenue"))\n             .withColumn("rnk", F.row_number().over(w))\n             .filter("rnk <= 10")\n             .orderBy("region", "rnk"))');
        const aggKeys = K;
        const aggOut = Math.min(aggKeys, D / ROW) * 56;
        if (canBcast) {
          const d = scanTable(m, dimB, 'Scan customers → broadcast', ['Scan', 'BroadcastExchange']);
          d.isBroadcast = true;
          m.stages.splice(m.stages.indexOf(d), 1); m.stages.unshift(d); m.stages.forEach((x, i) => x.id = i);
          m.broadcastBytes = dimB * 1.6 * st.workers; m.driverSec += dimB * 1.6 / (300 * MB);
          s.ops = ['Scan', 'Filter', 'BroadcastHashJoin', 'HashAggregate (partial)'];
          const shB = partialAggBytes(D, s.n, aggKeys, 56);
          aggEx = exchange(m, s, { kind: 'hash', D: shB, K: Math.min(aggKeys, 5e7), h: 0, label: 'region, customer_id' });
          aggStage = reduceStage(m, aggEx, { name: 'Final HashAggregate', ops: ['Shuffle read', 'HashAggregate (final)'], rate: CPU.agg, memHeavy: true });
          joinTree = node('HashAggregate(keys=[region, customer_id], functions=[sum(amount)])', readNode(m, aggEx, node(exText(m, aggEx, 'region#30, customer_id#12'),
            node('HashAggregate(keys=[region, customer_id], functions=[partial_sum(amount)])', node('BroadcastHashJoin [customer_id], [customer_id], Inner, BuildRight',
              node('Filter (event_date >= 2026-01-01)', colNode(m, scanNode(m, ['customer_id', 'amount', 'event_date'], ['GreaterThanOrEqual(event_date,2026-01-01)']))),
              node('BroadcastExchange HashedRelationBroadcastMode  ◀ no shuffle of orders', node('FileScan parquet customers [customer_id, region]')))))));
        } else {
          const d = scanTable(m, dimB, 'Scan customers', ['Scan']);
          const jEx = exchange(m, s, { kind: 'hash', D, K, h, label: 'customer_id' });
          const jEx2 = exchange(m, d, { kind: 'hash', D: dimB, K, h: 0, label: 'customer_id', N: jEx.N });
          let arrF = jEx.arrFinal.slice();
          if (st.aqe) { const sk = aqeSkewSplit(arrF); if (sk.splits) { jEx.skew = sk; arrF = sk.arr; } }
          aggStage = newStage(m, { name: 'SortMergeJoin + HashAggregate (no extra shuffle)', kind: 'reduce', arr: arrF, ops: ['Shuffle read ×2', 'Sort', 'SortMergeJoin', 'HashAggregate'], rate: CPU.join, memHeavy: true, inputs: [jEx, jEx2] });
          const add = dimB / arrF.length; aggStage.arr = aggStage.arr.map(x => x + add); aggStage.n = aggStage.arr.length; aggStage.avg = sum(aggStage.arr) / aggStage.n;
          m.reusedPartitioning = true;
          joinTree = node('HashAggregate(keys=[region, customer_id], functions=[sum(amount)])  ◀ reuses hashpartitioning(customer_id): no new Exchange',
            node('HashAggregate(keys=[region, customer_id], functions=[partial_sum(amount)])', node('SortMergeJoin [customer_id], [customer_id], Inner' + (jEx.skew ? ', isSkewJoin=true' : ''),
              node('Sort [customer_id ASC]', readNode(m, jEx, node(exText(m, jEx, 'customer_id#12'), node('Filter (event_date >= 2026-01-01)', colNode(m, scanNode(m, ['customer_id', 'amount', 'event_date'], ['GreaterThanOrEqual(event_date,2026-01-01)'])))))),
              node('Sort [customer_id ASC]', node(exText(m, jEx2, 'customer_id#40'), node('FileScan parquet customers [customer_id, region]'))))));
        }
        aggStage.outRatio = aggOut / Math.max(1, sum(aggStage.arr));
        const wEx = exchange(m, aggStage, { kind: 'hash', D: aggOut, K: 12, h: 0, label: 'region (12 values)' });
        const wSt = reduceStage(m, wEx, { name: 'Sort + Window rank (by region)', ops: ['Shuffle read', 'Sort', 'Window', 'Filter rnk<=10'], rate: CPU.window, memHeavy: true });
        const topOut = 12 * 10 * 64;
        wSt.outRatio = topOut / Math.max(1, sum(wSt.arr));
        const oEx = exchange(m, wSt, { kind: 'range', D: topOut, h: 0, label: 'region, rnk' });
        const oSt = reduceStage(m, oEx, { name: 'Global sort (tiny)', ops: ['Shuffle read', 'Sort'], rate: CPU.sort });
        tree = node('Sort [region ASC, rnk ASC], true', readNode(m, oEx, node(exText(m, oEx, 'region ASC, rnk ASC'),
          node('Filter (rnk <= 10)', node('Window [row_number() ...], [region], [revenue DESC]', node('Sort [region ASC, revenue DESC], false',
            readNode(m, wEx, node(exText(m, wEx, 'region#30'), joinTree))))))));
        m.outBytes = topOut; m.jobs = 2; last = oSt; break;
      }
    }
    m.final = last;
    m.tree = tree;
  }

  // ---------- target / sink ----------
  function applyTarget(m) {
    const st = m.st, f = m.final;
    const outTotal = m.outBytes;
    const inTotal = stageBytes(f);
    const share = (i) => f.arr ? f.arr[i] / Math.max(1, inTotal) : 1 / f.n;
    const nonEmpty = f.arr ? f.arr.filter(x => x > 0).length : f.n;
    m.outTasks = nonEmpty;
    let wcode = '';
    switch (st.target) {
      case 'count':
        wcode = 'out.count()   # or display(out) — result returns to the driver';
        m.files = 0; break;
      case 'parquet':
        wcode = 'out.write.mode("overwrite").format("delta").save("s3://lake/gold/orders_out")';
        f.writeRate = 90 * MB; f.writeFixedPerFile = 0.15;
        f.filesFn = (i) => (f.arr ? (f.arr[i] > 0 ? 1 : 0) : 1);
        m.files = nonEmpty; m.commitSec = nonEmpty * 0.004 + 1; break;
      case 'partitioned': {
        wcode = 'out.write.partitionBy("event_date").mode("overwrite").parquet("s3://lake/gold/orders_by_day")';
        f.writeRate = 70 * MB; f.writeFixedPerFile = 0.06;
        const dates = 365;
        const per = (i) => { const rows = outTotal * share(i) / ROW; return rows <= 0 ? 0 : Math.max(1, Math.round(dates * (1 - Math.exp(-rows / dates)))); };
        f.filesFn = per;
        let files = 0;
        if (f.arr) for (let i = 0; i < f.n; i++) files += per(i); else files = f.n * per(0);
        m.files = files; m.commitSec = files * 0.002 + 1; m.partDirs = dates; break;
      }
      case 'delta_merge': {
        wcode = 'from delta.tables import DeltaTable\n(DeltaTable.forPath(spark, "s3://lake/gold/orders")\n   .alias("t").merge(out.alias("s"), "t.order_id = s.order_id")\n   .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())';
        const T = Math.max(m.V * 3, 1 * GB);
        const touched = T * 0.3;
        f.outRatio = outTotal / Math.max(1, inTotal);
        const tScan = scanTable(m, touched, 'Scan target files touched by MERGE', ['Scan (file pruning ~30%)']);
        const sEx = exchange(m, f, { kind: 'hash', D: outTotal, K: 5e7, h: 0, label: 'order_id (merge key)' });
        const tEx = exchange(m, tScan, { kind: 'hash', D: touched, K: 5e7, h: 0, label: 'order_id (merge key)', N: sEx.N });
        const mSt = newStage(m, { name: 'MERGE join + rewrite files', kind: 'reduce', arr: sEx.arrFinal.map((x, i, a) => x + touched / a.length), ops: ['Shuffle read ×2', 'SortMergeJoin (full outer)', 'Write rewritten files'], rate: CPU.join, memHeavy: true, inputs: [sEx, tEx] });
        mSt.n = mSt.arr.length; mSt.avg = sum(mSt.arr) / mSt.n;
        mSt.writeRate = 90 * MB; mSt.writeFixedPerFile = 0.15; mSt.outRatio = 1; mSt.filesFn = () => 1;
        m.final = mSt; m.files = mSt.n; m.commitSec = mSt.n * 0.004 + 3;
        m.tree = node('Execute MergeIntoCommand', node('SortMergeJoin FullOuter [order_id], [order_id]', node(exText(m, sEx, 'order_id'), m.tree), node(exText(m, tEx, 'order_id'), node('FileScan parquet gold.orders (files touched by source keys)'))));
        m.outTasks = mSt.n;
        break;
      }
      case 'jdbc': {
        wcode = 'out.write.jdbc(url, "rpt.orders_out", mode="append",\n               properties={**props, "batchsize": "10000", "isolationLevel": "NONE"})';
        const conns = Math.min(nonEmpty, m.P);
        m.jdbcWriteConns = nonEmpty;
        f.writeRate = Math.min(15 * MB, 200 * MB / Math.max(1, conns));
        f.writeFixedPerFile = 0.4; // connection + prepare
        f.filesFn = (i) => (f.arr ? (f.arr[i] > 0 ? 1 : 0) : 1);
        m.files = 0; m.commitSec = 0.5; break;
      }
      case 'snowflake': {
        wcode = 'out.write.format("snowflake").options(**sf_opts)\n   .option("dbtable", "GOLD.ORDERS_OUT").mode("append").save()   # stage files + COPY INTO';
        f.writeRate = 90 * MB; f.writeFixedPerFile = 0.2;
        f.filesFn = (i) => (f.arr ? (f.arr[i] > 0 ? 1 : 0) : 1);
        m.files = nonEmpty; m.commitSec = outTotal / (1 * GB) + nonEmpty * 0.01 + 3; break;
      }
    }
    if (st.target !== 'delta_merge') f.outRatio = outTotal / Math.max(1, inTotal);
    m.code.push(wcode);
  }

  // ---------- timing / scheduling ----------
  function taskTimes(m, s) {
    const net = 1.25 * GB * 0.7 / m.st.cores;
    const remote = (m.st.workers - 1) / m.st.workers;
    const readRate = s.kind === 'reduce' ? Math.min(s.rate, remote > 0 ? net / remote : s.rate) : s.rate;
    const totalIn = Math.max(1, stageBytes(s));
    const swPerByte = s.shuffleWrite / totalIn;
    const one = (bytes, i) => {
      let t = s.fixed + bytes / readRate + bytes * swPerByte / (200 * MB);
      let spill = 0;
      if (s.memHeavy) {
        const inMem = bytes * 2.2;
        if (inMem > m.memTask) { spill = inMem - m.memTask; t += spill * 2 / (150 * MB); }
      }
      if (s.writeRate) {
        const ob = bytes * s.outRatio;
        const files = s.filesFn ? s.filesFn(i) : 1;
        t += ob / s.writeRate + files * s.writeFixedPerFile;
      }
      return { t, spill };
    };
    if (s.arr) {
      const ts = new Array(s.arr.length); let spill = 0, maxSpillTask = 0;
      for (let i = 0; i < s.arr.length; i++) { const r = one(s.arr[i], i); ts[i] = r.t; spill += r.spill; if (r.spill > maxSpillTask) maxSpillTask = r.spill; }
      return { ts, spill, maxSpillTask };
    }
    const r = one(s.avg, 0);
    return { ts: null, avgT: r.t, n: s.n, spill: r.spill * s.n, maxSpillTask: r.spill };
  }

  function schedule(times, slots, keep) {
    // tasks launched in partition order onto the earliest free slot (binary heap)
    const heap = []; for (let i = 0; i < slots; i++) heap.push([0, i]);
    const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
    const down = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let mm = i; if (l < heap.length && less(heap[l], heap[mm])) mm = l; if (r < heap.length && less(heap[r], heap[mm])) mm = r; if (mm === i) return; [heap[i], heap[mm]] = [heap[mm], heap[i]]; i = mm; } };
    const out = keep ? [] : null; let end = 0;
    for (let i = 0; i < times.length; i++) {
      const top = heap[0]; const st0 = top[0], en = st0 + times[i];
      if (out) out.push({ slot: top[1], start: st0, end: en, i });
      top[0] = en; down(0); if (en > end) end = en;
    }
    return { makespan: end, tasks: out };
  }

  function computeTimes(m, keepSched) {
    const slots = m.P;
    let total = m.driverSec;
    m.stages.forEach(s => {
      const tt = taskTimes(m, s);
      s.spill = tt.spill; s.maxSpillTask = tt.maxSpillTask;
      let mk, sched = null;
      if (tt.ts) {
        const sc = schedule(tt.ts, slots, keepSched && tt.ts.length <= 20000);
        mk = sc.makespan; sched = sc.tasks;
        const sorted = tt.ts.slice().sort((a, b) => a - b);
        s.medT = sorted[Math.floor(sorted.length / 2)]; s.maxT = sorted[sorted.length - 1];
        s.taskTimes = tt.ts;
      } else {
        mk = Math.ceil(tt.n / slots) * tt.avgT; s.medT = s.maxT = tt.avgT;
      }
      const schedOverhead = 0.2 + s.n / 2000; // driver task launch ≈ 2K tasks/s
      s.time = mk + schedOverhead; s.sched = sched;
      total += s.time;
    });
    total += (m.commitSec || 0);
    m.totalSec = total;
    m.totalTasks = m.stages.reduce((a, s) => a + s.n, 0);
    m.shuffleBytes = m.exchanges.reduce((a, e) => a + e.D, 0);
    m.networkBytes = m.shuffleBytes * (m.st.workers - 1) / m.st.workers + (m.broadcastBytes || 0);
    m.spillBytes = m.stages.reduce((a, s) => a + (s.spill || 0), 0);
  }

  // ---------- advisor ----------
  function analyze(m) {
    const st = m.st, F = m.findings, P = m.P;
    const add = (sev, title, detail, fix) => F.push({ sev, title, detail, fix });
    const src = SRC[st.source];
    if (!m.exchanges.length) add('good', 'No shuffle — single pipelined stage', 'Narrow transformations (select, filter, withColumn) run inside one stage via whole-stage codegen. Each read task flows straight to the sink.', 'Keep narrow work before wide work, and push filters/projections down to the source.');
    if (st.source === 'smallfiles') add(m.listingSec > 30 ? 'critical' : 'serious', `Small-file tax: ${fmtN(m.scanInfo.nFiles)} files`, `Driver spends ~${fmtT(m.listingSec)} listing objects and reading footers; each task opens ~${m.scanInfo.filesPerTask} files (one GET each).`, 'Compact upstream: OPTIMIZE (Delta) / Auto Optimize, or a periodic compaction job writing 128 MB–1 GB files. Raise spark.sql.files.maxPartitionBytes only after compaction.');
    if (st.source === 'csvgz') add(m.V > 20 * GB ? 'serious' : 'warning', 'Gzip is not splittable', `${fmtN(m.scanInfo.nFiles)} file(s) ⇒ ${fmtN(m.scanInfo.nFiles)} read task(s) regardless of ${P} cores. No column pruning or predicate pushdown for CSV.`, 'Land as Parquet/Delta (or bzip2/zstd-splittable), or repartition() immediately after the read so downstream stages get parallelism.');
    if (st.source === 'jdbc1') add(m.V > 1 * GB ? 'critical' : 'warning', 'JDBC read on a single connection', `The whole table streams through 1 task / 1 DB session at ~25 MB/s. ${P - 1} cores sit idle.`, 'Add partitionColumn + lowerBound + upperBound + numPartitions (or predicates=[...]) and fetchsize=10000. Cap numPartitions to what the DB can serve.');
    if (st.source === 'jdbcN' && m.h > 0) add('warning', 'JDBC stride skew', 'numPartitions splits [lowerBound, upperBound] into equal value ranges, not equal row counts — a dense key range becomes one slow task.', 'Use predicates=[...] built from row-count quantiles, or partition on a hash: mod(abs(hash(id)), N).');
    if (st.source === 'mpp') add('good', 'Warehouse unload path', `Connector pushes projection/filters into the warehouse, UNLOADs ~${fmtB(m.scanInfo.io)} to a stage (~${fmtT(m.unloadSec)}) and Spark reads Parquet in parallel.`, 'Push down as much as possible (query option), size the warehouse for the unload, and avoid row-by-row JDBC to MPP engines.');

    m.exchanges.forEach(ex => {
      const arr = ex.arr, nz = arr.filter(x => x > 0), med = median(nz), mx = Math.max(...arr), avg = ex.D / ex.N;
      ex.stats = { nonEmpty: nz.length, med, max: mx, avg };
      if (nz.length < ex.N * 0.6 && ex.N > 8) add('warning', `Only ${nz.length} of ${ex.N} partitions get data (${ex.label})`, `Key cardinality is lower than spark.sql.shuffle.partitions, so most reduce tasks are empty and parallelism is capped at ${nz.length}.`, st.aqe ? 'AQE coalesces the empty partitions, but the real fix for low-cardinality keys is adding a second key or two-phase aggregation.' : 'Enable AQE (coalescePartitions) and lower shuffle partitions; for hot low-card keys add a secondary key.');
      if (mx > 5 * med && mx > 256 * MB) {
        if (ex.skew) add('good', `AQE split ${ex.skew.splits} skewed partition(s) → ${ex.skew.pieces} tasks`, `Partition of ${fmtB(mx)} was > max(256 MB, 5 × median ${fmtB(med)}). The other side is replicated per split.`, 'Tune spark.sql.adaptive.skewJoin.skewedPartitionFactor / ThresholdInBytes if skew is not detected.');
        else if ((st.op === 'join_large' || st.op === 'join_small' || st.op === 'complex') && !st.aqe) add('critical', `Skewed join partition: ${fmtB(mx)} vs median ${fmtB(med)}`, 'One reduce task processes the hot key alone — the classic 199/200 tasks done, 1 task running for 45 min.', 'Enable spark.sql.adaptive.enabled + skewJoin.enabled, salt the key, or broadcast the small side.');
        else add('critical', `Skewed partition AQE cannot fix: ${fmtB(mx)} vs median ${fmtB(med)}`, `AQE skew handling only splits sort-merge JOIN partitions. ${st.op === 'window' ? 'A window must see all rows of a key in one task.' : st.op === 'orderby' ? 'A single repeated sort value (e.g. NULL) cannot be split by range partitioning.' : 'Non-reducing aggregates (collect_list, countDistinct) ship every row of the hot key to one task.'}`, st.op === 'window' ? 'Filter/handle NULL & default keys separately, pre-aggregate, or add a secondary partition key when semantics allow.' : st.op === 'orderby' ? 'Use NULLS handling / tie-breaker columns, or sortWithinPartitions if global order is not required.' : 'Two-phase aggregation with a salt (aggregate on key+salt, then on key), or isolate the hot key and union.');
      }
      if (avg > 512 * MB && !(ex.kind === 'rr')) add('serious', `Partitions too large: ~${fmtB(avg)} avg (${ex.label})`, `${fmtB(ex.D)} shuffled into only ${ex.N} partitions. Expect spill, long GC pauses and executor OOM risk.`, `Set spark.sql.shuffle.partitions ≈ ${fmtN(Math.ceil(ex.D / (128 * MB)))} (bytes ÷ 128 MB) or use AQE advisoryPartitionSizeInBytes.`);
      if (avg < 8 * MB && ex.N > P && !ex.aqe && ex.D > 0) add('warning', `Tiny partitions: ~${fmtB(avg)} × ${fmtN(ex.N)} (${ex.label})`, 'Task-launch overhead dominates and the next write produces many tiny files.', `Lower spark.sql.shuffle.partitions to ~${Math.max(1, Math.ceil(ex.D / (128 * MB)))}-${P} or enable AQE coalescePartitions.`);
      if (ex.aqe && ex.aqe.before / ex.aqe.after > 3) add('good', `AQE coalesced ${ex.aqe.before} → ${ex.aqe.after} partitions (${ex.label})`, `Small adjacent shuffle partitions were merged toward ~${fmtB(ex.aqe.target)} each at runtime.`, 'Nothing to do — this is why AQE should stay on (default since Spark 3.2).');
    });

    if (st.op === 'join_small') {
      if (st.bcast < 40 * MB) add('serious', 'Small dimension is being shuffled', `dim_product (~40 MB) exceeds autoBroadcastJoinThreshold (${st.bcast < 0 ? 'disabled' : fmtB(st.bcast)}), so ${fmtB(m.scanInfo.out)} of orders is shuffled just to join it.`, 'Use F.broadcast(dim_product) or raise spark.sql.autoBroadcastJoinThreshold to ~100 MB (watch driver memory).');
      else add('good', 'Broadcast hash join — fact table not shuffled', `~40 MB dimension is collected to the driver and sent to all ${st.workers} executors (~${fmtB(m.broadcastBytes)} network).`, 'Keep broadcast tables well below executor memory; > ~1 GB broadcasts cause driver OOM and timeouts.');
    }
    if (st.op === 'join_large' && m.salted) add('warning', 'Salting cost: dimension exploded ×16', `customers side grows to ${fmtB(m.V * 0.15 * 0.5 * 16)} shuffled. Salting trades extra shuffle volume for balanced tasks.`, 'Prefer AQE skew join first; salt only the hot keys (isolate top-N keys) when AQE is insufficient.');
    if (st.op === 'complex' && m.reusedPartitioning) add('good', 'Exchange reuse: groupBy(region, customer_id) after join on customer_id', 'hashpartitioning(customer_id) already satisfies the aggregate\'s clustering, so Spark skips one shuffle.', 'Order wide operations so keys nest — it saves whole exchanges.');
    if (st.op === 'complex') add('warning', 'Window partitioned by a 12-value key', 'Window.partitionBy("region") can use at most 12 tasks, whatever the cluster size.', 'Filter early (top-N per customer first) and keep window inputs small, or partition windows by a higher-cardinality key.');
    if (st.op === 'orderby') add('warning', 'Global sort runs an extra sampling job', 'RangePartitioner scans the input once to compute bounds, then again to shuffle.', 'Use sortWithinPartitions() when global order is not needed; cache only if the input is reused.');
    if (st.op === 'coalesce' && m.coalesceFrom > 8) add(m.V > 10 * GB ? 'critical' : 'warning', `coalesce(8) collapsed ${fmtN(m.coalesceFrom)} read splits into 8 tasks`, 'coalesce is narrow: it removes parallelism from the whole upstream stage, not just the write.', 'Use repartition(N) (one shuffle, full parallel upstream) or let AQE / optimizeWrite size output files.');
    if (st.op === 'repartition' && m.exchanges[0] && m.exchanges[0].D > 10 * GB) add('warning', 'repartition(N) is a full shuffle', `Moves all ${fmtB(m.exchanges[0].D)} across the network just to rebalance.`, 'Repartition by the column you write/join on (repartition(N, "event_date")) so the shuffle also buys clustering.');

    const spillTasks = m.stages.filter(s => s.spill > 0);
    if (m.spillBytes > 0) add(m.spillBytes > 50 * GB ? 'serious' : 'warning', `Spill to disk: ${fmtB(m.spillBytes)}`, `Execution memory per task ≈ ${fmtB(m.memTask)} (${st.mem} GB executor ÷ ${st.cores} cores × 0.6). Reduce partitions above that spill.`, 'More (smaller) shuffle partitions, fewer cores per executor, or more executor memory. Check "Spill (Memory/Disk)" in the Spark UI stage page.');
    const maxSpill = Math.max(0, ...spillTasks.map(s => s.maxSpillTask || 0));
    if (maxSpill > 8 * m.memTask) add('critical', 'OOM risk on the largest task', `Largest task needs ~${fmtB(maxSpill + m.memTask)} vs ${fmtB(m.memTask)} per-task execution memory — buffered rows for joins/windows can exceed what spilling saves.`, 'Fix skew first; then raise partitions or spark.executor.memory / memoryOverhead.');

    m.stages.forEach(s => { if (s.n > 50000) add('serious', `${fmtN(s.n)} tasks in "${s.name}"`, 'Driver scheduling and task-result overhead become the bottleneck (≈2K task launches/s).', 'Bigger splits (files.maxPartitionBytes), fewer shuffle partitions, or compaction.'); });
    const maxStageTasks = Math.max(...m.stages.map(s => s.n));
    if (maxStageTasks < P && m.V >= 10 * GB) add('warning', `Parallelism ${maxStageTasks} < ${P} cores`, 'No stage has enough tasks to use the cluster.', 'Increase read splits / shuffle partitions so every stage has ≥ 2–3 × cores tasks.');

    if (m.files > 0 && m.outBytes / m.files < 16 * MB && m.files > 50) add(m.files > 20000 ? 'critical' : 'serious', `Small output files: ${fmtN(m.files)} files × ~${fmtB(m.outBytes / m.files)}`, st.target === 'partitioned' ? `Every task writes one file per event_date it holds (up to ${m.partDirs}). Tasks × dates = file explosion.` : 'Each non-empty final task writes one file.', st.target === 'partitioned' ? 'out.repartition("event_date").write.partitionBy("event_date") — or repartition(N, "event_date", salt) for big days; Delta optimizeWrite.' : 'coalesce/repartition before write to target ~128 MB–1 GB files, or Delta optimizeWrite + autoCompact.');
    if (st.target === 'jdbc' && m.jdbcWriteConns > 32) add('critical', `JDBC write opens ${fmtN(m.jdbcWriteConns)} connections`, 'Each non-empty partition is one DB session doing batched INSERTs — this exhausts max_connections and causes lock contention.', 'out.coalesce(16–32).write.jdbc(...) with batchsize=10000; or bulk-load (COPY / bcp / SQL*Loader) from staged files.');
    if (st.target === 'delta_merge') add('warning', 'MERGE adds its own shuffle', 'Source and touched target files are joined on the merge key, then whole files are rewritten.', 'Partition/cluster the target by the merge predicate, add partition filters to the ON clause, enable deletion vectors / low-shuffle merge.');
    if (st.target === 'count' && m.exchanges.length === 0) add('good', 'count() on Parquet/Delta can use metadata', 'Simple count() may be answered from file statistics / row-group metadata.', 'Avoid collect() / toPandas() on large outputs — results go to the driver.');

    const order = { critical: 0, serious: 1, warning: 2, good: 3 };
    F.sort((a, b) => order[a.sev] - order[b.sev]);
    m.health = F.length ? F[0].sev : 'good';
  }

  function buildModel(state, keepSched) {
    const st = Object.assign({}, state);
    const V = VOLS[st.volIdx], P = st.workers * st.cores;
    const m = {
      st, V, P, K: CARD[st.card].K, h: SKEW[st.skew],
      memTask: Math.max(64 * MB, (st.mem * GB - 300 * MB) * 0.6 / st.cores),
      stages: [], exchanges: [], findings: [], code: [], driverSec: 2, jobs: 1
    };
    build(m);
    applyTarget(m);
    computeTimes(m, keepSched);
    analyze(m);
    m.planLines = renderTree(st.aqe ? node('AdaptiveSparkPlan isFinalPlan=true', m.tree) : m.tree);
    return m;
  }

  const api = { KB, MB, GB, TB, VOLS, VOL_LABELS, CARD, SKEW, SRC, TGT, OPS, buildModel, fmtB, fmtT, fmtN, median, sum };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShuffleModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
