-- 0025_retire_all_reveal.sql
--
-- Paid reveals, tier cleanup (Oct 30, 2026): the old $4.99
-- all-verified option is gone entirely. No real sale ever occurred
-- under the old $1.99/$4.99 pricing (confirmed Oct 30, 2026 — only
-- test-mode purchases, all deleted), so there is no legacy purchase
-- to preserve and 'all' is dropped from the type check rather than
-- carried forward. This statement fails loudly if an 'all' row
-- somehow exists — do not force it; investigate instead.

alter table reveal_purchases drop constraint if exists reveal_purchases_type_check;
alter table reveal_purchases add constraint reveal_purchases_type_check check (type in ('single', 'pack3', 'pack5'));
