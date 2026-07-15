# Greenlit Task Journal

## Week 0 Completion Pass - 2026-07-15

- Reconstructed the full Week 0 checklist across stabilization, Supabase, security, deployment, and reconciliation documents.
- Captured a clean repository/Vercel/Supabase baseline. Branch began four commits ahead and linked to clone `juhwnamjakmkvixxwrvv`.
- Verified reconciliation commits `18a6af8`, `4b0a9e4`, and `21bf180` contain intended files and no credential values.
- Stopped production migration-history repair before linking production because no fresh completed backup record could be independently obtained; the CLI management calls hung and were terminated. Production was not modified.
- Hid Apple OAuth unless explicitly enabled, retained Google matching the observed production provider, and wired Turnstile tokens behind `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Moved optional marketing consent to post-verification onboarding, defaulted it off, and applied the non-breaking migration only to the clone.
- Added public analytics payload/metadata limits and rate-limit readiness, production HSTS, sensitive-route cache prevention, and fail-closed callback environment handling.
- Closed admin corpus URL SSRF by requiring an exact environment host allowlist and rejecting redirects.
- Clone migration dry run returned `Remote database is up to date` after the new consent migration.
- Passed audit, lint, type-check, Auth, backend, phase, corpus, security, smoke, and production build gates. Live clone Auth/RLS/app suites were not rerun because clone credentials were unavailable locally; prior passing evidence remains cited, not represented as a new run.
- Created completion evidence under `docs/change-control/2026-07-15-week-0-completion/`.
- No Git push or Vercel deploy was performed. Public beta remains NO-GO.

## Phase 24-25 Reconciliation Before Phase 26-28 - 2026-06-28

- Canonical repo path identified as `/Users/arpitmalviya/Downloads/greenlit`.
- Evidence for canonical choice:
  - git repo with remote `https://github.com/arpitmalviyaa/greenlit.git`;
  - branch `main`;
  - `HEAD` at `825857c fix: Set iteration error in scope/detect route (ts2802)`;
  - contains the active Next.js app, Supabase migrations, `package.json`, `next.config.mjs`, and `tsconfig.json`.
- Confirmed `/Users/arpitmalviya/Documents/Dt-physical/.remote-greenlit` is a partial handoff snapshot, not a git checkout.
- Existing canonical repo had pre-existing uncommitted changes before this reconciliation, including many deleted archived routes/pages, modified dashboard files, modified `tsconfig.json`, untracked `.claude/`, `AUDIT_REPORT.md`, `app/_archive/`, and untracked migrations `025_evidence_storage_buckets.sql` and `026_fix_contracts_storage_rls.sql`. These were not reverted or modified.
- Ported Phase 24-25 additively into the canonical TypeScript/Next architecture instead of copying orphan Python/FastAPI files.
- Added DOCX package helper:
  - `lib/engine/docx/package.ts`
- Added Phase 24 compatibility/regression modules:
  - `lib/engine/validation/compatibility.ts`
  - `lib/engine/regression/golden-corpus.ts`
  - `lib/engine/regression/snapshots.ts`
- Added Phase 25 infrastructure modules:
  - `lib/engine/infrastructure/audit.ts`
  - `lib/engine/infrastructure/auth.ts`
  - `lib/engine/infrastructure/config.ts`
  - `lib/engine/infrastructure/jobs.ts`
  - `lib/engine/infrastructure/rbac.ts`
  - `lib/engine/infrastructure/search.ts`
  - `lib/engine/infrastructure/index.ts`
- Added Supabase migrations:
  - `supabase/migrations/024_compatibility_validation.sql`
  - `supabase/migrations/027_production_infrastructure.sql`
- Used migration number `027` for production infrastructure because local untracked `025` and `026` migrations already existed and were preserved.
- Added reconciliation test:
  - `tests/phase24-25.test.mjs`
- Added reconciliation documentation:
  - `docs/PHASE24_25_RECONCILIATION.md`
- Compatibility coverage implemented:
  - golden corpus with `complex_features`, `stress_5_pages`, `stress_20_pages`, `stress_100_pages`, and `stress_500_pages`;
  - snapshot comparison using canonical DOCX part hashes and feature counts;
  - DOCX ZIP round-trip validation;
  - OPC/OOXML checks for required parts, content types, relationship targets, comments, track-revision settings, bookmark pairing, XML shape, and visible content;
  - feature counts for comments, track changes, paragraphs, tables, headers, footers, lists, nested numbering, images, hyperlinks, bookmarks, cross references, footnotes, endnotes, section breaks, page breaks, styles, custom styles, merged cells, content controls, and fields;
  - explicit evidence states for Word Desktop, Word Online, LibreOffice, and Google Docs.
- Production infrastructure coverage implemented:
  - environment validation for Supabase, database, JWT, app URL, storage bucket, rate limit, and timeout configuration;
  - HS256 JWT access/refresh token issuing and verification;
  - PBKDF2 password hashing;
  - Creator, Manager, Lawyer, and Admin RBAC;
  - idempotent retry queue for document parsing, review generation, export, email, search indexing, analytics, and notifications;
  - tenant-isolated search over contracts, brands, creators, clauses, comments, and versions;
  - structured audit events with request and correlation IDs.
- Verification passed:
  - `npm run lint`: passed with no ESLint warnings or errors.
  - `npm run type-check`: passed.
  - `npm run build`: passed; Next production build generated 69 app routes successfully.
  - `node --test tests/phase24-25.test.mjs`: passed 4 tests.
  - `npx tsc --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit ...`: passed for all new engine modules.
  - `npx tsc --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --strict --noUnusedLocals --noUnusedParameters --noEmit ...`: passed for all new engine modules.
  - marker scan `rg -n "TODO|placeholder|fake|throw new Error\\(\\\"not implemented|NotImplemented|dead code" ...`: returned no matches in reconciled files.
  - duplicate logic scan confirmed one shared DOCX ZIP helper in `lib/engine/docx/package.ts`; compatibility and snapshot modules call that helper; no new clause parser was introduced.
- Existing backend test suite status:
  - no pre-existing backend test script is defined in `package.json`;
  - no pre-existing test/spec files were present outside `node_modules`, `.next`, and the newly added `tests/phase24-25.test.mjs`;
  - the full available canonical test coverage is therefore the new Node test plus lint/type/build checks.
- Temporary `.phase-test-build` output from the Node test was removed automatically; final check showed it absent.
- No live Supabase project, database, storage bucket, external editor, deployment, LLM, or payment operation was run.
- Phase 26-28 work was not started.
- Final status: Phase 24-25 is reconciled and verified in the canonical repo.

## Phases 26-28 Persistent Review, Creator Workspace, Manager Workspace - 2026-06-29

- Objective: implement Phase 26 persistent review layer, Phase 27 creator workspace, and Phase 28 manager workspace without creating parallel persistence, workspace, timeline, search, notification, auth, or storage systems.
- Architecture review decisions used:
  - persistence models: EXTEND existing Supabase tables and Phase 25 contract tables;
  - Supabase schema: EXTEND existing `organisation_id` + `same_org` RLS pattern;
  - auth models: REUSE Supabase Auth and `profiles`;
  - storage abstractions: EXTEND existing Supabase Storage buckets/routes only where needed;
  - workspace components: EXTEND `organisations`, dashboards, `deal_rooms`, SOW/scope, approvals, and proof vault;
  - timeline/history: EXTEND and unify `timeline` with `evidence_timeline`;
  - search: EXTEND Phase 25 `search_index`;
  - notifications: EXTEND Phase 25 `notifications` and `background_jobs`.
- Added modules:
  - `lib/engine/workspace/model.ts`
  - `lib/engine/workspace/core.ts`
  - `lib/engine/workspace/service.ts`
- Added APIs:
  - `GET /api/workspace/search`
  - `GET /api/workspace/notifications`
  - `POST /api/workspace/notifications/read`
  - `GET /api/workspace/timeline`
  - `GET /api/workspace/contracts/[contract_id]/versions`
  - `GET /api/workspace/contracts/[contract_id]/compare`
  - `POST /api/workspace/contracts/[contract_id]/archive`
  - `POST /api/workspace/contracts/[contract_id]/restore`
  - `GET /api/workspace/creator`
  - `GET /api/workspace/manager`
- Added migration:
  - `supabase/migrations/029_workspace_persistence.sql`
- Migration adds:
  - `negotiation_memory`
  - `creator_clause_preferences`
  - `workspace_assignments`
  - `review_metrics`
  - `contracts.archived_at`
  - `contracts.archived_by`
- Added tests:
  - `tests/phase26-28.test.mjs`
  - test count: 5 new tests.
- Added docs:
  - `docs/PHASE26_28_ENGINEERING.md`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - `docs/WORKSPACE.md`
- Automation implemented through `reviewAutomationBundle` and `persistReviewAutomation`:
  - audit logs;
  - timeline events;
  - search indexing;
  - background jobs;
  - notifications.
- Timeline unification:
  - `mergeTimelineEvents` normalizes `timeline`, `evidence_timeline`, and optional `audit_logs` into one API response.
- Verification passed:
  - `npm run lint`: no warnings/errors.
  - `npm run type-check`: passed.
  - `npm run build`: passed; production build generated 75 app routes including new workspace APIs.
  - `node --test tests/phase24-25.test.mjs`: 4 tests passed.
  - `node --test tests/phase26-28.test.mjs`: 5 tests passed.
  - `npx tsc --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --strict --noUnusedLocals --noUnusedParameters --noEmit lib/engine/workspace/model.ts lib/engine/workspace/core.ts`: passed.
  - marker scan over new Phase 26-28 files for `TODO|placeholder|fake|not implemented|dead code`: no matches.
  - duplicate-system scan confirmed no `workspaces` table, no second search/timeline/notification family, and no new clause parser.
- Known limitations:
  - APIs require the Supabase migrations to be applied before use.
  - No live Supabase project/database/storage was mutated in this implementation pass.
  - Existing pre-user dirty worktree changes were preserved and not reverted.
- Technical debt introduced: zero known; route handlers are thin and business logic lives in `lib/engine/workspace`.

## Greenlit Phase 29-30 Email Negotiation Architecture and Production Hardening - 2026-06-29

- Pre-code inspection decisions:
  - `email`: `CREATE`; only `background_jobs.kind = 'email'` existed, with no thread/draft/provider adapter.
  - `notifications`: `EXTEND`; existing `notifications` table, workspace APIs, and automation bundle were reused.
  - `worker/background jobs`: `EXTEND`; existing `background_jobs`, retry policy, idempotency, and manager queue projection were reused.
  - `security/auth`: `EXTEND`; existing Supabase auth, profile/org checks, RLS, and workspace guards were reused.
  - `document-upload/storage`: `EXTEND`; existing `/api/counsel/upload`, `contracts` bucket, and org-scoped storage path were hardened.
  - `performance/benchmarks`: `CREATE`; no existing benchmark harness existed, so a focused runnable test was added.
- Files inspected included `app/api/counsel/upload/route.ts`, `lib/engine/docx/package.ts`, `lib/utils/extract-text.ts`, `lib/engine/infrastructure/{auth,audit,config,jobs,rbac}.ts`, `lib/engine/workspace/{model,core,service}.ts`, migrations `023`, `026`, `027`, and `029`.
- Added Phase 29 files:
  - `lib/engine/email/model.ts`
  - `lib/engine/email/core.ts`
  - `lib/engine/email/service.ts`
  - `app/api/email/ingest/route.ts`
  - `supabase/migrations/030_email_negotiation_and_upload_hardening.sql`
- Email architecture details:
  - provider-neutral `ProviderEmailMessage`, `EmailIngestionAdapter`, and future-only `FutureGmailAdapter` interfaces;
  - `email_threads`, `email_messages`, and `email_draft_replies` tables with org RLS, contract/deal-room links, provider/message id uniqueness, and indexes;
  - deterministic negotiation context extraction for terms, dates, money, and risk flags;
  - draft reply model persisted as a draft only;
  - timeline updates only when linked to a contract;
  - notification, `background_jobs.kind = 'email'`, and `negotiation_memory` hooks.
- Gmail constraints respected:
  - no live Gmail sending;
  - no OAuth flow;
  - no hardcoded provider credentials;
  - no fake Gmail adapter implementation.
- Added Phase 30 hardening:
  - `lib/engine/docx/package.ts` now enforces central-directory/local-header bounds, unsafe ZIP path rejection, max entry count, max uncompressed size, compression ratio ceiling, and `validateDocxPackage`.
  - `lib/engine/infrastructure/rate-limit.ts` adds a small in-memory limiter and is exported from `lib/engine/infrastructure/index.ts`.
  - `app/api/counsel/upload/route.ts` now enforces role permissions, per-user/org upload rate limiting, pre-storage DOCX validation, safe storage filenames, SHA-256 recording, structured logs, and live writes to `audit_logs`, `timeline`, `background_jobs`, and `notifications`.
  - Hardening is wired into the actual upload route and existing engine/storage/job paths; no unused security utility was added.
- Added tests:
  - `tests/phase29-30.test.mjs`
  - covers provider-neutral email context/draft behavior, no Gmail credential/sending dependency, DOCX ZIP hardening, upload rate limiting, and DOCX parse benchmark budget.
- Verification passed:
  - `node --test tests/phase29-30.test.mjs`: 4 tests passed.
  - `npm run type-check`: passed.
  - `node --test tests/phase24-25.test.mjs`: 4 tests passed.
  - `node --test tests/phase26-28.test.mjs`: 5 tests passed.
  - `npm run lint`: no warnings/errors.
  - `npm run build`: passed; production build generated 76 app routes including `/api/email/ingest`.
  - Scan over new email route/module/migration/test for OAuth, SMTP, sending, fake/pretend integration, and provider credentials found no live implementation; only the test title mentions Gmail credentials.
- Known limitations:
  - Supabase migration `030_email_negotiation_and_upload_hardening.sql` must be applied before `/api/email/ingest` can persist rows.
  - No live Supabase project, storage bucket, Gmail API, OAuth, SMTP, or external sending operation was run.
  - Existing dirty/untracked worktree state from prior phases was preserved and not reverted.
- Final status: Phase 29-30 complete and verified.

## Greenlit Phase 31 RC1 Release Audit and Release Readiness - 2026-06-29

- User request: run a release audit before Phase 31 RC1, fix any issues, then implement release-readiness only: CI/CD, deployment automation, release gates, environment validation, runbooks, backup/rollback/disaster recovery, production checklist, documentation freeze, one-command verify script, and RC1 verification report.
- Release audit results:
  - Migrations `024_compatibility_validation.sql`, `027_production_infrastructure.sql`, `029_workspace_persistence.sql`, and `030_email_negotiation_and_upload_hardening.sql` are ordered correctly.
  - Migration numbering is contiguous from `001` through `030`; no gaps or duplicate conflicts found.
  - New workspace APIs are documented; issue found and fixed: `/api/email/ingest` and hardened `/api/counsel/upload` behavior were missing from `docs/API.md`.
  - New workspace APIs use `requireWorkspaceProfile`; `/api/email/ingest` uses `ingestEmailNegotiation` with workspace profile and contract org checks; `/api/counsel/upload` uses Supabase auth, profile org lookup, role checks, org-prefixed storage, and org-scoped inserts.
  - Hardening utilities `validateDocxPackage` and `checkRateLimit` are wired into `/api/counsel/upload`.
  - Email remains provider-neutral; there is no live Gmail/OAuth/SMTP/sending implementation.
  - Upload hardening preserves existing response fields consumed by the counsel page: `contract_id`, `title`, `text_preview`, `extraction_error`, and `extraction_success`.
  - Issue found and fixed: `package.json` lacked phase test and one-command RC1 verification scripts.
  - Issue found and fixed: `.github/workflows` was absent, so CI did not automatically run all phase tests.
- Files added:
  - `.github/workflows/rc1.yml`
  - `scripts/release-audit.mjs`
  - `scripts/check-env.mjs`
  - `scripts/verify-rc1.mjs`
  - `docs/ENVIRONMENT.md`
  - `docs/RELEASE_RUNBOOK.md`
  - `docs/PRODUCTION_CHECKLIST.md`
  - `docs/DOCUMENTATION_FREEZE.md`
  - `docs/RC1_VERIFICATION_REPORT.md`
- Files updated:
  - `package.json`
  - `docs/API.md`
  - `docs/DATABASE.md`
- Package scripts added:
  - `test:phase24-25`
  - `test:phase26-28`
  - `test:phase29-30`
  - `test:phases`
  - `release:audit`
  - `env:check`
  - `verify:rc1`
- CI:
  - `.github/workflows/rc1.yml` runs on pull requests and pushes to `main`.
  - CI installs with `npm ci` and runs `npm run verify:rc1`.
- Verification:
  - `npm run verify:rc1`: passed.
  - `npm run release:audit`: passed.
  - `npm run env:check -- --allow-missing`: passed in CI/local audit mode with expected missing deployment secret notices.
  - `npm run lint`: passed with no warnings/errors.
  - `npm run type-check`: passed.
  - `npm run test:phases`: passed.
  - `tests/phase24-25.test.mjs`: 4 tests passed.
  - `tests/phase26-28.test.mjs`: 5 tests passed.
  - `tests/phase29-30.test.mjs`: 4 tests passed.
  - `npm run build`: passed; production build generated 76 app routes including `/api/email/ingest`.
- Known limitations:
  - Strict `npm run env:check` requires real deployment secrets and was not run in this local environment.
  - No live Supabase migrations, production backup, restore, hosting deploy, or smoke check was executed.
  - Existing dirty/untracked worktree state from prior phases was preserved and not reverted.
- Final status: Phase 31 RC1 release-readiness sprint is complete.

## Greenlit Phase 32 Production Deployment & RC2 GA Candidate - 2026-06-29

- Status: in progress.
- User request: no new product features; production-readiness only; preserve backward compatibility; complete environment validation, migrations, Supabase readiness, build/security/performance/logging/error monitoring/backup/deployment/smoke/CI/release documentation; produce RC2.
- Initial repo state:
  - canonical repo path: `/Users/arpitmalviya/Downloads/greenlit`;
  - branch: `main`;
  - HEAD before Phase 32: `825857c fix: Set iteration error in scope/detect route (ts2802)`;
  - pre-existing dirty/untracked RC1 worktree from prior phases preserved, including archived route deletions, `.github/`, `docs/`, `scripts/`, `tests/`, `lib/engine/`, and migrations `024`, `025`, `026`, `027`, `029`, `030`.
- Initial next action: inventory package scripts, environment validator, migrations `001` through `030`, Supabase policies/storage, production routes, CI, existing tests, and documentation before edits.
- Constraints: no UI redesign, no feature additions, no database redesign, no breaking API changes, no destructive migration, no placeholder implementations, no secrets in logs/docs/journal.
- Milestone: implemented RC2 production hardening edits:
  - expanded `lib/engine/infrastructure/config.ts` and `scripts/check-env.mjs` for frontend, backend, worker, email, queue, storage, Supabase, AI providers, auth, billing, and Sentry configuration checks;
  - added `lib/env.ts` and removed unsafe Supabase env non-null assertions from `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `lib/supabase/middleware.ts`;
  - added request IDs, duration logs, CSP/security headers, and configuration-error handling in `lib/supabase/middleware.ts`;
  - hardened `app/api/billing/webhook/route.ts` to fail closed when `RAZORPAY_WEBHOOK_SECRET` is missing and use `crypto.timingSafeEqual`;
  - hardened `app/api/billing/create-subscription/route.ts` to require configured `RAZORPAY_PLAN_ID_*` values and removed local fallback subscription IDs;
  - sanitized provider/database errors in `app/api/counsel/upload/route.ts`, added `error_id`, used `GREENLIT_STORAGE_BUCKET`, and preserved the existing response shape;
  - added `app/api/health/route.ts` and `app/api/ready/route.ts`;
  - added RC2 scripts `migration-audit`, `supabase-audit`, `security-audit`, `bundle-report`, `performance-audit`, `smoke`, and `verify-rc2`;
  - added split CI workflow `.github/workflows/rc2.yml`;
  - updated docs `ENVIRONMENT.md`, `RELEASE_RUNBOOK.md`, `PRODUCTION_CHECKLIST.md`, `API.md` and added `RC2_CHECKLIST.md`, `RC2_RELEASE_NOTES.md`, `BACKUP_RECOVERY.md`, `DEPLOYMENT.md`, `PRODUCTION_SECURITY_AUDIT.md`, `PERFORMANCE_AUDIT.md`.
- Next action: run RC2 audits/tests/build/report generation, fix failures, then commit.
- Verification completed:
  - `npm run release:audit`: passed.
  - `npm run env:check -- --allow-missing`: passed in audit mode.
  - `npm run migration:audit`: passed; verified `001_initial_schema.sql` through `030_email_negotiation_and_upload_hardening.sql`, 30 migrations, no destructive operations. Audit adjusted to treat `028` `DROP NOT NULL`/`DROP CONSTRAINT` as non-destructive rollback-relevant changes, not destructive table/column drops.
  - `npm run supabase:audit`: passed; checked storage buckets, policies, RLS, realtime-ready tables, and elevated grants.
  - `npm run security:audit`: passed; scanned active source for secret patterns, unsafe rendering/eval, service-role client leakage, raw provider error exposure, placeholder implementation markers, billing webhook signature checks, request IDs, and security headers.
  - `npm run lint`: passed.
  - `npm run type-check`: passed.
  - `npm run test:phases`: passed; Phase 24-25 4 tests, Phase 26-28 5 tests, Phase 29-30 4 tests.
  - Production build with CI-safe env values: passed; generated 78 routes including `/api/health` and `/api/ready`; largest visible first-load route remained `/login`/`/signup` around 146-147 kB and `/agency/counsel` 145 kB.
  - `npm run bundle:report`: passed; wrote `reports/bundle-report.json`; largest route asset set `/app/(dashboard)/agency/counsel/page` at 511485 bytes; duplicate packages `[]`.
  - `npm run smoke`: passed; checked homepage, login, dashboard, upload, review, comments persistence, email ingest, approvals, notifications, and health endpoints.
  - `npm run performance:audit`: passed; wrote `reports/performance-report.json`; cold env validation 93 ms, release audit 119 ms, migration audit 111 ms, Supabase audit 101 ms, security audit 114 ms, upload/review parser test 524 ms, search/dashboard projection test 529 ms.
  - Full `npm run verify:rc2` with CI-safe env values: passed.
  - Strict `npm run env:check` with complete CI-safe env values: passed.
- Remaining blockers:
  - Real production secrets were not available locally, so strict validation with live values and live provider checks must run in the deployment environment.
  - No live Supabase backup/restore, migration application, production deploy, or external smoke against production was executed.
  - Comments are verified at persistence level through `contract_comments`; RC2 does not add a dedicated comments API route.
- Staging decision: staged intended Greenlit app/docs/scripts/migrations/tests/reports changes and excluded local `.claude/` tooling directory from commit.
- Final status before commit: RC2 production-readiness implementation complete and verified locally.

## Greenlit Final GA Completion (No Further Phases) - 2026-06-29

- Status: in progress.
- Starting commit: `6d6de78e853a3fd72100d7b0e3efcc7c2bb8b86c`.
- User request: final GA production completion, no further phases, no feature sprint, no fake live verification.
- Required work: repository-wide audit and completion across security, environment, database, Supabase, performance, observability, monitoring, comments, deployment, testing, CI, release tooling, documentation, cleanup, and git hygiene.
- Initial next action: inspect git status, RC2 release tooling/docs/scripts/CI, comments reachability, observability/error handling gaps, `.gitignore`/`.claude`, generated reports, and package/dependency health before edits.
- Constraints: preserve backwards compatibility; do not build new product features; do not redesign UX/architecture; no destructive migrations; no secrets or credentials; live operations requiring credentials must be documented as manual operator steps.
- Files and functions changed:
  - Added scoped comments API route `app/api/workspace/contracts/[contract_id]/comments/route.ts` using `listContractComments()` and `createContractComment()` in `lib/engine/workspace/service.ts`.
  - Added centralized API 500 handling in `lib/api/errors.ts`; active API routes now return sanitized `Internal server error` payloads with `error_id` instead of raw provider/database exception messages.
  - Hardened `app/api/proof/upload/route.ts` with 25 MB upload limit, storage-safe filename generation, and sanitized storage/database failures.
  - Added `instrumentation.ts` for unhandled exception/rejection logging with correlation error IDs.
  - Migrated Next middleware entrypoint from `middleware.ts` to `proxy.ts`; request logs in `lib/supabase/middleware.ts` include request id, user id when authenticated, endpoint, status, duration, and error id.
  - Updated Supabase client wrappers in `lib/supabase/server.ts` and `lib/supabase/client.ts` for current dependency compatibility while preserving runtime validation/RLS boundaries.
  - Replaced RC-specific release tooling with `scripts/verify-nonlive.mjs` and `scripts/verify-release.mjs`; `package.json` now exposes `verify:nonlive`, `verify:release`, and `deps:audit`.
  - Updated `scripts/security-audit.mjs`, `scripts/bundle-report.mjs`, `scripts/smoke-tests.mjs`, and `scripts/release-audit.mjs`.
  - Replaced `.github/workflows/rc2.yml` with `.github/workflows/ga.yml`; removed `.github/workflows/rc1.yml`.
  - Added flat ESLint config `eslint.config.mjs`; removed `.eslintrc.json`.
  - Updated `next.config.mjs` for Next 16 production build settings.
  - Updated `.gitignore` to ignore `.claude/` and `.npm-cache/`.
  - Converted standalone corpus ingest `TODO` comments in `lib/corpus/ingest.ts` into explicit operator prerequisites.
  - Added docs `docs/GA_RELEASE.md`, `docs/OPERATIONS.md`, `docs/INCIDENT_RESPONSE.md`, and `docs/SECRETS.md`.
  - Updated docs `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/DOCUMENTATION_FREEZE.md`, `docs/PERFORMANCE_AUDIT.md`, `docs/PRODUCTION_CHECKLIST.md`, `docs/PRODUCTION_SECURITY_AUDIT.md`, and `docs/RELEASE_RUNBOOK.md`.
  - Removed stale RC docs `docs/RC1_VERIFICATION_REPORT.md`, `docs/RC2_CHECKLIST.md`, and `docs/RC2_RELEASE_NOTES.md`.
  - Regenerated `reports/bundle-report.json` and `reports/performance-report.json`.
- Dependency/security changes:
  - Ran `npm audit fix` and `npm audit fix --force` to clear high-severity advisory chain; upgraded `next`/`eslint-config-next` to `16.2.9`, `eslint` to v9-compatible flat config, and `postcss` to `8.5.10` via direct dependency/override.
  - `npm ci --cache .npm-cache`: passed; audited 502 packages and found 0 vulnerabilities.
  - `npm run deps:audit`: passed; found 0 vulnerabilities.
- Verification completed:
  - `npm run release:audit`: passed.
  - `npm run env:check -- --allow-missing`: passed for non-live audit mode.
  - strict `npm run env:check` with complete CI-safe values: passed.
  - `npm run migration:audit`: passed; migrations `001_initial_schema.sql` through `030_email_negotiation_and_upload_hardening.sql`, 30 migrations, no destructive operations.
  - `npm run supabase:audit`: passed; storage buckets, policies, RLS, realtime markers, and elevated grants checked.
  - `npm run security:audit`: passed; 204 active files scanned.
  - `npm run lint`: passed.
  - `npm run type-check`: passed.
  - `npm run test:phases`: passed; Phase 24-25 4 tests, Phase 26-28 5 tests, Phase 29-30 4 tests.
  - Production build with CI-safe env values: passed on Next.js 16.2.9; generated 86 app routes including `/api/workspace/contracts/[contract_id]/comments`.
  - `npm run bundle:report`: passed; wrote `reports/bundle-report.json` with 86 routes.
  - `npm run smoke`: passed; homepage, login, dashboard, upload, review, comments API, email ingest, approvals, notifications, and health endpoints.
  - `npm run performance:audit`: passed; report written to `reports/performance-report.json`.
  - Full `npm run verify:release` with CI-safe env values: passed; live-only gates were emitted as manual operator steps, not faked.
- Remaining live-only blockers:
  - Real production secrets were not available locally, so strict validation with live values must run in the deployment environment.
  - Supabase backup/restore, production migration application through `030`, live storage/RLS/realtime/functions/cron checks, provider webhooks, deployment, and external smoke tests require production credentials and were not executed.
- Delivered artifacts:
  - Commit message: `chore: finalize greenlit ga readiness`.
  - Release docs: `docs/GA_RELEASE.md`, `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/INCIDENT_RESPONSE.md`, `docs/SECRETS.md`, `docs/RELEASE_RUNBOOK.md`, `docs/PRODUCTION_CHECKLIST.md`.
  - Release reports: `reports/bundle-report.json`, `reports/performance-report.json`.
  - Release gate: `npm run verify:release`.
- Final status: complete for all non-live GA readiness work; production live operations are documented manual steps and require operator credentials. The final git hash is reported in the user-facing deliverable because a commit cannot include its own stable hash.

## Phase GA-LIVE — Production Deployment Gate - 2026-06-30

- Status: in progress.
- User request: prepare and safely execute the live GA deployment checklist for Greenlit from commit `99cfc62eec905bab316ca71c2d01485749d6b6ba`, without adding product features or faking production checks.
- Required order: confirm git state, re-run local release verification, classify production env vars, prepare live deployment sequence, stop before live deployment if credentials/access are unavailable.
- Safety constraints: do not invent secrets; do not mark live providers verified unless actually verified; do not run production deploy/migration/restore commands without live credentials and project confirmation.
- Initial next action: read GA release, operations, incident, secrets, deployment, security, performance, runbook docs, package scripts, GA workflow, and release verification scripts.
- Documents and scripts inspected:
  - `TASK_JOURNAL.md`
  - `docs/GA_RELEASE.md`
  - `docs/OPERATIONS.md`
  - `docs/INCIDENT_RESPONSE.md`
  - `docs/SECRETS.md`
  - `docs/DEPLOYMENT.md`
  - `docs/BACKUP_RECOVERY.md`
  - `docs/RELEASE_RUNBOOK.md`
  - `docs/ENVIRONMENT.md`
  - `docs/PRODUCTION_SECURITY_AUDIT.md`
  - `docs/PERFORMANCE_AUDIT.md`
  - `docs/PRODUCTION_CHECKLIST.md`
  - `package.json`
  - `.github/workflows/ga.yml`
  - `scripts/verify-release.mjs`
  - `scripts/verify-nonlive.mjs`
- Git state confirmed:
  - branch: `main`;
  - current commit: `99cfc62eec905bab316ca71c2d01485749d6b6ba`;
  - remote: `origin https://github.com/arpitmalviyaa/greenlit.git`;
  - tracking status: `main...origin/main [ahead 2]`;
  - uncommitted changes: `TASK_JOURNAL.md` live-gate journal entry only.
- Next action: run local release verification commands in the exact requested order.
- Local release verification results:
  - `npm ci --cache .npm-cache`: passed; 501 packages installed, 502 audited, 0 vulnerabilities.
  - `npm run deps:audit`: passed; 0 vulnerabilities.
  - `npm run env:check -- --allow-missing`: passed in audit mode; reported missing production secrets for frontend, backend, Supabase, AI, and authentication; defaults for `GREENLIT_QUEUE_NAME`, `GREENLIT_EMAIL_PROVIDER`, and `GREENLIT_STORAGE_BUCKET`.
  - `npm run release:audit`: passed.
  - `npm run migration:audit`: passed; migrations `001_initial_schema.sql` through `030_email_negotiation_and_upload_hardening.sql`, 30 migrations, no destructive operations.
  - `npm run supabase:audit`: passed; buckets, policies, RLS, realtime markers, and elevated grants checked statically.
  - `npm run security:audit`: passed; 204 files scanned.
  - `npm run lint`: passed.
  - `npm run type-check`: passed.
  - `npm run test:phases`: passed; Phase 24-25 4 tests, Phase 26-28 5 tests, Phase 29-30 4 tests.
  - `npm run build`: passed on Next.js 16.2.9; generated 86 app routes including `/api/workspace/contracts/[contract_id]/comments`.
  - `npm run bundle:report`: passed; wrote `reports/bundle-report.json`.
  - `npm run smoke`: passed; homepage, login, dashboard, upload, review, comments API, email ingest, approvals, notifications, and health endpoints.
  - `npm run performance:audit`: passed; wrote `reports/performance-report.json`.
  - `npm run verify:release`: passed for all non-live gates and printed manual required live steps.
- Strict production environment validation:
  - `npm run env:check`: failed as expected in this shell because live production variables are absent.
  - Missing required values reported: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GREENLIT_JWT_SECRET`, and one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.
- Local project metadata:
  - `.vercel/project.json` exists and links project name `greenlit`; no deployment was run.
  - `supabase/.temp` exists, but live Supabase project details/secrets were not inspected beyond file names.
  - Supabase CLI version checked via `npx supabase --version`: `2.108.0`.
  - Vercel CLI version checked via `npx vercel --version`: `54.18.3`.
  - Help-only checks confirmed syntax for `supabase db dump`, `supabase db push --dry-run`, `supabase migration list`, `vercel deploy --prod`, and `vercel rollback`.
- Live deployment decision:
  - No live deployment, backup, migration, provider check, or production smoke test was performed.
  - Stop reason: production credentials and live project access are unavailable in this environment; strict `npm run env:check` fails.
  - Risk level if deployed anyway: high, because `/api/ready`, Supabase access, AI review, auth, and server-side storage/database paths cannot be verified.

## GA Completion / Provider Readiness Integration - 2026-06-30

- Status: in progress.
- Request source: `/Users/arpitmalviya/.codex/attachments/04f5380b-688f-4f30-bbf6-656fe7db9654/pasted-text.txt`.
- Goal: finish remaining provider/API/readiness phases, integrate with current `origin/main`, run local gates, push safe code, and stop before live deployment unless strict production env validation passes.
- Safety constraints: no force-push; no invented production secrets; no credential files committed; no production migration/deploy unless `npm run env:check` passes without `--allow-missing`.
- Git state inspected:
  - branch: `main`;
  - local HEAD: `99cfc62 chore: finalize greenlit ga readiness`;
  - remote after `git fetch origin`: `origin/main` at `609b864 feat: improve contract negotiation workspace`;
  - divergence: `git rev-list --left-right --count HEAD...origin/main` returned `2 6`;
  - local-only commits: `6d6de78 chore: prepare greenlit rc2 production release`, `99cfc62 chore: finalize greenlit ga readiness`;
  - remote-only commits: `b4a2f3e`, `7c239f5`, `1e71d49`, `bfcb156`, `98c6711`, `609b864`;
  - dirty files: `TASK_JOURNAL.md`, `reports/bundle-report.json`, `reports/performance-report.json` from the no-go live gate.
- Next action: stash no-go artifacts, attempt a normal rebase of local GA commits onto `origin/main`, and abort/document if conflicts are broad or risky.
- Integration results:
  - Stashed no-go artifacts with `git stash push -m "greenlit-no-go-artifacts-20260630" -- TASK_JOURNAL.md reports/bundle-report.json reports/performance-report.json`.
  - Rebased local GA commits onto `origin/main`.
  - Resolved first rebase conflicts in `app/(dashboard)/creator/page.tsx`, `components/dashboard/sidebar.tsx`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, and `lib/supabase/server.ts`.
  - Kept current four-pillar creator workspace UI and kept env-backed Supabase clients / middleware hardening.
  - Resolved second rebase conflicts in `app/api/proof/upload/route.ts` and `proxy.ts`.
  - Kept support for exactly one of `contract_id` or `sow_id` in proof storage paths and kept sanitized filenames.
  - Kept the Next `proxy.ts` entrypoint and did not restore the old static homepage rewrite.
  - Rebased commits are now `456cbef chore: prepare greenlit rc2 production release` and `0d7cb31 chore: finalize greenlit ga readiness` atop `609b864`.
  - Popped no-go artifact stash cleanly; dirty files remained `TASK_JOURNAL.md`, `reports/bundle-report.json`, and `reports/performance-report.json`.
- Env/provider changes:
  - Added `.env.example` and `.env.production.example`.
  - Updated `scripts/check-env.mjs` so strict required checks are not satisfied by local defaults for `GREENLIT_QUEUE_NAME`, `GREENLIT_EMAIL_PROVIDER`, or `GREENLIT_STORAGE_BUCKET`.
  - Restricted configured email mode to `manual` or `api`; `manual` is non-live only and fails production validation when `GREENLIT_ENV=production`.
  - Updated `lib/engine/infrastructure/config.ts` so `/api/ready` fails production validation if AI keys are missing or email is still manual.
  - Documented email provider status in `docs/ENVIRONMENT.md`, `docs/GA_RELEASE.md`, `docs/OPERATIONS.md`, `docs/DEPLOYMENT.md`, and `docs/RELEASE_RUNBOOK.md`.
- Migration integration:
  - Renamed rebased GA migrations to avoid remote conflicts:
    - `supabase/migrations/029_workspace_persistence.sql` -> `supabase/migrations/032_workspace_persistence.sql`;
    - `supabase/migrations/030_email_negotiation_and_upload_hardening.sql` -> `supabase/migrations/033_email_negotiation_and_upload_hardening.sql`.
  - Updated `scripts/release-audit.mjs` and `scripts/migration-audit.mjs` to require `032`/`033`.
  - Fixed migration-number audits to apply sequential numbering only to `NNN_*.sql` files while still scanning all SQL migrations for destructive statements, so Supabase timestamp history files are not treated as numbered gaps.
- Security fixes:
  - Replaced raw `error.message` client responses with `internalError(...)` in `app/api/counsel/draft/route.ts`, `app/api/counsel/file/route.ts`, `app/api/delivery/lock/route.ts`, `app/api/final-check/start/route.ts`, `app/api/final-check/upload/route.ts`, `app/api/master/corpus/route.ts`, and `app/api/master/overview/route.ts`.
  - Removed `dangerouslySetInnerHTML` from `components/dashboard/creator-four-pillars.tsx`; document display now uses escaped plain text.
- Gate results so far:
  - `npm run env:check -- --allow-missing`: passed in audit mode and clearly reported missing frontend/backend/email/queue/storage/Supabase/AI/auth values.
  - `npm run smoke`: passed.
  - `npm run release:audit`: passed after migration audit fixes.
  - `npm run migration:audit`: passed after migration audit fixes; 37 migrations, no destructive operations.
  - `npm run supabase:audit`: passed.
  - `npm run security:audit`: passed after sanitization fixes; 213 files scanned.
  - `npm run lint`: passed.
  - `npm run type-check`: passed.
- Next action: run remaining/full gates (`test:phases`, `build`, `bundle:report`, `performance:audit`, `verify:release`, strict `env:check`), inspect diffs for secrets, commit safe changes, and push if fast-forward safe.
- Full non-live gate results:
  - `npm ci --cache .npm-cache`: passed; 501 packages installed, 502 audited, 0 vulnerabilities.
  - `npm run deps:audit`: passed; 0 vulnerabilities.
  - Initial parallel `npm run test:phases` failed because it ran while `npm ci` was replacing `node_modules`, causing a transient missing `@types/react-dom/index.d.ts`; reran after install settled.
  - `npm run test:phases`: passed after updating `tests/phase24-25.test.mjs` fixture to include `ANTHROPIC_API_KEY` and `GREENLIT_EMAIL_PROVIDER=api` for the stricter production config.
  - `npm run build`: passed; Next.js 16.2.9, 84 generated static pages, 93 bundle-report routes after integration.
  - `npm run bundle:report`: passed; regenerated `reports/bundle-report.json`.
  - `npm run performance:audit`: passed; regenerated `reports/performance-report.json`.
  - `npm run smoke`: passed after updating `scripts/smoke-tests.mjs` from migration `030_email_negotiation_and_upload_hardening.sql` to `033_email_negotiation_and_upload_hardening.sql`.
  - `npm run verify:release`: passed after updating `scripts/verify-release.mjs` manual operator text to migrations through `033`.
  - Strict `npm run env:check`: failed closed because production secrets are absent in this shell.
- Strict env missing values:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GREENLIT_JWT_SECRET`
  - `GREENLIT_EMAIL_PROVIDER`
  - `GREENLIT_QUEUE_NAME`
  - `GREENLIT_STORAGE_BUCKET`
  - one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Deployment status:
  - No live Supabase backup, migration, Vercel deploy, provider verification, or production smoke was performed because strict env validation failed.
  - Live deployment remains NO-GO until real production secrets are provided and `npm run env:check` passes without `--allow-missing`.
- Diff/security inspection:
  - `git diff --check`: passed.
  - `.env.local` exists locally and was used by Next build, but it remains ignored/untracked and must not be committed.
  - Safe env templates to add: `.env.example`, `.env.production.example`.
- Next action: stage safe files only, commit as `chore: finalize greenlit production readiness`, fetch/recheck divergence, and push `main` if fast-forward safe.
- Commit/push attempt:
  - Staged safe files only with `git add app components docs lib reports scripts supabase tests TASK_JOURNAL.md .env.example .env.production.example`.
  - `git diff --cached --check`: passed.
  - Staged filename secret check flagged only `.env.example` and `.env.production.example`; both were inspected and contain empty/template values only.
  - Created commit `f3b72c8 chore: finalize greenlit production readiness`.
  - `git fetch origin` then `git rev-list --left-right --count HEAD...origin/main`: `3 0`, ahead-only.
  - `git push origin main`: rejected by GitHub because the current token cannot create/update `.github/workflows/ga.yml` without `workflow` scope.
  - No force-push attempted.
  - Next action: create a backup branch from `origin/main` with the GA-ready code/docs/migrations excluding workflow-file changes, then push that branch as `greenlit-ga-ready-no-live-deploy`.
- Backup branch result:
  - Created branch `greenlit-ga-ready-no-live-deploy` from `origin/main`.
  - Applied the full GA-ready diff from local `main` excluding `.github/workflows/ga.yml`, because the available GitHub token cannot push workflow-file changes.
  - Trimmed patch-introduced trailing blank lines at EOF and verified `git diff --cached --check` passed.
  - Created backup branch commit `94c8b14 chore: finalize greenlit production readiness without workflow update`.
  - Pushed `greenlit-ga-ready-no-live-deploy` to `origin`.
  - GitHub PR URL offered by remote: `https://github.com/arpitmalviyaa/greenlit/pull/new/greenlit-ga-ready-no-live-deploy`.
  - Main was not pushed because the push was blocked by token scope, not by tests or code readiness.
  - Live deploy was not performed because strict `npm run env:check` failed due to missing production secrets.
- Final status: code/docs/migrations are GA-ready as far as local verification can prove; live deployment is NO-GO pending production secrets and a GitHub token with `workflow` scope if `.github/workflows/ga.yml` must land on `main`.

## Week 0 - Greenlit Stabilization - 2026-07-15

### Task 1: Repository safety

- Read the tracked repository inventory and the root project instructions before changing files.
- Verified branch: `website-v2-editorial`.
- Verified remote: `origin` points to the Greenlit GitHub repository.
- Verified starting state: clean worktree, local HEAD `89d8656`, exactly matched `origin/website-v2-editorial`.
- Verified GitHub authentication has `repo` and `workflow` scopes, so CI workflow files can be pushed without exposing the token.
- No secrets or ignored local environment files were staged.

### Task 2: Password reset investigation

- Traced the complete recovery path: `/forgot-password` calls Supabase Auth, the recovery template uses `/auth/confirm/recovery/{{ .TokenHash }}`, the route verifies the OTP, `/reset-password` updates the password, and the client signs out before returning to login.
- Exact historical root cause, verified from commit `c3098ae`: query-string token links were corrupted by quoted-printable email transport when a token fragment such as `=58` was decoded as a byte. The path-based token route removed `=` from the link and fixed both confirmation and recovery links.
- Verified current Supabase Auth configuration through the Management API without printing credentials: custom SMTP enabled at `smtp.resend.com:587`, sender `noreply@mail.getgreenlit.in`, site URL `https://app.getgreenlit.in`, recovery and confirmation templates both use path-based token links.
- Verified current DNS records: SPF for `send.mail.getgreenlit.in` resolves through the provider include to Amazon SES; DKIM exists at `resend._domainkey.mail.getgreenlit.in`; root DMARC is `p=quarantine`; provider MX exists; SMTP port 587 is reachable.
- Verified current production Auth logs: `/recover` returned 200, `/verify` returned 200, password login returned 200, and logout returned 204 in one completed recovery sequence on 2026-07-15. No SMTP/gomail error was present in the inspected window.
- Conclusion: password reset is not currently failing. The former failure was link corruption, not an absent Resend client integration. Resend is configured as Supabase Auth's SMTP provider in the dashboard, so application code does not call the Resend API directly.
- Files already containing the fix: `app/auth/confirm/[type]/[token]/route.ts`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`. No source modification was required.
- Dashboard state already contains the required fix. No dashboard mutation was made.

### Task 3: Authentication review and automated coverage

- Verified signup, password login, logout, browser token refresh, session-cookie expiry behavior, forgot-password, recovery-link verification, password update, post-reset logout, and server-side dashboard protection.
- Added `tests/auth-flows.test.mjs` as a dependency-free contract test over the actual auth entry points.
- Added `npm run test:auth`, which also runs the executable session-cookie checks in `tests/session-cookies.test.mjs`.
- Live Supabase configuration independently confirmed a 3600-second JWT lifetime, refresh-token rotation enabled, and a 10-second reuse interval. The automated suite checks the application half of that contract without requiring production credentials.

### Task 4: Security audit

- Completed source, history, dependency, API-auth, Supabase policy/storage, Auth configuration, and GitHub security-setting review.
- Added `docs/WEEK0_SECURITY_AUDIT.md` with exploit paths, confidence, severity, exact fixes, dashboard work, passed controls, and data classification.
- Open findings: leaked-password protection disabled (medium), database open CIDRs plus TLS enforcement disabled (medium), Auth minimum password length 6 versus UI 8 (low), and platform-admin-only URL fetch SSRF primitive (low).
- Resolved during validation: raw provider/database errors returned to clients. Source security audit now passes across 310 files.
- Verified zero high/critical npm advisories, private storage buckets, RLS deny-by-default service tables, signed Razorpay webhook, no tracked secrets, GitHub secret scanning, and push protection.

### Task 5: CI improvements

- Added weekly Dependabot checks for npm and GitHub Actions.
- Added a non-deploying GitHub Actions workflow for clean install, high-severity npm audit, lint, type-check, auth tests, backend access-control tests, phase tests, source security audit, smoke tests, build verification, and full-history Gitleaks scanning.
- Pinned all GitHub Actions to full commit SHAs.
- Repaired validation blockers exposed by the new pipeline: stale exact API-route count, missing recognition of the shared admin gate, six raw backend error-response paths, and the intentional ref-backed corpus graph simulation lint annotation.
- No deployment step, production credential, or secret value was added.
- Enabled GitHub Dependabot vulnerability alerts and automated security updates through the repository API. Existing GitHub secret scanning and push protection remain enabled.
- First pushed CI run `29417908927`: Gitleaks passed; verify correctly failed at `npm ci` because npm 11 found two missing optional-package entries in the lockfile.
- Normalized `package-lock.json` with npm 11.6.2 and declared the two already-required optional WASM peer packages so Linux and macOS resolve the same clean-install graph. `npm ci --ignore-scripts` now succeeds with 0 vulnerabilities.
- Second pushed CI run `29418031582`: Gitleaks, clean install, npm audit, lint, and type-check passed. Auth source tests passed 8/8, then the session-cookie check failed only because the script relied on an undeclared `tsx` executable.
- Removed that undeclared tool assumption. Node 24 runs the small TypeScript cookie module directly, so `test:auth` now uses the standard runtime with no added test dependency.

### Task 6: Smoke tests

- Expanded `npm run smoke` to cover the requested homepage, login, signup, dashboard authentication boundary, compliance feedback endpoint, and health endpoint.
- Preserved the existing core API/file-surface smoke checks.
- Added optional live HTTP smoke checks behind `SMOKE_BASE_URL`; CI remains non-deploying and runs the deterministic repository checks by default.

### Task 7: Week 0 documentation

- Added `docs/WEEK0_REPORT.md` with completed work, manual steps, risks, recommendations, validation evidence, and next actions.
- Report explicitly stops at Week 0 stabilization. No Month 1 work, feature work, or UI redesign was started.

### Task 8: Push and remote verification

- Pushed all Week 0 commits to `origin/website-v2-editorial` without force-push.
- Final code-bearing GitHub Actions run `29418110114` passed both jobs: Gitleaks in 9 seconds and the full verify pipeline in 1 minute 1 second.
- GitHub Dependabot configuration validation passed.
- Noted the non-blocking GitHub warning that the pinned action versions target the deprecated Node 20 action runtime and are being forced onto Node 24. Update pins when Node 24-native action releases are available.

## Supabase Production Hardening Audit - 2026-07-15

### Task 1: Repository and linked-project inspection

- Re-read the complete tracked repository inventory and inspected every production-relevant Supabase integration surface without changing application features or production state.
- Verified the worktree began clean on `website-v2-editorial` and matched its remote.
- Queried live Auth configuration, database catalog, RLS policies, constraints, indexes, functions, Storage buckets/policies, Edge Functions, backups, network restrictions, SSL enforcement, Security Advisor, Performance Advisor, and query/table statistics without printing secrets.
- Confirmed 108 public tables with RLS enabled, 219 public/storage policies, 227 foreign keys, 207 indexes, all six buckets private, zero deployed Edge Functions, and seven completed daily physical backups.

### Task 2: Production blocker and manual handoff

- Found critical migration-history divergence: overlapping logical changes are recorded with different local and production version identifiers. Stopped before any `db push`, migration repair, or live configuration mutation.
- Confirmed additional production blockers: database SSL enforcement off, database network open to all IPv4/IPv6, Apple provider visible but disabled/unconfigured, and no verified backup/restore path for Storage object bytes.
- Revalidated the historical password-reset root cause and current path-token fix. Current DNS/SMTP state supports Resend delivery; invitation email remains query-token based and requires the same hardening.
- Added `SECURITY_REPORT.md`, `docs/SUPABASE_PRODUCTION_CHECKLIST.md`, and `MANUAL_ACTIONS.md` with exact findings, readiness gates, click-by-click dashboard work, risk, and time estimates.
- No production setting, schema, provider, secret, or deployment was changed.

## Supabase Clone Reconciliation Validation - 2026-07-15

### Phase 0: Safety and baseline

- Verified linked ref from `supabase/.temp/project-ref` before every Supabase CLI command: `juhwnamjakmkvixxwrvv` (`greenlit-migration-check`). Production ref `ovjqzgzqcyowitjfwptz` remained unlinked.
- Baseline branch `website-v2-editorial`, commit `b6fd375a54f1e8b869617d31e3dbe22335974b8e`, ahead of its remote by one commit.
- Preserved the user's untracked reconstructed analytics migration and initial reconciliation evidence.
- Detected npm from `package-lock.json`; inventoried scripts, test utilities, and required environment names without values.
- Initial and final clone migration lists were aligned; both dry runs returned `Remote database is up to date.`

### Phase 1: Static and build verification

- Passed high-severity npm audit (0 vulnerabilities), lint, type-check, unit tests (9), integration tests (9), Auth source/session tests (8 plus cookie checks), backend audit (4), smoke, migration audit (50 migrations), Supabase audit, security audit, and the Next.js production build (105 pages).
- No `npm test` script exists; existing repository scripts were used. No dependency was upgraded.

### Phases 2-3: Clone application and Auth

- Used in-process clone credentials obtained through the approved CLI login; values were never printed, written, or committed. `.env.clone.local` is already ignored by `.env.*.local`.
- Started Next.js on `127.0.0.1:3100` with clone environment overrides. Health and public routes returned 200; protected dashboard redirected to login.
- Passed authenticated application write (`POST /api/org/create` -> 201) and read (`GET /api/billing/status` -> 200), with full fixture cleanup.
- Added and passed 11 live clone Auth assertions: login, refresh, logout, recovery request, valid/reused recovery token, signup token, invite token, and invalid-token handling.
- First live Auth run exposed only a test-fixture issue: Supabase rejects reserved `example.com` recovery recipients. Changed the test to a Greenlit-owned QA address and reran successfully. Email delivery and external providers were not claimed.

### Phase 4: Two-tenant RLS gate

- Replaced the unsafe `.env.local` fallback in `qa-cross-tenant.mjs` with a hard clone-ref gate and process-only credentials.
- Service role is limited to fixture setup/cleanup; all 60 assertions use anon or authenticated clients.
- Passed own/cross-tenant reads, direct-PK and list isolation, forged org insert, update/delete denial, own authenticated write, four tenant bucket upload/download boundaries, service-only table denial, and anon denial.
- Zero QA users, organisations, and contracts remained after cleanup.

### Phases 5-8: Sanity checks and handoff

- Clone has 108 public base tables, 108 with RLS, none without RLS, six private buckets, and four intentional RLS/no-policy tables.
- Tenant buckets `contracts`, `proof-vault`, `claim-evidence`, and `ip-evidence` are organisation-prefixed and passed access tests. `corpus` and `startup-docs` are UUID-prefixed service-only buckets.
- Clone Auth is deliberately not production-equivalent: local Site URL, no redirects, Google/Apple disabled, SMTP unset. Provider delivery/configuration remains manual.
- Created complete change-control evidence, unresolved actions, and an exact production history-repair runbook. Production was not modified.
- Created logical commits `18a6af8` (migration reconstruction/evidence) and `4b0a9e4` (clone application/Auth/RLS gates). No push performed.
