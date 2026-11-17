# PySpark Interactive Explainer & Architecture Simulator Hub

An interactive, visual deep-dive and stress simulation suite for Apache Spark / PySpark cluster execution, distributed ingestion, and storage architectures.

## Modules Overview
0. **[Lakehouse Demo Lab](demo.html)** — Plain Parquet data lake vs Delta Lake vs Iceberg across 9 operations (files, metadata, reader outcome), capability matrix, read-path planning cost, Copy-on-Write vs Merge-on-Read (write amplification, read cost, recommendation) and a lazy DAG/AQE mini-lab. Logic in `assets/js/lakehouse-demo.js`.
1. **[Cluster Architecture & Memory](cluster-architecture.html)** — Master, Worker, Driver, Executor memory overhead breakdown, Off-Heap, and Cluster Sizer.
1b. **[Data Distribution & File Splits Explorer](data-distribution.html)** — Light-theme Material dashboard (from `pyspark_data_distribution_guide.md`): rows vs columns, driver pipeline (Delta/Iceberg catalog → split math → task assignment → execution), split calculator mirroring Spark's FilePartition algorithm, row-group midpoint alignment, column projection, tiny files & compaction, Z-ordering, skew & salting. Logic in `assets/js/data-distribution.js`.
2. **[Cloud Object Storage](cloud-storage.html)** — S3, ADLS Gen2, GCS, MinIO, Zero-Rename Committers, Small Files compaction.
3. **[RDBMS & JDBC Ingestion](rdbms-jdbc.html)** — Oracle, PostgreSQL, MySQL, SQL Server, parallel JDBC partitioning, and driver dialects.
4. **[MPP Cloud Data Warehouses](mpp-warehouses.html)** — Snowflake, Databricks Lakehouse, AWS Redshift, BigQuery, Azure Synapse, staged unloads, and predicate pushdown.
5. **[DAG & Execution Flow](dag-execution.html)** — Catalyst Optimizer, Tungsten whole-stage codegen, Stages, Tasks, and Adaptive Query Execution (AQE).
6. **[Shuffle & Partitioning](shuffle-partitioning.html)** — Hash Partitioner, Skew mitigation, Salt keys, AQE Skew Join, Broadcast Joins.
6b. **[Shuffle Operations Lab](shuffle-ops-lab.html)** — Interactive dashboard: sources (Parquet/Delta, small files, CSV.gz, JDBC, MPP) × DataFrame operations (select → filter → groupBy → orderBy → window → joins → full pipeline) × targets (Delta, partitionBy, MERGE, JDBC, Snowflake) × 100 MB–10 TB. Stage DAG, explain() plan, partition skew before/after AQE, executor timeline, tuning advisor and volume sweep. Model in `assets/js/shuffle-ops-model.js`, UI in `assets/js/shuffle-ops-lab.js`.
6c. **[Shuffle Tuning Q&A](shuffle-tuning-qna.html)** — 43 scenario-based performance-tuning questions (incl. those from `spark_devops_scenario_qna.md`) with search, topic/level filters, interview mode and "Simulate in Lab" deep links. Data in `assets/js/shuffle-qna-data.js`.
7. **[Real-Time Streaming, Message Queues & CDC](streaming-cdc.html)** — Apache Kafka, AWS Kinesis, Azure Event Hubs, Debezium CDC WAL stream merges, RocksDB state-store.

## 4 Dedicated Interactive Hardware Stress Simulators
To prevent visual clutter, each ingestion and storage pattern features its own dedicated, standalone telemetry simulator with dynamic **Worker Nodes Scaling** (2, 4, 8, and 16 Workers), official vendor branding, PySpark flame badges, and CPU/RAM/Network stress monitoring:

1. **Files, Folders & Formats Simulator (`#sec-files-sim`)**:
   - Compares Small Files (10k x 2MB), Giant Unsplittable GZIP (1 x 120GB), Snappy Parquet (960 x 128MB), Delta Lake ACID, ORC, and Avro.
   - Dynamic folder partitioning depth (e.g. `year/month/day` partition explosion vs flat buckets).
2. **RDBMS Ingestion & Hardware Stress Simulator (`#sec-rdbms-sim`)**:
   - Single-Threaded JDBC bottleneck vs Parallel Partitioned JDBC vs Predicate Slices.
   - Database vendor profiles for Oracle, PostgreSQL, MySQL, and Microsoft SQL Server.
   - Clustered index scans, table lock saturation, and connection pool behavior.
3. **MPP Cloud Data Warehouse Ingestion & Staging Simulator (`#sec-mpp-sources`)**:
   - Direct JDBC leader choke vs Staged Cloud Storage Parquet Bulk Unload vs Arrow Flight SQL pushdown.
   - Vendor targets: Snowflake, Databricks Lakehouse, AWS Redshift, Google BigQuery, Azure Synapse.
   - Live Warehouse Compute Credit burn rate ($/hr) and staging bucket IOPS tracking.
4. **Message Queues, Real-Time Streaming & CDC Stress Simulator (`#sec-streaming-sources`)**:
   - Ingestion from Apache Kafka, AWS Kinesis, Azure Event Hubs, and Debezium CDC.
   - Micro-batching vs continuous processing, consumer lag spike simulation, and RocksDB state-store memory management.

