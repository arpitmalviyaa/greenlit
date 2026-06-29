# Secrets

Status date: 2026-06-29

## Rules

- Store secrets only in the production secret manager.
- Never commit `.env`, `.env.local`, `.env.*.local`, `.pem`, or provider credentials.
- Never print secret values in CI logs.
- Rotate secrets after any suspected exposure.

## Required Production Secrets

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `GREENLIT_JWT_SECRET`
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Billing secrets when billing is enabled.

See `docs/ENVIRONMENT.md` for the full validation matrix.

## Rotation

1. Create replacement secret in provider.
2. Update deployment secret manager.
3. Redeploy.
4. Revoke old secret.
5. Run `npm run env:check` and live smoke tests.
