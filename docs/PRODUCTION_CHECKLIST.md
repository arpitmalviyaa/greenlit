# Production Checklist

Status date: 2026-06-29

## Before Deploy

- `npm run verify:release` passes.
- `npm run env:check` passes with production variables.
- `reports/bundle-report.json` and `reports/performance-report.json` are generated from the release commit.
- Supabase backup and storage recovery plan are recorded.
- Migration high-water mark is `030`.
- Rollback commit is known.

## Security

- RLS is enabled on production tables added through Phase 30.
- Storage buckets are private and org-scoped.
- Razorpay webhook signature secret is configured if billing is enabled.
- Service role key is server-only.
- Upload errors return correlation IDs, not provider/database internals.
- CSP, frame, referrer, content-type, and request-id headers are present.

## Smoke

- Homepage loads.
- Login loads and authenticated users can reach dashboard.
- Contract upload accepts valid PDF/DOCX and rejects invalid DOCX before storage.
- Contract review endpoint returns authenticated/unauthenticated responses as expected.
- Comments API lists and creates org-scoped `contract_comments`.
- Email ingest route stores drafts only.
- Approval submit/review routes are reachable.
- Notifications route is org-scoped.
- `/api/health` returns `ok: true`.
- `/api/ready` returns `ok: true` only when production env is configured.

## After Deploy

- No spike in `CONFIGURATION_ERROR`, upload failures, RLS errors, or webhook signature mismatches.
- No `background_jobs` remain `running` past the retry window.
- Email failures and queue failures include request/correlation IDs.
- Dashboard load and contract review latency match or beat the GA performance report.
- Record deployed commit, migration high-water mark, and smoke-test result.
