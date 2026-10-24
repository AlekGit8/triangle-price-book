-- 0008_security_hardening.sql
--
-- Security audit (Oct 24, 2026). Closes three holes found in the audit:
--
-- 1. ANON DIRECT INSERT INTO reports — the "anon_submit_to_queue" policy let
--    anyone with the public anon key insert unlimited rows directly through
--    PostgREST, bypassing /api/submit entirely (no Turnstile, no rate limit,
--    no validation). All submissions go through POST /api/submit, which uses
--    the service role server-side. No client code inserts directly, so
--    dropping this policy breaks nothing.
--
-- 2. ANON DIRECT UPLOAD TO the private invoices bucket — the
--    "anon_upload_invoices" storage policy let anyone fill the 1 GB free
--    storage tier directly, bypassing the API's 8 MB limit and file-type
--    checks. /api/submit uploads invoice files server-side via the service
--    role; no client code uploads directly. Dropping this policy breaks
--    nothing.
--
-- 3. SUBMITTER EMAILS READABLE BY ANYONE — the reports table is anonymously
--    readable by design (it is the public price feed), which meant anyone
--    with the public anon key could SELECT submitter_email for every report
--    (verified live 2026-10-24). Emails move to report_contacts, a
--    service-role-only table (RLS enabled, zero policies). /api/submit
--    writes here; /api/admin/reports reads it via the service role.
--
-- All statements are idempotent (safe to re-run). Runs in one transaction.

-- 1. No more anonymous direct inserts into reports.
drop policy if exists "anon_submit_to_queue" on public.reports;

-- 2. No more anonymous direct uploads into the invoices bucket.
drop policy if exists "anon_upload_invoices" on storage.objects;

-- 3a. Private table for submitter contact emails (service role only).
create table if not exists public.report_contacts (
  report_id  uuid primary key references public.reports(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.report_contacts enable row level security;
-- Intentionally zero policies: only the service role (which bypasses RLS)
-- can read or write this table. Anonymous and authenticated users are
-- denied everything.

-- 3b. Backfill from the old column (no-op when empty / already migrated).
insert into public.report_contacts (report_id, email)
select id, submitter_email
from public.reports
where submitter_email is not null and submitter_email <> ''
on conflict (report_id) do nothing;

-- 3c. Drop the publicly-readable email column.
alter table public.reports drop column if exists submitter_email;
