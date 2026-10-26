-- 0012_sponsor_clicks.sql
--
-- Sponsor banner click tracking (Oct 26, 2026). A click on the
-- "Sponsored" banner goes through /go/<sponsor-slug>, which logs one
-- row here and then redirects to the sponsor's site. That redirect is
-- the click counter for the end-of-flight report (impressions come
-- from the existing analytics_page_views table: human page views
-- while the banner is live).
--
-- Same privacy pattern as analytics_page_views: no IP address stored,
-- no cookies, no cross-site tracking. is_bot is decided server-side
-- from the user agent at ingest (lib/bot-detect.ts), so the report
-- can show human clicks separately from bot/crawler clicks.
--
-- RLS enabled with NO public policies, same pattern as
-- launch_signups / feedback / admin_state / analytics_page_views:
-- writes go through GET /go/<slug> with the service-role key; reads
-- go through GET /api/admin/sponsors with ADMIN_KEY. The anon key
-- can neither read nor write this table.
--
-- Idempotent (safe to re-run).
create table if not exists public.sponsor_clicks (
  id uuid primary key default gen_random_uuid(),
  sponsor_slug text not null,
  referrer_path text,
  user_agent text,
  is_bot boolean not null default false,
  country text,
  clicked_at timestamptz not null default now()
);
create index if not exists sponsor_clicks_slug_clicked_idx
  on public.sponsor_clicks (sponsor_slug, clicked_at);
alter table public.sponsor_clicks enable row level security;
