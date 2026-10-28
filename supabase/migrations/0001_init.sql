-- ============================================================================
-- Triangle Price Book — initial schema
-- Run in the Supabase SQL editor (or via Supabase CLI: supabase db push).
-- NOTE: branding lives in lib/site-config.ts, not here.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

create table if not exists businesses (
  id         uuid primary key default gen_random_uuid(),
  -- LEFTOVER (Oct 18, 2026): business names were removed entirely —
  -- they are never collected, shown, or used for aggregates. This table
  -- is unused and kept only so old migrations still apply cleanly.
  -- Do NOT reintroduce business names without a new decision.
  name       text not null,
  category   text not null default 'Other',
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id                  uuid primary key default gen_random_uuid(),
  service_name        text not null,
  category            text not null
                      check (category in ('HVAC','Plumbing','Electrical','Roofing','Appliances','Other')),
  amount_cents        integer not null check (amount_cents > 0),
  amount_note         text, -- e.g. "+ tax"
  report_type         text not null check (report_type in ('paid','quote')),
  town                text not null,
  service_date        date,
  notes               text,
  verification_status text not null default 'unverified'
                      check (verification_status in ('unverified','verified','rejected')),
  -- Private: which business this report was attributed to (aggregates only).
  business_id         uuid references businesses(id),
  -- Private: submitter contact, used only for moderation follow-up.
  submitter_email     text,
  created_at          timestamptz not null default now(),
  -- NULL = still sitting in the moderation queue, not publicly visible.
  moderated_at        timestamptz
);

create table if not exists verifications (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references reports(id) on delete cascade,
  -- Path inside the private `invoices` storage bucket.
  invoice_path text not null,
  reviewer_note text,
  created_at   timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------

alter table businesses    enable row level security;
alter table reports       enable row level security;
alter table verifications enable row level security;

-- Public can read ONLY approved reports: verified AND moderated.
create policy "public_read_approved_reports"
  on reports for select
  to anon, authenticated
  using (verification_status = 'verified' and moderated_at is not null);

-- Anyone may INSERT a new report, but only into the moderation queue:
-- it must start unverified and unmoderated (invisible until reviewed).
create policy "anon_submit_to_queue"
  on reports for insert
  to anon, authenticated
  with check (verification_status = 'unverified' and moderated_at is null);

-- No public policies on businesses or verifications: they are readable
-- only through the aggregate views below (and by the service role).
-- NOTE: anonymous users cannot UPDATE or DELETE reports. Moderation
-- happens server-side via the service role key (/api/admin/*).

-- --------------------------------------------------------------------------
-- Aggregate views (publicly readable; no business attribution per entry)
-- Views run as the view owner, so they bypass RLS on the base tables by
-- design — they expose ONLY aggregates, never raw private fields.
-- --------------------------------------------------------------------------

create or replace view service_aggregates as
select
  service_name,
  category,
  count(*)::int                                             as report_count,
  count(*) filter (where verification_status = 'verified')::int as verified_count,
  count(*) filter (where report_type = 'paid')::int          as paid_count,
  count(*) filter (where report_type = 'quote')::int         as quote_count,
  min(amount_cents)::int                                     as min_cents,
  max(amount_cents)::int                                     as max_cents,
  percentile_cont(0.5) within group (order by amount_cents)::int as median_cents
from reports
where verification_status = 'verified' and moderated_at is not null
group by service_name, category;

-- Per-business report counts. Drives the "N reports before a business
-- appears in rankings" rule (see lib/site-config.ts -> rankingThreshold).
create or replace view business_report_counts as
select
  b.id,
  b.name,
  b.category,
  count(r.id)::int as report_count
from businesses b
left join reports r
  on r.business_id = b.id
 and r.verification_status = 'verified'
 and r.moderated_at is not null
group by b.id, b.name, b.category;

grant select on service_aggregates to anon, authenticated;
grant select on business_report_counts to anon, authenticated;

-- --------------------------------------------------------------------------
-- Private storage bucket for invoice uploads (moderators only)
-- --------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Allow anonymous uploads into the private bucket (needed for the
-- invoice field on /submit). Files are NOT publicly readable.
create policy "anon_upload_invoices"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'invoices');

-- --------------------------------------------------------------------------
-- Seed data — the owner's own real invoices/quotes.
-- Clearly marked; all start approved + verified.
-- --------------------------------------------------------------------------

insert into businesses (name, category) values
  ('Michael & Son', 'HVAC'),
  ('Jay''s', 'HVAC'),
  ('Auer Electric', 'Electrical')
on conflict do nothing;

insert into reports
  (service_name, category, amount_cents, amount_note, report_type, town,
   service_date, notes, verification_status, moderated_at, business_id)
values
  -- Owner seed: Rinnai RX199 tankless water heater install, paid Jul 2026
  ('Tankless water heater install (Rinnai RX199)', 'Plumbing', 525336, null,
   'paid', 'Fuquay-Varina', '2026-07-11',
   'Includes unit + installation. Owner seed data (invoice on file).',
   'verified', now(),
   (select id from businesses where name = 'Michael & Son' limit 1)),

  -- Owner seed: condensate float switch replacement, paid Oct 2026
  ('HVAC condensate float switch replacement', 'HVAC', 30375, null,
   'paid', 'Fuquay-Varina', '2026-10-13',
   'Same-day service call. Owner seed data (invoice on file).',
   'verified', now(),
   (select id from businesses where name = 'Michael & Son' limit 1)),

  -- Owner seed: Goodman 3-ton 14 SEER heat pump install, paid Aug 2023
  ('Heat pump system install (Goodman 3-ton, 14 SEER)', 'HVAC', 690000, null,
   'paid', 'Fuquay-Varina', '2023-08-01',
   'Full system replacement. Owner seed data.',
   'verified', now(),
   (select id from businesses where name = 'Jay''s' limit 1)),

  -- Owner seed: generator interlock + surge protector QUOTE, Sep 2026
  ('Generator interlock + whole-house surge protector', 'Electrical', 229500, '+ tax',
   'quote', 'Fuquay-Varina', '2026-09-20',
   'Written quote. Owner seed data — compare with the other quote for the same scope.',
   'verified', now(),
   (select id from businesses where name = 'Auer Electric' limit 1)),

  -- Owner seed: generator interlock + surge protector QUOTE, Sep 2026
  ('Generator interlock + whole-house surge protector', 'Electrical', 255119, null,
   'quote', 'Fuquay-Varina', '2026-09-01',
   'Written quote. Owner seed data — compare with the other quote for the same scope.',
   'verified', now(),
   (select id from businesses where name = 'Michael & Son' limit 1)),

  -- Owner seed: zone control board replacement QUOTE, Oct 2025 (declined, DIY)
  ('Zone control board replacement (Honeywell HZ322)', 'HVAC', 65000, null,
   'quote', 'Fuquay-Varina', '2025-10-13',
   'Quote declined — homeowner replaced the part DIY. Owner seed data.',
   'verified', now(),
   (select id from businesses where name = 'Jay''s' limit 1));
