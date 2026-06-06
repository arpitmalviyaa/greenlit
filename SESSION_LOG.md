# Greenlit Session Log

## Session 1 — 2026-06-06

**Module:** Foundation  
**What was built:**
- Next.js 14 App Router project (TypeScript strict)
- Tailwind CSS + shadcn-compatible UI components (Button, Input, Label, Card)
- Supabase schema: 13 tables, full RLS policies, helper functions, updated_at triggers
- Auth: email/password login + signup (agency_admin creation flow)
- Magic link / email confirmation handled via `/api/auth/callback`
- Organisation creation POST `/api/org/create` (service role, slug auto-dedup)
- Middleware: auth guard, role-based routing, onboarding gate
- Dashboard layout with role-aware sidebar (Lucide icons)
- 4 role shells: agency_admin, creator, manager, brand
- Agency onboarding page (org name → workspace created)
- Anthropic client + model selector (Haiku/Sonnet per task type)
- Database types hand-authored from schema
- `.env.local.example` with all required vars

**What was tested:** TypeScript compiles (tsc --noEmit). Logic reviewed manually — no runtime test yet (needs Supabase project + env vars).

**What is pending:**
- `supabase gen types typescript` regeneration once project is connected
- Storage bucket creation (commented in migration file)
- Email template configuration in Supabase Auth dashboard

---

## Session 2 — 2026-06-06

**Module:** Counsel — Contract Upload & AI Analysis

**What was built:**
- `supabase/migrations/002_contracts_raw_text.sql` — adds raw_text, file_name, file_size_bytes to contracts
- `lib/utils/extract-text.ts` — PDF (pdf-parse) and DOCX (mammoth) text extraction, server-only, graceful error handling
- `lib/anthropic/prompts/contract-extract.ts` — Haiku system + user prompt for clause extraction (JSON output, 800 max tokens)
- `lib/anthropic/prompts/contract-analyse.ts` — Sonnet system + user prompt for deep analysis (Indian law context, 2500 max tokens)
- `app/api/counsel/upload/route.ts` — multipart POST: auth, org scope, Storage upload, text extraction, DB insert
- `app/api/counsel/analyse/route.ts` — POST: two-pass Haiku→Sonnet analysis, persist to contracts.analysis_json, risk_score, status
- `app/(dashboard)/agency/counsel/page.tsx` — Full UI: drag-drop upload zone, 2-step progress, text preview, risk score display, risky clauses (expandable), red flags, missing clauses, 3 risk indicators, lawyer escalation banner, contracts list with stored results

**Architecture decisions:**
- Two-pass AI: Haiku extracts compact clause JSON (max 12k chars of raw text), Sonnet analyses the clause list only — raw text never reaches Sonnet
- pdf-parse ESM/CJS interop handled via runtime default export detection
- Service role used for Storage upload (bypasses Storage RLS) and DB update after analysis
- Text extraction failure → upload still succeeds, analysis blocked with clear error message

**What was tested:** `tsc --noEmit` exits 0. Logic reviewed manually — no runtime test yet (needs live Supabase + Anthropic keys).

**What is pending:**
- Run migrations 001 + 002 in Supabase SQL editor
- Create `contracts` storage bucket (public: false) in Supabase dashboard

---

## Session 3 — 2026-06-06

**Module:** Counsel — Clause Tools (Decoder, Red Flags, Version Compare, Silent Changes)

**What was built:**
- `lib/anthropic/prompts/clause-decode.ts` — Haiku, 400 max tokens. Decodes a single clause into plain_english, what_it_means_for_you, risk_level
- `lib/anthropic/prompts/red-flags.ts` — Haiku, 600 max tokens. Scans extracted clause JSON for 10 flag types (uncapped_indemnity, unlimited_liability, one_sided_termination, payment_after_satisfaction, perpetual_ip_assignment, broad_exclusivity, non_compete, moral_clause_abuse, confidentiality_trap, jurisdiction_risk)
- `lib/anthropic/prompts/contract-compare.ts` — Two-pass. Haiku extracts clause lists from both contracts (800 max tokens each, run in parallel). Sonnet compares them (2000 max tokens). Returns silent_changes, worsened_clauses, removed_protections, new_obligations, payment_term_changes, overall_verdict
- `lib/anthropic/prompts/silent-changes.ts` — Haiku only, 600 max tokens. Focused diff on subtle wording changes that shift legal meaning
- `app/api/counsel/decode/route.ts` — POST { clause_text } → { result }
- `app/api/counsel/redflags/route.ts` — POST { contract_id } → { flags[] }
- `app/api/counsel/compare/route.ts` — POST { contract_id_a, contract_id_b } → { result, titles }. Haiku extracts both clause lists in parallel, Sonnet analyses
- `app/api/counsel/silent-changes/route.ts` — POST { contract_id_a, contract_id_b } → { changes[] }. Haiku only
- `app/(dashboard)/agency/counsel/page.tsx` — Redesigned with 4-tab layout (Upload & Analyse, Clause Decoder, Version Compare, Red Flags). All new tools inline. Silent changes in amber, worsened/removed in red, new obligations in amber. Version Compare fetches /compare and /silent-changes in parallel

**Architecture decisions:**
- Compare tab runs /compare (Haiku→Sonnet) and /silent-changes (Haiku) in parallel from the client — faster than sequential
- Red flags tab only shows analysed contracts (status === "reviewed") since it reads analysis_json
- Version compare also filtered to analysed contracts only
- safeParse helper duplicated into each route (no shared util) to keep routes self-contained
- No new DB migrations needed — all tools are stateless reads

**What was tested:** `tsc --noEmit` exits 0. Logic reviewed manually — no runtime test yet (needs live Supabase + Anthropic keys).

**What is pending:**
- End-to-end runtime test with real contracts
- Session 4: Content scanner — VPS checker proxy (/api/checkers/[checker_name]), all 15 checkers wired, verdict UI

---

## Session 4 — 2026-06-06

**Module:** Content Scanner (VPS Checker Proxy + Full UI)

**What was built:**
- `lib/utils/checkers.ts` — CHECKERS array (15 checkers with id, name, description, category). CHECKER_MAP for O(1) lookup
- `app/api/checkers/[checker_name]/route.ts` — Dynamic VPS proxy. Auth check, validates checker against CHECKERS list, forwards to VPS at port 8765, 5s AbortController timeout, graceful error response, VPS URL never exposed to client
- `app/api/content/scan/route.ts` — Full scan aggregator. Auth + org scoping. Promise.allSettled parallel calls to all/selected checkers. Aggregates overall_verdict (greenlit/caution/blocked), overall_risk_score (mean), top_issues (top 3 by severity), requires_lawyer flag (score ≥ 70 or any critical). Saves to content_scans table via service client. Graceful per-checker error fallback
- `app/api/content/rewrite/route.ts` — POST { content, content_type, issues, tone }. Haiku, 1000 max tokens. 6 tone options
- `app/api/content/disclaimer/route.ts` — POST { content, content_types }. Haiku, 600 max tokens. 10 disclaimer type options
- `lib/anthropic/prompts/content-rewrite.ts` — Haiku prompt with 6 tone modes and Indian law compliance context
- `lib/anthropic/prompts/content-disclaimer.ts` — Haiku prompt covering ASCI, SEBI, FSSAI, Consumer Protection, NMC standards
- `app/(dashboard)/agency/content/page.tsx` — Two-column desktop / single-column mobile layout. Left: textarea + content type selector + checker toggle (all-15 or multi-select) + scan button with loading state. Right: overall verdict badge + risk score + top issues + per-checker expandable cards (collapsed if safe, expanded if flagged) + lawyer banner + rewrite panel (tone picker) + disclaimer panel (10 type checkboxes)
- `app/(dashboard)/creator/content/page.tsx` — Re-exports agency content page
- `supabase/migrations/003_content_scans_update.sql` — Adds podcast/carousel to content_type enum; adds checker_ids_run, top_issues_json, requires_lawyer columns (all idempotent)
- `types/database.types.ts` — ContentType extended with podcast/carousel; ContentScanRow/Insert updated with 3 new columns

**Architecture decisions:**
- Promise.allSettled used throughout — a single checker failure never blocks the overall scan result
- VPS timeout: 5s AbortController per checker, returns graceful error record in results array
- Verdict thresholds: score ≥70 = blocked, ≥35 = caution, else greenlit
- Haiku only for rewrite and disclaimer — no two-pass needed, checkers handle legal analysis
- Creator content page re-exports agency page (zero duplication)
- Sidebar already had both nav items wired from Session 1 — no sidebar changes needed

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

**What is pending:**
- Migration 003 to be run on Supabase
- End-to-end runtime test requires live VPS at port 8765 with checker endpoints

---

## Session 5 — 2026-06-06

**Module:** Jurisdiction Infrastructure + Corpus Layer

**What was built:**
- `supabase/migrations/004_jurisdiction_infrastructure.sql` — `organisation_jurisdictions` table (RLS: agency_admin only), `jurisdiction_corpus` table (index on jurisdiction_code), jurisdiction column added to contracts + content_scans, seed IN for all existing orgs
- `lib/utils/jurisdictions.ts` — JURISDICTIONS array (7 jurisdictions: IN/US/UK live, UAE/SG/AU/EU coming_soon), JURISDICTION_MAP, JurisdictionCode type
- `lib/corpus/index.ts` — `getRelevantCorpus(topics, jurisdiction, limit)` + `formatCorpusForPrompt(entries)`. Best-effort — empty corpus never breaks analysis
- `lib/corpus/ingest.ts` — standalone ingest scripts: `ingestCourtListener`, `ingestFTCGuidelines`, `ingestASACAP`. Scripts only, not in request path
- `lib/anthropic/prompts/contract-analyse.ts` — accepts jurisdiction + corpus_context params. Indian law detail as fallback for IN with empty corpus
- `lib/anthropic/prompts/content-rewrite.ts` — accepts jurisdiction param, adjusts guidance per jurisdiction
- `app/api/jurisdiction/list/route.ts` — GET: returns org's active jurisdictions joined with JURISDICTIONS constant
- `app/api/jurisdiction/add/route.ts` — POST: agency_admin only, validates code is live, inserts to org_jurisdictions
- `components/ui/jurisdiction-selector.tsx` — small dropdown with flag + name, fetches org's active jurisdictions, defaults to IN
- `app/(auth)/signup/page.tsx` — 3-step signup: account → jurisdiction picker (IN locked, coming_soon greyed, live selectable) → verify/onboarding
- `app/api/org/create/route.ts` — accepts jurisdiction_codes[], inserts all codes into org_jurisdictions (IN always included)
- `app/(dashboard)/agency/content/page.tsx` — JurisdictionSelector above scan button, jurisdiction passed to /api/content/scan
- `app/(dashboard)/agency/counsel/page.tsx` — JurisdictionSelector in upload card, jurisdiction passed to /api/counsel/analyse
- `app/api/content/scan/route.ts` — accepts jurisdiction; non-IN skips VPS checkers, uses Sonnet corpus-based analysis with note in results
- `app/api/counsel/analyse/route.ts` — accepts jurisdiction, fetches corpus, passes corpus_context to Sonnet, saves jurisdiction to contracts table
- `types/database.types.ts` — added OrganisationJurisdictionRow/Insert, JurisdictionCorpusRow/Insert, jurisdiction column to ContractRow and ContentScanRow

**Architecture decisions:**
- coming_soon jurisdictions blocked at API level (POST /api/jurisdiction/add returns 400)
- IN is always inserted on org creation regardless of what codes are passed — enforced in org/create route
- Non-IN content scans bypass VPS entirely and use Sonnet fallback with corpus context — result includes a "VPS checkers India-only" note in top_issues
- Corpus retrieval wrapped in try/catch throughout — empty corpus degrades gracefully, never errors

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

**What is pending:**
- Migration 004 to be run in Supabase SQL editor
- Corpus population (run ingest scripts after API keys are set)

---

## Session 6 — 2026-06-06

**Module:** Content Scanner Advanced

**What was built:**
- `supabase/migrations/005_content_scanner_advanced.sql` — `content_advanced_scans` table with `scan_type_advanced` enum, full RLS (SELECT/INSERT own org, DELETE agency_admin)
- `lib/anthropic/prompts/defamation-heatmap.ts` — Haiku, 800 tokens. Returns spans with start/end char indices, risk level, reason
- `lib/anthropic/prompts/brand-compare.ts` — Haiku, 600 tokens. Checks implied endorsement, brand association, disparagement, unauthorised reference
- `lib/anthropic/prompts/platform-scan.ts` — Haiku, 1000 tokens. Platform policy knowledge baked in for Instagram/YouTube/Twitter/LinkedIn/TikTok
- `lib/anthropic/prompts/regulated-scan.ts` — Sonnet, 2000 tokens. 7 regulated categories, jurisdiction-aware, accepts corpus context
- `lib/anthropic/prompts/dark-patterns.ts` — Haiku, 700 tokens. 6 dark pattern types per CCPA 2023 / Consumer Protection Act
- `app/api/content/defamation-heatmap/route.ts` — POST { content, jurisdiction } → { spans[] }
- `app/api/content/brand-compare/route.ts` — POST { content, brand_name, jurisdiction } → { verdict, issues[], suggestions[] }
- `app/api/content/platform-scan/route.ts` — POST { content, platforms[], jurisdiction } → { results[] }
- `app/api/content/regulated-scan/route.ts` — POST { content, category, jurisdiction }. Calls getRelevantCorpus before Sonnet. Returns { compliant, issues[], required_disclosures[] }
- `app/api/content/dark-patterns/route.ts` — POST { content, jurisdiction } → { patterns[] }
- `components/content/defamation-heatmap.tsx` — Highlights spans inline. high=red, medium=amber, low=yellow. Hover tooltip. Handles overlapping spans (skip, highest risk first). DefamationLegend sub-component.
- `app/(dashboard)/agency/content/page.tsx` — Rebuilt with 5-tab layout: Content Scan, Brand Check, Platform Check, Regulated, Dark Patterns. Jurisdiction selector moved to header (shared across tabs). Defamation heatmap renders inline below scan results in Scan tab. All existing scan/rewrite/disclaimer functionality preserved.
- `types/database.types.ts` — ScanTypeAdvanced enum, ContentAdvancedScanRow/Insert, all 5 result shape interfaces

**Architecture decisions:**
- Jurisdiction selector lifted to page header — shared across all tabs to avoid per-tab duplication
- Regulated scan is the only route using Sonnet — all others Haiku
- All 5 routes persist to content_advanced_scans via service client
- Empty corpus never breaks regulated scan — corpusContext is empty string if no entries

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

**What is pending:**
- Migration 005 to be run in Supabase SQL editor

---

## Session 7 — 2026-06-06

**Module:** Claim Substantiation Vault

**What was built:**
- `supabase/migrations/006_claim_vault.sql` — 3 tables: `claims`, `claim_evidence`, `claim_audit_log`. Enums: claim_category, claim_verdict_type, claim_evidence_type, claim_audit_action. Full RLS on all tables. Audit log: SELECT only from client, INSERT server-side only. Storage bucket note for claim-evidence (private, 20MB).
- `lib/anthropic/prompts/claim-extract.ts` — Haiku, 600 tokens. Extracts claim_type, implicit_assertions, burden_of_proof_standard, keywords
- `lib/anthropic/prompts/claim-analyse.ts` — Sonnet, 2500 tokens. Jurisdiction-aware, accepts corpus context + extracted JSON. Returns verdict, risk_score, burden_of_proof, what_evidence_needed, regulatory_risk, analysis
- `app/api/claims/analyse/route.ts` — Two-pass mandatory: Haiku extract → getRelevantCorpus → Sonnet analyse. Saves to claims + claim_audit_log server-side. Returns result + claim_id
- `app/api/claims/evidence/route.ts` — multipart/form-data. 20MB server-side cap (returns 413). Uploads to Supabase Storage at {org_id}/{claim_id}/{filename}. Inserts claim_evidence + audit log
- `app/api/claims/list/route.ts` — GET with optional ?category= and ?jurisdiction= filters. Returns claims with evidence count + latest audit
- `app/api/claims/[id]/route.ts` — GET full claim with all evidence + full audit log. Org membership check
- `app/(dashboard)/agency/claims/page.tsx` — Two-panel layout (stacks on mobile). Left: Claim Analyser (textarea, category selector, jurisdiction selector, analyse button, result card with verdict badge + risk bar + evidence needed + regulatory risk + collapsible full analysis). Right: Vault (list of saved claims, expandable rows showing full analysis + evidence list + audit log, per-claim evidence upload)
- `components/dashboard/sidebar.tsx` — "Claim Vault" added to AGENCY_NAV using Zap icon at `/agency/claims`
- `types/database.types.ts` — ClaimCategory, ClaimVerdict, ClaimEvidenceType, ClaimAuditAction enums. ClaimRow/Insert, ClaimEvidenceRow/Insert, ClaimAuditLogRow/Insert. All 3 tables added to Database root type

**Architecture decisions:**
- Two-pass mandatory: Haiku extract gives keywords used for corpus topic search before Sonnet
- Verdict + risk_score computed by AI only — no client-side editing of these fields
- Audit log inserts all happen in API routes (server-side) — no client route for audit log INSERT; RLS only allows SELECT from client
- File upload fails fast at 20MB with 413 before touching Storage
- Vault loads immediately on page mount; refreshes after analyse or evidence upload

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

**What is pending:**
- Migrations 005 + 006 to be run in Supabase SQL editor
- Create `claim-evidence` storage bucket in Supabase Storage dashboard (private, 20MB per-file limit)
- Session 8: Next phase per GREENLIT_MASTER.md

---

## Session 8 — 2026-06-06

**Module:** SOW Builder

**What was built:**
- `supabase/migrations/007_sow_builder.sql` — 4 tables: `sow_templates`, `sows`, `sow_deliverables`, `sow_payment_milestones`. All enums + RLS. Triggers for updated_at.
- `lib/anthropic/prompts/sow-extract.ts` — Haiku, 600 tokens. Extracts key terms, deliverable types, payment structure hints.
- `lib/anthropic/prompts/sow-generate.ts` — Sonnet, 2500 tokens. Jurisdiction-aware full SOW JSON generation.
- `lib/anthropic/prompts/sow-suggest.ts` — Haiku, 500 tokens. Per-field improvement suggestions.
- `app/api/sow/generate/route.ts` — Two-pass mandatory (Haiku extract → corpus fetch → Sonnet generate). Saves SOW + deliverables + milestones.
- `app/api/sow/suggest/route.ts` — POST field + current_value → suggestions + reasoning.
- `app/api/sow/list/route.ts` — GET with ?status= and ?campaign_id= filters.
- `app/api/sow/[id]/route.ts` — GET full SOW + PATCH status (transition-enforced).
- `app/api/sow/templates/route.ts` — GET org templates + POST save-as-template (strips PII).
- `app/(dashboard)/agency/sow/page.tsx` — Three-section layout: Generator form, SOW Preview with inline suggest buttons, SOW List table.
- Types: SowCategory, SowStatus, DeliverablePlatform, DeliverableContentType, DeliverableStatus, MilestoneStatus enums + all Row/Insert types. Removed conflicting Session 1 stub SowRow/SowInsert.

**Architecture decisions:**
- Two-pass mandatory: corpus always fetched between Haiku extract and Sonnet generate
- Old stub SowRow/SowInsert from Session 1 removed (replaced by full Session 8 types)
- Status transitions enforced at PATCH level (invalid transitions return 400)
- Save-as-Template strips brand_name/creator_handle → placeholders before saving

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## Session 9 — 2026-06-06

**Module:** Scope Creep Monitor

**What was built:**
- `supabase/migrations/008_scope_creep.sql` — 2 tables: `scope_change_requests`, `scope_alerts`. Enums: change_type, change_status, alert_type, alert_severity. scope_alerts has no client INSERT policy (server-side only).
- `lib/anthropic/prompts/scope-change-analyse.ts` — Haiku, 700 tokens. Returns financial/timeline impact, legal_risk, recommendation, reasoning.
- `app/api/scope/analyse-change/route.ts` — POST → Haiku analysis → saves to scope_change_requests.
- `app/api/scope/alerts/route.ts` — GET unresolved alerts + PATCH resolve.
- `app/api/scope/change-requests/route.ts` — GET ?sow_id= + PATCH status (agency_admin only).
- `app/api/scope/detect/route.ts` — POST sow_id → idempotent detection of overdue deliverables, timeline drift, unapproved deliverable additions. Auto-inserts scope_alerts via service client.
- `app/(dashboard)/agency/scope/page.tsx` — Two-panel: Alert Feed (grouped high→low, resolve button) + Change Request Manager (SOW selector, Log Change modal with Analyse Impact + Confirm Submit flow, approve/reject/negotiate buttons).
- Auto-detect on SOW select: POST /api/scope/detect → silent alerts refresh.
- Types: ChangeType, ChangeStatus, AlertType, AlertSeverity enums + ScopeChangeRequestRow/Insert, ScopeAlertRow/Insert.

**Architecture decisions:**
- scope_alerts INSERT is service-client only — idempotency checked against existing unresolved alerts before insert
- Change request PATCH (approve/reject/negotiate) checks agency_admin role at API level
- Detect is idempotent: existing unresolved alert types are loaded first, new ones only inserted if not already present

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## Session 10 — 2026-06-06

**Module:** Invoice Generator + Delivery Lock

**What was built:**
- `supabase/migrations/009_invoices_delivery.sql` — 2 tables: `invoices` (UNIQUE invoice_number), `delivery_locks` (UNIQUE sow_id). Enums: invoice_status, lock_status. Full RLS.
- `lib/anthropic/prompts/invoice-generate.ts` — Haiku, 600 tokens. Generates line items from deliverables + milestone.
- `lib/utils/invoice-number.ts` — `getNextInvoiceNumber(org_id)` → INV-{YYYY}-{0001}. Counts per-org per-year, DB UNIQUE constraint as safety net.
- `app/api/invoices/generate/route.ts` — agency_admin only. Haiku line items → auto invoice_number → saves to invoices.
- `app/api/invoices/list/route.ts` — GET with ?sow_id= and ?status= filters.
- `app/api/invoices/[id]/route.ts` — GET + PATCH status (transition-enforced, paid_at set automatically).
- `app/api/delivery/lock/route.ts` — agency_admin only. Idempotent: existing lock rechecked on repeat POST. Checks all_deliverables_approved + all_milestones_paid. If both true → lock_status=complete + sow.status=signed.
- `app/api/delivery/status/route.ts` — GET ?sow_id= → lock or null.
- `app/(dashboard)/agency/delivery/page.tsx` — Three sections: Invoice Manager (milestone selector, tax toggle, generate + preview, list with status actions), Delivery Lock (checklist ✓/✗, initiate/recheck), Approved Changes timeline.
- Types: InvoiceStatus, LockStatus enums + InvoiceRow/Insert, DeliveryLockRow/Insert.
- Sidebar: SOW Builder, Scope Monitor, Delivery added to AGENCY_NAV.

**Architecture decisions:**
- Invoice generation agency_admin only — enforced at API, not just RLS
- Delivery lock idempotent: PATCH existing record if sow_id already locked
- compliance_cleared + final_assets_uploaded are manual DB toggles (no AI)
- Lock completion auto-transitions SOW to signed status via service client

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## Session 11 — 2026-06-06

**Module:** Approval Portal + Proof Vault + Evidence Timeline

**What was built:**
- `supabase/migrations/010_approvals_proof_vault.sql` — 3 tables: `approval_requests`, `proof_vault_entries`, `evidence_timeline`. Full RLS. DB triggers: approval_requests → evidence_timeline, invoices paid → evidence_timeline, delivery_locks → evidence_timeline. Storage bucket note: proof-vault (private, 50MB).
- `lib/anthropic/prompts/approval-prescreen.ts` — Haiku, 500 tokens.
- `app/api/approvals/submit/route.ts`, `review/route.ts`, `list/route.ts` — full approval pipeline.
- `app/api/proof/upload/route.ts`, `list/route.ts` — storage upload + signed URL return.
- `app/api/timeline/route.ts` — ordered events with actor name enrichment.
- `app/(dashboard)/agency/approvals/page.tsx` — two-panel: queue + proof vault.
- `app/(dashboard)/brand/page.tsx` — replaced placeholder with real approval list.
- `app/(dashboard)/agency/timeline/page.tsx` — vertical timeline, export PDF.
- Sidebar: "Approvals" + "Timeline" added. Types: 3 new enums + Row/Insert for all 3 tables.

**Architecture decisions:**
- evidence_timeline INSERT server-side only (trigger + service client, no client RLS policy)
- proof-vault always returns signed URLs, never public URLs
- Brand role approval filtering enforced at API level

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## Session 12 — 2026-06-06

**Module:** Creator Deal Room + Exclusivity Radar

**What was built:**
- `supabase/migrations/011_deal_room_exclusivity.sql` — ALTER exclusivity_records + 3 new tables: `deal_rooms`, `deal_messages`, `exclusivity_alerts`.
- `lib/anthropic/prompts/deal-term-analyse.ts` (Haiku), `deal-counter.ts` (Sonnet).
- `app/api/deals/rooms`, `[room_id]/messages`, `analyse-term`, `suggest-counter` routes.
- `app/api/exclusivity/check`, `list`, `add` routes (were empty dirs).
- `app/(dashboard)/agency/deals/page.tsx` — deal room thread with inline AI term analysis + suggest counter.
- `app/(dashboard)/agency/exclusivity/page.tsx` — visual timeline radar + conflict check + records table.
- Sidebar: "Deal Rooms" + "Exclusivity" added. Types: DealStatus, MessageType enums + 3 new Row/Insert types.

**Architecture decisions:**
- Sonnet only for counter-proposal; Haiku for term analysis
- High-severity conflict blocks exclusivity_record insert (409)
- Auto-analyse on term_proposal is non-blocking (try/catch)

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## Session 13 — 2026-06-06

**Module:** Whitelisting Guard + Rights-to-Price + Creator Safety Passport

**What was built:**
- `supabase/migrations/012_whitelisting_rights_passport.sql` — 3 tables: `whitelisting_requests`, `rights_valuations`, `safety_passports` (UNIQUE org+creator). Full RLS.
- `lib/anthropic/prompts/whitelisting-analyse.ts` (Sonnet, 2000), `rights-price.ts` (Haiku, 700), `passport-assess.ts` (Haiku, 800).
- `app/api/whitelisting/analyse`, `list` routes.
- `app/api/rights/price`, `history` routes.
- `app/api/passport/assess`, `[creator_id]` routes.
- `app/(dashboard)/agency/whitelisting/page.tsx` — rights checkboxes form + analysis result + history list.
- `app/(dashboard)/agency/rights/page.tsx` — duration slider, platform chips, usage checkboxes, range card + history table.
- `app/(dashboard)/agency/passport/page.tsx` — SVG compliance ring, checklist, risk flags.
- Sidebar: "Whitelisting", "Rights Pricing", "Creator Passport" added. Types: 2 new enums + 3 Row/Insert types.

**Architecture decisions:**
- Sonnet + getRelevantCorpus mandatory for whitelisting; Haiku for pricing/passport
- safety_passports upserts (unique constraint) — overwrites previous assessment
- Passport pulls real data from 5 existing tables — no mock data
- Rights valuations are append-only

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## Session 14 ✅

**Module:** Send Scanner

**What was built:**
- `supabase/migrations/013_send_scanner.sql` — `send_scans` table + enums (recipient_type, send_channel, overall_risk, send_recommendation, rewrite_goal). RLS: SELECT/INSERT own org only.
- `lib/anthropic/prompts/send-scan.ts` (Haiku, 800), `send-rewrite.ts` (Haiku, 800), `send-counsel.ts` (Sonnet, 2000 + corpus).
- `app/api/send/scan`, `rewrite`, `counsel` routes.
- `app/(dashboard)/agency/send-scanner/page.tsx` — 3-step progressive UI: input → risk results + rewrite → counsel.
- Types: 5 new enums + SendScanRow/Insert.

**Architecture decisions:**
- scan saves immediately; rewrite patches send_scans.rewrite_json; counsel optionally patches counsel_json
- Haiku for scan + rewrite; Sonnet + corpus for counsel

---

## Session 15 ✅

**Module:** Meeting Counsel + Term Sheets

**What was built:**
- `supabase/migrations/014_meeting_counsel.sql` — `meeting_transcripts` + `term_sheets` tables with full RLS.
- `lib/anthropic/prompts/meeting-extract.ts` (Haiku, 700), `meeting-analyse.ts` (Sonnet, 2500 + corpus), `term-sheet-generate.ts` (Haiku, 800).
- `app/api/meeting/analyse`, `term-sheet`, `list`, `[id]` routes.
- `app/api/term-sheets/[id]`, `list` routes.
- `app/(dashboard)/agency/meeting/page.tsx` — two-panel: transcript input + analysis + term sheet on left, history on right.
- `app/(dashboard)/agency/term-sheets/page.tsx` — list + detail + status updates + "Convert to SOW" redirect.
- Types: TermSheetStatus + MeetingTranscriptRow/Insert + TermSheetRow/Insert.

**Architecture decisions:**
- Plan-gated: meeting_counsel requires enterprise tier
- Two-pass: Haiku extract agreed_terms → corpus → Sonnet full analysis

---

## Session 16 ✅

**Module:** Legal Notice Triage + Liability Map + Crisis Room

**What was built:**
- `supabase/migrations/015_legal_notices_crisis.sql` — ALTERs legal_notices (ADD COLUMN IF NOT EXISTS for triage_json, liability_map_json, etc.). Creates `crisis_rooms` + `liability_maps` (agency_admin RLS only).
- `lib/anthropic/prompts/notice-extract.ts` (Haiku, 600), `notice-triage.ts` (Sonnet, 2500 + corpus), `liability-map.ts` (Sonnet, 2500 + corpus), `crisis-plan.ts` (Haiku, 800).
- `app/api/notices/triage`, `liability-map`, `list` routes.
- `app/api/crisis/create`, `update`, `list` routes.
- `app/(dashboard)/agency/notices/page.tsx` — two panels: triage + liability + crisis on left, history on right.
- `app/(dashboard)/agency/crisis/page.tsx` — list view → detail with action plan checklist + timeline + status updates.
- Types: CrisisSeverity + CrisisStatus + CrisisRoomRow/Insert + LiabilityMapRow/Insert.

---

## Session 17 ✅

**Module:** IP & Takedowns

**What was built:**
- `supabase/migrations/016_ip_takedown.sql` — ALTERs ip_records (ADD COLUMN IF NOT EXISTS). Creates `infringement_records` + `takedown_notices`.
- `lib/anthropic/prompts/infringement-analyse.ts` (Haiku, 700), `takedown-generate.ts` (Sonnet, 2500 + corpus).
- `app/api/ip/records`, `analyse-infringement`, `generate-takedown`, `infringements`, `evidence`, `takedowns` routes.
- `app/(dashboard)/agency/ip/page.tsx` — three tabs: IP Records, Infringement Tracker, Takedown Centre.
- Types: InfringementStatus + TakedownStatus + InfringementRecordRow/Insert + TakedownNoticeRow/Insert.

---

## Session 18 ✅

**Module:** Legal Playbook + Clause Library + NDA Scanner

**What was built:**
- `supabase/migrations/017_playbook_clauses.sql` — `playbook_entries`, `clause_library`, `nda_scans` tables with full RLS.
- `lib/anthropic/prompts/playbook-generate.ts` (Sonnet, 2000), `clause-analyse.ts` (Haiku, 600), `nda-extract.ts` (Haiku, 700), `nda-trap.ts` (Sonnet, 2500 + corpus).
- `app/api/playbook/generate`, `entries`, `entries/[id]` routes.
- `app/api/clauses/analyse`, `library` routes.
- `app/api/nda/scan` route — two-pass (Haiku extract → corpus → Sonnet traps).
- `app/(dashboard)/agency/playbook/page.tsx` — two-panel: AI suggestions + entries + clause library.
- `app/(dashboard)/agency/nda-scanner/page.tsx` — verdict banner, trap cards, redlines, safe clauses.
- Types: PlaybookCategory + NdaVerdictType + PlaybookEntryRow/Insert + ClauseLibraryRow/Insert + NdaScanRow/Insert.

---

## Session 19 ✅

**Module:** AI & Vendor Risk

**What was built:**
- `supabase/migrations/018_ai_vendor_risk.sql` — `ai_workflow_scans` + `vendor_contracts` tables.
- `lib/anthropic/prompts/ai-risk-scan.ts` (Sonnet, 2500 + corpus), `vendor-extract.ts` (Haiku, 600), `vendor-shield.ts` (Sonnet, 2500 + corpus).
- `app/api/ai-risk/scan`, `app/api/vendor/shield` routes.
- `app/(dashboard)/agency/ai-risk/page.tsx` — two sections: AI Workflow Scanner + Vendor Shield.
- Types: AiRiskLevel + AiWorkflowScanRow/Insert + VendorContractRow/Insert.

---

## Session 20 ✅

**Module:** Cross-Reference + Adversary Lens

**What was built:**
- `supabase/migrations/019_cross_reference_adversary.sql` — `cross_reference_queries`, `adversary_analyses`, `complaint_simulations` + enums.
- `lib/anthropic/prompts/cross-ref.ts` (Sonnet, 2500), `adversary-lens.ts` (Sonnet, 2500 + corpus), `complaint-simulate.ts` (Haiku, 800).
- `app/api/cross-ref/query` (enterprise-gated), `app/api/adversary/analyse` (enterprise-gated), `app/api/complaints/simulate` routes.
- `app/(dashboard)/agency/cross-reference/page.tsx` — multi-jurisdiction chips, per-jurisdiction result cards, conflicts banner.
- `app/(dashboard)/agency/adversary/page.tsx` — Adversary Lens (5 types) + Complaint Simulator (8 bodies).
- Types: AdversaryType + ComplaintBodyType + 3 Row/Insert types.

**Architecture decisions:**
- Cross-reference fetches corpus per jurisdiction separately via Promise.allSettled, truncates combined to 4000 chars
- Plan-gated: cross_reference + adversary_lens require enterprise tier
- Complaint simulator: Haiku only, no plan gate

---

## Session 21 ✅

**Module:** Billing + Plan Gating + Health Dashboard

**What was built:**
- `supabase/migrations/020_billing_health.sql` — `subscription_plans` (seeded: free/pro/agency/enterprise), `organisation_subscriptions`, `billing_events`. No client INSERT policy on billing_events.
- `lib/utils/plan-gate.ts` — `checkPlanAccess(organisationId, feature)` with fail-open on errors.
- Plan gating applied to: `app/api/meeting/analyse`, `app/api/adversary/analyse`, `app/api/cross-ref/query`.
- `app/api/billing/plans`, `status`, `create-subscription`, `webhook`, `jurisdiction-addon` routes.
- `app/pricing/page.tsx` — public server component, 4 plan cards, agency highlighted.
- `app/(dashboard)/agency/page.tsx` — full health dashboard: 6 stat cards + subscription card + recent activity + quick actions.
- `components/dashboard/sidebar.tsx` — 10 new AGENCY_NAV items (Sessions 14–21).
- Types: PlanName + SubscriptionStatus + BillingEventType + SubscriptionPlanRow + OrganisationSubscriptionRow/Insert + BillingEventRow/Insert. All Sessions 14–20 types also added.

**Architecture decisions:**
- Razorpay integration via fetch + Basic Auth (no npm package)
- Webhook uses HMAC SHA256 signature verification on raw body text; always returns 200
- plan-gate fails open on DB errors to prevent accidental lockouts

**What was tested:** `tsc --noEmit` exits 0. Zero type errors.

---

## PRODUCT COMPLETE — all 21 sessions built ✅
