# Security Policy

## Reporting a vulnerability

If you find a security issue in Triangle Price Book, please report it
privately rather than opening a public issue:

- **Email:** hello@longsitelabs.com
- Include a description of the issue, steps to reproduce it, and the
  impact you believe it has.

We will acknowledge your report, investigate, and fix confirmed issues.
Please do not test vulnerabilities against the live site in ways that
could affect other visitors' data (for example, do not submit real
personal information or attempt to access other users' uploads).

## Scope

In scope: the public website (trianglepricebook.com), its API routes
(submission, extraction, quote checking), and the admin moderation
surface.

Out of scope: the underlying Cloudflare Workers, Supabase, Stripe, and
Google Gemini platforms themselves — report those to the respective
vendors.

## What we already do

- Uploaded quotes/invoices are stored privately and never published;
  only moderators see them, and only to verify an entry.
- The admin area is gated by a server-side key with a constant-time
  comparison and a failed-attempt lockout.
- Spam checks (Cloudflare Turnstile) fail closed in production when
  the secret is missing.
- Public reads use the least-privileged Supabase key; writes go
  through server-side routes with the service-role key.
- No secrets are committed to this repository.
