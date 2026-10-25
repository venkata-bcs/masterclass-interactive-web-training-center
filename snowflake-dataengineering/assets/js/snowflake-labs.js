/* =============================================================================
   Snowflake track - interactive labs
   Each lab initialises only if its root element is on the page.
   These are teaching models, deliberately simplified - not billing engines.
   ============================================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const fmt = (n, d = 1) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  // Segmented button group -> current value + change callback
  function seg(id, onChange) {
    const box = $(id);
    const buttons = [...box.querySelectorAll('button')];
    const api = {
      value: (buttons.find(b => b.getAttribute('aria-pressed') === 'true') || buttons[0]).dataset.v,
      set(v) {
        api.value = v;
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      },
    };
    buttons.forEach(b => b.addEventListener('click', () => { api.set(b.dataset.v); onChange(); }));
    return api;
  }

  function setCode(id, text) {
    const pre = $(id);
    if (!pre) return;
    pre.innerHTML = window.SF ? window.SF.highlightSql(text) : text;
  }

  // ---------------------------------------------------------------- Concurrency
  function initConcurrency() {
    if (!$('lab-concurrency')) return;
    const PER_CLUSTER = 8;
    const q = $('mc-queries'), mn = $('mc-min'), mx = $('mc-max'), size = $('mc-size');
    const policy = seg('mc-policy', render);

    function render() {
      let min = +mn.value, max = +mx.value;
      if (max < min) { max = min; mx.value = max; }
      const queries = +q.value;
      const needed = Math.ceil(queries / PER_CLUSTER);
      // ECONOMY only adds a cluster once a full cluster's worth of work is waiting
      const want = policy.value === 'ECONOMY' ? Math.max(1, Math.floor(queries / PER_CLUSTER)) : needed;
      const running = Math.min(Math.max(want, min), max);
      const runningQ = Math.min(queries, running * PER_CLUSTER);
      const queued = queries - runningQ;

      $('mc-queries-val').textContent = queries;
      $('mc-min-val').textContent = min;
      $('mc-max-val').textContent = max;
      $('mc-running').textContent = running + ' / ' + max;
      $('mc-run').textContent = runningQ;
      $('mc-queued').textContent = queued;
      $('mc-queued').parentElement.className = 'sf-stat ' + (queued ? 'bad' : 'good');
      $('mc-credits').textContent = running * +size.value;

      let left = runningQ;
      $('mc-clusters').innerHTML = Array.from({ length: max }, (_, i) => {
        const on = i < running;
        const busy = on ? Math.min(PER_CLUSTER, left) : 0;
        left -= busy;
        const slots = Array.from({ length: PER_CLUSTER }, (_, s) => `<span class="sf-slot${s < busy ? ' busy' : ''}"></span>`).join('');
        return `<div class="sf-cluster${on ? '' : ' off'}"><div class="sf-cluster-name">Cluster ${i + 1}${on ? '' : ' (off)'}</div><div class="sf-slots">${slots}</div></div>`;
      }).join('');
      $('mc-queue').innerHTML = queued ? Array.from({ length: Math.min(queued, 80) }, () => '<span></span>').join('') : '<em style="font-size:0.78rem;color:var(--text-dim);">empty</em>';

      const v = $('mc-verdict');
      if (queued && running === max) {
        v.className = 'sf-verdict bad';
        v.innerHTML = `<strong>${queued} queries are queuing</strong> because MAX_CLUSTER_COUNT (${max}) is reached. Raise the max, split the workload onto another warehouse, or make queries lighter. A bigger size won't remove the queue.`;
      } else if (queued) {
        v.className = 'sf-verdict warn';
        v.innerHTML = `ECONOMY is holding back a cluster: ${queued} queries wait until there's a full cluster's worth of work. You save credits but users wait. Switch to STANDARD if latency matters.`;
      } else if (running > needed) {
        v.className = 'sf-verdict warn';
        v.innerHTML = `MIN_CLUSTER_COUNT forces ${running} clusters while only ${needed} are needed. You pay ${(running - needed) * +size.value} extra credits/hour for idle clusters.`;
      } else {
        v.className = 'sf-verdict good';
        v.innerHTML = `No queuing. ${running} cluster${running > 1 ? 's' : ''} handle ${queries} concurrent queries. Extra clusters start only when load needs them.`;
      }
    }
    [q, mn, mx, size].forEach(el => el.addEventListener('input', render));
    render();
  }

  // ---------------------------------------------------------------- Auto-suspend cost
  function initCost() {
    if (!$('lab-cost')) return;
    const DAY = 86400;
    const size = $('cost-size'), bursts = $('cost-bursts'), dur = $('cost-dur'), win = $('cost-window'), price = $('cost-price');
    const suspend = seg('cost-suspend', render);

    function render() {
      const n = +bursts.value, d = +dur.value * 60, W = +win.value * 3600, s = +suspend.value;
      const rate = +size.value, p = Math.max(0, +price.value || 0);
      $('cost-bursts-val').textContent = n;
      $('cost-dur-val').textContent = (+dur.value < 1 ? fmt(+dur.value * 60, 0) + ' s' : fmt(+dur.value, 2).replace(/\.?0+$/, '') + ' min');
      $('cost-window-val').textContent = win.value + ' h';

      const busy = Math.min(n * d, W);
      const gap = (W - busy) / n;
      const start = (DAY - W) / 2;
      const segs = []; // [from, to, type]
      let t = start;
      let sessionStart = null, sessionBilled = 0;
      const closeSession = () => {
        if (sessionStart === null) return;
        if (sessionBilled < 60) { // 60-second minimum per resume
          const last = segs[segs.length - 1];
          const extra = Math.min(60 - sessionBilled, DAY - last[1]);
          segs.push([last[1], last[1] + extra, 'idle']);
        }
        sessionStart = null; sessionBilled = 0;
      };
      for (let i = 0; i < n; i++) {
        if (sessionStart === null) sessionStart = t;
        const runEnd = Math.min(t + Math.min(d, busy / n), DAY);
        segs.push([t, runEnd, 'run']);
        sessionBilled += runEnd - t;
        const isLast = i === n - 1;
        const room = isLast ? DAY - runEnd : gap;
        const idle = s === 0 ? room : Math.min(room, s);
        if (idle > 0) segs.push([runEnd, runEnd + idle, 'idle']);
        sessionBilled += idle;
        if (s !== 0 && room > s) closeSession();
        t = runEnd + gap;
      }
      closeSession();
      if (s === 0 && segs.length) { // "never suspend" keeps running for the rest of the day, and from window start
        segs.unshift([0, start, 'idle']);
      }

      let run = 0, idle = 0;
      segs.forEach(([a, b, k]) => { if (k === 'run') run += b - a; else idle += b - a; });
      const billed = run + idle;
      const credits = billed / 3600 * rate;
      $('cost-hours').textContent = fmt(billed / 3600, 1);
      $('cost-credits').textContent = fmt(credits, 1);
      $('cost-month').textContent = '$' + fmt(credits * p * 30, 0);
      const idleShare = billed ? idle / billed : 0;
      $('cost-idle').textContent = fmt(idleShare * 100, 0) + '%';

      // Fill the gaps with "off" so the bar spans the whole day
      const full = [];
      let cur = 0;
      segs.sort((x, y) => x[0] - y[0]).forEach(([a, b, k]) => {
        if (a > cur) full.push([cur, a, 'off']);
        full.push([Math.max(a, cur), b, k]);
        cur = Math.max(cur, b);
      });
      if (cur < DAY) full.push([cur, DAY, 'off']);
      $('cost-bar').innerHTML = full.filter(([a, b]) => b > a)
        .map(([a, b, k]) => `<span class="c-${k}" style="width:${((b - a) / DAY * 100).toFixed(3)}%"></span>`).join('');

      const v = $('cost-verdict');
      if (s === 0) {
        v.className = 'sf-verdict bad';
        v.innerHTML = `<strong>Never suspending bills all 24 hours</strong>: ${fmt(24 * rate, 0)} credits/day for ${fmt(run / 3600, 1)} h of real work. Set AUTO_SUSPEND = 60 to pay only for what you use.`;
      } else if (idleShare > 0.4) {
        v.className = 'sf-verdict warn';
        v.innerHTML = `${fmt(idleShare * 100, 0)}% of this bill is idle time waiting for auto-suspend. ${s > 60 ? 'Try 60 s, unless this is BI where a warm cache matters more.' : 'With 60 s already, batch the queries into fewer, longer bursts.'}`;
      } else if (gap <= s) {
        v.className = 'sf-verdict good';
        v.innerHTML = `Bursts arrive faster than AUTO_SUSPEND fires, so the warehouse stays up through the window. The cache stays warm and the idle overhead is small.`;
      } else {
        v.className = 'sf-verdict good';
        v.innerHTML = `Efficient: ${fmt((1 - idleShare) * 100, 0)}% of billed time is spent running queries.`;
      }
    }
    [size, bursts, dur, win, price].forEach(el => el.addEventListener('input', render));
    render();
  }

  // ---------------------------------------------------------------- Pruning
  function initPruning() {
    if (!$('lab-pruning')) return;
    const N = 24, DAYS = 365;
    const start = $('pr-start'), days = $('pr-days');
    const layout = seg('pr-layout', render);
    const dayDate = d => new Date(Date.UTC(2026, 0, d));
    const short = d => dayDate(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
    const iso = d => dayDate(d).toISOString().slice(0, 10);

    // Deterministic pseudo-random so the "random" layout doesn't jump around
    function rng(seed) { return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; }

    function partitions(kind) {
      const sorted = Array.from({ length: N }, (_, i) => ({
        min: Math.floor(i * DAYS / N) + 1,
        max: Math.floor((i + 1) * DAYS / N),
      }));
      if (kind === 'sorted') return sorted;
      if (kind === 'partial') {
        // every 5th partition also received late-arriving rows from ~4 months earlier
        return sorted.map((p, i) => (i % 5 === 4 ? { min: Math.max(1, p.min - 120), max: p.max } : p));
      }
      const r = rng(42);
      return sorted.map(() => ({ min: 1 + Math.floor(r() * 25), max: DAYS - Math.floor(r() * 25) }));
    }

    function render() {
      const a = +start.value;
      const b = Math.min(DAYS, a + +days.value - 1);
      const parts = partitions(layout.value);
      let scanned = 0;
      $('pr-parts').innerHTML = parts.map((p, i) => {
        const hit = p.max >= a && p.min <= b;
        if (hit) scanned++;
        return `<div class="sf-part ${hit ? 'scan' : 'pruned'}" title="min ${iso(p.min)} / max ${iso(p.max)}"><b>MP ${String(i + 1).padStart(2, '0')}</b>${short(p.min)}<br>${short(p.max)}</div>`;
      }).join('');

      // average depth = mean number of partitions whose range covers each day
      let total = 0;
      for (let d = 1; d <= DAYS; d++) total += parts.filter(p => p.min <= d && p.max >= d).length;
      const depth = total / DAYS;

      $('pr-start-val').textContent = short(a);
      $('pr-days-val').textContent = (b - a + 1) + ' day' + (b > a ? 's' : '');
      $('pr-scanned').textContent = scanned + ' / ' + N;
      $('pr-pruned').textContent = fmt((1 - scanned / N) * 100, 0) + '%';
      $('pr-depth').textContent = fmt(depth, 1);
      setCode('pr-sql', `SELECT SUM(amount) FROM orders\nWHERE order_date BETWEEN '${iso(a)}' AND '${iso(b)}';`);

      const v = $('pr-verdict');
      if (layout.value === 'random') {
        v.className = 'sf-verdict bad';
        v.innerHTML = `Every micro-partition's min/max spans almost the whole year, so <strong>nothing can be pruned</strong>. This is the case a clustering key on <code>order_date</code> (or reloading with <code>ORDER BY order_date</code>) fixes.`;
      } else if (layout.value === 'partial') {
        v.className = 'sf-verdict warn';
        v.innerHTML = `Late-arriving rows stretched a few partitions' ranges backwards, so they get scanned for unrelated months. Clustering depth rises above 1, and Automatic Clustering would gradually fix this.`;
      } else {
        v.className = 'sf-verdict good';
        v.innerHTML = `Data loaded in date order has tight, non-overlapping ranges (depth ${fmt(depth, 1)}). Snowflake reads only ${scanned} of ${N} partitions, and no clustering key is needed.`;
      }
    }
    [start, days].forEach(el => el.addEventListener('input', render));
    render();
  }

  // ---------------------------------------------------------------- Time Travel
  function initTimeTravel() {
    if (!$('lab-timetravel')) return;
    const ret = $('tt-ret'), ago = $('tt-ago');
    const edition = seg('tt-edition', render);
    const type = seg('tt-type', render);
    const what = seg('tt-what', render);

    function render() {
      const maxRet = type.value !== 'permanent' || edition.value === 'standard' ? 1 : 90;
      ret.max = maxRet;
      if (+ret.value > maxRet) ret.value = maxRet;
      const r = +ret.value, a = +ago.value;
      const fs = type.value === 'permanent' ? 7 : 0;
      $('tt-ret-val').textContent = r;
      $('tt-ret-hint').textContent = 'Max allowed here: ' + maxRet + (maxRet === 1 ? (type.value !== 'permanent' ? ' (transient/temporary)' : ' (Standard edition)') : '');
      $('tt-ago-val').textContent = a === 0 ? 'minutes ago' : a + ' day' + (a > 1 ? 's' : '') + ' ago';

      const L = Math.max(a, r + fs) + 1;
      const pct = x => (x / L * 100).toFixed(3) + '%';
      $('tt-bar').style.position = 'relative';
      $('tt-bar').innerHTML =
        (r ? `<span class="c-tt" style="width:${pct(r)}"></span>` : '') +
        (fs ? `<span class="c-fs" style="width:${pct(fs)}"></span>` : '') +
        `<span class="c-gone" style="flex:1"></span>` +
        `<i style="position:absolute;top:-3px;bottom:-3px;left:calc(${pct(a)} - 1px);width:3px;background:var(--text-main);border-radius:2px;" title="today"></i>`;
      $('tt-axis').textContent = 'day ' + L;

      const offset = a === 0 ? 600 : a * 86400;
      const v = $('tt-verdict');
      let sql;
      if (a <= r && r > 0) {
        v.className = 'sf-verdict good';
        v.innerHTML = `<strong>Recoverable with Time Travel.</strong> You're inside the ${r}-day retention window, so you can fix it yourself in seconds.` +
          (type.value === 'temporary' ? ' (Only while the session that owns the temporary table is still open.)' : '');
        if (what.value === 'delete') {
          sql = `-- Best: restore to just before the bad statement\nCREATE TABLE orders_restored CLONE orders\n  BEFORE (STATEMENT => '<query_id of the DELETE>') COPY GRANTS;\n\n-- Or by time offset (${a === 0 ? '10 minutes' : a + ' day(s)'} ago)\nCREATE TABLE orders_restored CLONE orders AT (OFFSET => -${offset}) COPY GRANTS;\n\nALTER TABLE orders SWAP WITH orders_restored;`;
        } else if (what.value === 'drop') {
          sql = `UNDROP TABLE orders;`;
        } else {
          sql = `-- CREATE OR REPLACE dropped the old table; free the name first\nALTER TABLE orders RENAME TO orders_replaced;\nUNDROP TABLE orders;`;
        }
      } else if (a <= r + fs) {
        v.className = 'sf-verdict warn';
        v.innerHTML = `<strong>Time Travel has expired, but the data is in Fail-safe.</strong> Only Snowflake Support can recover it, on a best-effort basis that may take hours or days. You can't query it yourself.`;
        sql = `-- Nothing you can run. Open a Snowflake Support case now:\n-- account locator, object name, and the time of the mistake.\n-- Fail-safe ends ${r + fs - a} day(s) from today.`;
      } else {
        v.className = 'sf-verdict bad';
        v.innerHTML = `<strong>Gone.</strong> ${fs ? 'Both Time Travel and Fail-safe have passed.' : 'Transient and temporary tables have no Fail-safe.'} Rebuild from source files or the upstream system.`;
        sql = `-- Unrecoverable inside Snowflake. Rebuild from source, e.g.:\nCOPY INTO orders FROM @raw.s3_orders;  -- a recreated table has no load metadata`;
      }
      setCode('tt-sql', sql);
    }
    [ret, ago].forEach(el => el.addEventListener('input', render));
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initConcurrency();
    initCost();
    initPruning();
    initTimeTravel();
  });
})();
