# Production Security Audit

Status date: 2026-06-29

## Automated Gate

```bash
npm run security:audit
```

The gate scans active source for hardcoded secret patterns, unsafe dynamic HTML/code execution, service-role client leakage, raw provider/database error exposure, placeholder markers in production code, billing webhook signature checks, request IDs, and security headers.

## Findings Fixed for GA

- Billing webhook no longer accepts unsigned requests when `RAZORPAY_WEBHOOK_SECRET` is missing.
- Billing webhook uses constant-time signature comparison.
- Billing subscription creation no longer writes local fallback provider IDs.
- Upload route returns sanitized errors with `error_id`.
- Middleware emits request IDs, authenticated user IDs when available, durations, and security headers.
- Supabase env access now throws named startup errors instead of non-null assertion crashes.
- Comments are reachable through an authenticated org-scoped route instead of only persistence.

## Remaining Manual Verification

- Live CORS and CSP behavior in the deployed domain.
- Supabase dashboard policies, functions, cron jobs, and realtime publication settings.
- Provider audit logs for Razorpay, Supabase, and AI vendors.
- Sentry or chosen monitoring provider project wiring.

## Data Classes

- Restricted: credentials, JWT secrets, service role key, uploaded contract files.
- Confidential: contract text, comments, email negotiation context, review output.
- Internal: audit logs, background job payloads, performance reports.
