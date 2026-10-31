-- 0024_reveal_packs.sql
--
-- Paid reveals, 3-tier pricing (Oct 30, 2026): $2 for 1 verified
-- entry, $5 for any 3, $8 for any 5. The $4.99 all-verified option is
-- retired from the menu but stays valid for purchases already made
-- (their token pages keep rendering), so 'all' remains in the type
-- check below.
--
-- Packs are select-then-pay: the buyer picks their entries on
-- /reveal/select, the selection rides the Stripe session metadata,
-- and activation records both the purchase and the chosen entries.
-- Selections are frozen at purchase: the token page renders exactly
-- the chosen entries (unlike 'all', which is generated live on each
-- load). A pack purchase row itself carries report_id NULL — the
-- selections table is the record of what was bought.

alter table reveal_purchases drop constraint if exists reveal_purchases_type_check;
alter table reveal_purchases add constraint reveal_purchases_type_check check (type in ('single', 'all', 'pack3', 'pack5'));

create table if not exists reveal_pack_selections (
  purchase_id uuid not null references reveal_purchases (id) on delete cascade,
  report_id uuid not null references reports (id) on delete cascade,
  primary key (purchase_id, report_id)
);
alter table reveal_pack_selections enable row level security;
-- Deliberately NO policies: only the service role (API routes) touches
-- this table, same pattern as report_business_names.

create index if not exists reveal_pack_selections_purchase_idx
  on reveal_pack_selections (purchase_id);
