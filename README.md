# Triangle Price Book

Crowdsourced, anonymized home-services price transparency for the Raleigh-Durham
Triangle, NC. Neighbors share what they paid or were quoted. No business names
are collected at all — just prices, towns, and dates.

> **Branding note:** the site name is being verified for trademark/domain
> availability. **All branding lives in `lib/site-config.ts`** — renaming the
> site is a one-line change there.

## Stack

| Piece | Service | Cost |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) + Tailwind CSS | free |
| Hosting | Vercel (auto-deploy from GitHub) | free tier |
| Database | Supabase Postgres | free tier (500 MB) |
| Auth | Supabase Auth (magic link, if enabled later) | free tier |
| File storage | Supabase Storage, private `invoices` bucket | free tier (1 GB) |
| Spam protection | Cloudflare Turnstile | free (optional) |
| Code home | GitHub repo (you own it) | free |

## Setup (owner checklist)

### 1. GitHub repo
1. Create a new repo (e.g. `triangle-price-book`) on your GitHub account.
2. Push this folder:
   ```bash
   cd triangle-price-book
   git init && git add . && git commit -m "Initial scaffold"
   git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
   ```

### 2. Supabase project
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/migrations/0001_init.sql`, and run it. This creates:
   - `businesses`, `reports`, `verifications` tables
   - Row Level Security: public reads only approved reports + aggregate views;
     anonymous inserts allowed only into the moderation queue
     (`verification_status='unverified'`, `moderated_at` NULL)
   - `service_aggregates` and `business_report_counts` views (publicly readable)
   - the private `invoices` storage bucket (+ anon upload policy)
   - 6 owner seed entries (clearly commented in the SQL)
3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never in the browser)

### 3. Environment variables
```bash
cp .env.example .env.local
```
Fill in the Supabase values above, plus:
- `ADMIN_KEY` — pick a long random string; it’s the password for `/admin`.
- Turnstile (optional): create a Turnstile widget at
  [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile, then set
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Leave blank to
  disable the spam check.

### 4. Deploy to Vercel
1. Import the GitHub repo at [vercel.com](https://vercel.com) → New Project.
2. Add the same environment variables in **Project Settings → Environment Variables**.
3. Deploy. Every `git push` to `main` redeploys automatically.

### 5. Verify it works
1. Visit the deployed URL — the home page should show the 6 seed entries in the aggregates.
2. Submit a test price at `/submit` — it lands in the moderation queue (not public).
3. Open `/admin`, unlock with your `ADMIN_KEY`, and **Verify & publish** it.
4. Check `/browse` — the entry appears anonymously.

## Project structure

```
app/
  page.tsx            # Home: hero, stats, aggregates, anonymized callout
  browse/page.tsx     # Filterable report feed (client-side, anon-safe)
  submit/page.tsx     # Submission form (+ Turnstile when configured)
  how-it-works/page.tsx  # The 8-section transparency page
  terms/page.tsx      # Draft ToS (attestation, takedown process)
  privacy/page.tsx    # Draft privacy policy
  admin/page.tsx      # Moderation queue, gated by ADMIN_KEY
  api/submit/route.ts        # Validates + inserts to queue, uploads invoice
  api/admin/reports/route.ts # Lists unmoderated reports (ADMIN_KEY)
  api/admin/moderate/route.ts# verify / publish_unverified / reject
components/
  SiteHeader.tsx / SiteFooter.tsx / ReportCard.tsx / AggregateCard.tsx / StatsStrip.tsx
lib/
  site-config.ts      # <-- ALL BRANDING HERE (rename = one-line change)
  data.ts             # Server fetchers (degrade to [] without credentials)
  supabase-client.ts  # Browser client (anon key, RLS-enforced)
  supabase-server.ts  # Service-role client (API routes only, never browser)
  format.ts           # formatCents, formatMonthYear
supabase/migrations/0001_init.sql  # Schema, RLS, views, seeds, bucket
supabase/migrations/0002_remove_business_names.sql  # Drops businesses table, business_id, rankings view
```

## Key design decisions

- **Anonymity model:** no business names are collected at all (removed Oct 2026).
  `submitter_email` is private. Public reads go through RLS (approved reports
  only) and the `service_aggregates` view.
- **Moderation:** everything submitted is invisible (`moderated_at IS NULL`) until
  a moderator acts in `/admin`. Three actions: verify & publish, publish
  unverified, reject.
- **No business editing of entries:** moderators remove or keep; never rewrite
  (preserves Section 230 posture — see `/how-it-works`).

## Extending with an AI coding assistant

The repo is a standard Next.js + Tailwind + Supabase app — Cursor, Copilot,
or any similar tool works out of the box. Useful prompts:

- “Rename the site” → edit `lib/site-config.ts` only.
- “Add a category” → add to `site-config.ts` categories AND the DB check
  constraint in a new migration (`alter table reports ... check`).
- “Add email notifications on new submissions” → extend `app/api/submit/route.ts`
  (Resend free tier works well here).
- “Add magic-link login for submitters” → Supabase Auth + gate `/submit`.

### Future migrations
Put new SQL in `supabase/migrations/0002_*.sql` and run in the Supabase SQL editor.

## Costs (honest version)

Everything above runs on free tiers. Real costs kick in only with traction:
- Domain: ~$12–15/year (optional until launch).
- Supabase: free until 500 MB DB / 1 GB storage — thousands of reports fit.
- Vercel: free until 100 GB bandwidth/month — far beyond early traffic.
- Turnstile: free.

## Before public launch

- [ ] Have a local attorney review `/terms` and `/privacy` (marked as drafts).
- [ ] Register the domain and set it in `lib/site-config.ts`.
- [ ] Rotate `ADMIN_KEY` to a strong random value.
- [ ] Enable Turnstile.
- [ ] Add privacy-friendly analytics (e.g. Plausible) — one `<script>` in `app/layout.tsx`.
