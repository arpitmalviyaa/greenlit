# Greenlit Master Build — 2026-07-12

Branch: `website-v2-editorial`. Prod Supabase: `ovjqzgzqcyowitjfwptz` ("mike-oss" — misleading name, IS prod). Staging: `xjlhtwsbfpsxwsnkkkzz`. Prod deploys manual; prod migration apply is a hard gate.

## Stage 0 — pgvector migration reconciled ✅ (commit `fede799`)
- `supabase/migrations/20260712000000_move_extensions_out_of_public.sql` — idempotent `ALTER EXTENSION vector|pg_trgm SET SCHEMA extensions`, guarded on current schema.
- Applied to **staging**; prod already had it out-of-band. Verified `extension_in_public` clear on **both** projects via `get_advisors(security)`.
- Grepped repo: no hardcoded `public.vector` / `public.gin_trgm_ops`; retrieval uses supabase-js `.textSearch` (search_path-based).
- Bonus (same run, commit `553db1b`): corpus admin gained a Link tab (blog URL ingest via `lib/utils/html-to-text.ts`), `extract-text.ts` accepts text/plain, master portal links to `/admin/corpus` + `/admin/startup`.

## Stage 1 — Legal-authority layer ✅
- Migration `20260712010000_legal_authority_layer.sql` (**applied to staging**):
  - `corpus_doc_kind` += `act, statute, rule, regulation, notification, circular, case_law, guideline`.
  - `corpus_documents` += `jurisdiction (default 'IN'), citation, section_ref, issuing_body, effective_date, superseded_by (self-FK), source_url, authority_weight (numeric, default 0.5)`.
  - `corpus_chunks` += `citation, section_ref` (denormalized so retrieval cites the exact provision join-free).
  - Decision: **no separate `authority_type` column** — `doc_kind` is the authority type (one source of truth; spec allowed either).
- `lib/corpus/authority.ts` — kind list + weights (acts/statutes 1.0 > rules/regs 0.9 > notifications/circulars 0.8 > case law/judgments 0.7 > guidelines 0.6 > house 0.5).
- `lib/corpus/chunk.ts` — new `chunkSections()`: statutory text splits per section ("Section 12", "12.", "12A.", "Rule 4"), each chunk carries `section_ref` (`s.12A`, `r.4`); oversized sections re-wrap keeping the ref; unstructured text falls back to null refs.
- `lib/corpus/pipeline.ts` — `IngestInput.authority{}` metadata; authority docs chunk by section and **skip AI stance-classification** (statutes have no stance → saved `ready`/`market_standard`, zero Haiku spend); reprocess path routes authority docs the same way.
- `lib/corpus/embed.ts` — built early (pipeline imports it): OpenAI `text-embedding-3-small` (1536d), batched, 30s timeout; **no `OPENAI_API_KEY` → logs "embeddings disabled" once and returns null** (ingest never fails on embedding problems).
- `scripts/corpus-seed.ts` — accepts an authority **manifest** (`corpus-seed.ts manifest.json`): `{path, kind, citation, jurisdiction, effective_date, issuing_body, source_url, vertical, title, authority_weight}`; relative paths resolve against the manifest dir. Folder mode unchanged.
- Tests: `tests/corpus-chunk.test.mjs` +4 cases (section refs, sub-clause containment, rule refs, fallback, oversized-ref retention) — 9/9 pass. `tsc --noEmit` clean.
- **No documents ingested** (deferred by design).

## Stage 2 — Grounded compliance framework ✅
- Migration `20260712020000_compliance_findings.sql` (**applied to staging**): `compliance_findings` table (issue/severity/statute_citation/section_ref/explanation/suggested_fix/confidence/`chunk_ids uuid[]`/vertical/feature; `contract_id` FK added conditionally — staging has no `contracts` table). RLS enabled, **no policies = service-role only, intentional** (findings reach clients only via the analysis API response).
- `lib/corpus/retrieve.ts` — hits now carry `citation/section_ref/source_url/authority_weight`; new `kinds` filter; superseded authorities excluded (`superseded_by is null`); ranking = authority_weight desc, then stance (house-only retrieval unchanged: all weights 0.5).
- `lib/corpus/compliance.ts` — `complianceCheck({text, vertical, feature, contractId})`:
  1. retrieves authority chunks (kinds=AUTHORITY_KINDS, k=12) + house clauses (k=6), vertical-scoped, sanitized-gated;
  2. **no authority retrieved → `no_authority_matched`, zero LLM spend**;
  3. Haiku triage (which extracts plausibly apply) → Sonnet depth (structured findings, `cited_chunks` indexes **required min 1** in schema);
  4. grounding contract enforced in code: findings whose citations don't resolve to the retrieved set are dropped;
  5. persists to `compliance_findings` + provenance to `analysis_corpus_refs` (feature `compliance:<parent>`); both fire-and-forget.
  - Never throws — always returns `{status, findings}`; parent analysis unaffected by any failure.
- Wired into `counsel.analyse` (contract raw text) and `counsel.redflags` (clause JSON); responses gain `compliance`.
- UI: `ResultScreen` gains a "Statutory check" section (severity tag, explanation, suggested fix, **clickable citations** via doc `source_url`); contracts page threads findings through. ResultScreen is shared by contracts + content checks, so both surfaces get it.
- Flag: `FLAGS.complianceCheck = false` (default OFF — flag short-circuits before any retrieval/LLM call).
- `tsc --noEmit` clean.

## Stage 3 — Learning / feedback loop (retrieval-side, NOT model training) ✅
- Migration `20260712030000_finding_feedback.sql` (**applied to staging**): `finding_feedback` (finding_id FK → compliance_findings, verdict accepted|rejected, note, user_id) + `chunk_feedback_scores` view (security_invoker; per-chunk mean score in [-1,1] over every finding that cited it). RLS on, service-role only.
- Findings now carry a pre-generated `id` (compliance.ts, `randomUUID`) so feedback anchors without a read-back.
- `POST /api/compliance/feedback` — authed; inserts verdict; FK miss → 404.
- UI: thumbs up/down on every Statutory-check card (optimistic, one vote per render).
- Retrieval ranking: `search()` fetches `chunk_feedback_scores` for its hits (one extra query, best-effort) and nudges effective weight by `score × 0.1` — feedback can re-order within a tier but never lets house knowledge outrank an act.
- Golden set: `tests/golden-set.json` (hand-curated; starter file with a skipped example) **plus** auto-derived pairs from accepted feedback on query-backed findings.
- `scripts/corpus-eval.ts` — runs the golden set through real `search()`, reports precision@k / recall@k per query + aggregate, optional `--min-recall` gate for CI.
- Fine-tuning path: explicitly NOT built. It is a separate decision needing a labeled dataset + cost sign-off; the feedback data collected here (finding_feedback + golden set) would be its training corpus if ever green-lit.

## Stage 4 — Embeddings + true hybrid retrieval ✅
- Ingest-side embedding landed with Stage 1 (`lib/corpus/embed.ts`, wired into both chunk-save paths).
- Migration `20260712040000_vector_search.sql` (**applied to staging**):
  - `hnsw` index on `corpus_chunks.embedding` (cosine; opclass schema-qualified `extensions.vector_cosine_ops` since pgvector moved out of public).
  - `match_corpus_chunks(query_embedding, match_count, verticals, kinds)` RPC — same visibility gates as tsv (ready + sanitized + not-superseded + vertical scope), `set search_path=''` with `operator(extensions.<=>)`; EXECUTE revoked from public/anon/authenticated (service-role only).
- `lib/corpus/retrieve.ts` — `search()` is now hybrid: tsv leg + vector leg in parallel, merged by **RRF** (k=60) to pick the candidate pool, then the existing authority-weight + feedback + stance ranking applies unchanged. **No `OPENAI_API_KEY` (or no embedded rows) → vector leg returns [] and behaviour is exactly tsv-only** — no hard fail, logged once. Callers untouched (the header-comment promise held).
- `scripts/corpus-backfill-embeddings.ts` — idempotent backfill for null-embedding rows; batches; aborts cleanly and is safe to re-run.
- Env: `OPENAI_API_KEY` (text-embedding-3-small, 1536d = the existing column). **Not present in `.env.local` — manual step.**
- `tsc` clean; chunker tests 9/9.

## Stage 5 — Admin surface, advisor closeout, startup ops, tests ✅
### Admin
- Master portal links to `/admin/corpus` + `/admin/startup` (done in the earlier session, commit `553db1b`).
- Authority-ingest view: the corpus Upload tab's kind dropdown now has a "Legal authority" optgroup (act/statute/rule/regulation/notification/circular/case_law/guideline); picking one reveals citation / jurisdiction / effective date / issuing body / source URL fields, passed through the API to `ingestDocument`. Link tab can also ingest as any kind. Sanitized toggle already existed in Library (unchanged gate).
### Security advisor closeout — `20260712050000_security_advisor_closeout.sql` (**PROD-ONLY, not yet applied — hard gate**)
- 9 fns pinned `search_path=''` with schema-qualified bodies (get_user_org_id, get_user_role, same_org, handle_updated_at, update_updated_at_column, update_claims_updated_at, fn_approval_to_timeline, fn_invoice_paid_timeline, fn_delivery_lock_timeline). CREATE OR REPLACE keeps triggers/policies bound.
- `platform_creator_overview`: EXECUTE revoked from public/anon/authenticated; body redefined without the `auth.uid()` self-gate (it returns zero rows under the service role); `/api/master/overview` now does the platform_admins check itself then calls via **service client** (code changed in this commit — deploy together with the migration).
- `analytics_events` + `scope_items`: RLS-no-policy documented as intentional service-role-only via table comments (scope_items has zero code references — legacy, flag OFF).
- `early_access`: always-true anon INSERT policy **dropped** — zero code paths use it (all "Get early access" CTAs route to /signup).
- NOTE: this migration is NOT applicable to the corpus staging project (none of these objects exist there). `auth_leaked_password_protection` is a dashboard toggle — manual step.
### Startup ops
- `reprocessStartupDocument()` in `lib/startup/run.ts` + `POST /api/admin/startup/doc/[id]` — re-downloads from storage, re-extracts text, re-runs term extraction, flips `failed → ready`. Does NOT regenerate the memo (reviewer edits or re-creates the matter).
- Admin startup UI: matters list shows an "N memos awaiting review" banner (fixes drafts-wait-silently); matter detail shows failed documents with a one-click Reprocess button.
- Reviewer assignment/notification: NOT built — single-platform-admin operation today and email infra is blocked on founder Resend/DNS; the awaiting-review banner covers the operational gap. Revisit when there is >1 reviewer.
- FK decision: `workspace_id` / `prepared_for` STAY free-text/no-FK — the startup tool is admin-only and single-tenant today; the ponytail comment in `20260708000001` already marks the upgrade path (add FK + same_org RLS when the tenant-facing UI ships).
### Tests
- `tests/helpers/alias-loader.mjs` + `register-loader.mjs` — Node resolve hooks: `@/` alias → repo root, extensionless relative `.ts` imports, `next/*` subpath `.js` fix, and mock substitution for `@/lib/corpus/admin` + `@/lib/supabase/server`. Enables true route-level tests without a Next server.
- `tests/export-gate.test.mjs` (route-level, real handler): draft → **403**, reviewed → 200 HTML, missing → 404, non-admin → 404. 4/4.
- `tests/compliance-grounding.test.mjs`: grounding contract on the exact production code path (`resolveGroundedFindings`, extracted pure) — every finding ≥1 resolved citation, out-of-range-only findings dropped, invalid indexes stripped, section_ref fallback, flag-OFF short-circuit. 5/5.
- npm scripts: `test:corpus`, `corpus:eval`. Full run: 9 chunker + 9 route/grounding tests pass; `tsc` + eslint clean.

## Migrations table
| File | Staging (xjlhtwsbsfpsxwsnkkkzz*) | Prod (ovjqzgzqcyowitjfwptz) |
|---|---|---|
| `20260712000000_move_extensions_out_of_public.sql` | ✅ applied | ✅ pre-existing (out-of-band, now reconciled) |
| `20260712010000_legal_authority_layer.sql` | ✅ applied | ⏳ pending go-ahead |
| `20260712020000_compliance_findings.sql` | ✅ applied (FK conditional — no contracts table there) | ⏳ pending go-ahead |
| `20260712030000_finding_feedback.sql` | ✅ applied | ⏳ pending go-ahead |
| `20260712040000_vector_search.sql` | ✅ applied | ⏳ pending go-ahead |
| `20260712050000_security_advisor_closeout.sql` | ✖️ N/A (app schema absent — prod-only) | ⏳ pending go-ahead |

*staging project id: xjlhtwsbfpsxwsnkkkzz

## Commits this run
- `fede799` Stage 0 — pgvector reconcile (prior session, same day)
- `553db1b` Link ingest + admin nav links (prior session, same day)
- `1c7e582` Stage 1 — authority layer
- `4b9c92f` Stage 2 — compliance layer
- `6311463` Stage 3 — feedback loop
- `d777ed6` Stage 4 — hybrid retrieval
- `558af29` Stage 5 — admin/authority view, advisor closeout, startup ops, tests
- (this commit) deliverables: BUILD_LOG final, MANUAL_STEPS refresh

## Test summary (all green at HEAD)
- `tests/corpus-chunk.test.mjs` 9/9 (chunker + statutory sections)
- `tests/compliance-grounding.test.mjs` 5/5 (grounding contract, production code path)
- `tests/export-gate.test.mjs` 4/4 (route-level 403 review-gate)
- Pre-existing: startup-logic 9/9, vertical-scope 5/5, redflags-schema 5/5
- `tsc --noEmit` clean, eslint clean, dev server compiles with zero errors

## Blocked on user (see MANUAL_STEPS.md)
1. `OPENAI_API_KEY` (embeddings stay gracefully off without it)
2. Prod migration applies 1-5 (hard gate)
3. `vercel deploy --prod` (hard gate)
4. Leaked-password dashboard toggle (may be plan-gated)
5. Document ingest + sanitize + legal review, then `complianceCheck` flag flip
