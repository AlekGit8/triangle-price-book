-- 0016_launch_signups.sql
--
-- Creates the launch_signups table (Oct 27, 2026). Until now it existed
-- only via a README snippet run by hand, so a fresh database could not be
-- rebuilt from supabase/migrations alone. Idempotent (safe to re-run).
-- The launch is over (launch email sent Oct 27, 2026) — the table stays
-- for the historical subscriber list shown in /admin.

create table if not exists public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  wants_updates boolean default false,
  created_at timestamptz default now()
);

alter table public.launch_signups enable row level security;
-- No public policies: the API uses the service-role key only.
