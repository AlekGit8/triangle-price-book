-- 0017_extract_receipts.sql
--
-- "Verified" now means the amount was read from the document, not just
-- that a file was attached (Oct 27, 2026 code review, H2). /api/extract
-- records one receipt row per extracted quote — the SHA-256 of the
-- document, the extracted amount, and the category — and returns the
-- receipt id to the client. /api/submit marks a report Verified only
-- when the uploaded file's hash matches an unconsumed receipt for that
-- amount (within tolerance). Receipts expire after 24 hours and are
-- single-use, so an edited amount publishes as unverified instead.
--
-- verifications also gains the file hash + amount, so the same document
-- can't be submitted twice for the same amount (dedup), while a
-- multi-quote document can still verify several reports at different
-- amounts — and a shared document is uploaded once, not once per quote.

create table if not exists public.extract_receipts (
  id uuid primary key default gen_random_uuid(),
  file_sha256 text not null,
  amount_cents integer not null check (amount_cents > 0),
  category text not null,
  service_date date,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

alter table public.extract_receipts enable row level security;
-- No public policies: service-role only (extract writes, submit reads).

create index if not exists extract_receipts_file_sha256_idx
  on public.extract_receipts (file_sha256);

alter table public.verifications
  add column if not exists file_sha256 text,
  add column if not exists amount_cents integer;

create index if not exists verifications_file_sha256_idx
  on public.verifications (file_sha256);
