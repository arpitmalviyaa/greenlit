# Migration Reconciliation Evidence

## Original divergence

Production recorded equivalent migrations under timestamps that differed from the repository. Local `034` and `035` also had timestamped production equivalents, and production contained `20260706054555_analytics_events` without a local file. A normal push therefore treated existing logical changes as pending.

## Reconstructed migration

`supabase/migrations/20260706054555_analytics_events.sql` was reconstructed from the stored production migration. It creates `public.analytics_events`, enables RLS, and deliberately creates no client policy because the table is service-role only.

## Proven mapping on clone

| Reverted remote version | Applied local version |
|---|---|
| 20260706010634 | 034 |
| 20260709022406 | 035 |
| 20260707042112 | 20260707000000 |
| 20260709022416 | 20260708000000 |
| 20260709022430 | 20260708000001 |
| 20260712114058 | 20260712000000 |
| 20260713033850 | 20260712010000 |
| 20260713033907 | 20260712020000 |
| 20260713033923 | 20260712030000 |
| 20260713033939 | 20260712040000 |
| 20260713034250 | 20260712050000 |
| 20260713034401 | 20260713000000 |

The repaired clone now has a fully aligned migration list and reports `Remote database is up to date` on dry run. Auth, application, RLS, schema, Storage, and cleanup gates passed after the repair. Production history was not changed.

See `production-runbook.md` for the exact authorized production sequence and stop conditions.
