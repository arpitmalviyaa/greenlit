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
