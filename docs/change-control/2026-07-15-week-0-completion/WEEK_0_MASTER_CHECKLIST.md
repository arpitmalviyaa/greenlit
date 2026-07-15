# Week 0 Master Checklist

States: **COMPLETE**, **PARTIAL**, **BLOCKED/MANUAL**, **AWAITING AUTHORIZATION**, **NOT STARTED**.

| Item | Sources | Beta gate | Owner | State | Evidence | Next action |
|---|---|---:|---|---|---|---|
| Clean repository baseline | `docs/WEEK0_REPORT.md`, `TASK_JOURNAL.md`, task brief | Yes | Codex | COMPLETE | `repository-baseline.md` | Keep clean through handoff |
| Push `website-v2-editorial` | `docs/WEEK0_REPORT.md`, task brief | No | Release owner | AWAITING AUTHORIZATION | Branch remains local | Review then `git push origin website-v2-editorial` |
| Verify reconciliation commits | reconciliation runbook, task brief | Yes | Codex | COMPLETE | `repository-baseline.md` | None |
| Align clone migration history | reconciliation evidence | Yes | Codex | COMPLETE | reconciliation folder; clone dry run up to date | Preserve clone link |
| Production migration-history repair | `SECURITY_REPORT.md`, `MANUAL_ACTIONS.md`, runbook | Yes | Change owner | BLOCKED/MANUAL | Backup CLI produced no completed-backup record; production untouched | Confirm fresh completed backup and approved window, then run exact runbook |
| 108/108 public-table RLS coverage | security/checklist/reconciliation | Yes | Codex | COMPLETE | prior `rls-results.md`; new migration changes no table/RLS inventory | Re-run during authorized production window |
| Password reset route/token handling | Week 0 report, Auth tests | Yes | Codex | COMPLETE | path-token route; `npm run test:auth` 10/10 | Verify production delivery after email checks |
| Confirmation and invitation path tokens | Auth report/manual actions | Yes | Codex + dashboard owner | PARTIAL | signup/recovery/invite callbacks pass clone tests; template still manual | Replace invitation template link and send controlled invite |
| Google provider UI/config | manual actions/checklist | Yes | Provider owner | PARTIAL | Button retained; production provider previously observed enabled | Verify console callback, consent publication, and private-window login |
| Apple dead button | manual actions/checklist | Yes | Codex | COMPLETE | Apple renders only with `NEXT_PUBLIC_APPLE_AUTH_ENABLED=true` | Configure Apple before setting flag |
| Signup ordering | task brief | Yes | Codex | COMPLETE | Registration, verification, then optional consent/workspace onboarding | Deploy and browser-test |
| Marketing consent lawfulness | migration and task brief | Yes | Codex | COMPLETE | Default false migration and optional post-verification checkbox | Apply migration to production only through release process |
| Jurisdiction hidden in onboarding | task brief | No | Codex | COMPLETE | No jurisdiction selector rendered in onboarding | None |
| Agency-only onboarding language | task brief | No | Codex | COMPLETE | Account type supports agency, manager, creator, brand | None |
| CAPTCHA/Turnstile application wiring | manual actions, task brief | Yes | Codex | PARTIAL | Widget and signup/login/recovery token wiring complete behind env key | Create keys, set Vercel env, enable Supabase CAPTCHA, run three negative/positive tests |
| Password minimum/leak protection | security audit/checklist | Yes | Dashboard owner | BLOCKED/MANUAL | Production previously observed min 6 and leak check off | Set min 8 and enable leaked-password protection |
| Session lifetime/inactivity/single-session | checklist/manual actions | Yes | Product/security owner | BLOCKED/MANUAL | No approved values | Decide values, configure, test expiry/refresh |
| Exact Site URL and redirects | checklist/manual actions | Yes | Dashboard owner | BLOCKED/MANUAL | Broad Vercel globs previously observed | Replace with exact production callback URLs |
| Resend SMTP/domain/delivery | Week 0 report/manual actions | Yes | Email owner | PARTIAL | SMTP configured and reset previously delivered; DNS/log state not independently reverified | Verify domain/SPF/DKIM, sender, suppression, and three controlled emails |
| Public analytics validation | task brief/security audit | Yes | Codex | COMPLETE | 2 KiB cap, allowlist, 30/min readiness, bounded metadata, tests | Replace process-local limiter if multi-instance guarantees are required |
| Security headers | task brief/security audit | Yes | Codex | COMPLETE | CSP, HSTS in production, no-store on sensitive/API routes, frame/referrer/permissions/nosniff | Verify on deployed response |
| Environment fail-closed/service role server-only | security reports | Yes | Codex | COMPLETE | `lib/env.ts`, server-only service client, security scan | Verify Vercel env scopes before deploy |
| Corpus URL SSRF | Week 0 security audit | Yes | Codex | COMPLETE | Exact env host allowlist and redirect rejection; test passes | Populate allowlist only with controlled public hosts |
| Dependency audit | Week 0 report/CI | Yes | Codex | COMPLETE | `npm audit`: 0 vulnerabilities | Keep Dependabot enabled |
| Dependabot/GitHub Actions/Gitleaks | Week 0 report/CI | Yes | Codex | COMPLETE | Pinned CI actions, npm audit/build/tests, Gitleaks job | Push to let GitHub run it |
| Storage buckets private/RLS | Supabase checklist | Yes | Codex | COMPLETE | Prior clone/live evidence: six private buckets and org-first policies | Recheck in production window |
| Per-bucket upload limits/MIME signatures | checklist/manual actions | Yes | Storage owner | BLOCKED/MANUAL | Limits unknown; must not guess evidence limits | Approve limits, configure, test allowed and rejected objects |
| Storage-byte backup/restore | checklist/manual actions | Yes | Infrastructure owner | BLOCKED/MANUAL | Database backups exclude object bytes | Configure object backup and complete restore drill |
| Daily DB backups | checklist/manual actions | Yes | Infrastructure owner | PARTIAL | Seven daily backups previously observed; no fresh completed record obtained this pass | Confirm fresh completed backup in dashboard |
| PITR decision | checklist/manual actions | No before invite beta; Yes before wider beta | Owner | BLOCKED/MANUAL | PITR previously off | Approve cost/RPO/retention and enable or accept documented risk |
| Database TLS enforcement | security audit/manual actions | Yes | Infrastructure owner | BLOCKED/MANUAL | Previously observed disabled | Verify every direct client requires TLS, then enable enforcement |
| Database network restrictions | security audit/manual actions | Yes | Infrastructure owner | BLOCKED/MANUAL | Previously `0.0.0.0/0`, `::/0` | Establish fixed egress/VPN; do not use Vercel dynamic IPs |
| Monitoring/advisors/log drain | checklist/manual actions | Yes | Infrastructure owner | BLOCKED/MANUAL | No live drain/alert test evidence; advisor findings remain | Triage advisors, configure destination/retention, trigger test alert |
| Full local regression/build/smoke | task brief | Yes | Codex | COMPLETE | `test-results.md` | Re-run after deploy |
| Live clone Auth/RLS re-run after new migration | task brief | Yes | Codex | PARTIAL | Prior 11/11 and 60/60 remain evidence; management API credential retrieval hung, so live suites were not rerun | Supply clone-scoped credentials and rerun three QA scripts |
| Production deploy and smoke | deployment docs/task brief | Yes | Release owner | AWAITING AUTHORIZATION | No push/deploy; current Vercel deployment SHA unknown | Clear blockers, push reviewed commits, deploy, run production-safe suite |
