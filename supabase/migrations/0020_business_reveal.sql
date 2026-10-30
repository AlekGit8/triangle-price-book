-- 0020_business_reveal.sql
--
-- Paid business-name reveals (Oct 29, 2026): verified submissions can
-- carry a contractor/business name, shown to a visitor only after they
-- pay ($1.99 for one submission, $4.99 day pass for all verified
-- submissions). Invoices are NEVER shown to visitors — only the name.
--
-- Privacy design, read before touching this:
-- - The name lives in report_business_names, NOT on reports. RLS is
--   enabled with NO public policies, so the anon key (used by every
--   public read) cannot see it even if a query asks for it — only the
--   service-role client in the reveal API routes reads it, and only
--   after proving a valid purchase token.
-- - The reveal button renders exactly when a name row exists (checked
--   via /api/reveal/status). There is deliberately NO flag column on
--   reports: a flag could drift out of sync with the names table, and
--   the public report queries must keep working whether or not this
--   migration has been applied yet (a missing column used to blank
--   the whole site — see Oct 29, 2026 fix).
-- - reveal_purchases records each sale: single reveals (report_id set,
--   no expiry — the bookmark link works indefinitely) and day passes
--   (report_id null, expires_at = purchase + 24h). The token is the
--   only key: no accounts, no buyer email is stored anywhere.

-- One name per report, set by an admin after checking the invoice.
create table if not exists report_business_names (
  report_id uuid primary key references reports (id) on delete cascade,
  business_name text not null check (char_length(business_name) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table report_business_names enable row level security;
-- Deliberately NO policies: only the service role (API routes) touches
-- this table. Same pattern as the feedback table before it was removed.

-- One row per completed purchase. token is the bookmark/cookie key.
create table if not exists reveal_purchases (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('single', 'day')),
  report_id uuid references reports (id) on delete set null,
  token text not null unique,
  stripe_session_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table reveal_purchases enable row level security;
-- Deliberately NO policies: service role only (see above).

create index if not exists reveal_purchases_token_idx
  on reveal_purchases (token);
create index if not exists reveal_purchases_session_idx
  on reveal_purchases (stripe_session_id);
