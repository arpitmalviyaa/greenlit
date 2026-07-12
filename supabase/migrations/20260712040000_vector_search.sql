-- True vector search: hnsw index + match RPC for the hybrid (tsv + vector RRF)
-- retrieval branch in lib/corpus/retrieve.ts.
--
-- pgvector lives in the `extensions` schema (20260712000000), so the operator
-- and opclass are schema-qualified — this migration must work under any
-- search_path.

-- hnsw over cosine distance. Beats ivfflat at this corpus size (no training
-- step, fine for < ~1M rows).
create index if not exists idx_corpus_chunks_embedding
  on corpus_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Vector match with the same visibility gates as tsv retrieval: ready + sanitized
-- + not superseded + vertical scope. kinds narrows to authority docs when the
-- compliance layer calls it. SECURITY INVOKER — only the service role reaches
-- this (RLS on the underlying tables blocks anon/authenticated regardless).
create or replace function match_corpus_chunks(
  query_embedding extensions.vector(1536),
  match_count     int    default 12,
  verticals       text[] default array['creator','general'],
  kinds           text[] default null
)
returns table (
  id uuid, document_id uuid, content text, clause_type text, risk_note text,
  stance text, citation text, section_ref text,
  deal_type text, doc_kind text, source_url text, authority_weight numeric,
  distance double precision
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.document_id, c.content, c.clause_type, c.risk_note,
         c.stance::text, c.citation, c.section_ref,
         d.deal_type::text, d.doc_kind::text, d.source_url, d.authority_weight,
         (c.embedding operator(extensions.<=>) query_embedding)::double precision as distance
  from public.corpus_chunks c
  join public.corpus_documents d on d.id = c.document_id
  where c.status = 'ready'
    and d.status = 'ready'
    and d.sanitized = true
    and d.superseded_by is null
    and c.vertical::text = any(verticals)
    and c.embedding is not null
    and (kinds is null or d.doc_kind::text = any(kinds))
  order by c.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;

-- Callable by the service role only.
revoke execute on function match_corpus_chunks(extensions.vector, int, text[], text[]) from public, anon, authenticated;
