# Week 0 Repository and Release Baseline

Captured: 2026-07-15T17:12:36Z

| Item | Verified state |
|---|---|
| Repository | `/Users/arpitmalviya/Downloads/greenlit` |
| Branch | `website-v2-editorial` |
| Starting HEAD | `21bf18096cd139ad320ddf0b8c6f7b3d9d3af559` |
| Starting remote delta | 0 behind, 4 ahead of `origin/website-v2-editorial` |
| Starting worktree | Clean; no untracked files |
| Remote | `origin`, GitHub repository `arpitmalviyaa/greenlit` |
| Supabase link | Clone `juhwnamjakmkvixxwrvv`, explicitly verified before every CLI mutation |
| Production Supabase | `ovjqzgzqcyowitjfwptz`; never linked or modified in this pass |
| Vercel link | Team `anal-s-projects`, project `greenlit`, ID `prj_dd5ZDvzbDwMWsdefQhg9O4YdCxrt` |
| Vercel production | Deployment `dpl_xiLCX7A4DE8qxw99hv2bv6wbYM9p`, READY, alias `app.getgreenlit.in`, created 2026-07-15 17:01:52 IST |
| Deployment source SHA | Not exposed by Vercel inspection (`gitSource: null`); cannot prove deployment contains this branch |
| Production branch | Not exposed in local Vercel project metadata; GitHub remote has `main` and `website-v2-editorial` |
| Preview branch | No dedicated preview branch is configured in repository metadata; preview deployments exist |
| Package manager | npm, lockfile tracked |
| Node | v24.13.0 |
| npm | 11.6.2 |
| Supabase CLI | 2.109.1 |
| Vercel CLI | 56.2.0 |

## Reconciliation commit verification

`git show --stat`, patch inspection, `git diff --check`, and focused secret-pattern scans were run for:

- `18a6af8`: analytics migration and sanitized migration evidence only.
- `4b0a9e4`: clone Auth/application/two-tenant QA scripts only; credentials are read from environment variables.
- `21bf180`: sanitized reconciliation evidence and documentation only.

No credential value was found. References to secret variable names such as `SUPABASE_SERVICE_ROLE_KEY` are intentional and contain no value.

## Remote/deployment conclusion

The branch was not pushed. At the end of the code work it was six commits ahead before the documentation commit. Vercel has a READY production deployment, but the CLI returned no Git source SHA, so it is not evidence that any local Week 0 commit is deployed.
