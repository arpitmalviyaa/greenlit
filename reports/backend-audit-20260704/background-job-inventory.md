# Greenlit Background Job Inventory

Generated: 2026-07-04 17:50 IST

## Implemented Surfaces

- `background_jobs` table from `supabase/migrations/027_production_infrastructure.sql`, statuses `queued`, `running`, `succeeded`, `failed`, `dead`.
- `lib/engine/infrastructure/jobs.ts` in-memory queue helper with idempotency key map, retry policy, and terminal `dead` status.
- `app/api/counsel/upload/route.ts` enqueues `contract_review` background job rows after upload.
- `lib/engine/email/service.ts` enqueues `email` background job rows after email negotiation ingest.
- `lib/engine/workspace/service.ts` reads `background_jobs` for manager workspace queue projection and can create automation bundle job payloads.

## Production Verdict

PARTIAL. Queue records and queue logic exist, but no deployed worker, cron route, scheduled Vercel job, or external queue consumer was found in source/deployment inventory. New frontend should treat queued-job state as observable, not guaranteed async execution, until a worker is added.