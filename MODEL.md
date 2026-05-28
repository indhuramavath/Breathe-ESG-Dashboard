# ESG Data Model Architecture

The data model for the ESG data ingestion system is designed to provide robust multi-tenancy, flexible raw data storage, and normalized emission outputs. It is built using PostgreSQL (via PGlite for the prototype) and Drizzle ORM.

## Multi-tenancy
All records in the system are scoped by a `company_id`. The core tables (`data_uploads` and `emission_records`) both carry a foreign key relationship to the `companies` table. This allows the system to support multiple tenants (companies) simultaneously without data leakage.

## Core Entities
1. **companies**: Stores tenant metadata (`id`, `name`, `is_sample`).
2. **data_uploads**: Acts as a batch processing audit trail. It records the `source_type` (sap, utility, travel), file metadata, total row counts, error counts, and error logs.
3. **emission_records**: The central fact table for carbon accounting. 
   - Normalizes data into `co2_kg` and standardizes `unit` and `quantity`.
   - Tracks the carbon `scope` (1, 2, or 3).
   - Contains a `status` field (`pending`, `approved`, `rejected`, `flagged`) to support the analyst review workflow.
   - Contains `approved_by` and `approved_at` timestamps for strict auditing.

## Flexibility via JSONB
Real-world data formats are inconsistent. To avoid dropping critical, unpredictable source data (like cost centers, employee IDs, or location specifics), the `emission_records` table includes a `raw_data` column of type `JSONB`. This ensures the exact row imported is always preserved alongside the normalized output.

## Normalization & Audit Trail
Every emission record is strictly tied back to the specific `upload_id`. This provides a continuous audit trail, allowing analysts to trace any final emission number on the dashboard directly back to the exact source file and row it originated from.
