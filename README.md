# Triangle Price Book

Crowdsourced, anonymized home-services price transparency for the Raleigh-Durham
Triangle, NC. Neighbors share what they paid or were quoted — just prices,
towns, and dates. No business names are collected anywhere user-facing.

**Live:** https://www.trianglepricebook.com (Cloudflare Workers via OpenNext)
**Repo:** https://github.com/AlekGit8/triangle-price-book (public)
**Operator:** Longsite Labs LLC

> **Branding:** the name "Triangle Price Book" is settled (trademark clearance
> done Oct 2026 — descriptive mark, hard to register federally). All branding
> lives in `lib/site-config.ts`.

## Stack

| Piece | Service | Cost |
|---|---|---|
| Framework | Next.js 15.5.28 (App Router, TypeScript) + React 19 + Tailwind CSS | free |
| Hosting | Cloudflare Workers via OpenNext (auto-deploy from GitHub `main`) | free tier, commercial use OK |
| Database | Supabase Postgres (`triangle-price-book`, us-east-1) | free tier (500 MB) |
| File storage | Supabase Storage, private `invoices` bucket | free tier (1 GB) |
| AI extraction | Google Gemini (free tier) | free |
| Spam protection | Cloudflare Turnstile (configured Oct 24, 2026) | free |
| DNS | Cloudflare (nameservers; domain registered at Porkbun) | free |
| Email list | Supabase `launch_signups` → Kit (launch email sent Oct 27, 2026) | free |

**Launched Oct 25, 2026** — the coming-soon gate was removed that day, and
the `/coming-soon` page + `/api/notify` were deleted Oct 27, 2026 (the launch
is over; the signup form was an unauthenticated write vector). Do NOT delete
`middleware.ts` — rate limits and security headers live there.

Build command: `npx opennextjs-cloudflare build` (config in `wrangler.jsonc` +
`open-next.config.ts`). All routes run on the Node.js runtime (OpenNext does
not support the edge runtime). Category pages render dynamically per request.
Migrated from Cloudflare Pages to Workers on Oct 24, 2026 — no Vercel
dependencies remain in the repo.

## Features

- **Two-tier submissions** (`/submit`): upload a quote/invoice → Gemini
  pre-fills the form → publishes as **Verified**; or manual entry → publishes
  instantly as an **unverified community report**. Multi-quote uploads supported
  (one draft card per distinct quote, single invoice stored).
- **Quote checker** (`/check-quote`): describe the job, enter a price — compares
  against similar verified jobs via token matching, shows Triangle-wide range,
  median, and the matched jobs by name. Honest "not enough data" states.
- **Browse** (`/browse`): filterable report feed with sort + search.
- **19 categories** (HVAC, Plumbing, Electrical, Roofing, Windows & Doors,
  Painting, Flooring, Landscaping, Fencing, Tree Service, Pools, Septic Systems,
  Garage Doors, Crawl Spaces, Gutter Guards, Chimneys, Garage Floors, Concrete,
  Handyman/Other), each with an SEO landing page.
- **Aggregates are verified-only** (median shown with 2+ verified reports).
- **Launched Oct 25, 2026.** The coming-soon gate is gone; `/coming-soon`
  and `/api/notify` were deleted Oct 27, 2026.
  **Never delete `middleware.ts` to launch** — rate limits and security
  headers live there, and deleting it would remove them.
- **Admin** (`/admin`, gated by `ADMIN_KEY`): moderation queue + published list
  + launch-signup totals and email list. Admin API routes share one auth
  helper (`lib/admin-auth.ts`, constant-time key compare); the middleware
  limit for `/api/admin/` is generous (300/hr) and only *failed* auth
  attempts count against a strict 10/hr bucket.
- **Sponsorships** (Oct 26, 2026): a single top-of-site banner, clearly labelled
  "Sponsored", sold as a 2-week founding sponsorship ($30 total). The active
  sponsor lives in `lib/site-config.ts` (`activeSponsor`, `null` = no banner).
  Clicks go through `/go/<slug>`, which logs one anonymous click
  (`sponsor_clicks`, migration 0012 — no IP stored, server-side bot flag) and
  302-redirects to the sponsor's site; impressions are human page views from
  the first-party analytics table. The end-of-flight report (impressions,
  human/bot clicks, CTR, daily breakdown, copy-ready sponsor text) is the
  Sponsors tab in `/admin` (`GET /api/admin/sponsors`). Sponsors get zero
  influence over listings, prices, or moderation. The same `/go` redirect
  also powers the per-company outreach links (`outreachLinks` in
  `lib/site-config.ts`, slugs prefixed `outreach-`, redirecting to the
  homepage with no expiry) for the sponsorship cold-outreach emails and
  the news-outlet outreach emails (5 contractor links + 16 news links,
  grouped in the Sponsors tab); their
  clicks are reported per slug from the same tab.
- **Legal pages:** full Terms of Service (14 sections) and Privacy Policy
  (12 sections), both dated Oct 27, 2026. How-it-works page documents the
  verified/unverified model.

## Setup (owner checklist)

### 1. Supabase project
1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` **in order** (0001–0018) via
   **SQL Editor**. (`launch_signups` is migration 0016; it used to be a
   hand-run snippet — that snippet is gone.)
3. **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### 2. Environment variables
Set these in **Cloudflare Worker → Settings → Variables**
(Production):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` — Google AI Studio key for quote extraction
  (`gemini-3.5-flash-lite` only; 2.5-flash retired Oct 20, 2026,
  3.5-flash deprecated Oct 8, 2026)
- `ADMIN_KEY` — long random string; password for `/admin`

### 3. Deploy
Connect the GitHub repo in **Cloudflare Dashboard → Workers & Pages →
Create → Worker → Connect to Git** (Workers Builds):
- Build command: `npx opennextjs-cloudflare build`
- Production branch: `main`

Every push to `main` redeploys automatically.

### Beta / preview workflow (Oct 24, 2026)
Changes are tested on the `beta` branch first — never straight to `main`:
- Push to `beta` → Cloudflare builds a preview at
  `https://beta-triangle-price-book.longsitelabsllc.workers.dev`.
  The preview shows the full site (the coming-soon gate was removed
  Oct 25, 2026; `lib/preview-host.ts` is dead code kept for reference).
- If the change is approved, merge `beta` → `main` (goes live).
  If not, delete the branch / revert the commit — production never changes
  until a merge happens.
- Preview environment variables (all 7, incl. `GEMINI_API_KEY`) are set
  separately in Worker → Settings → Variables → Previews.

### 4. Custom domain
Add the domain under Worker → Domains, then point DNS at Cloudflare
(nameservers or CNAME per Cloudflare's instructions).

## Project structure

```
app/
  page.tsx                  # Home: hero, search, "Recently reported services"
  browse/page.tsx           # Filterable report feed (client-rendered)
  submit/page.tsx           # Two-tier submission form
  check-quote/page.tsx      # Quote fairness checker
  how-it-works/page.tsx     # Transparency page (verified vs unverified)
  terms/page.tsx / privacy/page.tsx  # Legal pages (Oct 27, 2026)
  admin/page.tsx            # Moderation + signups (ADMIN_KEY)
  [category]/page.tsx       # Category landing pages (dynamic)
  api/
    submit/route.ts         # Validates + inserts reports, uploads invoice
    extract/route.ts        # Gemini quote extraction
    check-quote/route.ts    # Similar-job matching
    admin/reports/route.ts  # Lists reports (ADMIN_KEY)
    admin/moderate/route.ts # verify / reject
    admin/signups/route.ts  # Launch signup list (ADMIN_KEY)
middleware.ts               # Rate limits + security headers
components/
  SiteHeader.tsx / SiteFooter.tsx / ReportCard.tsx / AggregateCard.tsx /
  StatsStrip.tsx / ...
lib/
  site-config.ts            # <-- ALL BRANDING + CATEGORIES HERE
  data.ts                   # Server fetchers
  supabase-client.ts        # Browser client (anon key, RLS-enforced)
  supabase-server.ts        # Service-role client (API routes only)
  format.ts                 # formatCents, date helpers
supabase/migrations/        # 0001–0015: schema, RLS, views, seeds, categories
public/
  logo.svg / icon.svg       # Brand assets
```

## Key design decisions

- **Anonymity model:** no business names anywhere user-facing (removed Oct 2026).
  Public reads go through RLS; aggregates come from verified reports only.
- **No moderation queue:** verified uploads and manual entries both publish
  immediately (labeled accordingly); takedowns via `/admin`. Moderators remove
  or keep — never rewrite (preserves Section 230 posture).
- **Town normalization:** `normalizeTown()` canonicalizes known Triangle towns;
  unknown towns pass through trimmed.
- **Report cards** strip sentences containing both "owner" and "seed" from
  public display (raw notes stay intact in the DB).
- **Homepage sort:** "Recently reported services" sorts by quote/service date,
  falling back to submission date; every card always shows a date.

## Costs (honest version)

Everything runs on free tiers. Real costs kick in only with traction:
- Domain: ~$11/yr at Porkbun.
- Supabase: free until 500 MB DB / 1 GB storage — thousands of reports fit.
- Cloudflare Workers: free (100k requests/day, 3 MiB Worker size limit), commercial use allowed.
- Gemini: free tier for extraction.
- Turnstile: free (configured Oct 24, 2026; widget allowlist covers
  production + beta Workers hosts). Missing secret fails closed in
  production — spam protection is never silently off.

## Launch status (launched Oct 25, 2026)

- [x] Attorney-grade Terms + Privacy Policy (Oct 23, 2026; updated Oct 27)
- [x] Coming-soon gate removed (Oct 25, 2026) — `middleware.ts` kept for
      rate limits and security headers
- [x] Set up Turnstile keys (Oct 24, 2026)
- [x] Analytics: Cloudflare Web Analytics + GA4 (Oct 27, 2026)
- [x] Launch email sent via Kit (Oct 27, 2026)
- [ ] Submit sitemap in Google Search Console (owner step)
