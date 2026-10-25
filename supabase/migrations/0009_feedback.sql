-- 0009_feedback.sql
--
-- Visitor feature requests / feedback (Oct 25, 2026). Short anonymous
-- messages (max 300 chars, enforced in /api/feedback) — e.g. a missing
-- category, a feature request, or a price they couldn't find a way to
-- submit or tag.
--
-- RLS enabled with NO public policies, same pattern as launch_signups
-- and report_contacts: writes go through POST /api/feedback with the
-- service-role key; reads go through GET /api/admin/feedback with
-- ADMIN_KEY. The anon key can neither read nor write this table.
--
-- Idempotent (safe to re-run).
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
