# GA Release

Status date: 2026-06-29

## Verification Command

```bash
npm run verify:release
```

This runs every non-live gate automatically and prints the live operator steps that require production credentials.

## Go / No-Go

Go only when:

- `npm run verify:release` passes.
- `npm run env:check` passes with real production secrets.
- `GREENLIT_EMAIL_PROVIDER=api` is backed by a verified authenticated upstream adapter, or live users are not enabled.
- Supabase backup is complete and restore-tested in staging.
- Migrations through `033` are applied to production.
- Live smoke tests pass for auth, upload, review, comments, email ingest, approvals, notifications, billing, storage, AI, queue, health, and readiness.

No-go when:

- Any automated gate fails.
- Any production secret is missing.
- `GREENLIT_EMAIL_PROVIDER=manual` is the active production setting.
- Billing webhook signing cannot be verified.
- Storage bucket policies cannot be verified.
- `/api/ready` is not healthy after deploy.

## Release Notes

- Final GA adds no product features.
- Final GA completes production hardening, release verification, CI, comments reachability, observability hooks, deployment docs, and operator runbooks.
- Existing API behavior remains backwards compatible.
