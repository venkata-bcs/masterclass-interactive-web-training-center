/* =========================================================================
   Shuffle & Performance-Tuning Q&A bank
   src: 'md'  = adapted from spark_devops_scenario_qna.md
        'lab' = additional scenarios for this module
   lab: optional Shuffle Operations Lab state patch ("Simulate in Lab")
   ========================================================================= */
window.SHUFFLE_QNA_CATS = [
  { id: 'triage', label: 'Production Triage', icon: 'siren' },
  { id: 'fundamentals', label: 'Shuffle Fundamentals', icon: 'shuffle' },
  { id: 'skew', label: 'Skew & AQE', icon: 'flame' },
  { id: 'joins', label: 'Joins', icon: 'git-merge' },
  { id: 'sources', label: 'Sources: Files, JDBC, MPP', icon: 'database' },
  { id: 'targets', label: 'Targets & File Layout', icon: 'hard-drive-upload' },
  { id: 'memory', label: 'Memory, Spill & Cluster Sizing', icon: 'cpu' },
  { id: 'windows', label: 'Sorting & Windows', icon: 'arrow-down-wide-narrow' },
  { id: 'streaming', label: 'Streaming & State', icon: 'radio' },
  { id: 'devops', label: 'DevOps & Platform', icon: 'container' }
];

window.SHUFFLE_QNA = [
  // ---------------------------------------------------------------- TRIAGE
  {
    id: 'T1', cat: 'triage', level: 'Advanced', src: 'md',
    q: 'A nightly job on a steady ~50 GB dataset ran in 40 minutes for months. With no code deploy and no volume growth, it now takes 4 hours. How do you find the cause?',
    a: 'Same bytes, different <em>shape</em>. Open the Spark UI, find the stage that grew, and read its task metrics: one slow task points to skew, thousands of tiny tasks point to small files, and slow planning points to an unmaintained Delta log or lost partition pruning.',
    points: [
      '<b>Data skew</b>: the key distribution shifted (a new default value, a bot customer, a flood of <code>NULL</code>s). Stage summary shows max task duration ≫ 75th percentile, and one task with a huge shuffle read.',
      '<b>Small-file proliferation</b>: an upstream writer changed and now lands thousands of KB-sized files. Look for a long gap before the first task (driver listing) and a high task count with tiny input per task.',
      '<b>Delta transaction log growth</b>: without <code>OPTIMIZE</code>/<code>VACUUM</code> and checkpoints, planning has to replay a long log and many file entries.',
      '<b>Partition-pruning failure</b>: someone changed the partition column, or the filter now wraps it in a function/cast. Check <code>PartitionFilters: []</code> in <code>explain()</code>. The job now scans all 50 GB.'
    ],
    flow: ['Runtime 40m → 4h', 'Spark UI → slowest stage', '1 task lagging? → skew → AQE skew join / salting', 'Many tiny tasks? → small files → OPTIMIZE / compaction', 'Slow planning? → Delta log → OPTIMIZE + VACUUM + checkpoint'],
    code: '# quick skew probe on the suspect key\n(df.groupBy("customer_id").count()\n   .orderBy(F.desc("count")).show(10, False))\n\n# did pruning survive?\ndf.filter("event_date = \'2026-10-13\'").explain("formatted")   # look at PartitionFilters / PushedFilters',
    lab: { op: 'join_large', skew: 'severe', volIdx: 4, aqe: false }
  },
  {
    id: 'T2', cat: 'triage', level: 'Intermediate', src: 'md',
    q: 'In a 200-task stage, 199 tasks finish in under 20 seconds and one task runs for 45 minutes, then fails or finishes. What is happening, and what are your options?',
    a: 'Classic data skew. A dominant key (<code>NULL</code>, <code>-1</code>, "UNKNOWN", or one huge customer) hashes every row to one reducer partition. Fix it with AQE skew join (joins only), salting, broadcasting the small side, or by isolating the hot key.',
    points: [
      '<b>AQE</b>: <code>spark.sql.adaptive.enabled=true</code> and <code>spark.sql.adaptive.skewJoin.enabled=true</code>. At runtime AQE splits the skewed partition into sub-partitions and replicates the matching partition of the other side.',
      '<b>Salting</b>: append <code>rand() * N</code> to the key on the skewed side and explode the other side ×N, so the hot key spreads over N tasks.',
      '<b>Broadcast</b>: if one side fits in memory, a broadcast hash join removes the shuffle entirely, and with it the skew.',
      '<b>Isolate</b>: process <code>NULL</code>/default keys separately (they often should not join at all) and <code>unionByName</code> the results.'
    ],
    flow: ['Driver assigns 200 tasks', 'Tasks 1–199: ~10 MB each, 20 s', 'Task 200: 45 GB (hot key)', 'AQE splits / salting spreads', 'Sub-tasks finish in parallel'],
    lab: { op: 'join_large', skew: 'severe', volIdx: 8, aqe: false }
  },
  {
    id: 'T3', cat: 'triage', level: 'Expert', src: 'md',
    q: 'AQE is enabled (spark.sql.adaptive.enabled=true), yet one task still lags far behind the rest. Why did AQE not fix the skew?',
    a: 'AQE skew handling only applies to <b>shuffle joins</b>, and only when a partition crosses <b>both</b> thresholds. Skewed <code>groupBy</code>, <code>distinct</code> and window stages are never split, and neither is a partition that sits under the thresholds.',
    points: [
      '<b>Size threshold</b>: partition > <code>spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes</code> (default 256 MB).',
      '<b>Factor threshold</b>: partition > <code>spark.sql.adaptive.skewJoin.skewedPartitionFactor</code> × median partition size (default 5).',
      '<b>Not a join</b>: high-cardinality <code>GROUP BY</code>, <code>DISTINCT</code>, <code>collect_list</code> and windows are not split. Partial aggregation already absorbs skew for algebraic aggregates like <code>sum</code>/<code>count</code>, but non-reducing aggregates still ship every row.',
      '<b>Extra shuffle guard</b>: AQE skips the optimization if splitting would add a shuffle, unless <code>spark.sql.adaptive.forceOptimizeSkewedJoin=true</code>.',
      '<b>Fixes</b>: lower the thresholds, use two-phase aggregation (salted partial, then final), or pre-aggregate before the window.'
    ],
    code: 'spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionFactor", "3")\nspark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "128m")',
    lab: { op: 'groupby_collect', skew: 'severe', volIdx: 6 }
  },
  {
    id: 'T4', cat: 'triage', level: 'Intermediate', src: 'md',
    q: 'The same pipeline runs with spark.sql.shuffle.partitions = 200 on a 2 TB dataset and on a 500 MB dataset. What goes wrong in each case?',
    a: 'A fixed partition count is right for exactly one data size. At 2 TB each partition is about 10 GB, which means spill, GC pauses and OOM. At 500 MB each partition is about 2.5 MB, which means scheduling overhead and tiny output files. Size partitions to roughly 100–200 MB, or let AQE coalesce them.',
    table: [['Workload', 'Partitions', 'Avg / partition', 'Impact', 'Fix'],
      ['2 TB', '200', '~10 GB', 'OOM, heavy spill, long GC', '~16,000 partitions (≈128 MB)'],
      ['500 MB', '200', '~2.5 MB', 'Task overhead, small files', '4–8 partitions or AQE coalescePartitions']],
    code: 'shuffle_bytes = 2 * 1024**4            # from Spark UI "Shuffle Write"\ntarget = 128 * 1024**2\nspark.conf.set("spark.sql.shuffle.partitions", str(shuffle_bytes // target))   # 16384\n# or: keep a high number and let AQE coalesce\nspark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")\nspark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", "128m")',
    lab: { op: 'groupby_collect', volIdx: 8, aqe: false }
  },
  {
    id: 'T5', cat: 'triage', level: 'Advanced', src: 'md',
    q: 'A team moves from 40 small workers (2 cores, 8 GB) to 10 large workers (8 cores, 32 GB). Total cores (80) and RAM (320 GB) are unchanged, but jobs are much faster. Why?',
    a: 'Fewer, larger nodes keep more shuffle traffic node-local and cut the number of network endpoints and broadcast copies.',
    points: [
      '<b>Fewer shuffle connections</b>: every reducer fetches blocks from every mapper host. With 10 hosts instead of 40 there are fewer sockets, handshakes and small block requests.',
      '<b>More local reads</b>: a larger share of shuffle blocks is on the same host (local disk / page cache, no network).',
      '<b>Cheaper broadcasts</b>: a broadcast table is copied 10 times, not 40.',
      '<b>More memory per executor</b>: execution memory is pooled, so a skewed task can borrow more before it spills.',
      '<b>Caveat</b>: do not go to extremes. Executors with more than about 5–8 cores or over 64 GB heap bring GC pauses and HDFS/S3 client contention, so split huge nodes into several executors.'
    ],
    lab: { op: 'join_large', volIdx: 7, workers: 16, cores: 4 }
  },

  // ---------------------------------------------------------- FUNDAMENTALS
  {
    id: 'F1', cat: 'fundamentals', level: 'Intermediate', src: 'lab',
    q: 'Walk through exactly what happens, on disk and over the network, when Spark shuffles a DataFrame.',
    a: 'Map tasks partition each row by key and write <b>sorted, compressed shuffle files plus an index</b> to local disk. The stage ends. Reduce tasks then <b>fetch their block</b> from every map output over the network (or locally) and process it.',
    points: [
      '<b>Map side</b>: the sort-based shuffle writer buffers records by target partition, spills sorted runs when memory fills, and merges them into one data file and one index file per map task.',
      '<b>Stage boundary</b>: the next stage cannot start until all its map outputs exist. The <code>MapOutputTracker</code> on the driver records where each block lives.',
      '<b>Reduce side</b>: each reducer fetches up to <code>spark.reducer.maxSizeInFlight</code> (48 MB) at a time from executors or the external shuffle service, then deserializes, aggregates, sorts or joins.',
      '<b>Cost</b>: serialization + compression + local disk write + network + disk read + deserialization. That is why one shuffle often costs more than the whole scan.',
      '<b>Resilience</b>: shuffle files outlive the task. A lost executor causes <code>FetchFailedException</code>, and Spark re-runs only the missing map tasks.'
    ]
  },
  {
    id: 'F2', cat: 'fundamentals', level: 'Intermediate', src: 'lab',
    q: 'How do you count the shuffles in a query before running it, and confirm them afterwards?',
    a: 'Every <code>Exchange</code> node in <code>explain()</code> is a shuffle. <code>BroadcastExchange</code> is not, and <code>ReusedExchange</code> is a shuffle Spark reuses instead of repeating. After the run, compare with the final AQE plan in the SQL tab, because AQE can add, remove or change exchanges.',
    points: [
      '<code>Exchange hashpartitioning(k, 200)</code>: groupBy, join, window, distinct.',
      '<code>Exchange rangepartitioning(...)</code>: orderBy, plus a sampling job beforehand.',
      '<code>Exchange RoundRobinPartitioning(n)</code>: <code>repartition(n)</code>.',
      '<code>Exchange SinglePartition</code>: global aggregate, or a window without <code>partitionBy</code>. This is a red flag on big data.',
      'With AQE the initial plan shows <code>isFinalPlan=false</code>. The SQL tab shows the final one with <code>AQEShuffleRead</code> nodes.'
    ],
    code: 'out.explain("formatted")        # physical plan with Exchange nodes\nout.explain("cost")             # with size statistics (helps predict broadcast)'
  },
  {
    id: 'F3', cat: 'fundamentals', level: 'Intermediate', src: 'lab',
    q: 'Which setting controls the number of tasks in each stage? Name all three and explain when each one applies.',
    a: 'The <b>source</b> sets the first stage, <b><code>spark.sql.shuffle.partitions</code></b> (or AQE) sets stages after a DataFrame exchange, and <b><code>spark.default.parallelism</code></b> applies only to RDD operations.',
    points: [
      '<b>File reads</b>: maxSplitBytes = min(<code>spark.sql.files.maxPartitionBytes</code> (128 MB), max(<code>openCostInBytes</code> (4 MB), totalBytes ÷ defaultParallelism)). Small datasets get split finer so all cores are used.',
      '<b>JDBC</b>: <code>numPartitions</code>, or 1 when no partitioning is configured.',
      '<b>Kafka</b>: one task per topic-partition (<code>minPartitions</code> can split further).',
      '<b>After an exchange</b>: <code>spark.sql.shuffle.partitions</code> (200), then AQE coalesces or splits. An explicit <code>repartition(n)</code> wins.',
      '<b>RDD API</b>: <code>spark.default.parallelism</code> (total cores on most cluster managers).'
    ],
    lab: { op: 'select', volIdx: 0 }
  },
  {
    id: 'F4', cat: 'fundamentals', level: 'Advanced', src: 'lab',
    q: 'repartition(n), repartition(n, col), repartitionByRange, coalesce(n) and the REBALANCE hint: when do you use each?',
    a: '<code>coalesce</code> is narrow and only reduces partitions. Every <code>repartition</code> variant is a full shuffle. <code>REBALANCE</code> lets AQE pick sizes and split skew while it repartitions.',
    table: [['API', 'Shuffle?', 'Use when'],
      ['coalesce(n)', 'No', 'Reduce partitions slightly at the end of a small job. Also collapses upstream parallelism!'],
      ['repartition(n)', 'Yes (round robin)', 'Even out badly skewed or oversized partitions; increase parallelism after a gzip read'],
      ['repartition(n, col)', 'Yes (hash)', 'Cluster rows before partitionBy writes or repeated joins on col'],
      ['repartitionByRange(n, col)', 'Yes (range + sample)', 'Range-clustered output, sorted files, data skipping'],
      ['/*+ REBALANCE(col) */', 'Yes (AQE-sized)', 'Write-ready files: AQE coalesces small and splits skewed partitions']],
    lab: { op: 'coalesce', volIdx: 6 }
  },
  {
    id: 'F5', cat: 'fundamentals', level: 'Intermediate', src: 'lab',
    q: 'Why does a groupBy().sum() on 1 TB shuffle only a few GB, while a groupBy().agg(collect_list()) on the same data shuffles almost 1 TB?',
    a: 'Algebraic aggregates run a <b>partial (map-side) aggregation</b> first, so each map task sends one row per key. <code>collect_list</code>, <code>countDistinct</code> and similar aggregates cannot shrink their input, so every row crosses the network.',
    points: [
      'In the plan look for <code>HashAggregate(... partial_sum ...)</code> → <code>Exchange</code> → <code>HashAggregate(... sum ...)</code>.',
      'Partial aggregation also <b>absorbs skew</b>: a hot key becomes a single row per map task.',
      'With high-cardinality keys (e.g. order_id) partial aggregation saves little, and Spark may skip it adaptively.',
      'Replace <code>countDistinct</code> with <code>approx_count_distinct</code> when a ±2% answer is acceptable.'
    ],
    lab: { op: 'groupby', volIdx: 7, skew: 'severe' }
  },

  // ----------------------------------------------------------------- SKEW
  {
    id: 'S1', cat: 'skew', level: 'Advanced', src: 'lab',
    q: 'Name the three runtime optimizations AQE performs, with their key configs.',
    a: 'AQE re-plans at each stage boundary using real shuffle statistics. It (1) coalesces small partitions, (2) splits skewed join partitions, and (3) switches join strategy, usually sort-merge to broadcast, with a local shuffle reader.',
    table: [['Feature', 'Config', 'Default'],
      ['Coalesce partitions', 'spark.sql.adaptive.coalescePartitions.enabled / advisoryPartitionSizeInBytes', 'true / 64 MB'],
      ['Favor parallelism', 'spark.sql.adaptive.coalescePartitions.parallelismFirst', 'true (ignores advisory size, keeps ≥ default parallelism)'],
      ['Skew join', 'spark.sql.adaptive.skewJoin.enabled / skewedPartitionFactor / ThresholdInBytes', 'true / 5 / 256 MB'],
      ['Runtime broadcast', 'spark.sql.adaptive.autoBroadcastJoinThreshold', 'falls back to autoBroadcastJoinThreshold'],
      ['Local shuffle reader', 'spark.sql.adaptive.localShuffleReader.enabled', 'true']],
    points: ['AQE is on by default since Spark 3.2. Keep it on, and set a generous initial <code>shuffle.partitions</code> so it has room to coalesce.', 'Set <code>parallelismFirst=false</code> on busy shared clusters so the advisory size is respected.']
  },
  {
    id: 'S2', cat: 'skew', level: 'Expert', src: 'lab',
    q: 'How do you write a two-phase (salted) aggregation for a skewed groupBy with a non-reducing aggregate?',
    a: 'Aggregate on <code>(key, salt)</code> first so the hot key spreads across N tasks, then aggregate those partial results on <code>key</code>. This only works when the aggregate can be merged, e.g. arrays concatenate and sums add.',
    code: 'N = 32\nstage1 = (orders.withColumn("salt", (F.rand() * N).cast("int"))\n          .groupBy("customer_id", "salt")\n          .agg(F.collect_list("product_id").alias("p"), F.sum("amount").alias("amt")))\nresult = (stage1.groupBy("customer_id")\n          .agg(F.flatten(F.collect_list("p")).alias("basket"), F.sum("amt").alias("revenue")))',
    points: ['Phase 2 shuffles at most N rows per key, so the skew is gone.', 'This does not work for exact <code>countDistinct</code>: use <code>approx_count_distinct</code> or dedupe on (key, value) first.', 'Choose N from the skew ratio: N ≈ hot-key bytes ÷ target partition size.'],
    lab: { op: 'groupby_collect', skew: 'severe', volIdx: 7 }
  },
  {
    id: 'S3', cat: 'skew', level: 'Advanced', src: 'lab',
    q: '35% of fact rows have customer_id = NULL, and the join to customers is crawling. What is the cleanest fix?',
    a: 'NULL keys never match in an inner or left join. Split them off and handle them separately, so they never enter the shuffle.',
    code: 'nulls  = orders.filter(F.col("customer_id").isNull())\nvalid  = orders.filter(F.col("customer_id").isNotNull())\njoined = valid.join(customers, "customer_id", "left")\nout = joined.unionByName(nulls, allowMissingColumns=True)   # NULL rows keep null dim columns',
    points: ['The same applies to sentinel values like <code>-1</code>, <code>0</code>, <code>"UNKNOWN"</code>.', 'For a genuine hot key (one mega-customer), broadcast that key\'s dimension rows: join the hot slice with a broadcast join, the rest with a sort-merge join, and union the results.'],
    lab: { op: 'join_large', skew: 'severe', volIdx: 7, aqe: false }
  },
  {
    id: 'S4', cat: 'skew', level: 'Intermediate', src: 'lab',
    q: 'Where in the Spark UI do you confirm skew, and what numbers prove it?',
    a: 'Open the stage page → <b>Summary Metrics</b>. Skew shows as Max far above the 75th percentile for Duration, Shuffle Read Size and Spill. Then sort the task table by Shuffle Read Size.',
    points: ['Rule of thumb: Max > 5× median and > 256 MB is skew (the same test AQE uses).', 'The SQL tab DAG shows rows per operator. A join whose output is far bigger than its inputs is a many-to-many explosion, not skew.', 'Event timeline: one long bar after all the others have finished.', 'Confirm the key with <code>groupBy(key).count().orderBy(desc("count"))</code>.']
  },
  {
    id: 'S5', cat: 'skew', level: 'Advanced', src: 'lab',
    q: 'After enabling AQE, a job writes 30 large files instead of 200 and the final UDF stage got slower. What happened?',
    a: 'AQE <b>coalesced</b> the post-shuffle partitions toward the advisory size, which also cut the parallelism of the CPU-heavy UDF stage that follows.',
    points: ['Lower <code>advisoryPartitionSizeInBytes</code> (e.g. 32 MB) for CPU-bound stages, or set <code>coalescePartitions.minPartitionNum</code> / keep <code>parallelismFirst=true</code>.', 'Or put an explicit <code>repartition(n)</code> before the expensive UDF. AQE does not coalesce explicit repartition-by-number.', 'Python UDFs are CPU-bound per row: use pandas UDFs (Arrow) or built-in functions.']
  },

  // ---------------------------------------------------------------- JOINS
  {
    id: 'J1', cat: 'joins', level: 'Advanced', src: 'lab',
    q: 'A broadcast join on a "small" 300 MB dimension times out or OOMs the driver. Why, and what do you do?',
    a: 'The broadcast is built on the <b>driver</b> as an in-memory hash relation that is often 2–5× the on-disk Parquet size, then shipped to every executor. Size estimates also go wrong after filters and UDFs.',
    points: ['Symptoms: <code>SparkException: Could not execute broadcast in 300 secs</code> (<code>spark.sql.broadcastTimeout</code>), driver OOM, <code>spark.driver.maxResultSize</code> exceeded.', 'Fix: shrink the dim first (select only needed columns, filter), give the driver memory, or drop the hint and let a sort-merge / shuffled-hash join run.', 'Do not raise <code>autoBroadcastJoinThreshold</code> to GBs globally. Use <code>F.broadcast()</code> on known-small tables only.', 'AQE can still convert to broadcast at runtime when the <em>actual</em> post-filter size is small.'],
    code: 'dim = spark.table("dim_customer").select("customer_id", "segment").filter("active")\nout = facts.join(F.broadcast(dim), "customer_id")',
    lab: { op: 'join_small', bcast: 100 * 1048576, volIdx: 6 }
  },
  {
    id: 'J2', cat: 'joins', level: 'Expert', src: 'lab',
    q: 'How does Spark choose a join strategy, and when would you hint SHUFFLE_HASH over the default sort-merge?',
    a: 'For equi-joins the preference is: broadcast hash (under the threshold or hinted), then sort-merge (the default for large tables), then shuffled hash (if <code>preferSortMergeJoin=false</code> or hinted), then broadcast nested loop / cartesian for non-equi joins.',
    points: ['Hints: <code>BROADCAST</code>, <code>MERGE</code>, <code>SHUFFLE_HASH</code>, <code>SHUFFLE_REPLICATE_NL</code>.', 'Shuffled hash join skips the sort on both sides. It wins when one side is moderately small per partition (fits in memory after the shuffle) but too big to broadcast.', 'Sort-merge join is robust: it can spill. Hash join builds can OOM if a partition is larger than expected.', 'Non-equi joins (range conditions) become nested loops. Rewrite with bucketed range keys when possible.'],
    code: 'orders.join(customers.hint("SHUFFLE_HASH"), "customer_id")\nspark.conf.set("spark.sql.join.preferSortMergeJoin", "false")'
  },
  {
    id: 'J3', cat: 'joins', level: 'Expert', src: 'lab',
    q: 'Two 5 TB tables are joined on the same key by ten different jobs every day. How do you stop paying for the shuffle every time?',
    a: 'Pre-shuffle once at write time by <b>bucketing</b> (Hive/Spark tables), <b>storage-partitioned joins</b> (Iceberg/DSv2), or by clustering on the join key (Delta liquid clustering / Z-ORDER), which helps data skipping but does not remove the shuffle.',
    code: '(orders.write.bucketBy(512, "customer_id").sortBy("customer_id")\n       .saveAsTable("silver.orders_b"))\n(customers.write.bucketBy(512, "customer_id").sortBy("customer_id")\n       .saveAsTable("silver.customers_b"))\n# join of the two bucketed tables -> no Exchange in the plan',
    points: ['Both sides need the same bucket column and compatible bucket counts. Check <code>explain()</code> for the missing Exchange.', 'Bucketing also helps repeated aggregations on the same key.', 'Cost: write-time shuffle, and N×buckets files per write. Keep bucket files sized sensibly.']
  },
  {
    id: 'J4', cat: 'joins', level: 'Intermediate', src: 'lab',
    q: 'A join stage looks skewed, but no single key is hot. Output rows are 40× input rows. What is it?',
    a: 'A <b>many-to-many join explosion</b>: duplicate keys on both sides multiply. This is a data-modeling bug, not a tuning problem.',
    points: ['Check uniqueness: <code>dim.groupBy(k).count().filter("count > 1")</code>.', 'Deduplicate or aggregate one side before the join, or add the missing join columns (e.g. effective dates for SCD2).', 'In the SQL tab compare "number of output rows" of the join with its inputs.']
  },

  // -------------------------------------------------------------- SOURCES
  {
    id: 'R1', cat: 'sources', level: 'Advanced', src: 'lab',
    q: 'You must read a 500M-row Oracle table over JDBC within one hour. Design the read.',
    a: 'Parallelize the read with a <b>partitionColumn</b> (indexed, numeric or date) plus bounds and numPartitions, raise <b>fetchsize</b>, push filters and projection down, and cap concurrency at what the database can serve. Ideally read from a replica.',
    code: 'df = spark.read.jdbc(\n    url, "(SELECT order_id, customer_id, amount, order_ts FROM sales.orders\n           WHERE order_ts >= DATE \'2026-01-01\') src",\n    column="order_id", lowerBound=1, upperBound=500_000_000, numPartitions=32,\n    properties={**props, "fetchsize": "10000", "sessionInitStatement":\n                "ALTER SESSION SET \\"_serial_direct_read\\" = TRUE"})',
    points: ['Bounds define <b>strides, not filters</b>: rows outside them go to the first/last partition.', 'Strides are equal value ranges. If ids are sparse or clustered, use <code>predicates=[...]</code> built from quantiles, or <code>mod(ora_hash(id), 32) = i</code>.', 'Oracle\'s default fetchsize is 10 rows, which makes the read round-trip bound. Set 5K–20K.', 'Watch the DB side: 32 parallel full-range scans need an index on the column or partition-aligned predicates.'],
    lab: { source: 'jdbcN', op: 'filter', volIdx: 5 }
  },
  {
    id: 'R2', cat: 'sources', level: 'Intermediate', src: 'lab',
    q: 'spark.read.jdbc(url, "big_table").filter(...).groupBy(...).count() runs for hours with 1 task. Why?',
    a: 'No partitioning options means <b>one connection, one task</b>. Only simple filters are pushed down. Without <code>pushDownAggregate</code> the whole projected table streams through one socket before Spark aggregates it.',
    points: ['Add partitioning options (see the previous question) or push the aggregation into SQL with the <code>query</code> option.', 'Spark 3.2+: <code>pushDownAggregate=true</code>, <code>pushDownLimit</code> and <code>pushDownTableSample</code> for supported dialects.', 'Verify with <code>explain()</code>: <code>PushedFilters</code>, <code>PushedAggregates</code>.'],
    code: 'spark.read.format("jdbc").option("url", url)\n  .option("query", "SELECT region, COUNT(*) c FROM sales.orders GROUP BY region").load()',
    lab: { source: 'jdbc1', op: 'groupby', volIdx: 5 }
  },
  {
    id: 'R3', cat: 'sources', level: 'Advanced', src: 'lab',
    q: 'A landing bucket has 2 million 50 KB JSON files. The Spark job sits for 20 minutes before the first task starts. Explain and fix.',
    a: 'The <b>driver lists 2M objects</b> (thousands of LIST calls) and builds the file index, so nothing runs until that finishes. Executors then pay a GET and open cost per file. The cure is fewer, bigger files.',
    points: ['Ingest incrementally with Auto Loader / file notifications instead of re-listing everything.', 'Compact into 128 MB–1 GB Parquet/Delta (<code>OPTIMIZE</code>, auto-compaction).', 'Avoid deep recursive globs. Read a partition path directly.', 'Short-term: raise <code>spark.sql.files.maxPartitionBytes</code>/<code>openCostInBytes</code> so each task packs more files. This reduces task count, not listing time.'],
    lab: { source: 'smallfiles', op: 'filter', volIdx: 5 }
  },
  {
    id: 'R4', cat: 'sources', level: 'Intermediate', src: 'lab',
    q: 'A vendor drops one 40 GB orders.csv.gz daily. The read stage has exactly 1 task. Options?',
    a: 'Gzip is not splittable, so one file means one task. Either change the producer (split files, or use bzip2/zstd-seekable/Parquet), or pay once: read it, then <code>repartition()</code> immediately so every later stage is parallel.',
    code: 'raw = spark.read.schema(orders_schema).option("header", True).csv("s3://drops/orders.csv.gz")\norders = raw.repartition(400)   # one-time shuffle buys parallelism for the rest',
    points: ['Always pass a schema: <code>inferSchema</code> reads the file twice.', 'Better still, land into a bronze Delta table once and have every consumer read that.'],
    lab: { source: 'csvgz', op: 'repartition', volIdx: 4 }
  },
  {
    id: 'R5', cat: 'sources', level: 'Advanced', src: 'lab',
    q: 'A filter on a Parquet/Delta table is not pruning: the job reads all files. What breaks predicate pushdown and partition pruning?',
    a: 'Pushdown only works on <b>simple predicates on raw columns</b> with compatible types. Functions, casts and UDFs on the column hide it from the scan.',
    points: ['<code>F.to_date("event_ts") == "2026-10-13"</code> on a partition column → no pruning. Filter on the partition column itself.', 'Type mismatch (string column vs int literal) inserts a cast on the column.', 'Python UDFs in the predicate are never pushed down.', 'Check <code>PartitionFilters</code>, <code>PushedFilters</code> and <code>DataFilters</code> in <code>explain("formatted")</code>.', 'Dynamic partition pruning helps fact ⋈ filtered-dim joins on partition columns.']
  },
  {
    id: 'R6', cat: 'sources', level: 'Intermediate', src: 'lab',
    q: 'Why is reading 2 TB from Snowflake or Redshift through the generic JDBC driver a bad idea, and what do native connectors do instead?',
    a: 'Generic JDBC streams rows through the warehouse leader node over a few sockets. Native connectors push the query down, <b>UNLOAD in parallel to cloud storage</b>, and Spark reads the staged Parquet with full parallelism.',
    points: ['Snowflake Spark connector, Redshift (UNLOAD via S3), BigQuery Storage Read API (Arrow streams), Synapse (COPY / PolyBase).', 'Push filters and aggregations into the warehouse with the <code>query</code> option.', 'Size the warehouse for the unload, and clean up the temp stage.'],
    lab: { source: 'mpp', op: 'filter', volIdx: 8 }
  },

  // -------------------------------------------------------------- TARGETS
  {
    id: 'W1', cat: 'targets', level: 'Advanced', src: 'lab',
    q: 'df.write.partitionBy("event_date") on a year of data produced 400,000 tiny files. Do the math and fix it.',
    a: 'Each task writes <b>one file per partition value it contains</b>. With ~1,100 tasks after a shuffle and rows from all 365 dates in every task, that is ≈ 1,100 × 365 ≈ 400K files. Cluster rows by the partition column before writing.',
    code: '(df.repartition("event_date")                     # ~1 file per date\n   .write.partitionBy("event_date").parquet(path))\n\n# big days: spread each date over several files\n(df.repartition(730, "event_date", (F.rand() * 4).cast("int"))\n   .write.option("maxRecordsPerFile", 5_000_000)\n   .partitionBy("event_date").parquet(path))',
    points: ['On Delta, <code>optimizeWrite</code> / auto-compaction do this for you.', 'Do not over-partition: aim for ≥ 1 GB per partition directory. Use liquid clustering / Z-ORDER for high-cardinality columns.'],
    lab: { source: 'parquet', op: 'filter', target: 'partitioned', volIdx: 6 }
  },
  {
    id: 'W2', cat: 'targets', level: 'Advanced', src: 'lab',
    q: 'Writing 100M rows to PostgreSQL over JDBC takes hours and the DBA reports 200 sessions and lock waits. Fix it.',
    a: 'Each partition is a session doing batched INSERTs. Cap the sessions, increase batch size, enable driver-side batch rewriting, and for large loads switch to bulk-load paths.',
    code: '(out.coalesce(16)\n    .write.mode("append")\n    .option("batchsize", 10000)\n    .option("isolationLevel", "NONE")\n    .jdbc(url + "?reWriteBatchedInserts=true", "stage.orders", properties=props))\n# then INSERT ... SELECT / swap partitions inside the DB',
    points: ['MySQL: <code>rewriteBatchedStatements=true</code>. SQL Server: the bulk copy connector.', 'Write into an unindexed staging table, then merge or swap. Do not let 200 writers fight over the indexes of a live table.', 'Very large volumes: write files and use <code>COPY</code> / bcp / SQL*Loader.'],
    lab: { op: 'select', target: 'jdbc', volIdx: 5, parts: 200 }
  },
  {
    id: 'W3', cat: 'targets', level: 'Expert', src: 'lab',
    q: 'A daily Delta MERGE of 5 GB of changes into a 10 TB table takes 2 hours. Where does the time go, and how do you cut it?',
    a: 'MERGE first finds target files that might match (a join, often a full scan without pruning), then shuffles source and those files on the merge key, and finally <b>rewrites whole files</b>. Cut the scanned and rewritten files.',
    points: ['Add partition or cluster predicates to the ON clause (<code>t.event_date = s.event_date AND …</code>) so file pruning works.', 'Cluster the target on the merge key (liquid clustering / Z-ORDER), so changes touch few files.', 'Enable deletion vectors so updates mark rows instead of rewriting files.', 'Deduplicate the source: multiple matches per target row fail the MERGE.', 'Broadcast a small source, and keep target files ~256 MB–1 GB.'],
    code: '(target.alias("t").merge(src.alias("s"),\n    "t.event_date = s.event_date AND t.order_id = s.order_id")\n   .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())',
    lab: { op: 'filter', target: 'delta_merge', volIdx: 4 }
  },
  {
    id: 'W4', cat: 'targets', level: 'Intermediate', src: 'lab',
    q: 'Why is df.coalesce(1).write.csv(...) on a 200 GB result a production anti-pattern?',
    a: '<code>coalesce</code> is narrow, so the <b>entire upstream stage</b> collapses into one task. One core reads, transforms and writes 200 GB.',
    points: ['If a single file is truly required, use <code>repartition(1)</code> (upstream stays parallel), or better, write N files and concatenate downstream.', 'For "fewer files", use AQE / <code>REBALANCE</code> or <code>optimizeWrite</code>.'],
    lab: { op: 'coalesce', volIdx: 6 }
  },

  // --------------------------------------------------------------- MEMORY
  {
    id: 'M1', cat: 'memory', level: 'Expert', src: 'lab',
    q: 'A shuffle-heavy stage fails with FetchFailedException and "Container killed … exceeding memory limits". Diagnose it.',
    a: 'An executor died, usually killed for overrunning <b>off-heap / overhead</b> memory (Netty buffers, Python workers, Arrow), or lost to spot preemption, so reducers could not fetch its shuffle files.',
    points: ['Raise <code>spark.executor.memoryOverhead</code> (default max(384 MB, 10%)). PySpark and Arrow workloads need more.', 'Make partitions smaller: more shuffle partitions, fix skew. Huge partitions mean huge fetch and sort buffers.', 'Use the external shuffle service or shuffle tracking / decommissioning so shuffle files survive executor loss.', 'Tolerate flaky networks: <code>spark.shuffle.io.maxRetries</code>, <code>spark.shuffle.io.retryWait</code>.', 'On Kubernetes this shows up as pod exit code 137 (OOMKilled). See the DevOps questions.']
  },
  {
    id: 'M2', cat: 'memory', level: 'Intermediate', src: 'lab',
    q: 'What do "Spill (Memory)" and "Spill (Disk)" mean in the Spark UI, and how do you reduce spill?',
    a: 'When execution memory fills, Spark serializes sorted runs to local disk. <b>Spill (Memory)</b> is the deserialized size of the spilled data, <b>Spill (Disk)</b> the compressed bytes written. Both mean the partition was too big for the task\'s memory share.',
    points: ['Per-task execution memory ≈ (executor heap − 300 MB) × <code>spark.memory.fraction</code> (0.6) ÷ concurrent tasks (cores).', 'Shrink partitions (more shuffle partitions, fix skew), give each task more memory (fewer cores per executor, more heap), and avoid wide rows (drop unused columns before the shuffle).', 'Some spill is fine. Spill ≫ input size, or rising GC time, is not.'],
    lab: { op: 'window', card: 'medium', volIdx: 7 }
  },
  {
    id: 'M3', cat: 'memory', level: 'Advanced', src: 'lab',
    q: 'Your largest exchange shuffles 1.2 TB on 200 cores. Pick spark.sql.shuffle.partitions and justify it.',
    a: 'Target about 128–200 MB per partition: 1.2 TB ÷ 128 MB ≈ <b>9,600</b>. That is 48 waves on 200 cores, short enough that stragglers and retries are cheap. With AQE, set a high initial value and let coalescing fix the low end.',
    code: '1.2 TB / 128 MB  = 9,830  → 9,600 (a multiple of 200 cores = 48 even waves)\n1.2 TB / 200 MB  = 6,291  → 6,400 (32 waves) if executor memory is generous',
    points: ['Too few partitions means spill and OOM. Too many means scheduler overhead (≈ 2K task launches/s on the driver) and tiny files.', 'Use the Shuffle Write column of the previous run instead of guessing.'],
    lab: { op: 'join_large', volIdx: 8, parts: 'auto' }
  },
  {
    id: 'M4', cat: 'memory', level: 'Advanced', src: 'lab',
    q: 'How do you size executors on 16-core / 128 GB nodes for shuffle-heavy work?',
    a: 'Use <b>3 executors × 5 cores</b> per node (leave a core and some RAM for the OS and daemons), about 36 GB heap plus 4 GB overhead each. That keeps per-task memory around 4 GB and GC manageable.',
    points: ['More than about 5 cores per executor contends on HDFS/S3 client threads and lengthens GC pauses. A 1-core executor wastes broadcast copies and JVM overhead.', 'Enable dynamic allocation with <code>spark.dynamicAllocation.shuffleTracking.enabled=true</code> (or the external shuffle service).', 'Check GC time in the Executors tab. Over 10% of task time means more memory per task or smaller partitions.']
  },
  {
    id: 'M5', cat: 'memory', level: 'Intermediate', src: 'lab',
    q: 'A DataFrame is used by three actions and the same shuffle shows up three times in the UI. What are your options?',
    a: 'Each action recomputes the lineage. <b>Cache/persist</b> the post-shuffle result when it is reused and fits, or <b>checkpoint</b> or write it to Delta when the lineage is long or the reuse crosses jobs.',
    points: ['<code>df.persist(StorageLevel.MEMORY_AND_DISK)</code>, materialize once with <code>count()</code>, and <code>unpersist()</code> when done.', 'Do not cache everything: caching evicts execution memory and causes the spill you are trying to avoid.', 'Spark can already reuse identical exchanges within one query (<code>ReusedExchange</code>).']
  },

  // -------------------------------------------------------------- WINDOWS
  {
    id: 'X1', cat: 'windows', level: 'Intermediate', src: 'lab',
    q: 'Window.orderBy("ts") with no partitionBy works in dev but hangs in production. Why?',
    a: 'Without <code>partitionBy</code>, Spark moves <b>all rows to a single partition</b> (<code>Exchange SinglePartition</code>) and logs "No Partition Defined for Window operation!". One task sorts the entire dataset.',
    points: ['Add a partition key (e.g. per customer, per day).', 'For a global running number, use <code>monotonically_increasing_id()</code> or <code>zipWithIndex</code> (not dense, but parallel).', 'For global top-N, use <code>orderBy(...).limit(n)</code>: TakeOrderedAndProject keeps only N rows per partition.'],
    lab: { op: 'window', card: 'low', volIdx: 6 }
  },
  {
    id: 'X2', cat: 'windows', level: 'Advanced', src: 'lab',
    q: 'You need the latest order per customer on 2 TB. Compare row_number() over a window with an aggregation-based approach.',
    a: 'A window shuffles <b>every row</b> and sorts each partition. <code>max_by</code> / <code>max(struct(ts, …))</code> uses <b>partial aggregation</b>, so each map task sends one row per customer. That means far less shuffle and less exposure to skew.',
    code: '# window: full shuffle + sort\nw = Window.partitionBy("customer_id").orderBy(F.desc("order_ts"))\nlatest = orders.withColumn("rn", F.row_number().over(w)).filter("rn = 1")\n\n# aggregation: map-side combine\nlatest = (orders.groupBy("customer_id")\n                .agg(F.max_by(F.struct(*orders.columns), "order_ts").alias("r"))\n                .select("r.*"))',
    lab: { op: 'window', volIdx: 8 }
  },
  {
    id: 'X3', cat: 'windows', level: 'Intermediate', src: 'lab',
    q: 'When is orderBy() wasteful, and what should you use instead?',
    a: 'A global sort runs a <b>sampling job</b>, a range shuffle of all data, and a sort. Downstream consumers rarely need total order across files.',
    points: ['Need sorted data inside each file (better compression and min/max skipping)? Use <code>sortWithinPartitions</code>, which needs no shuffle.', 'Need the top N? Use <code>orderBy().limit(N)</code>.', 'Need clustering for reads? Use Z-ORDER / liquid clustering on write.', 'A heavily repeated sort value (NULL) lands in one range partition. Handle the NULLs separately.'],
    lab: { op: 'orderby', volIdx: 7, skew: 'moderate' }
  },

  // ------------------------------------------------------------ STREAMING
  {
    id: 'ST1', cat: 'streaming', level: 'Expert', src: 'lab',
    q: 'You raised spark.sql.shuffle.partitions for a stateful streaming aggregation, but the query still uses 200 partitions. Why?',
    a: 'Stateful streaming queries record the shuffle partition count in the <b>checkpoint</b>. The state store is partitioned by it, so it cannot change for that checkpoint.',
    points: ['Choose the count before the first run, sized for the state you expect to hold.', 'Changing it requires a new checkpoint (a state migration or reprocessing).', 'Use the RocksDB state store provider for large state, plus a watermark so state is evicted.']
  },
  {
    id: 'ST2', cat: 'streaming', level: 'Advanced', src: 'lab',
    q: 'A Kafka micro-batch job falls behind every hour. Its trigger processes ~30 GB in 30 tasks. What do you change?',
    a: 'Read parallelism equals the number of Kafka partitions (30). Raise it with <code>minPartitions</code>, bound each batch with <code>maxOffsetsPerTrigger</code>, and keep shuffle partitions in line with cores.',
    points: ['<code>minPartitions</code> splits large topic-partitions into several Spark tasks.', '<code>maxOffsetsPerTrigger</code> keeps batch duration predictable.', 'Stream-static joins: broadcast the static side, and refresh it on a schedule.', 'Watch the "input rate vs processing rate" chart in the Structured Streaming tab.']
  },

  // --------------------------------------------------------------- DEVOPS
  {
    id: 'D1', cat: 'devops', level: 'Intermediate', src: 'md',
    q: 'A developer pushes a commit and the CI/CD pipeline fails immediately. What is your standard procedure?',
    a: 'Work outward from the logs: build errors, then trigger and branch configuration, then the agent environment and caches, then reproduce in a container that mirrors the CI worker.',
    points: ['<b>Build logs</b>: compilation, lint or dependency-resolution errors.', '<b>Webhook and branch</b>: payload delivered (200 OK), pipeline targets the right branch and ref.', '<b>Workspace and cache</b>: agent permissions, credentials, stale dependency cache (invalidate and rebuild).', '<b>Reproduce</b>: run the unit tests locally in the CI image.', 'For Spark jobs, also check that the packaged wheel or JAR and the cluster runtime versions match (Python, Scala 2.12 vs 2.13, Spark version).'],
    flow: ['Code push', 'Webhook triggered', 'Build logs', 'Syntax/unit error → block merge', 'Env error → agent & credentials', 'Dependency → rebuild cache']
  },
  {
    id: 'D2', cat: 'devops', level: 'Advanced', src: 'md',
    q: 'A newly deployed container (or Spark executor pod) is in CrashLoopBackOff. How do you triage it?',
    a: 'Read the <b>previous</b> container\'s logs and the pod description for the exit code. Exit code 137 means OOMKilled, exit code 1 means an application error. Then check environment variables, secrets and probes.',
    code: 'kubectl logs <pod> --previous\nkubectl describe pod <pod>          # Last State: Terminated, Reason: OOMKilled, Exit Code: 137\ndocker logs <container_id>',
    points: ['<b>137 / OOMKilled</b>: usage exceeded <code>resources.limits.memory</code>. For Spark on K8s, pod memory = <code>spark.executor.memory</code> + overhead (<code>spark.kubernetes.memoryOverheadFactor</code>, 0.1 JVM / 0.4 non-JVM). Raise the overhead for PySpark.', '<b>Exit 1</b>: missing env vars or secrets, an unhandled startup exception, or a bad <code>CMD</code>/<code>ENTRYPOINT</code>.', '<b>Probes</b>: a liveness probe that fires before startup finishes kills a healthy app. Raise <code>initialDelaySeconds</code> or add a startupProbe.']
  },
  {
    id: 'D3', cat: 'devops', level: 'Intermediate', src: 'md',
    q: 'A build passes every integration test in staging but fails after deployment to production. What causes this drift, and how do you prevent it?',
    a: 'The environments differ: OS libraries, runtime versions, configuration, secrets or data. Make them identical by construction.',
    points: ['<b>Immutable images</b>: ship the same Docker image (same digest) to every environment.', '<b>Infrastructure as Code</b>: Terraform/Ansible provision staging and prod from the same modules.', '<b>Config and secrets</b>: a central secret manager, with config validated at startup.', 'Spark-specific: pin the cluster runtime (e.g. Databricks Runtime), Spark configs and library versions in the job definition, and run tests on production-like data volumes, since shuffle problems appear only at scale.']
  },
  {
    id: 'D4', cat: 'devops', level: 'Advanced', src: 'lab',
    q: 'How do you catch shuffle regressions before production, instead of finding them in the 3 AM pager alert?',
    a: 'Treat the physical plan and stage metrics as test artifacts: snapshot <code>explain()</code> in CI, run a scaled benchmark, and alert on metric drift such as shuffle bytes, spill, skew ratio and task count per stage.',
    points: ['CI check: assert the number of <code>Exchange</code> nodes, and fail when a broadcast unexpectedly becomes a sort-merge join.', 'Publish Spark listener or event-log metrics (shuffle read/write, spill, max/median task time) to your observability stack.', 'Keep a representative skewed sample dataset. Uniform synthetic data hides skew bugs.', 'Track the input data profile (key cardinality, top-N key share, file counts) as part of data-quality checks.']
  }
];
