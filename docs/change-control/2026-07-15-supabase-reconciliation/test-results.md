# Clone Validation Results

All commands ran from `/Users/arpitmalviya/Downloads/greenlit` on 15 July 2026. Clone commands were preceded by a check that `supabase/.temp/project-ref` equalled `juhwnamjakmkvixxwrvv`.

## Static, dependency, test, and build gates

| Command | Exit | Result | Relevant output | Pre-existing failure? | Change made |
|---|---:|---|---|---|---|
| `npm audit --audit-level=high` | 0 | PASS | 0 vulnerabilities | No | None |
| `npm run lint` | 0 | PASS | No findings | No | None |
| `npm run type-check` | 0 | PASS | `tsc --noEmit` clean | No | None |
| `npm run test:unit` | 0 | PASS | 9/9 tests | No | None |
| `npm run test:integration` | 0 | PASS | 9/9 tests | No | None |
| `npm run test:auth` | 0 | PASS | 8/8 source tests plus session-cookie checks | No | None |
| `npm run test:backend-audit` | 0 | PASS | 4/4 tests | No | None |
| `npm run smoke` | 0 | PASS | Homepage, login, signup, dashboard boundary, compliance, health, core surfaces | No | None |
| `npm run migration:audit` | 0 | PASS | 50 migrations; no destructive operations | No | None |
| `npm run supabase:audit` | 0 | PASS | Buckets, policies, RLS, realtime markers, grants | No | None |
| `npm run security:audit` | 0 | PASS | 313 files after helper additions | No | None |
| `npm run build` | 0 | PASS | Next.js production build; 105 pages generated | No | None |

There is no `npm test` script, so it was not invented or run. The existing unit, integration, Auth, backend, and phase-specific scripts were used instead. No dependency upgrade was applied.

## Local application against clone

The app was started on `127.0.0.1:3100` with clone values injected into the process environment. Production environment files were not overwritten.

| Check | Result | Evidence |
|---|---|---|
| App startup | PASS | Next.js ready in 335 ms |
| Clone URL hard gate | PASS | Process URL parsed to `juhwnamjakmkvixxwrvv` |
| Health | PASS | `GET /api/health` -> 200, `ok: true` |
| Homepage/public route | PASS | `/` and `/check` -> 200 |
| Protected route | PASS | unauthenticated `/agency` -> 307 `/login` |
| Authenticated application write | PASS | `POST /api/org/create` -> 201 |
| Authenticated application read | PASS | `GET /api/billing/status` -> 200 and active `IN` jurisdiction |
| Fixture cleanup | PASS | zero QA users, organisations, and contracts remained |

## Live Auth against clone

Final run: 11/11 assertions passed.

- Email/password login created a session.
- Explicit refresh returned a new valid session.
- Logout cleared the client session.
- Public recovery request was accepted; delivery was not asserted.
- Generated recovery token reached `/reset-password`.
- Reusing the same recovery token redirected to `confirm_link_expired`.
- Generated signup token completed the signup confirmation route.
- Generated invitation token completed the invitation route.
- Invalid recovery, invitation, and signup tokens failed safely.

The first run had one test-fixture failure: the public recovery endpoint rejects reserved `example.com` addresses. This was not an application failure. The test was changed to use a Greenlit-owned test address, rerun, and passed. Google, Apple, SMTP delivery, DNS, and provider-console state were not claimed; see `unresolved-manual-actions.md`.

## Two-tenant RLS

Final run: 60/60 assertions passed. See `rls-results.md` for the actor/operation matrix. The service role was used only for fixture setup and cleanup. No access assertion used the service role.

## Post-test database integrity

- Public base tables: 108.
- Public tables with RLS: 108.
- Public tables without RLS: 0.
- Private buckets: 6/6.
- Intentional RLS/no-policy tables: 4.
- Remaining QA users, organisations, contracts: 0/0/0.
- Migration list: aligned.
- Final `supabase db push --dry-run`: `Remote database is up to date.`
