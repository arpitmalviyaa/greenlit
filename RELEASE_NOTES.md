# Release Notes — v1 Restructure (6 July 2026)

Branch `phase0-stabilize` (off `greenlit-postlive-client-env`), deployed to
production (app.getgreenlit.in) via Vercel. `main` not touched — merge the PR
when ready; production already runs this branch's deployment.

## What changed

### Phase 0 — Stabilize
- **Confirmation emails fixed end-to-end.** Root cause was twofold:
  1. No custom SMTP (`smtp_host: null`) — Supabase's built-in mailer only
     delivers to team members, 2/hour. Now on **Resend SMTP**
     (smtp.resend.com:587, sender `noreply@mail.getgreenlit.in`), rate limit
     raised to 60/hour.
  2. Confirmation links were corrupted in transit: emails travel as
     quoted-printable with an unescaped `=`, so `token_hash=58…` decoded as
     the QP byte `=58` → `X`, breaking the token deterministically. Links are
     now **path-based** (`/auth/confirm/signup/<token_hash>`) — no `=` to
     corrupt. Verified live: signup → inbox → click → confirmed → onboarding.
- **Resend-confirmation flow** on the signup verify step and on
  "Email not confirmed" login errors. Confirmation is never bypassed.
- **Red Flag Scanner fixed.** `max_tokens: 600` truncated the JSON flag list →
  "Failed to parse AI response". Now on the canonical AI output standard.
- **Canonical AI output standard** (`lib/anthropic/structured.ts`): forced
  tool-use structured output, zod validation, one bounded repair retry, stable
  error codes (`AI_REQUEST_FAILED`/`AI_INVALID_OUTPUT`), telemetry logging
  (model, prompt version, status, latency, tokens — never contract text).
  Applied to: redflags, analyse (v3), content check, public live check.
- **Security sweep:** proof-upload ownership patch verified; service-role key
  confined to server modules; `profiles`/`user_profiles` INSERT policies
  tightened from `WITH CHECK (true)` to own-row (migration 034); orphan
  account linked to an org; platform-admin account left by design.

### Phase 1 — App restructure
- Agency nav is exactly six items: **Dashboard | Contracts | Content Check |
  Approvals | Deals | Settings**. Ten features flagged OFF (see
  `FEATURE_FLAGS.md`) — pages redirect, backend APIs stay live.
- `/agency/counsel` → `/agency/contracts` (renamed); NDA scan is a
  document-type choice inside Contracts.
- **Dashboard**: action-first. Empty state = two large action cards + 3-step
  strip + instant sample-contract analysis (`/agency/contracts?demo=1`,
  canned fixture, zero tokens). Active state = pending approvals with inline
  one-click Approve, recent analyses with verdict chips, nonzero-only stat
  cards. Subscription box moved to Settings; plan badge in sidebar footer.
- **Analysis result screen** per spec: verdict band ("Looks safe to proceed" /
  "Worth negotiating first" / "Hold — material issues"), max-3 "what matters
  most" cards with Accept / Ask this question / Copy negotiation wording /
  Rewrite clause, collapsed "worth reviewing", "N terms look like normal
  market practice", quiet lawyer-review footer. Shared across contracts, NDA
  and content checks.
- **Content Check**: new clean `/api/content/check` (no VPS dependency) +
  page + **public clearance certificate** at `/certificate/<scan_id>`
  (verdict, date, org, SHA-256 content fingerprint — never the content).
- **Creator**: mobile 3-tab layout (Check | My Deals | History) with a
  persistent New-check FAB; Check tab is one large paste box above the fold.
- **Deals**: lightweight table (deal, creator, contract, status, updated) —
  replaces the room UI.
- **Language pass**: calm commercial tone everywhere; the alarmist ⚠️ caveat
  is gone from the live surface.

### Phase 2 — Marketing site
- Old black/yellow site replaced. Warm paper `#F5F3EE` / ink `#111` / single
  green accent `#1D9E75`; Space Grotesk display + Inter body; scroll reveals
  respect `prefers-reduced-motion`.
- The three moments: hero clause-reveal (three traps swept in green with
  annotation chips), pinned sticky-scroll demo (saw → why → what to say back,
  copyable wording), and a working live-check strip
  (`/api/public/live-check`: no login, Haiku, 1,200-char cap, 5/hour/IP).
- Pages: Home, /agencies, /creators, /pricing (Creator ₹999 / Agency ₹15k /
  Brand "talk to us", marked introductory), /security (plain-language,
  DPDPA), Login, Signup. OG image via next/og. Analytics events (hero CTA,
  live-check use, signup start/complete) → `analytics_events` (migration 035,
  service-role only).

## Verification evidence
- `type-check`, `lint`, `build`, `test:unit`, `test:backend-audit`,
  `test:ai-schemas`, `security:audit`, `supabase:audit` — all green.
- **Production E2E** (`scripts/qa-prod-flow.mjs`): login → org create → real
  docx upload → v3 analyse (score 82, 5 risky clauses, 3 standard terms) →
  red-flags scan (5 flags) → content check (greenlit) → public certificate
  page renders. All PASS.
- **Cross-tenant denial** (`scripts/qa-cross-tenant.mjs`): two users in two
  orgs — contracts, content scans, approvals, proof storage, update attempts
  all denied. All PASS.
- **Email E2E on production**: real signup → Resend `delivered` → Gmail inbox
  (not spam) → link intact → click → `email_confirmed_at` set → redirected to
  onboarding. All QA users/orgs deleted afterwards.

## Known gaps / follow-ups
- **getgreenlit.in apex DNS** still points (partly) at the old VPS. To put the
  new marketing site on the apex: in GoDaddy, point `getgreenlit.in` at
  Vercel (A 76.76.21.21 / CNAME per Vercel dashboard) and add the domain to
  the Vercel project. The site is already live at app.getgreenlit.in.
- **Leaked-password protection** (`password_hibp_enabled`) would not enable
  via the Management API (likely plan-gated) — needs the dashboard toggle.
- Live-check rate limit is in-memory per serverless instance (documented in
  code); move to a durable store if abuse appears.
- Lighthouse not run in this environment; the site is static-first with
  system-optimised fonts, but score it once on real infra.
- Manager/brand dashboards untouched beyond nav trims — out of v1 scope.
- Billing untouched; stays in existing test/disabled mode.
- Old analyses (pre-v3) render through the same result screen with fallback
  copy; new fields appear for fresh analyses only.
