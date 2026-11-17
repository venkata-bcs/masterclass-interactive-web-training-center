/* =============================================================================
   TINITIATE MASTERCLASS - Data Engineering roadmaps (home page)
   Six stack-specific curriculum roadmaps rendered into #de-roadmap-root using
   the same poster classes as the AI / Governance roadmaps in index.html.
   ============================================================================= */
(function () {
  // Small square "logo" badges: initials on the tool's brand-ish colour
  const T = (name, color, abbr) => ({ name, color, abbr: abbr || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) });
  const TOOLS = {
    sql: T('SQL', '#0284c7'), python: T('Python', '#3776ab', 'Py'), linux: T('Linux', '#334155', 'Lx'), git: T('Git', '#f05032'),
    docker: T('Docker', '#0db7ed', 'Dk'), compose: T('Compose', '#2496ed', 'Dc'),
    postgres: T('PostgreSQL', '#336791', 'Pg'), mysql: T('MySQL', '#00758f', 'My'), mongo: T('MongoDB', '#13aa52', 'Mo'), redis: T('Redis', '#d82c20', 'Rd'),
    minio: T('MinIO', '#c72c48', 'Mi'), azurite: T('Azurite', '#0078d4', 'Az'), parquet: T('Parquet', '#50abf1', 'Pq'),
    delta: T('Delta Lake', '#00add4', 'Δ'), iceberg: T('Iceberg', '#3a8dde', 'Ic'),
    spark: T('PySpark', '#e25a1c', 'Sp'), kafka: T('Kafka', '#231f20', 'Kf'), debezium: T('Debezium', '#91d443', 'Dz'),
    flink: T('Flink', '#e6526f', 'Fl'), airflow: T('Airflow', '#017cee', 'Af'), dbt: T('dbt', '#ff694b'), trino: T('Trino', '#dd00a1', 'Tr'),
    duckdb: T('DuckDB', '#c5a200', 'Dd'), gx: T('Great Exp.', '#ff6310', 'GX'), superset: T('Superset', '#20a7c9', 'Ss'), grafana: T('Grafana', '#f46800', 'Gf'),
    registry: T('Schema Reg.', '#6b4fbb', 'SR'), gha: T('GitHub Actions', '#2088ff', 'GA'),
    // AWS
    iam: T('IAM', '#dd344c'), s3: T('Amazon S3', '#3f8624', 'S3'), dms: T('AWS DMS', '#527fff', 'DM'), kinesis: T('Kinesis', '#8c4fff', 'Ki'),
    msk: T('Amazon MSK', '#8c4fff', 'MK'), glue: T('AWS Glue', '#8c4fff', 'Gl'), emr: T('Amazon EMR', '#8c4fff', 'EM'), lambda: T('Lambda', '#ed7100', 'λ'),
    athena: T('Athena', '#8c4fff', 'At'), redshift: T('Redshift', '#2e27ad', 'Rs'), quicksight: T('QuickSight', '#4d27aa', 'QS'),
    stepfn: T('Step Functions', '#e7157b', 'SF'), mwaa: T('MWAA', '#e7157b', 'MW'), lakeformation: T('Lake Formation', '#3f8624', 'LF'),
    cloudwatch: T('CloudWatch', '#e7157b', 'CW'), cdk: T('CDK / Terraform', '#7b42bc', 'IaC'), eventbridge: T('EventBridge', '#e7157b', 'EB'),
    // Snowflake
    snowflake: T('Snowflake', '#29b5e8', '❄'), snowsight: T('Snowsight', '#29b5e8', 'Sn'), snowpipe: T('Snowpipe', '#1a8fc0', 'Pi'),
    stage: T('Stages', '#11567f', 'St'), dyntable: T('Dynamic Tables', '#29b5e8', 'DT'), snowpark: T('Snowpark', '#1a8fc0', 'SP'),
    streamtask: T('Streams & Tasks', '#11567f', 'S&T'), timetravel: T('Time Travel', '#7254a3', 'TT'), horizon: T('RBAC & Policies', '#11567f', 'RB'),
    streamlit: T('Streamlit', '#ff4b4b', 'St'), sharing: T('Data Sharing', '#29b5e8', 'DS'),
    // Databricks
    databricks: T('Databricks', '#ff3621', 'Db'), autoloader: T('Auto Loader', '#ff3621', 'AL'), lakeflow: T('Lakeflow Pipelines', '#ff3621', 'LP'),
    unity: T('Unity Catalog', '#1b3139', 'UC'), dbsql: T('Databricks SQL', '#ff3621', 'DQ'), photon: T('Photon', '#ff6f00', 'Ph'),
    jobs: T('Lakeflow Jobs', '#1b3139', 'LJ'), dab: T('Asset Bundles', '#1b3139', 'AB'), deltashare: T('Delta Sharing', '#00add4', 'Sh'),
    // Azure
    entra: T('Entra ID', '#0078d4', 'En'), adls: T('ADLS Gen2', '#0078d4', 'DL'), adf: T('Data Factory', '#0078d4', 'DF'), eventhubs: T('Event Hubs', '#0078d4', 'EH'),
    asa: T('Stream Analytics', '#0078d4', 'SA'), adb: T('Azure Databricks', '#ff3621', 'AD'), synapse: T('Synapse', '#0078d4', 'Sy'), fabric: T('Fabric', '#117865', 'Fb'),
    powerbi: T('Power BI', '#f2c811', 'BI'), purview: T('Purview', '#0078d4', 'Pv'), keyvault: T('Key Vault', '#0078d4', 'KV'),
    monitor: T('Azure Monitor', '#0078d4', 'Mn'), devops: T('Azure DevOps', '#0078d4', 'Do'), azsql: T('Azure SQL', '#0078d4', 'AS'), cosmos: T('Cosmos DB', '#0078d4', 'Cs'),
  };

  const ROADMAPS = {
    // -----------------------------------------------------------------------
    oss: {
      tab: 'Open-Source · Local Docker', tabSub: 'PySpark, Kafka, Debezium, MinIO', icon: 'container', accent: '#e25a1c',
      title: 'OPEN-SOURCE DATA ENGINEER ROADMAP (2026)',
      subtitle: 'BUILD A FULL CDC + REAL-TIME LAKEHOUSE ON YOUR LAPTOP WITH DOCKER',
      headerTools: ['docker', 'spark', 'kafka', 'debezium', 'minio', 'postgres'],
      archIntro: 'Every component runs in one docker compose stack. MinIO speaks the S3 API and Azurite the Azure Blob API, so the code you write locally moves to the cloud by changing endpoints and credentials.',
      arch: [
        { layer: 'Sources', icon: 'database', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'REST APIs', 'CSV / JSON files'] },
        { layer: 'Ingest & CDC', icon: 'radio-tower', items: ['Debezium on Kafka Connect', 'Apache Kafka (KRaft)', 'Schema Registry (Avro)', 'Python producers'] },
        { layer: 'Storage', icon: 'hard-drive', items: ['MinIO (S3 emulator)', 'Azurite (Blob emulator)', 'Delta Lake / Iceberg', 'Parquet'] },
        { layer: 'Processing', icon: 'cpu', items: ['PySpark batch', 'Structured Streaming', 'Apache Flink (optional)', 'Trino (Distributed SQL)'] },
        { layer: 'Serving', icon: 'chart-column', items: ['Trino / DuckDB', 'PostgreSQL marts', 'Apache Superset'] },
        { layer: 'Orchestrate & Ops', icon: 'workflow', items: ['Apache Airflow', 'Great Expectations', 'Prometheus + Grafana', 'OpenLineage / Marquez'] },
      ],
      features: [
        ['Zero cloud bill', 'The whole platform runs in docker compose on 16 GB of RAM.'],
        ['Cloud-compatible APIs', 'MinIO = S3 API (s3a://), Azurite = Azure Blob API, so the same Spark code ports to AWS and Azure.'],
        ['Real CDC', 'Debezium reads the PostgreSQL WAL and MySQL binlog. No polling, deletes included.'],
        ['Exactly-once streaming', 'Kafka offsets plus Spark checkpoints plus idempotent Delta MERGE.'],
        ['Open table formats', 'ACID upserts and time travel with Delta Lake or Iceberg on object storage.'],
        ['Portable skills', 'Spark, Kafka, Airflow and Trino are the engines behind most managed cloud services.'],
      ],
      steps: [
        { t: 'FOUNDATIONS: SQL, PYTHON, LINUX & GIT', c: '#0284c7', i: 'terminal', href: 'data-engineering/db-explainer.html',
          b: ['SQL joins, window functions and CTEs on PostgreSQL', 'Python: pandas, requests, typing, virtualenvs', 'Linux shell, ports and networking basics', 'Git branching, pull requests, code review'],
          tools: ['sql', 'python', 'linux', 'git'], flow: ['CSV / REST API', 'Python ingest script', 'PostgreSQL table'] },
        { t: 'DOCKER LOCAL DATA LAB', c: '#0db7ed', i: 'container', href: 'data-engineering/index.html',
          b: ['Images, containers, volumes and networks', 'One docker compose file for the whole stack', 'Healthchecks, depends_on and .env secrets', 'Memory limits so Spark and Kafka share a laptop'],
          tools: ['docker', 'compose', 'linux'], flow: ['docker compose up', 'Postgres + MongoDB', 'MinIO + Azurite', 'Kafka + Spark'] },
        { t: 'RDBMS & NOSQL DATABASES', c: '#336791', i: 'database', href: 'data-engineering/db-explainer.html',
          b: ['PostgreSQL / MySQL modeling, indexes, EXPLAIN plans', 'Transactions, isolation levels and the WAL / binlog', 'MongoDB documents and the aggregation pipeline', 'When to use Redis (key-value) or Cassandra (wide-column)'],
          tools: ['postgres', 'mysql', 'mongo', 'redis'], flow: ['Application writes', 'PostgreSQL (WAL)', 'MongoDB (oplog)', 'Analytics copy'] },
        { t: 'OBJECT STORAGE EMULATORS & FILE FORMATS', c: '#c72c48', i: 'hard-drive', href: 'pyspark/cloud-storage.html',
          b: ['MinIO as S3: s3a:// endpoint, path-style access, buckets', 'Azurite as Azure Blob storage for local wasb / Blob SDK tests', 'Parquet, Avro and ORC; partitioning and compression', 'Delta Lake / Iceberg tables on MinIO'],
          tools: ['minio', 'azurite', 'parquet', 'delta'], flow: ['PySpark job', 's3a://lake (MinIO)', 'Parquet / Delta files', 'Trino / DuckDB query'] },
        { t: 'PYSPARK BATCH PROCESSING', c: '#e25a1c', i: 'flame', href: 'pyspark/index.html',
          b: ['SparkSession, DataFrames and Spark SQL', 'Parallel JDBC reads (partitionColumn, numPartitions)', 'Joins, shuffles, AQE and broadcast joins', 'Delta MERGE upserts and SCD Type 2'],
          tools: ['spark', 'delta', 'postgres'], flow: ['PostgreSQL (JDBC)', 'Spark executors', 'Shuffle / join', 'Delta on MinIO'] },
        { t: 'CDC WITH DEBEZIUM', c: '#5f9e1f', i: 'git-merge', href: 'pyspark/streaming-cdc.html',
          b: ['Kafka Connect + Debezium PostgreSQL connector (pgoutput, replication slots)', 'MySQL binlog connector and initial snapshots', 'Change event envelope: before / after / op / ts_ms', 'Outbox pattern and schema evolution with Schema Registry'],
          tools: ['debezium', 'kafka', 'registry', 'postgres'], flow: ['PostgreSQL WAL', 'Debezium (Connect)', 'Kafka topic per table', 'Spark MERGE → Delta'] },
        { t: 'KAFKA & REAL-TIME INGESTION', c: '#6b4fbb', i: 'radio-tower', href: 'data-engineering/real-time.html',
          b: ['Topics, partitions, consumer groups and offsets', 'KRaft mode, replication factor, acks and idempotent producers', 'Spark Structured Streaming: watermarks, checkpoints, triggers', 'Flink / ksqlDB alternatives and dead-letter topics'],
          tools: ['kafka', 'spark', 'flink'], flow: ['Producers + Debezium', 'Kafka (KRaft)', 'Structured Streaming', 'Delta / Postgres sink'] },
        { t: 'ORCHESTRATION, TRINO & DATA QUALITY', c: '#017cee', i: 'workflow', href: 'data-engineering/batch-loading.html',
          b: ['Airflow DAGs: sensors, retries, backfills, SLAs', 'Trino distributed SQL queries, catalogs (MinIO, Iceberg, Postgres) and views', 'Data quality gates with Great Expectations or Soda', 'Lineage with OpenLineage + Marquez'],
          tools: ['airflow', 'trino', 'gx', 'postgres'], flow: ['Airflow DAG', 'Spark job', 'Trino SQL', 'Quality gate → publish'] },
        { t: 'CAPSTONE: REAL-TIME LAKEHOUSE ON A LAPTOP', c: '#8b5cf6', i: 'rocket', href: 'data-engineering/data-lakehouse.html',
          b: ['Postgres → Debezium → Kafka → Spark → Delta on MinIO', 'Trino + Superset dashboards over gold tables', 'Prometheus / Grafana monitoring, GitHub Actions CI', 'README, architecture diagram and demo video'],
          tools: ['debezium', 'kafka', 'spark', 'superset'], flow: ['Postgres CDC', 'Kafka', 'Spark Streaming', 'Delta (MinIO)', 'Trino + Superset'] },
      ],
      essentials: ['docker', 'python', 'sql', 'spark', 'kafka', 'debezium', 'minio', 'airflow', 'trino', 'git'],
      projects: ['CDC pipeline: Postgres → Debezium → Kafka → Delta', 'Clickstream analytics with Kafka + Structured Streaming', 'Lakehouse on MinIO with Delta / Iceberg + Trino', 'MongoDB → Spark → Parquet document flattening', 'Airflow + Trino lakehouse with quality gates'],
      skills: [['database', 'Relational + NoSQL design', 'PostgreSQL, MySQL, MongoDB'], ['git-merge', 'Change Data Capture', 'WAL / binlog, Debezium, Kafka'], ['flame', 'Distributed processing', 'PySpark batch + streaming'], ['hard-drive', 'Lakehouse storage', 'S3 API, Delta, Iceberg'], ['container', 'Platform skills', 'Docker, Compose, CI']],
      certs: ['Confluent Certified Developer for Apache Kafka (CCDAK)', 'Databricks Certified Associate Developer for Apache Spark', 'Astronomer Apache Airflow certification', 'Trino (Distributed SQL) / Starburst certification'],
      roles: ['Data Engineer', 'Streaming / Real-time Engineer', 'Data Platform Engineer', 'Analytics Engineer'],
      cta: { title: 'Open the PySpark & Streaming Labs', text: 'Cluster sizing, shuffle labs, JDBC and CDC streaming simulators, used throughout this roadmap.', href: 'pyspark/index.html', btn: 'Open PySpark Hub' },
    },

    // -----------------------------------------------------------------------
    dbt: {
      tab: 'dbt Analytics Engineering', tabSub: 'Models, tests, snapshots, CI', icon: 'git-branch', accent: '#ff694b',
      title: 'DBT ANALYTICS ENGINEER ROADMAP (2026)',
      subtitle: 'TESTED, VERSION-CONTROLLED SQL TRANSFORMATIONS ON ANY WAREHOUSE',
      headerTools: ['dbt', 'sql', 'git', 'snowflake', 'databricks', 'duckdb'],
      archIntro: 'dbt is the T in ELT. Loaders put raw data in the warehouse, and dbt turns SELECT statements into a tested, documented dependency graph (DAG) of models that the warehouse itself executes. The same project runs on Snowflake, Databricks, BigQuery, Redshift, Postgres or DuckDB through adapters.',
      arch: [
        { layer: 'Raw sources', icon: 'database', items: ['Tables loaded by Fivetran / Airbyte', 'Snowpipe / Auto Loader', 'sources.yml + freshness checks'] },
        { layer: 'Staging', icon: 'filter', items: ['stg_ models (rename, cast)', 'One model per source table', 'Views by default'] },
        { layer: 'Intermediate', icon: 'git-merge', items: ['int_ models (joins, logic)', 'Ephemeral / view', 'Jinja macros'] },
        { layer: 'Marts', icon: 'table', items: ['fct_ / dim_ models', 'Incremental + table', 'Snapshots (SCD2)'] },
        { layer: 'Serving', icon: 'chart-column', items: ['Semantic Layer (MetricFlow)', 'BI tools', 'Exposures'] },
        { layer: 'Deploy & Govern', icon: 'workflow', items: ['Slim CI (state:modified+)', 'dbt Cloud jobs / Airflow', 'Docs, lineage, contracts'] },
      ],
      features: [
        ['ref() builds the DAG', 'Models reference each other with ref(), so dbt knows build order, lineage and what a change affects.'],
        ['Testing built in', 'unique, not_null, accepted_values and relationships tests, plus singular and unit tests (dbt 1.8+).'],
        ['Incremental models', 'Process only new or changed rows with is_incremental() and merge / insert_overwrite strategies.'],
        ['Snapshots for SCD2', 'Track history of mutable source rows with timestamp or check strategies.'],
        ['Docs & lineage for free', 'dbt docs generate produces a browsable catalog and column-level descriptions from YAML.'],
        ['Slim CI', 'Build and test only modified models and their children, deferring to production for everything else.'],
      ],
      steps: [
        { t: 'SQL & DIMENSIONAL MODELING FOUNDATIONS', c: '#0284c7', i: 'database', href: 'data-engineering/data-warehouse.html',
          b: ['CTEs, window functions and QUALIFY-style dedup', 'Kimball facts, dimensions and grain', 'ELT vs ETL and where dbt fits', 'Git basics: branches, commits, pull requests'],
          tools: ['sql', 'git', 'postgres'], flow: ['Raw tables', 'SQL CTE layers', 'Star schema'] },
        { t: 'DBT PROJECT SETUP & ADAPTERS', c: '#ff694b', i: 'folder-git-2', href: 'data-engineering/duckdb/index.html',
          b: ['dbt Core (CLI) vs dbt Cloud', 'Adapters: dbt-duckdb, dbt-postgres, dbt-snowflake, dbt-databricks', 'profiles.yml targets (dev / prod) and dbt_project.yml', 'dbt debug, run, test, build and the target/ folder'],
          tools: ['dbt', 'duckdb', 'python'], flow: ['profiles.yml', 'dbt adapter', 'Warehouse connection'] },
        { t: 'SOURCES, STAGING & REF()', c: '#e2583e', i: 'git-merge', href: 'data-engineering/batch-loading.html',
          b: ['sources.yml, source() and source freshness', 'Staging models: rename, cast, light cleanup', 'ref() and the model DAG', 'Layering: staging → intermediate → marts'],
          tools: ['dbt', 'sql'], flow: ['source()', 'stg_ models', 'int_ models', 'fct_ / dim_ marts'] },
        { t: 'MATERIALIZATIONS & INCREMENTAL MODELS', c: '#c2410c', i: 'layers', href: 'data-engineering/data-warehouse.html',
          b: ['view, table, ephemeral and incremental', 'is_incremental(), unique_key and incremental strategies', 'on_schema_change and full refreshes', 'Choosing a materialization by cost and freshness'],
          tools: ['dbt', 'snowflake', 'databricks'], flow: ['New rows', 'is_incremental() filter', 'MERGE on unique_key', 'Target table'] },
        { t: 'TESTING & DATA QUALITY', c: '#15803d', i: 'shield-check', href: 'data-engineering/batch-loading.html',
          b: ['Generic tests: unique, not_null, accepted_values, relationships', 'Singular tests and unit tests (dbt 1.8+)', 'severity, warn_if / error_if, store_failures', 'Packages: dbt_utils and dbt-expectations'],
          tools: ['dbt', 'sql'], flow: ['dbt build', 'Model', 'Tests', 'Pass → downstream models'] },
        { t: 'JINJA, MACROS & PACKAGES', c: '#7c3aed', i: 'braces', href: 'data-engineering/index.html',
          b: ['Jinja control flow, variables and env_var()', 'Writing macros and cross-database dispatch', 'packages.yml: dbt_utils, codegen, audit_helper', 'pre-hooks, post-hooks and grants'],
          tools: ['dbt', 'python', 'sql'], flow: ['Jinja template', 'dbt compile', 'Warehouse-specific SQL'] },
        { t: 'SNAPSHOTS, SEEDS & HISTORY', c: '#b45309', i: 'history', href: 'data-engineering/data-warehouse.html',
          b: ['Snapshots with timestamp and check strategies', 'dbt_valid_from / dbt_valid_to (SCD Type 2)', 'Seeds for small reference CSVs', 'Hard deletes and late-arriving data'],
          tools: ['dbt', 'sql'], flow: ['Mutable source rows', 'dbt snapshot', 'SCD2 history table'] },
        { t: 'DEPLOYMENT, CI/CD & GOVERNANCE', c: '#1f2937', i: 'workflow', href: 'data-engineering/batch-loading.html',
          b: ['Slim CI: dbt build --select state:modified+ --defer', 'dbt Cloud jobs, or Airflow / Dagster orchestration', 'Docs, exposures, model contracts, versions and access groups', 'Semantic Layer metrics with MetricFlow'],
          tools: ['dbt', 'gha', 'airflow', 'git'], flow: ['Pull request', 'Slim CI build', 'Merge to main', 'Production job'] },
        { t: 'CAPSTONE: ANALYTICS ENGINEERING PROJECT', c: '#ff694b', i: 'rocket', href: 'snowflake-dataengineering/index.html',
          b: ['Raw e-commerce data → staging → marts on Snowflake or DuckDB', 'Incremental fact table and SCD2 customer snapshot', '100% primary-key test coverage and unit tests', 'GitHub Actions Slim CI, docs site and a BI dashboard'],
          tools: ['dbt', 'snowflake', 'duckdb', 'gha'], flow: ['Raw tables', 'Staging', 'Marts + snapshots', 'Tests + docs', 'Dashboard'] },
      ],
      essentials: ['dbt', 'sql', 'git', 'gha', 'python', 'duckdb', 'snowflake', 'databricks', 'postgres', 'airflow'],
      projects: ['E-commerce star schema with dbt + DuckDB (runs locally)', 'Incremental event fact table on Snowflake', 'SCD2 customer history with dbt snapshots', 'Slim CI pipeline on GitHub Actions', 'Metrics in the dbt Semantic Layer feeding a dashboard'],
      skills: [['database', 'Dimensional modeling', 'Facts, dimensions, grain'], ['git-merge', 'Modular SQL', 'ref(), layers, DAGs'], ['shield-check', 'Data testing', 'Generic, singular, unit tests'], ['braces', 'Jinja & macros', 'DRY, cross-database SQL'], ['workflow', 'Analytics DevOps', 'Git, Slim CI, deployments']],
      certs: ['dbt Analytics Engineering Certification', 'dbt Architect Certification', 'Pair with SnowPro Core or a Databricks certification for the warehouse side'],
      roles: ['Analytics Engineer', 'Data Engineer (ELT)', 'BI / Data Modeler', 'Data Platform Engineer'],
      cta: { title: 'Open the Data Warehouse & Modeling Modules', text: 'Star schemas, SCD Type 2 and batch ELT patterns that dbt projects are built on.', href: 'data-engineering/data-warehouse.html', btn: 'Open Data Warehouse Module' },
    },

    // -----------------------------------------------------------------------
    aws: {
      tab: 'AWS Data Engineering', tabSub: 'S3, Glue, Kinesis, EMR, Redshift', icon: 'cloud', accent: '#ff9900',
      title: 'AWS DATA ENGINEER ROADMAP (2026)',
      subtitle: 'BUILD SERVERLESS & BIG-DATA PIPELINES ON AMAZON WEB SERVICES',
      headerTools: ['s3', 'glue', 'kinesis', 'emr', 'athena', 'redshift'],
      archIntro: 'S3 is the lake, and the Glue Data Catalog is the shared metastore read by Athena, EMR, Glue and Redshift Spectrum. Lake Formation governs who sees what across all of them.',
      arch: [
        { layer: 'Sources', icon: 'database', items: ['RDS / Aurora', 'DynamoDB', 'On-prem databases', 'SaaS (AppFlow)'] },
        { layer: 'Ingest & CDC', icon: 'radio-tower', items: ['AWS DMS (full load + CDC)', 'Kinesis Data Streams', 'Amazon Data Firehose', 'Amazon MSK + MSK Connect'] },
        { layer: 'Storage', icon: 'hard-drive', items: ['S3 raw / curated / analytics', 'Glue Data Catalog', 'Apache Iceberg tables', 'S3 lifecycle tiers'] },
        { layer: 'Processing', icon: 'cpu', items: ['AWS Glue (Spark) jobs', 'EMR / EMR Serverless', 'Managed Apache Flink', 'Lambda'] },
        { layer: 'Serving', icon: 'chart-column', items: ['Amazon Athena', 'Redshift Serverless / Spectrum', 'Amazon QuickSight'] },
        { layer: 'Orchestrate & Govern', icon: 'workflow', items: ['Step Functions / MWAA', 'EventBridge', 'Lake Formation + IAM', 'CloudWatch / CloudTrail'] },
      ],
      features: [
        ['S3 as the universal lake', 'Effectively unlimited storage, 11 nines of durability, event notifications on every new object.'],
        ['One shared catalog', 'Glue Data Catalog tables are queryable from Athena, EMR, Glue and Redshift Spectrum.'],
        ['CDC without code', 'AWS DMS replicates full loads plus ongoing changes from Aurora, Oracle or SQL Server to S3 or Redshift.'],
        ['Serverless everywhere', 'Glue, Athena, EMR Serverless and Redshift Serverless bill per use, with no clusters to babysit.'],
        ['Fine-grained access', 'Lake Formation LF-tags plus row and column filters, enforced across query engines.'],
        ['Zero-ETL integrations', 'Aurora / RDS / DynamoDB to Redshift replication without building pipelines.'],
      ],
      steps: [
        { t: 'CLOUD & IAM FOUNDATIONS', c: '#dd344c', i: 'key-round', href: 'aws-dataengineering/index.html',
          b: ['Regions, AZs and VPC basics (subnets, endpoints)', 'IAM users, roles, policies and least privilege', 'AWS CLI, boto3 and named profiles', 'KMS encryption, Secrets Manager, Budgets and tags'],
          tools: ['iam', 'python', 'linux'], flow: ['Engineer / job', 'IAM role (STS)', 'S3 / Glue / Redshift'] },
        { t: 'S3 DATA LAKE DESIGN', c: '#3f8624', i: 'hard-drive', href: 'pyspark/cloud-storage.html',
          b: ['Bucket and prefix layout: raw / curated / analytics', 'Partitioning (dt=YYYY-MM-DD) and Parquet sizing', 'Storage classes and lifecycle rules', 'S3 events → SQS / Lambda / EventBridge'],
          tools: ['s3', 'parquet', 'iceberg'], flow: ['Sources', 's3://raw', 's3://curated', 's3://analytics'] },
        { t: 'INGESTION & CDC', c: '#527fff', i: 'git-merge', href: 'aws-dataengineering/index.html',
          b: ['AWS DMS full load + ongoing CDC from Aurora / on-prem', 'Kinesis Data Streams and Firehose delivery to S3', 'Amazon MSK + MSK Connect (Debezium connectors)', 'AppFlow for SaaS sources (Salesforce, etc.)'],
          tools: ['dms', 'kinesis', 'msk', 'debezium'], flow: ['Aurora binlog', 'AWS DMS', 'S3 CDC files', 'Glue MERGE → Iceberg'] },
        { t: 'AWS GLUE & DATA CATALOG', c: '#8c4fff', i: 'boxes', href: 'aws-dataengineering/index.html',
          b: ['Crawlers, databases and tables in the Data Catalog', 'Glue Spark ETL jobs: DynamicFrames vs DataFrames', 'Job bookmarks for incremental loads', 'Glue Data Quality rules and Glue Studio'],
          tools: ['glue', 'spark', 's3'], flow: ['S3 raw', 'Glue crawler', 'Data Catalog', 'Glue Spark job'] },
        { t: 'BIG DATA & STREAM PROCESSING', c: '#e25a1c', i: 'flame', href: 'pyspark/cluster-architecture.html',
          b: ['EMR on EC2 vs EMR Serverless vs EMR on EKS', 'Spark tuning on EMR (executors, shuffle, spot)', 'Managed Service for Apache Flink for streaming', 'Lambda for lightweight event transforms'],
          tools: ['emr', 'spark', 'flink', 'lambda'], flow: ['Kinesis / MSK', 'Flink or EMR Spark', 'S3 Iceberg tables'] },
        { t: 'QUERY ENGINES & WAREHOUSE', c: '#2e27ad', i: 'table', href: 'pyspark/mpp-warehouses.html',
          b: ['Athena: serverless SQL, partition projection, CTAS', 'Redshift Serverless / RA3, distribution and sort keys', 'Redshift Spectrum and zero-ETL integrations', 'QuickSight dashboards and SPICE'],
          tools: ['athena', 'redshift', 'quicksight'], flow: ['S3 + Glue Catalog', 'Athena / Redshift', 'QuickSight'] },
        { t: 'ORCHESTRATION & INFRASTRUCTURE AS CODE', c: '#e7157b', i: 'workflow', href: 'aws-dataengineering/demo.html',
          b: ['Step Functions state machines for pipelines', 'MWAA (managed Airflow) DAGs', 'EventBridge schedules and event rules', 'CloudFormation / CDK / Terraform + CI/CD'],
          tools: ['stepfn', 'mwaa', 'eventbridge', 'cdk'], flow: ['EventBridge rule', 'Step Functions', 'Glue job', 'Redshift load'] },
        { t: 'GOVERNANCE, SECURITY & COST', c: '#3f8624', i: 'shield-check', href: 'data-governence/index.html',
          b: ['Lake Formation: LF-tags, row and column filters', 'SSE-KMS encryption and VPC endpoints', 'CloudWatch alarms and CloudTrail audit', 'Cost levers: Glue DPUs, Athena bytes scanned, Redshift pause'],
          tools: ['lakeformation', 'iam', 'cloudwatch'], flow: ['IAM principal', 'Lake Formation', 'Athena / Redshift / EMR'] },
        { t: 'CAPSTONE: SERVERLESS CDC LAKEHOUSE ON AWS', c: '#ff9900', i: 'rocket', href: 'aws-dataengineering/index.html',
          b: ['Aurora → DMS CDC → S3 → Glue → Iceberg', 'Athena + Redshift Serverless serving, QuickSight dashboard', 'Step Functions orchestration, Lake Formation access', 'Deployed end to end with CDK or Terraform'],
          tools: ['dms', 'glue', 'athena', 'cdk'], flow: ['Aurora', 'DMS', 'S3 + Glue', 'Iceberg', 'Athena / QuickSight'] },
      ],
      essentials: ['s3', 'glue', 'athena', 'redshift', 'kinesis', 'emr', 'dms', 'stepfn', 'iam', 'cdk'],
      projects: ['Aurora CDC to an Iceberg lake with DMS + Glue', 'Real-time clickstream: Kinesis → Flink → S3 → Athena', 'Serverless ELT with Glue jobs and Step Functions', 'Redshift star schema with zero-ETL from Aurora', 'Governed lake with Lake Formation LF-tags'],
      skills: [['hard-drive', 'Lake design on S3', 'Layout, formats, lifecycle'], ['boxes', 'Serverless ETL', 'Glue, Lambda, Step Functions'], ['radio-tower', 'Streaming on AWS', 'Kinesis, MSK, Flink'], ['table', 'Warehousing', 'Redshift, Athena'], ['shield-check', 'Cloud security', 'IAM, KMS, Lake Formation']],
      certs: ['AWS Certified Data Engineer – Associate (DEA-C01)', 'AWS Certified Solutions Architect – Associate', 'AWS Certified Cloud Practitioner (starting point)'],
      roles: ['AWS Data Engineer', 'Cloud Data Engineer', 'Big Data Engineer (EMR)', 'Data Platform Engineer'],
      cta: { title: 'Open the AWS Data Engineering Track', text: 'Interactive explainers for the S3, Glue, Kinesis and Redshift services used in this roadmap.', href: 'aws-dataengineering/index.html', btn: 'Open AWS Track' },
    },

    // -----------------------------------------------------------------------
    snowflake: {
      tab: 'Snowflake Data Engineering', tabSub: 'Warehouses, Snowpipe, Dynamic Tables', icon: 'snowflake', accent: '#29b5e8',
      title: 'SNOWFLAKE DATA ENGINEER ROADMAP (2026)',
      subtitle: 'FROM FIRST WAREHOUSE TO GOVERNED, SELF-REFRESHING PIPELINES',
      headerTools: ['snowflake', 'snowpipe', 'dyntable', 'snowpark', 'timetravel', 'sharing'],
      archIntro: 'Storage and compute are separate: data lives once in micro-partitions, and any number of virtual warehouses read it independently. Pipelines are built from Snowpipe, Streams & Tasks and Dynamic Tables, all inside Snowflake.',
      arch: [
        { layer: 'Sources', icon: 'database', items: ['OLTP databases', 'Files in S3 / ADLS / GCS', 'Kafka topics', 'SaaS (partner ELT)'] },
        { layer: 'Ingest', icon: 'radio-tower', items: ['Stages + storage integrations', 'COPY INTO', 'Snowpipe (auto-ingest)', 'Snowpipe Streaming / Kafka connector'] },
        { layer: 'Storage', icon: 'hard-drive', items: ['Micro-partitioned tables', 'Iceberg tables', 'Time Travel + Fail-safe', 'Zero-copy clones'] },
        { layer: 'Processing', icon: 'cpu', items: ['Virtual warehouses', 'Streams & Tasks', 'Dynamic Tables', 'Snowpark Python / dbt'] },
        { layer: 'Serving', icon: 'chart-column', items: ['BI tools (Tableau, Power BI)', 'Streamlit in Snowflake', 'Secure data sharing'] },
        { layer: 'Govern & Ops', icon: 'workflow', items: ['RBAC + future grants', 'Masking / row access policies', 'Object tags', 'Resource monitors'] },
      ],
      features: [
        ['Separate storage & compute', 'ETL, BI and data science each get their own warehouse on one copy of the data.'],
        ['Per-second elastic compute', 'Resize or add clusters in seconds, and auto-suspend to zero when idle.'],
        ['Zero-copy cloning', 'Clone a production database for dev or test instantly, with no extra storage at first.'],
        ['Time Travel', 'Query or restore data up to 90 days back. UNDROP tables, schemas and databases.'],
        ['Dynamic Tables', 'Declare a SELECT and a target lag. Snowflake refreshes it incrementally.'],
        ['Secure data sharing', 'Share live tables with other accounts, with no copies and no file exports.'],
      ],
      steps: [
        { t: 'SQL & SNOWFLAKE FOUNDATIONS', c: '#29b5e8', i: 'snowflake', href: 'snowflake-dataengineering/index.html',
          b: ['Three-layer architecture: services, compute, storage', 'Snowsight worksheets, roles and context (USE ROLE / WAREHOUSE)', 'Databases, schemas, table types', 'Editions and how credits are billed'],
          tools: ['snowflake', 'snowsight', 'sql'], flow: ['Client (Snowsight)', 'Cloud Services', 'Virtual warehouse', 'Storage'] },
        { t: 'VIRTUAL WAREHOUSES & COST CONTROL', c: '#1a8fc0', i: 'gauge', href: 'snowflake-dataengineering/warehouses.html',
          b: ['Sizing: scale up for big queries, scale out for concurrency', 'Auto-suspend / auto-resume and the 60-second minimum', 'Multi-cluster STANDARD vs ECONOMY policies', 'Resource monitors, budgets and metering history'],
          tools: ['snowflake', 'sql'], flow: ['Queries', 'Multi-cluster warehouse', 'Resource monitor', 'Metering history'] },
        { t: 'LOADING: STAGES, COPY & SNOWPIPE', c: '#11567f', i: 'upload', href: 'snowflake-dataengineering/tables.html#load-cloud',
          b: ['Internal vs external stages and storage integrations', 'S3 and Azure Blob / ADLS setup end to end', 'COPY INTO options, load metadata, VALIDATION_MODE', 'Snowpipe auto-ingest and Snowpipe Streaming'],
          tools: ['stage', 'snowpipe', 's3', 'adls'], flow: ['S3 / ADLS files', 'Storage integration', 'External stage', 'Snowpipe → table'] },
        { t: 'STORAGE INTERNALS & PERFORMANCE', c: '#0f6e99', i: 'layers', href: 'snowflake-dataengineering/internals.html',
          b: ['Micro-partitions and pruning', 'Clustering keys and clustering depth', 'Result, metadata and warehouse caches', 'Query Profile: spilling, exploding joins, queuing'],
          tools: ['snowflake', 'sql'], flow: ['WHERE filter', 'Min/max metadata', 'Pruned partitions', 'Warehouse scan'] },
        { t: 'SEMI-STRUCTURED DATA & MODELING', c: '#7254a3', i: 'braces', href: 'snowflake-dataengineering/tables.html',
          b: ['VARIANT, dot notation and LATERAL FLATTEN', 'Star schemas and SCD Type 2 with MERGE', 'Transient vs permanent tables for staging', 'Constraints are informational: dedupe with QUALIFY'],
          tools: ['sql', 'snowflake'], flow: ['JSON in VARIANT', 'FLATTEN', 'Silver tables', 'Star schema'] },
        { t: 'PIPELINES: STREAMS, TASKS & DYNAMIC TABLES', c: '#29b5e8', i: 'workflow', href: 'snowflake-dataengineering/features.html#dynamic-tables',
          b: ['Streams (change tracking) + Tasks (schedules, DAGs)', 'Dynamic Tables with TARGET_LAG and DOWNSTREAM', 'Snowpark Python DataFrames, UDFs and stored procedures', 'dbt on Snowflake for tested models'],
          tools: ['streamtask', 'dyntable', 'snowpark', 'dbt'], flow: ['Raw table', 'Dynamic Table (silver)', 'Dynamic Table (gold)', 'BI'] },
        { t: 'DATA PROTECTION & RECOVERY', c: '#7254a3', i: 'history', href: 'snowflake-dataengineering/features.html#time-travel',
          b: ['Time Travel: AT / BEFORE, retention rules', 'UNDROP and the CREATE OR REPLACE trap', 'Zero-copy clones for backups and dev copies', 'Fail-safe, replication and failover groups'],
          tools: ['timetravel', 'snowflake'], flow: ['Bad DELETE', 'BEFORE(STATEMENT)', 'Clone', 'SWAP WITH'] },
        { t: 'GOVERNANCE, SECURITY & SHARING', c: '#11567f', i: 'shield-check', href: 'snowflake-dataengineering/interview-qna.html',
          b: ['Role hierarchy, SYSADMIN roll-up and future grants', 'Masking policies, row access policies, tag-based masking', 'Secure views and secure data sharing / Marketplace', 'ACCOUNT_USAGE auditing and cost attribution'],
          tools: ['horizon', 'sharing', 'sql'], flow: ['User role', 'Masking / row policy', 'Secure view', 'Consumer account'] },
        { t: 'CAPSTONE: SELF-REFRESHING SNOWFLAKE PIPELINE', c: '#29b5e8', i: 'rocket', href: 'snowflake-dataengineering/demo.html',
          b: ['S3 → Snowpipe → raw → Dynamic Tables silver / gold', 'PII masking and role design', 'Streamlit in Snowflake dashboard', 'Resource monitor, dbt tests and CI deployment'],
          tools: ['snowpipe', 'dyntable', 'streamlit', 'dbt'], flow: ['S3 files', 'Snowpipe', 'Dynamic Tables', 'Streamlit app'] },
      ],
      essentials: ['snowflake', 'sql', 'snowsight', 'snowpipe', 'dyntable', 'snowpark', 'dbt', 'python', 'git'],
      projects: ['Snowpipe auto-ingest from S3 into a medallion model', 'Dynamic Tables pipeline with 5-minute lag', 'SCD Type 2 customer dimension with Streams + Tasks', 'Zero-copy dev environments refreshed nightly', 'Shared data product with masking policies'],
      skills: [['gauge', 'Warehouse design & cost', 'Sizing, suspend, monitors'], ['upload', 'Data loading', 'Stages, COPY, Snowpipe'], ['layers', 'Performance tuning', 'Pruning, clustering, caches'], ['workflow', 'Pipelines', 'Dynamic Tables, Streams & Tasks'], ['shield-check', 'Governance', 'RBAC, masking, sharing']],
      certs: ['SnowPro Core Certification', 'SnowPro Advanced: Data Engineer', 'SnowPro Advanced: Architect (next step)'],
      roles: ['Snowflake Data Engineer', 'Analytics Engineer (dbt + Snowflake)', 'Cloud Data Warehouse Engineer', 'Data Platform Engineer'],
      cta: { title: 'Open the Snowflake MasterClass', text: 'Four modules, a hands-on SQL lab and an interview Q&A bank that follow this roadmap step by step.', href: 'snowflake-dataengineering/index.html', btn: 'Open Snowflake Hub' },
    },

    // -----------------------------------------------------------------------
    databricks: {
      tab: 'Databricks Data Engineering', tabSub: 'Delta, Auto Loader, Unity Catalog', icon: 'layers', accent: '#ff3621',
      title: 'DATABRICKS DATA ENGINEER ROADMAP (2026)',
      subtitle: 'MEDALLION LAKEHOUSE PIPELINES WITH DELTA LAKE & UNITY CATALOG',
      headerTools: ['databricks', 'spark', 'delta', 'autoloader', 'lakeflow', 'unity'],
      archIntro: 'Delta Lake tables on your own cloud storage form the medallion layers. Auto Loader and Lakeflow pipelines move data through them, and Unity Catalog governs every table, file and model in one place.',
      arch: [
        { layer: 'Sources', icon: 'database', items: ['OLTP via JDBC / CDC', 'Kafka / Event Hubs / Kinesis', 'Files in cloud storage', 'SaaS (Lakeflow Connect)'] },
        { layer: 'Ingest', icon: 'radio-tower', items: ['Auto Loader (cloudFiles)', 'Lakeflow Connect', 'Structured Streaming', 'COPY INTO'] },
        { layer: 'Storage', icon: 'hard-drive', items: ['Delta Lake (bronze / silver / gold)', 'Unity Catalog volumes', 'Liquid clustering', 'Change Data Feed'] },
        { layer: 'Processing', icon: 'cpu', items: ['Spark (classic + serverless)', 'Lakeflow Declarative Pipelines', 'Photon engine', 'Notebooks / dbt'] },
        { layer: 'Serving', icon: 'chart-column', items: ['Databricks SQL warehouses', 'AI/BI dashboards & Genie', 'Delta Sharing'] },
        { layer: 'Govern & Ops', icon: 'workflow', items: ['Unity Catalog lineage + grants', 'Lakeflow Jobs', 'Databricks Asset Bundles', 'System tables'] },
      ],
      features: [
        ['Delta Lake ACID', 'MERGE, UPDATE, DELETE and time travel on Parquet files in your own bucket.'],
        ['Auto Loader', 'Incrementally discovers new files with schema inference and evolution, and scales to millions of files.'],
        ['Declarative pipelines', 'Lakeflow Declarative Pipelines (formerly DLT) with expectations and AUTO CDC / APPLY CHANGES for SCD.'],
        ['Unity Catalog', 'One governance layer: grants, row filters, column masks, lineage and audit.'],
        ['Photon', 'Vectorized C++ engine that speeds up SQL and DataFrame workloads.'],
        ['Delta Sharing', 'Open protocol to share live tables, including with non-Databricks consumers.'],
      ],
      steps: [
        { t: 'SPARK & PYTHON FOUNDATIONS', c: '#e25a1c', i: 'flame', href: 'pyspark/cluster-architecture.html',
          b: ['Driver, executors, tasks and partitions', 'DataFrames, Spark SQL and lazy evaluation', 'Narrow vs wide transformations and shuffles', 'PySpark functions, UDFs vs built-ins'],
          tools: ['spark', 'python', 'sql'], flow: ['Driver (plan)', 'Executors', 'Tasks per partition'] },
        { t: 'WORKSPACE, COMPUTE & NOTEBOOKS', c: '#ff3621', i: 'server', href: 'databricks-dataengineering/index.html',
          b: ['Workspace, notebooks and Git folders', 'All-purpose vs job compute vs serverless', 'Cluster policies, auto-termination and Photon', 'Unity Catalog volumes instead of DBFS root'],
          tools: ['databricks', 'git', 'photon'], flow: ['Notebook / Git folder', 'Job or serverless compute', 'Unity Catalog tables'] },
        { t: 'DELTA LAKE DEEP DIVE', c: '#00add4', i: 'triangle', href: 'data-engineering/data-lakehouse.html',
          b: ['Transaction log (_delta_log), ACID and isolation', 'MERGE / UPDATE / DELETE, VERSION AS OF time travel', 'Schema enforcement and evolution', 'OPTIMIZE, liquid clustering vs Z-ORDER, VACUUM'],
          tools: ['delta', 'spark', 'sql'], flow: ['Writer commit', '_delta_log JSON', 'Parquet files', 'Readers (snapshot)'] },
        { t: 'INGESTION: AUTO LOADER & CONNECTORS', c: '#ff3621', i: 'upload', href: 'databricks-dataengineering/index.html',
          b: ['Auto Loader: cloudFiles, schema inference and evolution', 'File notification vs directory listing modes', 'COPY INTO for idempotent batch loads', 'Lakeflow Connect and Kafka / Event Hubs streaming reads'],
          tools: ['autoloader', 'kafka', 'delta'], flow: ['Cloud storage files', 'Auto Loader', 'Bronze Delta', 'Checkpoint'] },
        { t: 'MEDALLION & DECLARATIVE PIPELINES', c: '#d9480f', i: 'workflow', href: 'data-engineering/data-lakehouse.html',
          b: ['Bronze → Silver → Gold design rules', 'Lakeflow Declarative Pipelines (DLT): streaming tables & materialized views', 'Expectations: warn, drop, or fail on bad rows', 'AUTO CDC / APPLY CHANGES for SCD Type 1 and 2'],
          tools: ['lakeflow', 'delta', 'sql'], flow: ['Bronze (raw)', 'Silver (expectations)', 'Gold (aggregates)', 'SQL warehouse'] },
        { t: 'STRUCTURED STREAMING & CDC', c: '#5f9e1f', i: 'radio-tower', href: 'pyspark/streaming-cdc.html',
          b: ['Triggers: availableNow, processingTime, continuous', 'Checkpoints, watermarks and state', 'Change Data Feed and foreachBatch MERGE', 'Exactly-once writes into Delta'],
          tools: ['spark', 'kafka', 'debezium', 'delta'], flow: ['Kafka / CDC events', 'Structured Streaming', 'foreachBatch MERGE', 'Silver Delta'] },
        { t: 'UNITY CATALOG & GOVERNANCE', c: '#1b3139', i: 'shield-check', href: 'data-governence/unity/index.html',
          b: ['Metastore → catalog → schema → table / volume', 'GRANTs, row filters and column masks', 'Automatic lineage and audit via system tables', 'Delta Sharing with external partners'],
          tools: ['unity', 'deltashare', 'sql'], flow: ['Principal', 'Unity Catalog', 'Row filter / mask', 'Table'] },
        { t: 'ORCHESTRATION, CI/CD & PERFORMANCE', c: '#1b3139', i: 'gauge', href: 'pyspark/shuffle-tuning-qna.html',
          b: ['Lakeflow Jobs: task graphs, retries, file-arrival triggers', 'Databricks Asset Bundles + GitHub Actions deployments', 'Spark UI tuning: AQE, skew, shuffle partitions, Photon', 'Cost: job compute, autoscaling, auto-termination'],
          tools: ['jobs', 'dab', 'photon', 'git'], flow: ['Git push', 'Asset Bundle deploy', 'Lakeflow Job', 'Pipeline run'] },
        { t: 'CAPSTONE: STREAMING MEDALLION LAKEHOUSE', c: '#ff3621', i: 'rocket', href: 'databricks-dataengineering/demo.html',
          b: ['Kafka + Auto Loader into bronze', 'Declarative pipeline with expectations to silver / gold', 'Unity Catalog grants and lineage on gold', 'Databricks SQL dashboard, deployed with Asset Bundles'],
          tools: ['autoloader', 'lakeflow', 'unity', 'dbsql'], flow: ['Kafka + files', 'Auto Loader', 'Medallion pipeline', 'Unity Catalog', 'SQL dashboard'] },
      ],
      essentials: ['databricks', 'spark', 'python', 'sql', 'delta', 'autoloader', 'lakeflow', 'unity', 'dab', 'git'],
      projects: ['Auto Loader → medallion pipeline with expectations', 'Kafka CDC into Delta with foreachBatch MERGE', 'SCD Type 2 with AUTO CDC / APPLY CHANGES', 'Unity Catalog governed data product + Delta Sharing', 'CI/CD with Asset Bundles across dev / prod'],
      skills: [['triangle', 'Delta Lake mastery', 'ACID, MERGE, optimisation'], ['upload', 'Incremental ingestion', 'Auto Loader, streaming'], ['workflow', 'Declarative pipelines', 'Expectations, CDC'], ['shield-check', 'Unity Catalog', 'Grants, lineage, sharing'], ['gauge', 'Spark performance', 'AQE, Photon, skew']],
      certs: ['Databricks Certified Data Engineer Associate', 'Databricks Certified Data Engineer Professional', 'Databricks Certified Associate Developer for Apache Spark'],
      roles: ['Databricks Data Engineer', 'Lakehouse Engineer', 'Spark / Big Data Engineer', 'Data Platform Engineer'],
      cta: { title: 'Open the Databricks Data Engineering Track', text: 'Lakehouse explainers and demos for Delta Lake, Auto Loader and Unity Catalog.', href: 'databricks-dataengineering/index.html', btn: 'Open Databricks Track' },
    },

    // -----------------------------------------------------------------------
    azure: {
      tab: 'Azure Data Engineering', tabSub: 'ADLS, Data Factory, Synapse, Fabric', icon: 'cloud-cog', accent: '#0078d4',
      title: 'AZURE DATA ENGINEER ROADMAP (2026)',
      subtitle: 'BUILD PIPELINES ON ADLS GEN2, DATA FACTORY, DATABRICKS, SYNAPSE & FABRIC',
      headerTools: ['adls', 'adf', 'eventhubs', 'adb', 'fabric', 'powerbi'],
      archIntro: 'ADLS Gen2 (or OneLake in Microsoft Fabric) holds the lake. Data Factory pipelines and Event Hubs bring data in, Spark refines it, and Synapse, Fabric and Power BI serve it. Purview catalogs it all.',
      arch: [
        { layer: 'Sources', icon: 'database', items: ['Azure SQL / SQL Server', 'Cosmos DB', 'On-prem via self-hosted IR', 'Event producers / IoT'] },
        { layer: 'Ingest & CDC', icon: 'radio-tower', items: ['Data Factory / Fabric pipelines', 'Event Hubs (Kafka endpoint)', 'SQL CDC / change tracking', 'IoT Hub'] },
        { layer: 'Storage', icon: 'hard-drive', items: ['ADLS Gen2 (hierarchical namespace)', 'OneLake (Fabric)', 'Delta / Parquet', 'Event Hubs Capture'] },
        { layer: 'Processing', icon: 'cpu', items: ['Azure Databricks', 'Fabric / Synapse Spark', 'Stream Analytics', 'Azure Functions'] },
        { layer: 'Serving', icon: 'chart-column', items: ['Fabric Warehouse / SQL endpoint', 'Synapse SQL pools', 'Power BI (Direct Lake)'] },
        { layer: 'Govern & Ops', icon: 'workflow', items: ['Microsoft Purview', 'Entra ID, RBAC + ACLs', 'Key Vault', 'Azure Monitor / DevOps'] },
      ],
      features: [
        ['ADLS Gen2', 'Hierarchical namespace with real directories, atomic renames and POSIX ACLs on top of Blob storage.'],
        ['Data Factory', '90+ connectors, a self-hosted integration runtime for on-prem, and storage-event triggers.'],
        ['Kafka-compatible Event Hubs', 'Point existing Kafka clients (even Debezium) at Event Hubs without code changes.'],
        ['Microsoft Fabric', 'OneLake, Spark, Warehouse, Real-Time Intelligence and Power BI in one SaaS platform.'],
        ['Power BI Direct Lake', 'Reports read Delta tables in OneLake directly: no import refresh, no DirectQuery lag.'],
        ['Purview governance', 'Scan, classify and trace lineage across Azure, on-prem and multicloud sources.'],
      ],
      steps: [
        { t: 'AZURE FOUNDATIONS & IDENTITY', c: '#0078d4', i: 'key-round', href: 'azure-dataengineering/index.html',
          b: ['Subscriptions, resource groups and regions', 'Entra ID, RBAC and managed identities', 'Azure CLI / PowerShell, VNets and private endpoints', 'Cost Management, budgets and tags'],
          tools: ['entra', 'linux', 'python'], flow: ['Engineer / pipeline', 'Managed identity', 'ADLS / SQL / Key Vault'] },
        { t: 'ADLS GEN2 STORAGE', c: '#0078d4', i: 'hard-drive', href: 'pyspark/cloud-storage.html',
          b: ['Hierarchical namespace, containers and abfss:// paths', 'Azure RBAC vs POSIX ACLs', 'Access tiers and lifecycle management', 'Azurite for local Blob API development'],
          tools: ['adls', 'azurite', 'parquet'], flow: ['Sources', 'abfss://bronze', 'abfss://silver', 'abfss://gold'] },
        { t: 'DATA FACTORY & FABRIC PIPELINES', c: '#0062ad', i: 'workflow', href: 'azure-dataengineering/demo.html',
          b: ['Linked services, datasets and the Copy activity', 'Azure vs self-hosted integration runtimes', 'Mapping data flows, parameters and ForEach loops', 'Schedule, tumbling-window and storage-event triggers'],
          tools: ['adf', 'fabric', 'azsql'], flow: ['On-prem SQL', 'Self-hosted IR', 'Copy activity', 'ADLS bronze'] },
        { t: 'REAL-TIME INGESTION', c: '#5c2d91', i: 'radio-tower', href: 'data-engineering/real-time.html',
          b: ['Event Hubs partitions, consumer groups, Capture to ADLS', 'Kafka endpoint for existing Kafka producers', 'Stream Analytics windowed queries', 'Fabric Real-Time Intelligence (Eventstreams, KQL)'],
          tools: ['eventhubs', 'asa', 'kafka'], flow: ['Devices / apps', 'Event Hubs', 'Stream Analytics / Spark', 'ADLS + Power BI'] },
        { t: 'SPARK PROCESSING ON AZURE', c: '#ff3621', i: 'flame', href: 'databricks-dataengineering/index.html',
          b: ['Azure Databricks vs Fabric Spark vs Synapse Spark', 'abfss access with managed identity / service principal', 'Delta medallion layers on ADLS Gen2', 'Notebooks, jobs and parameterised runs from ADF'],
          tools: ['adb', 'spark', 'delta', 'fabric'], flow: ['ADLS bronze', 'Databricks / Fabric Spark', 'Delta silver', 'Delta gold'] },
        { t: 'WAREHOUSING & SERVING', c: '#117865', i: 'table', href: 'pyspark/mpp-warehouses.html',
          b: ['Synapse dedicated pools: hash / round-robin / replicated distributions', 'Serverless SQL with OPENROWSET over the lake', 'Fabric Warehouse and Lakehouse SQL endpoint', 'Power BI semantic models and Direct Lake'],
          tools: ['synapse', 'fabric', 'powerbi'], flow: ['Delta gold', 'Fabric Warehouse / Synapse', 'Semantic model', 'Power BI'] },
        { t: 'CDC & INCREMENTAL LOADS', c: '#5f9e1f', i: 'git-merge', href: 'pyspark/streaming-cdc.html',
          b: ['SQL Server / Azure SQL CDC and change tracking', 'Watermark-based incremental copy in ADF', 'Debezium on the Event Hubs Kafka endpoint', 'MERGE into Delta and SCD Type 2'],
          tools: ['azsql', 'adf', 'debezium', 'delta'], flow: ['Azure SQL CDC', 'ADF incremental copy', 'ADLS changes', 'Delta MERGE'] },
        { t: 'GOVERNANCE, SECURITY & DEVOPS', c: '#0078d4', i: 'shield-check', href: 'data-governence/purview-sandbox/index.html',
          b: ['Microsoft Purview: scans, classifications, lineage', 'Key Vault secrets and managed identities', 'Azure Monitor / Log Analytics alerts', 'ADF Git integration, Azure DevOps / GitHub CI/CD, Bicep / Terraform'],
          tools: ['purview', 'keyvault', 'monitor', 'devops'], flow: ['Data sources', 'Purview scan', 'Catalog + lineage', 'Data consumers'] },
        { t: 'CAPSTONE: AZURE CDC LAKEHOUSE TO POWER BI', c: '#0078d4', i: 'rocket', href: 'azure-dataengineering/index.html',
          b: ['Azure SQL CDC → ADF → ADLS bronze', 'Databricks or Fabric Spark → silver / gold Delta', 'Fabric Warehouse + Power BI Direct Lake report', 'Purview lineage, Key Vault, IaC deployment'],
          tools: ['adf', 'adls', 'adb', 'powerbi'], flow: ['Azure SQL', 'Data Factory', 'ADLS / OneLake', 'Spark medallion', 'Power BI'] },
      ],
      essentials: ['adls', 'adf', 'adb', 'synapse', 'fabric', 'eventhubs', 'powerbi', 'purview', 'sql', 'python'],
      projects: ['Metadata-driven ADF ingestion framework', 'Event Hubs → Stream Analytics → Power BI real-time dashboard', 'SQL Server CDC into a Delta lakehouse on ADLS', 'Fabric lakehouse with Direct Lake semantic model', 'Purview-governed data estate with lineage'],
      skills: [['hard-drive', 'Lake design on ADLS', 'Hierarchy, ACLs, tiers'], ['workflow', 'Pipeline orchestration', 'Data Factory, Fabric'], ['radio-tower', 'Streaming on Azure', 'Event Hubs, Stream Analytics'], ['table', 'Warehousing', 'Synapse, Fabric, Power BI'], ['shield-check', 'Governance', 'Purview, Entra ID, Key Vault']],
      certs: ['Microsoft Certified: Fabric Data Engineer Associate (DP-700)', 'Microsoft Azure Data Fundamentals (DP-900)', 'Databricks certifications for Azure Databricks work', 'Note: DP-203 (Azure Data Engineer) was retired in March 2025'],
      roles: ['Azure Data Engineer', 'Fabric Data Engineer', 'Cloud Data Engineer', 'BI / Analytics Engineer'],
      cta: { title: 'Open the Azure Data Engineering Track', text: 'Interactive explainers for the ADLS, Data Factory, Synapse and Fabric services used in this roadmap.', href: 'azure-dataengineering/index.html', btn: 'Open Azure Track' },
    },
  };
  // Real logos in assets/icons/tech/<file>.svg. Product features without their own
  // public logo use the parent product's logo; anything unmapped keeps its initials badge.
  const LOGOS = {
    python: 'python', linux: 'linux', git: 'git', gha: 'github', docker: 'docker', compose: 'docker',
    postgres: 'postgresql', mysql: 'mysql', mongo: 'mongodb', redis: 'redis',
    minio: 'minio', azurite: 'azure-storage', parquet: 'parquet', delta: 'delta-lake',
    spark: 'spark', kafka: 'kafka', flink: 'flink', airflow: 'airflow', dbt: 'dbt', trino: 'trino',
    duckdb: 'duckdb', superset: 'superset', grafana: 'grafana',
    iam: 'aws-iam', s3: 'aws-s3', dms: 'aws', kinesis: 'aws-kinesis', msk: 'aws-msk', glue: 'aws-glue',
    emr: 'aws', lambda: 'aws-lambda', athena: 'aws-athena', redshift: 'aws-redshift', quicksight: 'aws-quicksight',
    stepfn: 'aws-step-functions', mwaa: 'airflow', lakeformation: 'aws-lake-formation', cloudwatch: 'aws-cloudwatch',
    cdk: 'terraform', eventbridge: 'aws-eventbridge',
    snowflake: 'snowflake', snowsight: 'snowflake', snowpipe: 'snowflake', stage: 'snowflake', dyntable: 'snowflake',
    snowpark: 'snowflake', streamtask: 'snowflake', timetravel: 'snowflake', horizon: 'snowflake', sharing: 'snowflake',
    streamlit: 'streamlit',
    databricks: 'databricks', autoloader: 'databricks', lakeflow: 'databricks', unity: 'databricks', dbsql: 'databricks',
    photon: 'databricks', jobs: 'databricks', dab: 'databricks', deltashare: 'delta-lake',
    entra: 'azure-entra', adls: 'azure-data-lake', adf: 'azure-data-factory', eventhubs: 'azure-event-hubs',
    asa: 'azure-stream-analytics', adb: 'databricks', synapse: 'azure-synapse', fabric: 'microsoft', powerbi: 'power-bi',
    purview: 'microsoft', keyvault: 'azure-key-vault', monitor: 'azure-monitor', devops: 'azure-devops',
    azsql: 'azure-sql', cosmos: 'azure-cosmos',
  };

  const ORDER = ['oss', 'dbt', 'aws', 'snowflake', 'databricks', 'azure'];
  let current = 'oss';

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function badgeSvg(key, size) {
    const t = TOOLS[key] || T(key, '#475569');
    if (LOGOS[key]) {
      return `<img class="tech-logo" src="assets/icons/tech/${LOGOS[key]}.svg" alt="" width="${size}" height="${size}" loading="lazy">`;
    }
    const fs = t.abbr.length > 2 ? 11 : 14;
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="9" fill="${t.color}"/>` +
      `<text x="20" y="25.5" font-size="${fs}" font-weight="800" font-family="system-ui, sans-serif" fill="#ffffff" text-anchor="middle">${esc(t.abbr)}</text></svg>`;
  }
  const toolName = key => (TOOLS[key] || { name: key }).name;

  function stepHtml(rm, s, idx) {
    const num = String(idx + 1).padStart(2, '0');
    const learn = s.tools.map(k => `<div class="learn-tool-item"><div class="learn-tool-icon-svg">${badgeSvg(k, 34)}</div><div class="learn-tool-label">${esc(toolName(k))}</div></div>`).join('');
    return `<div class="poster-step-row" style="--node-color:${s.c};">
      <div class="step-node-col">
        <div class="step-number-circle">${num}</div>
        <div class="step-icon-badge"><i data-lucide="${s.i}" style="width:20px;height:20px;"></i></div>
      </div>
      <div class="step-card-box">
        <div class="step-content-left">
          <div class="step-title-header" style="color:${s.c};">${esc(s.t)}</div>
          <ul class="step-bullets-list">${s.b.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap;">
            <a href="${s.href}" class="step-inspect-link" style="color:${s.c};"><span>Open Interactive Module</span><i data-lucide="arrow-up-right" style="width:13px;height:13px;"></i></a>
            <button type="button" class="step-diag-inspect-btn" data-de-step="${idx}"><i data-lucide="network" style="width:13px;height:13px;"></i><span>View Architecture Diagram</span></button>
          </div>
        </div>
        <div class="step-learn-box">
          <span class="learn-tag-pill" style="background:${s.c};">LEARN</span>
          <div class="learn-tools-icons">${learn}</div>
        </div>
      </div>
    </div>`;
  }

  function sidebarCard(icon, iconColor, headerBg, title, body) {
    return `<div class="sidebar-infocard">
      <div class="sidebar-infocard-header" style="--sidebar-header-bg:${headerBg};"><i data-lucide="${icon}" style="width:16px;height:16px;color:${iconColor};"></i><span>${title}</span></div>
      <div class="sidebar-infocard-body">${body}</div></div>`;
  }
  const check = txt => `<div class="sb-check-item"><div class="sb-green-check-dot"><i data-lucide="check" style="width:12px;height:12px;"></i></div><span>${esc(txt)}</span></div>`;

  function posterHtml(key) {
    const rm = ROADMAPS[key];
    const arch = rm.arch.map((a, i) => `<div class="de-arch-layer" style="--layer-i:${i};">
        <div class="de-arch-layer-title"><i data-lucide="${a.icon}"></i><span>${esc(a.layer)}</span></div>
        <ul>${a.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
    const features = rm.features.map(([h, p]) => `<div class="de-feature"><strong>${esc(h)}</strong><span>${esc(p)}</span></div>`).join('');
    const essentials = rm.essentials.map(k => `<div class="sb-tool-chip"><div class="sb-tool-chip-icon">${badgeSvg(k, 22)}</div><span class="sb-tool-chip-label">${esc(toolName(k))}</span></div>`).join('');
    const skills = rm.skills.map(([ic, h, p]) => `<div class="sb-skill-node-item"><div class="sb-skill-icon-node" style="color:${rm.accent};"><i data-lucide="${ic}" style="width:16px;height:16px;"></i></div><div><strong style="color:var(--text-main);font-size:0.86rem;">${esc(h)}</strong><p style="font-size:0.78rem;color:var(--text-muted);margin:2px 0 0 0;">${esc(p)}</p></div></div>`).join('');
    const roles = rm.roles.map(r => `<div class="sb-career-item"><div style="display:flex;align-items:center;gap:8px;"><i data-lucide="briefcase" style="width:14px;height:14px;color:#fb923c;"></i><span>${esc(r)}</span></div></div>`).join('');
    const header = rm.headerTools.map(k => `<div class="de-header-tool">${badgeSvg(k, 46)}<span>${esc(toolName(k))}</span></div>`).join('');

    return `<div class="roadmap-poster" style="--poster-accent:${rm.accent};">
      <div class="poster-header">
        <div>
          <div class="poster-brand-eyebrow">TINITIATE AI • 2026 EDITION • DATA ENGINEERING TRACK ${ORDER.indexOf(key) + 1} OF ${ORDER.length}</div>
          <h2 class="poster-main-title">${esc(rm.title)}</h2>
          <div class="poster-subtitle-pill">${esc(rm.subtitle)}</div>
        </div>
        <div class="poster-header-graphic"><div class="de-header-tools">${header}</div></div>
      </div>

      <div class="de-arch">
        <div class="de-arch-head">
          <span class="de-arch-eyebrow"><i data-lucide="network"></i> Architectural summary</span>
          <p>${esc(rm.archIntro)}</p>
        </div>
        <div class="de-arch-flow">${arch}</div>
        <div class="de-arch-eyebrow" style="margin-top:18px;"><i data-lucide="sparkles"></i> Stack-specific features</div>
        <div class="de-features">${features}</div>
      </div>

      <div class="poster-body-grid">
        <div class="poster-spine-container">${rm.steps.map((s, i) => stepHtml(rm, s, i)).join('')}</div>
        <div class="poster-sidebars-col">
          ${sidebarCard('wrench', '#38bdf8', '#1e293b', 'ESSENTIAL TOOLS', `<div class="sidebar-tools-grid-icons">${essentials}</div>`)}
          ${sidebarCard('lightbulb', '#4ade80', '#14532d', 'PROJECT IDEAS', rm.projects.map(check).join(''))}
          ${sidebarCard('award', '#818cf8', '#312e81', 'SKILLS YOU WILL GAIN', skills)}
          ${sidebarCard('badge-check', '#fbbf24', '#713f12', 'CERTIFICATIONS', rm.certs.map(check).join(''))}
          ${sidebarCard('briefcase', '#fb923c', '#7c2d12', 'CAREER OPPORTUNITIES', roles)}
        </div>
      </div>

      <div class="roadmap-hub-cta-banner" style="margin-top:28px;">
        <div>
          <h4 style="color:#ffffff;font-size:1.05rem;margin-bottom:4px;">${esc(rm.cta.title)}</h4>
          <p style="font-size:0.85rem;color:var(--text-muted);">${esc(rm.cta.text)}</p>
        </div>
        <a href="${rm.cta.href}" class="hero-btn-primary" style="background:${rm.accent};"><span>${esc(rm.cta.btn)}</span><i data-lucide="arrow-up-right" style="width:16px;height:16px;"></i></a>
      </div>
    </div>`;
  }

  // ---- Per-step architecture diagram (reuses the page's #archDiagModal) ----
  function flowSvg(nodes, color) {
    const W = 760, H = 170, gap = 34, n = nodes.length;
    const bw = (W - 40 - gap * (n - 1)) / n;
    let out = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" fill="none"><defs><marker id="deArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${color}"/></marker></defs>`;
    nodes.forEach((label, i) => {
      const x = 20 + i * (bw + gap);
      out += `<rect x="${x}" y="45" width="${bw}" height="80" rx="10" fill="#1e293b" stroke="${color}" stroke-width="2"/>`;
      out += `<text x="${x + bw / 2}" y="30" font-size="10" font-weight="700" fill="#94a3b8" text-anchor="middle">STAGE ${i + 1}</text>`;
      // wrap long labels onto two lines
      const words = label.split(' ');
      const lines = [];
      let line = '';
      const max = Math.max(8, Math.floor(bw / 7.2));
      words.forEach(w => { if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); });
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((l, j) => {
        out += `<text x="${x + bw / 2}" y="${85 - (Math.min(lines.length, 3) - 1) * 8 + j * 16}" font-size="12.5" font-weight="700" fill="#f8fafc" text-anchor="middle">${esc(l)}</text>`;
      });
      if (i < n - 1) out += `<path d="M${x + bw + 4} 85 H${x + bw + gap - 4}" stroke="${color}" stroke-width="2.5" marker-end="url(#deArrow)"/>`;
    });
    return out + '</svg>';
  }

  function openStepDiagram(idx) {
    const rm = ROADMAPS[current];
    const s = rm.steps[idx];
    const modal = document.getElementById('archDiagModal');
    if (!modal) return;
    document.getElementById('modalStepBadge').textContent = `${rm.tab.toUpperCase()} • STEP ${String(idx + 1).padStart(2, '0')}`;
    document.getElementById('modalStepTitle').textContent = s.t.charAt(0) + s.t.slice(1).toLowerCase();
    document.getElementById('modalSvgContainer').innerHTML = flowSvg(s.flow, s.c);
    document.getElementById('modalStepDetails').textContent =
      `Data flow: ${s.flow.join(' → ')}. Focus areas: ${s.b.join('; ')}. Tools: ${s.tools.map(toolName).join(', ')}.`;
    modal.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  }

  // ---- Stack switcher ----
  function render(key) {
    if (!ROADMAPS[key]) key = 'oss';
    current = key;
    const root = document.getElementById('de-roadmap-root');
    if (!root) return;
    root.innerHTML = posterHtml(key);
    document.querySelectorAll('.de-stack-btn').forEach(b => {
      const on = b.dataset.stack === key;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function buildSwitcher() {
    const bar = document.getElementById('de-stack-switch');
    if (!bar) return;
    bar.innerHTML = ORDER.map((k, i) => {
      const rm = ROADMAPS[k];
      return `<button type="button" class="de-stack-btn" role="tab" data-stack="${k}" style="--stack-accent:${rm.accent};" aria-selected="false">
        <span class="de-stack-num">${String(i + 1).padStart(2, '0')}</span>
        <i data-lucide="${rm.icon}"></i>
        <span class="de-stack-text"><strong>${esc(rm.tab)}</strong><small>${esc(rm.tabSub)}</small></span>
      </button>`;
    }).join('');
    bar.addEventListener('click', e => {
      const b = e.target.closest('.de-stack-btn');
      if (b) render(b.dataset.stack);
    });
  }

  // Public: tag chip with a real logo when the tag names a known product (module cards, preview drawer)
  const TAG_LOGOS = [
    [/^pyspark$|^spark(\/delta)?$|apache spark/i, 'spark'], [/kafka/i, 'kafka'], [/flink/i, 'flink'], [/airflow/i, 'airflow'],
    [/delta lake|^delta$/i, 'delta-lake'], [/postgres/i, 'postgresql'], [/^mysql$/i, 'mysql'], [/mongo/i, 'mongodb'], [/redis/i, 'redis'],
    [/minio/i, 'minio'], [/parquet/i, 'parquet'], [/snowflake/i, 'snowflake'], [/redshift/i, 'aws-redshift'], [/aws s3|^s3$/i, 'aws-s3'],
    [/adls/i, 'azure-data-lake'], [/purview/i, 'microsoft'], [/power bi/i, 'power-bi'], [/databricks|unity catalog/i, 'databricks'],
    [/pytorch/i, 'pytorch'], [/tensorflow/i, 'tensorflow'], [/langgraph/i, 'langgraph'], [/langchain/i, 'langchain'],
    [/claude|anthropic/i, 'claude'], [/openai/i, 'openai'], [/hugging ?face/i, 'huggingface'], [/^python$/i, 'python'],
    [/docker/i, 'docker'], [/^dbt/i, 'dbt'], [/trino/i, 'trino'], [/duckdb/i, 'duckdb'], [/pandas/i, 'pandas'],
  ];
  window.techTagHtml = function (tag) {
    const hit = TAG_LOGOS.find(([re]) => re.test(tag));
    const logo = hit ? `<img class="tech-logo" src="assets/icons/tech/${hit[1]}.svg" alt="" width="13" height="13">` : '';
    return `<span class="tag-chip">${logo}${esc(tag)}</span>`;
  };

  // Public: lets other links open a specific stack, e.g. selectDeRoadmap('aws')
  window.selectDeRoadmap = function (key) {
    if (typeof window.selectRoadmapTab === 'function') window.selectRoadmapTab('de');
    render(key);
    const sec = document.getElementById('flagship-roadmaps');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  document.addEventListener('DOMContentLoaded', () => {
    buildSwitcher();
    const m = location.hash.match(/de-roadmap=(\w+)/);
    render(m ? m[1] : 'oss');
    if (m && typeof window.selectRoadmapTab === 'function') {
      window.selectRoadmapTab('de');
      const sec = document.getElementById('flagship-roadmaps');
      if (sec) sec.scrollIntoView({ block: 'start' });
    }
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-de-step]');
      if (b) openStepDiagram(+b.dataset.deStep);
    });
  });
})();
