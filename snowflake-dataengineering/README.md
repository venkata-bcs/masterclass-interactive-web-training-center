# Snowflake Data Cloud — Beginner to Interview-Ready Track

Static pages using the site-wide header, footer and three-column layout (`../assets/css/master-global-layout.css`, `../assets/js/master-global-nav.js`).

## Pages
- **[Hub](index.html)**: Snowflake in 60 seconds, glossary, learning path, "coming from Oracle/Postgres", editions, trial setup with a resource monitor.
- **[Hands-on SQL Lab](demo.html)**: 10 guided steps for a free trial (generate data, pruning, caches, stage round-trip, Time Travel, UNDROP, clone, dynamic table, cost + cleanup). Progress is saved per browser in `localStorage`.
- **[01 Warehouses & Compute](warehouses.html)**: cluster components, core warehouse operations, scale up vs out, multi-cluster policies, resource monitors, suspend/resume billing, why Snowflake. Labs: concurrency simulator, auto-suspend cost calculator.
- **[02 Snowflake Internals](internals.html)**: architecture, micro-partitions and pruning, CPU/memory/caches/spilling, why there is no VACUUM, backup and recovery, HA and failover groups. Lab: pruning simulator.
- **[03 Tables, Tuning & Loading](tables.html)**: table types, clustering keys, indexes/partitions alternatives, tuning checklist, external tables, AWS S3 and Azure loading (tabs).
- **[04 Time Travel, Dynamic Tables & Stages](features.html)**: Time Travel plus hard Q&A, dynamic tables vs streams/tasks vs MVs, stage types, COPY options, Snowpipe, troubleshooting. Lab: recovery-window simulator.
- **[Interview Q&A Bank](interview-qna.html)**: search, topic and level filters, interview mode (blurred answers), random question, `#q-<id>` deep links.

## Assets
- `assets/css/snowflake.css`: page components and dark/light tokens (`data-theme`).
- `assets/js/snowflake-common.js`: SQL highlighting and copy for `<pre class="sf-sql">`, tabs, rendering `[data-qna-topic]` boxes.
- `assets/js/snowflake-qna-data.js`: the single Q&A source (`window.SF_QNA`). Module "Interview check" sections render from it by topic.
- `assets/js/snowflake-labs.js`: the four simulators (simplified teaching models).
- `assets/js/snowflake-qna-bank.js`, `assets/js/snowflake-handson.js`: bank page and lab progress.

To add an interview question, append to `SF_QNA` with an existing `topic`. It appears in the bank and on the matching module page.
