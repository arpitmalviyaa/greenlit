# Greenlit Codebase Audit Report

**Audited:** entire feature surface listed in the audit brief (auth, counsel, content, claims, approvals, deals, NDA, send, adversary, AI-risk, crisis, cross-reference, exclusivity, IP, meeting, notices, passport, playbook, rights, scope, SOW, term-sheets, timeline, whitelisting, delivery, checkers).
**Repo location:** `/Users/arpitmalviya/Downloads/greenlit` (the brief said `/root/greenlit`; that path does not exist on this machine — the codebase is local. All work done against the local copy.)
**Baseline `npx tsc --noEmit`:** PASS (0 errors) before any change.

## Summary

The codebase is uniformly high quality. Shared infrastructure is correct and reused everywhere:
- `lib/anthropic/utils.ts` `MODELS` = `claude-haiku-4-5-20251001` (extraction/classification) and `claude-sonnet-4-6` (analysis). **Every** Anthropic call routes through these constants — no hardcoded or wrong model IDs anywhere.
- All AI routes are auth-gated (`auth.getUser()` → 401) and org-scoped (`profiles.organisation_id` → 403), persist via the service client, and tolerate malformed model JSON with safe defaults.
- Every DB table referenced by a route exists in `supabase/migrations/`. Every page `fetch("/api/…")` target resolves to a real route.

Only **3** genuine defects were found, all in the API layer, plus 2 documented caveats.

## Feature Status Table

| Feature | Status | Issue |
|---|---|---|
| Auth — login | PASS | — |
| Auth — signup (3-step + jurisdiction) | PASS | — |
| Auth — agency onboarding | PASS | — |
| lib/supabase/client + middleware | PASS | — |
| Counsel — upload | PASS | Caveat: stores `getPublicUrl` on a private bucket (see Caveats); upload+analyse flow itself works. |
| Counsel — decode | PASS | — |
| Counsel — redflags | PASS | — |
| Counsel — compare (Haiku→Sonnet 2-pass) | PASS | — |
| Counsel — analyse (Haiku→Sonnet 2-pass) | PASS | — |
| Counsel — silent-changes | PASS | — |
| Content — scan (VPS + Sonnet non-IN fallback) | PASS | — |
| Content — platform-scan | PASS | — |
| Content — regulated-scan | PASS | — |
| Content — rewrite | PASS | — |
| Content — disclaimer | PASS | — |
| Content — brand-compare | PASS | — |
| Content — dark-patterns | PASS | — |
| Content — defamation-heatmap | PASS | — |
| Claims — analyse (2-pass + audit log) | PASS | — |
| Claims — list | PASS | — |
| **Claims — evidence (file upload)** | **PARTIAL** | Uploads to storage bucket `claim-evidence`, which is **never provisioned** (migration 006 only has a comment, no `INSERT INTO storage.buckets`). Upload throws at runtime. Page (`claims/page.tsx:143`) actively uses this. |
| Approvals — submit (Haiku pre-screen) | PASS | — |
| Approvals — list | PASS | — |
| Approvals — review | PASS | — |
| Deals — rooms (GET/POST) | PASS | — |
| Deals — analyse-term | PASS | — |
| Deals — suggest-counter | PASS | — |
| NDA — scan (2-pass) | PASS | — |
| Send — scan | PASS | — |
| Send — rewrite | PASS | — |
| Send — counsel | PASS | — |
| Adversary — analyse (plan-gated) | PASS | — |
| AI-risk — scan | PASS | — |
| Crisis — create / list / update | PASS | — |
| Cross-reference — query (plan-gated) | PASS | — |
| Exclusivity — add / check / list | PASS | — |
| IP — records | PASS | — |
| IP — analyse-infringement | PASS | — |
| IP — generate-takedown | PASS | — |
| **IP — evidence (file upload)** | **PARTIAL** | Uploads to storage bucket `ip-evidence`, which is **never provisioned** (migration 016 only has a comment). Throws on use. (Route is also not yet surfaced in `ip/page.tsx`.) |
| IP — infringements | PASS | — |
| IP — takedowns (GET/PATCH) | PASS | — |
| Meeting — analyse (plan-gated, 2-pass) | PASS | — |
| Meeting — list | PASS | — |
| Meeting — term-sheet | PASS | — |
| Notices — triage (2-pass) | PASS | — |
| Notices — list | PASS | — |
| Notices — liability-map | PASS | — |
| **Passport — assess** | **PARTIAL** | Builds the deliverables stat with `.in("sow_id", supabase.from("sows").select(...) as never)`. supabase-js `.in()` takes an **array, not a query builder**; the call fails (swallowed by `Promise.allSettled`) so `deliverables_total/approved/rejected` are **always 0**, silently degrading the compliance score. |
| Playbook — generate | PASS | — |
| Playbook — entries (GET/POST) | PASS | — |
| Rights — price | PASS | — |
| Rights — history | PASS | — |
| Scope — detect | PASS | — |
| Scope — analyse-change | PASS | — |
| Scope — change-requests (GET/PATCH) | PASS | — |
| Scope — alerts (GET/PATCH) | PASS | — |
| SOW — generate (2-pass + deliverables/milestones) | PASS | — |
| SOW — list | PASS | — |
| SOW — suggest | PASS | — |
| SOW — templates (GET/POST, PII-stripped) | PASS | — |
| Term-sheets — list | PASS | — |
| Timeline | PASS | — |
| Whitelisting — analyse | PASS | — |
| Whitelisting — list | PASS | — |
| Delivery — lock | PASS | — |
| Delivery — status | PASS | — |
| Checkers — `[checker_name]` proxy | PASS | Proxies to VPS `http://100.90.36.128:8765`; auth + checker-name validation + 5s timeout all correct. (Live behaviour depends on VPS reachability — infra, not code.) |

## FAIL / PARTIAL detail

### 1. PARTIAL — `app/api/claims/evidence/route.ts`
- **Problem:** `serviceClient.storage.from("claim-evidence").upload(...)` targets a bucket that is never created. Migration `006_claim_vault.sql` only contains a comment describing the bucket. File upload returns a storage error at runtime; the claims page evidence vault is broken.
- **Fix:** Provision the `claim-evidence` bucket (private) in a new migration. No route code change needed (upload path `${organisation_id}/${claim_id}/…` and service-role write are otherwise correct).

### 2. PARTIAL — `app/api/ip/evidence/route.ts`
- **Problem:** `serviceClient.storage.from("ip-evidence").upload(...)` targets a bucket that is never created (migration `016_ip_takedown.sql` only has a comment).
- **Fix:** Provision the `ip-evidence` bucket (private) in the same new migration.

### 3. PARTIAL — `app/api/passport/assess/route.ts`
- **Problem:** Deliverables are fetched with `.in("sow_id", supabase.from("sows").select("id").eq("creator_id", body.creator_id) as never)`. supabase-js `.in()` expects a value array, not a `PostgrestFilterBuilder`. The malformed request fails and is swallowed by `Promise.allSettled`, so every deliverables metric is `0` and the AI compliance assessment is fed wrong data.
- **Fix (surgical):** First fetch the creator's SOW ids, then pass that id array to `.in("sow_id", sowIds)`. Short-circuit to an empty deliverables set when the creator has no SOWs.

## Caveats (documented, not auto-fixed — see Manual Actions)
- **`counsel/upload` `getPublicUrl` on a private bucket:** the stored `file_url` is a public URL that will 403 against the private `contracts` bucket. The upload → extract → analyse flow works (it keys off `contract_id`, not the URL), so this is non-blocking, but any future "download original" feature needs a signed URL.
- **`proof-vault` bucket:** the in-scope approvals page calls out-of-scope `/api/proof/*` routes that write to a `proof-vault` bucket which is also unprovisioned (migration `010` comment only). Provisioned in the new migration so the approvals evidence vault works, without editing the out-of-scope `proof/*` route files.

---

## PHASE 3 — FIX LOG

All 3 PARTIAL items fixed. (Only 1 source file required editing + 1 migration created — below the 10-file checkpoint threshold, so no intermediate checkpoint was needed.)

1. **`app/api/passport/assess/route.ts`** — replaced the invalid `.in("sow_id", <query builder> as never)` with a proper two-step lookup: fetch the creator's SOW ids first, then `.in("sow_id", creatorSowIds)`. Deliverable metrics now reflect real data. Surgical change; no other logic touched.
2. **`supabase/migrations/025_evidence_storage_buckets.sql`** (new) — provisions the previously-uncreated private buckets `claim-evidence`, `ip-evidence`, and `proof-vault` with org-scoped RLS policies. This makes the claims-evidence and IP-evidence upload routes (PARTIAL #1, #2) functional, and also unblocks the in-scope approvals page's proof vault. **Created, not applied**, per instructions.

No working code was refactored. No file outside the audit list was edited. `app/api/billing/*`, `app/api/auth/*`, and `app/auth/*` were not touched.

---

## PHASE 4 — FINAL CHECK

### Files changed
- `app/api/passport/assess/route.ts` — fixed `.in()` subquery misuse (deliverable stats).

### Migration files created
- `supabase/migrations/025_evidence_storage_buckets.sql` — provisions `claim-evidence`, `ip-evidence`, `proof-vault` private buckets + org-scoped RLS. **Not applied.**

### Manual actions still required
1. **Apply migration 025** to the Supabase project (`ovjqzgzqcyowitjfwptz`) — e.g. `supabase db push` or paste into the SQL editor. The bucket-dependent upload features (claims evidence, IP evidence, approval proof vault) stay broken until this is applied.
2. **`counsel/upload` public-URL caveat** — the route stores `getPublicUrl()` for a *private* bucket; the value will 403 if ever used to fetch the file. Not auto-fixed because no audited read path consumes it and a fix would change the read/storage contract. If/when a "download original contract" feature is added, switch to `createSignedUrl()` (as `proof/list` already does). Left as a deliberate decision.
3. **VPS dependency** — `content/scan` and `checkers/[checker_name]` proxy to `http://100.90.36.128:8765`. Code is correct and fails gracefully, but live behaviour requires that VPS to be reachable. Infra, not code.
4. **RLS path note** — the new evidence buckets are keyed by `organisation_id` (matching the existing upload code), so their policies scope by org rather than by `auth.uid()`. The `contracts` bucket retains its `auth.uid()` first-segment pattern. Server writes use the service role and bypass RLS regardless.

### Final TypeScript status
`npx tsc --noEmit` → **PASS (0 errors)** — both before and after the changes.
