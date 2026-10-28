# Cloudflare Turnstile setup (spam protection)

**Status: CONFIGURED Oct 24, 2026** — both keys are set in the Cloudflare
Worker's env vars (Worker `triangle-price-book` → Settings → Variables):
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. The widget
renders on `/submit` and `/api/submit` + `/api/extract` verify the token
server-side (success + action + hostname).

## Why it matters

Without this, `/api/submit` and `/api/extract` accept unlimited anonymous
requests. Rate limiting (in `middleware.ts`) blunts casual abuse, but
Turnstile is the real bot defense — and it's free forever.

## Setup (10 minutes, $0)

1. Go to https://dash.cloudflare.com → **Turnstile** (left sidebar).
2. **Add site**:
   - Site name: `Triangle Price Book`
   - Domain: `trianglepricebook.com` (add `www.trianglepricebook.com` too)
   - Widget mode: **Managed** (invisible unless suspicious — best UX)
3. Copy the two keys:
   - **Site key** → Cloudflare Dashboard → Workers & Pages →
     triangle-price-book → Settings → Variables → add
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret key** → same place → add `TURNSTILE_SECRET_KEY`
   - Set both for **Production** (and Preview if you want it on previews).
4. **Redeploy** (or wait for the next push) so the new env vars take effect.

## Verify it works

1. Open `/submit` — you should see the Turnstile widget ("Verifying you are
   human") near the submit button.
2. Submit a test report — it should succeed.
3. To confirm enforcement: temporarily break the secret (change one
   character in the dashboard), submit again — you should get
   "Spam check failed." Then fix the secret.

## Notes

- Keys are **never committed** — they live only in the Cloudflare dashboard
  (`.env.example` lists the variable names).
- Verification **fails closed**: if Turnstile itself has an outage, or the
  secret goes missing, submissions are rejected rather than accepted
  unprotected. Removing the secret does NOT re-enable submissions in
  production — that fail-closed behavior is intentional, so the escape
  hatch for a Turnstile outage is a code change, not a dashboard edit.
- The widget's domain allowlist (Cloudflare Dashboard → Turnstile → the
  site → Domains) must include every host that serves the site:
  `trianglepricebook.com`, `www.trianglepricebook.com`, and both Workers
  hosts (`triangle-price-book.longsitelabsllc.workers.dev`,
  `beta-triangle-price-book.longsitelabsllc.workers.dev`). A missing host
  fails every verification from that host with "Spam check failed."
