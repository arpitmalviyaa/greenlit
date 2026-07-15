# Unresolved Manual Actions

These items were not completed or claimed during clone validation.

## Required before public beta

1. **Authorize and execute production history repair.** Clone proof is complete, but production still has the original version identifiers. Follow `production-runbook.md` only after a fresh completed backup and maintenance approval.
2. **Enable database SSL enforcement** after every direct connection has been verified with TLS.
3. **Remove unrestricted direct-database CIDRs** (`0.0.0.0/0`, `::/0`) after fixed administration/CI egress is known.
4. **Resolve Apple Auth.** Production exposes the Apple button while Apple is disabled/unconfigured. Configure Apple end to end or separately authorize hiding the button.
5. **Verify Google externally.** Supabase production has Google credentials, but the Google Console callback/consent configuration requires dashboard verification and a real browser login.
6. **Verify Resend delivery and domain status.** Clone recovery acceptance and token handling passed, but clone SMTP is unset and delivery was not asserted. Check production Resend delivery logs/domain status with a controlled mailbox.
7. **Harden the invitation template.** Production still uses query-based `ConfirmationURL`; change it to the path-token invite route and test one real invitation.
8. **Strengthen Auth policy.** Set minimum password length to 8 and enable leaked-password protection; approve session maximum, inactivity, and concurrency policy.
9. **Configure CAPTCHA.** Add Turnstile/hCaptcha only with the matching application token wiring.
10. **Establish Storage object backup/restore.** Database backups do not restore object bytes.
11. **Set bucket size/MIME rules only after product values are confirmed.** Clone confirms all six buckets are private but all limits are null.
12. **Decide PITR and log-retention policy.** Production PITR is disabled and no external log drain was verified.

## Clone-specific facts

- Clone Auth Site URL is `http://localhost:3000`; redirect allow-list is empty.
- Clone Google and Apple providers are disabled and have no credentials.
- Clone SMTP is unset.
- Therefore clone tests prove application/session/token semantics, not provider-console configuration or actual message delivery.

## Storage path clarification

- Tenant buckets `contracts`, `proof-vault`, `claim-evidence`, and `ip-evidence` use organisation-ID prefixes and passed cross-tenant upload/download tests.
- `corpus` and `startup-docs` use UUID-prefixed service-only paths. They are not tenant buckets, and their client data tables deny anon/authenticated access.
