# Operations

Status date: 2026-06-29

## Daily Checks

- `/api/health`
- `/api/ready`
- 5xx rate below 1% over 5 minutes.
- Auth failures not spiking above baseline.
- Upload failures below 2% over 15 minutes.
- Queue `dead` jobs count is zero.
- Billing webhook signature mismatches are investigated immediately.
- Supabase RLS/storage errors are investigated immediately.

## Alert Thresholds

- API latency p95 above 2 seconds for 10 minutes.
- Contract review p95 above 60 seconds for 10 minutes.
- Upload p95 above 20 seconds for 10 minutes.
- Email ingest p95 above 10 seconds for 10 minutes.
- Queue job age above 15 minutes.
- Worker crash count above 1 in 10 minutes.
- Billing failures above 3 consecutive events.
- AI provider failures above 5% over 10 minutes.

## Logs

Structured request logs include `request_id`, `user_id`, `endpoint`, `status`, and `duration_ms`.

Failure logs should include `error_id`. Never log secrets, tokens, raw uploaded documents, or full email bodies.

## Workers

Workers process `background_jobs` from `GREENLIT_QUEUE_NAME`. Failures must preserve payload IDs, attempt counts, and error IDs for replay analysis.

## Email

`manual` email mode is for local/non-live operation only. Production readiness
requires `GREENLIT_EMAIL_PROVIDER=api` plus an authenticated upstream adapter that
posts normalized messages to `/api/email/ingest`. Gmail, Outlook, SMTP, Resend,
and Postmark credentials are not consumed directly by this app today.

When email ingestion is live, verify that the upstream adapter retries safely,
records provider message IDs, and does not log credentials or raw message bodies.
