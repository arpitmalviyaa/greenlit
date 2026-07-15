# Greenlit Supabase Manual Actions

## Week 0 completion delta

- Apple is now hidden unless `NEXT_PUBLIC_APPLE_AUTH_ENABLED=true`; do not set it until Apple is fully configured and tested.
- Turnstile code is wired for signup, login, and recovery. Create a Cloudflare Turnstile site for `app.getgreenlit.in`, add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to Vercel Production (and only isolated Preview if desired), then open Supabase -> Authentication -> Bot and Abuse Protection -> CAPTCHA, choose Cloudflare Turnstile, enter the secret, enable it, redeploy, and verify valid/missing/invalid tokens.
- Marketing consent is optional and off by default after verification. The migration is on the clone only and must go through the production release gate.
- Corpus URL ingestion now requires `GREENLIT_CORPUS_URL_HOSTS` as a comma-separated exact hostname allowlist and rejects redirects. Leave unset to disable URL ingestion.
- Public analytics now rejects bodies over 2 KiB, more than eight metadata keys, invalid key/value shapes, and more than 30 requests/minute per observed forwarded address. The limiter is process-local readiness, not a global distributed quota.
- Production history repair is still blocked. First open Supabase -> production project -> Database -> Backups and verify a backup created within the approved window shows **Completed**. Record its identifier privately, record the window and rollback owner, then follow the runbook exactly.

Perform these in order. **Never run a real production migration push for the history reconciliation.** Never paste keys into issues, chat, screenshots, or commits.

## 1. Execute the proven production history repair — blocking

Clone reconciliation and all validation gates are complete. Use [the production runbook](docs/change-control/2026-07-15-supabase-reconciliation/production-runbook.md) for the exact commands and stop conditions.

1. Obtain explicit production authorization and a maintenance window.
2. Confirm a fresh completed production backup.
3. Link only to `ovjqzgzqcyowitjfwptz` and verify the ref before every command.
4. Run the exact history-repair pairs from the runbook, verifying the migration list after each pair.
5. Run `supabase db push --dry-run`; require `Remote database is up to date.`
6. If the dry run proposes any SQL, stop. Do not run a real push.
7. Run production smoke/Auth/RLS checks and save sanitized evidence.

Production was not modified during clone validation.

## 2. Enforce database transport and network controls — blocking

1. Dashboard -> **Project Settings -> Database** -> **Connection string**.
2. Inventory Vercel Production variables: `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, and `POSTGRES_PRISMA_URL`. Confirm every URL uses `sslmode=require` or stricter.
3. Prefer the Supavisor transaction/session pooler for application traffic. Keep direct Postgres only for controlled administration and migration jobs.
4. Dashboard -> **Project Settings -> Database -> SSL Enforcement** -> enable enforcement.
5. Redeploy no code; run health, login, and one read/write test. If any client fails TLS, stop and fix that client before continuing.
6. Dashboard -> **Project Settings -> Database -> Network Restrictions**.
7. Remove `0.0.0.0/0` and `::/0`. Add only fixed administration/CI egress CIDRs. Do not add Vercel dynamic addresses unless the account has fixed egress.
8. Re-run health, migration connectivity, and the app read/write tests.

## 3. Strengthen password and session policy — blocking

1. Dashboard -> **Authentication -> Configuration -> Password Security**.
2. Set minimum password length to **8**. This aligns Supabase with signup/reset UI validation.
3. Enable **Leaked password protection**. This requires Pro or above.
4. Leave required-character rules unchanged until Product approves the user-facing requirement; do not silently introduce a stronger rule than the UI explains.
5. Dashboard -> **Authentication -> Sessions**.
6. Obtain written approval for maximum lifetime, inactivity timeout, and single-session behavior. A defensible beta starting point is 7-day maximum and 24-hour inactivity, but this is a recommendation, not an assumed requirement.
7. Apply the approved values and run login, refresh, logout, recovery, and multi-device tests.

## 4. Remove unsafe redirect wildcards

1. Dashboard -> **Authentication -> URL Configuration**.
2. Keep Site URL `https://app.getgreenlit.in`.
3. Keep exact production redirects required by the app, including `https://app.getgreenlit.in/auth/callback` and the path-token confirmation routes.
4. Remove broad `greenlit-*-anal-s-projects.vercel.app/**` and `greenlit-*-arpitclaw-5770-anal-s-projects.vercel.app/**` entries from production.
5. Create/link a separate Supabase project for Vercel Preview if preview auth is required. Never give preview the production service-role key.
6. Test Google login, email confirmation, and recovery from production.

## 5. Complete Google and Apple authentication — Apple is blocking

### Google

1. Google Cloud Console -> **APIs & Services -> Credentials** -> open the Greenlit OAuth 2.0 client.
2. Under **Authorized redirect URIs**, confirm exactly `https://ovjqzgzqcyowitjfwptz.supabase.co/auth/v1/callback`.
3. Confirm OAuth consent-screen publication, support email, privacy policy, terms URL, and production domains.
4. Supabase Dashboard -> **Authentication -> Sign In / Providers -> Google** -> confirm enabled.
5. Test new-user consent and returning-user login in a private browser.

### Apple

1. Apple Developer -> **Certificates, Identifiers & Profiles -> Identifiers** -> create/confirm the Greenlit Services ID.
2. Configure **Sign in with Apple** with domain `ovjqzgzqcyowitjfwptz.supabase.co` and return URL `https://ovjqzgzqcyowitjfwptz.supabase.co/auth/v1/callback`.
3. Create a Sign in with Apple key, record Team ID and Key ID, and download the private key once into the approved secrets manager.
4. Supabase Dashboard -> **Authentication -> Sign In / Providers -> Apple**.
5. Enter Services ID/client ID and generated secret, then enable Apple.
6. Test first login, repeat login, hidden-email relay, logout, and account linking.

If Apple credentials cannot be obtained before beta, stop and request authorization for the separate application change that hides the Apple button. Do not leave a visible dead provider.

## 6. Finalize Auth email and Resend

### Root cause

The historical reset failure was token mutation caused by quoted-printable decoding of `=` sequences inside query-string confirmation links. The current recovery and signup templates avoid the query entirely by placing `TokenHash` in the path. Current reset delivery/verification has succeeded; there is no evidence of a current Resend SMTP failure.

### Required DNS changes

None for the current sender. SPF, DKIM, DMARC, and the provider MX are published. Do not add a second SPF record. If Resend displays a different required record, compare it exactly before changing DNS.

### Required Resend changes/checks

1. Resend Dashboard -> **Domains** -> open `mail.getgreenlit.in`.
2. Confirm status **Verified** for SPF and DKIM.
3. Resend Dashboard -> **Emails/Logs** -> filter sender `noreply@mail.getgreenlit.in` and inspect the latest confirmation/recovery delivery.
4. Confirm no bounce/suppression applies to the test recipient.
5. Record the delivery ID in the private change ticket, not in the repository.

### Required Supabase changes/checks

1. Dashboard -> **Authentication -> Email Templates**.
2. Keep confirmation link `{{ .SiteURL }}/auth/confirm/signup/{{ .TokenHash }}`.
3. Keep recovery link `{{ .SiteURL }}/auth/confirm/recovery/{{ .TokenHash }}`.
4. Change invitation link to `{{ .SiteURL }}/auth/confirm/invite/{{ .TokenHash }}` before sending invitations.
5. Dashboard -> **Project Settings -> Auth -> SMTP Settings**: confirm host `smtp.resend.com`, port `587`, sender `noreply@mail.getgreenlit.in`, sender name `Greenlit`. Do not reveal or re-copy the password unless rotating it.
6. Send one invite, one confirmation, and one reset to a controlled test account. Verify each link exactly once and confirm expired/reused tokens fail safely.

## 7. Configure bot protection and review rates

1. Cloudflare Dashboard -> **Turnstile** -> create a widget for `app.getgreenlit.in`; store the secret in the approved secrets manager.
2. Supabase Dashboard -> **Authentication -> Bot and Abuse Protection** -> enable CAPTCHA and select Cloudflare Turnstile.
3. Wire the public site key/token into signup, login, and password recovery in a separately authorized application task. This audit does not modify features.
4. Dashboard -> **Authentication -> Rate Limits**.
5. Review the current email limit (60/hour), verify limit (30), refresh limit (150), and anonymous limit (30) against expected beta traffic.
6. Do not lower rates without testing onboarding/recovery bursts. Add alerts for sustained 429s.

## 8. Add Storage guardrails and backups — blocking

1. Dashboard -> **Storage** -> open each bucket -> **Configuration**.
2. Keep every bucket private.
3. Set a platform file-size limit no higher than the largest legitimate application limit: `contracts` 15 MB, `proof-vault` 25 MB, `corpus` 15 MB, `startup-docs` 15 MB. Determine the correct limits for `claim-evidence` and `ip-evidence` from product requirements before changing them.
4. Add MIME allow-lists only after enumerating accepted formats; do not guess. At minimum validate PDF/DOCX/image signatures server-side because MIME headers are user-controlled.
5. Confirm organisation ID is always the first path segment for the four tenant buckets.
6. Create an object-export job to encrypted storage in a separate provider/account. Include object path, bucket, checksum, version, and export timestamp.
7. Restore one object from each bucket into a non-production project and compare checksums.
8. Record recovery time and retention. Database backup success alone is not sufficient.

## 9. Backups, PITR, and restore drill

1. Dashboard -> **Database -> Backups**. Confirm the seven daily backups remain completed.
2. Decide whether a 24-hour RPO is acceptable. If not, open **Point in Time** and enable PITR after approving the compute/add-on cost and retention period.
3. Restore to a separate project, never production.
4. Validate table counts, RLS enablement, a representative tenant read/write, Auth profile consistency, and application startup.
5. Recreate/reset custom role credentials if required after restore.
6. Validate Storage objects separately; Supabase database backups restore metadata, not deleted object bytes.

## 10. Monitoring and advisors

1. Dashboard -> **Advisors -> Security**. Resolve leaked-password protection; document the four intentional RLS-with-no-policy tables.
2. Dashboard -> **Advisors -> Performance**. Export the current 355 findings.
3. First staged optimization: fix 92 RLS init-plan warnings and reduce high-frequency `agent_tasks`/`agent_events` polling. Do not add all 180 suggested FK indexes or drop all 58 unused indexes blindly.
4. Dashboard -> **Logs -> Logs Explorer**. Save queries/alerts for Auth 4xx/5xx, Postgres errors, Storage authorization failures, and API 5xx.
5. Dashboard -> **Project Settings -> Log Drains**. Select S3, OTLP, Datadog, Loki, or Sentry; configure retention according to the legal/security policy.
6. Confirm alerts reach at least two responders and run a test alert.

## 11. Final verification

1. Run `npm audit --audit-level=high`, lint, type-check, auth tests, backend access-control tests, smoke tests, and build.
2. Run Supabase Security and Performance Advisors again.
3. Run a two-tenant RLS regression suite using anon/authenticated clients; never use the service role for this test.
4. Confirm `supabase migration list --linked` has no divergence.
5. Confirm SSL enforcement on and unrestricted CIDRs absent.
6. Confirm one successful Google login, Apple login, signup confirmation, reset, invite, refresh, logout, signed Storage download, and backup restore.
7. Only then change the readiness decision from NO-GO to GO.
