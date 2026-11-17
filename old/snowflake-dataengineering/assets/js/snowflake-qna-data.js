/* =============================================================================
   Snowflake interview Q&A bank
   Rendered by snowflake-common.js (topic pages) and interview-qna.html (bank).
   a: HTML. Code blocks use <pre class="sf-sql"> and must escape "<" as &lt;.
   level: beginner | intermediate | advanced
   ============================================================================= */
window.SF_QNA = [
  // ---------------------------------------------------------------- Warehouses
  {
    id: 'wh-1', topic: 'Warehouses', level: 'beginner',
    q: 'What is a virtual warehouse, and does it store data?',
    a: `<p>A virtual warehouse is a named cluster of compute resources (CPU, memory, local SSD) that executes queries, DML and loads. It does <strong>not</strong> permanently store data. All table data lives in the storage layer, so you can drop, resize or recreate a warehouse without losing anything. Its only "state" is a local cache of recently read micro-partitions, which disappears when it suspends.</p>`
  },
  {
    id: 'wh-2', topic: 'Warehouses', level: 'beginner',
    q: 'Scale up vs scale out: when do you use each?',
    a: `<p><strong>Scale up</strong> (bigger size) when individual queries are slow because they are big: large scans, heavy joins, spilling to disk. <strong>Scale out</strong> (multi-cluster, more clusters) when many queries are <em>queuing</em> because of concurrency. A single query always runs on one cluster, so adding clusters never speeds up one slow query, and a bigger size doesn't fix queues that come from too many users.</p>`
  },
  {
    id: 'wh-3', topic: 'Warehouses', level: 'beginner',
    q: 'How is warehouse compute billed? What is the 60-second rule?',
    a: `<p>Credits per hour by size (XS=1, S=2, M=4, L=8, doubling each step), billed <strong>per second</strong> while running, with a <strong>minimum of 60 seconds each time the warehouse starts or resumes</strong>. So suspending and resuming a warehouse every 10 seconds bills 60 seconds each time. Cloud Services usage is billed only for the part that exceeds 10% of that day's warehouse credits.</p>`
  },
  {
    id: 'wh-4', topic: 'Warehouses', level: 'intermediate',
    q: 'What do AUTO_SUSPEND and AUTO_RESUME do, and how do you choose AUTO_SUSPEND?',
    a: `<p><code>AUTO_SUSPEND</code> is the number of idle seconds before the warehouse suspends (600 by default when created with SQL). <code>AUTO_RESUME = TRUE</code> starts it automatically when a query arrives. The trade-off: a short suspend (60 s) minimises idle billing but drops the local cache. A longer one (5&ndash;10 min) keeps the cache warm for BI workloads that hit the same data repeatedly. ETL warehouses usually use 60 s. Never set it to 0/NULL (never suspend) without a resource monitor.</p>`
  },
  {
    id: 'wh-5', topic: 'Warehouses', level: 'intermediate',
    q: 'Explain STANDARD vs ECONOMY scaling policies on a multi-cluster warehouse.',
    a: `<p><strong>STANDARD</strong> favours performance. It starts a new cluster as soon as queries queue (successive clusters roughly 20 s apart) and shuts one down after 2&ndash;3 consecutive one-minute checks show its load could be redistributed. <strong>ECONOMY</strong> favours cost. It only starts a cluster if it estimates at least ~6 minutes of work for it, and removes clusters after 5&ndash;6 checks, accepting some queuing. Both apply only in <em>auto-scale</em> mode (min &lt; max). In <em>maximized</em> mode (min = max) all clusters always run.</p>`
  },
  {
    id: 'wh-6', topic: 'Warehouses', level: 'intermediate',
    q: 'What happens to running queries when you resize a warehouse?',
    a: `<p>Running queries finish on the resources they started with. Only new and queued queries use the new size. Billing switches to the new size once the extra compute is provisioned. Resizing a <em>suspended</em> warehouse costs nothing until it resumes. Resizing also resets the local cache for the new nodes.</p>`
  },
  {
    id: 'wh-7', topic: 'Warehouses', level: 'intermediate',
    q: 'How would you design warehouses for ETL, BI and data science teams sharing one account?',
    a: `<p>Separate warehouses per workload for isolation and cost attribution: e.g. <code>LOAD_WH</code> (S, suspend 60 s), <code>TRANSFORM_WH</code> (M&ndash;L, suspend 60 s), <code>BI_WH</code> (M, multi-cluster 1&ndash;4 STANDARD, suspend 300&ndash;600 s for cache), <code>DS_WH</code> (Snowpark-optimized if memory-heavy). Grant <code>USAGE</code> per team role, attach resource monitors, set <code>STATEMENT_TIMEOUT_IN_SECONDS</code>, and tag warehouses for chargeback with <code>WAREHOUSE_METERING_HISTORY</code>.</p>`
  },
  {
    id: 'wh-8', topic: 'Warehouses', level: 'advanced',
    q: 'Do resource monitors stop all spending? What do they not cover?',
    a: `<p>No. Resource monitors track <strong>warehouse</strong> credits (and Cloud Services usage tied to them) and can notify, suspend (let queries finish) or suspend immediately (cancel queries). They do <strong>not</strong> control serverless features such as Snowpipe, automatic clustering, search optimization maintenance, materialized view refresh, serverless tasks or replication, and they don't cover storage. Use account <strong>budgets</strong> and the <code>METERING_HISTORY</code> / service-specific <code>ACCOUNT_USAGE</code> views for those.</p>`
  },
  {
    id: 'wh-9', topic: 'Warehouses', level: 'beginner',
    q: 'Why do companies choose Snowflake over a traditional database or another cloud warehouse?',
    a: `<p>Storage and compute are separate, so each scales independently and workloads are isolated. It needs almost no administration (no indexes, vacuum or distribution keys). Compute is elastic and billed per second, suspending to zero. Semi-structured data is native (<code>VARIANT</code>). Time Travel and zero-copy cloning are built in. Secure data sharing has no copies, and it runs on AWS, Azure and GCP. A balanced answer adds where it's <em>not</em> ideal: high-frequency OLTP and millisecond lookups (Postgres or Hybrid Tables), or always-on heavy workloads where reserved capacity elsewhere is cheaper.</p>`
  },

  // ---------------------------------------------------------------- Internals
  {
    id: 'in-1', topic: 'Internals', level: 'beginner',
    q: 'Describe Snowflake\'s architecture.',
    a: `<p>Three layers. <strong>Cloud Services</strong>: authentication, metadata, optimizer, transactions, result cache. <strong>Compute</strong>: virtual warehouses (MPP clusters). <strong>Storage</strong>: compressed, columnar micro-partitions in cloud object storage. It's often called a hybrid of shared-disk (one central copy of data) and shared-nothing (each warehouse node processes its own portion in parallel and caches it locally).</p>`
  },
  {
    id: 'in-2', topic: 'Internals', level: 'beginner',
    q: 'What is a micro-partition?',
    a: `<p>The physical storage unit of a table: an immutable file holding 50&ndash;500 MB of uncompressed data (much smaller compressed), stored column by column. Snowflake creates them automatically in load order and keeps metadata per micro-partition and column (min/max, distinct count, null count). That metadata is used to prune partitions at query time. DML never edits a micro-partition. It writes new ones.</p>`
  },
  {
    id: 'in-3', topic: 'Internals', level: 'intermediate',
    q: 'What is partition pruning, and what prevents it?',
    a: `<p>Pruning is skipping micro-partitions whose min/max metadata proves they can't satisfy the <code>WHERE</code> clause, before any data is read. It is defeated by: wrapping the column in a non-prunable function (<code>WHERE TO_CHAR(order_date,'YYYY') = '2026'</code>); filters based on sub-query results that are only known at run time (Snowflake can sometimes prune these dynamically, but not always); and poorly clustered data where every partition's range covers the filter value. Check <em>Partitions scanned vs total</em> in the Query Profile.</p>`
  },
  {
    id: 'in-4', topic: 'Internals', level: 'intermediate',
    q: 'Name the three caches and when each is used.',
    a: `<ul><li><strong>Result cache</strong> (Cloud Services): returns identical query results for 24 hours (renewed on reuse, up to 31 days) if the data hasn't changed. No warehouse needed.</li><li><strong>Metadata cache</strong>: answers <code>COUNT(*)</code>, <code>MIN</code>, <code>MAX</code> and similar from micro-partition metadata, again without a warehouse.</li><li><strong>Warehouse local disk cache</strong>: micro-partition data on the warehouse's SSD. Lost when the warehouse suspends or is resized.</li></ul>`
  },
  {
    id: 'in-5', topic: 'Internals', level: 'intermediate',
    q: 'What is spilling and how do you fix it?',
    a: `<p>When a join, aggregation or sort needs more memory than the warehouse has, intermediate data spills to the local SSD and then to remote object storage. Remote spilling is very slow. Fixes: scale up the warehouse (more memory per query), reduce data earlier (filter and project before joins), fix exploding joins, pre-aggregate, or split the work into steps. Find it with <code>bytes_spilled_to_local_storage</code> and <code>bytes_spilled_to_remote_storage</code> in <code>QUERY_HISTORY</code>.</p>`
  },
  {
    id: 'in-6', topic: 'Internals', level: 'intermediate',
    q: 'Does Snowflake need VACUUM or ANALYZE?',
    a: `<p>No. Micro-partitions are immutable, so there are no dead tuples inside files to compact. Replaced micro-partitions move through Time Travel and Fail-safe and are purged automatically. Statistics are maintained on every write, and Automatic Clustering handles re-organisation for tables with a clustering key. The closest operational concern is <em>storage growth</em> from Time Travel and Fail-safe on high-churn tables, monitored with <code>TABLE_STORAGE_METRICS</code>.</p>`
  },
  {
    id: 'in-7', topic: 'Internals', level: 'advanced',
    q: 'How does a zero-copy clone work, and when does it start costing storage?',
    a: `<p>A clone copies only metadata: the new table points at the same micro-partitions as the source, so it is instant and initially adds no storage. Once either side modifies data, new micro-partitions are written for the changed data only, and those are billed to the object that wrote them. If the source drops micro-partitions that a clone still references, they are kept (shown as <code>RETAINED_FOR_CLONE_BYTES</code>). Clones don't inherit the source's Time Travel history, and a cloned table doesn't copy the source's grants unless you use <code>COPY GRANTS</code>.</p>`
  },
  {
    id: 'in-8', topic: 'Internals', level: 'advanced',
    q: 'How does Snowflake provide ACID transactions and concurrent reads during writes?',
    a: `<p>Each DML commit produces a new table version, a new set of micro-partitions recorded in metadata, and the Cloud Services transaction manager swaps versions atomically. Readers see a consistent snapshot of the version that was current when their statement started (read committed), so reads never block writes and vice versa. Concurrent DML on the same table can be serialised by table-level locks, so many small concurrent <code>UPDATE</code>s queue. Batch them instead.</p>`
  },

  // ---------------------------------------------------------------- Recovery & HA
  {
    id: 'ha-1', topic: 'Recovery & HA', level: 'beginner',
    q: 'How do you back up a Snowflake database?',
    a: `<p>There is no traditional dump/restore. Layers: <strong>Time Travel</strong> (self-service, up to 90 days), <strong>zero-copy clones</strong> taken on a schedule as point-in-time snapshots you control, <strong>Fail-safe</strong> (7 days after Time Travel, Snowflake Support only), <strong>replication</strong> to another region or cloud for disasters, newer snapshot/backup-set features where available, and unloading to your own bucket if regulations require an independent copy.</p>`
  },
  {
    id: 'ha-2', topic: 'Recovery & HA', level: 'intermediate',
    q: 'What is Fail-safe and can you query it?',
    a: `<p>Fail-safe is a non-configurable 7-day period after Time Travel ends, for <strong>permanent</strong> objects only. You <strong>cannot</strong> query or restore from it yourself. Only Snowflake Support can recover data, on a best-effort basis that may take hours or days. It exists for catastrophic events, not routine recovery. Transient and temporary tables have no Fail-safe. Fail-safe bytes are billed as storage.</p>`
  },
  {
    id: 'ha-3', topic: 'Recovery & HA', level: 'intermediate',
    q: 'How is Snowflake highly available within a region?',
    a: `<p>Storage is replicated across multiple availability zones by the cloud provider. Cloud Services run across availability zones. If a warehouse node fails during a query, Snowflake replaces it and retries the affected work. All of this is automatic on every edition. It covers zone failures but not a full-region outage, which needs cross-region replication.</p>`
  },
  {
    id: 'ha-4', topic: 'Recovery & HA', level: 'advanced',
    q: 'Walk through a cross-region failover. What edition do you need and what defines RPO and RTO?',
    a: `<p>Create a <strong>failover group</strong> on the primary account listing object types (databases, roles, users, warehouses, integrations&hellip;), allowed accounts and a <code>REPLICATION_SCHEDULE</code>. Create the replica on the secondary account. During an outage run <code>ALTER FAILOVER GROUP &hellip; PRIMARY</code> on the secondary, and with <strong>Client Redirect</strong> run <code>ALTER CONNECTION &hellip; PRIMARY</code> so apps using the connection URL follow. Failover and Client Redirect require <strong>Business Critical</strong>. Plain replication (read-only replicas) works on all editions. <strong>RPO</strong> is roughly the replication interval. <strong>RTO</strong> is the time to promote and redirect, usually minutes.</p>`
  },
  {
    id: 'ha-5', topic: 'Recovery & HA', level: 'advanced',
    q: 'What does replication not do for you automatically?',
    a: `<p>Secondary databases are read-only until promoted, so you can't write to both sides (it isn't multi-master). Pipes and some integrations need extra steps after failover. External stages still point at the original bucket unless that bucket is also multi-region. Warehouses replicate as definitions and start suspended. Replication compute and cross-region data transfer are billed, so very frequent refreshes of large, churny databases are expensive.</p>`
  },

  // ---------------------------------------------------------------- Tables & Tuning
  {
    id: 'tb-1', topic: 'Tables & Tuning', level: 'beginner',
    q: 'Permanent vs transient vs temporary tables?',
    a: `<p><strong>Permanent</strong>: Time Travel up to 90 days (Enterprise) plus 7-day Fail-safe. <strong>Transient</strong>: persists until dropped but only 0&ndash;1 day of Time Travel and no Fail-safe. Use it for staging or re-creatable data to save storage. <strong>Temporary</strong>: exists only for the session, 0&ndash;1 day Time Travel, no Fail-safe, invisible to other sessions.</p>`
  },
  {
    id: 'tb-2', topic: 'Tables & Tuning', level: 'beginner',
    q: 'Does Snowflake support indexes or partitions?',
    a: `<p>Standard tables have no user-defined indexes and no user-declared partitions. Micro-partitioning is automatic, and its min/max metadata acts like an always-on zone map. To influence performance you use <strong>clustering keys</strong> (range filters), the <strong>Search Optimization Service</strong> (point lookups, substring, VARIANT), <strong>materialized views</strong>, and the <strong>Query Acceleration Service</strong>. <strong>Hybrid tables</strong> do have real indexes and enforced primary keys. External and Iceberg tables let you declare partitions based on file paths.</p>`
  },
  {
    id: 'tb-3', topic: 'Tables & Tuning', level: 'intermediate',
    q: 'When would you define a clustering key, and how do you pick the columns?',
    a: `<p>On large (multi-TB) tables where queries consistently filter or join on certain columns, pruning is poor, and the table is queried more than it changes. Choose 1&ndash;3 columns that appear in filters, ordered from lower to higher cardinality. Avoid very high-cardinality raw values: use expressions like <code>TO_DATE(ts)</code> or <code>SUBSTR(id, 1, 4)</code>. Monitor with <code>SYSTEM$CLUSTERING_INFORMATION</code> (average depth near 1 is good) and the cost with <code>AUTOMATIC_CLUSTERING_HISTORY</code>.</p>`
  },
  {
    id: 'tb-4', topic: 'Tables & Tuning', level: 'intermediate',
    q: 'What are clustering depth and overlap?',
    a: `<p><strong>Overlap</strong>: how many micro-partitions have value ranges that overlap for the clustering columns. <strong>Depth</strong>: for a given value, how many micro-partitions you'd have to scan, i.e. how many overlapping partitions cover it. A perfectly clustered table has depth 1. The higher the average depth, the worse pruning gets. An empty table has depth 0.</p>`
  },
  {
    id: 'tb-5', topic: 'Tables & Tuning', level: 'intermediate',
    q: 'Search Optimization vs clustering key: how do you choose?',
    a: `<p>Clustering improves <em>range</em> pruning on one ordering, for example date ranges. Search Optimization builds a separate access path for <em>selective point lookups</em> on many columns (<code>WHERE email = ?</code>, <code>IN</code> lists, substring and regex, VARIANT fields, geo), independent of physical order. A table can have both: cluster by date for time-range reports and add Search Optimization on <code>customer_id</code> for lookups. Both cost serverless credits and storage.</p>`
  },
  {
    id: 'tb-6', topic: 'Tables & Tuning', level: 'intermediate',
    q: 'Are PRIMARY KEY and UNIQUE constraints enforced?',
    a: `<p>On standard tables, no. Only <code>NOT NULL</code> is enforced. PK, UNIQUE and FK are metadata for documentation and BI tools, and with <code>RELY</code> they let the optimizer eliminate unnecessary joins. Deduplication is the pipeline's job (<code>MERGE</code>, <code>QUALIFY ROW_NUMBER() &hellip; = 1</code>). Hybrid tables do enforce PK, UNIQUE and FK.</p>`
  },
  {
    id: 'tb-7', topic: 'Tables & Tuning', level: 'intermediate',
    q: 'A dashboard query got slow. Walk me through how you tune it.',
    a: `<ol><li>Open the Query Profile and find the most expensive operator.</li><li>Check partitions scanned vs total. If pruning is poor, fix the predicate (no functions on the column) or consider clustering or Search Optimization.</li><li>Check spilling. If there's remote spill, scale up or reduce data earlier.</li><li>Check join row counts for explosions.</li><li>Check queued time. If it's high, scale out or isolate the workload.</li><li>Remove <code>SELECT *</code> and unnecessary <code>ORDER BY</code>.</li><li>If the same aggregate is repeated, consider a materialized or dynamic table.</li><li>Benchmark with <code>USE_CACHED_RESULT = FALSE</code>.</li></ol>`
  },
  {
    id: 'tb-8', topic: 'Tables & Tuning', level: 'intermediate',
    q: 'What is an external table and when would you avoid it?',
    a: `<p>A read-only table over files in an external stage. Snowflake stores only file metadata, each row is exposed as a <code>VALUE</code> VARIANT column, and partition columns are derived from <code>METADATA$FILENAME</code>. Avoid it for hot, frequently queried data. It's slower than native tables (only partition-level pruning), has no DML and no Time Travel. Load the data, put a materialized view on top, or use Iceberg tables for an open-format lake with full functionality.</p>`
  },
  {
    id: 'tb-9', topic: 'Tables & Tuning', level: 'advanced',
    q: 'What is the Query Acceleration Service?',
    a: `<p>An Enterprise feature that offloads parts of eligible queries, typically large scans with selective filters or aggregations, to serverless compute, so outlier queries don't need a permanently bigger warehouse. Enable it per warehouse with <code>ENABLE_QUERY_ACCELERATION = TRUE</code> and cap it with <code>QUERY_ACCELERATION_MAX_SCALE_FACTOR</code> (default 8). Check eligibility with <code>SYSTEM$ESTIMATE_QUERY_ACCELERATION('&lt;query_id&gt;')</code> or the <code>QUERY_ACCELERATION_ELIGIBLE</code> view.</p>`
  },

  // ---------------------------------------------------------------- Loading & Stages
  {
    id: 'ld-1', topic: 'Loading & Stages', level: 'beginner',
    q: 'What types of stages exist?',
    a: `<p>User stage (<code>@~</code>), table stage (<code>@%table</code>), named internal stage (<code>@name</code>, data stored in Snowflake), and named external stage (points to S3, Azure or GCS, ideally through a storage integration). Internal stages are loaded with <code>PUT</code> from SnowSQL or drivers, or by uploading in Snowsight.</p>`
  },
  {
    id: 'ld-2', topic: 'Loading & Stages', level: 'beginner',
    q: 'What is a storage integration and why use it?',
    a: `<p>An account-level object that stores a trust relationship with your cloud provider: an IAM role on AWS, a service principal via consent on Azure, a service account on GCS. Stages reference it instead of embedding access keys, so no secrets appear in SQL, there's no key rotation, and <code>STORAGE_ALLOWED_LOCATIONS</code> restricts which paths are reachable. Creating one needs <code>ACCOUNTADMIN</code> or the <code>CREATE INTEGRATION</code> privilege. Others need <code>USAGE</code> on it to create stages.</p>`
  },
  {
    id: 'ld-3', topic: 'Loading & Stages', level: 'intermediate',
    q: 'How does COPY avoid loading the same file twice?',
    a: `<p><code>COPY INTO</code> keeps <strong>load metadata</strong> per table for 64 days: file name, ETag/checksum and status. Files already loaded successfully are skipped. <code>FORCE = TRUE</code> overrides that and can create duplicates. Files older than 64 days whose status is unknown are skipped by default unless <code>LOAD_UNCERTAIN_FILES = TRUE</code>. Snowpipe keeps its own load history for 14 days.</p>`
  },
  {
    id: 'ld-4', topic: 'Loading & Stages', level: 'intermediate',
    q: 'COPY vs Snowpipe vs Snowpipe Streaming?',
    a: `<p><strong>COPY</strong>: you trigger it, it runs on your warehouse, best for large scheduled batches. <strong>Snowpipe</strong>: serverless, triggered per file by cloud event notifications (S3&rarr;SQS, Azure Event Grid&rarr;Storage Queue, GCS Pub/Sub) or the REST API. Latency is about a minute. <strong>Snowpipe Streaming</strong>: rows pushed through the SDK or Kafka connector without intermediate files, with latency in seconds. Default <code>ON_ERROR</code> is <code>ABORT_STATEMENT</code> for COPY and <code>SKIP_FILE</code> for Snowpipe.</p>`
  },
  {
    id: 'ld-5', topic: 'Loading & Stages', level: 'intermediate',
    q: 'What file sizes are best for loading and why?',
    a: `<p>Roughly 100&ndash;250 MB compressed per file. Load parallelism is per file, so thousands of tiny files add per-file overhead (and Snowpipe charges a per-file overhead), while one huge file can't be split across threads. For Snowpipe, also aim for files arriving about once a minute rather than many tiny files per second.</p>`
  },
  {
    id: 'ld-6', topic: 'Loading & Stages', level: 'advanced',
    q: 'Snowpipe is set up but files are not loading. How do you debug it?',
    a: `<ol><li><code>SELECT SYSTEM$PIPE_STATUS('pipe')</code>: is it RUNNING, and is <code>pendingFileCount</code> or the last received message time moving?</li><li>Check the cloud event setup: S3 notification to the pipe's <code>notification_channel</code> SQS ARN, or Event Grid subscription to the storage queue and the notification integration consent and role.</li><li><code>COPY_HISTORY</code> for the table: errors such as a file format mismatch.</li><li>Path and prefix: does the pipe's COPY path match where files land?</li><li>Permissions: can the integration read the files (<code>LIST @stage</code>)?</li><li>For files that arrived before the fix, run <code>ALTER PIPE &hellip; REFRESH</code> (files staged in the last 7 days).</li></ol>`
  },
  {
    id: 'ld-7', topic: 'Loading & Stages', level: 'intermediate',
    q: 'How do you load semi-structured JSON and query nested arrays?',
    a: `<p>Load into a <code>VARIANT</code> column (or extract fields during COPY with <code>$1:field::type</code>). Query with path notation and flatten arrays:</p>
<pre class="sf-sql">SELECT o.v:order_id::NUMBER AS order_id,
       li.value:sku::STRING   AS sku,
       li.value:qty::NUMBER   AS qty
FROM raw_orders o,
     LATERAL FLATTEN(INPUT => o.v:line_items) li;</pre>`
  },

  // ---------------------------------------------------------------- Time Travel (complex)
  {
    id: 'tt-1', topic: 'Time Travel', level: 'beginner',
    q: 'What is the default Time Travel retention and the maximum?',
    a: `<p>Default is 1 day. Maximum is 1 day on Standard edition and 90 days on Enterprise and above, for permanent objects. Transient and temporary tables max out at 1 day. Setting retention to 0 disables Time Travel for that object.</p>`
  },
  {
    id: 'tt-2', topic: 'Time Travel', level: 'intermediate',
    q: 'Someone ran CREATE OR REPLACE TABLE orders ... and wiped the old table. How do you get the old data back?',
    a: `<p><code>CREATE OR REPLACE</code> <em>drops</em> the old table (it goes into Time Travel) and creates a new one with the same name. <code>UNDROP</code> fails while an object with that name exists, so rename the new one first:</p>
<pre class="sf-sql">ALTER TABLE orders RENAME TO orders_new_bad;
UNDROP TABLE orders;              -- restores the most recently dropped ORDERS
-- inspect, then drop or keep orders_new_bad</pre>
<p>You can't use <code>AT</code>/<code>BEFORE</code> on the new table to reach the old data, because it's a different table object with its own history.</p>`
  },
  {
    id: 'tt-3', topic: 'Time Travel', level: 'advanced',
    q: 'A table was dropped and recreated three times. What does UNDROP restore?',
    a: `<p>Each drop creates a separate dropped version. <code>UNDROP</code> restores the <strong>most recently dropped</strong> version, after you rename or drop the current table with that name. To get an older one, rename the restored table and run <code>UNDROP</code> again, which restores the next most recent, and so on, as long as each is still within its retention. <code>SHOW TABLES HISTORY</code> lists all versions with their <code>dropped_on</code> timestamps.</p>`
  },
  {
    id: 'tt-4', topic: 'Time Travel', level: 'advanced',
    q: 'A table has 30-day retention but its database has 1-day retention. The database is dropped. How long can you recover the table?',
    a: `<p>One day. When a database (or schema) is dropped, child objects are retained according to the <strong>parent's</strong> retention. A child's explicitly different retention is not honoured in that case. To protect important tables, set retention at the database level, or set <code>MIN_DATA_RETENTION_TIME_IN_DAYS</code> on the account.</p>`
  },
  {
    id: 'tt-5', topic: 'Time Travel', level: 'advanced',
    q: 'What happens to existing historical data when you decrease or increase the retention period?',
    a: `<p><strong>Decrease</strong>: data already in Time Travel that is older than the new period moves into Fail-safe (for permanent tables) and is no longer queryable. Active data follows the new, shorter period. <strong>Increase</strong>: data currently in Time Travel is kept for the longer period. Data that has already left Time Travel does not come back.</p>`
  },
  {
    id: 'tt-6', topic: 'Time Travel', level: 'intermediate',
    q: 'How do you undo exactly one bad UPDATE that ran an hour ago, without losing good changes made after it?',
    a: `<p>Find its query ID in <code>QUERY_HISTORY</code>, then compare the table <code>BEFORE(STATEMENT =&gt; id)</code> with the version right after it to get the affected rows. Restore only those rows with a <code>MERGE</code> from the pre-statement version, keyed on primary key, while excluding rows changed again later. Restoring the whole table with a clone would discard the later good changes.</p>
<pre class="sf-sql">MERGE INTO orders t
USING (SELECT * FROM orders BEFORE (STATEMENT => '&lt;bad_query_id&gt;')) old
ON t.order_id = old.order_id
WHEN MATCHED AND t.updated_at = '&lt;bad_update_ts&gt;'   -- touched only by the bad statement
  THEN UPDATE SET t.amount = old.amount, t.status = old.status;</pre>`
  },
  {
    id: 'tt-7', topic: 'Time Travel', level: 'advanced',
    q: 'You query AT(TIMESTAMP => ...) and get "Time travel data is not available". Why?',
    a: `<p>Possible reasons: the timestamp is before the table was created (or before it was last replaced); it is older than the retention period; retention is 0; or there's a time-zone mismatch. A string cast to <code>TIMESTAMP_NTZ</code> may be interpreted differently from what you meant, so cast explicitly to <code>TIMESTAMP_LTZ</code> or <code>TIMESTAMP_TZ</code>, or use <code>OFFSET</code> instead.</p>`
  },
  {
    id: 'tt-8', topic: 'Time Travel', level: 'advanced',
    q: 'How do streams interact with Time Travel retention?',
    a: `<p>A stream stores an offset into the table's version history and relies on that history still existing. If a stream isn't consumed within the retention period it becomes <strong>stale</strong>. To reduce this, Snowflake automatically extends the table's retention for unconsumed streams, up to <code>MAX_DATA_EXTENSION_TIME_IN_DAYS</code> (default 14 days). Check <code>STALE_AFTER</code> in <code>SHOW STREAMS</code>. Once stale, the stream must be recreated and you need a separate catch-up strategy.</p>`
  },
  {
    id: 'tt-9', topic: 'Time Travel', level: 'intermediate',
    q: 'Does Time Travel cost anything?',
    a: `<p>Querying the past costs normal warehouse compute, nothing extra. Storage is the cost: Snowflake stores the micro-partitions that were replaced or deleted during the retention window (plus Fail-safe for 7 more days). Tables with frequent updates or <code>MERGE</code>s rewrite many micro-partitions, so long retention on such tables can multiply storage. Check <code>TIME_TRAVEL_BYTES</code> and <code>FAILSAFE_BYTES</code> in <code>TABLE_STORAGE_METRICS</code>.</p>`
  },
  {
    id: 'tt-10', topic: 'Time Travel', level: 'advanced',
    q: 'Can you clone a whole database as of yesterday? What can go wrong?',
    a: `<p>Yes: <code>CREATE DATABASE sales_y CLONE sales AT (OFFSET =&gt; -86400);</code>. It fails if any child object has insufficient Time Travel history for that point, for example a table created after that time or one with retention 0. Add <code>IGNORE TABLES WITH INSUFFICIENT DATA RETENTION</code> to skip those. Also note: named internal stages aren't cloned, and pipes and tasks in the clone should be reviewed before you resume anything.</p>`
  },
  {
    id: 'tt-11', topic: 'Time Travel', level: 'intermediate',
    q: 'TRUNCATE vs DELETE vs DROP: which can you recover with Time Travel?',
    a: `<p>All three. <code>DELETE</code> and <code>TRUNCATE</code> keep the table, so query <code>AT</code>/<code>BEFORE</code> and re-insert or clone. <code>DROP</code> is recovered with <code>UNDROP</code>. One difference: <code>TRUNCATE</code> also clears the table's <code>COPY</code> load metadata, so the same files can be loaded again, while <code>DELETE</code> keeps it and re-running COPY would skip those files.</p>`
  },
  {
    id: 'tt-12', topic: 'Time Travel', level: 'advanced',
    q: 'Your 2 TB transient staging table was dropped by mistake 3 days ago. Options?',
    a: `<p>Transient tables have at most 1 day of Time Travel and <strong>no Fail-safe</strong>, so after 3 days the data is permanently gone, and even Snowflake Support can't recover it. Rebuild it from the source files: a recreated table starts with no load metadata, so <code>COPY</code> loads the staged files again. This is the trade-off you accept with transient tables, so only use them for re-creatable data.</p>`
  },

  // ---------------------------------------------------------------- Dynamic Tables & Pipelines
  {
    id: 'dt-1', topic: 'Dynamic Tables & Pipelines', level: 'beginner',
    q: 'What is a dynamic table?',
    a: `<p>A table whose contents are defined by a <code>SELECT</code>. Snowflake keeps it refreshed within a <code>TARGET_LAG</code> (minimum 1 minute) using a warehouse you specify, incrementally when possible. Chains of dynamic tables form a pipeline (DAG) that Snowflake orchestrates, with no streams, tasks or MERGE code.</p>`
  },
  {
    id: 'dt-2', topic: 'Dynamic Tables & Pipelines', level: 'intermediate',
    q: 'What does TARGET_LAG = DOWNSTREAM mean?',
    a: `<p>The table has no lag of its own. It refreshes only when a downstream dynamic table that depends on it needs fresh data to meet <em>its</em> target lag. Use it for intermediate (silver) tables so they don't refresh more often than any consumer needs.</p>`
  },
  {
    id: 'dt-3', topic: 'Dynamic Tables & Pipelines', level: 'intermediate',
    q: 'Dynamic tables vs streams and tasks: when would you still choose streams and tasks?',
    a: `<p>When you need procedural logic (stored procedures, conditional branching), side effects (calling external functions, sending notifications, writing several targets), custom SCD2 or delete handling that a single SELECT can't express, exact scheduling (cron), or fine control over transactions and error handling. Dynamic tables are better for declarative SQL transformations where you'd otherwise hand-write incremental MERGE logic.</p>`
  },
  {
    id: 'dt-4', topic: 'Dynamic Tables & Pipelines', level: 'advanced',
    q: 'Your dynamic table shows refresh_mode = FULL and costs are high. Why, and what do you do?',
    a: `<p>With <code>REFRESH_MODE = AUTO</code>, Snowflake picks <code>FULL</code> when the query uses constructs incremental refresh doesn't support, for example non-deterministic functions such as <code>CURRENT_TIMESTAMP()</code>, or other constructs and sources listed as unsupported for incremental refresh in the docs. Check <code>refresh_mode_reason</code> in <code>SHOW DYNAMIC TABLES</code>. Rewrite to remove the blocking construct (move time filters downstream, split the query into two dynamic tables), lengthen the lag, or set <code>REFRESH_MODE = INCREMENTAL</code> explicitly so creation fails loudly instead of silently going full.</p>`
  },
  {
    id: 'dt-5', topic: 'Dynamic Tables & Pipelines', level: 'intermediate',
    q: 'What is a stream, and what are the stream types?',
    a: `<p>A stream is a change-tracking object on a table (or view) that returns the rows changed since its offset, with metadata columns <code>METADATA$ACTION</code>, <code>METADATA$ISUPDATE</code> and <code>METADATA$ROW_ID</code>. Consuming it in a DML statement advances the offset. Types: <strong>standard</strong> (inserts, updates, deletes), <strong>append-only</strong> (inserts only, cheaper), <strong>insert-only</strong> (for external and Iceberg tables).</p>`
  },
  {
    id: 'dt-6', topic: 'Dynamic Tables & Pipelines', level: 'intermediate',
    q: 'How do you make a task run only when there is new data?',
    a: `<p>Use a <code>WHEN SYSTEM$STREAM_HAS_DATA('my_stream')</code> condition. The condition is evaluated by Cloud Services, so when it's false the task is skipped without starting a warehouse. Or use a <em>triggered task</em> with no schedule, which runs when the stream has data.</p>
<pre class="sf-sql">CREATE TASK merge_orders
  WAREHOUSE = transform_wh
  SCHEDULE = '5 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('raw.orders_stream')
AS
  MERGE INTO silver.orders t USING raw.orders_stream s ON t.order_id = s.order_id
  WHEN MATCHED THEN UPDATE SET t.amount = s.amount
  WHEN NOT MATCHED THEN INSERT (order_id, amount) VALUES (s.order_id, s.amount);
ALTER TASK merge_orders RESUME;</pre>`
  },

  // ---------------------------------------------------------------- Security & Governance
  {
    id: 'sec-1', topic: 'Security & Governance', level: 'beginner',
    q: 'Explain the system-defined roles.',
    a: `<p><code>ACCOUNTADMIN</code> (top level: billing, account parameters. Use sparingly). <code>SECURITYADMIN</code> (manages grants, inherits <code>USERADMIN</code>). <code>USERADMIN</code> (creates users and roles). <code>SYSADMIN</code> (creates warehouses, databases and other objects. Custom roles should roll up to it). <code>PUBLIC</code> (granted to everyone). Best practice: custom functional roles granted to <code>SYSADMIN</code> so admins can manage everything they create.</p>`
  },
  {
    id: 'sec-2', topic: 'Security & Governance', level: 'intermediate',
    q: 'What is a future grant and why is it important?',
    a: `<p>A grant that applies automatically to objects created later, for example <code>GRANT SELECT ON FUTURE TABLES IN SCHEMA analytics.gold TO ROLE bi_reader;</code>. Without it, every new table created by a pipeline would need a manual grant. Note that schema-level future grants take precedence over database-level ones for the same object type.</p>`
  },
  {
    id: 'sec-3', topic: 'Security & Governance', level: 'intermediate',
    q: 'How do you mask PII so analysts see masked values but a privileged role sees real ones?',
    a: `<p>Create a masking policy (Enterprise+) and attach it to the column. For row filtering, use a row access policy. With tag-based masking, attach the policy to a tag such as <code>PII = 'email'</code> so every tagged column is protected automatically.</p>
<pre class="sf-sql">CREATE MASKING POLICY mask_email AS (val STRING) RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION('PII_READER') THEN val
       ELSE REGEXP_REPLACE(val, '.+@', '*****@') END;

ALTER TABLE customers MODIFY COLUMN email SET MASKING POLICY mask_email;</pre>`
  },
  {
    id: 'sec-4', topic: 'Security & Governance', level: 'intermediate',
    q: 'How does secure data sharing work without copying data?',
    a: `<p>A provider creates a <strong>share</strong> and grants it access to specific databases, schemas, tables or secure views. The consumer account creates a read-only database from the share. No data is copied: the consumer's warehouse reads the provider's micro-partitions directly, and the consumer pays for their own compute. Cross-region or cross-cloud sharing needs replication (listings with auto-fulfilment). Non-Snowflake consumers can use reader accounts paid for by the provider.</p>`
  },
  {
    id: 'sec-5', topic: 'Security & Governance', level: 'advanced',
    q: 'What is the difference between a secure view and a normal view?',
    a: `<p>A secure view hides its definition from users who don't own it, and prevents the optimizer from applying transformations that could leak data from underlying rows (for example, pushing a user's function below the view's filter). It is required for sharing views. The trade-off is that some optimizations are disabled, so secure views can be slower. Use them for security boundaries, not everywhere.</p>`
  },

  // ---------------------------------------------------------------- Cost & Operations
  {
    id: 'cost-1', topic: 'Cost & Operations', level: 'intermediate',
    q: 'Your Snowflake bill doubled this month. How do you investigate?',
    a: `<ol><li><code>METERING_DAILY_HISTORY</code>: split by service type (warehouses vs serverless vs Cloud Services) to see where the growth is.</li><li><code>WAREHOUSE_METERING_HISTORY</code>: which warehouse grew.</li><li><code>QUERY_HISTORY</code> on that warehouse: new expensive queries, repeated queries, users or tools.</li><li>Look for warehouses that never suspend (<code>AUTO_SUSPEND</code> off or a BI tool pinging every minute).</li><li>Serverless: <code>AUTOMATIC_CLUSTERING_HISTORY</code>, <code>PIPE_USAGE_HISTORY</code>, materialized view and search optimization history.</li><li>Storage: <code>TABLE_STORAGE_METRICS</code> for Time Travel and Fail-safe growth.</li></ol><p>Then fix: right-size, set suspend, add resource monitors, and kill or optimize the top queries.</p>`
  },
  {
    id: 'cost-2', topic: 'Cost & Operations', level: 'intermediate',
    q: 'A BI tool keeps a warehouse running 24/7. What do you do?',
    a: `<p>BI tools often send keep-alive or metadata queries that reset the idle timer. Options: lower <code>AUTO_SUSPEND</code>; check whether the queries are served by the result cache (no warehouse needed); configure the tool's connection pooling and refresh schedule; give BI its own warehouse with a resource monitor; and use <code>QUERY_HISTORY</code> to find the polling pattern.</p>`
  },
  {
    id: 'cost-3', topic: 'Cost & Operations', level: 'beginner',
    q: 'Difference between ACCOUNT_USAGE and INFORMATION_SCHEMA views?',
    a: `<p><code>SNOWFLAKE.ACCOUNT_USAGE</code>: account-wide, includes dropped objects, keeps up to 1 year of history, with latency of roughly 45 minutes to 3 hours. <code>INFORMATION_SCHEMA</code>: per database, real-time, short history (for example 7 days to 6 months depending on the view or function), and excludes dropped objects. Use INFORMATION_SCHEMA for "what just happened" and ACCOUNT_USAGE for trends and audits.</p>`
  },

  // ---------------------------------------------------------------- Scenarios
  {
    id: 'sc-1', topic: 'Scenarios', level: 'advanced',
    q: 'Design an ingestion pipeline: files land in S3 every few minutes and must be in a reporting table within 15 minutes.',
    a: `<p>A storage integration plus an external stage on the landing prefix. A <strong>Snowpipe</strong> with <code>AUTO_INGEST</code> (S3 event to SQS) loads into a raw table with <code>METADATA$FILENAME</code> and load-timestamp columns. A <strong>dynamic table</strong> (<code>TARGET_LAG = DOWNSTREAM</code>) cleans and deduplicates, and a gold dynamic table aggregates with <code>TARGET_LAG = '10 minutes'</code> to leave headroom under the 15-minute SLA. Add monitoring with <code>COPY_HISTORY</code> and <code>DYNAMIC_TABLE_REFRESH_HISTORY</code> alerts, a dedicated <code>TRANSFORM_WH</code> with a 60 s suspend, and a resource monitor. Use transient tables for raw if replay from S3 is always possible.</p>`
  },
  {
    id: 'sc-2', topic: 'Scenarios', level: 'advanced',
    q: 'MERGE into a 3 TB table takes 40 minutes. How do you speed it up?',
    a: `<ul><li>Make the target prunable for the MERGE: cluster by the column used to locate changed rows (for example a date or partition key), and add that predicate to the <code>ON</code> clause (<code>AND t.event_date &gt;= DATEADD(day,-3,CURRENT_DATE)</code>).</li><li>Deduplicate the source first. Duplicate source keys cause errors or nondeterminism.</li><li>Merge only changed rows (stream or watermark), not the full source.</li><li>Check the profile for spilling, and scale up for the MERGE window if needed.</li><li>For append-mostly data, consider <code>INSERT</code> plus a periodic dedup instead of MERGE.</li></ul>`
  },
  {
    id: 'sc-3', topic: 'Scenarios', level: 'intermediate',
    q: 'Developers need a full copy of production for testing every morning. How?',
    a: `<p>A scheduled task that runs <code>CREATE OR REPLACE DATABASE dev_sales CLONE sales;</code> each morning. It's zero-copy, so it's instant and storage is only paid for what developers change. Then apply masking policies or a role design so developers can't see raw PII (masking policies on cloned tables carry over). Drop old clones so they don't pin micro-partitions the source has deleted.</p>`
  },
  {
    id: 'sc-4', topic: 'Scenarios', level: 'advanced',
    q: 'At 9 a.m. hundreds of dashboard queries queue for minutes; the rest of the day is quiet. Fix it cost-effectively.',
    a: `<p>A multi-cluster BI warehouse in auto-scale mode (for example min 1, max 6, <code>STANDARD</code> policy) so clusters are added only during the spike. Keep the size moderate, because queuing is a concurrency problem, not a query-size problem. Keep <code>AUTO_SUSPEND</code> at a few minutes for cache reuse. Check how many queries could hit the result cache (identical dashboards), and pre-compute heavy tiles with dynamic tables. Optionally schedule a task to resume or warm the warehouse just before 9 a.m.</p>`
  },
  {
    id: 'sc-5', topic: 'Scenarios', level: 'advanced',
    q: 'How would you migrate a 50 TB on-prem Oracle warehouse to Snowflake?',
    a: `<ol><li>Inventory and plan: schemas, ETL jobs, reports, security model.</li><li>Convert DDL (types, no indexes or partitions, sequences or identity, constraints informational) and the code (PL/SQL to Snowflake Scripting, dbt or Snowpark).</li><li>Bulk historical load: export to compressed Parquet/CSV in 100&ndash;250 MB files to S3 or Azure (offline transfer appliances for very large volumes), then <code>COPY INTO</code> with a large warehouse.</li><li>Incremental sync with CDC (for example a CDC tool to the stage, then Snowpipe and MERGE) until cutover.</li><li>Validate row counts, checksums and report parity.</li><li>Set up roles, masking, resource monitors and warehouses per workload.</li><li>Cut over and decommission. Expect to redesign, not just lift and shift, where Oracle-specific features were used.</li></ol>`
  },
];
