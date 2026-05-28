# System Tradeoffs

Building an ESG data ingestion engine involves prioritizing certain aspects of the system over others. Given the constraints of the prototype, here are three things that were deliberately *not* built and the rationale behind those choices.

## 1. User Authentication and Authorization (RBAC)
**What wasn't built:** A full login system with distinct user roles (e.g., Data Uploader vs. ESG Analyst).
**Why:** The assignment's core focus is on data ingestion, normalization, and review workflows. To streamline the prototype, user context is either mocked or deferred. Implementing JWTs, session cookies, and OAuth would have diluted the time spent on the core data engineering challenges without providing significant value to the core ingestion problem.

## 2. Background Queue Processing
**What wasn't built:** A distributed task queue (like BullMQ, RabbitMQ, or Celery) for handling massive multi-gigabyte CSV uploads asynchronously.
**Why:** Adding external queue dependencies violates the goal of a frictionless, zero-setup environment. While synchronously parsing files works perfectly for small-to-medium files in this prototype, a true production system would absolutely need an asynchronous worker pool to parse files, emit progress websockets, and prevent HTTP timeouts on massive SAP data dumps.

## 3. Dynamic Emission Factor API
**What wasn't built:** Fetching real-time emission conversion factors from external databases (like EPA, DEFRA, or Climatiq).
**Why:** Relying on third-party APIs during a local parse operation can cause severe bottlenecks, rate-limiting, and network unreliability. For the prototype, standard, well-known coefficients (e.g., kg CO2 per kWh, kg CO2 per liter of diesel) were hardcoded into a lookup table. In production, this would likely be a cached, periodically updated database table rather than a hardcoded object, to support regional granularity.
