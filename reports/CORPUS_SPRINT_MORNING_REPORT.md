# Q1 Corpus Sprint — Morning Report (Day 0)

Branch: `q1-corpus-sprint` (pushed). Base: `website-v2-editorial` (the live production code — see decision below). Preview: building on Vercel, URL publishes as a GitHub check on the branch / in the Vercel `greenlit` project.

## What shipped (code complete, build + type-check + lint + offline tests all green)
1. **Corpus data layer** — `035_corpus.sql`: `corpus_documents`, `corpus_chunks` (tsv generated col + GIN, nullable `embedding vector(1536)` unpopulated), `analysis_corpus_refs`, enums, service-only RLS (deny-all for client roles), private `corpus` storage bucket.
2. **Admin panel** — `/admin/corpus` (404 for non-admins via `platform_admins` gate) with Upload (drag-drop + per-file form), Library (table → drill-in → inline chunk edit / delete / reprocess / delete doc), Quick-note (founder_annotation → stance=founder_approved). API: `/api/admin/corpus/*`.
3. **Pipeline** — extract → clause-aware chunk (`lib/corpus/chunk.ts`, ~800-tok fallback) → one canonical structured AI classify call per batch → save `ready`/`needs_review` by confidence.
4. **Retrieval wiring** — `lib/corpus/retrieve.ts` `search()`/`houseKnowledge()` injected into `counsel.analyse` + `counsel.redflags`, token-capped (~2.5k), ranked (founder_approved/dispute_source first), logs chunk IDs to `analysis_corpus_refs`. Empty corpus = today's behaviour exactly.
5. **One-click Verify** — Claude-vision OCR for images + scanned PDFs (`lib/utils/vision-extract.ts`, page cap 40) wired into `extractTextFromBuffer`; agency Contracts + `counsel/upload` accept photos (JPG/PNG/WEBP/HEIC), picker widened, 15 MB limit.
6. **Seed** — `scripts/corpus-seed.ts` (folder → same pipeline, `npx tsx`).
7. **QA** — chunker unit test (green); corpus-RLS assertion added to `qa-cross-tenant` (auto-skips until migration applied).

## Flagged for review / not fully verified tonight
- **Migration NOT applied to prod DB** — respected "prod after founder OK" + repo's create-only convention. This is the ONE unblocking action (below). Until applied: admin upload, seed run, RLS-live-verify, and corpus-retrieval log evidence are pending.
- **Photo → verdict works without the migration** (vision extraction feeds the existing analyse flow) — testable on the preview immediately.
- **HEIC**: accepted at the boundary but returns a friendly "use JPG/PNG" error — no transcoder installed (Week-1: add heic-convert). JPG/PNG/WEBP/PDF-photo work fully.
- **Verify UX flattening**: agency Contracts is already a single dropzone (no doc-type selector); creator Check-tab uses the same shared backend. Honest per-stage progress labels + a dedicated flattened creator mobile screen = light polish, not done tonight.
- **Middleware**: skipped a global middleware; every admin route + the page do a DB-backed 404 gate (same net effect, less surface).

## Decision needed (one)
**Apply `supabase/migrations/035_corpus.sql` to the greenlit Supabase project**, then run `npm run qa:cross-tenant` (corpus RLS check activates) and load `/admin/corpus` to ingest the 50+ Day-1 docs (or `npx tsx scripts/corpus-seed.ts <folder>`). Migration is purely additive (new tables/types/index/bucket, service-only) — zero impact on existing tables or tenants.

## Branch-base decision (FYI)
Sprint said "off the current production branch" and "don't mix the two branches." The canonical structured-output helper the sprint requires exists only on `website-v2-editorial`, and Vercel production deploys run from that branch — so it IS the live code. Branched off it; "the two branches" = this vs the separately-queued v2 *marketing* prompt, which is untouched.
