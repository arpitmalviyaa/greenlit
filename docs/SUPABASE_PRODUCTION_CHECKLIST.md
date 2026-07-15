# Supabase Production Readiness Checklist

Audit date: 15 July 2026

Status: **❌ BLOCKED — do not run `supabase db push` or open public beta yet.**

## ✅ Already configured

| Control | Evidence | Risk | Time |
|---|---|---:|---:|
| Production Site URL | `https://app.getgreenlit.in` | Low | Done |
| Email confirmations | Required; auto-confirm is off | Low | Done |
| Recovery and confirmation path-token templates | Both use `/auth/confirm/<type>/<TokenHash>` | Low | Done |
| Resend custom SMTP | `smtp.resend.com:587`, sender `noreply@mail.getgreenlit.in`, credentials present | Low | Done |
| SPF, DKIM, DMARC, provider MX | Public DNS resolves; DMARC is `p=quarantine` | Low | Done |
| Refresh token rotation | Enabled, reuse interval 10 seconds | Low | Done |
| JWT lifetime | 3,600 seconds | Low | Done |
| Anonymous Auth | Disabled | Low | Done |
| Unused Auth providers | Disabled | Low | Done |
| Google in Supabase | Enabled with client ID and secret present | Medium until external callback check | 10 min manual check |
| RLS | Enabled on all 108 public tables | Low | Done |
| Primary keys | Present on every public table | Low | Done |
| Security-definer functions | API execution revoked; fixed search paths | Low | Done |
| Storage privacy | All six buckets private | Low | Done |
| Signed downloads | Signed URLs used; no public URL generation found | Low | Done |
| Edge Functions | None deployed; no unverified function endpoint exists | Low | Done |
| Service-role isolation | Server-only environment variable; not exposed as `NEXT_PUBLIC_*` | Low | Done |
| Daily backups | Seven completed physical backups retained | Medium because RPO is 24h | Done |
| Advisors | Security and Performance Advisors are available and were reviewed | Low | Done |
| CI secret/dependency/build gates | Gitleaks, Dependabot, npm audit, tests, and build; no deployment | Low | Done |

## ❌ Blocking issues

| Blocker | Risk | Time to fix | Exit criterion |
|---|---:|---:|---|
| Migration history divergence | Critical | 2-4 hours plus staging validation | Local and remote histories match; staging clone accepts `db push --dry-run` with no replayed DDL |
| Database SSL enforcement off | High | 30-60 min | Every client verified with TLS, enforcement enabled, health checks pass |
| Direct DB open to all IPv4/IPv6 | High | 1-2 hours | Direct endpoint limited to approved egress; runtime uses pooler where appropriate |
| Apple button points to a disabled provider | High | 1-3 hours depending on Apple credentials | Apple end-to-end login succeeds, or a separately approved app change removes the unavailable option |
| Storage object recovery not established | High | 2-4 hours | All bucket bytes exported to a separate trust domain and a sample restore succeeds |
| Password minimum/leak checks | Medium | 10 min plus auth regression | Minimum 8 and leaked-password protection enabled; signup/reset tests pass |
| Invitation template uses query token | Medium | 20 min | Path-token invite template verified end to end |

## ⚠ Needs manual dashboard action

| Setting | Current | Recommended decision | Risk | Time |
|---|---|---|---:|---:|
| Redirect allow-list | Production plus broad Vercel wildcards | Exact production callback URLs only; use a separate preview project | Medium | 15 min |
| Session maximum | Unlimited | Approve a maximum such as 7 days based on legal/security policy | Medium | 10 min |
| Inactivity timeout | Unlimited | Approve a timeout such as 24 hours | Medium | 10 min |
| Concurrent sessions | Multiple | Decide whether public beta permits multiple devices; do not change without product approval | Medium | 10 min |
| CAPTCHA | Unset | Cloudflare Turnstile on signup/login/recovery | Medium | 30-60 min plus UI wiring |
| Auth email rate | 60/hour project-wide | Review against beta volume and abuse model; do not lower blindly | Low | 10 min |
| Google Console callback | Cannot be observed from Supabase | Verify `https://ovjqzgzqcyowitjfwptz.supabase.co/auth/v1/callback` | High if absent | 10 min |
| Resend domain status/logs | Cannot be observed with current credentials | Confirm domain Verified and inspect latest deliveries | Medium | 10 min |
| Bucket size/MIME limits | None | Set per bucket after confirming formats; start from app caps (contracts 15 MB, proof 25 MB, corpus/startup 15 MB) | Medium | 30 min |
| PITR | Disabled | Enable if a 24-hour RPO is unacceptable | Medium | 15 min plus cost approval |
| Restore drill | Not run | Restore to a separate project; never test by overwriting production | High | 1-2 hours |
| Log drain/retention | Not verified | Select S3/OTLP/Sentry destination and retention policy | Medium | 30-90 min |
| Performance Advisor | 355 recommendations | Prioritize 92 RLS init-plan fixes and polling; observe before dropping indexes | Low now | 1-3 days staged |

## Release gate

Public beta may proceed only when every ❌ item has an owner, the migration history is reconciled and tested in a clone, SSL/network controls are active, Apple is no longer a dead authentication path, and database plus Storage recovery drills have passed. All remaining ⚠ items must have a documented risk acceptance if not completed.
