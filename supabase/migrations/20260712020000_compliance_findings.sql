-- Grounded compliance layer: structured statutory findings emitted by
-- complianceCheck (lib/corpus/compliance.ts). Every finding cites the authority
-- chunks that grounded it (chunk_ids) — un-grounded findings are dropped in code.
--
-- Service-role only (like the corpus itself): RLS enabled with NO policies is
-- intentional — the anon/authenticated roles must never read raw findings;
-- they arrive through the API response of the analysis that produced them.

create table if not exists compliance_findings (
  id               uuid primary key default uuid_generate_v4(),
  contract_id      uuid,             -- null for free-text queries; FK added below when contracts exists
  feature          text not null,    -- 'counsel.analyse' | 'counsel.redflags' | ...
  vertical         vertical not null default 'creator',
  issue            text not null,
  severity         text not null check (severity in ('low','medium','high','critical')),
  statute_citation text not null,
  section_ref      text,
  explanation      text not null,
  suggested_fix    text,
  confidence       numeric not null check (confidence >= 0 and confidence <= 1),
  chunk_ids        uuid[] not null,  -- grounding: the cited corpus_chunks
  query            text,             -- free-text query when contract_id is null
  created_at       timestamptz not null default now()
);

-- The staging corpus project has no contracts table; only add the FK where it exists.
do $$
begin
  if to_regclass('public.contracts') is not null
     and not exists (select 1 from pg_constraint where conname = 'compliance_findings_contract_id_fkey') then
    alter table compliance_findings
      add constraint compliance_findings_contract_id_fkey
      foreign key (contract_id) references contracts(id) on delete cascade;
  end if;
end $$;

alter table compliance_findings enable row level security;

create index if not exists idx_compliance_findings_contract on compliance_findings (contract_id) where contract_id is not null;
