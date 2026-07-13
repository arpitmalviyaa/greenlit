-- Post-closeout fix: revoking EXECUTE from PUBLIC (vector_search +
-- security_advisor_closeout) also stripped the default grant service_role
-- relied on, locking the ONLY intended caller out of both RPCs. Grant it back
-- explicitly. Applied to prod and staging on 2026-07-13 (staging got only the
-- match_corpus_chunks grant — platform_creator_overview doesn't exist there,
-- hence the guard).

grant execute on function public.match_corpus_chunks(extensions.vector, int, text[], text[]) to service_role;

do $$
begin
  if to_regproc('public.platform_creator_overview') is not null then
    grant execute on function public.platform_creator_overview() to service_role;
  end if;
end $$;
