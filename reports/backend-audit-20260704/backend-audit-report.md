# Greenlit Backend Production Audit

Generated: 2026-07-04 17:50 IST

## Verdict

BACKEND READY WITH NON-BLOCKING GAPS. Frontend redevelopment may begin. The backend supports the critical authenticated contract workflow, comments, final-check start, proof upload, billing status fallback, health/readiness, and same-organisation isolation checks exercised in production.

## Production Evidence

- Production URL: https://app.getgreenlit.in
- Previous deployment: `dpl_7epTUi4618UEMKoUyxm9wwUVdGWh`
- Fixed deployment: `dpl_CxpQ6z4Aq7keRkWbMSNukRfta9zr`
- Fixed commit: `a39402d60b1604c750807422aedf19e0e9941778`
- `/api/health`: HTTP 200 after deploy with request ID and security headers.
- `/api/ready`: HTTP 200 after deploy with request ID and security headers.
- Authenticated production harness: `/tmp/greenlit-authenticated-production-audit-20260704113824568.json`.
- Cross-workspace proof isolation probe: `/tmp/greenlit-proof-isolation-20260704114236014.json`.

## Product Flows Verified

- Login: pass.
- Agency onboarding: pass.
- Agency dashboard: pass.
- Contract DOCX upload and AI analyse: pass.
- Workspace contract comments API: pass.
- Final-check start API: pass, HTTP 200.
- Proof upload API: pass, HTTP 200.
- Approvals/proof UI disabled state: pass.
- Billing status for no subscription: pass.

## Defects Found And Fixed

- `GL-BE-001`: `app/api/proof/upload/route.ts` did not validate same-organisation ownership for `contract_id`, `sow_id`, or `approval_request_id` before storage/service-role writes. Fixed, tested, committed, deployed.

## Console And Network

- Console errors: 0.
- Network errors: 52 `net::ERR_ABORTED` entries from automation navigation/prefetch churn. No unexplained live HTTP 4xx/5xx remained in harness summary.

## Non-Blocking Gaps

- Queue/worker execution is partial: job rows and queue logic exist, no deployed worker/cron consumer found.
- Email ingest is authenticated/manual rather than a signed inbound provider webhook.
- Billing checkout/charge path was not exercised against real production billing because no verified test-mode billing was used.
- Some backend-ready flows lack obvious current frontend controls. Claude rebuild should add first-class UI for comments, final-check start, and contract-scoped proof upload.

## Test Data Cleanup

- Focused proof-isolation probe cleaned both temporary users, both orgs, and the foreign contract.
- Authenticated harness cleanup removed one `contracts` storage object and one `proof-vault` storage object, then deleted scoped temp-org rows and the auth user. One direct profile delete hit an audit-log FK during cleanup, but auth user presence was verified false afterward.

## Commands Run

`npm run type-check`, `npm run lint`, `npm run build`, `npm run supabase:audit`, `npm run security:audit`, `npm run test:phases`, `npm run test:backend-audit`, `git diff --check`, `vercel inspect`, `vercel deploy --prod --yes`, `curl /api/health`, `curl /api/ready`, authenticated Playwright/Supabase production harnesses.