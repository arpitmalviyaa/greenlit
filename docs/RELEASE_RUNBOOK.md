# Release Runbook

Status date: 2026-06-29

## GA Gate

```bash
npm run verify:release
```

This runs release audit, environment audit mode, migration audit, Supabase audit, security audit, lint, typecheck, phase tests, production build, bundle report, smoke tests, and performance audit.

## Deployment

1. Confirm `npm ci` and `npm run verify:release` pass on the exact commit being deployed.
2. Run `npm run env:check` with production variables.
3. Capture Supabase backup and storage recovery notes.
4. Apply migrations in numeric order from `001` through `030`.
5. Deploy frontend/backend Next.js runtime.
6. Start worker/background job processing against the same commit and queue.
7. Configure `GREENLIT_EMAIL_PROVIDER=api` only when a reviewed authenticated upstream email adapter is enabled. `manual` is non-live only.
8. Apply production migrations through `033` after backup and dry-run.
9. Verify `/api/health`, `/api/ready`, `/login`, dashboard, upload, review, comments, email ingest, approval, notifications, billing, storage, AI, and queue.

## Rollback

1. Roll back hosting to the previous green commit.
2. Stop workers if failed jobs are repeating.
3. Restore database from the pre-release Supabase backup if schema/data rollback is required.
4. Restore storage objects only if the failed release wrote incompatible files.
5. Re-run production smoke checks and record the rollback commit.

## Do Not Deploy If

- `npm run verify:release` fails.
- Strict `npm run env:check` fails.
- Migration audit reports destructive SQL.
- Supabase audit reports missing RLS or wide-open policies.
- Billing webhook secret is absent while billing is enabled.
- Production smoke cannot reach `/api/health` and `/api/ready`.
