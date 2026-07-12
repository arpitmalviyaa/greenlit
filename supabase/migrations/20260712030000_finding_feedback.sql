-- Learning loop (retrieval-side, NOT model training): reviewer verdicts on
-- compliance findings become per-chunk feedback scores that nudge retrieval
-- ranking. Golden query→authority pairs for the eval script are derived from
-- accepted feedback (see scripts/corpus-eval.ts).

create table if not exists finding_feedback (
  id          uuid primary key default uuid_generate_v4(),
  finding_id  uuid not null references compliance_findings(id) on delete cascade,
  verdict     text not null check (verdict in ('accepted','rejected')),
  note        text,
  user_id     uuid,  -- auth.users id; plain uuid (no FK) so staging/prod stay portable
  created_at  timestamptz not null default now()
);

-- Service-role only, same posture as compliance_findings.
alter table finding_feedback enable row level security;

create index if not exists idx_finding_feedback_finding on finding_feedback (finding_id);

-- Per-chunk feedback score in [-1, 1]: mean of accepted(+1)/rejected(-1) over
-- every finding that cited the chunk. Retrieval adds a small nudge from this.
create or replace view chunk_feedback_scores
with (security_invoker = true) as
select
  unnest(cf.chunk_ids)                                                   as chunk_id,
  avg(case ff.verdict when 'accepted' then 1.0 else -1.0 end)::numeric   as score,
  count(*)                                                               as n
from finding_feedback ff
join compliance_findings cf on cf.id = ff.finding_id
group by 1;
