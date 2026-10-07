# AgentDesk Production Security Baseline

This document is the security gate for moving AgentDesk from Vibe Coding to production SaaS.

## Security target

Use OWASP ASVS 5.0 as the baseline. The default target is ASVS Level 2, with higher assurance controls for platform administration, billing, credentials, and tenant isolation.

## Architecture

- Cloudflare DNS + Cloudflare Tunnel for public ingress.
- No direct public exposure of the origin VPS.
- AgentDesk, PostgreSQL and n8n on private Docker networking initially.
- PostgreSQL is never published to the Internet.
- n8n editor is never exposed to customers.
- Production secrets exist only in the server secret store or protected environment file.
- Customer traffic reaches AgentDesk through HTTPS.
- Staging and production are separate environments.

## Mandatory controls before first production customer

1. Strong platform admin password and secret rotation procedure.
2. Multi-tenant authorization on every tenant-owned read/write path.
3. CSRF protection for cookie-authenticated state changes.
4. Secure, HttpOnly, SameSite cookies with Secure in production.
5. Authentication rate limiting and account lockout.
6. Request body size limits.
7. Generic 5xx error responses. Do not expose stack traces or database errors.
8. Security headers and HSTS.
9. Dependency vulnerability scanning and regular updates.
10. PostgreSQL backups with tested restore.
11. Audit logging for admin actions, authentication events, billing, integrations and tenant changes.
12. Twilio webhook signature validation using the provider SDK.
13. Razorpay webhook signature validation and idempotency.
14. No secrets in source control, client bundles, logs or error messages.
15. Cloudflare WAF/rate limiting for public attack surfaces.
16. Monitoring and alerting for authentication failures, 4xx/5xx spikes, unusual lead creation, billing anomalies and webhook failures.

## AI Employee voice security

- Lead calling requires explicit consent.
- Human transfer targets are server-side configuration only.
- Never trust a phone number or tenant ID supplied by a public browser as an authority.
- Validate Twilio webhook signatures against the exact public URL.
- Limit call duration, turns and retry attempts.
- Do not expose internal tenant knowledge to voice responses.
- Keep provider credentials server-side.

## Deployment rule

No direct edits on production.

GitHub -> CI checks -> staging -> acceptance test -> production deployment.

Every production release must have a rollback path.

## Important limitation

No software can honestly guarantee that a website will never be hacked. The objective is to reduce attack surface, prevent common classes of compromise, detect attacks quickly, and make recovery reliable.
