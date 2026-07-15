# Week 0 Completion Test Results

Run date: 2026-07-15 UTC. Environment: local code plus linked Supabase clone where stated.

| Gate | Result |
|---|---|
| `git diff --check` | PASS |
| `npm audit --audit-level=high` | PASS, 0 vulnerabilities |
| `npm run lint` | PASS |
| `npm run type-check` | PASS |
| `npm run test:auth` | PASS, 10/10 plus session-cookie checks |
| `npm run test:backend-audit` | PASS, 5/5 |
| `npm run test:phases` | PASS, 13/13 |
| `npm run test:corpus` | PASS, 18/18 |
| `npm run security:audit` | PASS, 314 source/config files scanned |
| `npm run smoke` | PASS: homepage, login, signup, dashboard boundary, compliance, health |
| `npm run build` | PASS, 105 pages generated |
| `npm run release:audit` | PASS after correcting its stale GA-workflow expectation to the active Week 0 CI contract |
| `npm run migration:audit` | PASS, 51 migrations, no destructive operations |
| `npm run supabase:audit` | PASS, bucket/policy/RLS/realtime/elevated-grant markers checked |
| `npm run verify:nonlive` | PASS, including bundle and performance reports |
| Clone consent migration dry run before apply | PASS: exactly `20260715000000_marketing_consent_default.sql` proposed |
| Clone migration apply | PASS; linked ref explicitly `juhwnamjakmkvixxwrvv` |
| Clone dry run after apply | PASS: `Remote database is up to date.` |
| Clone table/RLS count | Prior objective evidence remains 108/108; migration alters a default/function only |
| Clone Auth/RLS/application live re-run | NOT RUN: clone credentials were not locally available and Supabase management API retrieval hung; prior evidence is 11/11, 60/60, application read/write PASS with cleanup |
| Production tests | NOT RUN: production repair/deploy gates were not met |

No test was reported as passing when it did not run.
