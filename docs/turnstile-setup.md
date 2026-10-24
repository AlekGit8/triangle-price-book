# Cloudflare Turnstile setup (spam protection)

**Status:** the code is fully wired — the widget renders on `/submit` and
`/api/submit` + `/api/extract` verify the token server-side. Only the keys
are missing, so verification currently passes everything through.

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
   - **Site key** → Cloudflare Pages → triangle-price-book → Settings →
     Environment variables → add `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
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
- If Turnstile ever has an outage, the site keeps working only if you
  temporarily remove the secret — otherwise all submissions fail closed.
  That fail-closed behavior is intentional.
