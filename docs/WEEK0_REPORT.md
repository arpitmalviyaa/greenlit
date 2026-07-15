# Week 0 Greenlit Stabilization Report

## Completion pass, 15 July 2026

Week 0 is **incomplete** and public beta is **NO-GO**. Local code/security gates pass and the linked clone is migration-current. Production was not modified because the required fresh completed backup could not be independently verified. The authoritative deduplicated status is `docs/change-control/2026-07-15-week-0-completion/WEEK_0_MASTER_CHECKLIST.md`; exact evidence and remaining actions are in `WEEK_0_FINAL_STATUS.md` and `MANUAL_ACTIONS.md`.

Date: 2026-07-15

Branch: `website-v2-editorial`

Status: Code-complete and pushed; listed dashboard hardening remains manual

## Completed

### Repository safety

- Started from a clean `website-v2-editorial` worktree at `89d8656`, exactly matching `origin/website-v2-editorial`.
- Confirmed the GitHub remote and an authenticated token with `repo` and `workflow` scopes.
- Kept `.env.local`, provider credentials, and local tool state ignored and unstaged.
- Made one commit per logical task and recorded the work in `TASK_JOURNAL.md`.
- Pushed `website-v2-editorial` to GitHub through commit `4440d7f`.

### Password reset investigation

- Exact historical root cause: query-string token links were corrupted by quoted-printable email transport. A token fragment such as `=58` was decoded as a byte, changing the token before verification.
- Exact fix already present: branded Supabase Auth templates use path-based links such as `/auth/confirm/recovery/{{ .TokenHash }}`. `app/auth/confirm/[type]/[token]/route.ts` verifies the path token and routes recovery sessions to `/reset-password`.
- Resend is not called by application code. Supabase Auth is configured to use Resend SMTP at `smtp.resend.com:587` with `noreply@mail.getgreenlit.in`.
- DNS evidence is present: provider MX, SPF through Amazon SES, DKIM at `resend._domainkey.mail.getgreenlit.in`, and root DMARC with `p=quarantine`.
- Production Auth logs contained a successful `/recover` 200, `/verify` 200, password login 200, and logout 204 sequence on 2026-07-15. No SMTP/gomail error was found in the inspected window.
- Conclusion: password reset is currently operational. No password-reset source or dashboard change was required in Week 0.

### Authentication review

- Verified signup, login, logout, token refresh wiring, session-cookie expiry behavior, forgot-password request, recovery OTP verification, password update, post-reset sign-out, and server-side dashboard protection.
- Added `tests/auth-flows.test.mjs` and `npm run test:auth`.
- Automated result: 8 auth lifecycle tests passed plus all executable session-cookie assertions.
- Live Auth configuration: 3600-second access-token lifetime, refresh-token rotation enabled, 10-second reuse interval.

### Security audit

- Added `docs/WEEK0_SECURITY_AUDIT.md`.
- Current result: 0 critical, 0 high, 2 medium, 2 low open findings.
- Fixed raw database/provider messages returned by compliance and admin APIs. Server failures now return opaque error IDs; unknown compliance findings return a fixed 404.
- Verified all six storage buckets are private.
- Verified active API authentication boundaries, platform-admin gates, storage/RLS migration controls, signed Razorpay webhook, security headers, and service-role isolation.
- No real secret was found in the current tracked tree or git-history prefix scan. GitHub secret scanning and push protection are enabled.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run security:audit`: passed, 310 files scanned.

### CI improvements

- Added `.github/workflows/ci.yml` with no deployment step.
- CI performs clean install, high-severity npm audit, lint, type-check, auth tests, backend access-control tests, phase tests, source security audit, smoke tests, build verification, and Gitleaks full-history scanning.
- All actions are pinned to full commit SHAs.
- Added `.github/dependabot.yml` for weekly npm and GitHub Actions updates.
- Enabled GitHub Dependabot vulnerability alerts and automated security updates.
- The first CI run caught cross-platform package-lock drift at `npm ci`; the lockfile was normalized with npm 11.6.2, its two already-required optional WASM peer packages were made explicit, and a clean local install then passed with zero vulnerabilities.
- The second run caught an undeclared `tsx` test-runner assumption after all preceding checks passed. The auth check now uses Node 24's native TypeScript execution for the one small cookie module, with no new runner dependency.

### Smoke tests

- Expanded `npm run smoke` to cover homepage, login, signup, dashboard authentication boundary, compliance endpoint, and health endpoint while preserving the existing core API checks.
- Added optional live HTTP checks through `SMOKE_BASE_URL`.
- Repository smoke run passed.
- Read-only production smoke run against `https://app.getgreenlit.in` passed.

### Validation evidence

- `npm run lint`: passed.
- `npm ci --ignore-scripts`: passed after lockfile normalization, 501 packages installed and 0 vulnerabilities.
- `npm run type-check`: passed.
- `npm run test:backend-audit`: 4/4 passed.
- `npm run test:auth`: 8/8 passed plus session-cookie assertions.
- `npm run test:phases`: 13/13 passed.
- `npm run supabase:audit`: passed.
- `npm run migration:audit`: passed across 49 migrations, no destructive operation found.
- `npm run security:audit`: passed across 310 files.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run smoke`: passed locally and against production in read-only mode.
- `npm run build`: passed on Next.js 16.2.9, 105 pages generated.
- GitHub Actions run `29418110114`: `gitleaks` and `verify` both passed. The verify job completed clean install, audit, lint, type-check, all tests, security scan, smoke tests, and production build in 1 minute 1 second.

## Manual steps remaining

These require Supabase or GitHub dashboard decisions. They were not changed automatically because they can affect live access or authentication policy.

1. Supabase Authentication, Password Security: enable leaked-password protection.
2. Supabase Authentication, Password Security: raise the server-side minimum password length from 6 to at least 8.
3. Require MFA for every `platform_admin` account.
4. Inventory all direct PostgreSQL users first. Then enable Supabase database SSL enforcement.
5. After confirming admin, backup, migration, and worker egress, replace database CIDRs `0.0.0.0/0` and `::/0` with the real allowlist. Keep a rollback path to avoid operator lockout.
6. After this branch is pushed and CI appears, protect `main` and require the `verify` and `gitleaks` checks before merge.

No Resend dashboard change is currently required. If delivery regresses, check Supabase Auth logs for SMTP/gomail errors first, then confirm the existing Resend DNS records and domain status before changing code.

## Risks

### Medium

- Leaked-password protection is disabled. A reused breached password can become an account-takeover path.
- Direct PostgreSQL ingress permits all IPv4/IPv6 sources and database TLS is not enforced. Credentials are still required, but a credential leak has a larger blast radius.

### Low

- Supabase Auth accepts six-character passwords when the UI promises eight.
- Platform-admin corpus URL ingestion can fetch private, loopback, or link-local targets and follows redirects. Current practical impact is limited by the admin gate and standard Vercel isolation.

### Operational

- `main` is not branch-protected yet.
- The new GitHub Actions workflow must complete once after push before it can be treated as a reliable required check.
- GitHub warns that the pinned checkout/setup/Gitleaks action versions still target the deprecated Node 20 action runtime and are currently forced onto Node 24. The jobs pass, but update the pinned actions when their maintainers publish Node 24-native releases.
- The repository's static audits verify migration intent. Continue comparing Supabase live advisors after future schema changes.

## Recommendations

1. Make the two Auth dashboard changes first. They are low-effort and reduce the clearest account-takeover risk.
2. Plan database TLS and network restriction as an operations change with a connection inventory and rollback, not as an ad hoc toggle.
3. Add an explicit hostname allowlist to admin corpus URL ingestion before Greenlit gains private-network connectivity.
4. Keep CI non-deploying during validation. Require it on pull requests after the first successful run.
5. Run one controlled end-to-end authentication validation using a dedicated test account after Auth password policies change.

## Next actions

1. Apply the six manual dashboard/security steps above.
2. Re-run `npm run test:auth`, `SMOKE_BASE_URL=https://app.getgreenlit.in npm run smoke`, and inspect Supabase Auth/security logs after those policy changes.
3. Begin the stable validation period. Collect failures; do not add features or redesign UI during this phase.

Week 0 stops here. Month 1 work has not started.
