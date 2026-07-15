# Week 0 Security Audit

Date: 2026-07-15  
Branch: `website-v2-editorial`  
Scope: tracked source, git history, dependencies, active API routes, Supabase Auth/database/storage configuration, GitHub repository security settings, and CI supply chain.

## Result

No critical or high-severity vulnerability was verified. Four open findings remain: two medium and two low. One low-severity information-disclosure issue found during the audit was fixed before this report was finalized.

## Architecture and attack surface

Greenlit is a Next.js 16 application on Vercel. Supabase provides password authentication, PostgreSQL, row-level access policies, and private object storage. Server routes call Anthropic for legal analysis, Razorpay for billing, and a VPS checker for selected document checks. Supabase Auth sends transactional email through Resend SMTP.

- Active API route files: 79
- Explicit public API surfaces: health, readiness, auth callback, billing plans, signed billing webhook, public analytics event, and public live check
- Elevated admin surfaces: corpus and startup review APIs guarded by `platform_admins`, plus master APIs with the same platform-admin check
- Upload surfaces: contract upload, final-check upload, proof upload, corpus ingestion, and startup-document ingestion
- Storage buckets: 6, all private
- Webhook receivers: 1, Razorpay HMAC signature verified with constant-time comparison
- WebSocket handlers: 0
- Infrastructure as code/container manifests: 0
- Deployment targets: Vercel and Supabase

## Findings

### 1. Leaked-password protection is disabled

- Severity: Medium
- Confidence: 10/10
- Status: Verified from the live Supabase security advisor
- Category: Authentication

Exploit path: an attacker obtains a Greenlit user's previously breached or reused password, submits it to the normal password-login endpoint, and receives the user's organisation-scoped session. Email confirmation does not protect an existing account from credential stuffing. No mandatory MFA control was found.

Fix: in Supabase Dashboard, open Authentication, Password Security and enable leaked-password protection. Require MFA for platform admins. Monitor failed logins and review Supabase Auth rate limits after enabling the control.

Dashboard change required: yes. No source file change is required.

### 2. Direct database access permits all source IPs and does not enforce TLS

- Severity: Medium
- Confidence: 10/10
- Status: Verified through the live Supabase management configuration
- Category: Infrastructure

Exploit path: if a PostgreSQL credential is exposed, an attacker can connect from any IPv4 or IPv6 host. Because database TLS enforcement is off, a direct client that allows plaintext can also expose credentials, queries, or results to an on-path attacker. This does not bypass database authentication by itself, and the current app uses Supabase HTTPS rather than a direct PostgreSQL client.

Fix: first inventory backup, admin, migration, and external worker connections. Then enable database SSL enforcement and require certificate/hostname verification in every direct client. Restrict IPv4 and IPv6 database CIDRs to the actual admin/worker egress ranges or a VPN. Rotate the database password after the network change.

Dashboard change required: yes. Confirm operational egress before changing allowlists to avoid locking out legitimate database tools.

### 3. Supabase accepts six-character passwords while the UI requires eight

- Severity: Low
- Confidence: 10/10
- Status: Verified from live Auth configuration and application source
- Category: Authentication
- Files: `app/(auth)/signup/page.tsx`, `app/(auth)/reset-password/page.tsx`

Exploit path: a user or script calls the public Supabase Auth API directly and creates or updates an account with a six- or seven-character password, bypassing the browser's client-side eight-character check. This weakens that account but does not grant cross-user access.

Fix: set the Supabase Auth server-side minimum to at least eight, keep the UI in sync, and add a live validation that seven characters are rejected and eight are accepted.

Dashboard change required: yes. No source change is required unless a stronger minimum than eight is chosen.

### 4. Admin corpus URL ingestion can fetch private or link-local addresses

- Severity: Low
- Confidence: 9/10 that the server-side request primitive exists, 7/10 on practical impact in the current Vercel deployment
- Status: Verified by independent code tracing
- Category: Server-side request forgery
- File: `app/api/admin/corpus/route.ts`

Exploit path: a compromised platform-admin session submits a loopback, private-network, or link-local HTTP URL. The server follows redirects, reads the response, stores readable text as corpus chunks, and exposes the chunks to that admin. Ordinary users cannot reach this route, and no sensitive private network target was verified in the current standard Vercel runtime.

Fix: prefer an explicit hostname allowlist. Otherwise resolve and reject loopback, private, link-local, carrier-grade NAT, multicast, reserved, IPv6 local, and IPv4-mapped IPv6 addresses. Disable automatic redirects and validate every redirect hop. Use a real streaming byte cap because `res.text().slice(...)` buffers the full response first.

Dashboard change required: no. Source change required: `app/api/admin/corpus/route.ts` and one focused URL-policy test.

## Resolved during Week 0

Authenticated compliance feedback returned raw database error messages, including PostgreSQL type or constraint names. The affected path now returns a fixed 404 for unknown findings and an opaque error ID for server failures. Admin-only routes were changed to use the same opaque internal-error response. Verification: `npm run security:audit` passes across 310 scanned files.

Files changed:

- `app/api/compliance/feedback/route.ts`
- `app/api/admin/corpus/route.ts`
- `app/api/admin/corpus/[id]/route.ts`
- `app/api/admin/corpus/chunk/[id]/route.ts`
- `app/api/admin/startup/route.ts`
- `app/api/admin/startup/[id]/route.ts`

## Controls verified

- No live credential pattern was found in the current tracked tree or git-history prefix scan. The only history matches were the scanner's own patterns.
- `.env.local` is ignored and was never staged. Tracked environment files contain placeholders only.
- `npm audit --audit-level=high` reports zero vulnerabilities.
- GitHub secret scanning and push protection are enabled.
- All six Supabase storage buckets are private.
- RLS is enabled on tenant and service-only application tables. Supabase's four no-policy notices are deny-by-default service-role tables, not public exposure.
- Active API routes either authenticate directly, call the shared workspace guard, use the platform-admin guard, or are on the explicit public list.
- The Razorpay webhook fails closed when its secret is absent and verifies signatures with a timing-safe comparison.
- Browser sessions auto-refresh tokens. Service-role clients neither persist nor refresh sessions.
- Supabase rotates refresh tokens, uses a 3600-second access-token lifetime, and permits a 10-second refresh-token reuse interval.
- Security headers include content type protection, frame denial, referrer policy, permissions policy, and a content security policy.

## Risks and recommendations

1. Enable leaked-password protection now.
2. Align the server-side password minimum with the UI.
3. Schedule the database TLS/allowlist change with an explicit rollback path.
4. Fix the admin URL fetch before connecting Vercel to a private network or adding internal HTTP services.
5. Protect `main` with required CI checks after this branch is merged.
6. Keep Gitleaks, Dependabot, npm audit, tests, and build verification as required pull-request checks.

## Data classification

- Restricted: passwords and refresh tokens managed by Supabase Auth; uploaded contracts, evidence, and legal documents stored in private Supabase buckets; user identity and organisation membership in PostgreSQL.
- Confidential: Supabase service-role key, Anthropic key, Razorpay secrets, Resend SMTP credential, legal analysis, corpus material, and billing records.
- Internal: request/error IDs, operational logs, feature flags, and configuration metadata.
- Public: marketing pages, pricing copy, public clearance certificates, and documented health status.

## Audit limitation

This is an AI-assisted source and configuration review, not a substitute for a professional penetration test. It does not guarantee that all vulnerabilities were found. Production systems handling personal data and legal documents should receive periodic independent testing.
