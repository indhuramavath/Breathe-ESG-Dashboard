# Implementation Decisions

During the development of the ESG Ingestion Prototype, several key architectural and design decisions were made to prioritize robustness, ease of evaluation, and real-world applicability.

## 1. Zero-Setup Database via PGlite
**Decision:** Instead of requiring a running external PostgreSQL instance via Docker or native installation, the application uses `@electric-sql/pglite`.
**Justification:** This allows the app to maintain 100% PostgreSQL syntax and compatibility (using Drizzle ORM) while functioning entirely in-memory/on-disk via WebAssembly. It guarantees a frictionless evaluation experience without sacrificing the ability to drop into a real Postgres DB in production (simply by providing a `DATABASE_URL`).

## 2. Flexible CSV Parsing via Aliases
**Decision:** The ingestion parsers (`csvParsers.ts`) use an alias-matching system to identify column headers.
**Justification:** Real-world data exports are messy. An SAP export might have columns in German (`kraftstoff`, `menge`) or use internal variants (`activity_type`, `fuel_type`). By mapping these known variants to a single normalized column definition, the system handles unpredictable data structures gracefully without breaking.

## 3. Synchronous vs Asynchronous Processing
**Decision:** File parsing and database insertion currently happen synchronously during the HTTP request lifecycle.
**Justification:** For prototype file sizes (up to thousands of rows), Node.js stream parsing (or even buffered parsing) is extremely fast. Introducing background job queues (like Redis/BullMQ) would add significant architectural overhead and reduce the ease of local setup.

## 4. Normalization at Ingestion
**Decision:** Raw data is converted into normalized standard units (`kg CO2`) at the exact moment of ingestion, rather than at read-time on the dashboard.
**Justification:** This vastly speeds up read operations and aggregations on the frontend dashboard. The fallback is the `raw_data` JSONB field, ensuring no source data is ever lost.
