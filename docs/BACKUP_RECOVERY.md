# Backup and Recovery

Status date: 2026-06-29

## Supabase Backup

1. Create a database backup before applying migrations.
2. Record project ref, backup timestamp, and migration high-water mark.
3. Export storage bucket object lists for `contracts`, `claim-evidence`, `ip-evidence`, and `proof-vault`.

## Restore Procedure

1. Restore the database backup into staging first.
2. Run smoke checks against staging.
3. Verify tenant isolation on `organisations`, `profiles`, `contracts`, `email_threads`, `notifications`, and storage paths.
4. Promote only after validation.

## Storage Recovery

- Buckets are private.
- Object paths are org-prefixed.
- Restore bucket metadata and objects only when the failed release wrote incompatible files.

## Environment Recovery

- Recreate variables from the deployment secret manager.
- Run `npm run env:check`.
- Never recover secrets from logs, docs, or git history.

## Deployment Rollback

1. Roll hosting back to the previous green commit.
2. Stop workers if queue failures are repeating.
3. Restore database only when schema/data changes require it.
4. Re-run `/api/health`, `/api/ready`, and the production smoke checklist.

## Recovery Checklist

- Freeze deploys.
- Preserve logs and failed job payloads.
- Identify last known-good commit and backup.
- Restore staging.
- Verify data isolation and core flows.
- Promote or roll back production.
- Record incident notes and follow-up fixes.
