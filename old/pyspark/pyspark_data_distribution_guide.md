# PySpark Data Distribution & File Splitting Guide

In PySpark, the master assigns data to worker nodes in the form of **rows grouped together into logical chunks called partitions**.

---

## 1. How Data Distribution Works
PySpark uses a **row-oriented** data model. When a dataset (like a DataFrame or RDD) is split across a cluster, it is divided horizontally, not vertically:

*   **Rows (Horizontal Splitting):** Each worker node receives a subset of the total rows in your dataset. For example, if you have a dataset with 1 million rows and 4 partitions, each partition will contain roughly 250,000 full rows.
*   **Columns and Fields:** Every single worker node gets the **exact same columns and fields (schema)** for the rows it is assigned to process. The columns are not split up across different workers.

### Summary of Data Distribution
| Data Unit | Distributed Across Workers? | Description |
| :--- | :--- | :--- |
| **Partitions (Groups of Rows)** | **Yes** | The primary unit of data distribution. Workers process these chunks in parallel. |
| **Rows** | **Yes** | Split horizontally. A worker gets complete rows containing all their associated fields. |
| **Columns / Fields** | **No** | Kept intact. Every worker processes the full schema (all columns) for its assigned rows. |

---

## 2. Parquet File Splitting Behavior
The master distributes **some rows within a Parquet file** to different workers, not necessarily the entire Parquet file as a single un-splittable block. 

### How Parquet Splitting Works
Parquet is designed to be **splittable**. When PySpark reads a large Parquet file, it calculates **File Splits** based on HDFS/Cloud Storage block sizes (typically 128 MB or 256 MB). 

Because Parquet organizes its data internally into **Row Groups** (which usually contain 100 MB to 128 MB of rows), PySpark can cut the file at these boundaries and send different Row Groups to different worker nodes to be processed in parallel.

### How a Single Parquet File is Distributed
| Component | Distributed? | What Happens? |
| :--- | :--- | :--- |
| **Row Groups** | **Yes** | A single Parquet file is broken into horizontal chunks of rows called Row Groups. Worker A gets Row Group 1, Worker B gets Row Group 2. |
| **Individual Rows** | **Yes** | The rows inside those Row Groups are separated and processed by whichever worker gets that partition. |
| **Columns (Selected)** | **No (But Optimized)** | While columns aren't split across workers, Parquet is a *columnar storage* format. If your code only needs 2 out of 50 columns, PySpark will use **Column Projection** to tell the workers to only read those 2 columns from disk, saving massive amounts of I/O. |

> **The Tiny File Exception:** If your Parquet file is **very small** (e.g., a few kilobytes or megabytes), it will fit entirely inside a single storage block. In that specific case, PySpark will assign the **entire file** to a single worker because there isn't enough data to split efficiently.

---

## 3. Workflow: Who Makes the Decision?
The **worker does not make this decision**, and neither does Delta Lake or Apache Iceberg on its own. The decision of how to split and distribute the data is made **entirely by the Spark Driver (the Master)** before the workers ever touch the data.

### Step-by-Step Architecture Pipeline
1. **Metadata Lookup (Delta Lake / Iceberg):** The table format acts as the **catalog**. It tells the Spark Driver exactly which Parquet files belong to the current version of the table (ignoring old or deleted files). It provides file paths, sizes, and statistics.
2. **Split Calculation (Spark Driver):** The Driver looks at the file sizes provided by Delta/Iceberg. It applies configuration settings (like `spark.sql.files.maxPartitionBytes`) and calculates exactly how to slice those files into logical **partitions**.
3. **Task Assignment (Spark Driver):** The Driver creates tasks (e.g., *"Worker A: Read bytes 0 to 134,217,728 of File X"*). It then assigns these specific tasks to the worker nodes.
4. **Execution (Worker Nodes):** The workers are purely executors. A worker receives its task instruction, opens the Parquet file, skips directly to its assigned byte offset/row group, and processes the rows.

---

## 4. Criteria & Rules for Auto-Decisions

The Spark Driver evaluates the following core parameters automatically during file planning:

*   **`spark.sql.files.maxPartitionBytes`** *(Default: 134217728 bytes / 128 MB)*: The maximum size Spark allows for a single partition. If a file is larger than this, it gets split.
*   **`spark.sql.files.openCostInBytes`** *(Default: 4194304 bytes / 4 MB)*: The "penalty" weight given to opening a new file. Spark uses this to decide if it should pack multiple tiny files together into one partition for a single worker, preventing a worker from spending more time opening files than reading data.
*   **Parquet Row Group Boundaries**: Spark aligns its byte splits closely with Parquet's physical structural blocks (Row Groups) so workers don't have to read partial blocks.

---

## 5. Coding Optimization Scenarios

### Code-Driven Column Projection
Because Parquet is a columnar storage format, selecting specific columns forces Spark to optimize storage reads. The rows are still split among workers, but the workers pull drastically less data per row.

```python
# Spark implicitly optimizes this. 
# Workers will ONLY fetch bytes for 'user_id' and 'amount' from the storage layer.
df = spark.read.table("my_iceberg_table") \
          .select("user_id", "amount") \
          .filter("amount > 100")
```

### Table Compaction Strategies
You do not need to manually compute split math. Modern lakehouse formats feature auto-optimization utilities that keep files perfectly sized so Spark's default splitting engine operates at peak efficiency.

| Optimization Strategy | Delta Lake Code | Apache Iceberg Code |
| :--- | :--- | :--- |
| **Compaction** (Merges tiny files into clean 128MB+ files) | `OPTIMIZE my_delta_table` | `CALL catalog.system.rewrite_data_files('my_table')` |
| **Z-Ordering** (Clusters similar rows together so workers skip files entirely) | `OPTIMIZE table ZORDER BY (city)` | Controlled via `write.sort.order` table properties. |

### Data Skew & Salting
When you have a massive data skew (for example, a `GroupBy` or `Join` on `tenant_id` where one tenant has 80% of your data), Spark forces a single worker to process that entire tenant's rows. **Salting** artificially breaks up that massive pile of rows by appending a random number (the "salt") to the key, spreading the rows across multiple workers.

```python
import pyspark.sql.functions as F

# 1. Add a random salt (0 to 3) to break up the heavy key uniformly
salted_df = df.withColumn("salt", F.floor(F.rand() * 4)) \
              .withColumn("salted_key", F.concat(F.col("heavy_key"), F.lit("_"), F.col("salt")))

# 2. Perform your group by or join on the 'salted_key' instead of 'heavy_key'
result_df = salted_df.groupBy("salted_key").agg(F.sum("amount"))

# 3. Strip the salt away at the end to aggregate the final true pieces together
final_df = result_df.withColumn("original_key", F.split(F.col("salted_key"), "_")) \
                     .groupBy("original_key").agg(F.sum("sum(amount)"))
```