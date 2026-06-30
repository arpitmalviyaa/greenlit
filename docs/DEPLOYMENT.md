# Production Deployment

Status date: 2026-06-29

## Frontend and Backend

```bash
npm ci
npm run verify:release
npm run env:check
npm run build
npm run start
```

Deploy the same commit that passed `verify:release`.

## Worker and Queues

- Use the same release commit and `GREENLIT_QUEUE_NAME`.
- Monitor `background_jobs` for `failed` and `dead` statuses.
- Queue failures must include request/correlation IDs in logs.

## Database

- Apply `supabase/migrations/001_initial_schema.sql` through `030_email_negotiation_and_upload_hardening.sql` in order.
- Do not apply destructive SQL during GA deployment.
- Keep the migration high-water mark in the release ticket.

## Email

- `GREENLIT_EMAIL_PROVIDER=manual` is non-live only.
- For live users, set `GREENLIT_EMAIL_PROVIDER=api` only after an authenticated
  upstream email adapter posts normalized messages to `/api/email/ingest`.
- Provider-backed ingestion must use reviewed adapter credentials and queue processing.
- Email ingestion stores draft replies only.

## Storage

- Required private buckets: `contracts`, `claim-evidence`, `ip-evidence`, `proof-vault`.
- Object paths are org-prefixed.
- Service role use remains server-side only.

## Smoke Tests

Run:

```bash
npm run smoke
```

Then manually verify deployed `/api/health`, `/api/ready`, homepage, login, dashboard, upload, review, comments, approvals, notifications, billing, storage, AI, queue, and email ingest.

## Rollback

Rollback the hosting deployment first. Restore Supabase backup only if schema or data changes require it.
