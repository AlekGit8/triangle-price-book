-- 0010_admin_state.sql
--
-- Admin "what's new" marker (Oct 25, 2026). A single-row table holding
-- the timestamp of the last admin visit, so /admin can highlight
-- everything submitted since then (reports, launch signups, feedback).
--
-- RLS enabled with NO public policies, same pattern as launch_signups,
-- feedback, and report_contacts: reads/writes go through
-- /api/admin/seen with the service-role key + ADMIN_KEY. The anon key
-- can neither read nor write this table.
--
-- Idempotent (safe to re-run).
create table if not exists public.admin_state (
  id integer primary key default 1,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.admin_state enable row level security;
insert into public.admin_state (id, last_seen_at)
values (1, null)
on conflict (id) do nothing;
