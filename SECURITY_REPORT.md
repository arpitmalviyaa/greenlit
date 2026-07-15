# Greenlit Supabase Security Report

Audit date: 15 July 2026

Project: `ovjqzgzqcyowitjfwptz` (`ap-southeast-2`)

Scope: repository, linked production project, Auth, database, Storage, Edge Functions, environment configuration, CI/CD, RLS, migrations, backups, and advisors.

## Executive result

**Production readiness: NO-GO until the blocking items below are resolved.** No live setting or migration was changed during this audit. The linked project has migration-history divergence, so applying local migrations or making database hardening changes before reconciliation could replay already-applied DDL or create an unrecoverable state.

| Severity | Finding | Evidence | Required action |
|---|---|---|---|
| Critical | Local and remote migration histories diverge | `supabase migration list --linked` shows remote-only and local-only versions for changes with overlapping names | Reconcile history in a staging clone, review SQL equivalence, then use `supabase migration repair`; do not run `db push` now |
| High | Database SSL enforcement is disabled | Live CLI returned `database: false` | Inventory every direct connection, update each to require TLS, then enable enforcement |
| High | Direct database access is open to the internet | Live restrictions are `0.0.0.0/0` and `::/0` | Move runtime access to the pooler and restrict direct DB CIDRs to controlled administration/CI egress |
| High | Apple sign-in is offered by the UI but unavailable | Apple provider is disabled and has no client ID or secret; `SocialAuth` renders Apple | Configure Apple completely before beta, or separately authorize removal of the button |
| High | No recoverable backup of Storage objects was verified | Supabase daily database backups cover Storage metadata, not object bytes | Establish and test an object-level backup/export procedure for all six buckets |
| Medium | Password policy is weaker than the UI contract | Live minimum is 6, no character requirements, leaked-password protection off; UI requires 8 | Set minimum 8 and enable leaked-password protection; decide character policy after UX approval |
| Medium | Auth sessions have no server-side maximum or inactivity timeout | `sessions_timebox=0`, `sessions_inactivity_timeout=0`, multiple sessions allowed | Approve and configure a session policy; app session cookies alone do not expire refresh-token sessions |
| Medium | Production redirect allow-list contains broad Vercel wildcards | Multiple `https://greenlit-*-.../**` entries | Keep exact production callback URLs; isolate preview URLs to a non-production Supabase project |
| Medium | Invitation email still uses a query-string confirmation URL | Invite template uses `{{ .ConfirmationURL }}` while recovery/confirmation use path tokens | Replace invite template with the path-token route before using Auth invitations |
| Medium | CAPTCHA is not configured | Live CAPTCHA setting is unset | Add Cloudflare Turnstile to signup, login, and recovery before public beta |
| Medium | Storage buckets have no platform-level size or MIME restrictions | All six buckets have `file_size_limit=null`, `allowed_mime_types=null` | Add bucket limits after confirming the accepted formats listed in `MANUAL_ACTIONS.md` |
| Medium | PITR is disabled | Backup API returned `pitr_enabled: false` | Accept a 24-hour RPO or enable and test PITR |
| Low | Preview deployment server secrets are absent | Vercel Preview has only the two public Supabase variables | Either treat preview as build-only or provision a separate preview backend; never copy production service credentials |

## Authentication

### Verified live state

- Email signup is enabled and email confirmation is required (`mailer_autoconfirm=false`).
- Anonymous sign-ins are disabled.
- Google is enabled and both client ID and secret are present. The external Google Console callback registration cannot be proven from Supabase and requires the manual check documented separately.
- Apple is disabled and no Apple credentials are present.
- Every other inspected social provider is disabled.
- Site URL is exactly `https://app.getgreenlit.in`.
- Access-token lifetime is 3,600 seconds.
- Refresh-token rotation is enabled with a 10-second reuse interval.
- The server refreshes sessions through `proxy.ts` and `lib/supabase/middleware.ts`; auth cookies are deliberately browser-session cookies.
- The app implements signup, login, logout, recovery, password update, and path-token confirmation. The Auth contract suite covers these source paths.

### Password-reset finding

**Current result:** password reset is not currently failing in the inspected production path. The earlier failure was conclusively traced to quoted-printable transport corrupting query-string token links. A sequence such as `=58` in the query was decoded as a quoted-printable byte, changing the token before verification. Commit history and the current template show the fix: recovery and confirmation now place `{{ .TokenHash }}` in the URL path and verify it with `verifyOtp`.

**Current mail path:** Supabase Auth -> custom SMTP -> `smtp.resend.com:587` -> `noreply@mail.getgreenlit.in`. SMTP username and password are configured; values were not printed. The previously inspected production sequence returned success for `/recover`, `/verify`, password login, and logout, with no SMTP/Gomail error.

**DNS state:** no DNS change is required for the current sender based on public records.

- MX: `send.mail.getgreenlit.in` -> Amazon SES feedback SMTP.
- SPF: `send.mail.getgreenlit.in` -> provider include -> `include:amazonses.com`.
- DKIM: `resend._domainkey.mail.getgreenlit.in` is published.
- DMARC: `_dmarc.getgreenlit.in` is `p=quarantine` with relaxed SPF/DKIM alignment.

**Remaining email risk:** the invitation template still uses `{{ .ConfirmationURL }}`, which is query-string based and has not received the path-token hardening. Do not use Supabase invitations until that template is changed and tested. Resend dashboard delivery/domain status is external to the repository and must be checked manually.

## Database and RLS

### Inventory

- 108 application tables in `public`; all 108 have RLS enabled.
- 8 Supabase-managed tables in `storage`; all 8 have RLS enabled.
- 219 policies across `public` and `storage`.
- 227 foreign keys: 118 `CASCADE`, 91 `NO ACTION`, 18 `SET NULL`.
- Every public table has a primary key.
- 207 public indexes.
- 12 public functions. Five are `SECURITY DEFINER`; all five deny execution to `anon` and `authenticated`, and all have a fixed `search_path`.
- Six invoker functions are executable by API roles. They are RLS helper/update functions, not definer privilege escalations.

### RLS disposition for every table

The following four tables intentionally deny all client access because RLS is enabled with no policy. They are accessed only with the server-side service role: `analytics_events`, `compliance_findings`, `finding_feedback`, and `scope_items`. Supabase reports these as informational lints, not data exposure.

The remaining 104 public tables have at least one policy and were inspected for tenant/user predicates:

`activity`, `adversary_analyses`, `agent_events`, `agent_tasks`, `ai_workflow_scans`, `analysis_corpus_refs`, `approval_requests`, `approvals`, `audit_logs`, `background_jobs`, `billing_events`, `brands`, `campaigns`, `chat_messages`, `chats`, `claim_audit_log`, `claim_evidence`, `claims`, `clause_library`, `compatibility_runs`, `complaint_simulations`, `content_advanced_scans`, `content_scans`, `contract_clauses`, `contract_comments`, `contract_exports`, `contract_reviews`, `contract_revisions`, `contract_versions`, `contracts`, `corpus_chunks`, `corpus_documents`, `creator_clause_preferences`, `creators`, `crisis_rooms`, `cross_reference_queries`, `deal_messages`, `deal_rooms`, `delivery_locks`, `document_edits`, `document_versions`, `documents`, `early_access`, `email_draft_replies`, `email_messages`, `email_threads`, `evidence_timeline`, `evidence_vault`, `exclusivity_alerts`, `exclusivity_records`, `golden_documents`, `greenlit_scans`, `greenlit_users`, `hidden_workflows`, `infringement_records`, `invitations`, `invoices`, `ip_records`, `jurisdiction_corpus`, `legal_notices`, `liability_maps`, `meeting_transcripts`, `nda_scans`, `negotiation_memory`, `negotiation_messages`, `notifications`, `organisation_jurisdictions`, `organisation_subscriptions`, `organisations`, `platform_admins`, `playbook_entries`, `profiles`, `project_subfolders`, `projects`, `proof_vault_entries`, `review_metrics`, `rights_valuations`, `safety_passports`, `scan_trials`, `scope_alerts`, `scope_change_requests`, `search_index`, `send_scans`, `sow_deliverables`, `sow_payment_milestones`, `sow_templates`, `sows`, `startup_documents`, `startup_matters`, `startup_memos`, `subscription_plans`, `tabular_cells`, `tabular_review_chat_messages`, `tabular_review_chats`, `tabular_reviews`, `takedown_notices`, `term_sheets`, `timeline`, `user_profiles`, `vendor_contracts`, `whitelisting_requests`, `workflow_shares`, `workflows`, and `workspace_assignments`.

No unrestricted `USING (true)` client data policy was found. Explicit deny policies protect `agent_events`, `agent_tasks`, corpus tables, and `analysis_corpus_refs`. The public trial/event surfaces are constrained by input validation and do not grant general table reads.

### Advisor findings

The live Performance Advisor reports 355 recommendations. They are optimization findings, not evidence of current unauthorized access:

| Finding | Count | Disposition |
|---|---:|---|
| Unindexed foreign keys | 180 | Add only after query/cascade workload review; do not create 180 indexes blindly |
| RLS auth-function init plans | 92 | Replace per-row `auth.*()` calls with scalar subselects in a tested, non-breaking migration |
| Unused indexes | 58 | Observe through a representative beta period before removal |
| Multiple permissive policies | 24 | Consolidate equivalent policies after tenant regression tests |
| Auth DB pool configured as an absolute count | 1 | Change to percentage after connection-budget review |

No long-running query was active. Bloat was negligible (largest reported waste 16 kB). The largest table is `corpus_chunks` at about 13,719 rows / 12 MB. `agent_tasks` has only 19 estimated rows but approximately 208,506 sequential scans; this is polling traffic, not a missing-index emergency at the current size. Query statistics also show roughly 4,500 repeated task/event polling calls. Optimize polling frequency before adding speculative indexes.

### Migration blocker

The repository and production contain the same logical changes under different version identifiers, plus versions present on only one side. Examples:

- Local-only numbered migrations: `034_tighten_profile_insert_policies.sql`, `035_corpus.sql`.
- Remote equivalents: `20260706010634_tighten_profile_insert_policies`, `20260709022406_corpus`.
- Local timestamped changes from `20260707000000` through `20260713000000` have different remote timestamps such as `20260707042112` through `20260713034401`.
- Remote has `20260706054555_analytics_events`; no same-version file exists locally.

This is a deployment blocker even where SQL is equivalent. A normal `supabase db push` would interpret local versions as pending. Reconciliation must compare the stored remote statement for each version against the local SQL before marking versions applied/reverted.

## Storage

All buckets are private: `claim-evidence`, `contracts`, `corpus`, `ip-evidence`, `proof-vault`, and `startup-docs`.

- `claim-evidence`, `contracts`, `ip-evidence`, and `proof-vault` have organisation-folder policies for authenticated read/write and delete. `contracts` also has an update policy.
- `corpus` and `startup-docs` have no client object policy and are service-role only.
- User-facing downloads use signed URLs (10 minutes or 1 hour depending on route); no `getPublicUrl` use was found.
- No bucket has a file-size or MIME allow-list. Application routes cap relevant uploads at 10, 15, or 25 MB, but platform limits are still required as defense in depth.
- Database backups do not back up Storage object bytes. No independent object backup was found.

## API, secrets, and Edge Functions

- No deployed Supabase Edge Function exists; the linked project returned an empty function list. Therefore there is no Edge Function CORS or `verify_jwt` setting to harden.
- The browser receives only the public Supabase URL and anon/publishable key. These values are expected to be public and remain constrained by RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is loaded only by server modules. No `NEXT_PUBLIC_` service key or tracked credential was found.
- Service-role use is broad but occurs behind server API authorization. Admin corpus/startup routes call `requireAdmin`; user routes first resolve the authenticated user/organisation. The intentional public analytics endpoint can only insert one of five allow-listed event names.
- Vercel Production contains server-side database and Supabase credentials as encrypted variables. Preview contains only public Supabase variables, so server-backed preview flows are not production-equivalent.
- Git history and source secret scanning are enforced by Gitleaks. CI has no production secret and no deploy step.
- The admin URL-ingestion route follows arbitrary HTTP(S) redirects and remains an admin-only SSRF primitive. It should receive DNS/IP validation and redirect revalidation in a separately authorized application-security task.

## Backups and monitoring

- Seven consecutive completed physical daily backups were present, dated 8-14 July 2026. This verifies a seven-day daily-backup retention window.
- PITR is disabled. Current worst-case database recovery point is approximately 24 hours.
- A restore was not executed against production. Restore capability is available in Dashboard -> Database -> Backups, but must be proven by restoring a backup into a separate project and running integrity checks.
- Storage object bytes require a separate backup.
- Security Advisor is operational (5 findings: 1 warning, 4 informational). Performance Advisor is operational (355 recommendations).
- No log drain or external retention destination was verified. Configure one if retention/compliance requires more than the dashboard plan provides.

## CI/CD

The GitHub workflow is non-deploying and runs clean install, `npm audit --audit-level=high`, lint, type-check, auth tests, backend access-control tests, phase tests, source security audit, smoke tests, build verification, and full-history Gitleaks. Dependabot covers npm and GitHub Actions weekly. Action references are pinned to commit SHAs.

## Audit limitation

This was a defensive, point-in-time audit of the repository and linked project. It reduces uncertainty but is not a guarantee of security. External Apple/Google/Resend dashboards, organization billing entitlements, log-retention policy, and an isolated restore test require account-owner action. No secret value is included in this report.
