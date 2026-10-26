-- 0011_analytics.sql
--
-- First-party anonymous analytics (Oct 25, 2026). The site measures its
-- own traffic so the admin dashboard can show visitors over time
-- (humans vs bots), time on site, and time per page. No cookies, no IP
-- addresses stored, no cross-site tracking: a random session id lives
-- in the browser tab (sessionStorage) and is forgotten when the tab
-- closes.
--
-- One row per page view. duration_seconds is the active (visible-tab)
-- time the visitor spent on the page, reported by the client beacon
-- via heartbeat and capped at 30 minutes per view at ingest, so a tab
-- left open overnight can't inflate the numbers. is_bot is decided
-- server-side from the user agent at ingest.
--
-- RLS enabled with NO public policies, same pattern as
-- launch_signups / feedback / admin_state: writes go through
-- POST /api/analytics/event with the service-role key; reads go
-- through GET /api/admin/analytics with ADMIN_KEY. The anon key can
-- neither read nor write this table.
--
-- Idempotent (safe to re-run).
create table if not exists public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  path text not null,
  referrer_host text,
  user_agent text,
  is_bot boolean not null default false,
  country text,
  entered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0
);
create index if not exists analytics_page_views_entered_at_idx
  on public.analytics_page_views (entered_at);
create index if not exists analytics_page_views_session_idx
  on public.analytics_page_views (session_id);
alter table public.analytics_page_views enable row level security;
