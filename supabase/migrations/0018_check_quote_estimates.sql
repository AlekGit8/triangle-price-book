-- 0018_check_quote_estimates.sql
--
-- Caches Gemini's broad-market estimate per (category, normalized
-- description) for 24 hours (Oct 27, 2026 code review, M6), so repeat
-- checks of the same job don't burn another Gemini call. The key is the
-- normalized description (lowercased, punctuation stripped, words
-- sorted), so "water heater install" and "Install water heater" hit
-- the same row. Stale rows are ignored after 24 hours and pruned
-- lazily by the route.

create table if not exists public.check_quote_estimates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description_key text not null,
  low_cents integer not null,
  median_cents integer not null,
  high_cents integer not null,
  basis text not null default '',
  created_at timestamptz not null default now(),
  unique (category, description_key)
);

alter table public.check_quote_estimates enable row level security;
-- No public policies: service-role only (check-quote reads/writes).

create index if not exists check_quote_estimates_created_at_idx
  on public.check_quote_estimates (created_at);
