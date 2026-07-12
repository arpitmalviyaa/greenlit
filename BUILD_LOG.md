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
