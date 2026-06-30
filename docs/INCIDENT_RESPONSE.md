# Incident Response

Status date: 2026-06-29

## First 15 Minutes

1. Freeze deploys.
2. Preserve logs, request IDs, error IDs, failed job IDs, and provider event IDs.
3. Decide whether to disable writes or roll back hosting.
4. If secrets may be exposed, rotate first, investigate second.
5. Notify the operator responsible for Supabase, billing, email, AI provider, and hosting.

## Common Incidents

- Auth outage: check Supabase Auth status, anon key, service role server scope, and `/api/ready`.
- Upload outage: check storage bucket policies, file validation failures, and storage provider errors.
- Billing incident: verify webhook signature secret, provider event IDs, and duplicate/replay behavior.
- Queue incident: stop workers if retries amplify failures, then inspect `background_jobs`.
- AI incident: fail closed on provider errors and review cost/latency dashboards.

## Recovery

Use `docs/BACKUP_RECOVERY.md` and `docs/RELEASE_RUNBOOK.md`. Restore into staging first unless production data loss is active and confirmed.
