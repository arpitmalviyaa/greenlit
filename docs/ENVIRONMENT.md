# Environment Validation

Status date: 2026-06-29

Run strict validation before production deploy:

```bash
npm run env:check
```

CI/local audit mode may allow missing deployment secrets:

```bash
npm run env:check -- --allow-missing
```

## Required In Production

- Frontend: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Backend: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GREENLIT_JWT_SECRET`
- Queue/worker: `GREENLIT_QUEUE_NAME`
- Email: `GREENLIT_EMAIL_PROVIDER`
- Storage: `GREENLIT_STORAGE_BUCKET`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- AI providers: at least one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Authentication: `GREENLIT_JWT_SECRET`

## Conditional

- Billing: configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `RAZORPAY_PLAN_ID_FREE`, `RAZORPAY_PLAN_ID_PRO`, `RAZORPAY_PLAN_ID_AGENCY`, `RAZORPAY_PLAN_ID_ENTERPRISE` together.
- Error monitoring: `SENTRY_DSN`.
- Runtime: `GREENLIT_ENV` must be `development`, `test`, `staging`, or `production`.
- Limits: `GREENLIT_RATE_LIMIT_PER_MINUTE` and `GREENLIT_REQUEST_TIMEOUT_SECONDS` must be positive numbers when set.

## Safe Defaults

- `GREENLIT_STORAGE_BUCKET=contracts`
- `GREENLIT_QUEUE_NAME=greenlit-background-jobs`
- `GREENLIT_EMAIL_PROVIDER=manual`

These defaults are safe for local/non-live checks only. Strict production validation
requires the operator to set the values explicitly.

## Email Provider Status

`GREENLIT_EMAIL_PROVIDER=manual` is non-live only and fails production readiness.
The shipped live-safe ingestion surface is `GREENLIT_EMAIL_PROVIDER=api`: an
authenticated upstream adapter may normalize Gmail, Outlook, IMAP, or webhook
messages into `POST /api/email/ingest`. Native Gmail, Outlook, SMTP, Resend, and
Postmark adapters are not implemented in this repo, so do not mark those providers
live-ready until an adapter and credential checklist are added.

No additional email credentials are read by the app today. The upstream adapter is
responsible for its own provider credentials and must not forward secrets to Greenlit.

Startup errors return `CONFIGURATION_ERROR` without exposing secret values.
