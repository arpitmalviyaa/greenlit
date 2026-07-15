# Production Migration-History Repair Runbook

> **DO NOT RUN WITHOUT A FRESH COMPLETED BACKUP, AN APPROVED MAINTENANCE WINDOW, AND EXPLICIT PRODUCTION AUTHORIZATION.**

This runbook changes migration-history metadata only. It must not execute schema SQL. Clone project `juhwnamjakmkvixxwrvv` passed every gate; production project `ovjqzgzqcyowitjfwptz` was not modified.

## Preconditions

1. Confirm `test-results.md` and `rls-results.md` remain fully passing.
2. Confirm commits `18a6af8` and `4b0a9e4` plus the approved evidence commit are present in a clean worktree.
3. Supabase Dashboard -> production -> **Database -> Backups**: create/confirm a fresh completed backup and record its ID privately.
4. Confirm the maintenance window and rollback owner.
5. Save the production migration list before repair:

```sh
supabase link --project-ref ovjqzgzqcyowitjfwptz
test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration list --linked
```

Stop if the linked ref is not exactly `ovjqzgzqcyowitjfwptz` or the list differs from the original evidence.

## Proven history repairs

Run one pair at a time. After every pair, run `supabase migration list --linked` and confirm only the intended version changed.

```sh
test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260706010634
supabase migration repair --linked --status applied 034

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260709022406
supabase migration repair --linked --status applied 035

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260707042112
supabase migration repair --linked --status applied 20260707000000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260709022416
supabase migration repair --linked --status applied 20260708000000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260709022430
supabase migration repair --linked --status applied 20260708000001

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260712114058
supabase migration repair --linked --status applied 20260712000000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260713033850
supabase migration repair --linked --status applied 20260712010000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260713033907
supabase migration repair --linked --status applied 20260712020000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260713033923
supabase migration repair --linked --status applied 20260712030000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260713033939
supabase migration repair --linked --status applied 20260712040000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260713034250
supabase migration repair --linked --status applied 20260712050000

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration repair --linked --status reverted 20260713034401
supabase migration repair --linked --status applied 20260713000000
```

`20260706054555_analytics_events.sql` already has the same version in production; do not repair it.

## Mandatory verification

```sh
test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase migration list --linked

test "$(cat supabase/.temp/project-ref)" = ovjqzgzqcyowitjfwptz
supabase db push --dry-run
```

Expected: every local/remote version is aligned and the dry run says exactly `Remote database is up to date.` If any SQL is proposed, stop; do not run a real push.

Then run production read-only schema checks (108 public base tables, 108 with RLS), smoke, login/refresh/logout, controlled recovery, and the two-tenant RLS suite with production-specific authorization and controlled QA accounts. Confirm fixture cleanup.

## Stop and rollback conditions

Stop immediately if:

- the production backup is incomplete;
- the linked ref is uncertain or not exact;
- any stored/local migration pair differs;
- a repair changes more than the intended history row;
- the migration dry run proposes SQL;
- table count is not 108 or RLS count is not 108;
- login, recovery, application read/write, or tenant isolation fails.

Because repair changes history metadata only, rollback before any schema push is the inverse history operation: mark the new local version `reverted` and the original remote version `applied`, one verified pair at a time. If schema or data changes unexpectedly, stop and use the fresh backup under Supabase support/change-control guidance; do not improvise a forward migration.

## Finish

1. Capture sanitized production migration list, dry run, counts, and tests.
2. Relink to the intended normal project only after the change owner confirms which project that is.
3. Verify the final linked ref explicitly.
4. Commit evidence; do not commit credentials or raw Auth links.
